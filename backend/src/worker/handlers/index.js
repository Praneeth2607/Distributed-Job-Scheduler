import { logger } from '../../shared/logger.js';

// Mock implementations of real-world jobs
export const handlers = {
  'send_email': async (payload) => {
    logger.info(`Sending email to ${payload.to}...`);
    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    if (payload.simulateError) throw new Error('SMTP connection timed out');
    return { success: true, message: 'Email sent successfully' };
  },

  'process_data': async (payload) => {
    logger.info(`Processing batch data...`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Heavy processing
    return { processedRows: 5000 };
  }
};

export const getHandler = (jobName) => {
  const handler = handlers[jobName];
  if (!handler) {
    throw new Error(`No handler registered for job type: ${jobName}`);
  }
  return handler;
};
