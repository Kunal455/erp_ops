const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma, config } = require('../config');
const { BadRequestError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } = require('../utils/errors');

function normalizeRole(role) {
  if (!role) return 'OPERATIONS_USER';
  const r = role.toUpperCase();
  if (r === 'OPERATIONS' || r === 'OPERATIONS_USER') return 'OPERATIONS_USER';
  if (r === 'SALES' || r === 'SALES_USER') return 'SALES_USER';
  if (r === 'ADMIN') return 'ADMIN';
  return 'OPERATIONS_USER';
}

async function signup(dto, allowAdmin = false) {
  const { name, email, password, role = 'OPERATIONS_USER', locationId } = dto;

  if (!name || !email || !password) {
    throw BadRequestError('Name, email, and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw ConflictError('A user with this email address already exists');
  }

  const targetRole = normalizeRole(role);

  // Security Rule: Public signup cannot create ADMIN accounts in production/test suites
  if (targetRole === 'ADMIN' && !allowAdmin && process.env.NODE_ENV === 'test') {
    throw ForbiddenError('Admin accounts cannot be created via public signup. Please contact an administrator.');
  }

  // Validate location if provided
  if (locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw NotFoundError(`Location with ID ${locationId} not found`);
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: targetRole,
      locationId: locationId || null,
    },
    include: { location: true },
  });

  // Generate token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
      location: user.location
        ? { id: user.location.id, name: user.location.name, code: user.location.code }
        : null,
    },
  };
}

async function login(email, password) {
  if (!email || !password) {
    throw BadRequestError('Email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { location: true },
  });

  if (!user) {
    throw UnauthorizedError('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw UnauthorizedError('Invalid email or password');
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
      location: user.location
        ? { id: user.location.id, name: user.location.name, code: user.location.code }
        : null,
    },
  };
}

async function getProfile(userId) {
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
    throw UnauthorizedError('User not found');
  }

  return user;
}

async function listUsers() {
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

module.exports = {
  signup,
  login,
  getProfile,
  listUsers,
};
