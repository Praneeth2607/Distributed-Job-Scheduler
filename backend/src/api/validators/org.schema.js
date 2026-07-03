import { z } from 'zod';

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
});
