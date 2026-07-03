import { db } from '../../db/client.js';
import { logger } from '../../shared/logger.js';
import { getHandler } from '../handlers/index.js';
import { calculateNextRun } from '../retry/backoff.js';

export const executeJob = async (job, workerId) => {
  const startTime = Date.now();
  
  // 1. Create Job Execution record
  const execution = await db
    .insertInto('job_executions')
    .values({
      job_id: job.id,
      worker_id: workerId,
      status: 'running',
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  try {
    // 2. Fetch handler and execute
    const handler = getHandler(job.name);
    await handler(job.payload);

    // 3. Mark successful
    const duration = Date.now() - startTime;
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('job_executions')
        .set({ status: 'completed', completed_at: new Date(), duration_ms: duration })
        .where('id', '=', execution.id)
        .execute();

      await trx
        .updateTable('jobs')
        .set({ status: 'completed', updated_at: new Date(), completed_at: new Date() })
        .where('id', '=', job.id)
        .execute();
        
      await trx
        .insertInto('job_logs')
        .values({
          job_execution_id: execution.id,
          log_level: 'info',
          message: `Job completed successfully in ${duration}ms`
        })
        .execute();
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // 4. Handle Failure & Retries
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('job_executions')
        .set({ status: 'failed', completed_at: new Date(), duration_ms: duration, error_message: error.message })
        .where('id', '=', execution.id)
        .execute();

      // Fetch retry policy
      const policy = await trx
        .selectFrom('retry_policies')
        .where('queue_id', '=', job.queue_id)
        .selectAll()
        .executeTakeFirst();

      const nextRun = calculateNextRun(policy, job.current_retries);

      if (nextRun) {
        // Schedule retry
        await trx
          .updateTable('jobs')
          .set({
            status: 'retrying',
            updated_at: new Date(),
            run_at: nextRun,
            current_retries: job.current_retries + 1
          })
          .where('id', '=', job.id)
          .execute();
          
        logger.warn(`Job ${job.id} failed, retrying at ${nextRun.toISOString()}`);
      } else {
        // Exhausted retries -> Dead Letter Queue
        await trx
          .updateTable('jobs')
          .set({ status: 'failed', updated_at: new Date() })
          .where('id', '=', job.id)
          .execute();

        await trx
          .insertInto('dead_letter_queue')
          .values({
            job_id: job.id,
            queue_id: job.queue_id,
            reason: error.message,
            original_payload: JSON.stringify(job.payload)
          })
          .execute();
          
        logger.error(`Job ${job.id} moved to Dead Letter Queue.`);
      }
    });
  }
};
