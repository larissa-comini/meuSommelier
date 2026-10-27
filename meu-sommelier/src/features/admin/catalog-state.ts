import type { AdminWine } from './types';

export function catalogStatus(wine: Pick<AdminWine, 'active' | 'available'>) {
  if (!wine.active) return { label: 'Oculto da carta', detail: 'Os clientes não veem este vinho.', action: 'Mostrar na carta', field: 'active' as const, value: true };
  if (!wine.available) return { label: 'Sem estoque', detail: 'Aparece na carta, mas não é recomendado.', action: 'Marcar como disponível', field: 'available' as const, value: true };
  return { label: 'Disponível', detail: 'Pronto para ser recomendado aos clientes.', action: 'Marcar sem estoque', field: 'available' as const, value: false };
}

export function catalogFilter(status: string) {
  if (status === 'available') return { active: 'true', available: 'true' };
  if (status === 'unavailable') return { active: 'true', available: 'false' };
  if (status === 'hidden') return { active: 'false', available: '' };
  return { active: '', available: '' };
}
