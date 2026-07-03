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
      const cpu = os.loadavg()[0]; 
      const memory = process.memoryUsage().heapUsed / 1024 / 1024; 

      await fetch(`http://localhost:3000/api/v1/workers/${this.workerId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpu_usage: cpu, memory_usage: memory })
      });
        
    } catch (err) {
      logger.error(`Heartbeat failed for worker ${this.workerId}: ${err.message}`);
    }
  }
}
