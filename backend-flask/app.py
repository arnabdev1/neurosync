from flask import Flask, request, jsonify, make_response
import requests
import time
import torch
from model import NeuroSync1DCNN
from state_manager import InferencePipeline
from stream_control import start_stream, stop_stream, get_status

app = Flask(__name__)

@app.before_request
def handle_preflight():
    """Respond to CORS preflight OPTIONS requests immediately."""
    if request.method == "OPTIONS":
        response = make_response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return response

# 1. Initialize the Pipeline and Model
# Adjust num_features to match the exact output shape of your feature extractor
model = NeuroSync1DCNN(num_features=988)
model.eval() # Set model to inference mode

pipeline = InferencePipeline()

# Point this to the endpoint where your LLM logic lives
AGENTIC_CORE_URL = "http://localhost:5001/api/agent/trigger"

def notify_agentic_core(new_state):
    """Fires an event to the LLM agent when a confirmed cognitive shift occurs."""
    payload = {
        "event": "cognitive_shift",
        "new_state": new_state,
        "timestamp": time.time()
    }
    try:
        requests.post(AGENTIC_CORE_URL, json=payload, timeout=2)
        print(f"🔥 Transition Event Sent: Shifted to {new_state}")
    except requests.exceptions.RequestException:
        print("Agentic Core unreachable. Ensure the Node backend is running.")

@app.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    """
    Ingests 1-second arrays of spectral + HRV data from the Muse 2 stream.
    Expected JSON format: {"features": [0.12, 0.45, ..., 0.89]}
    """
    data = request.json
    if not data or 'features' not in data:
        return jsonify({"error": "Invalid payload format"}), 400
        
    features = data['features']
    
    # Push data into the sliding window and evaluate
    state_changed, current_state = pipeline.add_data_and_predict(features, model)
    
    # If the 3-sec / 85% threshold is met, notify the LLM
    if state_changed:
        notify_agentic_core(current_state)
        
    return jsonify({
        "status": "success", 
        "current_state": current_state,
        "transition_triggered": state_changed
    })

# ─── Stream Control Endpoints ────────────────────────────────────────────────

@app.route('/api/stream/start', methods=['POST'])
def stream_start():
    """Start muselsl + stream_processor.  Optional JSON body: {"muse_name": "Muse-XXXX"}"""
    data = request.get_json(silent=True) or {}
    result = start_stream(muse_name=data.get("muse_name"))
    return jsonify(result)

@app.route('/api/stream/stop', methods=['POST'])
def stream_stop():
    """Kill muselsl + stream_processor."""
    result = stop_stream()
    return jsonify(result)

@app.route('/api/stream/status', methods=['GET'])
def stream_status():
    """Poll current stream status (disconnected | connecting | connected | error)."""
    return jsonify(get_status())


if __name__ == '__main__':
    app.run(port=5002, debug=True)