import { db } from '../../db/client.js';
import { AppError } from '../../shared/errors.js';
import { QueueService } from './queue.service.js';
import parser from 'cron-parser';

export const CronService = {
  async createScheduledJob(queueId, userId, data) {
    // Check queue access
    await QueueService._verifyProjectAccess(
      await this._getProjectId(queueId),
      userId
    );

    const { name, payload, cron_expression } = data;
    let nextRun;

    try {
      const interval = parser.parseExpression(cron_expression);
      nextRun = interval.next().toDate();
    } catch (err) {
      throw new AppError('Invalid cron expression', 400);
    }

    return await db
      .insertInto('scheduled_jobs')
      .values({
        queue_id: queueId,
        name,
        payload,
        cron_expression,
        next_run_at: nextRun
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async _getProjectId(queueId) {
    const queue = await db
      .selectFrom('queues')
      .where('id', '=', queueId)
      .select('project_id')
      .executeTakeFirst();
      
    if (!queue) throw new AppError('Queue not found', 404);
    return queue.project_id;
  },

  async getScheduledJobs(queueId, userId) {
    await QueueService._verifyProjectAccess(
      await this._getProjectId(queueId),
      userId
    );

    return await db
      .selectFrom('scheduled_jobs')
      .where('queue_id', '=', queueId)
      .selectAll()
      .execute();
  }
};
