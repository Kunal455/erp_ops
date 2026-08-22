function createAppError(message = 'Internal error', statusCode = 500, details = null) {
  const err = new Error(message);
  err.name = 'AppError';
  err.statusCode = statusCode;
  err.details = details;
  return err;
}

function BadRequestError(message = 'Bad request', details = null) {
  const err = new Error(message);
  err.name = 'BadRequestError';
  err.statusCode = 400;
  err.details = details;
  return err;
}

function UnauthorizedError(message = 'Unauthorized', details = null) {
  const err = new Error(message);
  err.name = 'UnauthorizedError';
  err.statusCode = 401;
  err.details = details;
  return err;
}

function ForbiddenError(message = 'Forbidden - Insufficient permissions', details = null) {
  const err = new Error(message);
  err.name = 'ForbiddenError';
  err.statusCode = 403;
  err.details = details;
  return err;
}

function NotFoundError(message = 'Resource not found', details = null) {
  const err = new Error(message);
  err.name = 'NotFoundError';
  err.statusCode = 404;
  err.details = details;
  return err;
}

function ConflictError(message = 'Conflict detected', details = null) {
  const err = new Error(message);
  err.name = 'ConflictError';
  err.statusCode = 409;
  err.details = details;
  return err;
}

module.exports = {
  AppError: createAppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
