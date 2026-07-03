import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { getWorkers, updateHeartbeat } from '../controllers/worker.controller.js';

const router = Router();

// Heartbeat API (open to internal workers)
router.post('/:workerId/heartbeat', updateHeartbeat);

router.use(protect);

router.get('/', getWorkers);

export default router;
