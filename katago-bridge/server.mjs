import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';

const port = Number(process.env.PORT || 8788);
const binary = process.env.KATAGO_BIN || 'katago';
const model = process.env.KATAGO_MODEL;
const config = process.env.KATAGO_CONFIG;
const token = process.env.KATAGO_API_TOKEN || '';
if (!model || !config) throw new Error('KATAGO_MODEL and KATAGO_CONFIG are required');

const engine = spawn(binary, ['analysis', '-model', model, '-config', config], { stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map();
let version = null;
let startupError = null;

engine.on('error', (error) => { startupError = error.message; });
engine.stderr.setEncoding('utf8');
engine.stderr.on('data', (line) => process.stderr.write(`[katago] ${line}`));
engine.on('exit', (code) => {
  startupError = `KataGo exited with code ${code}`;
  for (const request of pending.values()) request.reject(new Error(startupError));
  pending.clear();
});

createInterface({ input: engine.stdout }).on('line', (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id === '__health__') { version = message.version || 'available'; return; }
  const request = pending.get(message.id);
  if (!request) return;
  if (message.error) { pending.delete(message.id); request.reject(new Error(message.error)); return; }
  if (message.isDuringSearch) return;
  pending.delete(message.id); request.resolve(message);
});

engine.stdin.write(`${JSON.stringify({ id: '__health__', action: 'query_version' })}\n`);

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

function authorized(request) {
  return !token || request.headers.authorization === `Bearer ${token}`;
}

async function readBody(request) {
  const parts = []; let size = 0;
  for await (const part of request) { size += part.length; if (size > 1024 * 1024) throw new Error('request_too_large'); parts.push(part); }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

createServer(async (request, response) => {
  if (!authorized(request)) return json(response, 401, { error: 'unauthorized' });
  if (request.method === 'GET' && request.url === '/health') return json(response, startupError ? 503 : 200, { healthy: !startupError, version, pending: pending.size, error: startupError });
  if (request.method !== 'POST' || request.url !== '/analyze') return json(response, 404, { error: 'not_found' });
  try {
    const query = await readBody(request);
    if (!query.id || pending.has(query.id)) return json(response, 400, { error: 'invalid_or_duplicate_id' });
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(query.id); reject(new Error('analysis_timeout')); }, 110000);
      pending.set(query.id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
      engine.stdin.write(`${JSON.stringify(query)}\n`);
    });
    return json(response, 200, result);
  } catch (error) { return json(response, 502, { error: error instanceof Error ? error.message : 'analysis_failed' }); }
}).listen(port, '0.0.0.0', () => console.log(`KataGo bridge listening on :${port}`));

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { engine.kill(signal); process.exit(0); });
