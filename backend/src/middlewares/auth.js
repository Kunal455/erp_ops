const jwt = require('jsonwebtoken');
const { config, prisma } = require('../config');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(UnauthorizedError('Authentication token missing or invalid format'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, locationId: true },
    });

    if (!user) {
      return next(UnauthorizedError('User account not found or deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(UnauthorizedError('Invalid or expired authentication token'));
    }
    next(error);
  }
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(UnauthorizedError('Authentication required'));
    }

    const normalizedRoles = roles.map((r) => r.toUpperCase());
    const userRole = req.user.role.toUpperCase();

    if (!normalizedRoles.includes(userRole)) {
      return next(
        ForbiddenError(
          `Access denied. Required role(s): [${roles.join(', ')}], your role: ${req.user.role}`
        )
      );
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
