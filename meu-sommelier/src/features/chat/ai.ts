import { apiRequest } from '@/lib/api-client';
import type { Criteria, Mode, Recommendation } from '@/features/catalog/types';
import type { ChatMessage } from './conversation';
import type { TokenUsage } from './usage';

export type AiReply = { reply: string; criteria: Criteria; recommendation: Recommendation; usage: TokenUsage };
export const checkAi = (signal: AbortSignal) => apiRequest<{ aiReady: boolean; provider: string; model: string }>('health', { signal });
export function askSommelier(slug: string, message: string, mode: Mode, criteria: Criteria, messages: ChatMessage[], signal: AbortSignal) {
  const history = messages.filter(item => !item.audio && !item.audioUnavailable).slice(-12).map(item => ({ role: item.role, text: `${item.text}${item.recommendation?.items.length ? `\nRótulos sugeridos: ${item.recommendation.items.map(wine => `${wine.wineId} (${wine.name})`).join(', ')}` : ''}`.slice(0, 2000) }));
  return apiRequest<AiReply>('chat', { method: 'POST', signal, body: JSON.stringify({ slug, message, mode, criteria, history }) });
}
