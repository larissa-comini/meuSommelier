export type Mode = 'beginner' | 'advanced';
export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'fortified';
export type Scenario = 'success' | 'empty' | 'error' | 'slow';
export type Wine = { wineId: string; name: string; producer: string | null; priceCents: number; currency: 'BRL'; active: boolean; available: boolean; type: WineType; grapes: string[]; country: string | null; region: string | null; vintageYear: number | null; nonVintage: boolean; body: number | null; acidity: number | null; tannin: number | null; sweetness: number | null; pairings: string[] };
export type Criteria = { text: string; maxPriceCents: number | null; types: WineType[] };
export type Establishment = { slug: string; name: string; welcome: string; wines: Wine[] };
export type Recommendation = { id: string; status: 'completed' | 'no_match'; appliedFilters: Criteria; items: (Wine & { reason: string; missingFields: string[] })[]; followUpQuestion: string | null };
export const typeLabels: Record<WineType, string> = { red: 'Tinto', white: 'Branco', rose: 'Rosé', sparkling: 'Espumante', fortified: 'Fortificado' };
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
