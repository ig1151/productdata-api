const { getRedisClient } = require('./cache');
const { sendWebhook, sendEmail } = require('./notifier');

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
      const triggered_at = new Date().toISOString();

      alert.last_triggered_at = triggered_at;
      alert.updated_at = triggered_at;

      await redis.set(alertKey(id), JSON.stringify(alert));

      const payload = {
        alert_id: alert.alert_id,
        track_id: alert.track_id,
        type: alert.type,
        value: alert.value,
        triggered_at,
        snapshot
      };

      const deliveries = [];

      const webhookResult = await sendWebhook(alert.webhook_url, payload);
      if (webhookResult) deliveries.push(webhookResult);

      const emailResult = await sendEmail(alert.email_to, payload);
      if (emailResult) deliveries.push(emailResult);

      triggered.push({
        ...payload,
        deliveries
      });
    }
  }

  return triggered;
}

module.exports = { evaluateAlerts };
