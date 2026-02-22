const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    required: true,
  },
  pre_ml: {
    delta: { type: Number, required: true },
    theta: { type: Number, required: true },
    alpha: { type: Number, required: true },
    beta:  { type: Number, required: true },
    gamma: { type: Number, required: true },
    focus_score: { type: Number, required: true },
  },
  post_ml: {
    state: { type: String, required: true },
    transition_triggered: { type: Boolean, default: false },
  },
}, { timestamps: true });

// Index on timestamp for fast range queries (dashboard charts)
sensorDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
