import { Router } from 'express';
import { submitJob, getJobs } from '../controllers/job.controller.js';
import { validate } from '../middlewares/validate.js';
import { submitJobSchema } from '../validators/job.schema.js';
import { protect } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(protect);

router.post('/', validate(submitJobSchema), submitJob);
router.get('/', getJobs);

export default router;
