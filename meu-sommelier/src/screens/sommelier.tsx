import { useRef, useState, type ElementRef } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles as shared } from '@/components/ui-kit';
import { ChatComposer } from '@/components/chat-composer';
import { PilotControls } from '@/components/pilot-controls';
import { useCatalog, CatalogNotice } from '@/features/catalog/context';
import { SettingsScreen } from '@/components/settings-screen';
import { VoiceNote } from '@/components/voice-note';
import { getEstablishment } from '@/features/catalog/mock';
import { money, typeLabels } from '@/features/catalog/types';
import { useSession } from '@/features/session/context';
import { GuestWelcome } from '@/screens/guest-welcome';
import { useAccount } from '@/features/account/context';
import { ConversationHistory, StorageNotice } from '@/components/conversation-history';
import { chatTheme as theme, colors, font, radius, space } from '@/theme';

const suggestions = [
  { number: '01', title: 'Uma escolha para o jantar', prompt: 'Quero um vinho para o jantar', detail: 'Comece pelo que vai à mesa' },
  { number: '02', title: 'Um tinto até R$ 150', prompt: 'Quero um tinto até 150 reais', detail: 'Uma boa escolha, no seu orçamento' },
  { number: '03', title: 'Quero conhecer a carta', prompt: 'Quero conhecer a carta de vinhos', detail: 'Vamos descobrir as opções daqui' },
];

export function SommelierScreen() {
  useCatalog();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const establishment = getEstablishment(slug);
  const { width } = useWindowDimensions();
  const desktop = width >= 1050;
  const compact = width < 600;
  const insets = useSafeAreaInsets();
  const scroll = useRef<ElementRef<typeof ScrollView>>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const session = useSession();
  const account = useAccount();
  const { messages, pending, error, sendText, resetChat, mode, feedback, setFeedback } = session;
  if (!establishment) return <ScrollView contentContainerStyle={shared.page}><Text style={shared.title}>Carta não encontrada</Text><Link href="/" style={shared.link}>Ver estabelecimentos</Link></ScrollView>;
  if (!session.profileChosen) return <GuestWelcome establishmentName={establishment.name} />;

  const sidebar = <ScrollView keyboardShouldPersistTaps="handled" style={[s.sidebar, !desktop && { width: Math.min(320, width - space.xxl) }]} contentContainerStyle={[s.sidebarContent, !desktop && { paddingTop: Math.max(insets.top, space.lg), paddingBottom: Math.max(insets.bottom, space.xl) }]}>
      {!desktop && <View style={s.drawerHeading}><Text style={s.sidebarLabel}>MENU</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar menu lateral" onPress={() => setSidebarOpen(false)} style={s.menuButton}><Text style={s.closeIcon}>×</Text></Pressable></View>}
      <View style={s.brand}><View style={s.monogram}><Text style={s.monogramText}>ms.</Text></View><Text style={s.brandName}>meu sommelier</Text></View>
      <View style={s.place}><Text numberOfLines={1} style={s.placeName}>{establishment.name}</Text><Link href="/" accessibilityLabel="Trocar de estabelecimento" style={s.placeLink}>Trocar ↗</Link></View>
      <Pressable accessibilityRole="button" onPress={() => { resetChat(); setSidebarOpen(false); }} style={s.newChat}><Text style={s.newChatText}>＋  Nova conversa</Text></Pressable>
      <View style={s.historyArea}>{account.profile && <ConversationHistory currentSlug={slug} currentId={session.currentId} onOpen={() => setSidebarOpen(false)} />}</View>
      <View style={s.sidebarFooter}>
      <View style={s.accountSection}>
        <Pressable accessibilityRole="button" accessibilityLabel={account.profile ? `Configurações de ${account.profile.name}` : 'Configurações do seu perfil'} accessibilityHint="Abre as preferências de vinho e as opções da conta" onPress={() => { setSidebarOpen(false); setSettingsOpen(true); }} style={({ pressed }) => [s.accountIdentity, pressed && { backgroundColor: colors.tint }]}>
          <View style={s.accountAvatar}><Text style={s.initial}>{account.profile ? account.profile.name.trim().charAt(0).toUpperCase() : 'm.'}</Text></View>
          <View style={s.accountCopy}><Text numberOfLines={1} style={s.accountName}>{account.profile?.name ?? 'Seu perfil'}</Text><Text style={s.accountCaption}>{account.profile ? 'Demo · histórico local' : 'Visitante'}</Text></View>
          <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no" style={s.accountSettingsIcon}>⚙</Text>
        </Pressable>
      </View>
      <StorageNotice />
      </View>
    </ScrollView>;

  return <View style={s.root}>
    {settingsOpen && <SettingsScreen establishmentName={establishment.name} onClose={() => setSettingsOpen(false)} />}
    {desktop && sidebar}
    <Modal visible={!desktop && sidebarOpen} transparent animationType="none" onRequestClose={() => setSidebarOpen(false)}>
      <View style={s.drawerRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu tocando fora" style={[s.backdrop, { left: Math.min(320, width - space.xxl) }]} onPress={() => setSidebarOpen(false)} />
        {sidebar}
      </View>
    </Modal>
    <KeyboardAvoidingView style={s.main} aria-hidden={!desktop && sidebarOpen} importantForAccessibility={!desktop && sidebarOpen ? 'no-hide-descendants' : 'auto'} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 56}>
      <View style={[s.header, compact && s.headerCompact]}>
        <View style={s.headerIdentity}>{!desktop ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu lateral" aria-expanded={sidebarOpen} onPress={() => setSidebarOpen(true)} style={s.menuButton}><View style={s.menuGlyph}><View style={s.menuLine} /><View style={s.menuLine} /><View style={s.menuLine} /></View></Pressable> : <View style={s.tinyMonogram}><Text style={s.tinyMonogramText}>ms.</Text></View>}<View style={s.headerCopy}><Text style={s.headerTitle}>Seu sommelier pessoal</Text><Text style={s.headerSubtitle}>{establishment.name} · {establishment.demo === false ? 'carta do estabelecimento' : 'carta de demonstração'}</Text></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Nova conversa" disabled={pending} onPress={resetChat} style={s.reset}><Text style={s.resetText}>{compact ? '＋ Nova' : '＋ Nova conversa'}</Text></Pressable>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" style={s.scroll} contentContainerStyle={[s.conversation, !messages.length && s.emptyConversation, compact && s.compactContent]} onContentSizeChange={() => { if (messages.length) scroll.current?.scrollToEnd({ animated: false }); }}>
        {error && <Text accessibilityRole="alert" style={shared.error}>{error}</Text>}
        {!messages.length ? <View style={[s.welcome, compact && s.welcomeCompact]}>
          <View style={s.welcomeIcon}><Text style={s.welcomeIconText}>ms.</Text></View>
          <Text style={s.eyebrow}>UM BOM VINHO COMEÇA COM UMA BOA CONVERSA</Text>
          <Text accessibilityRole="header" style={[s.heading, compact && s.headingCompact]}>Qual é o vinho{ '\n' }do seu momento?</Text>
          <Text style={s.intro}>Me conte o que vai comer, o que você gosta{desktop ? '\n' : ' '}ou simplesmente como foi o seu dia.</Text>
          <View style={[s.suggestions, compact && s.suggestionsCompact]}>{suggestions.map(item => <Pressable key={item.number} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => void sendText(item.prompt)} style={({ pressed }) => [s.suggestion, compact && s.suggestionCompact, { backgroundColor: pressed ? colors.tint : colors.surface }]}>
            <Text style={s.suggestionNumber}>{item.number}</Text><View style={s.suggestionText}><Text style={s.suggestionTitle}>{item.title}</Text></View><Text style={s.suggestionArrow}>↗</Text>
          </Pressable>)}</View>
        </View> : <View style={s.messages}>
          <View style={s.chatDate}><Text style={s.chatDateText}>SUA CONVERSA · {establishment.name.toUpperCase()}</Text></View>
          {session.restoredFromHistory && <View style={shared.notice}><Text style={shared.caption}>Conversa retomada. Os preços nas mensagens são do momento de cada recomendação; abra a ficha para consultar a carta atual.</Text></View>}
          {messages.map(message => <View key={message.id} style={[s.messageRow, message.role === 'user' && s.userRow]}>
            {message.role === 'assistant' && <View style={s.avatar}><Text style={s.avatarText}>ms.</Text></View>}
            <View style={[s.messageContent, message.role === 'user' && s.userContent]}>
              <Text style={s.messageAuthor}>{message.role === 'assistant' ? 'Meu Sommelier' : 'Você'}</Text>
              <View style={message.role === 'user' ? s.userBubble : s.assistantBubble}>{message.audio ? <VoiceNote note={message.audio} /> : <Text selectable style={s.messageText}>{message.audioUnavailable ? 'Mensagem de voz · áudio não disponível no histórico salvo.' : message.text}</Text>}</View>
              {message.recommendation && <View style={s.recommendations}>
                <Text style={s.criteria}>Nesta busca: {message.recommendation.appliedFilters.types.length ? message.recommendation.appliedFilters.types.map(type => typeLabels[type]).join(' ou ') : 'todos os tipos'} · {message.recommendation.appliedFilters.maxPriceCents === null ? 'sem limite de preço' : `até ${money(message.recommendation.appliedFilters.maxPriceCents)}`}{message.recommendation.appliedFilters.text ? ` · ${message.recommendation.appliedFilters.text}` : ''}</Text>
                {message.recommendation.items.map((wine, index) => <View key={wine.wineId} style={s.wineCard}>
                  <View accessibilityElementsHidden style={s.wineVisual}><View style={s.bottleNeck} /><View style={s.bottleBody}><Text style={s.bottleLabel}>ms.</Text></View></View>
                  <View style={s.wineInfo}><Text style={s.wineType}>{typeLabels[wine.type].toUpperCase()} · OPÇÃO {index + 1}</Text><Text style={s.wineName}>{wine.name}</Text><Text style={s.wineOrigin}>{wine.reason}</Text><Text style={s.wineOrigin}>{wine.grapes.join(', ')} · {wine.country ?? 'Origem não informada'}</Text><View style={s.wineFooter}><Text selectable style={s.winePrice}>{money(wine.priceCents)}</Text><Link href={{ pathname: '/e/[slug]/wines/[id]', params: { slug, id: wine.wineId, recommendedPriceCents: String(wine.priceCents), conversation: session.requestedId } }} accessibilityLabel={`Ver vinho: ${wine.name}`} style={s.wineDetail}>Ver vinho ↗</Link></View>{mode === 'advanced' && <Text style={s.wineOrigin}>Corpo {wine.body ?? 'não informado'}{wine.body ? '/5' : ''} · Acidez {wine.acidity ?? 'não informada'}{wine.acidity ? '/5' : ''}</Text>}</View>
                </View>)}
                {message.recommendation.items.length > 0 && <View style={s.feedback}>{feedback[message.id] !== undefined ? <Text accessibilityLiveRegion="polite" style={s.criteria}>Obrigada! Sua avaliação ficou registrada nesta conversa.</Text> : <><Text style={s.criteria}>Ajudou a escolher?</Text><Pressable accessibilityRole="button" accessibilityLabel="Sugestões úteis" onPress={() => setFeedback({ ...feedback, [message.id]: true })} style={s.feedbackButton}><Text style={s.feedbackText}>Sim</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Sugestões não úteis" onPress={() => setFeedback({ ...feedback, [message.id]: false })} style={s.feedbackButton}><Text style={s.feedbackText}>Ainda não</Text></Pressable></>}</View>}
              </View>}
            </View>
          </View>)}
          {pending && <View accessibilityLiveRegion="polite" style={s.pending}><ActivityIndicator size="small" color={colors.accent} /><Text style={s.criteria}>Consultando a carta para você…</Text></View>}
          {!account.profile && messages.length > 1 && <View style={s.savePrompt}><Text style={s.criteria}>Quer relembrar esse vinho depois?</Text><Pressable accessibilityRole="button" accessibilityLabel="Guardar esta conversa" onPress={() => account.openAccount(mode)} style={s.accountAction}><Text style={s.subtleLink}>Entre ou crie sua conta para guardar esta conversa ↗</Text></Pressable></View>}
        </View>}
      </ScrollView>
      <View style={[s.footer, compact && s.compactFooter, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={s.footerInner}>
          <CatalogNotice />
          <PilotControls demo={establishment.demo !== false} />
          <ChatComposer key={session.conversationVersion} />
          <Text style={s.disclaimer}>{establishment.demo === false ? 'Carta do estabelecimento.' : 'Demonstração com dados fictícios.'}{account.profile ? ' Conta e histórico locais.' : ''} Áudio sem transcrição. 18+ · Beba com moderação.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.paper }, main: { flex: 1, minWidth: 0 },
  sidebar: { width: theme.sidebarWidth, height: '100%', flexGrow: 0, flexShrink: 0, backgroundColor: theme.side, borderRightWidth: 1, borderColor: theme.hairline },
  sidebarContent: { flexGrow: 1, padding: space.lg, paddingTop: space.xl, gap: space.lg },
  historyArea: { flexGrow: 1, paddingTop: space.sm },
  sidebarFooter: { borderTopWidth: 1, borderColor: colors.border, paddingTop: space.sm, gap: space.sm },
  place: { flexDirection: 'row', alignItems: 'center', gap: space.sm }, placeName: { flex: 1, color: colors.muted, fontSize: font.caption }, placeLink: { color: colors.accent, fontSize: 11, paddingVertical: space.md },
  accountSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }, accountAction: { minHeight: 44, justifyContent: 'center' },
  accountIdentity: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: space.xs, borderRadius: radius.sm }, accountSettingsIcon: { color: colors.accent, fontSize: 22, lineHeight: 28 }, accountAvatar: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.accent, fontSize: font.caption, fontWeight: '600' }, accountCopy: { flex: 1, gap: 2 }, accountName: { color: colors.ink, fontSize: font.caption, fontWeight: '600' }, accountCaption: { color: colors.muted, fontSize: 10 },
  savePrompt: { borderTopWidth: 1, borderColor: theme.hairline, paddingTop: space.lg, gap: space.xs },
  drawerRoot: { flex: 1, flexDirection: 'row' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(48, 39, 40, 0.35)' },
  drawerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuGlyph: { width: 20, gap: space.xs },
  menuLine: { height: 1.5, backgroundColor: colors.accent, borderRadius: radius.pill },
  closeIcon: { color: colors.accent, fontSize: font.title },
  headerCopy: { flexShrink: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm }, monogram: { width: 60, height: 44, justifyContent: 'center' },
  monogramText: { color: colors.accent, fontSize: 34, fontFamily: theme.headingFamily, fontStyle: 'italic' },
  brandName: { color: theme.wineDark, fontSize: 18, fontWeight: '600', letterSpacing: -0.5, flexShrink: 1 },
  newChat: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, minHeight: 44, paddingHorizontal: space.lg, justifyContent: 'center' }, newChatText: { color: colors.accent, fontSize: font.caption, fontWeight: '600' },
  sidebarLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
  subtleLink: { fontSize: font.caption, color: colors.accent, paddingVertical: space.sm },
  header: { paddingHorizontal: space.xxl, paddingVertical: space.lg, borderBottomWidth: 1, borderColor: theme.hairline, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }, headerCompact: { paddingHorizontal: space.lg, paddingVertical: space.md },
  headerIdentity: { flexDirection: 'row', gap: space.md, alignItems: 'center', flexShrink: 1 }, tinyMonogram: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center' }, tinyMonogramText: { color: colors.accent, fontSize: font.heading, fontFamily: theme.headingFamily, fontStyle: 'italic' },
  headerTitle: { fontSize: font.caption, color: colors.ink, fontWeight: '600' }, headerSubtitle: { fontSize: 11, color: colors.muted, paddingTop: space.xs }, reset: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm }, resetText: { color: colors.accent, fontSize: font.caption },
  scroll: { flex: 1 }, conversation: { flexGrow: 1, width: '100%', maxWidth: theme.conversationWidth, alignSelf: 'center', padding: space.xl }, emptyConversation: { justifyContent: 'center', paddingVertical: space.lg }, compactContent: { paddingHorizontal: space.xl, paddingVertical: space.md },
  welcomeCompact: { gap: space.md },
  welcome: { gap: space.lg, alignItems: 'center' }, welcomeIcon: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }, welcomeIconText: { fontFamily: theme.headingFamily, fontSize: 30, fontStyle: 'italic', color: colors.accent },
  eyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 2, textAlign: 'center', lineHeight: 16 }, heading: { fontFamily: theme.headingFamily, fontSize: theme.headingSize, lineHeight: theme.lineHeight, color: theme.wineDark, textAlign: 'center' }, headingCompact: { fontSize: theme.headingCompact, lineHeight: theme.compactLineHeight },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 480 }, suggestions: { flexDirection: 'row', gap: space.md, width: '100%', marginTop: space.sm }, suggestionsCompact: { flexDirection: 'column' },
  suggestion: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 76, borderWidth: 1, borderColor: theme.hairline, borderRadius: radius.md, padding: space.lg, gap: space.md }, suggestionCompact: { minHeight: 52, paddingVertical: space.md }, suggestionNumber: { fontSize: 11, color: colors.accent, letterSpacing: 1 }, suggestionText: { flex: 1, gap: space.sm }, suggestionTitle: { fontSize: font.caption, color: colors.ink, fontWeight: '600', lineHeight: 20 }, suggestionArrow: { color: colors.accent, fontSize: font.body },
  messages: { gap: space.xxl }, chatDate: { alignItems: 'center', paddingBottom: space.sm }, chatDateText: { color: colors.muted, fontSize: 9, letterSpacing: 1.5 }, messageRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }, userRow: { justifyContent: 'flex-end' }, avatar: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.accent, fontFamily: theme.headingFamily, fontSize: 18, fontStyle: 'italic' },
  messageContent: { flex: 1, minWidth: 0, gap: space.sm }, userContent: { flex: 0, maxWidth: '90%', minWidth: 160, alignItems: 'flex-end' }, messageAuthor: { color: colors.muted, fontSize: 11 }, assistantBubble: { paddingVertical: space.xs }, userBubble: { backgroundColor: colors.tint, padding: space.lg, borderRadius: radius.md, borderTopRightRadius: space.xs, width: '100%' }, messageText: { fontSize: font.body, color: colors.ink, lineHeight: 26 },
  recommendations: { gap: space.md, paddingTop: space.sm }, criteria: { fontSize: 11, lineHeight: 18, color: colors.muted }, wineCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: theme.hairline, borderRadius: radius.md, padding: space.lg }, wineVisual: { width: 42, height: 88, backgroundColor: theme.side, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, bottleNeck: { width: 8, height: 14, backgroundColor: colors.accent, borderTopLeftRadius: 2, borderTopRightRadius: 2 }, bottleBody: { width: 20, height: 42, backgroundColor: colors.accent, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }, bottleLabel: { color: colors.paper, fontFamily: theme.headingFamily, fontSize: 12, fontStyle: 'italic' },
  wineInfo: { flex: 1, gap: space.sm }, wineType: { color: colors.accent, fontSize: 9, letterSpacing: 1 }, wineName: { fontSize: font.body, fontWeight: '600', color: colors.ink }, wineOrigin: { color: colors.muted, fontSize: 11, lineHeight: 17 }, wineFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }, winePrice: { color: colors.accent, fontSize: font.body, fontWeight: '600' }, wineDetail: { color: colors.accent, fontSize: 11 },
  feedback: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }, feedbackButton: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center' }, feedbackText: { fontSize: 11, color: colors.accent }, pending: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { borderTopWidth: 1, borderColor: theme.hairline, paddingHorizontal: space.xxl, paddingTop: space.md }, compactFooter: { paddingHorizontal: space.lg }, footerInner: { width: '100%', maxWidth: theme.conversationWidth - space.xxl * 2, alignSelf: 'center', gap: space.sm }, disclaimer: { color: colors.muted, fontSize: 9, textAlign: 'center', lineHeight: 16 }, filters: { paddingVertical: space.lg, gap: space.md },
});
