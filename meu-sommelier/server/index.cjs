const http = require('node:http');
const path = require('node:path');
const { converse, PilotError } = require('./sommelier.cjs');
const { publicFailure } = require('./errors.cjs');

// Nesta rede o IPv6 expira; manter a resolução por hostname e o TLS normal,
// usando IPv4 primeiro e evitando a seleção automática do endereço IPv6.
require('node:dns').setDefaultResultOrder('ipv4first');
require('node:net').setDefaultAutoSelectFamily(false);

// Segredos ficam separados do .env do Expo e nunca entram no bundle público.
try { process.loadEnvFile(path.join(__dirname, '.env.local')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const origins = new Set(['http://localhost:8081', 'http://127.0.0.1:8081', ...(process.env.PILOT_ORIGINS || '').split(',').filter(Boolean)]);
const configured = () => !!process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
let inFlight = 0;
let calls = 0;
let windowStart = Date.now();
const server = http.createServer(async (req, res) => {
  const reply = (status, value) => { if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); } };
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)) return reply(403, { error: { message: 'Origem não autorizada.' } });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET' && req.url === '/api/v1/health') return reply(200, { aiReady: configured(), provider: 'anthropic', model });
  if (req.method !== 'POST' || req.url !== '/api/v1/chat') return reply(404, { error: { message: 'Rota não encontrada.' } });
  if (Date.now() - windowStart > 60000) { calls = 0; windowStart = Date.now(); }
  if (calls >= 20 || inFlight >= 2) return reply(429, { error: { message: 'Muitas consultas. Aguarde um pouco.' } });
  if (!configured()) return reply(503, { error: { message: 'Configure ANTHROPIC_API_KEY em server/.env.local e reinicie o servidor.' } });
  calls++; inFlight++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  try {
    const chunks = [];
    let size = 0;
    if (!req.headers['content-type']?.startsWith('application/json')) throw new PilotError('Envie JSON.', 415);
    for await (const chunk of req) { size += chunk.length; if (size > 40000) throw new PilotError('Mensagem muito grande.', 413); chunks.push(chunk); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new PilotError('JSON inválido.'); }
    const result = await converse(body, { apiKey: process.env.ANTHROPIC_API_KEY, model, signal: controller.signal });
    // Somente métricas; não registrar mensagens, chave ou dados pessoais.
    console.log(JSON.stringify({ event: 'chat_usage', ...result.usage }));
    reply(200, result);
  } catch (error) {
    console.error(JSON.stringify({ event: 'chat_error', name: error.name, status: error.status, causeCode: error.cause?.code }));
    const failure = publicFailure(error, controller.signal.aborted);
    reply(failure.status, { error: { message: failure.message } });
  } finally { clearTimeout(timer); inFlight--; }
});
server.requestTimeout = 30000;
server.listen(Number(process.env.PILOT_PORT || 3000), '127.0.0.1', () => console.log(`Piloto local: http://localhost:${process.env.PILOT_PORT || 3000}/api/v1 · IA ${configured() ? 'configurada' : 'aguardando chave'}`));
