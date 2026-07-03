import * as path from 'path';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from 'kysely';
import { config } from '../config/env.js';

// Get current directory for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateToLatest() {
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: config.DATABASE_URL,
      }),
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  let error, results;

  if (command === 'up') {
    ({ error, results } = await migrator.migrateToLatest());
  } else if (command === 'down') {
    ({ error, results } = await migrator.navigateDown());
  } else {
    console.error('Unknown command. Use "up" or "down".');
    process.exit(1);
  }

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

migrateToLatest();
