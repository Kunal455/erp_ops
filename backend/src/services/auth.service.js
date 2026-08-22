const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma, config } = require('../config');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

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
  login,
  getProfile,
  listUsers,
};
