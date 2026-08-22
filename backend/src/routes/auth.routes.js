"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
router.post('/login', (0, validate_1.validate)(loginSchema), auth_controller_1.AuthController.login);
router.get('/me', auth_1.authenticate, auth_controller_1.AuthController.getMe);
router.get('/users', auth_1.authenticate, auth_controller_1.AuthController.listUsers);
exports.default = router;
