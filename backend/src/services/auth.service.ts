import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, prisma } from '../config';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

export class AuthService {
  static async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { location: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as any
    );

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

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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
      throw new UnauthorizedError('User not found');
    }

    return user;
  }

  static async listUsers() {
    return prisma.user.findMany({
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
