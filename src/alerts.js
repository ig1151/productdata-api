const { getRedisClient } = require('./cache');

function alertKey(id) {
  return `alert:${id}`;
}

function alertsByTrackKey(trackId) {
  return `track:${trackId}:alerts`;
}

async function evaluateAlerts(trackId, snapshot) {
  const redis = getRedisClient();
  const ids = await redis.sMembers(alertsByTrackKey(trackId));
  const triggered = [];

  for (const id of ids) {
    const raw = await redis.get(alertKey(id));
    if (!raw) continue;

    const alert = JSON.parse(raw);
    if (alert.status !== 'active') continue;

    let shouldTrigger = false;

    if (alert.type === 'price_below' && snapshot.price !== null) {
      shouldTrigger = Number(snapshot.price) < Number(alert.value);
    }

    if (alert.type === 'price_above' && snapshot.price !== null) {
      shouldTrigger = Number(snapshot.price) > Number(alert.value);
    }

    if (alert.type === 'back_in_stock') {
      shouldTrigger = snapshot.availability === 'in_stock';
    }

    if (shouldTrigger) {
      alert.last_triggered_at = new Date().toISOString();
      alert.updated_at = new Date().toISOString();
      await redis.set(alertKey(id), JSON.stringify(alert));

      triggered.push({
        alert_id: alert.alert_id,
        track_id: alert.track_id,
        type: alert.type,
        value: alert.value,
        triggered_at: alert.last_triggered_at
      });
    }
  }

  return triggered;
}

module.exports = { evaluateAlerts };
