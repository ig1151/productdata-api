const VALID_KEYS = new Set(
  (process.env.API_KEYS || 'dev-key-123')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
);

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token || !VALID_KEYS.has(token)) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Valid Bearer token required.'
    });
  }

  req.apiKey = token;
  next();
}

module.exports = { authenticate };
