import type { Criteria, Mode, Recommendation, Wine } from '../catalog/types';
import type { ChatMessage } from '../chat/conversation';

export type DemoProfile = { id: string; name: string; mode: Mode };
export type SavedConversation = {
  id: string; ownerId: string; slug: string; establishmentName: string; title: string;
  createdAt: string; updatedAt: string; mode: Mode; criteria: Criteria;
  messages: ChatMessage[]; feedback: Record<string, boolean>;
};
export type DemoState = { version: 1; profile: DemoProfile | null; signedIn: boolean; conversations: SavedConversation[] };
export const emptyDemoState = (): DemoState => ({ version: 1, profile: null, signedIn: false, conversations: [] });
export const createLocalId = () => `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function conversationForAccount(conversations: SavedConversation[], ownerId: string | undefined, slug: string, id: string | undefined) {
  if (!ownerId || !id) return undefined;
  return conversations.find(item => item.id === id && item.ownerId === ownerId && item.slug === slug);
}
export function accountConversations(conversations: SavedConversation[], ownerId: string | undefined) {
  return ownerId ? conversations.filter(item => item.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
}
export function snapshotConversation(conversation: SavedConversation): SavedConversation {
  const messages = conversation.messages.map(message => {
    const { audio, ...rest } = message;
    return audio ? { ...rest, audioUnavailable: true } : rest;
  });
  // Preço e ficha ficam congelados no instante da mensagem; blobs de áudio não são persistidos.
  return JSON.parse(JSON.stringify({ ...conversation, messages })) as SavedConversation;
}

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validMode = (value: unknown): value is Mode => value === 'beginner' || value === 'advanced';
const validType = (value: unknown) => typeof value === 'string' && ['red', 'white', 'rose', 'sparkling', 'fortified'].includes(value);
function validCriteria(value: unknown): value is Criteria {
  return isObject(value) && typeof value.text === 'string' && Array.isArray(value.types) && value.types.every(validType) && new Set(value.types).size === value.types.length && (value.maxPriceCents === null || typeof value.maxPriceCents === 'number' && Number.isSafeInteger(value.maxPriceCents) && value.maxPriceCents >= 0);
}
// Converte filtros antigos sem alterar os tipos dos vinhos nem perder o histórico.
function upgradeCriteria(value: unknown): unknown {
  if (!isObject(value) || 'types' in value || !(value.type === null || validType(value.type))) return value;
  const { type, ...rest } = value;
  return { ...rest, types: type === null ? [] : [type] };
}
function validWine(value: unknown): value is Wine {
  if (!isObject(value) || typeof value.wineId !== 'string' || typeof value.name !== 'string' || value.currency !== 'BRL' || !validType(value.type) || !Number.isSafeInteger(value.priceCents) || Number(value.priceCents) < 0) return false;
  return Array.isArray(value.grapes) && value.grapes.every(v => typeof v === 'string') && Array.isArray(value.pairings) && value.pairings.every(v => typeof v === 'string') && ['producer', 'country', 'region'].every(key => value[key] === null || typeof value[key] === 'string') && ['body', 'acidity', 'tannin', 'sweetness'].every(key => value[key] === null || typeof value[key] === 'number' && Number(value[key]) >= 1 && Number(value[key]) <= 5) && typeof value.nonVintage === 'boolean' && (value.vintageYear === null || Number.isInteger(value.vintageYear));
}
function validRecommendation(value: unknown): value is Recommendation {
  return isObject(value) && typeof value.id === 'string' && ['completed', 'no_match'].includes(String(value.status)) && validCriteria(value.appliedFilters) && Array.isArray(value.items) && value.items.length <= 3 && value.items.every(validWine) && (value.followUpQuestion === null || typeof value.followUpQuestion === 'string');
}
function validMessage(value: unknown): value is ChatMessage {
  return isObject(value) && typeof value.id === 'string' && ['user', 'assistant'].includes(String(value.role)) && typeof value.text === 'string' && value.audio === undefined && (value.recommendation === undefined || validRecommendation(value.recommendation));
}
export function parseDemoState(raw: string | null): DemoState {
  if (!raw) return emptyDemoState();
  const value: unknown = JSON.parse(raw);
  if (!isObject(value) || value.version !== 1 || typeof value.signedIn !== 'boolean' || !Array.isArray(value.conversations)) throw new Error('Histórico local inválido.');
  if (value.profile !== null && (!isObject(value.profile) || typeof value.profile.id !== 'string' || typeof value.profile.name !== 'string' || !validMode(value.profile.mode))) throw new Error('Perfil local inválido.');
  if (value.signedIn && !value.profile) throw new Error('Perfil ausente.');
  for (const item of value.conversations) {
    if (isObject(item)) {
      item.criteria = upgradeCriteria(item.criteria);
      if (Array.isArray(item.messages)) for (const message of item.messages) {
        if (isObject(message) && isObject(message.recommendation)) message.recommendation.appliedFilters = upgradeCriteria(message.recommendation.appliedFilters);
      }
    }
    if (!isObject(item) || !['id', 'ownerId', 'slug', 'establishmentName', 'title', 'createdAt', 'updatedAt'].every(key => typeof item[key] === 'string') || !Number.isFinite(Date.parse(String(item.createdAt))) || !Number.isFinite(Date.parse(String(item.updatedAt))) || !validMode(item.mode) || !validCriteria(item.criteria) || !Array.isArray(item.messages) || !item.messages.every(validMessage) || !isObject(item.feedback) || !Object.values(item.feedback).every(v => typeof v === 'boolean')) throw new Error('Conversa local inválida.');
  }
  return value as DemoState;
}
