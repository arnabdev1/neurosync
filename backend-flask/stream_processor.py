"""
stream_processor.py — NeuroSync Live EEG Pipeline
==================================================
Connects to a Muse 2 headband over LSL, applies real-time DSP, runs the
trained 1D-CNN for cognitive-state classification, and forwards every
inference result to the Node.js backend for MongoDB persistence.

Usage:
    1. Start the Muse 2 with an LSL bridge (e.g. BlueMuse, muselsl, or Mind Monitor).
    2. Start the Node.js backend on port 3000.
    3. Run:  python stream_processor.py
"""

import os
import csv
import time
import threading
from datetime import datetime
from collections import deque

import numpy as np
from scipy.signal import butter, filtfilt, iirnotch, welch
from scipy.stats import skew, kurtosis
import torch
import requests

from pylsl import StreamInlet, resolve_byprop

from model import NeuroSync1DCNN
from state_manager import InferencePipeline

# ─── Constants ────────────────────────────────────────────────────────────────
FS = 256                          # Muse 2 sample rate (Hz)
NUM_CHANNELS = 4                  # TP9, AF7, AF8, TP10
WINDOW_SEC = 5                    # Sliding window duration
WINDOW_SIZE = FS * WINDOW_SEC     # 1280 samples
PROCESS_INTERVAL = 1.0            # Run DSP + inference every 1 second
MODEL_NUM_FEATURES = 988          # Dimensionality the trained CNN expects
MODEL_PATH = "neurosync_model.pth"
NODE_BACKEND_URL = "http://localhost:5001/api/sensor-data"
NODE_EEG_RAW_URL = "http://localhost:5001/api/eeg-raw"
SESSION_DIR = os.path.join(os.path.dirname(__file__), "sessions")
RAW_SEND_INTERVAL = 0.20          # Send raw EEG batch to frontend every 200ms
RAW_DOWNSAMPLE = 4                # Keep every 4th sample → ~64 Hz for smooth charting

# Standard EEG frequency bands (Hz)
BANDS = {
    "delta": (1, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta":  (13, 30),
    "gamma": (30, 50),
}

STATE_MAP = {0: "DEEP WORK", 1: "FLOW", 2: "STRESS", 3: "SCATTERED", 4: "DROWSY"}


# ─── 1. LSL Data Ingestion ───────────────────────────────────────────────────

def resolve_eeg_stream(timeout: float = 10.0) -> StreamInlet:
    """Resolve the first EEG stream on the local network and return an Inlet."""
    print("🔍 Searching for Muse EEG stream on the network …")
    streams = resolve_byprop("type", "EEG", timeout=timeout)
    if not streams:
        raise RuntimeError(
            "No EEG stream found. Ensure the Muse 2 is streaming via LSL "
            "(e.g. BlueMuse, muselsl, or Mind Monitor)."
        )
    inlet = StreamInlet(streams[0], max_chunklen=FS)
    print(f"✅ Connected to stream: {streams[0].name()} ({streams[0].channel_count()} ch @ {int(streams[0].nominal_srate())} Hz)")
    return inlet


# ─── 2. DSP & Feature Extraction ─────────────────────────────────────────────

def _butter_bandpass(lowcut: float, highcut: float, fs: int, order: int = 4):
    nyq = 0.5 * fs
    b, a = butter(order, [lowcut / nyq, highcut / nyq], btype="band")
    return b, a


def _notch_filter(freq: float, fs: int, Q: float = 30.0):
    b, a = iirnotch(freq, Q, fs)
    return b, a


def apply_filters(data: np.ndarray, fs: int = FS) -> np.ndarray:
    """
    Apply a 1-50 Hz bandpass filter and a 60 Hz notch filter to each channel.
    data shape: (samples, channels)
    """
    bp_b, bp_a = _butter_bandpass(1.0, 50.0, fs)
    notch_b, notch_a = _notch_filter(60.0, fs)

    filtered = np.empty_like(data)
    for ch in range(data.shape[1]):
        x = filtfilt(bp_b, bp_a, data[:, ch])
        filtered[:, ch] = filtfilt(notch_b, notch_a, x)
    return filtered


def compute_band_powers(psd: np.ndarray, freqs: np.ndarray) -> dict:
    """
    Given PSD array (freq_bins, channels) and frequency vector, return
    absolute power per band per channel and a per-channel focus score.
    """
    powers: dict = {}
    for band_name, (lo, hi) in BANDS.items():
        idx = np.where((freqs >= lo) & (freqs <= hi))[0]
        powers[band_name] = np.trapezoid(psd[idx, :], freqs[idx], axis=0)  # (channels,)

    # Focus Score = Beta / Theta  (per channel, then averaged)
    with np.errstate(divide="ignore", invalid="ignore"):
        focus = np.where(
            powers["theta"] > 0,
            powers["beta"] / powers["theta"],
            0.0,
        )
    powers["focus_score"] = float(np.mean(focus))
    return powers


def extract_features(filtered: np.ndarray, prev_features: np.ndarray | None, fs: int = FS) -> np.ndarray:
    """
    Build a feature vector from the latest 1-second filtered window.
    The trained model expects 988 features per timestep.

    Strategy:
        • Compute rich statistical + spectral + cross-channel features for the
          current 1-second window (~494 values).
        • Prepend the previous window's features as "lag-1" context (the Jordan
          Bird dataset the model was trained on uses this exact pattern).
        • Pad or truncate to exactly 988 dimensions.

    filtered shape: (samples, 4)
    """
    feats: list[float] = []

    # ── Per-channel statistics ────────────────────────────────────────────
    for ch in range(filtered.shape[1]):
        x = filtered[:, ch]
        half = len(x) // 2
        q1, q2, q3, q4 = np.percentile(x, [25, 50, 75, 100])

        feats.extend([
            float(np.mean(x)),
            float(np.std(x)),
            float(skew(x)),
            float(kurtosis(x)),
            float(np.max(x)),
            float(np.min(x)),
            float(q1), float(q2), float(q3), float(q4),
            # Half-wave differences
            float(np.mean(x[:half]) - np.mean(x[half:])),
            float(np.max(x[:half]) - np.max(x[half:])),
            float(np.min(x[:half]) - np.min(x[half:])),
            # Quartile differences
            float(q1 - q2), float(q1 - q3), float(q1 - q4),
            float(q2 - q3), float(q2 - q4), float(q3 - q4),
        ])

    # ── Cross-channel covariance & eigenvalues ────────────────────────────
    cov = np.cov(filtered, rowvar=False)                    # (4, 4)
    iu = np.triu_indices(NUM_CHANNELS)
    feats.extend(cov[iu].tolist())                          # 10 values
    feats.extend(np.linalg.eigvalsh(cov).tolist())          # 4 eigenvalues
    log_cov = np.zeros_like(cov)
    np.fill_diagonal(log_cov, np.log1p(np.abs(np.diag(cov))))
    feats.extend(log_cov[iu].tolist())                      # 10 values

    # ── Spectral features (PSD via Welch) ─────────────────────────────────
    nperseg = min(len(filtered), fs)
    freqs, psd = welch(filtered, fs=fs, nperseg=nperseg, axis=0)  # (bins, 4)

    # Keep bins 1-75 Hz
    mask = (freqs >= 1) & (freqs <= 75)
    psd_trimmed = psd[mask, :]
    for ch in range(NUM_CHANNELS):
        feats.extend(psd_trimmed[:, ch].tolist())

    # Band powers
    for _, (lo, hi) in BANDS.items():
        idx = np.where((freqs >= lo) & (freqs <= hi))[0]
        for ch in range(NUM_CHANNELS):
            feats.append(float(np.trapezoid(psd[idx, ch], freqs[idx])))

    # Top-10 peak frequencies per channel
    for ch in range(NUM_CHANNELS):
        ch_psd = psd[:, ch]
        top_idx = np.argsort(ch_psd)[-10:][::-1]
        feats.extend(freqs[top_idx].tolist())

    # ── Build current-window vector ───────────────────────────────────────
    current = np.array(feats, dtype=np.float32)

    # Lag-1 features (previous 1-second window — mirrors training data)
    if prev_features is None:
        lag = np.zeros_like(current)
    else:
        lag = prev_features

    # Concatenate [lag1 | current] to match training schema
    combined = np.concatenate([lag, current])

    # Pad or truncate to MODEL_NUM_FEATURES (988)
    if len(combined) < MODEL_NUM_FEATURES:
        combined = np.pad(combined, (0, MODEL_NUM_FEATURES - len(combined)))
    else:
        combined = combined[:MODEL_NUM_FEATURES]

    return combined, current  # return current so it becomes next iteration's lag


# ─── 3. ML Inference ─────────────────────────────────────────────────────────

def load_model(path: str = MODEL_PATH) -> NeuroSync1DCNN:
    """Load trained weights into the CNN and set to eval mode."""
    model = NeuroSync1DCNN(num_features=MODEL_NUM_FEATURES)
    try:
        model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
        print(f"🧠 Model loaded from {path}")
    except FileNotFoundError:
        print(f"⚠️  {path} not found — running with random weights (demo mode)")
    model.eval()
    return model


# ─── 4. Node.js Data Forwarding ──────────────────────────────────────────────

def forward_to_node(payload: dict, url: str = NODE_BACKEND_URL) -> None:
    """
    Fire-and-forget POST to the Node backend.
    Runs in a daemon thread so the main loop is never blocked.
    """
    def _post():
        try:
            requests.post(url, json=payload, timeout=2)
        except requests.exceptions.RequestException:
            pass  # Node server offline — silently skip

    threading.Thread(target=_post, daemon=True).start()


def forward_raw_eeg(samples: list) -> None:
    """Send a batch of raw EEG samples to Node for WebSocket broadcast."""
    def _post():
        try:
            requests.post(NODE_EEG_RAW_URL, json={"samples": samples}, timeout=1)
        except requests.exceptions.RequestException:
            pass

    threading.Thread(target=_post, daemon=True).start()


# ─── Main Loop ────────────────────────────────────────────────────────────────

def _open_session_csv() -> tuple[csv.writer, object]:
    """Create a timestamped CSV file inside sessions/ and return a writer."""
    os.makedirs(SESSION_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = os.path.join(SESSION_DIR, f"session_{ts}.csv")
    fh = open(path, "w", newline="")
    writer = csv.writer(fh)
    writer.writerow([
        "timestamp", "delta", "theta", "alpha", "beta", "gamma",
        "focus_score", "state", "transition",
    ])
    print(f"📝 Session log → {path}")
    return writer, fh


def main():
    # ── Setup ─────────────────────────────────────────────────────────────
    inlet = resolve_eeg_stream()
    model = load_model()
    pipeline = InferencePipeline()
    csv_writer, csv_fh = _open_session_csv()

    # Ring-buffer for the 5-second sliding window (1280 × 4)
    ring_buffer = deque(maxlen=WINDOW_SIZE)
    prev_features: np.ndarray | None = None
    last_process_time = time.monotonic()
    last_raw_send_time = time.monotonic()
    raw_batch: list = []      # accumulate downsampled samples for WebSocket

    print("\n🚀 Live streaming started.  Press Ctrl+C to stop.\n")

    try:
        while True:
            # Pull whatever samples are available (non-blocking chunk pull)
            chunk, _ = inlet.pull_chunk(timeout=0.0, max_samples=FS)
            if chunk:
                for i, sample in enumerate(chunk):
                    ring_buffer.append(sample[:NUM_CHANNELS])
                    # Downsample for live chart: keep every Nth sample
                    if i % RAW_DOWNSAMPLE == 0:
                        raw_batch.append([round(float(v), 2) for v in sample[:NUM_CHANNELS]])

            # Send raw EEG batch to Node every 200ms
            now = time.monotonic()
            if raw_batch and now - last_raw_send_time >= RAW_SEND_INTERVAL:
                forward_raw_eeg(raw_batch)
                raw_batch = []
                last_raw_send_time = now

            # Only process once per second and when buffer is full
            now = time.monotonic()
            if now - last_process_time < PROCESS_INTERVAL:
                time.sleep(0.005)  # yield CPU — prevents busy-wait
                continue
            last_process_time = now

            if len(ring_buffer) < WINDOW_SIZE:
                print(f"   Buffering … {len(ring_buffer)}/{WINDOW_SIZE} samples")
                continue

            # ── DSP ───────────────────────────────────────────────────────
            window = np.array(ring_buffer, dtype=np.float64)      # (1280, 4)
            filtered = apply_filters(window)

            # Latest 1-second slice for feature extraction
            one_sec = filtered[-FS:]

            # Band powers for logging / forwarding
            freqs, psd = welch(one_sec, fs=FS, nperseg=FS, axis=0)
            powers = compute_band_powers(psd, freqs)
            focus_score = powers["focus_score"]

            # ── Feature extraction → 988-dim vector ───────────────────────
            feature_vec, prev_features = extract_features(one_sec, prev_features)

            # ── ML Inference via existing InferencePipeline ───────────────
            state_changed, current_state = pipeline.add_data_and_predict(
                feature_vec.tolist(), model
            )

            # ── Terminal log ──────────────────────────────────────────────
            state_label = current_state.upper()
            delta_p = float(np.mean(powers["delta"]))
            theta_p = float(np.mean(powers["theta"]))
            alpha_p = float(np.mean(powers["alpha"]))
            beta_p  = float(np.mean(powers["beta"]))
            gamma_p = float(np.mean(powers["gamma"]))

            print(
                f"[Live] Focus Score: {focus_score:.2f} | "
                f"State: {state_label:>10s} | "
                f"D:{delta_p:.3f} T:{theta_p:.3f} A:{alpha_p:.3f} "
                f"B:{beta_p:.3f} G:{gamma_p:.3f}"
                + ("  🔥 TRANSITION" if state_changed else "")
            )

            # ── Save to local CSV ─────────────────────────────────────────
            csv_writer.writerow([
                time.time(), delta_p, theta_p, alpha_p, beta_p, gamma_p,
                focus_score, current_state, state_changed,
            ])
            csv_fh.flush()  # ensure data is written even on crash

            # ── Forward to Node.js / MongoDB (non-blocking) ───────────────
            payload = {
                "timestamp": time.time(),
                "pre_ml": {
                    "delta": delta_p,
                    "theta": theta_p,
                    "alpha": alpha_p,
                    "beta":  beta_p,
                    "gamma": gamma_p,
                    "focus_score": focus_score,
                },
                "post_ml": {
                    "state": current_state,
                    "transition_triggered": state_changed,
                },
            }
            forward_to_node(payload)

    except KeyboardInterrupt:
        print("\n⏹  Stream stopped by user.")
    finally:
        csv_fh.close()
        print("📁 Session CSV saved.")


if __name__ == "__main__":
    main()
