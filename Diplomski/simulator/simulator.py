import socketio
import random
import time
import threading
import sys
import datetime
import uuid
import event_generator
import json



def send_event(event, sio):
    print("Sending event: ", event)

    try:
        sio.emit("device_data", event)
    except Exception as e:
        print(f"Failed to send event: {e}")


def simulate(scenario_file, device_id):

    sio = socketio.Client()

    @sio.event
    def connect():
        print("Povezivanje uspjelo")
        sio.emit("register", device_id)

    @sio.on("data_request")
    def on_command():
        print("Zahtjev za podacima stigao")
        event = event_generator.generate_data_req(device_id)
        send_event(event, sio)

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

            for i in range(duration):
                event = event_generator.generate_data(profile, scenario_file, device_id)
                send_event(event, sio)
                time.sleep(random.uniform(1 / max_frequency, 1 / min_frequency))

    threading.Thread(target = periodic, args = (scenario,), daemon = True).start()

    while True:
        time.sleep(1)
            


    
    
    
    
