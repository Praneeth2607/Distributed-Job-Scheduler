import { db } from '../../db/client.js';
import { NotFoundError } from '../../shared/errors.js';

export const OrgService = {
  async createOrg(name, userId) {
    // Transaction to create org and add user as admin
    return await db.transaction().execute(async (trx) => {
      const org = await trx
        .insertInto('organizations')
        .values({ name })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('organization_users')
        .values({
          org_id: org.id,
          user_id: userId,
          role: 'admin'
        })
        .execute();

      return org;
    });
  },

  async getUserOrgs(userId) {
    return await db
      .selectFrom('organizations as o')
      .innerJoin('organization_users as ou', 'o.id', 'ou.org_id')
      .where('ou.user_id', '=', userId)
      .select(['o.id', 'o.name', 'o.created_at', 'ou.role'])
      .execute();
  }
};
