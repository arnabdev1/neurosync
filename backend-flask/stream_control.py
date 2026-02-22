"""
stream_control.py — Manages the Muse LSL bridge & stream processor lifecycle
=============================================================================
Spawns / stops `muselsl stream` and `stream_processor.py` as subprocesses.
All subprocess output is written to `logs/` files AND printed to the Flask
terminal.  A background watchdog detects when either process dies and flips
the status back to DISCONNECTED automatically.
"""

import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from enum import Enum

# ─── State ────────────────────────────────────────────────────────────────────

class StreamStatus(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"

_status: StreamStatus = StreamStatus.DISCONNECTED
_error_msg: str = ""
_muselsl_proc: subprocess.Popen | None = None
_processor_proc: subprocess.Popen | None = None
_lock = threading.Lock()
_watchdog_thread: threading.Thread | None = None

# Muse device name — can be overridden via /api/stream/start body
DEFAULT_MUSE_NAME = "Muse-2C6E"

# Path helpers
_DIR = os.path.dirname(os.path.abspath(__file__))
_VENV_PYTHON = os.path.join(_DIR, "venv", "bin", "python")
_MUSELSL_BIN = os.path.join(_DIR, "venv", "bin", "muselsl")
_STREAM_PROCESSOR = os.path.join(_DIR, "stream_processor.py")
_LOG_DIR = os.path.join(_DIR, "logs")

# ─── Logging helpers ─────────────────────────────────────────────────────────

def _ensure_log_dir():
    os.makedirs(_LOG_DIR, exist_ok=True)

def _log(msg: str):
    """Print to Flask terminal AND append to logs/stream_control.log."""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        _ensure_log_dir()
        with open(os.path.join(_LOG_DIR, "stream_control.log"), "a") as f:
            f.write(line + "\n")
    except OSError:
        pass

def _open_log_file(name: str):
    """Return an open file handle for writing subprocess output."""
    _ensure_log_dir()
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = os.path.join(_LOG_DIR, f"{name}_{ts}.log")
    _log(f"Log file: {path}")
    return open(path, "w", buffering=1)  # line-buffered


# ─── Public API ───────────────────────────────────────────────────────────────

def get_status() -> dict:
    """Return the current stream status as a serialisable dict."""
    return {
        "status": _status.value,
        "error": _error_msg if _status == StreamStatus.ERROR else None,
    }


def start_stream(muse_name: str | None = None) -> dict:
    global _status, _error_msg

    with _lock:
        if _status in (StreamStatus.CONNECTED, StreamStatus.CONNECTING):
            return get_status()
        _status = StreamStatus.CONNECTING
        _error_msg = ""

    name = muse_name or DEFAULT_MUSE_NAME
    threading.Thread(target=_connect, args=(name,), daemon=True).start()
    return get_status()


def stop_stream() -> dict:
    global _status, _error_msg
    _log("stop_stream() called — killing processes…")
    _kill_procs()
    with _lock:
        _status = StreamStatus.DISCONNECTED
        _error_msg = ""
    _log("Status → DISCONNECTED")
    return get_status()


# ─── Connection logic ────────────────────────────────────────────────────────

def _connect(muse_name: str):
    global _status, _error_msg, _muselsl_proc, _processor_proc, _watchdog_thread

    try:
        # ── 1. Start muselsl stream ──────────────────────────────────────
        muselsl_cmd = [
            _MUSELSL_BIN, "stream",
            "--name", muse_name,
            "--ppg", "--acc", "--gyro",
        ]
        _log(f"{'='*60}")
        _log(f"Running: {' '.join(muselsl_cmd)}")
        _log(f"{'='*60}")

        muselsl_log = _open_log_file("muselsl")
        _muselsl_proc = subprocess.Popen(
            muselsl_cmd,
            cwd=_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )
        threading.Thread(
            target=_pipe_output,
            args=(_muselsl_proc, "[muselsl]", muselsl_log),
            daemon=True,
        ).start()

        _log("Waiting 10s for BLE discovery…")
        time.sleep(10)

        if _muselsl_proc.poll() is not None:
            raise RuntimeError(
                f"muselsl exited (code {_muselsl_proc.returncode}). "
                f"See {_LOG_DIR}/muselsl_*.log"
            )

        _log("muselsl alive — starting stream_processor…")

        # ── 2. Start stream_processor.py ─────────────────────────────────
        proc_log = _open_log_file("processor")
        _processor_proc = subprocess.Popen(
            [_VENV_PYTHON, "-u", _STREAM_PROCESSOR],   # -u = unbuffered
            cwd=_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            text=True,
        )
        threading.Thread(
            target=_pipe_output,
            args=(_processor_proc, "[processor]", proc_log),
            daemon=True,
        ).start()

        time.sleep(3)
        if _processor_proc.poll() is not None:
            raise RuntimeError(
                f"stream_processor exited. See {_LOG_DIR}/processor_*.log"
            )

        with _lock:
            _status = StreamStatus.CONNECTED
            _error_msg = ""
        _log("Status → CONNECTED")

        # ── 3. Start watchdog ────────────────────────────────────────────
        _watchdog_thread = threading.Thread(target=_watchdog, daemon=True)
        _watchdog_thread.start()

    except Exception as e:
        _log(f"ERROR: {e}")
        with _lock:
            _status = StreamStatus.ERROR
            _error_msg = str(e)
        _kill_procs()


# ─── Watchdog — detects subprocess death ──────────────────────────────────────

def _watchdog():
    """Poll both processes every 2s. If either dies, set status to DISCONNECTED."""
    global _status, _error_msg
    _log("Watchdog started — monitoring subprocess health")
    while True:
        time.sleep(2)

        with _lock:
            if _status != StreamStatus.CONNECTED:
                _log("Watchdog: status no longer CONNECTED, exiting")
                return

        muselsl_dead = _muselsl_proc is None or _muselsl_proc.poll() is not None
        processor_dead = _processor_proc is None or _processor_proc.poll() is not None

        if muselsl_dead or processor_dead:
            reason_parts = []
            if muselsl_dead:
                code = _muselsl_proc.returncode if _muselsl_proc else "?"
                reason_parts.append(f"muselsl died (code {code})")
            if processor_dead:
                code = _processor_proc.returncode if _processor_proc else "?"
                reason_parts.append(f"processor died (code {code})")
            reason = "; ".join(reason_parts)

            _log(f"Watchdog detected: {reason}")
            _kill_procs()
            with _lock:
                _status = StreamStatus.DISCONNECTED
                _error_msg = reason
            _log("Status → DISCONNECTED (auto)")
            return


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _pipe_output(proc: subprocess.Popen, prefix: str, log_file=None):
    """Read subprocess stdout line by line → Flask terminal + log file."""
    try:
        for line in proc.stdout:
            stamped = f"{prefix} {line}"
            print(stamped, end="", flush=True)
            if log_file:
                try:
                    log_file.write(line)
                    log_file.flush()
                except OSError:
                    pass
    except (ValueError, OSError):
        pass
    finally:
        if log_file:
            try:
                log_file.close()
            except OSError:
                pass


def _kill_procs():
    """Gracefully terminate, then force-kill both subprocesses."""
    global _muselsl_proc, _processor_proc

    for name, proc in [("processor", _processor_proc), ("muselsl", _muselsl_proc)]:
        if proc and proc.poll() is None:
            _log(f"Terminating {name} (pid {proc.pid})…")
            try:
                proc.terminate()
                proc.wait(timeout=3)
                _log(f"{name} terminated")
            except subprocess.TimeoutExpired:
                proc.kill()
                _log(f"{name} force-killed")

    _muselsl_proc = None
    _processor_proc = None
