const axios = require('axios');

async function isShopify(hostname) {
  try {
    await axios.get('https://' + hostname + '/meta.json', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { isShopify };
