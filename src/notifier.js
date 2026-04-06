const axios = require('axios');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function sendWebhook(url, payload) {
  if (!url) return null;

  try {
    const response = await axios.post(url, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProductDataAPI/1.0'
      }
    });

    return {
      type: 'webhook',
      success: true,
      status: response.status
    };
  } catch (error) {
    return {
      type: 'webhook',
      success: false,
      error: error.message
    };
  }
}

async function sendEmail(to, payload) {
  if (!to || !resend || !process.env.ALERTS_FROM_EMAIL) return null;

  try {
    const subject = `Price Alert Triggered: ${payload.type}`;
    const html = `
      <h2>Price Alert Triggered</h2>
      <p><strong>Track ID:</strong> ${payload.track_id}</p>
      <p><strong>Alert Type:</strong> ${payload.type}</p>
      <p><strong>Threshold:</strong> ${payload.value ?? 'N/A'}</p>
      <p><strong>Current Price:</strong> ${payload.snapshot?.price ?? 'N/A'}</p>
      <p><strong>Availability:</strong> ${payload.snapshot?.availability ?? 'N/A'}</p>
      <p><strong>Product:</strong> ${payload.snapshot?.title ?? 'N/A'}</p>
      <p><strong>Triggered At:</strong> ${payload.triggered_at}</p>
    `;

    const result = await resend.emails.send({
      from: process.env.ALERTS_FROM_EMAIL,
      to,
      subject,
      html
    });

    return {
      type: 'email',
      success: true,
      id: result.data?.id || null
    };
  } catch (error) {
    return {
      type: 'email',
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendWebhook,
  sendEmail
};
