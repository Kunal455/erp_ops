"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const config_1 = require("../config");
const errorHandler = (err, req, res, next) => {
    // If headers already sent, delegate to Express default error handler
    if (res.headersSent) {
        return next(err);
    }
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = undefined;
    if (err instanceof errors_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    }
    else if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Validation error';
        details = err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));
    }
    else if (err.code === 'P2002') {
        // Prisma unique constraint violation
        statusCode = 409;
        message = `Unique constraint violation on fields: ${err.meta?.target || 'unknown'}`;
    }
    else if (err.code === 'P2025') {
        // Prisma record not found
        statusCode = 404;
        message = 'Requested record not found in database';
    }
    else if (err.message) {
        message = err.message;
    }
    const responseBody = {
        success: false,
        statusCode,
        message,
        timestamp: new Date().toISOString(),
    };
    if (details) {
        responseBody.details = details;
    }
    if (config_1.config.nodeEnv === 'development' && !(err instanceof errors_1.AppError)) {
        responseBody.stack = err.stack;
    }
    res.status(statusCode).json(responseBody);
};
exports.errorHandler = errorHandler;
