const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  compiled._compile(source, filename);
  return compiled.exports;
}

async function main() {
  const { wineDraft, parseWineDraft } = load('src/features/admin/form.ts');
  const draft = { ...wineDraft(), sku: 'SEM-ESTILO', name: 'Vinho de teste', type: 'red', price: '129,90' };
  const flags = { active: true, available: true, nonVintage: false };
  const parsed = parseWineDraft(draft, flags);
  assert.deepEqual(parsed.errors, {});
  assert.equal(parsed.wine.style, '');
  assert.ok(parseWineDraft({ ...draft, style: 'inventado' }, flags).errors.style);
  assert.deepEqual(parseWineDraft({ ...draft, sku: '' }, flags).errors, {});
  const { reviewRows, reviewChanges, reviewMessage } = load('src/features/admin/import-review.ts');
  const { catalogStatus, catalogFilter } = load('src/features/admin/catalog-state.ts');
  assert.deepEqual(catalogFilter('unavailable'), { active: 'true', available: 'false' });
  assert.deepEqual(catalogFilter('hidden'), { active: 'false', available: '' });
  assert.deepEqual(catalogFilter('available'), { active: 'true', available: 'true' });
  assert.equal(catalogStatus({ active: false, available: true }).label, 'Oculto da carta');
  assert.equal(catalogStatus({ active: false, available: false }).field, 'active');
  assert.equal(catalogStatus({ active: true, available: false }).value, true);
  assert.equal(catalogStatus({ active: true, available: true }).value, false);
  const reviewJob = { preview: [{ row: 2, valid: true }, { row: 3, valid: false }, { row: 4, valid: true }] };
  assert.deepEqual(reviewRows(reviewJob, true).map(row => row.index), [1]);
  assert.equal(reviewRows(reviewJob, false).length, 3);
  assert.equal(reviewMessage(reviewJob), '1 vinho precisa da sua revisão');
  assert.deepEqual(reviewChanges({ 1: { type: 'red', price: '99,90' } }), [{ index: 1, field: 'type', value: 'red' }, { index: 1, field: 'price', value: '99,90' }]);
  const { selectWines, getWine, recommend, establishments } = load('src/features/catalog/mock.ts');
  const { money } = load('src/features/catalog/types.ts');
  const { interpretMessage } = load('src/features/chat/conversation.ts');
  const history = load('src/features/account/history.ts');
  const { accumulateUsage, referenceExchangeRate, formatUsd } = load('src/features/chat/usage.ts');
  const usage = { inputTokens: 2806, outputTokens: 326, model: 'claude-haiku-5-5', estimatedCostUsd: 0.0004436, pricing: null };
  const usageTotal = accumulateUsage(accumulateUsage(null, usage), usage);
  assert.equal(usageTotal.inputTokens, 5612);
  assert.equal(usageTotal.outputTokens, 652);
  assert.equal(usageTotal.estimatedCostUsd, 0.0008872);
  assert.equal(usageTotal.lastRequest.estimatedCostUsd, 0.0004436);
  assert.equal(accumulateUsage(usageTotal, { ...usage, estimatedCostUsd: null }).estimatedCostUsd, null);
  assert.equal(referenceExchangeRate('5,25'), 5.25);
  for (const value of ['', '0', '-5', 'abc', '1e3', '5,2,3']) assert.equal(referenceExchangeRate(value), null);
  assert.match(formatUsd(0.0004436), /0,000444/);
  const criteria = { text: '', types: [], maxPriceCents: null };
  assert.deepEqual(interpretMessage('Quero um tinto até R$ 150', criteria).criteria, { text: '', types: ['red'], maxPriceCents: 15000 });
  assert.equal(interpretMessage('e um branco?', { ...criteria, maxPriceCents: 15000 }).criteria.maxPriceCents, 15000);
  assert.equal(interpretMessage('até 99,90 reais', criteria).criteria.maxPriceCents, 9990);
  assert.ok(interpretMessage('não quero tinto', criteria).question);
  assert.deepEqual(interpretMessage('quero tinto ou branco', criteria).criteria.types, ['red', 'white']);
  assert.ok(interpretMessage('O que vai bem com peixe?', criteria).question);
  assert.equal(interpretMessage('sem limite', { ...criteria, maxPriceCents: 10000 }).criteria.maxPriceCents, null);
  assert.equal(selectWines('casa-da-uva', criteria).items.length, 3);
  const reds = selectWines('casa-da-uva', { ...criteria, types: ['red'], maxPriceCents: 10000 });
  assert.equal(reds.status, 'no_match'); // Não inclui o rótulo indisponível de R$70.
  assert.deepEqual(reds.appliedFilters, { ...criteria, types: ['red'], maxPriceCents: 10000 });
  const mixedCriteria = { ...criteria, types: ['red', 'white'], maxPriceCents: 15000 };
  const mixed = selectWines('casa-da-uva', mixedCriteria);
  assert.deepEqual([...new Set(mixed.items.map(w => w.type))].sort(), ['red', 'white']);
  assert.ok(mixed.items.every(w => w.available && w.priceCents <= 15000 && w.wineId.startsWith('casa_')));
  mixedCriteria.types.push('rose');
  assert.deepEqual(mixed.appliedFilters.types, ['red', 'white']);
  assert.deepEqual(interpretMessage('Quero ver opções', { ...criteria, types: ['white', 'red'] }).criteria.types, ['white', 'red']);
  assert.deepEqual(interpretMessage('sem preferência', { ...criteria, types: ['white', 'red'] }).criteria.types, []);
  assert.equal(getWine('mesa-do-vale', 'casa_01'), undefined);
  assert.equal(getWine('casa-da-uva', 'vale_01'), undefined);
  for (const establishment of establishments) {
    const results = selectWines(establishment.slug, criteria).items;
    assert.ok(results.every(w => w.active && w.available && establishment.wines.some(item => item.wineId === w.wineId)));
  }
  assert.equal(selectWines('casa-da-uva', { ...criteria, text: 'BRÁsil' }).items.length, 3);
  assert.equal(selectWines('casa-da-uva', { ...criteria, text: 'Merlot' }).items[0].wineId, 'casa_01');
  assert.ok(selectWines('casa-da-uva', { ...criteria, maxPriceCents: 10000 }).items.every(w => w.priceCents <= 10000));
  assert.throws(() => selectWines('inexistente', criteria));
  const empty = await recommend('casa-da-uva', criteria, 'empty', new AbortController().signal);
  assert.equal(empty.status, 'no_match'); assert.equal(empty.items.length, 0);
  await assert.rejects(recommend('casa-da-uva', criteria, 'error', new AbortController().signal), /Falha de rede/);
  assert.equal((await recommend('casa-da-uva', criteria, 'success', new AbortController().signal)).status, 'completed');
  const controller = new AbortController();
  const pending = recommend('casa-da-uva', criteria, 'slow', controller.signal);
  controller.abort();
  await assert.rejects(pending, /cancelada/);
  assert.match(money(12900), /129,00/);
  const sourceConversation = { id: 'conversation-a', ownerId: 'owner-a', slug: 'casa-da-uva', establishmentName: 'Casa da Uva', title: 'Meu tinto', createdAt: '2026-10-22T12:00:00.000Z', updatedAt: '2026-10-22T12:00:00.000Z', mode: 'beginner', criteria, feedback: {}, messages: [
    { id: 'voice-a', role: 'user', text: 'Mensagem de voz', audio: { uri: 'blob:private-recording', duration: 5 } },
    { id: 'answer-a', role: 'assistant', text: 'Opções', recommendation: selectWines('casa-da-uva', criteria) },
  ] };
  const snapshot = history.snapshotConversation(sourceConversation);
  assert.equal(snapshot.messages[0].audio, undefined);
  assert.equal(snapshot.messages[0].audioUnavailable, true);
  assert.ok(!JSON.stringify(snapshot).includes('blob:private-recording'));
  const historicalPrice = snapshot.messages[1].recommendation.items[0].priceCents;
  sourceConversation.messages[1].recommendation.items[0].priceCents = 99999;
  assert.equal(snapshot.messages[1].recommendation.items[0].priceCents, historicalPrice);
  assert.equal(history.conversationForAccount([snapshot], 'owner-a', 'casa-da-uva', 'conversation-a').id, 'conversation-a');
  assert.equal(history.conversationForAccount([snapshot], 'owner-b', 'casa-da-uva', 'conversation-a'), undefined);
  assert.equal(history.conversationForAccount([snapshot], 'owner-a', 'mesa-do-vale', 'conversation-a'), undefined);
  assert.deepEqual(history.accountConversations([snapshot], undefined), []);
  assert.deepEqual(history.accountConversations([snapshot], 'owner-b'), []);
  const stored = { version: 1, profile: { id: 'owner-a', name: 'Perfil de teste', mode: 'advanced' }, signedIn: true, conversations: [snapshot] };
  assert.deepEqual(history.parseDemoState(JSON.stringify(stored)), stored);
  const legacy = JSON.parse(JSON.stringify(stored));
  legacy.conversations[0].criteria = { text: '', type: 'red', maxPriceCents: null };
  legacy.conversations[0].messages[1].recommendation.appliedFilters = { text: '', type: null, maxPriceCents: null };
  const upgraded = history.parseDemoState(JSON.stringify(legacy));
  assert.deepEqual(upgraded.conversations[0].criteria.types, ['red']);
  assert.deepEqual(upgraded.conversations[0].messages[1].recommendation.appliedFilters.types, []);
  assert.equal(upgraded.conversations[0].messages[1].recommendation.items[0].priceCents, historicalPrice);
  assert.throws(() => history.parseDemoState(JSON.stringify({ ...stored, conversations: [{ ...snapshot, criteria: { ...criteria, types: ['invalid'] } }] })));
  assert.throws(() => history.parseDemoState('{broken'));
  assert.throws(() => history.parseDemoState(JSON.stringify({ ...stored, conversations: [{ ...snapshot, messages: [{ id: 'bad', role: 'assistant', text: 'x', recommendation: { items: null } }] }] })));
  assert.throws(() => history.parseDemoState(JSON.stringify({ ...stored, profile: null })));
  assert.deepEqual(history.parseDemoState(null), history.emptyDemoState());
  console.log('OK: isolamento do histórico por conta/estabelecimento, preço histórico, remoção de áudio temporário e armazenamento inválido.');
  console.log('OK: vocabulário da conversa, contexto, limites, disponibilidade, isolamento, filtros, busca, vazio, erro/recuperação, cancelamento e preço.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
