import { useState } from 'react';
import { FieldGroup, Host } from '@expo/ui';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '@/features/account/context';
import { useSession } from '@/features/session/context';
import { money, typeLabels, type WineType } from '@/features/catalog/types';
import { Action, Choice, styles as shared } from './ui-kit';
import { chatTheme, colors, font, radius, space } from '@/theme';

export function SettingsScreen({ onClose, establishmentName }: { onClose: () => void; establishmentName: string }) {
  const session = useSession();
  const account = useAccount();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(session.mode);
  const [criteria, setCriteria] = useState({ ...session.criteria });
  const save = () => { session.setMode(mode); session.setCriteria(criteria); onClose(); };
  return <Modal visible presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}><View style={s.headerInner}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar à conversa" onPress={onClose} style={s.back}><Text style={s.backText}>← Voltar</Text></Pressable>
        <Text style={s.brand}>ms.</Text>
      </View></View>
      <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Configurações</Text><Text style={shared.caption}>Deixe a conversa do seu jeito.</Text></View>
      <View style={s.content}><Host style={{ flex: 1 }} colorScheme="light" seedColor={colors.accent}>
        <FieldGroup style={{ backgroundColor: colors.paper }}>
          <FieldGroup.Section title="Seu perfil">
            <View style={s.identity}><View style={s.avatar}><Text style={s.initial}>{account.profile?.name.trim().charAt(0).toUpperCase() ?? 'ms.'}</Text></View><View style={s.copy}><Text style={s.name}>{account.profile?.name ?? 'Visitante'}</Text><Text style={shared.caption}>{account.profile ? 'Perfil de demonstração' : 'Conversando sem conta'}</Text></View></View>
            <View style={s.field}><Text style={s.label}>Sua experiência com vinhos</Text><View style={shared.row}><Choice title="Estou começando" selected={mode === 'beginner'} onPress={() => setMode('beginner')} /><Choice title="Já conheço vinhos" selected={mode === 'advanced'} onPress={() => setMode('advanced')} /></View><Text style={shared.caption}>O sommelier adapta as explicações ao seu nível.</Text></View>
          </FieldGroup.Section>
          <FieldGroup.Section title="Preferências de vinho">
            <View style={s.field}><Text style={s.label}>Tipos de vinho</Text><Text style={shared.caption}>Pode escolher mais de um. Toque novamente para desmarcar.</Text><View style={shared.row}><Choice multiple title="Sem preferência" selected={!criteria.types.length} onPress={() => setCriteria({ ...criteria, types: [] })} />{(Object.keys(typeLabels) as WineType[]).map(type => <Choice multiple key={type} title={typeLabels[type]} selected={criteria.types.includes(type)} onPress={() => setCriteria(previous => ({ ...previous, types: previous.types.includes(type) ? previous.types.filter(item => item !== type) : [...previous.types, type] }))} />)}</View></View>
            <View style={s.field}><Text style={s.label}>Orçamento por garrafa</Text><View style={shared.row}>{[null, 10000, 15000, 20000].map(max => <Choice key={max ?? 'any'} title={max === null ? 'Sem limite' : `Até ${money(max)}`} selected={criteria.maxPriceCents === max} onPress={() => setCriteria({ ...criteria, maxPriceCents: max })} />)}</View></View>
            <FieldGroup.SectionFooter><Text style={shared.caption}>Essas preferências valem para a conversa em {establishmentName}. Você também pode ajustá-las pelo chat.</Text></FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title="Conta e histórico">
            <View style={s.field}><Text style={s.label}>{account.profile ? 'Histórico neste aparelho' : 'Suas descobertas, sempre por perto'}</Text><Text style={shared.caption}>{account.profile ? 'O perfil e as conversas da demonstração ficam somente neste navegador ou aparelho.' : 'Entre ou crie sua conta para guardar conversas. O acesso real ainda está em preparação.'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={account.profile ? 'Sair da conta' : 'Entrar ou criar conta'} onPress={() => { onClose(); if (account.profile) account.signOut(); else account.openAccount(session.mode); }} style={s.accountAction}><Text style={s.accountText}>{account.profile ? 'Sair da conta' : 'Entrar ou criar conta ↗'}</Text></Pressable>
          </FieldGroup.Section>
        </FieldGroup>
      </Host></View>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}><View style={s.footerInner}><Text style={[shared.caption, s.footerHint]}>As alterações são aplicadas ao salvar.</Text><Action title="Salvar preferências" disabled={session.pending} onPress={save} /></View></View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, header: { borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg }, headerInner: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 },
  back: { minHeight: 44, justifyContent: 'center', paddingRight: space.lg }, backText: { color: colors.accent, fontSize: font.caption, fontWeight: '600' }, brand: { fontFamily: chatTheme.headingFamily, fontSize: 30, fontStyle: 'italic', color: colors.accent },
  heading: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.sm, gap: space.xs }, title: { fontFamily: chatTheme.headingFamily, fontSize: font.title, color: chatTheme.wineDark },
  content: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', minHeight: 0 },
  field: { paddingVertical: space.lg, gap: space.md }, label: { color: colors.ink, fontWeight: '600', fontSize: font.caption },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg }, avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: font.heading, color: colors.accent }, copy: { flex: 1, gap: space.xs }, name: { color: colors.ink, fontSize: font.body, fontWeight: '600' },
  accountAction: { minHeight: 52, justifyContent: 'center' }, accountText: { color: colors.accent, fontSize: font.caption, fontWeight: '600' },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderColor: colors.border }, footerInner: { width: '100%', maxWidth: 728, alignSelf: 'center', gap: space.sm }, footerHint: { textAlign: 'center' },
});
