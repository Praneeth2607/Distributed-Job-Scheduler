import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

export const signToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};
