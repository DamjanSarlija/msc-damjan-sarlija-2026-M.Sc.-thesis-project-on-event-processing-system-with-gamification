import socketio
import random
import time
import threading
import sys

if len(sys.argv) < 2:
    print("Potreban ID uredjaja!")
    sys.exit(1)

DEVICE_ID = sys.argv[1]

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to server")
    sio.emit("register", DEVICE_ID)

@sio.on("send-data-now")
def on_command():
    print("Server requested immediate send")
    send_data()

def send_data():
    payload = {
        "id": DEVICE_ID,
        "podaci": random.randint(1, 100)
    }
    print("Sending:", payload)
    sio.emit("device-data", payload)

def periodic():
    while True:
        time.sleep(60)
        send_data()

sio.connect("http://localhost:3001")

threading.Thread(target=periodic, daemon=True).start()

sio.wait()