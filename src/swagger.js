const pkg = require('../package.json');

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'ProductData API',
    version: pkg.version,
    description: 'Extract structured product data from e-commerce URLs.'
  },
  servers: [{ url: '/', description: 'Current server' }],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer' }
    },
    schemas: {
      Product: {
        type: 'object',
        properties: {
          title: { type: 'string', nullable: true },
          price: { type: 'number', nullable: true },
          currency: { type: 'string', nullable: true },
          availability: {
            type: 'string',
            enum: ['in_stock', 'out_of_stock'],
            nullable: true
          },
          images: { type: 'array', items: { type: 'string' } },
          brand: { type: 'string', nullable: true },
          sku: { type: 'string', nullable: true },
          source: {
            type: 'string',
            enum: ['shopify_api', 'ld_json', 'generic_html']
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/v1/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: { description: 'Service health' }
        }
      }
    },
    '/v1/extract': {
      post: {
        summary: 'Synchronous extraction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  force_refresh: { type: 'boolean', default: false }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Product data' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          422: { description: 'Parse failure' },
          429: { description: 'Rate limit exceeded' }
        }
      }
    },
    '/v1/extract/async': {
      post: {
        summary: 'Async extraction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri' }
                }
              }
            }
          }
        },
        responses: {
          202: { description: 'Job queued' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/v1/jobs/{id}': {
      get: {
        summary: 'Poll async job',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: { description: 'Job status' },
          401: { description: 'Unauthorized' },
          404: { description: 'Job not found' }
        }
      }
    }
  }
};
