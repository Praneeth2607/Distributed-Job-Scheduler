import { AppError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import { config } from '../../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Default values
  let statusCode = 500;
  let status = 'error';
  let message = 'Internal Server Error';
  let validationErrors = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    status = error.status;
    message = error.message;
    if (error.errors) {
      validationErrors = error.errors;
    }
  } else {
    // Log unexpected errors
    logger.error(`[UNEXPECTED ERROR] ${error.message}`, { stack: error.stack });
  }

  const errorResponse = {
    status,
    message,
    ...(validationErrors && { errors: validationErrors }),
    ...(config.NODE_ENV === 'development' && { stack: error.stack })
  };

  res.status(statusCode).json(errorResponse);
};
