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
  }
};
