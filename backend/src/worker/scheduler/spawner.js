import { db } from '../../db/client.js';
import { logger } from '../../shared/logger.js';
import parser from 'cron-parser';
import { sql } from 'kysely';

export class Spawner {
  constructor(intervalMs = 10000) {
    this.intervalMs = intervalMs;
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    if (this.timer) return;
    this.isRunning = true;
    this.spawn();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async spawn() {
    if (!this.isRunning) return;

    try {
      // Find all scheduled jobs that are due
      await db.transaction().execute(async (trx) => {
        // We lock the rows so multiple spawners don't spawn duplicates
        const dueJobs = await sql`
          SELECT id, queue_id, name, payload, cron_expression, next_run_at
          FROM scheduled_jobs
          WHERE is_paused = false
            AND next_run_at <= NOW()
          FOR UPDATE SKIP LOCKED
        `.execute(trx);

        for (const job of dueJobs.rows) {
          // 1. Insert a new job into the main queue
          await trx
            .insertInto('jobs')
            .values({
              queue_id: job.queue_id,
              name: job.name,
              payload: job.payload,
              type: 'recurring',
              status: 'queued',
              run_at: new Date(),
              scheduled_job_id: job.id
            })
            .execute();

          // 2. Calculate next run time for this cron
          let nextRun;
          try {
            const interval = parser.parseExpression(job.cron_expression);
            nextRun = interval.next().toDate();
          } catch (err) {
            logger.error(`Invalid cron expression for scheduled job ${job.id}`);
            // Pause the job so it doesn't get stuck in a loop
            await trx
              .updateTable('scheduled_jobs')
              .set({ is_paused: true })
              .where('id', '=', job.id)
              .execute();
            continue;
          }

          // 3. Update the scheduled job's next_run_at
          await trx
            .updateTable('scheduled_jobs')
            .set({ next_run_at: nextRun })
            .where('id', '=', job.id)
            .execute();
            
          logger.info(`[Spawner] Spawned instance of scheduled job ${job.id}. Next run: ${nextRun.toISOString()}`);
        }
      });
    } catch (err) {
      logger.error(`[Spawner] Error spawning jobs: ${err.message}`, err);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.spawn(), this.intervalMs);
    }
  }
}
