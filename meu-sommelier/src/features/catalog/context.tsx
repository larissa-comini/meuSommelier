import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { apiRequest } from '@/lib/api-client';
import { establishments, replaceEstablishments } from './mock';
import type { Establishment } from './types';
import { colors } from '@/theme';
function useCatalogState() {
  const [items, setItems] = useState(establishments);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const refresh = useCallback(async () => {
    await Promise.resolve();
    try { const result = await apiRequest<{items: Establishment[]}>('public/establishments', { signal: AbortSignal.timeout(5000) }); replaceEstablishments(result.items); setItems(result.items); setOffline(false); }
    catch { setOffline(true); }
    finally { setReady(true); }
  }, []);
  useEffect(() => { const initial = setTimeout(() => void refresh(), 0); const timer = setInterval(() => void refresh(), 15000); return () => { clearTimeout(initial); clearInterval(timer); }; }, [refresh]);
  return { items, ready, offline, refresh };
}
const CatalogContext = createContext<ReturnType<typeof useCatalogState> | null>(null);
export function CatalogProvider({children}: PropsWithChildren) { const state=useCatalogState(); return <CatalogContext value={state}>{state.ready ? children : <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12,backgroundColor:colors.paper}}><ActivityIndicator color={colors.accent}/><Text>Carregando as cartas…</Text></View>}</CatalogContext>; }
export function useCatalog() { const state=use(CatalogContext);if(!state)throw new Error('Catálogo indisponível.');return state; }
export function CatalogNotice() { const {offline}=useCatalog();return offline?<Text accessibilityRole="alert" style={{color:colors.error,fontSize:12,lineHeight:18}}>Sem conexão com a carta atual. Os dados exibidos podem estar desatualizados.</Text>:null; }
