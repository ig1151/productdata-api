const { scrapeShopify } = require('./shopify');
const { scrapeGeneric } = require('./generic');
const { isShopify } = require('./detect');

async function scrape(url) {
  const { hostname } = new URL(url);

  const shopify = await isShopify(hostname);

  // Try Shopify first
  if (shopify) {
    try {
      const data = await scrapeShopify(url);

      if (data && data.title) {
        return data;
      }
    } catch (err) {
      console.warn('Shopify scrape failed, falling back to generic:', err.message);
    }
  }
