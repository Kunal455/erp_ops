"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = exports.swaggerDocument = void 0;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Mini Operations ERP API',
        version: '1.0.0',
        description: 'Production-oriented REST API for Mini Operations ERP managing Multi-Location Inventory, Work Orders, Shortage Checks, Stock Transfers, and Concurrency-Safe Customer Reservations.',
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
            LoginDto: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', example: 'admin@fundsroom.com' },
                    password: { type: 'string', example: 'admin123' },
                },
            },
            StockInDto: {
                type: 'object',
                required: ['itemId', 'locationId', 'batchNumber', 'quantity'],
                properties: {
                    itemId: { type: 'string' },
                    locationId: { type: 'string' },
                    batchNumber: { type: 'string', example: 'BATCH-2026-01' },
                    quantity: { type: 'number', example: 100 },
                    notes: { type: 'string', example: 'Received supplier shipment' },
                },
            },
            AdjustStockDto: {
                type: 'object',
                required: ['itemId', 'locationId', 'batchNumber', 'newPhysicalQuantity'],
                properties: {
                    itemId: { type: 'string' },
                    locationId: { type: 'string' },
                    batchNumber: { type: 'string' },
                    newPhysicalQuantity: { type: 'number', example: 120 },
                    notes: { type: 'string' },
                },
            },
            CreateWorkOrderDto: {
                type: 'object',
                required: ['locationId', 'itemId', 'requiredQuantity'],
                properties: {
                    locationId: { type: 'string' },
                    itemId: { type: 'string' },
                    requiredQuantity: { type: 'number', example: 50 },
                    assignedUserId: { type: 'string' },
                    notes: { type: 'string' },
                },
            },
            CreateTransferDto: {
                type: 'object',
                required: ['sourceLocationId', 'destinationLocationId', 'itemId', 'batchNumber', 'quantity'],
                properties: {
                    sourceLocationId: { type: 'string' },
                    destinationLocationId: { type: 'string' },
                    itemId: { type: 'string' },
                    batchNumber: { type: 'string' },
                    quantity: { type: 'number', example: 25 },
                },
            },
            CreateOrderDto: {
                type: 'object',
                required: ['customerName', 'locationId', 'items'],
                properties: {
                    customerName: { type: 'string', example: 'Acme Heavy Industries' },
                    locationId: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['itemId', 'quantity'],
                            properties: {
                                itemId: { type: 'string' },
                                batchNumber: { type: 'string' },
                                quantity: { type: 'number', example: 10 },
                                unitPrice: { type: 'number', example: 1500 },
                            },
                        },
                    },
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
        '/api/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Login with email and password to receive JWT token',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/LoginDto' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Authenticated successfully with token and profile' },
                    401: { description: 'Invalid credentials' },
                },
            },
        },
        '/api/auth/me': {
            get: {
                tags: ['Authentication'],
                summary: 'Get current user profile',
                responses: {
                    200: { description: 'Current user profile details' },
                },
            },
        },
        '/api/inventory': {
            get: {
                tags: ['Inventory'],
                summary: 'List multi-location inventory with calculated available quantity',
                parameters: [
                    { name: 'locationId', in: 'query', schema: { type: 'string' } },
                    { name: 'itemId', in: 'query', schema: { type: 'string' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'List of inventory batches' },
                },
            },
        },
        '/api/inventory/stock-in': {
            post: {
                tags: ['Inventory'],
                summary: 'Receive new physical stock into batch (Admin/Operations)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/StockInDto' } },
                    },
                },
                responses: {
                    201: { description: 'Stock received' },
                },
            },
        },
        '/api/work-orders': {
            get: {
                tags: ['Work Orders'],
                summary: 'List work orders with automated material shortage checks',
                responses: {
                    200: { description: 'List of work orders' },
                },
            },
            post: {
                tags: ['Work Orders'],
                summary: 'Create a new work order (Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/CreateWorkOrderDto' } },
                    },
                },
                responses: {
                    201: { description: 'Work Order created with shortage analysis' },
                },
            },
        },
        '/api/work-orders/stock-check': {
            get: {
                tags: ['Work Orders'],
                summary: 'Compute real-time material shortage for an item at a location',
                parameters: [
                    { name: 'locationId', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'itemId', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'requiredQuantity', in: 'query', required: true, schema: { type: 'number' } },
                ],
                responses: {
                    200: { description: 'Shortage and surplus location calculation' },
                },
            },
        },
        '/api/transfers': {
            get: {
                tags: ['Stock Transfers'],
                summary: 'List internal stock transfers',
                responses: {
                    200: { description: 'List of transfers' },
                },
            },
            post: {
                tags: ['Stock Transfers'],
                summary: 'Request an internal stock transfer (Admin/Operations)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/CreateTransferDto' } },
                    },
                },
                responses: {
                    201: { description: 'Transfer requested' },
                },
            },
        },
        '/api/transfers/{id}/dispatch': {
            post: {
                tags: ['Stock Transfers'],
                summary: 'Dispatch transfer (Reduces source stock; Destination stock unchanged)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Transfer dispatched' },
                },
            },
        },
        '/api/transfers/{id}/receive': {
            post: {
                tags: ['Stock Transfers'],
                summary: 'Receive transfer (Increases destination stock; Prevents double receipt)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Transfer received' },
                    400: { description: 'Transfer already received or not in dispatched status' },
                },
            },
        },
        '/api/orders': {
            get: {
                tags: ['Customer Orders'],
                summary: 'List customer orders',
                responses: {
                    200: { description: 'List of customer orders' },
                },
            },
            post: {
                tags: ['Customer Orders'],
                summary: 'Create customer order in DRAFT status (Sales/Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/CreateOrderDto' } },
                    },
                },
                responses: {
                    201: { description: 'Customer order created' },
                },
            },
        },
        '/api/orders/{id}/reserve': {
            post: {
                tags: ['Customer Orders'],
                summary: 'Reserve stock with atomic concurrency lock (Sales/Admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Stock reserved successfully' },
                    400: { description: 'Insufficient stock or invalid status' },
                },
            },
        },
        '/api/orders/{id}/cancel': {
            post: {
                tags: ['Customer Orders'],
                summary: 'Cancel customer order and release reserved stock (Sales/Admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: { description: 'Order cancelled and stock released' },
                },
            },
        },
    },
};
const setupSwagger = (app) => {
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(exports.swaggerDocument));
};
exports.setupSwagger = setupSwagger;
