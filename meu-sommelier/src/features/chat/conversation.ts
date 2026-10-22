import type { Criteria, Recommendation } from '../catalog/types';

export type VoiceNote = { uri: string; duration: number };
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audio?: VoiceNote;
  audioUnavailable?: boolean;
  recommendation?: Recommendation;
};

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Vocabulário restrito para a demonstração. Não substitui o entendimento da IA. */
export function interpretMessage(text: string, previous: Criteria): { criteria: Criteria; question?: string } {
  const normalized = normalize(text);
  const criteria = { ...previous };
  const types = [
    ['red', /\btintos?\b/], ['white', /\bbrancos?\b/], ['rose', /\broses?\b/],
    ['sparkling', /\bespumantes?\b/], ['fortified', /\bfortificados?\b/],
  ] as const;
  const matches = types.filter(([, pattern]) => pattern.test(normalized));
  if (/\b(nao|exceto|menos|evit\w*)\b/.test(normalized)) {
    return { criteria, question: 'Para eu não interpretar errado: qual tipo você quer procurar? Pode dizer tinto, branco, rosé ou espumante.' };
  }
  if (matches.length) criteria.types = matches.map(([type]) => type);
  if (/\bmais barato\b/.test(normalized)) return { criteria, question: 'Claro. Qual valor máximo por garrafa você quer considerar? Pode dizer, por exemplo, “até 100 reais”.' };
  if (/\b(qualquer tipo|sem preferencia|todos os tipos)\b/.test(normalized)) criteria.types = [];
  const budget = normalized.match(/(?:ate\s*(?:r\$\s*)?|r\$\s*)(\d+(?:[.,]\d{1,2})?)\b/) ?? normalized.match(/\b(\d+(?:[.,]\d{1,2})?)\s*reais\b/);
  if (budget) criteria.maxPriceCents = Math.round(Number(budget[1].replace(',', '.')) * 100);
  if (/\bsem limite\b/.test(normalized)) criteria.maxPriceCents = null;
  if (/\b(mais barato|mais leve|jantar|massa|carne|peixe|harmoniz\w*)\b/.test(normalized) && !matches.length && !budget) {
    return { criteria, question: 'Vamos por partes: você prefere tinto, branco ou rosé? E quanto quer gastar por garrafa? Nesta demonstração, consigo buscar por tipo e orçamento; harmonizações entram na integração.' };
  }
  const named = normalized.match(/\b(merlot|chardonnay|pinot noir|cabernet|sauvignon blanc|syrah|brasil)\b/);
  if (named) criteria.text = named[1];
  else if (matches.length) criteria.text = '';
  const hasIntent = matches.length || budget || named || /\b(carta|opcoes|sugestoes|vinhos|sem limite|sem preferencia|qualquer tipo|todos os tipos)\b/.test(normalized);
  if (!hasIntent) return { criteria, question: 'Me conta um pouco: você prefere algum tipo de vinho e tem um valor em mente? Experimente “um tinto até 150 reais”.' };
  return { criteria };
}
