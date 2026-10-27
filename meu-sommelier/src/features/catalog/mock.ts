import type { Criteria, Establishment, Recommendation, Scenario, Wine } from './types';
import { establishments as catalog } from './demo-catalog.json';
export let establishments = catalog as Establishment[];
export const replaceEstablishments = (items: Establishment[]) => { establishments = items; };
export const getEstablishment = (slug: string) => establishments.find(item => item.slug === slug);
export const getWine = (slug: string, id: string) => getEstablishment(slug)?.wines.find(item => item.wineId === id && item.active);
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Matching determinístico de demonstração, sem IA ou inferências de harmonização.
export function selectWines(slug: string, criteria: Criteria): Recommendation {
  const establishment = getEstablishment(slug);
  if (!establishment) throw new Error('Estabelecimento não encontrado.');
  const query = normalize(criteria.text.trim());
  const items = establishment.wines.filter(w => w.active && w.available)
    .filter(w => !criteria.types.length || criteria.types.includes(w.type))
    .filter(w => criteria.maxPriceCents === null || w.priceCents <= criteria.maxPriceCents)
    .filter(w => !query || normalize([w.name, ...w.grapes, w.country, w.region].filter(Boolean).join(' ')).includes(query))
    .slice(0, 3).map(w => ({ ...w, reason: 'Disponível nesta carta e dentro dos filtros selecionados. Seleção demonstrativa, sem IA.', missingFields: ['body', 'acidity', 'tannin', 'sweetness'].filter(key => w[key as keyof Wine] === null) }));
  return { id: `demo-${slug}-${Date.now()}`, status: items.length ? 'completed' : 'no_match', appliedFilters: { ...criteria, types: [...criteria.types] }, items, followUpQuestion: items.length ? null : 'Prefere mudar o tipo, o orçamento ou o texto da busca?' };
}
export async function recommend(slug: string, criteria: Criteria, scenario: Scenario, signal: AbortSignal): Promise<Recommendation> {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Consulta cancelada.')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Consulta cancelada.')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, scenario === 'slow' ? 4000 : 450);
    signal.addEventListener('abort', onAbort, { once: true });
  });
  if (signal.aborted) throw new Error('Consulta cancelada.');
  if (scenario === 'error') throw new Error('Falha de rede simulada. Seus critérios foram preservados.');
  const result = selectWines(slug, criteria);
  return scenario === 'empty' ? { ...result, status: 'no_match', items: [], followUpQuestion: 'Qual critério você gostaria de alterar? Este é um cenário vazio simulado.' } : result;
}
