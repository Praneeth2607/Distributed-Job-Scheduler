import { Router } from 'express';
import { createQueue, getQueues } from '../controllers/queue.controller.js';
import { validate } from '../middlewares/validate.js';
import { createQueueSchema } from '../validators/queue.schema.js';
import { protect } from '../middlewares/auth.js';
import jobRoutes from './job.routes.js';

const router = Router({ mergeParams: true });

router.use(protect);

router.post('/', validate(createQueueSchema), createQueue);
router.get('/', getQueues);

// Mount job routes
router.use('/:queueId/jobs', jobRoutes);

export default router;
