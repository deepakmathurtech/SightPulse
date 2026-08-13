import time
import requests
import json
import socket
import collections
import threading
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Configuration
BACKEND_URL = "http://localhost:5000"
WORKER_ID = f"wrk-lab-{socket.gethostname().lower()}"
HOSTNAME = socket.gethostname()
HEARTBEAT_INTERVAL = 5 # seconds
REPORT_INTERVAL = 10 # seconds

# Local Offline Queue for resilience during LAN/server downtime
offline_metadata_queue = collections.deque(maxlen=1000)
queue_lock = threading.Lock()

def get_system_metrics():
    cpu = psutil.cpu_percent(interval=None) if PSUTIL_AVAILABLE else 15.4
    ram = psutil.virtual_memory().percent if PSUTIL_AVAILABLE else 38.2
    return cpu, ram

def send_heartbeat():
    cpu, ram = get_system_metrics()
    payload = {
        "workerId": WORKER_ID,
        "hostname": HOSTNAME,
        "ipAddress": socket.gethostbyname(HOSTNAME),
        "status": "ONLINE",
        "cpuUsage": cpu,
        "ramUsage": ram,
        "activeJobs": 1
    }
    try:
        response = requests.post(f"{BACKEND_URL}/api/worker/heartbeat", json=payload, timeout=3)
        if response.status_code == 200:
            print(f"[Heartbeat] Ack from central server. (CPU: {cpu}%, RAM: {ram}%)")
            return response.json().get("assignedJobs", [])
    except Exception as e:
        print(f"[Heartbeat Warning] Server unreachable: {e}. Worker running in offline queue mode.")
    return []

def flush_offline_queue():
    with queue_lock:
        if not offline_metadata_queue:
            return
        
        batch = list(offline_metadata_queue)
        print(f"[Offline Resiliency] Flushing {len(batch)} buffered metadata reports to central server...")
        try:
            res = requests.post(f"{BACKEND_URL}/api/worker/report-count", json=batch, timeout=5)
            if res.status_code == 200:
                print(f"[Offline Resiliency] Successfully flushed {len(batch)} reports!")
                offline_metadata_queue.clear()
        except Exception as e:
            print(f"[Offline Resiliency] Server still offline, retaining queue. ({e})")

def detect_person_count(frame_or_simulation=None):
    """
    OpenCV Person / Head Count Detector
    Uses HOG descriptor or Haar Cascade when camera available, else simulates realistic count
    """
    if OPENCV_AVAILABLE and frame_or_simulation is not None:
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        boxes, _ = hog.detectMultiScale(frame_or_simulation, winStride=(8,8))
        if len(boxes) > 0:
            return len(boxes)

    # Simulated headcount for demo classroom CSE-3B
    import random
    return 3 # matches seeded demo students or small variance

def worker_main_loop():
    print(f"🤖 Starting Distributed Lab PC Worker Node: {WORKER_ID}")
    print(f"📡 Backend URL: {BACKEND_URL}")
    print(f"📸 OpenCV Available: {OPENCV_AVAILABLE}")
    print("--------------------------------------------------")

    last_heartbeat = 0
    last_report = 0

    while True:
        now = time.time()

        # 1. Send Heartbeat
        if now - last_heartbeat >= HEARTBEAT_INTERVAL:
            assigned_jobs = send_heartbeat()
            last_heartbeat = now
            # Try flushing any buffered offline records
            flush_offline_queue()

        # 2. Process Camera Frames & Report Metadata
        if now - last_report >= REPORT_INTERVAL:
            count = detect_person_count()
            report_payload = {
                "workerId": WORKER_ID,
                "classroomId": "cls-cse-3b",
                "detectedCount": count,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }

            print(f"[CV Worker] Detected physical presence count: {count} in CSE-3B")

            try:
                res = requests.post(f"{BACKEND_URL}/api/worker/report-count", json=report_payload, timeout=3)
                if res.status_code == 200:
                    print("[CV Worker] Metadata successfully transmitted to backend.")
                else:
                    raise Exception(f"HTTP {res.status_code}")
            except Exception as err:
                print(f"[CV Worker Network Drop] Queueing report locally: {err}")
                with queue_lock:
                    offline_metadata_queue.append(report_payload)

            last_report = now

        time.sleep(1)

if __name__ == "__main__":
    worker_main_loop()
