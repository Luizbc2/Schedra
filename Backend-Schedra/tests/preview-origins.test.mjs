import test from 'node:test';
import assert from 'node:assert/strict';
import { getTemporaryPreviewOrigins } from '../src/config/preview-origins.ts';

test('allows only the exact authorized preview before expiry', () => {
  assert.deepEqual(getTemporaryPreviewOrigins(Date.parse('2026-09-11T00:00:00Z')), [
    'https://collection-sentence-car-feels.trycloudflare.com',
  ]);
});
test('does not allow another tunnel or a wildcard', () => {
  const origins = getTemporaryPreviewOrigins(Date.parse('2026-09-11T00:00:00Z'));
  assert.equal(origins.includes('https://other.trycloudflare.com'), false);
  assert.equal(origins.includes('*'), false);
});
test('revokes the origin at the expiry boundary', () => {
  assert.deepEqual(getTemporaryPreviewOrigins(Date.parse('2026-09-12T23:59:59Z')), []);
});
test('does not restore an expired origin later', () => {
  assert.deepEqual(getTemporaryPreviewOrigins(Date.parse('2027-01-01T00:00:00Z')), []);
});
