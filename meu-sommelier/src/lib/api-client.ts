// O piloto usa um servidor separado; nenhuma chave de provedor entra aqui.
import { fetch } from 'expo/fetch';
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public requestId?: string) { super(message); }
}
export async function apiRequest<T>(path: string, options: RequestInit = {}, sessionToken?: string): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL || (process.env.EXPO_OS === 'web' ? 'http://localhost:3000/api/v1' : undefined);
  if (!base) throw new ApiError('Configure EXPO_PUBLIC_API_URL para integrar o backend.', 0, 'CONFIGURATION');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
  const timeout = new AbortController();
  const abort = () => timeout.abort();
  if (options.signal?.aborted) timeout.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 30000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, { ...options, signal: timeout.signal, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(body?.error?.message ?? 'Não foi possível concluir a operação.', response.status, body?.error?.code, body?.error?.requestId);
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(timeout.signal.aborted ? 'Consulta cancelada ou tempo limite excedido.' : 'Sem conexão. Tente novamente.', 0, 'NETWORK');
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
