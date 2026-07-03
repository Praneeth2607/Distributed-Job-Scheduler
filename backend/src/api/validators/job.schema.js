import { z } from 'zod';

export const submitJobSchema = z.object({
  name: z.string().min(1).max(255),
  payload: z.record(z.any()).default({}),
  type: z.enum(['immediate', 'delayed', 'scheduled', 'batch']).default('immediate'),
  run_at: z.string().datetime().optional(), // ISO string for future jobs
  batch_id: z.string().uuid().optional(),
});
