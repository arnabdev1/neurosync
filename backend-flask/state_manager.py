import numpy as np
import torch
from collections import deque

class InferencePipeline:
    def __init__(self):
        # Maps neural network output indices to your discrete cognitive states
        self.state_map = {
            0: "Deep Work",
            1: "Flow",
            2: "Stress",
            3: "Scattered",
            4: "Drowsy"
        }
        
        # Buffer 1: The 5-second sliding window for inputs
        self.feature_window = deque(maxlen=5)
        
        # Buffer 2: The 3-second history for probability smoothing
        self.prediction_history = deque(maxlen=3)
        self.current_cognitive_state = "Neutral" # Initial baseline

    def add_data_and_predict(self, feature_vector, model):
        """
        Appends new 1-second data. Runs inference if the 5-sec window is full.
        Returns: (state_changed: bool, new_state: str)
        """
        self.feature_window.append(feature_vector)
        
        # Do not run inference until the sliding window is fully populated
        if len(self.feature_window) < 5:
            return False, self.current_cognitive_state
            
        # Format for PyTorch: (Batch=1, Channels=Features, Time=5)
        np_window = np.array(self.feature_window)
        tensor_input = torch.tensor(np_window, dtype=torch.float32).transpose(0, 1).unsqueeze(0)
        
        with torch.no_grad():
            probs = model(tensor_input)
            
        max_prob, predicted_idx = torch.max(probs, dim=1)
        prob_val = max_prob.item()
        pred_state = self.state_map[predicted_idx.item()]
        
        self.prediction_history.append((pred_state, prob_val))
        
        return self._evaluate_state_transition()

    def _evaluate_state_transition(self):
        if len(self.prediction_history) < 3:
            return False, self.current_cognitive_state
            
        states = [x[0] for x in self.prediction_history]
        probs = [x[1] for x in self.prediction_history]
        
        # Rule: All 3 consecutive inferences must match AND exceed 85% confidence
        all_match = all(s == states[0] for s in states)
        high_confidence = all(p > 0.85 for p in probs)
        
        if all_match and high_confidence:
            proposed_state = states[0]
            if proposed_state != self.current_cognitive_state:
                self.current_cognitive_state = proposed_state
                return True, proposed_state # Valid Transition Triggered!
                
        return False, self.current_cognitive_state