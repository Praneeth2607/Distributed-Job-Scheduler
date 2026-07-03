import { Router } from 'express';
import { submitJob, getJobs, deleteJob, clearJobs, retryJob, submitBatchJobs } from '../controllers/job.controller.js';
import { validate } from '../middlewares/validate.js';
import { submitJobSchema } from '../validators/job.schema.js';
import { protect } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.use(protect);

router.post('/', validate(submitJobSchema), submitJob);
router.post('/batch', submitBatchJobs); // Could add validation schema here if we wanted
router.get('/', getJobs);
router.delete('/', clearJobs);
router.delete('/:jobId', deleteJob);
router.post('/:jobId/retry', retryJob);

export default router;
