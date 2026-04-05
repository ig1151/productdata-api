# ProductData API

Production-ready Node.js API for extracting structured product data from e-commerce URLs.

## Features
- Bearer-token API auth
- Per-key rate limiting
- Redis caching
- BullMQ async jobs
- Shopify detection and JSON endpoint support
- Generic product page parsing via JSON-LD / meta tags
- Swagger docs at `/docs`
- Docker, docker-compose, and Railway-friendly config

## Endpoints

### POST /v1/extract
Synchronous extraction.

Request body:
```json
{
  "url": "https://store.example/products/item",
  "force_refresh": false
}
```

### POST /v1/extract/async
Queue an extraction job.

### GET /v1/jobs/:id
Check queued job status.

### GET /v1/health
Health check.

## Local run
1. Copy `.env.example` to `.env`
2. Start Redis
3. Run `npm install`
4. Run `npm run dev`
5. In another terminal run `npm run worker`

## Railway
- Upload this repo to GitHub
- Create a Railway project from GitHub
- Add Redis service
- Set `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, and `API_KEYS`
- Deploy web service
- Add a second service or background worker using the same repo with start command: `node src/queue.js`

## Notes
- This project avoids CAPTCHA bypass and aggressive evasion tactics.
- Best results come from Shopify stores and pages with structured product metadata.
