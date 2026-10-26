import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const project = 'schedra-rubric-qa';
const compose = args => {
  const result = spawnSync('docker', ['compose', '-p', project, '-f', 'compose.validation.yml', ...args], { stdio: 'inherit', windowsHide: true });
  assert.equal(result.status, 0, `Compose ${args[0]} failed`);
};
const http = async (path, init) => {
  const response = await fetch(`http://127.0.0.1:8090${path}`, { ...init, signal: AbortSignal.timeout(15000) });
  return { response, body: await response.json() };
};
compose(['config', '--quiet']);
compose(['up', '--build', '-d', '--wait', '--wait-timeout', '180']);
compose(['exec', '-T', 'nginx', 'nginx', '-t']);
try {
  assert.equal((await http('/health')).response.status, 200);
  assert.equal((await http('/ready')).response.status, 200);
  assert.equal((await http('/metrics')).response.status, 401);
  assert.equal((await http('/api/clients')).response.status, 401);
  const web = await fetch('http://127.0.0.1:8090', { signal: AbortSignal.timeout(15000) });
  assert.ok(web.ok && (await web.text()).includes('<div id="root">'));
  const spec = await http('/api/docs/openapi.json');
  assert.equal(spec.body.openapi, '3.1.0');
  const credentials = { email: 'rubric-validation@schedra.test', password: 'RubricValidation!2026' };
  const signup = await http('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, name: 'Validacao isolada', cpf: '52998224725', accountType: 'business' }) });
  assert.ok([201,409].includes(signup.response.status), JSON.stringify(signup.body));
  const login = await http('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
  assert.equal(login.response.status, 200);
  const headers = { Authorization: `Bearer ${login.body.token}`, 'Content-Type': 'application/json' };
  const created = await http('/api/clients', { method: 'POST', headers, body: JSON.stringify({ name: 'Cliente smoke', email: 'smoke@schedra.test', phone: '11999999999', cpf: '', notes: 'Dados sinteticos' }) });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const id = created.body.client.id;
  for (let i = 0; i < 2; i++) assert.equal((await http('/api/clients', { headers })).response.status, 200);
  const metrics = await fetch('http://127.0.0.1:8090/metrics', { headers: { Authorization: 'Bearer local_validation_metrics_not_for_production' } });
  const measurements = await metrics.text();
  assert.ok(metrics.ok && measurements.includes('schedra_http_requests_total'));
  assert.ok(measurements.includes('category="cache",outcome="hit"'));
  assert.ok(measurements.includes('category="cache",outcome="miss"'));
  const logs = spawnSync('docker', ['compose', '-p', project, '-f', 'compose.validation.yml', 'logs', '--no-color', '--no-log-prefix', 'backend'], { encoding: 'utf8', windowsHide: true });
  assert.equal(logs.status, 0);
  const events = logs.stdout.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const publication = events.find(event => event.type === 'event_published');
  assert.ok(publication && events.some(event => event.type === 'event_consumed' && event.eventId === publication.eventId));
  console.log(JSON.stringify({ eventId: publication.eventId, published: true, consumed: true }));
  compose(['stop', 'redis']);
  assert.equal((await http('/ready')).response.status, 200);
  const offlineWrite = await http(`/api/clients/${id}`, { method: 'PUT', headers, body: JSON.stringify({ name: 'Atualizado sem Redis', email: 'smoke@schedra.test', phone: '11999999999', cpf: '', notes: 'Banco continua sendo a fonte' }) });
  assert.equal(offlineWrite.response.status, 200, JSON.stringify(offlineWrite.body));
  assert.ok((await http('/api/clients', { headers })).body.data.some(row => row.name === 'Atualizado sem Redis'));
  compose(['start', 'redis']);
  compose(['restart', 'database']);
  compose(['up', '-d', '--wait', '--wait-timeout', '180']);
  assert.equal((await http('/ready')).response.status, 200);
  assert.equal((await http(`/api/clients/${id}`, { headers })).response.status, 200);
  assert.equal((await http(`/api/clients/${id}`, { method: 'DELETE', headers })).response.status, 200);
  console.log(JSON.stringify({ passed: true, proxy: true, readiness: true, protectedMetrics: true, redisOptional: true, databaseRestart: true }));
} finally {
  compose(['logs', '--no-color', '--tail', '50', 'backend']);
  compose(['down']); // Preserve the test database volume; never touches the developer stack.
}
