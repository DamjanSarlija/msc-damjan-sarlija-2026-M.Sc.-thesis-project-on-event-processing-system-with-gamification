import socketio
import random
import time
import threading
import sys
import datetime
import uuid
import argparse
import json

sio = socketio.Client()
sio.connect("http://localhost:3000")
time.sleep(5)

device_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]

time.sleep(random.uniform(1, 300))

for device_id in device_ids:
    sio.emit("interrupt_device", str(device_id))

print("interruption loop executed!")

while True:
    time.sleep(1)