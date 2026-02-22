const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');

// POST /api/sensor-data — Ingest a single inference frame from the Flask stream processor
router.post('/', async (req, res) => {
  try {
    const { timestamp, pre_ml, post_ml } = req.body;

    if (!timestamp || !pre_ml || !post_ml) {
      return res.status(400).json({ error: 'Missing required fields: timestamp, pre_ml, post_ml' });
    }

    const doc = await SensorData.create({ timestamp, pre_ml, post_ml });
    res.status(201).json({ status: 'saved', id: doc._id });
  } catch (err) {
    console.error('Sensor data save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data — Fetch recent readings (default last 100, supports ?limit=N&since=EPOCH)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 5000);
    const query = {};

    // Optional: filter by timestamp range
    if (req.query.since) {
      query.timestamp = { $gte: parseFloat(req.query.since) };
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json(data);
  } catch (err) {
    console.error('Sensor data fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensor-data/latest — Single most-recent reading (for live dashboard widget)
router.get('/latest', async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 }).lean();
    if (!latest) return res.status(404).json({ error: 'No sensor data yet' });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
