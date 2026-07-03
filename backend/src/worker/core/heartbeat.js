import { db } from '../../db/client.js';
import { logger } from '../../shared/logger.js';
import os from 'os';

export class HeartbeatService {
  constructor(workerId, intervalMs = 15000) {
    this.workerId = workerId;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.beat(), this.intervalMs);
    this.beat(); // beat immediately
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async beat() {
    try {
      const cpu = os.loadavg()[0]; // 1-minute load average
      const memory = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      await db
        .updateTable('worker_heartbeats')
        .set({
          last_heartbeat: new Date(),
          cpu_usage: cpu,
          memory_usage: memory
        })
        .where('worker_id', '=', this.workerId)
        .execute();
        
    } catch (err) {
      logger.error(`Heartbeat failed for worker ${this.workerId}: ${err.message}`);
    }
  }
}
