// Tarifas padrão verificadas em 22/10/2026. Sem ferramentas ou descontos de lote.
const source = 'https://platform.claude.com/docs/en/models/haiku-5-5/overview';
function estimateCost(model, usage) {
  if (model !== 'claude-haiku-5-5') return { estimatedCostUsd: null, pricing: null };
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const longContext = input + cacheRead + cacheWrite > 100000;
  const multiplier = longContext ? 5 : 1;
  const inputUsdPerMillion = 0.10 * multiplier;
  const outputUsdPerMillion = 0.50 * multiplier;
  const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const write5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? Math.max(0, cacheWrite - write1h);
  const estimatedCostUsd = (input * inputUsdPerMillion + output * outputUsdPerMillion + cacheRead * 0.01 * multiplier + write5m * 0.125 * multiplier + write1h * 0.20 * multiplier) / 1000000;
  return { estimatedCostUsd, pricing: { inputUsdPerMillion, outputUsdPerMillion, source, checkedAt: '2026-10-22' } };
}
module.exports = { estimateCost };
