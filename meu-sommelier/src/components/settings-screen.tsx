import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '@/features/account/context';
import { useSession } from '@/features/session/context';
import { money, typeLabels, type WineType } from '@/features/catalog/types';
import { Action, Choice, styles as shared } from './ui-kit';
import { AdminSelect as PreferenceSelect } from './admin-ui';
import { chatTheme, colors, font, space } from '@/theme';

export function SettingsScreen({ onClose, establishmentName }: { onClose: () => void; establishmentName: string }) {
  const session = useSession();
  const account = useAccount();
  const insets = useSafeAreaInsets();
  const [initial] = useState(() => ({ mode: session.mode, criteria: { ...session.criteria, types: [...session.criteria.types] } }));
  const [mode, setMode] = useState(initial.mode);
  const [criteria, setCriteria] = useState(initial.criteria);
  const [showAccount, setShowAccount] = useState(false);
  const typesChanged = [...criteria.types].sort().join(',') !== [...initial.criteria.types].sort().join(',');
  const budgetChanged = criteria.maxPriceCents !== initial.criteria.maxPriceCents;
  const dirty = mode !== initial.mode || typesChanged || budgetChanged;
  const budgets = [null, 10000, 15000, 20000];
  if (!budgets.includes(criteria.maxPriceCents)) budgets.push(criteria.maxPriceCents);
  const save = () => {
    if (!dirty || session.pending) return;
    if (mode !== initial.mode) session.setMode(mode);
    // Preserve search text and any chat updates to preferences the user did not edit.
    session.setCriteria(previous => ({ ...previous, types: typesChanged ? [...criteria.types] : previous.types, maxPriceCents: budgetChanged ? criteria.maxPriceCents : previous.maxPriceCents }));
    onClose();
  };
  const undo = () => { setMode(initial.mode); setCriteria({ ...initial.criteria, types: [...initial.criteria.types] }); };

  return <Modal visible presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}><View style={s.headerInner}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar à conversa" onPress={onClose} style={s.back}><Text style={s.link}>← Conversa</Text></Pressable>
        <Text style={s.brand}>ms.</Text>
      </View></View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Preferências do chat</Text><Text style={shared.caption}>{establishmentName}</Text></View>
        <View style={s.section}>
          <Text style={s.label}>Vinhos que você gosta</Text>
          <Text style={shared.caption}>Pode escolher mais de um.</Text>
          <View style={shared.row}>
            <Choice multiple title="Sem preferência" selected={!criteria.types.length} onPress={() => setCriteria(previous => ({ ...previous, types: [] }))} />
            {(Object.keys(typeLabels) as WineType[]).map(type => <Choice multiple key={type} title={typeLabels[type]} selected={criteria.types.includes(type)} onPress={() => setCriteria(previous => ({ ...previous, types: previous.types.includes(type) ? previous.types.filter(item => item !== type) : [...previous.types, type] }))} />)}
          </View>
        </View>
        <View style={s.section}>
          <PreferenceSelect label="Orçamento por garrafa" value={criteria.maxPriceCents === null ? 'any' : String(criteria.maxPriceCents)} options={budgets.map(max => ({ value: max === null ? 'any' : String(max), label: max === null ? 'Sem limite' : `Até ${money(max)}` }))} onChange={value => setCriteria(previous => ({ ...previous, maxPriceCents: value === 'any' ? null : Number(value) }))} />
        </View>
        <View style={s.section}>
          <Text style={s.label}>Seu nível com vinhos</Text>
          <View style={shared.row}><Choice title="Iniciante" selected={mode === 'beginner'} onPress={() => setMode('beginner')} /><Choice title="Expert" selected={mode === 'advanced'} onPress={() => setMode('advanced')} /></View>
        </View>
        <View style={s.accountSection}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAccount }} onPress={() => setShowAccount(value => !value)} style={s.accountHeading}><Text style={s.link}>Conta e histórico</Text><Text accessible={false} style={s.link}>{showAccount ? '−' : '+'}</Text></Pressable>
          {showAccount && <View style={s.accountContent}>
            <Text style={s.label}>{account.profile?.name ?? 'Visitante'}</Text>
            <Text style={shared.caption}>{account.profile ? 'Perfil de demonstração. O histórico fica neste navegador ou aparelho.' : 'Você pode conversar sem conta. O perfil de demonstração guarda seu histórico neste aparelho.'}</Text>
            <Pressable accessibilityRole="button" onPress={() => { onClose(); if (account.profile) account.signOut(); else account.openAccount(session.mode); }} style={s.back}><Text style={s.link}>{account.profile ? 'Sair da conta' : 'Criar perfil de demonstração'}</Text></Pressable>
          </View>}
        </View>
      </ScrollView>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View style={s.footerInner}>
          <View style={s.footerCopy}>{dirty && <Pressable accessibilityRole="button" accessibilityLabel="Desfazer alterações nas preferências" onPress={undo} style={s.back}><Text style={s.link}>Desfazer</Text></Pressable>}</View>
          <Action title="Salvar preferências" disabled={session.pending || !dirty} onPress={save} />
        </View>
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg },
  headerInner: { width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 },
  back: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.accent, fontSize: font.caption, fontWeight: '600' },
  brand: { fontFamily: chatTheme.headingFamily, fontSize: font.title, fontStyle: 'italic', color: colors.accent },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 672, alignSelf: 'center', padding: space.lg, paddingTop: space.xl, gap: space.xl },
  heading: { gap: space.xs },
  title: { fontFamily: chatTheme.headingFamily, fontSize: font.title, color: chatTheme.wineDark },
  section: { gap: space.sm },
  label: { color: colors.ink, fontWeight: '600', fontSize: font.body },
  accountSection: { borderTopWidth: 1, borderColor: colors.border },
  accountHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountContent: { gap: space.sm, paddingVertical: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderColor: colors.border },
  footerInner: { width: '100%', maxWidth: 640, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  footerCopy: { flex: 1 },
});
