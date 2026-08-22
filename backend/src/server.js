"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const PORT = config_1.config.port;
const server = app_1.default.listen(PORT, () => {
    console.log(`🚀 Mini Operations ERP Backend API running at: http://localhost:${PORT}`);
    console.log(`📑 Swagger Documentation available at: http://localhost:${PORT}/api/docs`);
    console.log(`🏥 Health Check available at: http://localhost:${PORT}/health`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
