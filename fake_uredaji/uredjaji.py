import requests
import random
import time

URL = "http://localhost:3000/api/data"  # your endpoint

devices = [1, 2, 3, 4, 5]

while True:
    for device_id in devices:
        data = {
            "id": device_id,
            "podaci": random.randint(1, 100)
        }

        try:
            response = requests.post(URL, json=data)
            print(f"Device {device_id} sent:", data, "| Response:", response.status_code)
        except Exception as e:
            print(f"Error sending from device {device_id}:", e)

    print("---- waiting 20 seconds ----\n")
    time.sleep(20)