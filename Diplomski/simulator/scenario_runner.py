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
import gamified_simulator

parser = argparse.ArgumentParser()
parser.add_argument("--devices", type = int, required = True)
parser.add_argument("--mode", required = True)
parser.add_argument("--scenario")

args = parser.parse_args()

number_of_devices = args.devices
mode = args.mode
scenario_file = args.scenario

threads = []

if mode == "simulator":
    for i in range(number_of_devices):
        thread = threading.Thread(target = simulator.simulate, args = (scenario_file, i + 1), name = f"Device {i + 1}")
        thread.start()
        print(f"Device {i + 1} started!")
        threads.append(thread)

elif mode == "game":
    for i in range(number_of_devices):
        thread = threading.Thread(target = gamified_simulator.simulate, args = (i + 1,), name = f"Device {i + 1}")
        thread.start()
        print(f"Device {i + 1} started!")
        threads.append(thread)
        time.sleep(1 / number_of_devices)



