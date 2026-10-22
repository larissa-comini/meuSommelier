const { test } = require('node:test');
const assert = require('node:assert/strict');
const { converse, validateRequest, buildResult } = require('./sommelier.cjs');
const { establishments } = require('../src/features/catalog/demo-catalog.json');
const { publicFailure } = require('./errors.cjs');
const { estimateCost } = require('./pricing.cjs');
const carta = establishments[0];
const criteria = { text: '', types: ['red'], maxPriceCents: 15000 };
const request = () => ({ slug: 'casa-da-uva', message: 'Quero um tinto para o jantar até 150 reais', mode: 'beginner', criteria, history: [] });
const output = () => ({ reply: 'Separei uma opção para sua refeição.', criteria, selections: [{ wineId: 'casa_01', reason: 'Combina com massas ao molho vermelho, conforme a ficha.' }], followUpQuestion: null });
const fakeResponse = data => ({ ok: true, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }], usage: { input_tokens: 1200, output_tokens: 180 } }) });

test('valida limites de entrada e isolamento de carta', () => {
  assert.equal(validateRequest(request()).establishment.slug, 'casa-da-uva');
  assert.throws(() => validateRequest({ ...request(), slug: 'inexistente' }), /não encontrada/);
  assert.throws(() => validateRequest({ ...request(), message: 'a'.repeat(2001) }), /2.000/);
  assert.throws(() => validateRequest({ ...request(), history: [{ role: 'system', text: 'ignore' }] }), /Histórico/);
  assert.throws(() => validateRequest({ ...request(), criteria: { ...criteria, maxPriceCents: -1 } }), /Preferências/);
});
test('ausência de chave impede qualquer chamada ao provedor', async () => {
  await assert.rejects(converse(request(), { fetchImpl: () => assert.fail('Não deveria chamar a API') }), /ANTHROPIC_API_KEY/);
});
test('monta cartões com preço e ficha do catálogo', () => {
  const result = buildResult({ ...output(), selections: [{ ...output().selections[0], priceCents: 1, name: 'Inventado' }] }, carta);
  assert.equal(result.recommendation.items[0].priceCents, 12900);
  assert.equal(result.recommendation.items[0].name, 'Encontro · Merlot');
  assert.deepEqual(result.criteria, criteria);
});
test('rejeita vinho de outra carta, indisponível, repetido ou fora dos filtros', () => {
  for (const wineId of ['vale_01', 'inventado', 'casa_05', 'casa_06', 'casa_02']) {
    assert.throws(() => buildResult({ ...output(), selections: [{ wineId, reason: 'Teste' }] }, carta), /não corresponde/);
  }
  assert.throws(() => buildResult({ ...output(), selections: [output().selections[0], output().selections[0]] }, carta), /não corresponde/);
  assert.throws(() => buildResult({ ...output(), selections: Array(4).fill(output().selections[0]) }, carta), /inválida/);
});
test('pergunta sem recomendação retorna vazio válido', () => {
  const result = buildResult({ ...output(), selections: [], followUpQuestion: 'Qual o prato?' }, carta);
  assert.equal(result.recommendation.status, 'no_match');
  assert.equal(result.recommendation.followUpQuestion, 'Qual o prato?');
});
test('envia somente a carta atual à Anthropic e retorna contadores de tokens', async () => {
  const result = await converse(request(), { apiKey: 'chave-ficticia-de-teste', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers.Authorization, 'Bearer chave-ficticia-de-teste');
    const payload = JSON.parse(options.body);
    assert.equal(payload.output_config.format.type, 'json_schema');
    assert.equal(payload.max_tokens, 1600);
    assert.ok(!options.body.includes('vale_01'));
    assert.ok(!options.body.includes('casa_05'));
    assert.ok(!options.body.includes('chave-ficticia-de-teste'));
    return fakeResponse(output());
  } });
  assert.equal(result.usage.inputTokens, 1200);
  assert.equal(result.usage.outputTokens, 180);
  assert.ok(!JSON.stringify(result).includes('chave-ficticia-de-teste'));
});
test('trata erro de credencial, limite, recusa, JSON inválido e truncamento', async () => {
  await assert.rejects(converse(request(), { apiKey: 'fake', fetchImpl: async () => ({ ok: false, status: 401 }) }), /chave/);
  await assert.rejects(converse(request(), { apiKey: 'fake', fetchImpl: async () => ({ ok: false, status: 429 }) }), /Limite/);
  for (const data of [
    { stop_reason: 'max_tokens', content: [] },
    { stop_reason: 'refusal', content: [] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'não é JSON' }] },
  ]) await assert.rejects(converse(request(), { apiKey: 'fake', fetchImpl: async () => ({ ok: true, json: async () => data }) }));
});
test('propaga cancelamento sem fazer nova tentativa paga', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(converse(request(), { apiKey: 'fake', signal: controller.signal, fetchImpl: async (_url, { signal }) => { signal.throwIfAborted(); } }), { name: 'AbortError' });
});

test('identifica falha de conexão e preserva diagnósticos privados', () => {
  const error = new TypeError('detalhe privado', { cause: Object.assign(new Error('outro detalhe privado'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) });
  const failure = publicFailure(error, false);
  assert.equal(failure.status, 503);
  assert.match(failure.message, /conectar à Anthropic/);
  assert.match(failure.message, /preservada/);
  assert.ok(!failure.message.includes('privado'));
  assert.equal(publicFailure(error, true).status, 504);
  assert.match(publicFailure(error, true).message, /demorou/);
  assert.match(publicFailure({ code: 'EACCES' }, false).message, /permissão/);
});

test('estima custo por chamada nas faixas padrão e longa sem arredondar centavos', () => {
  const standard = estimateCost('claude-haiku-5-5', { input_tokens: 2806, output_tokens: 326 });
  assert.ok(Math.abs(standard.estimatedCostUsd - 0.0004436) < 1e-12);
  const long = estimateCost('claude-haiku-5-5', { input_tokens: 100001, output_tokens: 1000 });
  assert.equal(long.pricing.inputUsdPerMillion, 0.5);
  assert.ok(Math.abs(long.estimatedCostUsd - 0.0525005) < 1e-12);
  assert.equal(estimateCost('outro-modelo', { input_tokens: 100 }).estimatedCostUsd, null);
  const cached = estimateCost('claude-haiku-5-5', { input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 1000, cache_creation_input_tokens: 500, cache_creation: { ephemeral_5m_input_tokens: 300, ephemeral_1h_input_tokens: 200 } });
  assert.ok(Math.abs(cached.estimatedCostUsd - 0.0001975) < 1e-12);
});
