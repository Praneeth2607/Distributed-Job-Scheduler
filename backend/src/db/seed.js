import { db } from './client.js';
import bcrypt from 'bcrypt';

async function seed() {
  try {
    const email = 'admin@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    let user = await db.selectFrom('users').where('email', '=', email).selectAll().executeTakeFirst();
      
    if (!user) {
      const result = await db.insertInto('users').values({
        email,
        password_hash: hashedPassword
      }).returningAll().executeTakeFirst();
      user = result;
      console.log(`Created user: ${email}`);
    }

    // Create Organization
    let org = await db.selectFrom('organizations').where('name', '=', 'Acme Corp').selectAll().executeTakeFirst();
    if (!org) {
      org = await db.insertInto('organizations').values({ name: 'Acme Corp' }).returningAll().executeTakeFirst();
      console.log('Created Organization: Acme Corp');
      
      // Link user to org
      await db.insertInto('organization_users').values({
        org_id: org.id,
        user_id: user.id,
        role: 'owner'
      }).execute();
    }

    // Create Project
    let project = await db.selectFrom('projects').where('name', '=', 'Video Processing').selectAll().executeTakeFirst();
    if (!project) {
      project = await db.insertInto('projects').values({
        org_id: org.id,
        name: 'Video Processing'
      }).returningAll().executeTakeFirst();
      console.log('Created Project: Video Processing');
    }

    // Create Queue
    let queue = await db.selectFrom('queues').where('name', '=', 'transcoding-queue').selectAll().executeTakeFirst();
    if (!queue) {
      queue = await db.insertInto('queues').values({
        project_id: project.id,
        name: 'transcoding-queue',
        priority: 1,
        max_concurrency: 5
      }).returningAll().executeTakeFirst();
      console.log('Created Queue: transcoding-queue');
    }

    // Seed some jobs
    const jobCount = await db.selectFrom('jobs').where('queue_id', '=', queue.id).execute();
    if (jobCount.length === 0) {
      await db.insertInto('jobs').values([
        { queue_id: queue.id, name: 'transcode_1080p', type: 'immediate', status: 'queued', payload: { file: 'vid1.mp4' } },
        { queue_id: queue.id, name: 'transcode_720p', type: 'immediate', status: 'queued', payload: { file: 'vid2.mp4' } },
        { queue_id: queue.id, name: 'extract_audio', type: 'immediate', status: 'queued', payload: { file: 'vid3.mp4' } },
        { queue_id: queue.id, name: 'generate_thumbnail', type: 'immediate', status: 'queued', payload: { file: 'vid4.mp4' } }
      ]).execute();
      console.log('Seeded 4 sample jobs into transcoding-queue');
    }

    console.log('Database successfully seeded with demo data!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed DB:', err);
    process.exit(1);
  }
}

seed();
