import { ValidationError } from '../../shared/errors.js';

/**
 * Express middleware to validate request bodies/queries/params using Zod
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} property 
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      // Format zod errors beautifully
      const formattedErrors = result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      return next(new ValidationError('Invalid request data', formattedErrors));
    }
    // Replace req property with parsed/sanitized data
    req[property] = result.data;
    next();
  };
};
