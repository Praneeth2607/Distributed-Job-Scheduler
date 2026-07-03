import { db } from '../db/client.js';
import { logger } from '../shared/logger.js';
import { HeartbeatService } from './core/heartbeat.js';
import { Poller } from './core/poller.js';
import { Spawner } from './scheduler/spawner.js';
import os from 'os';

let currentWorkerId = null;
let heartbeatService = null;
let poller = null;
let spawner = null;

async function startup() {
  logger.info('Starting Worker Daemon...');

  // 1. Register Worker in DB
  const worker = await db
    .insertInto('workers')
    .values({
      hostname: os.hostname(),
      pid: process.pid,
      status: 'active'
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  currentWorkerId = worker.id;
  logger.info(`Worker registered with ID: ${currentWorkerId}`);

  // 2. Start Heartbeat (every 10s)
  heartbeatService = new HeartbeatService(currentWorkerId, 10000);
  heartbeatService.start();

  // 3. Start Poller
  poller = new Poller(currentWorkerId, 2000);
  poller.start();
  
  // 4. Start Spawner (Cron Engine)
  // In a large production setup, the spawner could be a separate service,
  // but it's safe to run it alongside workers because of SKIP LOCKED.
  spawner = new Spawner(10000);
  spawner.start();
  
  logger.info('Worker is successfully polling for jobs and spawning scheduled jobs.');
}

async function shutdown() {
  logger.info('Graceful shutdown initiated...');
  
  if (spawner) spawner.stop();
  if (poller) poller.stop();
  if (heartbeatService) heartbeatService.stop();

  if (currentWorkerId) {
    await db
      .updateTable('workers')
      .set({ status: 'draining' }) // Or 'dead'
      .where('id', '=', currentWorkerId)
      .execute();
  }
  
  logger.info('Worker shutdown complete.');
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startup().catch(err => {
  logger.error('Worker failed to start', err);
  process.exit(1);
});
