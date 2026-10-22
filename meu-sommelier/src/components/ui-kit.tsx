import type { PropsWithChildren } from 'react';
import { Button, Host } from '@expo/ui';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '@/theme';
export function Action({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Host matchContents colorScheme="light" seedColor={colors.accent}><Button label={title} onPress={onPress} disabled={disabled} variant={secondary ? 'outlined' : 'filled'} style={{ paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.sm }} /></Host>;
}
export function Choice({ title, selected, onPress, multiple = false }: { title: string; selected: boolean; onPress: () => void; multiple?: boolean }) {
  return <Pressable accessibilityLabel={title} accessibilityRole={multiple ? 'checkbox' : 'radio'} aria-checked={selected} accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, { opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.choiceText, selected && { color: colors.surface }]}>{multiple && selected ? '✓ ' : ''}{title}</Text></Pressable>;
}
export function Notice({ children }: PropsWithChildren) { return <View style={styles.notice}><Text selectable style={styles.caption}>{children}</Text></View>; }
export function Loading({ message }: { message: string }) { return <View accessibilityRole="progressbar" accessibilityLabel={message} style={styles.panel}><ActivityIndicator color={colors.accent} /><Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text></View>; }
export const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: space.xl, paddingBottom: space.xxxl, gap: space.xl },
  eyebrow: { fontSize: font.caption, letterSpacing: 2, color: colors.accent, fontWeight: '700' },
  hero: { fontSize: font.hero, lineHeight: 48, color: colors.ink, fontWeight: '600', maxWidth: 680 },
  title: { fontSize: font.title, color: colors.ink, fontWeight: '600' },
  sectionTitle: { fontSize: font.heading, color: colors.ink, fontWeight: '600' },
  body: { fontSize: font.body, lineHeight: 25, color: colors.ink },
  caption: { fontSize: font.caption, lineHeight: 21, color: colors.muted },
  label: { fontSize: font.body, fontWeight: '600', color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  section: { gap: space.md },
  panel: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xl, gap: space.lg, borderWidth: 1, borderColor: colors.border },
  notice: { padding: space.lg, backgroundColor: colors.tint, borderRadius: radius.sm },
  action: { minHeight: 48, padding: space.md, paddingHorizontal: space.xl, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  secondaryAction: { backgroundColor: colors.tint },
  actionText: { fontSize: font.body, color: colors.surface, fontWeight: '600', textAlign: 'center' },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  choiceSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  choiceText: { fontSize: font.body, color: colors.ink },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.ink, borderRadius: radius.sm, minHeight: 48, padding: space.md, fontSize: font.body },
  link: { color: colors.accent, fontSize: font.body, paddingVertical: space.md, textDecorationLine: 'underline' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.lg, gap: space.sm },
  price: { fontSize: font.heading, fontWeight: '700', color: colors.accent, fontVariant: ['tabular-nums'] },
  error: { color: colors.error, fontSize: font.body, lineHeight: 25 },
});
