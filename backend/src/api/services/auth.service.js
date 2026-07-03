import { db } from '../../db/client.js';
import { hashPassword, verifyPassword } from '../../shared/utils/hash.js';
import { signToken } from '../../shared/utils/jwt.js';
import { AppError, UnauthorizedError } from '../../shared/errors.js';

export const AuthService = {
  async register(email, password) {
    const existingUser = await db
      .selectFrom('users')
      .where('email', '=', email)
      .select('id')
      .executeTakeFirst();

    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const hashed = await hashPassword(password);
    
    const newUser = await db
      .insertInto('users')
      .values({ email, password_hash: hashed })
      .returning(['id', 'email', 'created_at'])
      .executeTakeFirstOrThrow();

    const token = signToken({ id: newUser.id, email: newUser.email });

    return { user: newUser, token };
  },

  async login(email, password) {
    const user = await db
      .selectFrom('users')
      .where('email', '=', email)
      .selectAll()
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = signToken({ id: user.id, email: user.email });

    // Exclude password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
};
