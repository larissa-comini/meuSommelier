import { useState } from 'react';
import { Link } from 'expo-router';
import { Collapsible, Host } from '@expo/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccount } from '@/features/account/context';
import type { SavedConversation } from '@/features/account/history';
import { colors, font, radius, space } from '@/theme';

export function ConversationHistory({ currentSlug, currentId, onOpen }: { currentSlug?: string; currentId?: string; onOpen?: () => void }) {
  const { profile, conversations } = useAccount();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!profile) return null;
  const groups = new Map<string, SavedConversation[]>();
  conversations.forEach(conversation => groups.set(conversation.slug, [...(groups.get(conversation.slug) ?? []), conversation]));
  return <View style={s.section}>
    <Text style={s.label}>SUAS CONVERSAS</Text>
    {!groups.size && <Text style={s.empty}>Nenhuma conversa salva ainda.</Text>}
    {[...groups].map(([slug, items]) => <Host key={slug} matchContents={{ vertical: true }} style={{ width: '100%' }} seedColor={colors.accent} colorScheme="light"><Collapsible label={`${items[0].establishmentName} (${items.length})`} isOpen={expanded[slug] ?? (!currentSlug || currentSlug === slug)} onOpenChange={value => setExpanded(previous => ({ ...previous, [slug]: value }))} labelStyle={{ color: colors.accent, fontSize: font.caption }}>
      <View style={s.items}>{items.map(item => <View key={item.id} style={[s.item, item.id === currentId && s.selected]}><Link href={{ pathname: '/e/[slug]', params: { slug: item.slug, conversation: item.id } }} accessibilityLabel={`Abrir conversa: ${item.title} em ${item.establishmentName}`} aria-current={item.id === currentId ? 'page' : undefined} onPress={onOpen} style={s.historyLink}>{item.title}</Link><Text style={s.date}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.updatedAt))}</Text></View>)}</View>
    </Collapsible></Host>)}
  </View>;
}
export function StorageNotice() {
  const { storageError, retrySave, canRetrySave } = useAccount();
  if (!storageError) return null;
  return <View style={s.warning}><Text accessibilityRole="alert" style={s.empty}>{storageError}</Text>{canRetrySave && <Pressable accessibilityRole="button" onPress={() => void retrySave()} style={s.retry}><Text style={s.title}>Tentar salvar novamente</Text></Pressable>}</View>;
}
const s = StyleSheet.create({
  section: { gap: space.sm }, label: { fontSize: 10, letterSpacing: 1.5, color: colors.muted }, empty: { color: colors.muted, fontSize: font.caption, lineHeight: 20 },
  items: { gap: space.xs }, item: { borderRadius: radius.sm, padding: space.sm, gap: space.xs, minHeight: 48 }, selected: { backgroundColor: colors.tint },
  title: { color: colors.accent, fontSize: font.caption, lineHeight: 20 }, date: { color: colors.muted, fontSize: 10 },
  historyLink: { color: colors.accent, fontSize: font.caption, lineHeight: 20, paddingVertical: space.md },
  warning: { backgroundColor: colors.tint, borderRadius: radius.sm, padding: space.md, gap: space.sm }, retry: { minHeight: 44, justifyContent: 'center' },
});
