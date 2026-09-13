import socketio
import random
import time
import threading
import sys
import datetime
import uuid

if len(sys.argv) < 2:
    print("Device ID not specified. Try again!")
    exit(1)

device_id = sys.argv[1]

def generate_data(profile, scenario_file, device_id):
    event = {
        "event_id": str(uuid.uuid4()),
        "device_id": device_id,
        "event_type": "CLASSIC_EVENT",
        "profile": profile,
        "scenario": scenario_file,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "value": random.randint(1, 100)
    }
    return event

def generate_data_req(device_id):
    event = {
        "event_id": str(uuid.uuid4()),
        "device_id": device_id,
        "event_type": "REQUESTED_EVENT",
        "profile": "No profile",
        "scenario": "No scenario",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "value": random.randint(1, 100)
    }
    return event

