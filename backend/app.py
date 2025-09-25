# Import required libraries
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import pytz
import functools

# Initialize Flask app and enable CORS
app = Flask(__name__)
CORS(app)
app.secret_key = "change_this_secret"

# Connect to MongoDB and define collections
client = MongoClient("mongodb://localhost:27017")
db = client["temp1_db"]
admin_users = db["admin_users"]
beacon_history = db["beacon_history"]
beacon_latest = db["beacon_latest"]
esp_mapping = db["esp_mapping"]
beacon_whitelist = db["beacon_whitelist"]

# Create indexes for faster queries
beacon_latest.create_index("mac", unique=True)
beacon_history.create_index([("mac", ASCENDING), ("time", ASCENDING)])

# Store live device data in memory
live_devices = []

# Set local timezone for timestamps
LOCAL_TIMEZONE = pytz.timezone("Europe/Lisbon")

# Decorator for authentication on protected routes
def auth_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        username = request.headers.get("X-User")
        if not username:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

# User signup endpoint
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

# User login endpoint
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = admin_users.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"status": "ok", "username": username})

# Whitelist management endpoint (add/get MAC addresses)
@app.route("/api/whitelist", methods=["GET", "POST"])
@auth_required
def whitelist():
    if request.method == "POST":
        data = request.json
        mac = data.get("mac", "").replace("-", ":").lower().strip().replace('"', '')
        if not mac:
            return jsonify({"error": "No MAC specified"}), 400
        if beacon_whitelist.find_one({"mac": mac}):
            return jsonify({"error": "MAC already whitelisted"}), 400
        beacon_whitelist.insert_one({"mac": mac, "added_at": datetime.now(LOCAL_TIMEZONE)})
        return jsonify({"status": "ok"})
    wl = list(beacon_whitelist.find({}, {"_id": 0}))
    return jsonify(wl)

# Remove MAC address from whitelist
@app.route("/api/whitelist/<mac>", methods=["DELETE"])
@auth_required
def delete_whitelist(mac):
    mac = mac.replace("-", ":").lower().strip().replace('"', '')
    beacon_whitelist.delete_one({"mac": mac})
    return jsonify({"status": "ok"})

# ESP mapping endpoint (add/get ESP to room mapping)
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

# Remove ESP room mapping
@app.route("/api/delete-room/<esp_id>", methods=["DELETE"])
@auth_required
def delete_room(esp_id):
    esp_mapping.delete_one({"esp_id": esp_id})
    return jsonify({"status": "ok"})

# Get current live device data
@app.route("/api/data", methods=["GET"])
@auth_required
def get_data():
    return jsonify(live_devices)

# Get beacon history for a specific MAC address
@app.route("/api/beacon-history/<mac>", methods=["GET"])
@auth_required
def beacon_history_view(mac):
    mac = mac.replace("-", ":").lower().strip().replace('"', '')
    history = list(beacon_history.find({"mac": mac}, {"_id": 0}).sort("time", -1))
    return jsonify(history)

# Get latest beacon data for all devices
@app.route("/api/beacon-latest", methods=["GET"])
@auth_required
def beacon_latest_view():
    latest = list(beacon_latest.find({}, {"_id": 0}))
    return jsonify(latest)

# BLE data ingestion endpoint (receives device data from ESPs)
@app.route("/api/bledata", methods=["POST"])
def bledata():
    global live_devices
    # Get device data from POST request
    devices = request.get_json()
    # Validate that the data is a list
    if not isinstance(devices, list):
        return jsonify({"error": "Invalid data format"}), 400

    # Get current timestamp in local timezone
    now_dt = datetime.now(LOCAL_TIMEZONE)
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")

    # Initialize live_devices_dict if not present
    if not hasattr(bledata, "live_devices_dict"):
        bledata.live_devices_dict = {}

    # Process each device in the received list
    for device in devices:
        # Normalize MAC address and add timestamp
        mac = device["mac"].replace("-", ":").lower().strip().replace('"', '')
        device["mac"] = mac
        device["time"] = now_str

        # Lookup ESP mapping for room assignment
        mapping = esp_mapping.find_one({"esp_id": device.get("esp_id", "")})
        device["room"] = mapping["room"] if mapping else "unknown"
        # Create a unique key for the device (MAC + ESP ID)
        key = f"{mac}_{device.get('esp_id','')}"
        # Store device in live_devices_dict
        bledata.live_devices_dict[key] = device.copy()

        # If device MAC is whitelisted, update history and latest tables
        if beacon_whitelist.find_one({"mac": mac}):
            # Insert device data into beacon_history collection
            beacon_history.insert_one({
                "esp_id": device.get("esp_id", ""),
                "esp_name": device.get("esp_name", ""),
                "room": device["room"],
                "mac": mac,
                "rssi": device.get("rssi", ""),
                "time": now_str,
            })
            # Update beacon_latest collection with most recent data
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
    # Update global live_devices list with current device states
    live_devices = list(bledata.live_devices_dict.values())
    # Return success response with count of received devices
    return jsonify({"status": "success", "received": len(devices)})

# Run the Flask app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
