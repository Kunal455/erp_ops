import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors.map((e: any) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    message = `Unique constraint violation on fields: ${err.meta?.target || 'unknown'}`;
  } else if (err.code === 'P2025') {
    // Prisma record not found
    statusCode = 404;
    message = 'Requested record not found in database';
  } else if (err.message) {
    message = err.message;
  }

  const responseBody: any = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    responseBody.details = details;
  }

  if (config.nodeEnv === 'development' && !(err instanceof AppError)) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};
