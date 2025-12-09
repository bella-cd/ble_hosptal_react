#==============================================================================
# SECTION 1: IMPORTS AND INITIALIZATION
#==============================================================================
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import pytz
import functools
import secrets
import requests

#------------------------------------------------------------------------------
# Initialize Flask app and enable CORS
app = Flask(__name__)
CORS(app)
app.secret_key = "change_this_secret"

#==============================================================================
# SECTION 2: DATABASE CONFIGURATION
#==============================================================================
client = MongoClient("mongodb://localhost:27017")
db = client["temp1_db"]
admin_users = db["admin_users"]
beacon_history = db["beacon_history"]
beacon_latest = db["beacon_latest"]
esp_mapping = db["esp_mapping"]
beacon_whitelist = db["beacon_whitelist"]

beacon_latest.create_index("mac", unique=True)
beacon_history.create_index([("mac", ASCENDING), ("time", ASCENDING)])

live_devices = []
LOCAL_TIMEZONE = pytz.timezone("Europe/Lisbon")

#============================================================================== 
# BEACON LOCATION AND SENT STATUS STATE
#==============================================================================
beacon_locations = {}
manually_sent_beacons = {}

#==============================================================================
# SECTION 3: AUTHENTICATION MIDDLEWARE
#==============================================================================
def auth_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        username = request.headers.get("X-User")
        if not username:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

#==============================================================================
# SECTION 4: USER AUTHENTICATION ENDPOINTS
#==============================================================================

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

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = admin_users.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"status": "ok", "username": username})

@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    username = data.get("username", "").strip().lower()
    user = admin_users.find_one({"username": username})
    # Always respond with generic message
    if not user:
        return jsonify({"message": "If the account exists, a reset email will be sent."}), 200
    token = secrets.token_urlsafe(48)
    expiry = datetime.utcnow() + timedelta(hours=1)
    admin_users.update_one(
        {"username": username},
        {"$set": {"reset_token": token, "reset_expiry": expiry}}
    )
    print(f"Password reset link: http://localhost:3000/reset-password?token={token}")
    return jsonify({"message": "If the account exists, a reset email will be sent."}), 200

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    token = data.get("token")
    new_password = data.get("password")
    user = admin_users.find_one({"reset_token": token})
    if not user or "reset_expiry" not in user or user["reset_expiry"] < datetime.utcnow():
        return jsonify({"error": "Invalid or expired token"}), 400
    admin_users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": generate_password_hash(new_password)},
         "$unset": {"reset_token": "", "reset_expiry": ""}}
    )
    return jsonify({"status": "ok", "message": "Password reset successful"})

#==============================================================================
# SECTION 5: DEVICE WHITELIST MANAGEMENT
#==============================================================================
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

@app.route("/api/whitelist/<mac>", methods=["DELETE"])
@auth_required
def delete_whitelist(mac):
    mac = mac.replace("-", ":").lower().strip().replace('"', '')
    beacon_whitelist.delete_one({"mac": mac})
    return jsonify({"status": "ok"})

#==============================================================================
# SECTION 6: ESP ROOM MAPPING MANAGEMENT
#==============================================================================
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

@app.route("/api/delete-room/<esp_id>", methods=["DELETE"])
@auth_required
def delete_room(esp_id):
    esp_mapping.delete_one({"esp_id": esp_id})
    return jsonify({"status": "ok"})

#==============================================================================
# SECTION 7: DEVICE DATA ENDPOINTS
#==============================================================================
@app.route("/api/data", methods=["GET"])
@auth_required
def get_data():
    return jsonify(live_devices)

@app.route("/api/beacon-history/<mac>", methods=["GET"])
@auth_required
def beacon_history_view(mac):
    mac = mac.replace("-", ":").lower().strip().replace('"', '')
    history = list(beacon_history.find({"mac": mac}, {"_id": 0}).sort("time", -1))
    return jsonify(history)

@app.route("/api/beacon-latest", methods=["GET"])
@auth_required
def beacon_latest_view():
    latest = list(beacon_latest.find({}, {"_id": 0}))
    return jsonify(latest)

@app.route("/api/all-beacons", methods=["GET"])
@auth_required
def get_all_beacons():
    whitelisted = list(beacon_whitelist.find({}, {"_id": 0}))
    active_beacons = list(beacon_latest.find({}, {"_id": 0}))
    active_macs = {b.get("mac") for b in active_beacons}
    active = [b for b in active_beacons]
    inactive = [b for b in whitelisted if b.get("mac") not in active_macs]
    return jsonify({
        "active": active,
        "inactive": inactive,
        "total_active": len(active),
        "total_inactive": len(inactive)
    })

#==============================================================================
# SECTION 8: BLE DATA INGESTION
#==============================================================================
@app.route("/api/bledata", methods=["POST"])
def bledata():
    global live_devices, beacon_locations, manually_sent_beacons

    devices = request.get_json()
    if not isinstance(devices, list):
        return jsonify({"error": "Invalid data format"}), 400

    now_dt = datetime.now(LOCAL_TIMEZONE)
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
    if not hasattr(bledata, "live_devices_dict"):
        bledata.live_devices_dict = {}

    for device in devices:
        mac = device["mac"].replace("-", ":").lower().strip().replace('"', '')
        device["mac"] = mac
        device["time"] = now_str

        mapping = esp_mapping.find_one({"esp_id": device.get("esp_id", "")})
        device["room"] = mapping["room"] if mapping else "unknown"
        key = f"{mac}_{device.get('esp_id','')}"
        bledata.live_devices_dict[key] = device.copy()

        if beacon_whitelist.find_one({"mac": mac}):
            beacon_history.insert_one({
                "esp_id": device.get("esp_id", ""),
                "esp_name": device.get("esp_name", ""),
                "room": device["room"],
                "mac": mac,
                "rssi": device.get("rssi", ""),
                "time": now_str,
            })
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
             # Location-change detection and message to Mirth
            if mac in beacon_locations and beacon_locations[mac] != device["room"]:
                old_room = beacon_locations[mac]
                new_room = device["room"]
                mirth_url = "http://192.168.1.117:6661"
                movement_payload = {
                    "event": "beacon_location_change",
                    "summary": f"Beacon {mac} moved from {old_room} to {new_room}",
                    "beacon": {
                        "esp_id": device.get("esp_id", ""),
                        "esp_name": device.get("esp_name", ""),
                        "room": new_room,
                        "mac": mac,
                        "rssi": device.get("rssi", ""),
                        "time": now_str
                    }
                }
                try:
                    requests.post(
                        mirth_url,
                        json=movement_payload,
                        timeout=5,
                        headers={'Content-Type': 'application/json'}
                    )
                except requests.exceptions.RequestException as e:
                    print(f"✗ Failed to send location change for {mac} to Mirth: {str(e)}")

            # Update stored location (always)
            beacon_locations[mac] = device["room"]
 
    live_devices = list(bledata.live_devices_dict.values())
    return jsonify({"status": "success", "received": len(devices)})

#==============================================================================
# SECTION 9: SEND ACTIVE BEACONS TO MIRTH (MANUAL)
#==============================================================================
@app.route("/api/send-active-beacons-to-mirth", methods=["POST"])
@auth_required
def send_active_beacons_to_mirth():
    global beacon_locations  # sent-beacon tracking not used anymore

    try:
        active_beacons = list(beacon_latest.find({}, {"_id": 0}))
        mirth_url = "http://192.168.1.117:6661"

        beacons_to_send = []
        sent_count = 0

        for beacon in active_beacons:
            mac = beacon.get("mac", "")
            room = beacon.get("room", "")
            # Always add every active beacon to the batch
            beacons_to_send.append({
                "esp_id": beacon.get("esp_id", ""),
                "esp_name": beacon.get("esp_name", ""),
                "room": room,
                "mac": mac,
                "rssi": beacon.get("rssi", ""),
                "time": beacon.get("time", "")
            })
            sent_count += 1

        payload = {
            "beacons": beacons_to_send,
            "summary": "Successfully sent active beacons to Mirth"
        }
        requests.post(
            mirth_url,
            json=payload,
            timeout=5,
            headers={'Content-Type': 'application/json'}
        )

        return jsonify({
            "status": "success",
            "message": "Successfully sent active beacons to Mirth",
            "sent_count": sent_count,
            "total_beacons": len(active_beacons)
        })

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

#==============================================================================
# SECTION 10: APPLICATION ENTRY POINT
#==============================================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
