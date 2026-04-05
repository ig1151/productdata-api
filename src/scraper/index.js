const { scrapeShopify } = require('./shopify');
const { scrapeGeneric } = require('./generic');
const { isShopify } = require('./detect');

async function scrape(url) {
  const { hostname } = new URL(url);

  const shopify = await isShopify(hostname);
  const data = shopify
    ? await scrapeShopify(url)
    : await scrapeGeneric(url);

  if (!data || !data.title) {
    const err = new Error('Could not extract product data');
    err.code = 'PARSE_FAILURE';
    throw err;
  }

  return data;
}

module.exports = { scrape };
