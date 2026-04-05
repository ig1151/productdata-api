const axios = require('axios');

async function scrapeShopify(url) {
  const parsed = new URL(url);
  const base = parsed.protocol + '//' + parsed.hostname;
  const handle = parsed.pathname.replace('/products/', '').split('?')[0];

  const { data } = await axios.get(
    base + '/products/' + handle + '.json',
    {
      timeout: 10000,
      headers: { 'User-Agent': 'ProductDataBot/1.0' }
    }
  );

  const p = data.product;
  const v = p?.variants?.[0] || {};

  return {
    title: p?.title || null,
    price: v?.price ? parseFloat(v.price) : null,
    currency: null,
    availability: v?.available ? 'in_stock' : 'out_of_stock',
    images: (p?.images || []).map(i => i.src).filter(Boolean),
    brand: p?.vendor || null,
    sku: v?.sku || null,
    source: 'shopify_api'
  };
}

module.exports = { scrapeShopify };
