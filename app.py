from flask import Flask, render_template, jsonify
import cloudinary.uploader
from cloudinary_config import *
import cv2, os, time, random

app = Flask(__name__)

# ---------- SAFE DIRECTORY CREATION ----------
for folder in ["captured", "captured/images", "captured/videos"]:
    if not os.path.exists(folder):
        os.mkdir(folder)

# ---------- DATA ----------
vehicle_location = {"lat": 1.595669, "lng": 7.452987}

sensor_data = {
    "motion": "No Motion",
    "tilt": "Normal",
    "status": "SAFE"
}

media_store = {
    "images": [],
    "videos": []
}

alert_log = []

# ---------- CAMERA FUNCTIONS ----------
def capture_image():
    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    time.sleep(1)

    ret, frame = cam.read()
    cam.release()

    if ret:
        path = f"captured/images/img_{int(time.time())}.jpg"
        cv2.imwrite(path, frame)

        result = cloudinary.uploader.upload(
            path, folder="vehicle/images"
        )
        media_store["images"].append(result["secure_url"])

def capture_video(duration=5):
    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    path = f"captured/videos/vid_{int(time.time())}.avi"
    out = cv2.VideoWriter(path, fourcc, 20.0, (640, 480))

    start = time.time()
    while time.time() - start < duration:
        ret, frame = cam.read()
        if ret:
            out.write(frame)

    cam.release()
    out.release()

    result = cloudinary.uploader.upload(
        path,
        resource_type="video",
        folder="vehicle/videos"
    )
    media_store["videos"].append(result["secure_url"])

# ---------- ROUTES ----------
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route("/get_location")
def get_location():
    return jsonify(vehicle_location)

@app.route("/sensor_status")
def sensor_status():
    return jsonify(sensor_data)

@app.route("/media")
def media():
    return jsonify(media_store)

@app.route("/alerts")
def alerts():
    return jsonify(alert_log)

@app.route("/simulate_move")
def simulate_move():
    vehicle_location["lat"] += random.uniform(0.0001, 0.0003)
    vehicle_location["lng"] += random.uniform(0.0001, 0.0003)
    return {"message": "Vehicle moved"}

@app.route("/simulate_theft")
def simulate_theft():
    sensor_data.update({
        "motion": "Detected",
        "tilt": "Abnormal",
        "status": "ALERT"
    })

    capture_image()
    capture_video()

    alert_log.append({
        "time": time.ctime(),
        "event": "Theft Detected"
    })

    return {"message": "Theft simulated"}

@app.route("/reset")
def reset():
    sensor_data.update({
        "motion": "No Motion",
        "tilt": "Normal",
        "status": "SAFE"
    })
    return {"message": "Reset"}

@app.route("/delete_image", methods=["POST"])
def delete_image():
    from flask import request

    url = request.json.get("url")

    if url in media_store["images"]:
        media_store["images"].remove(url)

    return {"message": "Image removed from dashboard"}

@app.route("/delete_video", methods=["POST"])
def delete_video():
    from flask import request

    url = request.json.get("url")

    if url in media_store["videos"]:
        media_store["videos"].remove(url)

    return {"message": "Video removed from dashboard"}



if __name__ == "__main__":
    app.run(debug=False)
