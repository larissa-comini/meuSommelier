import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/features/session/context';
import { useAccount } from '@/features/account/context';
import { chatTheme as theme, colors, font, radius, space } from '@/theme';

export function GuestWelcome({ establishmentName }: { establishmentName: string }) {
  const { chooseProfile } = useSession();
  const { openAccount } = useAccount();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 600;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={s.screen} contentContainerStyle={[s.page, { paddingTop: Math.max(insets.top, compact ? space.lg : space.xxl), paddingBottom: Math.max(insets.bottom, compact ? space.lg : space.xxl) }]}>
    <View style={[s.content, compact && s.compactContent]}>
      <Text style={s.logo}>ms.</Text>
      <Text style={s.eyebrow}>BEM-VINDO À {establishmentName.toUpperCase()}</Text>
      <Text accessibilityRole="header" style={[s.title, compact && s.compactTitle]}>Quanto você conhece{compact ? ' ' : '\n'}de vinhos?</Text>
      <Text style={s.intro}>Me conta para eu adaptar nossa conversa ao seu jeito.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Entrar ou criar conta" onPress={() => openAccount()} style={s.login}><Text style={s.loginText}>Já tem conta? Entrar · Criar conta</Text></Pressable>
      <View style={[s.options, compact && s.stacked]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Estou começando" onPress={() => chooseProfile('beginner')} style={({ pressed }) => [s.option, { backgroundColor: pressed ? colors.tint : colors.surface }]}>
          <Text style={s.optionNumber}>01</Text><Text style={s.optionTitle}>Estou começando</Text><Text style={s.optionDescription}>Quero uma ajuda para escolher, com dicas simples e sem termos complicados.</Text><Text style={s.arrow}>Vamos descobrir juntos ↗</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Já conheço vinhos" onPress={() => chooseProfile('advanced')} style={({ pressed }) => [s.option, { backgroundColor: pressed ? colors.tint : colors.surface }]}>
          <Text style={s.optionNumber}>02</Text><Text style={s.optionTitle}>Já conheço vinhos</Text><Text style={s.optionDescription}>Gosto de explorar uvas, origens e os detalhes de cada rótulo.</Text><Text style={s.arrow}>Vamos aos detalhes ↗</Text>
        </Pressable>
      </View>
      <Text style={s.note}>Você pode mudar essa escolha nas preferências a qualquer momento.</Text>
      <Text style={s.note}>Escolha um perfil para continuar sem cadastro.</Text>
      <Text style={s.disclaimer}>18+ · Beba com moderação.</Text>
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  content: { width: '100%', maxWidth: 660, alignItems: 'center', gap: space.xl },
  compactContent: { gap: space.lg },
  logo: { fontFamily: theme.headingFamily, fontStyle: 'italic', color: colors.accent, fontSize: font.hero },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: colors.accent, textAlign: 'center' },
  title: { fontFamily: theme.headingFamily, fontSize: theme.headingSize, lineHeight: theme.lineHeight, color: theme.wineDark, textAlign: 'center' },
  compactTitle: { fontSize: theme.headingCompact, lineHeight: theme.compactLineHeight },
  intro: { fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center' },
  options: { flexDirection: 'row', gap: space.lg, width: '100%' }, stacked: { flexDirection: 'column' },
  option: { flex: 1, borderWidth: 1, borderColor: theme.hairline, borderRadius: radius.md, padding: space.xl, gap: space.md },
  optionNumber: { color: colors.accent, fontSize: 11, letterSpacing: 1 },
  optionTitle: { color: colors.ink, fontSize: font.heading, fontWeight: '600' },
  optionDescription: { color: colors.muted, fontSize: font.caption, lineHeight: 22 },
  arrow: { color: colors.accent, fontSize: font.caption, paddingTop: space.sm, marginTop: 'auto' },
  note: { color: colors.muted, fontSize: font.caption, lineHeight: 20, textAlign: 'center' },
  disclaimer: { color: colors.muted, fontSize: 10 },
  login: { minHeight: 44, justifyContent: 'center' }, loginText: { color: colors.accent, fontSize: font.caption, textDecorationLine: 'underline' },
});
