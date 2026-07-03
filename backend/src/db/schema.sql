CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_users (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL DEFAULT 'member',
    CONSTRAINT pk_org_users PRIMARY KEY (org_id, user_id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_org_id ON projects(org_id);

CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    max_concurrency INTEGER NOT NULL DEFAULT 10,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_queue_project_name UNIQUE(project_id, name)
);
CREATE INDEX idx_queues_project_id ON queues(project_id);

CREATE TABLE retry_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL UNIQUE REFERENCES queues(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL DEFAULT 'fixed',
    max_retries INTEGER NOT NULL DEFAULT 3,
    delay_ms INTEGER NOT NULL DEFAULT 1000,
    multiplier REAL NOT NULL DEFAULT 1.0
);

CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    cron_expression VARCHAR NOT NULL,
    next_run_at TIMESTAMPTZ NOT NULL,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR NOT NULL DEFAULT 'queued',
    type VARCHAR NOT NULL DEFAULT 'immediate',
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_retries INTEGER NOT NULL DEFAULT 0,
    scheduled_job_id UUID REFERENCES scheduled_jobs(id) ON DELETE SET NULL,
    batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_jobs_queue_status_run_at ON jobs(queue_id, status, run_at);

CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname VARCHAR NOT NULL,
    pid INTEGER NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_heartbeats (
    worker_id UUID PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cpu_usage REAL,
    memory_usage REAL
);
CREATE INDEX idx_heartbeats_last ON worker_heartbeats(last_heartbeat);

CREATE TABLE job_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    status VARCHAR NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_message TEXT
);
CREATE INDEX idx_job_executions_job ON job_executions(job_id);

CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_execution_id UUID NOT NULL REFERENCES job_executions(id) ON DELETE CASCADE,
    log_level VARCHAR NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_logs_exec ON job_logs(job_execution_id);

CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    original_payload JSONB NOT NULL
);
CREATE INDEX idx_dlq_failed_at ON dead_letter_queue(failed_at);
