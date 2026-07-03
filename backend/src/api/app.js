import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from '../shared/errors.js';
import authRoutes from './routes/auth.routes.js';
import orgRoutes from './routes/org.routes.js';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', orgRoutes);

// Unhandled Routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
