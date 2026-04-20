import { AppError } from '../utils/errors.js';

export const validateBody = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.issues[0]?.message || 'Invalid payload', 400));
  }
  req.body = parsed.data;
  next();
};

export const validateQuery = (schema) => (req, _res, next) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return next(new AppError(parsed.error.issues[0]?.message || 'Invalid query', 400));
  }
  req.query = parsed.data;
  next();
};