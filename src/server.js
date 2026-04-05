require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { rateLimit } = require('express-rate-limit');
const { authenticate } = require('./middleware/auth');
const swaggerDoc = require('./swagger');
const { pingCache } = require('./cache');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// ✅ NEW ROOT ROUTE (homepage)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'ProductData API',
    version: '1.0.0',
    endpoints: {
      docs: '/docs',
      health: '/v1/health',
      extract_sync: '/v1/extract',
      extract_async: '/v1/extract/async'
    }
  });
});

// Health check
app.get('/v1/health', async (req, res) => {
  const cacheOk = await pingCache();
  res.json({
    ok: true,
    service: 'productdata-api',
    cache: cacheOk ? 'up' : 'degraded'
  });
});

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60_000,
  max: parseInt(process.env.RATE_LIMIT_RPM || '60', 10),
  keyGenerator: (req) => req.apiKey || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Retry after 1 minute.'
  }
});

// Protected routes
app.use('/v1/', authenticate, limiter);
app.use('/v1/extract', require('./routes/extract'));
app.use('/v1/jobs', require('./routes/jobs'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 'PARSE_FAILURE') {
    return res.status(422).json({
      error: 'parse_failure',
      message: err.message || 'Could not extract product data.'
    });
  }

  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
    return res.status(504).json({
      error: 'upstream_timeout',
      message: 'The target site took too long to respond.'
    });
  }

  res.status(500).json({
    error: 'internal_error',
    message: err.message || 'Unexpected server error.'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ProductData API running on :${PORT}`);
});
