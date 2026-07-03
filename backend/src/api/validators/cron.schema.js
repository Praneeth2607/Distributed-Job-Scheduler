import { z } from 'zod';

export const createScheduledJobSchema = z.object({
  name: z.string().min(1).max(255),
  payload: z.record(z.any()).default({}),
  cron_expression: z.string().min(1)
});
