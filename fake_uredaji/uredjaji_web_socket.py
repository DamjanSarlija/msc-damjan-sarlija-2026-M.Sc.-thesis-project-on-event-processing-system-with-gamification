import socketio
import random
import time
import threading
import sys
import datetime
import uuid

if len(sys.argv) < 2:
    print("Potreban ID uredjaja!")
    sys.exit(1)

DEVICE_ID = sys.argv[1]

sio = socketio.Client()

@sio.event
def connect():
    print("Povezivanje uspjelo")
    sio.emit("register", DEVICE_ID)

@sio.on("send-data-now")
def on_command():
    print("Zahtjev za podacima stigao")
    send_data()

def send_data():
    podaci = {
        "uredjaj_id": DEVICE_ID,
        "podatak_id": str(uuid.uuid4()),
        "podatak": random.randint(1, 100),
        "vrijeme": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    print("Sending:", podaci)
    sio.emit("device-data", podaci)

def periodic():
    while True:
        time.sleep(5)
        send_data()

sio.connect("http://localhost:3001")

threading.Thread(target=periodic, daemon=True).start()

sio.wait()