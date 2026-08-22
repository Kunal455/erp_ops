const { config } = require('../config');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || undefined;

  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.code === 'P2002') {
    statusCode = 409;
    message = `Unique constraint violation on fields: ${err.meta?.target || 'unknown'}`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Requested record not found in database';
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

  if (config.nodeEnv === 'development' && statusCode === 500) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

module.exports = { errorHandler };
