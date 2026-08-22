"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
class AuthService {
    static async login(email, password) {
        if (!email || !password) {
            throw new errors_1.BadRequestError('Email and password are required');
        }
        const user = await config_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { location: true },
        });
        if (!user) {
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                locationId: user.locationId,
                location: user.location ? { id: user.location.id, name: user.location.name, code: user.location.code } : null,
            },
        };
    }
    static async getProfile(userId) {
        const user = await config_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                locationId: true,
                location: {
                    select: { id: true, name: true, code: true },
                },
            },
        });
        if (!user) {
            throw new errors_1.UnauthorizedError('User not found');
        }
        return user;
    }
    static async listUsers() {
        return config_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                locationId: true,
                location: { select: { id: true, name: true, code: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
}
exports.AuthService = AuthService;
