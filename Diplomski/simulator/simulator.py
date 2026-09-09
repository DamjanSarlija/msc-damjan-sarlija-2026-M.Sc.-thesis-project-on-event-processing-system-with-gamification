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
    sio.emit("device_data", event)

def simulate(scenario_file, device_id):

    sio = socketio.Client()

    @sio.event
    def connect():
        print("Povezivanje uspjelo")
        sio.emit("register", device_id)

    @sio.on("data_request")
    def on_command():
        print("Zahtjev za podacima stigao")
        event = event_generator.generate_data(profile, scenario, device_id)
        send_event(event, sio)

    sio.connect("http://localhost:3001")

    scenario = {}
    with open(scenario_file, "r") as scenario_file_opened:
        scenario = json.load(scenario_file_opened)

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
            


    
    
    
    
