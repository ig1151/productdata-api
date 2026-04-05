const express = require('express');
const { getJob } = require('../queue');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const job = await getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Job not found.'
      });
    }

    res.json(job);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
