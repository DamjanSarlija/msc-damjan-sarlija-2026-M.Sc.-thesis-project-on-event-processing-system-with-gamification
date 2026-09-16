import socketio
import random
import time
import threading
import sys
import datetime
import uuid
import argparse
import json

def target(session_time):
    gamification_constants = {}
    gamification_intervals = {}
    with open("gamification.json") as gamification_configuration:
        gamification_constants = json.load(gamification_configuration)
        gamification_intervals = gamification_constants["intervals"]
    if session_time >= 0 and session_time < 10:
        return gamification_intervals["0 - 10"]
    elif session_time >= 10 and session_time < 20:
        return gamification_intervals["10 - 20"]
    elif session_time >= 20 and session_time < 30:
        return gamification_intervals["20 - 30"]
    elif session_time >= 30 and session_time < 40:
        return gamification_intervals["30 - 40"]
    elif session_time >= 40 and session_time < 50:
        return gamification_intervals["40 - 50"]
    elif session_time >= 50:
        return gamification_intervals["50 - 60"]

def get_tolerance():
    tolerance = 0
    gamificarion_coonstants = {}
    with open("gamification.json") as gamification_configuration:
        gamification_constants = json.load(gamification_configuration)
        tolerance = gamification_constants["tolerance"]
    return tolerance

def get_success_threshold():
    success_threshold = 0
    gamification_constants = {}
    with open("gamification.json") as gamification_configuration:
        gamification_constants = json.load(gamification_configuration)
        success_threshold = gamification_constants["success_threshold"]
    return success_threshold

session_states = {}



def assign_session_id(device_id):
    session_states[device_id] = {
        "session_id": device_id,
        "score": 0,
        "total_events": 0,
        "correct_events": 0,
        "session_start": 0,
        "success": False
    }
    


def gamify_event(event):
    device_id = event["device_id"]
    session_state = session_states[device_id]
    if session_state["total_events"] == 0:
        session_state["session_start"] = datetime.datetime.fromisoformat(event["generated_at"])
    session_state["total_events"] += 1
    value = event["value"]
    event_time = datetime.datetime.fromisoformat(event["generated_at"])
    session_time = int((event_time - session_state["session_start"]).total_seconds())
    lower_bound = target(session_time)["lower_bound"]
    upper_bound = target(session_time)["upper_bound"]
    tolerance = get_tolerance()
    if value >= (1 - tolerance) * lower_bound and value <= (1 + tolerance) * upper_bound:
        session_state["correct_events"] += 1
    session_state["score"] = session_state["correct_events"] / session_state["total_events"]
    success_threshold = get_success_threshold()
    if session_state["score"] >= success_threshold:
        session_state["success"] = True
    else:
        session_state["success"] = False

    game_data = session_state.copy()
    if game_data["session_start"] is not None:
        game_data["session_start"] = game_data["session_start"].isoformat()
    event["game"] = game_data
    return event

