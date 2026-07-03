import { db } from '../../db/client.js';
import { AppError, UnauthorizedError, NotFoundError } from '../../shared/errors.js';

export const JobService = {
  async _verifyQueueAccess(queueId, userId) {
    const access = await db
      .selectFrom('queues as q')
      .innerJoin('projects as p', 'q.project_id', 'p.id')
      .innerJoin('organization_users as ou', 'p.org_id', 'ou.org_id')
      .where('q.id', '=', queueId)
      .where('ou.user_id', '=', userId)
      .select('q.id')
      .executeTakeFirst();
      
    if (!access) {
      throw new UnauthorizedError('You do not have access to this queue');
    }
  },

  async submitJob(queueId, userId, jobData) {
    await this._verifyQueueAccess(queueId, userId);

    const { name, payload, type, run_at, batch_id } = jobData;

    let executeAt = new Date(); // 'immediate'
    
    if (type === 'delayed' || type === 'scheduled') {
      if (!run_at) {
        throw new AppError('run_at is required for delayed or scheduled jobs', 400);
      }
      executeAt = new Date(run_at);
      if (executeAt < new Date()) {
        throw new AppError('run_at must be in the future', 400);
      }
    }

    return await db
      .insertInto('jobs')
      .values({
        queue_id: queueId,
        name,
        payload,
        type,
        status: 'queued',
        run_at: executeAt,
        batch_id
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getQueueJobs(queueId, userId, limit = 50, offset = 0) {
    await this._verifyQueueAccess(queueId, userId);
    return await db
      .selectFrom('jobs')
      .where('queue_id', '=', queueId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .selectAll()
      .execute();
  }
};
