# Distributed Job Scheduler

A highly reliable, distributed background job processing engine built with modern web technologies. This application allows you to offload heavy, time-consuming tasks from your main web application and distribute them across a fleet of worker daemons.

It serves as a full-stack, distributed alternative to libraries like Sidekiq, Celery, or BullMQ, featuring a beautiful React dashboard for managing organizations, projects, queues, and monitoring worker health.

## 🏗️ Architecture overview

The system is decoupled into three independent layers that communicate entirely through PostgreSQL:

1. **The API & Frontend (The Control Center)**
   The React dashboard allows you to manage Queues and submit Jobs via the Express API. When a job is submitted, the API simply records it in the PostgreSQL database with a `queued` status and instantly returns a response, ensuring your web application stays blazingly fast.

2. **The Worker Daemons (The Fleet)**
   You can run one or dozens of background worker processes (`daemon.js`) across multiple servers. These workers constantly poll the database asking for new jobs. We use advanced PostgreSQL concurrency controls (`SELECT ... FOR UPDATE SKIP LOCKED`) to ensure that even with 50 workers running simultaneously, no two workers will ever accidentally claim and process the exact same job. 

3. **The Spawner (Cron Engine)**
   A dedicated sub-process that tracks scheduled and recurring jobs (e.g., "Run this report at midnight"). When it's time for a scheduled job to execute, the spawner automatically drops it into the active queue for a worker to pick up.

## 📁 Project Structure

```text
Distributed-Job-Scheduler/
├── backend/                  # Node.js Express API & Worker Engine
│   ├── src/
│   │   ├── api/              # Express Server, Controllers, Routes, Middlewares
│   │   ├── db/               # PostgreSQL Connection, Schema, Migrations, Seeds
│   │   ├── shared/           # Error Handling & Logging utilities
│   │   └── worker/           # Background Daemon, Poller, Heartbeat, Spawner
│   └── package.json
├── frontend/                 # React + Vite Dashboard
│   ├── src/
│   │   ├── components/       # Reusable UI components (Buttons, Inputs, Cards)
│   │   ├── features/         # Feature-specific logic (Dashboard, Auth, JobsPanel)
│   │   ├── layout/           # Dashboard Layout Shell
│   │   ├── services/         # Axios API Client setup
│   │   ├── utils/            # Utility functions (Tailwind merge)
│   │   ├── App.jsx           # Main App Router
│   │   └── index.css         # Tailwind v4 Global CSS
│   ├── package.json
│   ├── vite.config.js
│   └── postcss.config.js
└── README.md
```

## 🛠️ Technology Stack

**Frontend:**
* React 18 + Vite
* Tailwind CSS v4 (using `@theme` directives)
* React Query (for real-time data polling)
* Chart.js (for worker fleet telemetry visualization)
* Lucide React (Icons)

**Backend:**
* Node.js + Express
* PostgreSQL (Database)
* Kysely (Type-safe SQL query builder)
* Zod (Schema validation)
* JSON Web Tokens (JWT via HttpOnly Cookies for Auth)

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **PostgreSQL** (v14 or higher) running locally or remotely

### 1. Database Setup
1. Open your PostgreSQL interface (e.g., pgAdmin or `psql`).
2. Create a new database named `scheduler_db`.
3. Locate `backend/src/db/schema.sql` and run its entire contents against your new database to create all necessary tables.

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_change_in_production
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=scheduler_db
```

Seed the database with a default Admin user and demo data:
```bash
node src/db/seed.js
```
*(This creates `admin@example.com` / `password123` and a demo Organization/Project).*

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

*(No `.env` file is required for the frontend by default as it proxies API requests to `http://localhost:3000` via Vite config).*

## 🏃‍♂️ Running the Application Locally

To see the distributed system in action, you will need to open **three separate terminal windows**.

**Terminal 1: The API Server**
```bash
cd backend
npm run dev
```

**Terminal 2: The Worker Daemon**
```bash
cd backend
npm run start:worker
```
*(Tip: You can actually open a 4th or 5th terminal and run `npm run start:worker` in all of them to simulate a massive distributed fleet!)*

**Terminal 3: The React Frontend**
```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173` in your browser and log in using the seeded credentials:
* **Email:** `admin@example.com`
* **Password:** `password123`

## 🌟 Features

* **Multi-Tenancy:** Organize work by Organizations and Projects.
* **Real-Time Polling:** The React dashboard uses React Query to poll for job status changes in real-time.
* **Worker Telemetry:** Daemons send health "heartbeats" every 10 seconds (CPU/RAM usage), visualized dynamically in the dashboard via Chart.js.
* **Safe Distributed Locking:** PostgreSQL guarantees 100% safe job execution across isolated distributed workers.
* **Dead Letter Queues:** Failed jobs are automatically retried based on customized retry policies (fixed, linear, exponential) before being moved to a DLQ.

## 🔐 Security
Authentication is handled via HttpOnly JWT cookies. The frontend relies on credentials mirroring, drastically reducing the risk of XSS attacks stealing session tokens.

---
*Built as a highly scalable architecture demonstration.*
