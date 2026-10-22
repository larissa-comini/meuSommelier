export type TokenUsage = {
  inputTokens: number; outputTokens: number; model: string;
  estimatedCostUsd: number | null;
  pricing: { inputUsdPerMillion: number; outputUsdPerMillion: number; source: string; checkedAt: string } | null;
};
export type SessionUsage = TokenUsage & { lastRequest: TokenUsage };

export function accumulateUsage(previous: SessionUsage | null, current: TokenUsage): SessionUsage {
  return {
    ...current,
    inputTokens: (previous?.inputTokens ?? 0) + current.inputTokens,
    outputTokens: (previous?.outputTokens ?? 0) + current.outputTokens,
    estimatedCostUsd: current.estimatedCostUsd === null || previous?.estimatedCostUsd === null ? null : (previous?.estimatedCostUsd ?? 0) + current.estimatedCostUsd,
    lastRequest: current,
  };
}
export const formatUsd = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(value);
export const formatBrl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);
export function referenceExchangeRate(value: string): number | null {
  if (!/^\d+(?:[.,]\d{1,4})?$/.test(value.trim())) return null;
  const rate = Number(value.trim().replace(',', '.'));
  return rate > 0 && rate <= 1000 ? rate : null;
}
