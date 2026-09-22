import socketio
import random
import time
import threading
import sys
import datetime
import uuid
import event_generator
import json

TARGETS = [1, 2, 2, 3, 3]
ATTEMPT_DURATION = 12
REACH_DURATION = 5
HOLD_DURATION = 3
REST_DURATION = 4

PATTERN = "WEAK"

SEED = 42
random.seed(SEED)

file_lock = threading.Lock()

def get_phase(attempt_time):
    if attempt_time < REACH_DURATION:
        return "REACH"
    elif attempt_time < REACH_DURATION + HOLD_DURATION:
        return "HOLD"
    elif attempt_time <= REACH_DURATION + HOLD_DURATION + REST_DURATION:
        return "REST"
    else:
        return "ERROR"

def get_reference_value(target, attempt_time):
    phase = get_phase(attempt_time)
    if phase == "REACH":
        mu = round(target * (attempt_time + 1 / REACH_DURATION))
    elif phase == "HOLD":
        mu = target
    else:
        rest_time = attempt_time - REACH_DURATION - HOLD_DURATION
        progress = rest_time / (REST_DURATION - 1)
        mu = round(target * (1 - progress))
    return max(0, min(3, mu))

def add_epsilon(mu, pattern, old_reference_values):
    if pattern == "NORMAL":
        value = mu + random.choice([0, 0, 0, 0, -1, 1])
    elif pattern == "WEAK":
        value = mu + random.choice([-1, -1, -1, 0])
    elif pattern == "IRREGULAR":
        value = mu + random.choice([-1, -1, 0, 1, 1])
    elif pattern == "DELAYED":
        delay = 2
        if len(old_reference_values) > delay:
            old_mu = old_reference_values[-1 - delay]
        else:
            old_mu = 0
        value = old_mu + random.choice([0, 0, 0, -1, 1])
    else:
        value = mu

    return max(0, min(value, 3))

def get_classification(phase, value, target):
    if phase == "REST":
        return "REST"
    elif value >= target:
        return "TARGET_REACHED"
    else:
        return "BELOW_TARGET"

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
    


def simulate(device_id):

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
        time.sleep(random.randint(60, 120))
        sio.connect("http://localhost:3001")
        print(f"Device {device_id} reconnected.")

    sio.connect("http://localhost:3001")


    
    def periodic():
        exercise_id = str(uuid.uuid4())
        total_attempts = 0
        successful_attempts = 0
        score = 0
        status = "IN_PROGRESS"
        old_reference_values = []

        for attempt_index, target in enumerate(TARGETS, start = 1):
            success = False
            consecutive = 0
            for attempt_second in range(ATTEMPT_DURATION):
                is_last_second = False
                if attempt_second == ATTEMPT_DURATION - 1:
                    is_last_second = True
                phase = get_phase(attempt_second)
                reference_value = get_reference_value(target, attempt_second)
                old_reference_values.append(reference_value)
                value = add_epsilon(reference_value, PATTERN, old_reference_values)
                classification = get_classification(phase, value, target)
                if phase == "HOLD":
                    if value >= target:
                        consecutive += 1
                    elif value < target:
                        consecutive = 0
                    if consecutive >= 2:
                        success = True

                if is_last_second:
                    total_attempts += 1
                    if success:
                        successful_attempts += 1

                    score = 100 * successful_attempts / total_attempts
                    if attempt_index == len(TARGETS):
                        if successful_attempts >= 4:
                            status = "ACHIEVED"
                        else:
                            status = "NOT_ACHIEVED"

                event = {
                    "event_id": str(uuid.uuid4()),
                    "device_id": device_id,
                    "event_type": "CLASSIC_EVENT",
                    "profile": "NO PROFILE (GAMIFIED MODE)",
                    "scenario": "NO SCENARIO (GAMIFIED MODE)",
                    "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "value": value,
                    "exercise_id": exercise_id,
                    "attempt": attempt_index,
                    "phase": phase,
                    "target_level": target,
                    "reference_value": reference_value,
                    "classification": classification,
                    "success": success,
                    "total_attempts": total_attempts,
                    "successful_attempts": successful_attempts,
                    "score": score,
                    "status": status
                }
                send_event(event, sio, False, buffer, buffer_lock)
                time.sleep(1)





         
                
                    


    def resend_loop():
        while True:
            time.sleep(2)
            with buffer_lock:
                events = list(buffer.values())

            for event in events:
                send_event(event, sio, True, buffer, buffer_lock)
        

    threading.Thread(target = periodic, daemon = True).start()
    threading.Thread(target = resend_loop, daemon = True).start()

    while True:
        time.sleep(1)
            


    
    
    
    
