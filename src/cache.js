require('dotenv').config();

const redis = require('redis');

let client;

function getClient() {
  if (!client) {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', e => console.error('Redis error:', e));
    client.connect().catch(err => console.error('Redis connect error:', err));
  }

  return client;
}

const TTL = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10);

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(p => {
      u.searchParams.delete(p);
    });
    return u.toString();
  } catch {
    return url;
  }
}

async function pingCache() {
  try {
    const c = getClient();
    await c.ping();
    return true;
  } catch {
    return false;
  }
}

async function getCache(url) {
  try {
    const c = getClient();
    const key = 'pd:' + normalizeUrl(url);
    const v = await c.get(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

async function setCache(url, data) {
  try {
    const c = getClient();
    const key = 'pd:' + normalizeUrl(url);
    await c.setEx(key, TTL, JSON.stringify(data));
  } catch {}
}

module.exports = {
  getCache,
  setCache,
  pingCache,
  normalizeUrl,
  getRedisClient: getClient
};
