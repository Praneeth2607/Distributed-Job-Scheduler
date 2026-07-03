import { db } from '../../db/client.js';

export const getWorkers = async (req, res, next) => {
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
};

export const updateHeartbeat = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { cpu_usage, memory_usage } = req.body;

    const existing = await db.selectFrom('worker_heartbeats').where('worker_id', '=', workerId).executeTakeFirst();
    
    if (existing) {
      await db.updateTable('worker_heartbeats')
        .set({ last_heartbeat: new Date(), cpu_usage, memory_usage })
        .where('worker_id', '=', workerId)
        .execute();
    } else {
      await db.insertInto('worker_heartbeats')
        .values({ worker_id: workerId, cpu_usage, memory_usage, last_heartbeat: new Date() })
        .execute();
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};
