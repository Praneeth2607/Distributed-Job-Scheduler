import { Kysely, PostgresDialect } from 'kysely';
import pkg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pkg;

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
  })
});

// Using 'any' equivalent in JS by omitting strict type definition for Kysely instantiation
// In a real production JS app without TS types, Kysely types would be inferred as any or we can define JSDoc types if needed.
export const db = new Kysely({
  dialect,
});
