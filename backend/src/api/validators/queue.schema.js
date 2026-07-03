import { z } from 'zod';

export const createQueueSchema = z.object({
  name: z.string().min(1).max(255),
  priority: z.number().int().default(0),
  max_concurrency: z.number().int().min(1).default(10),
  retry_policy: z.object({
    type: z.enum(['fixed', 'linear', 'exponential']).default('fixed'),
    max_retries: z.number().int().min(0).default(3),
    delay_ms: z.number().int().min(0).default(1000),
    multiplier: z.number().min(1).default(1.0)
  }).optional()
});

export const updateQueueSchema = z.object({
  priority: z.number().int().optional(),
  max_concurrency: z.number().int().min(1).optional(),
  is_paused: z.boolean().optional(),
});
