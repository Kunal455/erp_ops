const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fundsroom_erp_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || 'mysql://erp_user:erp_secret_pass@localhost:3306/fundsroom_erp',
};

const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = {
  config,
  prisma,
};
