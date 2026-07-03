import { Router } from 'express';
import { createScheduledJob, getScheduledJobs } from '../controllers/cron.controller.js';
import { validate } from '../middlewares/validate.js';
import { createScheduledJobSchema } from '../validators/cron.schema.js';
import { protect } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(protect);

router.post('/', validate(createScheduledJobSchema), createScheduledJob);
router.get('/', getScheduledJobs);

export default router;
