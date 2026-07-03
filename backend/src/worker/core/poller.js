import { db } from '../../db/client.js';
import { logger } from '../../shared/logger.js';
import { executeJob } from './executor.js';
import { sql } from 'kysely';

export class Poller {
  constructor(workerId, pollingIntervalMs = 2000) {
    this.workerId = workerId;
    this.pollingIntervalMs = pollingIntervalMs;
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    if (this.timer) return;
    this.isRunning = true;
    this.poll();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async poll() {
    if (!this.isRunning) return;

    try {
      // Find a job that is 'queued', in a non-paused queue, and ready to run
      // Uses SELECT FOR UPDATE SKIP LOCKED to prevent other workers from claiming the same row
      const jobToClaim = await db.transaction().execute(async (trx) => {
        // Find one eligible job
        const row = await sql`
          SELECT j.id 
          FROM jobs j
          INNER JOIN queues q ON j.queue_id = q.id
          WHERE j.status = 'queued'
            AND j.run_at <= NOW()
            AND q.is_paused = false
          ORDER BY q.priority DESC, j.created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `.execute(trx);

        if (!row.rows.length) return null;

        const jobId = row.rows[0].id;

        // Atomically update its status to claimed
        const updatedJob = await trx
          .updateTable('jobs')
          .set({ status: 'claimed', updated_at: new Date() })
          .where('id', '=', jobId)
          .returningAll()
          .executeTakeFirst();

        return updatedJob;
      });

      if (jobToClaim) {
        logger.info(`[Poller] Worker ${this.workerId} claimed job ${jobToClaim.id} (${jobToClaim.name})`);
        
        // Execute the job in the background asynchronously so the poller can continue
        // We do NOT await this.
        executeJob(jobToClaim, this.workerId).catch(err => {
          logger.error(`Critical execution failure for job ${jobToClaim.id}`, err);
        });

        // Since we found a job, immediately poll again without waiting
        return setImmediate(() => this.poll());
      }
    } catch (err) {
      logger.error(`[Poller] Polling error: ${err.message}`, err);
    }

    // No jobs found or error occurred, wait and poll again
    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.pollingIntervalMs);
    }
  }
}
