import torch
import torch.nn as nn
import torch.nn.functional as F

class NeuroSync1DCNN(nn.Module):
    def __init__(self, num_features=988, num_classes=5):
        super(NeuroSync1DCNN, self).__init__()
        # Note: num_features=988 matches the Jordan Bird Kaggle dataset output.
        # Input shape expected: (Batch Size, Features, Time Steps) -> (1, 988, 5)
        
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=64, kernel_size=2)
        self.bn1 = nn.BatchNorm1d(64)
        
        self.conv2 = nn.Conv1d(in_channels=64, out_channels=128, kernel_size=2)
        self.bn2 = nn.BatchNorm1d(128)
        
        # After two kernel=2 convolutions on a sequence of length 5, the time dimension shrinks to 3.
        # Flattened size = 128 channels * 3 time steps = 384
        self.fc1 = nn.Linear(128 * 3, 128)
        self.dropout = nn.Dropout(0.3)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.relu(self.bn2(self.conv2(x)))
        
        x = x.view(x.size(0), -1)  # Flatten for the dense layers
        
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        logits = self.fc2(x)
        
        # Output raw probabilities to evaluate against the 85% threshold
        probs = F.softmax(logits, dim=1)
        return probs