"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Authentication token missing or invalid format');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const user = await config_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, role: true, locationId: true },
        });
        if (!user) {
            throw new errors_1.UnauthorizedError('User account not found or deactivated');
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(new errors_1.UnauthorizedError('Invalid or expired authentication token'));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError('Authentication required'));
        }
        const normalizedRoles = roles.map(r => r.toUpperCase());
        const userRole = req.user.role.toUpperCase();
        if (!normalizedRoles.includes(userRole)) {
            return next(new errors_1.ForbiddenError(`Access denied. Required role(s): [${roles.join(', ')}], your role: ${req.user.role}`));
        }
        next();
    };
};
exports.requireRole = requireRole;
