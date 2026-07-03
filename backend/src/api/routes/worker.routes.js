import { Router } from 'express';
import { db } from '../../db/client.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const workers = await db
      .selectFrom('workers')
      .leftJoin('worker_heartbeats', 'workers.id', 'worker_heartbeats.worker_id')
      .select([
        'workers.id', 
        'workers.hostname', 
        'workers.pid', 
        'workers.status', 
        'worker_heartbeats.cpu_usage',
        'worker_heartbeats.memory_usage',
        'worker_heartbeats.last_heartbeat'
      ])
      .execute();
      
    res.status(200).json({ status: 'success', data: { workers } });
  } catch (error) {
    next(error);
  }
});

export default router;
