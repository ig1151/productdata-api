const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { scrape } = require('../scraper');
const { getRedisClient } = require('../cache');

const router = express.Router();

function validUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

function trackKey(id) {
  return `track:${id}`;
}

function historyKey(id) {
  return `track:${id}:history`;
}

function latestKey(id) {
  return `track:${id}:latest`;
}

// CREATE TRACK
router.post('/', async (req, res, next) => {
  try {
    const { url, interval_minutes = 1440 } = req.body || {};

    if (!url || !validUrl(url)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'A valid url is required.'
      });
    }

    const redis = getRedisClient();
    const id = 'trk_' + uuidv4();

    const tracker = {
      track_id: id,
      status: 'active',
      url,
      interval_minutes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await redis.set(trackKey(id), JSON.stringify(tracker));

    res.json(tracker);
  } catch (e) {
    next(e);
  }
});

// GET TRACK
router.get('/:id', async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const { id } = req.params;

    const data = await redis.get(trackKey(id));

    if (!data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Tracker not found'
      });
    }

    const tracker = JSON.parse(data);
    const latest = await redis.get(latestKey(id));

    res.json({
      ...tracker,
      latest: latest ? JSON.parse(latest) : null
    });
  } catch (e) {
    next(e);
  }
});

// HISTORY
router.get('/:id/history', async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const { id } = req.params;

    const list = await redis.lRange(historyKey(id), 0, -1);

    res.json({
      track_id: id,
      history: list.map(item => JSON.parse(item))
    });
  } catch (e) {
    next(e);
  }
});

// MANUAL REFRESH
router.post('/:id/refresh', async (req, res, next) => {
  try {
    const redis = getRedisClient();
    const { id } = req.params;

    const data = await redis.get(trackKey(id));

    if (!data) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Tracker not found'
      });
    }

    const tracker = JSON.parse(data);

    const result = await scrape(tracker.url);

    const snapshot = {
      ...result,
      checked_at: new Date().toISOString()
    };

    await redis.set(latestKey(id), JSON.stringify(snapshot));
    await redis.lPush(historyKey(id), JSON.stringify(snapshot));

    res.json({
      track_id: id,
      status: 'updated',
      snapshot
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
