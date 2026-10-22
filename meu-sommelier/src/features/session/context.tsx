import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useRouter } from 'expo-router';
import type { Criteria, Mode } from '@/features/catalog/types';
import { getEstablishment, recommend } from '@/features/catalog/mock';
import { interpretMessage, type ChatMessage, type VoiceNote } from '@/features/chat/conversation';
import { releaseVoiceNote } from '@/features/chat/audio-storage';
import { useAccount } from '@/features/account/context';
import { conversationForAccount, createLocalId } from '@/features/account/history';
import { askSommelier, checkAi } from '@/features/chat/ai';
import { accumulateUsage, type SessionUsage } from '@/features/chat/usage';

const emptyCriteria = (): Criteria => ({ text: '', maxPriceCents: null, types: [] });
function useSessionState(slug: string, requestedId?: string) {
  const router = useRouter();
  const { profile, conversations, updateMode, saveConversation, subscribeAccount } = useAccount();
  const saved = conversationForAccount(conversations, profile?.id, slug, requestedId);
  const [mode, setModeState] = useState<Mode>(profile?.mode ?? 'beginner');
  const [profileChosen, setProfileChosen] = useState(!!profile);
  const [criteria, setCriteria] = useState<Criteria>(() => saved?.criteria ?? emptyCriteria());
  const [messages, setMessages] = useState<ChatMessage[]>(() => saved?.messages ?? []);
  const [feedback, setFeedback] = useState<Record<string, boolean>>(() => saved?.feedback ?? {});
  const [currentId, setCurrentId] = useState(() => saved?.id ?? createLocalId());
  const [startedAt, setStartedAt] = useState(() => saved?.createdAt ?? new Date().toISOString());
  const [updatedAt, setUpdatedAt] = useState(() => saved?.updatedAt ?? new Date().toISOString());
  const [restoredFromHistory, setRestoredFromHistory] = useState(!!saved);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [connectingAi, setConnectingAi] = useState(false);
  const [usage, setUsage] = useState<SessionUsage | null>(null);
  const [error, setError] = useState<string | null>(() => requestedId && !saved ? 'Essa conversa não está disponível nesta conta e neste estabelecimento.' : null);
  const [conversationVersion, setConversationVersion] = useState(0);
  const voiceUris = useRef(new Set<string>());
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lastOwner = useRef(profile?.id);

  const releaseAudio = useCallback(() => { voiceUris.current.forEach(releaseVoiceNote); voiceUris.current.clear(); }, []);
  useEffect(() => {
    const uris = voiceUris.current;
    return () => { controller.current?.abort(); uris.forEach(releaseVoiceNote); };
  }, []);
  const setMode = useCallback((nextMode: Mode) => { setModeState(nextMode); updateMode(nextMode); }, [updateMode]);
  const chooseProfile = (nextMode: Mode) => { setMode(nextMode); setProfileChosen(true); };
  const resetChat = useCallback(() => {
    controller.current?.abort(); busy.current = false; releaseAudio();
    const now = new Date().toISOString();
    setCurrentId(createLocalId()); setStartedAt(now); setUpdatedAt(now);
    setConversationVersion(version => version + 1);
    setMessages([]); setDraft(''); setPending(false); setError(null); setFeedback({}); setRestoredFromHistory(false); setUsage(null);
    setCriteria(emptyCriteria());
    router.setParams({ conversation: undefined });
  }, [releaseAudio, router]);

  // Entrar adota a conversa anônima; sair limpa o contexto privado da tela.
  useEffect(() => subscribeAccount(nextProfile => {
    if (lastOwner.current && lastOwner.current !== nextProfile?.id) resetChat();
    lastOwner.current = nextProfile?.id;
    setModeState(nextProfile?.mode ?? 'beginner');
    setProfileChosen(!!nextProfile);
  }), [resetChat, subscribeAccount]);

  const establishmentName = getEstablishment(slug)?.name ?? slug;
  useEffect(() => {
    if (!profile?.id || !profileChosen || !messages.length) return;
    const firstMessage = messages.find(message => message.role === 'user');
    saveConversation({ id: currentId, ownerId: profile.id, slug, establishmentName, title: (firstMessage?.text ?? 'Conversa sobre vinhos').replace(/\s+/g, ' ').slice(0, 70), createdAt: startedAt, updatedAt, mode, criteria, messages, feedback });
  }, [profile?.id, profileChosen, messages, currentId, slug, establishmentName, startedAt, updatedAt, mode, criteria, feedback, saveConversation]);

  const append = (message: Omit<ChatMessage, 'id'>) => {
    setUpdatedAt(new Date().toISOString());
    setMessages(previous => [...previous, { ...message, id: createLocalId() }]);
  };
  const toggleAi = async () => {
    if (busy.current || connectingAi) return;
    if (aiEnabled) { resetChat(); setAiEnabled(false); return; }
    setConnectingAi(true); setError(null);
    const request = new AbortController(); controller.current = request;
    try {
      const health = await checkAi(request.signal);
      if (request.signal.aborted) return;
      if (!health.aiReady) throw new Error('A IA ainda não foi configurada. Adicione sua chave da Anthropic em server/.env.local e reinicie o servidor.');
      resetChat(); setAiEnabled(true);
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : 'Não foi possível conectar à IA.'); }
    finally { setConnectingAi(false); }
  };
  const sendText = async (text: string, useFilters = false) => {
    if (busy.current || connectingAi || !text.trim()) return;
    if (text.length > 2000) { setError('Escreva uma mensagem de até 2.000 caracteres.'); return; }
    busy.current = true; setError(null); setDraft('');
    append({ role: 'user', text: text.trim() });
    if (aiEnabled) {
      const request = new AbortController(); controller.current = request; setPending(true);
      try {
        const data = await askSommelier(slug, text, mode, criteria, messages, request.signal);
        if (request.signal.aborted) return;
        setCriteria(data.criteria);
        setUsage(previous => accumulateUsage(previous, data.usage));
        const question = data.recommendation.followUpQuestion;
        append({ role: 'assistant', text: question && !data.reply.includes(question) ? `${data.reply}\n\n${question}` : data.reply, ...(data.recommendation.items.length ? { recommendation: data.recommendation } : {}) });
      } catch (e) {
        if (!request.signal.aborted) {
          const reason = e instanceof Error ? e.message : 'Não consegui consultar a IA.';
          setError(reason); setDraft(text);
          append({ role: 'assistant', text: `${reason}\nSua mensagem voltou ao campo para você tentar novamente.` });
        }
      } finally { if (!request.signal.aborted) { setPending(false); busy.current = false; } }
      return;
    }
    if (/\b(lembra|relembrar|anterior|antes)\b/i.test(text)) {
      const previous = [...messages].reverse().find(message => message.recommendation?.items.length)?.recommendation;
      append({ role: 'assistant', text: previous ? 'Estas foram as opções daquela recomendação. Os preços abaixo são do momento da mensagem; abra a ficha para consultar os dados atuais.' : 'Ainda não há uma recomendação nesta conversa. Qual tipo de vinho você procura?', recommendation: previous });
      busy.current = false; return;
    }
    const interpreted = useFilters ? { criteria } : interpretMessage(text, criteria);
    if (interpreted.question) { append({ role: 'assistant', text: interpreted.question }); busy.current = false; return; }
    setCriteria(interpreted.criteria);
    controller.current?.abort();
    const request = new AbortController(); controller.current = request; setPending(true);
    try {
      const data = await recommend(slug, interpreted.criteria, 'success', request.signal);
      if (request.signal.aborted) return;
      append({ role: 'assistant', text: data.items.length ? 'Separei estas opções da carta para você. Quer conhecer algum dos rótulos ou ajustar o que procura?' : data.followUpQuestion ?? 'Não encontrei opções com esses critérios. O que você gostaria de ajustar?', recommendation: data });
    } catch (e) {
      if (!request.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Não consegui consultar a carta.'); setDraft(text);
        append({ role: 'assistant', text: 'Não consegui consultar a carta agora. Sua mensagem foi recuperada no campo abaixo para tentar novamente.' });
      }
    } finally { if (!request.signal.aborted) { setPending(false); busy.current = false; } }
  };
  const sendAudio = (audio: VoiceNote) => {
    voiceUris.current.add(audio.uri);
    append({ role: 'user', text: 'Mensagem de voz', audio });
    append({ role: 'assistant', text: 'Seu áudio foi adicionado à conversa local e você pode ouvi-lo aqui. A transcrição ainda não está conectada. Por enquanto, me conte por escrito qual vinho procura.' });
  };
  return { mode, setMode, profileChosen, chooseProfile, criteria, setCriteria, messages, pending, error, draft, setDraft, sendText, sendAudio, resetChat, feedback, setFeedback, conversationVersion, currentId, restoredFromHistory, requestedId, aiEnabled, connectingAi, toggleAi, usage };
}
const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);
export function SessionProvider({ slug, conversationId, children }: PropsWithChildren<{ slug: string; conversationId?: string }>) {
  return <SessionContext value={useSessionState(slug, conversationId)}>{children}</SessionContext>;
}
export function useSession() { const session = use(SessionContext); if (!session) throw new Error('Sessão ausente.'); return session; }
