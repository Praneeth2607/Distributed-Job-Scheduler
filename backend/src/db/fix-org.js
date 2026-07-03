import { db } from './client.js';

async function fix() {
  try {
    const user = await db.selectFrom('users').where('email', '=', 'admin@example.com').selectAll().executeTakeFirst();
    const org = await db.selectFrom('organizations').where('name', '=', 'Acme Corp').selectAll().executeTakeFirst();
    
    if (user && org) {
      const existingLink = await db.selectFrom('organization_users')
        .where('org_id', '=', org.id)
        .where('user_id', '=', user.id)
        .executeTakeFirst();
        
      if (!existingLink) {
        await db.insertInto('organization_users').values({
          org_id: org.id,
          user_id: user.id,
          role: 'owner'
        }).execute();
        console.log('Successfully linked admin user to Acme Corp!');
      } else {
        console.log('Link already exists.');
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
