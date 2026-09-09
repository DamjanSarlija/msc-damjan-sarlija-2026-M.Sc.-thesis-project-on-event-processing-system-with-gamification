import socketio
import random
import time
import threading
import sys
import datetime
import uuid
import argparse
import json

import simulator

parser = argparse.ArgumentParser()
parser.add_argument("--devices", type = int, required = True)
parser.add_argument("--scenario", required = True)

args = parser.parse_args()

number_of_devices = args.devices
scenario_file = args.scenario

threads = []

for i in range(number_of_devices):
    thread = threading.Thread(target = simulator.simulate, args = (scenario_file, i + 1), name = f"Device {i + 1}")
    thread.start()
    print(f"Device {i + 1} started!")
    threads.append(thread)


