import json
import math
import random

def generate_simulation_data():
    data = []
    
    for i in range(3600):
        # Calculate progress from 0.0 (start) to 1.0 (end of the hour)
        progress = i / 3600.0
        
        # Base values that organically degrade over the hour
        # Focus starts at 85 (great) and drops to 25 (scattered)
        base_focus = 85.0 - (60.0 * progress) 
        # Stress starts at 30 (relaxed) and climbs to 90 (burnout)
        base_stress = 30.0 + (60.0 * progress)
        
        # Apply biological drifting (sine waves) + sensor noise
        focus_drift = math.sin(i / 60.0) * 5 + random.uniform(-3, 3)
        stress_drift = math.cos(i / 120.0) * 5 + random.uniform(-3, 3)
        
        # Clamp values between 0 and 100
        current_focus = max(0, min(100, base_focus + focus_drift))
        current_stress = max(0, min(100, base_stress + stress_drift))
        
        # Determine semantic state for the agent based on the shifting numbers
        if current_stress > 80 and current_focus < 40:
            state = "HIGH_STRESS"
        elif current_focus > 70:
            state = "DEEP_WORK"
        elif current_focus < 40:
            state = "SCATTERED"
        else:
            state = "DISTRACTED"

        record = {
            "elapsed_seconds": i,
            "app_used": "Reddit",
            "app_duration_seconds": i,
            "metrics": {
                "focus_score": round(current_focus, 2),
                "stress_level": round(current_stress, 2)
            },
            "cognitive_state": state
        }
        data.append(record)
        
    with open("dummy_ml_output.json", "w") as f:
        json.dump(data, f, indent=4)
        
    print("Successfully generated fixed dummy_ml_output.json!")

if __name__ == "__main__":
    generate_simulation_data()