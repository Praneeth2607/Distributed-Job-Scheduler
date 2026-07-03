import { db } from '../../db/client.js';
import { NotFoundError, UnauthorizedError } from '../../shared/errors.js';

export const ProjectService = {
  async createProject(orgId, name, userId) {
    // Check if user has access to org
    const membership = await db
      .selectFrom('organization_users')
      .where('org_id', '=', orgId)
      .where('user_id', '=', userId)
      .select('role')
      .executeTakeFirst();

    if (!membership) {
      throw new UnauthorizedError('You do not have access to this organization');
    }

    return await db
      .insertInto('projects')
      .values({ org_id: orgId, name })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getOrgProjects(orgId, userId) {
    // Check membership
    const membership = await db
      .selectFrom('organization_users')
      .where('org_id', '=', orgId)
      .where('user_id', '=', userId)
      .select('role')
      .executeTakeFirst();

    if (!membership) {
      throw new UnauthorizedError('You do not have access to this organization');
    }

    return await db
      .selectFrom('projects')
      .where('org_id', '=', orgId)
      .selectAll()
      .execute();
  }
};
