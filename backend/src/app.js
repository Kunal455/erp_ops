"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const workOrder_routes_1 = __importDefault(require("./routes/workOrder.routes"));
const transfer_routes_1 = __importDefault(require("./routes/transfer.routes"));
const order_routes_1 = __importDefault(require("./routes/order.routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const swagger_1 = require("./swagger");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Swagger UI Documentation
(0, swagger_1.setupSwagger)(app);
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'Mini Operations ERP Backend API',
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/inventory', inventory_routes_1.default);
app.use('/api/work-orders', workOrder_routes_1.default);
app.use('/api/transfers', transfer_routes_1.default);
app.use('/api/orders', order_routes_1.default);
// 404 Route Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
    });
});
// Global Error Handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
