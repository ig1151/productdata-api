const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getRedisClient } = require('../cache');

const router = express.Router();

function alertKey(id) {
  return `alert:${id}`;
}

function alertsByTrackKey(trackId) {
  return `track:${trackId}:alerts`;
}

function validType(type) {
  return ['price_below', 'price_above', 'back_in_stock'].includes(type);
}

// CREATE ALERT
router.post('/', async (req, res, next) => {
  try {
    const {
      track_id,
      type,
      value = null,
      webhook_url = null,
      email_to = null
    } = req.body || {};

    if (!track_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'track_id is required.'
      });
    }

    if (!type || !validType(type)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'A valid alert type is required.'
      });
    }

    if (
      (type === 'price_below' || type === 'price_above') &&
      (value === null || value === undefined || isNaN(Number(value)))
    ) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Numeric value is required for price alerts.'
      });
    }

    const redis = getRedisClient();
    const id = 'alt_' + uuidv4();

    const alert = {
      alert_id: id,
      track_id,
      type,
      value: value !== null ? Number(value) : null,
      webhook_url,
      email_to,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_triggered_at: null
    };

    await redis.set(alertKey(id), JSON.stringify(alert));
    await redis.sAdd(alertsByTrackKey(track_id), id);

    res.json(alert);
  } catch (e) {
    next(e);
  }
});

// LIST ALERTS FOR A TRACKER
router.get('/track/:trackId', async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const { trackId } = req.params;

    const ids = await redis.sMembers(alertsByTrackKey(trackId));
    const results = [];

    for (const id of ids) {
      const raw = await redis.get(alertKey(id));
      if (raw) results.push(JSON.parse(raw));
    }

    res.json({
      track_id: trackId,
      alerts: results
    });
  } catch (e) {
    next(e);
  }
});

// GET SINGLE ALERT
router.get('/:id', async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(alertKey(req.params.id));

    if (!raw) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Alert not found'
      });
    }

    res.json(JSON.parse(raw));
  } catch (e) {
    next(e);
  }
});

// DELETE ALERT
router.delete('/:id', async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(alertKey(req.params.id));

    if (!raw) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Alert not found'
      });
    }

    const alert = JSON.parse(raw);

    await redis.del(alertKey(req.params.id));
    await redis.sRem(alertsByTrackKey(alert.track_id), req.params.id);

    res.json({
      alert_id: req.params.id,
      deleted: true
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
