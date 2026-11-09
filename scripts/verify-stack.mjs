import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadProbe } from './load-probe.mjs';
import { randomUUID } from 'node:crypto';
const project = 'schedra-rubric-qa';
const compose = (args, image) => {
  const result = spawnSync('docker', ['compose', '-p', project, '-f', 'compose.validation.yml', ...args], {
    stdio: 'inherit', windowsHide: true,
    env: { ...process.env, ...(image ? { VALIDATION_BACKEND_IMAGE: image } : {}) },
  });
  assert.equal(result.status, 0, `Compose ${args[0]} failed`);
};
const stackFetch = async (path, init = {}) => {
  // Proxy reloads deliberately drain sockets; each probe needs a fresh connection.
  const headers = new Headers(init.headers);
  headers.set('Connection', 'close');
  try {
    return await fetch(`http://127.0.0.1:8090${path}`, {
      ...init, headers, signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    throw new Error(`Stack probe failed: ${init.method || 'GET'} ${path}`, { cause });
  }
};
const http = async (path, init) => {
  const response = await stackFetch(path, init);
  return { response, body: await response.json() };
};
const capture = args => {
  const result = spawnSync('docker', ['compose', '-p', project, '-f', 'compose.validation.yml', ...args],
    { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, 'Compose capture failed: ' + args[0]);
  return result.stdout.trim();
};
const jsonLogs = service => capture(['logs', '--no-color', '--no-log-prefix', service])
  .split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
const waitFor = async condition => {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Microservice acceptance timed out');
};
const eventsHeaders = { Authorization: 'Bearer local_events_metrics_token_not_for_production' };
const activity = async () => {
  const result = await http('/ops/events/activity', { headers: eventsHeaders });
  assert.equal(result.response.status, 200);
  return result.body.items;
};
const countActivity = async type => (await activity()).find(item => item.type === type)?.count || 0;
const eventsMetrics = async () => {
  const response = await stackFetch('/ops/events/metrics', { headers: eventsHeaders });
  assert.equal(response.status, 200);
  return response.text();
};
compose(['config', '--quiet']);
compose(['build', '--build-arg', 'SCHEDRA_RELEASE=qa-baseline', 'backend']);
compose(['up', '--build', '-d', '--wait', '--wait-timeout', '180']);
compose(['exec', '-T', 'nginx', 'nginx', '-t']);
compose(['exec', '-T', 'prometheus', 'promtool', 'check', 'config', '/etc/prometheus/prometheus.yml']);
const evidence = { environment: 'isolated-compose', recordedAt: new Date().toISOString(), checks: {} };
mkdirSync('artifacts', { recursive: true });
try {
  assert.equal((await http('/health')).response.status, 200);
  assert.equal((await http('/ready')).response.status, 200);
  assert.equal((await http('/metrics')).response.status, 401);
  assert.equal((await http('/api/clients')).response.status, 401);
  assert.equal((await http('/ops/events/ready')).response.status, 200);
  assert.equal((await http('/ops/events/activity')).response.status, 401);
  assert.equal((await http('/ops/events/metrics')).response.status, 401);
  const web = await stackFetch('/');
  assert.ok(web.ok && (await web.text()).includes('<div id="root">'));
  const spec = await http('/api/docs/openapi.json');
  assert.equal(spec.body.openapi, '3.1.0');
  const credentials = { email: 'rubric-validation@schedra.test', password: 'RubricValidation!2026' };
  const signup = await http('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, name: 'Validacao isolada', cpf: '52998224725', accountType: 'business' }) });
  assert.ok([201,409].includes(signup.response.status), JSON.stringify(signup.body));
  const login = await http('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
  assert.equal(login.response.status, 200);
  const headers = { Authorization: `Bearer ${login.body.token}`, 'Content-Type': 'application/json' };
  assert.equal((await http('/ops/events/activity', { headers })).response.status, 401);
  const multipart = async (bytes, filename, type) => {
    const form = new FormData();
    form.append('avatar', new Blob([bytes], { type }), filename);
    return stackFetch('/api/users/me/avatar', {
      method: 'PATCH', headers: { Authorization: headers.Authorization }, body: form,
      signal: AbortSignal.timeout(15000),
    });
  };
  const fixture = spawnSync('docker', ['compose', '-p', project, '-f', 'compose.validation.yml',
    'exec', '-T', 'backend', 'node', '-e',
    "require('sharp')({create:{width:32,height:32,channels:3,background:'#dc4b7f'}}).png().toBuffer().then(b=>process.stdout.write(b.toString('base64')))"],
  { encoding: 'utf8', windowsHide: true });
  assert.equal(fixture.status, 0);
  const avatar = await multipart(Buffer.from(fixture.stdout.trim(), 'base64'), 'avatar.png', 'image/png');
  const avatarBody = await avatar.json();
  assert.equal(avatar.status, 200, JSON.stringify(avatarBody));
  const avatarUrl = avatarBody.user.avatarUrl;
  assert.match(avatarUrl, /^\/uploads\/avatars\/user-.*\.webp$/);
  const download = await stackFetch(avatarUrl);
  assert.equal(download.headers.get('content-type'), 'image/webp');
  const avatarBytes = Buffer.from(await download.arrayBuffer());
  assert.ok(avatarBytes.length > 0);
  assert.equal((await multipart(Buffer.from('not an image'), 'fake.png', 'image/png')).status, 415);
  assert.equal((await multipart(Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png', 'image/png')).status, 413);
  assert.equal((await multipart(Buffer.alloc(6 * 1024 * 1024 + 1), 'proxy-limit.png', 'image/png')).status, 413);
  evidence.checks.upload = { valid: true, fakeRejected: true, multerLimit: true, nginxLimit: true };
  const created = await http('/api/clients', { method: 'POST', headers, body: JSON.stringify({ name: 'Cliente smoke', email: 'smoke@schedra.test', phone: '11999999999', cpf: '', notes: 'Dados sinteticos' }) });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const id = created.body.client.id;
  for (let i = 0; i < 2; i++) assert.equal((await http('/api/clients', { headers })).response.status, 200);
  const updatedName = 'Atualizado com invalidacao';
  const updatePayload = { name: updatedName, email: 'smoke@schedra.test', phone: '11999999999', cpf: '', notes: 'Dados sinteticos' };
  assert.equal((await http(`/api/clients/${id}`, { method: 'PUT', headers, body: JSON.stringify(updatePayload) })).response.status, 200);
  assert.ok((await http('/api/clients', { headers })).body.data.some(row => row.name === updatedName));
  evidence.load = {
    read: await loadProbe(async () => (await http('/api/clients', { headers })).response.status, 80, 5),
    write: await loadProbe(async () => (await http(`/api/clients/${id}`, {
      method: 'PUT', headers, body: JSON.stringify(updatePayload),
    })).response.status, 20, 2),
  };
  assert.equal(evidence.load.read.errors, 0);
  assert.equal(evidence.load.write.errors, 0);
  assert.ok(evidence.load.read.p95Ms < 500, JSON.stringify(evidence.load));
  assert.ok(evidence.load.write.p95Ms < 1000, JSON.stringify(evidence.load));
  const metrics = await stackFetch('/metrics', { headers: { Authorization: 'Bearer local_validation_metrics_not_for_production' } });
  const measurements = await metrics.text();
  assert.ok(metrics.ok && measurements.includes('schedra_http_requests_total'));
  assert.ok(measurements.includes('category="cache",outcome="hit"'));
  assert.ok(measurements.includes('category="cache",outcome="miss"'));
  assert.ok(measurements.includes('route="/api/clients"'), 'Business route labels must retain the router prefix');
  const promQuery = async expression => {
    const response = await fetch('http://127.0.0.1:9091/api/v1/query?' + new URLSearchParams({ query: expression }),
      { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, 'success');
    return result.data.result;
  };
  for (let attempt = 0; attempt < 20; attempt++) {
    const up = await promQuery('up{job="schedra"}');
    const business = await promQuery('schedra_http_requests_total{job="schedra",route="/api/clients"}');
    const availability = await promQuery('schedra:business_availability:ratio5m');
    if (up[0]?.value[1] === '1' && business.length && availability.length
      && Number.isFinite(Number(availability[0].value[1]))) {
      evidence.checks.collector = { up: true, businessSeries: business.length,
        availabilityRatio: Number(availability[0].value[1]) };
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(evidence.checks.collector, 'Prometheus must actually scrape business metrics');
  const events = jsonLogs('backend');
  const publication = events.find(event => event.type === 'event_published');
  assert.ok(publication);
  assert.equal(publication.subscribers, 1, 'Only the independent microservice should subscribe');
  assert.ok(!events.some(event => event.type === 'event_consumed'), 'API must not run the consumer');
  await waitFor(async () => jsonLogs('events').some(event =>
    event.type === 'event_consumed' && event.eventId === publication.eventId && event.requestId === publication.requestId));
  console.log(JSON.stringify({ eventId: publication.eventId, published: true, consumed: true }));
  evidence.checks.pubsub = { eventId: publication.eventId, published: true, consumed: true, consumer: 'events' };
  await waitFor(async () => (await promQuery('up{job="schedra-events"}'))[0]?.value[1] === '1');
  const synthetic = { eventId: randomUUID(), version: 1, type: 'client.updated', scope: 'org:999',
    entityId: 999, occurredAt: new Date().toISOString(), requestId: 'micro-smoke-' + randomUUID() };
  const publish = value => capture(['exec', '-T', 'redis', 'redis-cli', 'PUBLISH', 'schedra-rubric:v1:events:v1', JSON.stringify(value)]);
  const beforeDuplicate = await countActivity('client.updated');
  publish(synthetic);
  publish(synthetic);
  publish({ ...synthetic, type: 'client.deleted' });
  publish({ ...synthetic, email: 'synthetic-field-must-be-rejected' });
  await waitFor(async () => {
    const text = await eventsMetrics();
    return text.includes('outcome="duplicate"} 1') && text.includes('outcome="conflict"} 1') && text.includes('outcome="invalid"} 1');
  });
  assert.equal(await countActivity('client.updated'), beforeDuplicate + 1);
  const retained = await activity();
  const apiContainer = capture(['ps', '-q', 'backend']);
  compose(['stop', 'events']);
  assert.equal((await http(`/api/clients/${id}`, { method: 'PUT', headers,
    body: JSON.stringify({ ...updatePayload, name: 'Servico de eventos desligado' }) })).response.status, 200);
  compose(['start', 'events']);
  compose(['up', '-d', '--no-deps', '--wait', '--wait-timeout', '90', 'events']);
  compose(['exec', '-T', 'nginx', 'nginx', '-s', 'reload']);
  console.log('Checking independent consumer restart and durable receipts');
  await waitFor(async () => {
    try { return (await http('/ops/events/ready')).response.status === 200; } catch { return false; }
  });
  assert.equal(capture(['ps', '-q', 'backend']), apiContainer, 'Restarting the service must not restart the API');
  assert.deepEqual(await activity(), retained, 'Missed Pub/Sub messages must not be presented as replayed');
  publish(synthetic);
  await waitFor(async () => (await eventsMetrics()).includes('outcome="duplicate"} 1'));
  assert.deepEqual(await activity(), retained, 'Dedupe receipts must survive a process restart');
  const afterRestart = await countActivity('client.updated');
  assert.equal((await http(`/api/clients/${id}`, { method: 'PUT', headers, body: JSON.stringify(updatePayload) })).response.status, 200);
  await waitFor(async () => (await countActivity('client.updated')) === afterRestart + 1);
  evidence.checks.microservice = { independentConsumer: true, activityProjection: true, dedicatedToken: true,
    duplicateRejected: true, conflictRejected: true, invalidRejected: true, persistence: true,
    apiUnaffectedByStop: true, noReplayClaim: true, consumerResumed: true };
  compose(['stop', 'redis']);
  await waitFor(async () => (await http('/ops/events/ready')).response.status === 503);
  assert.equal((await http('/ready')).response.status, 200);
  const offlineWrite = await http(`/api/clients/${id}`, { method: 'PUT', headers, body: JSON.stringify({ name: 'Atualizado sem Redis', email: 'smoke@schedra.test', phone: '11999999999', cpf: '', notes: 'Banco continua sendo a fonte' }) });
  assert.equal(offlineWrite.response.status, 200, JSON.stringify(offlineWrite.body));
  assert.ok((await http('/api/clients', { headers })).body.data.some(row => row.name === 'Atualizado sem Redis'));
  compose(['start', 'redis']);
  compose(['restart', 'database']);
  compose(['up', '-d', '--wait', '--wait-timeout', '180']);
  assert.equal((await http('/ready')).response.status, 200);
  assert.equal((await http(`/api/clients/${id}`, { headers })).response.status, 200);
  assert.equal((await http('/ops/events/ready')).response.status, 200);
  const consumerContainer = capture(['ps', '-q', 'events']);
  // Deploy a configuration-only candidate and restore the prior tagged image.
  // No schema reversal; the same persisted rows and avatar must survive both.
  compose(['build', '--build-arg', 'SCHEDRA_RELEASE=qa-candidate', 'backend'], 'schedra-rubric-backend:candidate');
  for (const [image, release] of [
    ['schedra-rubric-backend:candidate', 'qa-candidate'],
    ['schedra-rubric-backend:baseline', 'qa-baseline'],
  ]) {
    compose(['up', '-d', '--no-build', '--no-deps', '--force-recreate', '--wait', '--wait-timeout', '90', 'backend'], image);
    compose(['exec', '-T', 'nginx', 'nginx', '-s', 'reload']);
    let healthy = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        healthy = (await http('/health')).body.release === release;
        if (healthy) break;
      } catch { /* The old proxy workers may still be draining during reload. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(healthy, 'Release readiness must match ' + release);
    assert.equal((await http(`/api/clients/${id}`, { headers })).response.status, 200);
    const persisted = await stackFetch(avatarUrl);
    assert.equal(persisted.status, 200);
    assert.deepEqual(Buffer.from(await persisted.arrayBuffer()), avatarBytes);
  }
  evidence.checks.rollback = { candidate: 'qa-candidate', restored: 'qa-baseline', clientPreserved: true, avatarPreserved: true };
  assert.equal(capture(['ps', '-q', 'events']), consumerContainer, 'API rollback must not replace the microservice');
  assert.equal((await http(`/api/clients/${id}`, { method: 'DELETE', headers })).response.status, 200);
  evidence.passed = true;
  writeFileSync('artifacts/stack-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ evidence }));
  console.log(JSON.stringify({ passed: true, proxy: true, readiness: true, protectedMetrics: true, redisOptional: true, databaseRestart: true }));
} finally {
  writeFileSync('artifacts/stack-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
  compose(['logs', '--no-color', '--tail', '50', 'backend']);
  compose(['down']); // Preserve the test database volume; never touches the developer stack.
}
