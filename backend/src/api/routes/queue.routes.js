import { Router } from 'express';
import { createQueue, getQueues, deleteQueue } from '../controllers/queue.controller.js';
import { validate } from '../middlewares/validate.js';
import { createQueueSchema } from '../validators/queue.schema.js';
import { protect } from '../middlewares/auth.js';
import jobRoutes from './job.routes.js';
import cronRoutes from './cron.routes.js';

const router = Router({ mergeParams: true });

router.use(protect);

router.post('/', validate(createQueueSchema), createQueue);
router.get('/', getQueues);
router.delete('/:queueId', deleteQueue);

// Mount job routes
router.use('/:queueId/jobs', jobRoutes);
router.use('/:queueId/scheduled-jobs', cronRoutes);

export default router;
