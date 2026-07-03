import { sql } from 'kysely';

export async function up(db) {
  // Enables uuid-ossp extension for UUID generation if not already present
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

  // Users
  await db.schema.createTable('users')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('email', 'varchar', col => col.notNull().unique())
    .addColumn('password_hash', 'varchar', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Organizations
  await db.schema.createTable('organizations')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('name', 'varchar', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Organization Users (Junction)
  await db.schema.createTable('organization_users')
    .addColumn('org_id', 'uuid', col => col.references('organizations.id').onDelete('cascade').notNull())
    .addColumn('user_id', 'uuid', col => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('role', 'varchar', col => col.notNull().defaultTo('member'))
    .addPrimaryKeyConstraint('pk_org_users', ['org_id', 'user_id'])
    .execute();

  // Projects
  await db.schema.createTable('projects')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('org_id', 'uuid', col => col.references('organizations.id').onDelete('cascade').notNull())
    .addColumn('name', 'varchar', col => col.notNull())
    .addColumn('created_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .execute();
  await db.schema.createIndex('idx_projects_org_id').on('projects').column('org_id').execute();

  // Queues
  await db.schema.createTable('queues')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('project_id', 'uuid', col => col.references('projects.id').onDelete('cascade').notNull())
    .addColumn('name', 'varchar', col => col.notNull())
    .addColumn('priority', 'integer', col => col.notNull().defaultTo(0))
    .addColumn('max_concurrency', 'integer', col => col.notNull().defaultTo(10))
    .addColumn('is_paused', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .addUniqueConstraint('uq_queue_project_name', ['project_id', 'name'])
    .execute();
  await db.schema.createIndex('idx_queues_project_id').on('queues').column('project_id').execute();

  // Retry Policies
  await db.schema.createTable('retry_policies')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('queue_id', 'uuid', col => col.references('queues.id').onDelete('cascade').notNull().unique())
    .addColumn('type', 'varchar', col => col.notNull().defaultTo('fixed'))
    .addColumn('max_retries', 'integer', col => col.notNull().defaultTo(3))
    .addColumn('delay_ms', 'integer', col => col.notNull().defaultTo(1000))
    .addColumn('multiplier', 'real', col => col.notNull().defaultTo(1.0))
    .execute();

  // Scheduled Jobs (Cron)
  await db.schema.createTable('scheduled_jobs')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('queue_id', 'uuid', col => col.references('queues.id').onDelete('cascade').notNull())
    .addColumn('name', 'varchar', col => col.notNull())
    .addColumn('payload', 'jsonb', col => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('cron_expression', 'varchar', col => col.notNull())
    .addColumn('next_run_at', 'timestamptz', col => col.notNull())
    .addColumn('is_paused', 'boolean', col => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .execute();
  await db.schema.createIndex('idx_scheduled_jobs_next_run').on('scheduled_jobs').column('next_run_at').execute();

  // Jobs
  await db.schema.createTable('jobs')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('queue_id', 'uuid', col => col.references('queues.id').onDelete('cascade').notNull())
    .addColumn('name', 'varchar', col => col.notNull())
    .addColumn('payload', 'jsonb', col => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('status', 'varchar', col => col.notNull().defaultTo('queued'))
    .addColumn('type', 'varchar', col => col.notNull().defaultTo('immediate'))
    .addColumn('run_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('current_retries', 'integer', col => col.notNull().defaultTo(0))
    .addColumn('scheduled_job_id', 'uuid', col => col.references('scheduled_jobs.id').onDelete('set null'))
    .addColumn('batch_id', 'uuid')
    .addColumn('created_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .addColumn('completed_at', 'timestamptz')
    .execute();
  
  // Critical composite index for the queue polling engine
  await db.schema.createIndex('idx_jobs_queue_status_run_at')
    .on('jobs').columns(['queue_id', 'status', 'run_at']).execute();

  // Workers
  await db.schema.createTable('workers')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('hostname', 'varchar', col => col.notNull())
    .addColumn('pid', 'integer', col => col.notNull())
    .addColumn('status', 'varchar', col => col.notNull().defaultTo('active'))
    .addColumn('started_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Worker Heartbeats
  await db.schema.createTable('worker_heartbeats')
    .addColumn('worker_id', 'uuid', col => col.references('workers.id').onDelete('cascade').primaryKey())
    .addColumn('last_heartbeat', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('cpu_usage', 'real')
    .addColumn('memory_usage', 'real')
    .execute();
  await db.schema.createIndex('idx_heartbeats_last').on('worker_heartbeats').column('last_heartbeat').execute();

  // Job Executions
  await db.schema.createTable('job_executions')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('job_id', 'uuid', col => col.references('jobs.id').onDelete('cascade').notNull())
    .addColumn('worker_id', 'uuid', col => col.references('workers.id').onDelete('set null'))
    .addColumn('status', 'varchar', col => col.notNull().defaultTo('running'))
    .addColumn('started_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .addColumn('completed_at', 'timestamptz')
    .addColumn('duration_ms', 'integer')
    .addColumn('error_message', 'text')
    .execute();
  await db.schema.createIndex('idx_job_executions_job').on('job_executions').column('job_id').execute();

  // Job Logs
  await db.schema.createTable('job_logs')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('job_execution_id', 'uuid', col => col.references('job_executions.id').onDelete('cascade').notNull())
    .addColumn('log_level', 'varchar', col => col.notNull().defaultTo('info'))
    .addColumn('message', 'text', col => col.notNull())
    .addColumn('timestamp', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .execute();
  await db.schema.createIndex('idx_job_logs_exec').on('job_logs').column('job_execution_id').execute();

  // Dead Letter Queue
  await db.schema.createTable('dead_letter_queue')
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('job_id', 'uuid', col => col.references('jobs.id').onDelete('cascade').notNull())
    .addColumn('queue_id', 'uuid', col => col.references('queues.id').onDelete('cascade').notNull())
    .addColumn('failed_at', 'timestamptz', col => col.defaultTo(sql`now()`).notNull())
    .addColumn('reason', 'text')
    .addColumn('original_payload', 'jsonb', col => col.notNull())
    .execute();
  await db.schema.createIndex('idx_dlq_failed_at').on('dead_letter_queue').column('failed_at').execute();
}

export async function down(db) {
  await db.schema.dropTable('dead_letter_queue').execute();
  await db.schema.dropTable('job_logs').execute();
  await db.schema.dropTable('job_executions').execute();
  await db.schema.dropTable('worker_heartbeats').execute();
  await db.schema.dropTable('workers').execute();
  await db.schema.dropTable('jobs').execute();
  await db.schema.dropTable('scheduled_jobs').execute();
  await db.schema.dropTable('retry_policies').execute();
  await db.schema.dropTable('queues').execute();
  await db.schema.dropTable('projects').execute();
  await db.schema.dropTable('organization_users').execute();
  await db.schema.dropTable('organizations').execute();
  await db.schema.dropTable('users').execute();
}
