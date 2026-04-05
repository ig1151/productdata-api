const express = require('express');
const { getCache, setCache } = require('../cache');
const { scrape } = require('../scraper');
const { addJob } = require('../queue');

const router = express.Router();

function validUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

router.post('/', async (req, res, next) => {
  try {
    const { url, force_refresh = false } = req.body || {};

    if (!url || !validUrl(url)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'A valid url is required.'
      });
    }

    if (!force_refresh) {
      const hit = await getCache(url);
      if (hit) {
        return res.json({
          ...hit,
          _meta: { cached: true }
        });
      }
    }

    const result = await scrape(url);
    await setCache(url, result);

    res.json({
      ...result,
      _meta: { cached: false }
    });
  } catch (e) {
    next(e);
  }
});

router.post('/async', async (req, res, next) => {
  try {
    const { url } = req.body || {};

    if (!url || !validUrl(url)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'A valid url is required.'
      });
    }

    const job = await addJob({
      url,
      apiKey: req.apiKey
    });

    res.status(202).json({
      job_id: job.id,
      status: 'queued',
      poll_url: '/v1/jobs/' + job.id
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
