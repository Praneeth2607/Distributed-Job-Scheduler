import { db } from '../../db/client.js';
import { NotFoundError, UnauthorizedError, AppError } from '../../shared/errors.js';

export const QueueService = {
  async _verifyProjectAccess(projectId, userId) {
    const access = await db
      .selectFrom('projects as p')
      .innerJoin('organization_users as ou', 'p.org_id', 'ou.org_id')
      .where('p.id', '=', projectId)
      .where('ou.user_id', '=', userId)
      .select('p.id')
      .executeTakeFirst();
      
    if (!access) {
      throw new UnauthorizedError('You do not have access to this project');
    }
  },

  async createQueue(projectId, userId, queueData) {
    await this._verifyProjectAccess(projectId, userId);

    const { name, priority, max_concurrency, retry_policy } = queueData;

    return await db.transaction().execute(async (trx) => {
      // Check for duplicate queue name
      const existing = await trx
        .selectFrom('queues')
        .where('project_id', '=', projectId)
        .where('name', '=', name)
        .select('id')
        .executeTakeFirst();

      if (existing) {
        throw new AppError('Queue name already exists in this project', 409);
      }

      const queue = await trx
        .insertInto('queues')
        .values({ project_id: projectId, name, priority, max_concurrency })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Setup default retry policy if none provided
      const policy = retry_policy || { type: 'fixed', max_retries: 3, delay_ms: 1000, multiplier: 1.0 };
      
      const savedPolicy = await trx
        .insertInto('retry_policies')
        .values({
          queue_id: queue.id,
          ...policy
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return { ...queue, retry_policy: savedPolicy };
    });
  },

  async getProjectQueues(projectId, userId) {
    await this._verifyProjectAccess(projectId, userId);
    return await db.selectFrom('queues').where('project_id', '=', projectId).selectAll().execute();
  },

  async deleteQueue(projectId, queueId, userId) {
    await this._verifyProjectAccess(projectId, userId);
    await db.deleteFrom('queues')
      .where('id', '=', queueId)
      .where('project_id', '=', projectId)
      .execute();
  },

  async pauseQueue(projectId, queueId, userId) {
    await this._verifyProjectAccess(projectId, userId);
    await db.updateTable('queues').set({ is_paused: true }).where('id', '=', queueId).where('project_id', '=', projectId).execute();
  },

  async resumeQueue(projectId, queueId, userId) {
    await this._verifyProjectAccess(projectId, userId);
    await db.updateTable('queues').set({ is_paused: false }).where('id', '=', queueId).where('project_id', '=', projectId).execute();
  },

  async getStats(projectId, queueId, userId) {
    await this._verifyProjectAccess(projectId, userId);
    const stats = await db.selectFrom('jobs')
      .select(['status', db.fn.count('id').as('count')])
      .where('queue_id', '=', queueId)
      .groupBy('status')
      .execute();
      
    return stats.reduce((acc, curr) => {
      acc[curr.status] = Number(curr.count);
      return acc;
    }, { queued: 0, running: 0, completed: 0, failed: 0, retrying: 0 });
  },

  async getDLQ(projectId, queueId, userId) {
    await this._verifyProjectAccess(projectId, userId);
    return await db.selectFrom('dead_letter_queue').where('queue_id', '=', queueId).selectAll().execute();
  },

  async updateRetryPolicy(projectId, queueId, userId, policyData) {
    await this._verifyProjectAccess(projectId, userId);
    
    const existing = await db.selectFrom('retry_policies').where('queue_id', '=', queueId).executeTakeFirst();
    if (existing) {
      return await db.updateTable('retry_policies').set(policyData).where('queue_id', '=', queueId).returningAll().executeTakeFirst();
    } else {
      return await db.insertInto('retry_policies').values({ queue_id: queueId, ...policyData }).returningAll().executeTakeFirst();
    }
  }
};
