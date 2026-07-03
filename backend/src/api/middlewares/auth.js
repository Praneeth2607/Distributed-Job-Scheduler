import { verifyToken } from '../../shared/utils/jwt.js';
import { UnauthorizedError } from '../../shared/errors.js';
import { db } from '../../db/client.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check cookies for token
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } 
    // Fallback to Bearer token
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Please log in to get access.'));
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const currentUser = await db
      .selectFrom('users')
      .where('id', '=', decoded.id)
      .select(['id', 'email'])
      .executeTakeFirst();

    if (!currentUser) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token or session expired. Please log in again.'));
  }
};
