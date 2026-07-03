import { db } from '../../db/client.js';
import { AppError, UnauthorizedError, NotFoundError } from '../../shared/errors.js';
import crypto from 'node:crypto';

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
  },

  async deleteJob(queueId, jobId, userId) {
    await this._verifyQueueAccess(queueId, userId);
    await db.deleteFrom('jobs')
      .where('id', '=', jobId)
      .where('queue_id', '=', queueId)
      .execute();
  },

  async clearJobs(queueId, userId) {
    await this._verifyQueueAccess(queueId, userId);
    await db.deleteFrom('jobs')
      .where('queue_id', '=', queueId)
      .execute();
  },

  async retryJob(queueId, jobId, userId) {
    await this._verifyQueueAccess(queueId, userId);
    const job = await db.selectFrom('jobs').where('id', '=', jobId).where('queue_id', '=', queueId).selectAll().executeTakeFirst();
    if (!job) throw new NotFoundError('Job not found');
    
    return await db.updateTable('jobs')
      .set({ status: 'queued', run_at: new Date(), current_retries: 0, updated_at: new Date() })
      .where('id', '=', jobId)
      .returningAll()
      .executeTakeFirst();
  },

  async submitBatchJobs(queueId, userId, jobsDataArray) {
    await this._verifyQueueAccess(queueId, userId);
    if (!Array.isArray(jobsDataArray) || jobsDataArray.length === 0) {
      throw new AppError('An array of jobs is required for batch submission', 400);
    }
    const batchId = crypto.randomUUID();
    
    const insertData = jobsDataArray.map(job => {
      let executeAt = new Date();
      if ((job.type === 'delayed' || job.type === 'scheduled') && job.run_at) {
        executeAt = new Date(job.run_at);
      }
      return {
        queue_id: queueId,
        name: job.name,
        payload: job.payload || {},
        type: job.type || 'immediate',
        status: 'queued',
        run_at: executeAt,
        batch_id: batchId
      };
    });

    return await db.insertInto('jobs').values(insertData).returningAll().execute();
  }
};
