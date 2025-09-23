from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import functools

app = Flask(__name__)
CORS(app)
app.secret_key = "change_this_secret"

client = MongoClient("mongodb://localhost:27017")
db = client["temp_db"]
admin_users = db["admin_users"]
beacon_history = db["beacon_history"]
beacon_latest = db["beacon_latest"]
esp_mapping = db["esp_mapping"]

beacon_latest.create_index("mac", unique=True)
TRACKED_BEACONS = {
    "c3:00:00:13:3b:b7",
    "c3:00:00:13:3b:f2",
    "c3:00:00:13:3c:1e"
}

live_devices = []

## Decorator to require 'X-User' header for authentication
def auth_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        username = request.headers.get("X-User")
        if not username:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

## Endpoint to register a new admin user
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if admin_users.find_one({"username": username}):
        return jsonify({"error": "User already exists"}), 400
    admin_users.insert_one({
        "username": username,
        "password": generate_password_hash(password)
    })
    return jsonify({"status": "ok", "message": "Signup successful"})

## Endpoint to authenticate and log in an admin user
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = admin_users.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"status": "ok", "username": username})

## Endpoint to add or get ESP-to-room mappings
@app.route("/api/esp-mapping", methods=["GET", "POST"])
@auth_required
def esp_mapping_api():
    if request.method == "POST":
        data = request.json
        esp_id = data.get("esp_id")
        room = data.get("room")
        if not esp_id or not room:
            return jsonify({"error": "Missing fields"}), 400
        esp_mapping.update_one({"esp_id": esp_id}, {"$set": {"room": room}}, upsert=True)
        return jsonify({"status": "ok"})
    rooms = list(esp_mapping.find({}, {"_id": 0}))
    return jsonify(rooms)

## Endpoint to delete an ESP-to-room mapping
@app.route("/api/delete-room/<esp_id>", methods=["DELETE"])
@auth_required
def delete_room(esp_id):
    esp_mapping.delete_one({"esp_id": esp_id})
    return jsonify({"status": "ok"})

## Endpoint to get the current live BLE devices
@app.route("/api/data", methods=["GET"])
@auth_required
def get_data():
    return jsonify(live_devices)

## Endpoint to get the history of a specific beacon by MAC address
@app.route("/api/beacon-history/<mac>", methods=["GET"])
@auth_required
def beacon_history_view(mac):
    history = list(beacon_history.find({"mac": mac.lower()}, {"_id": 0}).sort("time", -1))
    return jsonify(history)

## Endpoint to get the latest data for all tracked beacons
@app.route("/api/beacon-latest", methods=["GET"])
@auth_required
def beacon_latest_view():
    latest = list(beacon_latest.find({}, {"_id": 0}))
    return jsonify(latest)

## Endpoint to receive BLE device data and update live device list, beacon history, and latest beacon info
@app.route("/api/bledata", methods=["POST"])
def bledata():
    global live_devices  # Use global variable to store live devices
    devices = request.get_json()
    # Validate that the incoming data is a list
    if not isinstance(devices, list):
        return jsonify({"error": "Invalid data format"}), 400

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # Current timestamp
    # Initialize live_devices_dict if not already present
    if not hasattr(bledata, "live_devices_dict"):
        bledata.live_devices_dict = {}
    for device in devices:
        # Normalize MAC address and add timestamp
        mac = device["mac"].replace("-", ":").lower()
        device["mac"] = mac
        device["time"] = now_str

        # Find room mapping for ESP device
        mapping = esp_mapping.find_one({"esp_id": device.get("esp_id", "")})
        device["room"] = mapping["room"] if mapping else "unknown"
        key = f"{mac}_{device.get('esp_id','')}"
        bledata.live_devices_dict[key] = device.copy()

        # If device is a tracked beacon, update history and latest info
        if mac in TRACKED_BEACONS:
            # Add entry to beacon history collection
            beacon_history.insert_one({
                "esp_id": device.get("esp_id", ""),
                "esp_name": device.get("esp_name", ""),
                "room": device["room"],
                "mac": mac,
                "rssi": device.get("rssi", ""),
                "time": now_str,
            })
            # Update latest beacon info for this MAC
            beacon_latest.update_one(
                {"mac": mac},
                {"$set": {
                    "esp_id": device.get("esp_id", ""),
                    "esp_name": device.get("esp_name", ""),
                    "room": device["room"],
                    "mac": mac,
                    "rssi": device.get("rssi", ""),
                    "time": now_str,
                }},
                upsert=True
            )
    # Update global live_devices list with latest data
    live_devices = list(bledata.live_devices_dict.values())
    # Return success response with count of received devices
    return jsonify({"status": "success", "received": len(devices)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
