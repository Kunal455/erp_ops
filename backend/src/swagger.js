const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Mini Operations ERP API',
    version: '1.0.0',
    description:
      'Production-oriented REST API for Mini Operations ERP managing Multi-Location Inventory, Work Orders, Shortage Checks, Stock Transfers, and Concurrency-Safe Customer Reservations.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>',
      },
    },
    schemas: {
      SignupDto: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john.doe@fundsroom.com' },
          password: { type: 'string', example: 'password123' },
          role: { type: 'string', enum: ['ADMIN', 'OPERATIONS', 'SALES'], example: 'OPERATIONS' },
          locationId: { type: 'string', example: 'cm...location' },
        },
      },
      LoginDto: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@fundsroom.com' },
          password: { type: 'string', example: 'admin123' },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account with role and optional default warehouse',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SignupDto' } },
          },
        },
        responses: {
          201: { description: 'User registered successfully with JWT token' },
          400: { description: 'Validation error' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password to receive JWT token',
        responses: { 200: { description: 'Authenticated successfully' } },
      },
    },
    '/api/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'List multi-location inventory with calculated available quantity',
        responses: { 200: { description: 'List of inventory batches' } },
      },
    },
    '/api/work-orders': {
      get: {
        tags: ['Work Orders'],
        summary: 'List work orders with automated material shortage checks',
        responses: { 200: { description: 'List of work orders' } },
      },
    },
    '/api/transfers': {
      get: {
        tags: ['Stock Transfers'],
        summary: 'List internal stock transfers',
        responses: { 200: { description: 'List of transfers' } },
      },
    },
    '/api/orders': {
      get: {
        tags: ['Customer Orders'],
        summary: 'List customer orders',
        responses: { 200: { description: 'List of customer orders' } },
      },
    },
  },
};

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

module.exports = {
  setupSwagger,
  swaggerDocument,
};
