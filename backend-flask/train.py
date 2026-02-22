import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from model import NeuroSync1DCNN

class EEGSequenceDataset(Dataset):
    def __init__(self, csv_file, sequence_length=5):
        print(f"Loading {csv_file}...")
        df = pd.read_csv(csv_file)
        
        # Standardize whatever is in that column to a lowercase string
        df['Label'] = df['Label'].astype(str).str.strip().str.lower()
        
        unique_labels = df['Label'].unique()
        print(f"🔍 Discovered unique labels in CSV: {unique_labels}")
        
        # Un-shuffle the classes to allow continuous sliding windows
        df = df.sort_values('Label').reset_index(drop=True)
        
        # The Catch-All Map: Handles words, ints, and floats
        # Jordan Bird's typical numeric encoding -> 0: Relaxed, 1: Neutral, 2: Concentrating
        LABEL_MAP = {
            'concentrating': 0, '2': 0, '2.0': 0, # Maps to Deep Work
            'neutral': 3,       '1': 3, '1.0': 3, # Maps to Scattered
            'relaxed': 4,       '0': 4, '0.0': 4  # Maps to Drowsy
        }
        
        df['Mapped_Label'] = df['Label'].map(LABEL_MAP)
        
        # Failsafe check
        if df['Mapped_Label'].isna().all():
            raise ValueError(f"CRITICAL ERROR: None of the labels {unique_labels} matched the LABEL_MAP!")
            
        df = df.dropna(subset=['Mapped_Label'])
        
        self.labels = df['Mapped_Label'].values
        self.features = df.drop(['Label', 'Mapped_Label'], axis=1).values
        
        self.X, self.y = [], []
        
        # Slide the window
        for i in range(len(self.features) - sequence_length + 1):
            if len(set(self.labels[i:i+sequence_length])) == 1:
                self.X.append(self.features[i:i+sequence_length])
                self.y.append(self.labels[i+sequence_length-1])
                
        self.X = np.array(self.X)
        self.y = np.array(self.y)
        print(f"✅ Successfully generated {len(self.X)} clean 5-second sequences.")

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        x_tensor = torch.tensor(self.X[idx], dtype=torch.float32).transpose(0, 1)
        y_tensor = torch.tensor(self.y[idx], dtype=torch.long)
        return x_tensor, y_tensor

def train_model():
    try:
        dataset = EEGSequenceDataset('data/mental-state.csv', sequence_length=5)
    except ValueError as e:
        print(e)
        return

    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    model = NeuroSync1DCNN(num_features=988, num_classes=5)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    epochs = 10
    print("🚀 Starting training loop...")
    
    for epoch in range(epochs):
        model.train()
        total_loss, correct, total = 0, 0, 0
        
        for batch_X, batch_y in dataloader:
            optimizer.zero_grad()
            
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += batch_y.size(0)
            correct += (predicted == batch_y).sum().item()
            
        acc = 100 * correct / total
        print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss/len(dataloader):.4f} | Accuracy: {acc:.2f}%")
        
    torch.save(model.state_dict(), 'neurosync_model.pth')
    print("🎯 Model saved to neurosync_model.pth! The Inference Engine is fully armed.")

if __name__ == "__main__":
    train_model()