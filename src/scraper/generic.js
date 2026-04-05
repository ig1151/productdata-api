const axios = require('axios');
const cheerio = require('cheerio');

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function flattenLd(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry.flatMap(flattenLd);
  if (entry['@graph']) return flattenLd(entry['@graph']);
  return [entry];
}

function fromLd(product) {
  const offers = Array.isArray(product.offers) ? product.offers[0] : (product.offers || {});
  const availability = offers.availability
    ? (String(offers.availability).includes('InStock') ? 'in_stock' : 'out_of_stock')
    : null;

  let brand = null;
  if (typeof product.brand === 'string') brand = product.brand;
  if (product.brand && typeof product.brand === 'object') brand = product.brand.name || null;

  return {
    title: product.name || null,
    price: offers.price ? parseFloat(offers.price) : null,
    currency: offers.priceCurrency || null,
    availability,
    images: [product.image].flat().filter(Boolean),
    brand,
    sku: product.sku || null,
    source: 'ld_json'
  };
}

async function scrapeGeneric(url) {
  const { data: html } = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'ProductDataBot/1.0',
      'Accept': 'text/html'
    }
  });

  const $ = cheerio.load(html);

  const scripts = $('script[type="application/ld+json"]').toArray();
  const ldEntries = scripts
    .map(el => parseMaybeJson($(el).html()))
    .filter(Boolean)
    .flatMap(flattenLd);

  const product = ldEntries.find(d => {
    const type = d?.['@type'];
    if (Array.isArray(type)) return type.includes('Product');
    return type === 'Product';
  });

  if (product) {
    return fromLd(product);
  }

  const meta = (name, attr = 'property') =>
    $(`meta[${attr}="${name}"]`).attr('content') || null;

  const title = meta('og:title') || $('h1').first().text().trim() || null;
  const price =
    meta('product:price:amount') ||
    meta('og:price:amount') ||
    meta('twitter:data1', 'name');

  return {
    title,
    price: price ? parseFloat(String(price).replace(/[^0-9.]/g, '')) || null : null,
    currency: meta('product:price:currency'),
    availability: null,
    images: [meta('og:image')].filter(Boolean),
    brand: meta('og:site_name'),
    sku: null,
    source: 'generic_html'
  };
}

module.exports = { scrapeGeneric };
