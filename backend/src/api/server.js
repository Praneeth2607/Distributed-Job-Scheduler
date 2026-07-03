import app from './app.js';
import { config } from '../config/env.js';
import { logger } from '../shared/logger.js';

process.on('uncaughtException', err => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  process.exit(1);
});

const port = config.PORT;

const server = app.listen(port, () => {
  logger.info(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
