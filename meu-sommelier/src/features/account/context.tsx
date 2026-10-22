import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Mode } from '@/features/catalog/types';
import { accountConversations, createLocalId, emptyDemoState, parseDemoState, snapshotConversation, type DemoProfile, type DemoState, type SavedConversation } from './history';
import { readDemoStorage, writeDemoStorage } from './storage';
import { colors } from '@/theme';

function useAccountState() {
  const [state, setState] = useState<DemoState>(emptyDemoState);
  const [ready, setReady] = useState(false);
  const [persistenceEnabled, setPersistenceEnabled] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [requestedMode, setRequestedMode] = useState<Mode | undefined>();
  const accountListeners = useRef(new Set<(profile: DemoProfile | null) => void>());
  const subscribeAccount = useCallback((listener: (profile: DemoProfile | null) => void) => { accountListeners.current.add(listener); return () => { accountListeners.current.delete(listener); }; }, []);
  useEffect(() => {
    let active = true;
    readDemoStorage().then(raw => { if (active) { setState(parseDemoState(raw)); setReady(true); } }).catch(() => {
      if (active) { setPersistenceEnabled(false); setStorageError('Não consegui ler o histórico local. Seus novos dados ficarão somente nesta sessão; o arquivo anterior foi preservado.'); setReady(true); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready || !persistenceEnabled) return;
    let active = true;
    writeDemoStorage(JSON.stringify(state)).then(() => { if (active) setStorageError(null); }).catch(() => { if (active) setStorageError('Não foi possível salvar neste aparelho. Mantenha esta sessão aberta e tente salvar novamente.'); });
    return () => { active = false; };
  }, [state, ready, persistenceEnabled]);
  const profile = state.signedIn ? state.profile : null;
  const openAccount = (mode?: Mode) => { setRequestedMode(mode); setAccountOpen(true); };
  const enterDemo = (name: string, selectedMode?: Mode) => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) return;
    const nextProfile: DemoProfile = state.profile ? { ...state.profile, name: trimmed, mode: requestedMode ?? state.profile.mode } : { id: createLocalId(), name: trimmed, mode: requestedMode ?? selectedMode ?? 'beginner' };
    accountListeners.current.forEach(listener => listener(nextProfile));
    setState(previous => ({ ...previous, signedIn: true, profile: nextProfile }));
    setAccountOpen(false);
  };
  const signOut = () => { accountListeners.current.forEach(listener => listener(null)); setState(previous => ({ ...previous, signedIn: false })); };
  const updateMode = useCallback((mode: Mode) => setState(previous => previous.signedIn && previous.profile && previous.profile.mode !== mode ? { ...previous, profile: { ...previous.profile, mode } } : previous), []);
  const saveConversation = useCallback((conversation: SavedConversation) => {
    const snapshot = snapshotConversation(conversation);
    setState(previous => {
      if (!previous.signedIn || previous.profile?.id !== snapshot.ownerId || !snapshot.messages.length) return previous;
      const existing = previous.conversations.find(item => item.id === snapshot.id);
      if (existing && existing.ownerId !== snapshot.ownerId) return previous;
      return { ...previous, conversations: [...previous.conversations.filter(item => item.id !== snapshot.id), snapshot] };
    });
  }, []);
  const retrySave = async () => {
    try { if (!persistenceEnabled) return; await writeDemoStorage(JSON.stringify(state)); setStorageError(null); }
    catch { setStorageError('Ainda não foi possível salvar neste aparelho. Sua conversa continua nesta sessão.'); }
  };
  return { ready, profile, demoName: state.profile?.name ?? '', conversations: accountConversations(state.conversations, profile?.id), accountOpen, setAccountOpen, openAccount, enterDemo, signOut, updateMode, saveConversation, storageError, retrySave, canRetrySave: persistenceEnabled, subscribeAccount };
}
const AccountContext = createContext<ReturnType<typeof useAccountState> | null>(null);
export function AccountProvider({ children }: PropsWithChildren) {
  const account = useAccountState();
  return <AccountContext value={account}>{account.ready ? children : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, gap: 16 }}><ActivityIndicator color={colors.accent} /><Text>Preparando sua experiência…</Text></View>}</AccountContext>;
}
export function useAccount() { const account = use(AccountContext); if (!account) throw new Error('Conta indisponível.'); return account; }
