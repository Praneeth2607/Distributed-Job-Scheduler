import { test } from 'node:test';
import assert from 'node:assert';
import { calculateNextRun } from './backoff.js';

test('Backoff Logic: Should return null if current retries exceed max_retries', () => {
  const policy = { type: 'fixed', max_retries: 3, delay_ms: 5000, multiplier: 1 };
  const nextRun = calculateNextRun(policy, 3);
  assert.strictEqual(nextRun, null);
});

test('Backoff Logic: Linear backoff should calculate correctly', () => {
  const policy = { type: 'linear', max_retries: 3, delay_ms: 1000, multiplier: 1 };
  const now = Date.now();
  
  // Try 0 (1st retry): delay = 1000 * 1 = 1000ms
  const nextRun = calculateNextRun(policy, 0);
  assert.ok(nextRun.getTime() >= now + 1000);
});

test('Backoff Logic: Exponential backoff should calculate correctly', () => {
  const policy = { type: 'exponential', max_retries: 5, delay_ms: 1000, multiplier: 2 };
  const now = Date.now();
  
  // Try 3 (4th retry): delay = 1000 * (2^3) = 8000ms
  const nextRun = calculateNextRun(policy, 3);
  assert.ok(nextRun.getTime() >= now + 8000);
});
