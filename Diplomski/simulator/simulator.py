import socketio
import random
import time
import threading
import sys
import datetime
import uuid
import event_generator
import json



def send_event(event, sio, is_resend, buffer, buffer_lock):

    def acknowledge_callback(response):
        if response.get("success"):
            with buffer_lock:
                buffer.pop(response.get("event_id"), None)
            print(f"Event {response.get('event_id')} acknowledged!")

    if not is_resend:
        event_id = event["event_id"]
        with buffer_lock:
            buffer[event_id] = event

        print("Sending event: ", event)

        try:
            sio.emit("device_data", event, callback = acknowledge_callback)
        except Exception as e:
            
            print(f"Failed to send event: {e}")

    else:
        print("Resending event: ", event)
        try:
            sio.emit("device_data", event, callback = acknowledge_callback)
        except Exception as e:
            print("Failed to resent event: {e}")
    


def simulate(scenario_file, device_id):

    sio = socketio.Client()
    buffer = {}
    buffer_lock = threading.Lock()

    @sio.event
    def connect():
        print("Povezivanje uspjelo")
        sio.emit("register", device_id)


    @sio.on("data_request")
    def on_command():
        print("Zahtjev za podacima stigao")
        event = event_generator.generate_data_req(device_id)
        send_event(event, sio, False, buffer, buffer_lock)

    @sio.on("interruption")
    def interrupt():
        sio.disconnect()
        time.sleep(0.1)
        time.sleep(random.randint(10, 30))
        sio.connect("http://localhost:3001")
        print(f"Device {device_id} reconnected.")

    sio.connect("http://localhost:3001")

    scenario = {}
    with open(scenario_file, "r") as scenario_file_opened:
        scenario = json.load(scenario_file_opened)

    def periodic(scenario):
        for phase in scenario:
            profile = phase["profile"]
            duration = phase["duration"]
            min_frequency = 0
            max_frequency = 0
            with open(profile, "r") as profile_file:
                profile_info = json.load(profile_file)
                min_frequency = profile_info["min_frequency"]
                max_frequency = profile_info["max_frequency"]

            start = time.monotonic()

            while True:
                time_elapsed = time.monotonic() - start
                if time_elapsed >= duration:
                    break

                event = event_generator.generate_data(profile, scenario_file, device_id)
                send_event(event, sio, False, buffer, buffer_lock)
                time_remaining = duration - time.monotonic() + start
                if time_remaining <= 0:
                    break

                time.sleep(min(time_remaining, random.uniform(1 / max_frequency, 1 / min_frequency)))

    def resend_loop():
        while True:
            time.sleep(2)
            with buffer_lock:
                events = list(buffer.values())

            for event in events:
                send_event(event, sio, True, buffer, buffer_lock)
        

    threading.Thread(target = periodic, args = (scenario,), daemon = True).start()
    threading.Thread(target = resend_loop, daemon = True).start()

    while True:
        time.sleep(1)
            


    
    
    
    
