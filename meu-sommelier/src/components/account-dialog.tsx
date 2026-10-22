import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '@/features/account/context';
import { Action, Choice, styles as shared } from './ui-kit';
import type { Mode } from '@/features/catalog/types';
import { chatTheme as theme, colors, font, radius, space } from '@/theme';

type Page = 'login' | 'register' | 'recovery' | 'demo';
type Field = 'name' | 'email' | 'password' | 'confirmation';
export function AccountDialog() {
  const account = useAccount();
  return account.accountOpen ? <AccountDialogForm /> : null;
}
function AccountDialogForm() {
  const account = useAccount();
  const [page, setPage] = useState<Page>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [demoName, setDemoName] = useState(account.demoName);
  const [mode, setMode] = useState<Mode>('beginner');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState('');
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmationRef = useRef<ComponentRef<typeof TextInput>>(null);
  const insets = useSafeAreaInsets();
  const register = page === 'register';
  const recovery = page === 'recovery';
  const demo = page === 'demo';
  const changePage = (next: Page) => {
    setPage(next); setErrors({}); setMessage(''); setPassword(''); setConfirmation(''); setVisible(false);
  };
  const clearError = (field: Field) => { setErrors(previous => ({ ...previous, [field]: undefined })); setMessage(''); };
  const submit = () => {
    const next: Partial<Record<Field, string>> = {};
    if (register && (name.trim().length < 2 || name.trim().length > 50)) next.name = 'Informe seu nome, entre 2 e 50 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Digite um e-mail válido, como voce@exemplo.com.';
    if (!recovery && !password) next.password = 'Digite sua senha.';
    else if (register && (password.length < 8 || password.length > 128)) next.password = 'Use entre 8 e 128 caracteres.';
    if (register && confirmation !== password) next.confirmation = 'As senhas precisam ser iguais.';
    setErrors(next); setMessage('');
    const first = (['name', 'email', 'password', 'confirmation'] as const).find(field => next[field]);
    if (first) { ({ name: nameRef, email: emailRef, password: passwordRef, confirmation: confirmationRef })[first].current?.focus(); return; }
    setMessage(recovery ? 'O envio do link ainda não está disponível. Nenhum e-mail foi enviado.' : 'O serviço de contas ainda não está conectado. Nenhuma conta foi criada e seus dados não foram enviados. Continue sem conta ou explore a demonstração.');
  };
  const error = (field: Field) => errors[field] ? <Text accessibilityRole="alert" style={s.error}>{errors[field]}</Text> : null;
  return <Modal visible transparent animationType="none" onRequestClose={() => account.setAccountOpen(false)}>
    <KeyboardAvoidingView style={s.overlay} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.container, { paddingTop: Math.max(insets.top, space.xl), paddingBottom: Math.max(insets.bottom, space.xl) }]}>
        <View style={s.dialog}>
          <View style={s.top}><Text style={s.logo}>ms.</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar acesso à conta" onPress={() => account.setAccountOpen(false)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
          <View style={s.intro}>
            <Text style={shared.eyebrow}>{demo ? 'EXPLORE A EXPERIÊNCIA' : recovery ? 'VAMOS RESOLVER' : 'SEU SOMMELIER, SEMPRE POR PERTO'}</Text>
            <Text accessibilityRole="header" style={s.title}>{demo ? 'Um gostinho do que vem.' : recovery ? 'Esqueceu sua senha?' : register ? 'Cada descoberta\nmerece uma história.' : 'Bom ter você\npor aqui de novo.'}</Text>
            <Text style={shared.caption}>{demo ? 'Experimente o histórico com um perfil local, sem e-mail ou senha.' : recovery ? 'Informe seu e-mail para recuperar o acesso à sua conta.' : register ? 'Crie sua conta para guardar conversas e reencontrar seus vinhos favoritos.' : 'Entre para continuar suas conversas e relembrar suas descobertas.'}</Text>
          </View>
          {!demo && !recovery && <View style={s.tabs}>{(['login', 'register'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: page === item }} onPress={() => changePage(item)} style={[s.tab, page === item && s.tabSelected]}><Text style={[s.tabText, page === item && s.tabTextSelected]}>{item === 'login' ? 'Entrar' : 'Criar conta'}</Text></Pressable>)}</View>}
          {demo ? <>
            <Text style={shared.caption}>O histórico da demonstração fica somente neste aparelho. Esse perfil não é uma conta autenticada.</Text>
            <View style={s.field}><Text style={s.label}>Como podemos chamar você?</Text><TextInput accessibilityLabel="Nome de demonstração" value={demoName} onChangeText={setDemoName} maxLength={50} placeholder="Seu nome" placeholderTextColor={colors.muted} style={shared.input} autoComplete="off" /></View>
            <Action title="Explorar demonstração" disabled={demoName.trim().length < 2} onPress={() => account.enterDemo(demoName, mode)} />
          </> : <>
            {register && <View style={s.field}><Text style={s.label}>Seu nome</Text><TextInput ref={nameRef} accessibilityLabel="Seu nome" autoComplete="name" textContentType="name" value={name} onChangeText={value => { setName(value); clearError('name'); }} maxLength={50} placeholder="Como podemos chamar você?" placeholderTextColor={colors.muted} style={[shared.input, errors.name && s.invalid]} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />{error('name')}</View>}
            <View style={s.field}><Text style={s.label}>E-mail</Text><TextInput ref={emailRef} accessibilityLabel="E-mail" autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={value => { setEmail(value); clearError('email'); }} maxLength={254} placeholder="voce@exemplo.com" placeholderTextColor={colors.muted} style={[shared.input, errors.email && s.invalid]} returnKeyType={recovery ? 'done' : 'next'} onSubmitEditing={() => recovery ? submit() : passwordRef.current?.focus()} />{error('email')}</View>
            {!recovery && <View style={s.field}><Text style={s.label}>Senha</Text><View style={[s.password, errors.password && s.invalid]}>
              <TextInput ref={passwordRef} accessibilityLabel="Senha" autoComplete={register ? 'new-password' : 'current-password'} textContentType={register ? 'newPassword' : 'password'} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} value={password} onChangeText={value => { setPassword(value); clearError('password'); }} maxLength={128} placeholder={register ? 'Pelo menos 8 caracteres' : 'Sua senha'} placeholderTextColor={colors.muted} style={s.passwordInput} returnKeyType={register ? 'next' : 'done'} onSubmitEditing={() => register ? confirmationRef.current?.focus() : submit()} />
              <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setVisible(value => !value)} style={s.reveal}><Text style={s.link}>{visible ? 'Ocultar' : 'Mostrar'}</Text></Pressable>
            </View>{error('password')}</View>}
            {register && <View style={s.field}><Text style={s.label}>Confirme sua senha</Text><TextInput ref={confirmationRef} accessibilityLabel="Confirme sua senha" autoComplete="new-password" textContentType="newPassword" secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} value={confirmation} onChangeText={value => { setConfirmation(value); clearError('confirmation'); }} maxLength={128} placeholder="Digite a senha novamente" placeholderTextColor={colors.muted} style={[shared.input, errors.confirmation && s.invalid]} returnKeyType="done" onSubmitEditing={submit} />{error('confirmation')}</View>}
            {!register && !recovery && <Pressable accessibilityRole="button" onPress={() => changePage('recovery')} style={s.forgot}><Text style={s.link}>Esqueci minha senha</Text></Pressable>}
            {register && <View style={s.field}><Text style={s.label}>Seu jeito de explorar</Text><View style={shared.row}><Choice title="Estou começando" selected={mode === 'beginner'} onPress={() => setMode('beginner')} /><Choice title="Já conheço vinhos" selected={mode === 'advanced'} onPress={() => setMode('advanced')} /></View></View>}
            <Text style={s.preview}>Prévia · O acesso com e-mail e senha ainda não está disponível.</Text>
            {message ? <View style={shared.notice}><Text accessibilityRole="alert" style={shared.caption}>{message}</Text></View> : null}
            <Action title={register ? 'Criar minha conta' : recovery ? 'Enviar link de recuperação' : 'Entrar na minha conta'} onPress={submit} />
          </>}
          {(recovery || demo) && <Pressable accessibilityRole="button" onPress={() => changePage('login')} style={s.guest}><Text style={s.link}>Voltar para entrar</Text></Pressable>}
          <View style={s.footer}>
            <Pressable accessibilityRole="button" onPress={() => account.setAccountOpen(false)} style={s.guest}><Text style={s.link}>Continuar sem conta</Text></Pressable>
            {!demo && <Pressable accessibilityRole="button" onPress={() => changePage('demo')} style={s.guest}><Text style={shared.caption}>Conhecer a demonstração</Text></Pressable>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(48,39,40,0.35)' }, container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  dialog: { width: '100%', maxWidth: 480, padding: space.xl, borderRadius: radius.md, backgroundColor: colors.paper, gap: space.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, logo: { fontFamily: theme.headingFamily, fontSize: font.hero, color: colors.accent, fontStyle: 'italic' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: font.title, color: colors.accent },
  intro: { gap: space.sm }, title: { fontFamily: theme.headingFamily, fontSize: font.title, lineHeight: 38, color: theme.wineDark },
  tabs: { flexDirection: 'row', backgroundColor: theme.side, borderRadius: radius.sm, padding: space.xs },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm }, tabSelected: { backgroundColor: colors.surface },
  tabText: { fontSize: font.body, color: colors.muted }, tabTextSelected: { color: colors.accent, fontWeight: '600' },
  field: { gap: space.sm }, label: { fontSize: font.caption, fontWeight: '600', color: colors.ink },
  password: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, alignItems: 'center' },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 48, padding: space.md, color: colors.ink, fontSize: font.body },
  reveal: { minHeight: 48, paddingHorizontal: space.md, justifyContent: 'center' },
  invalid: { borderColor: colors.error }, error: { color: colors.error, fontSize: font.caption, lineHeight: 21 },
  forgot: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginTop: -space.sm },
  link: { color: colors.accent, fontSize: font.caption, fontWeight: '600' },
  preview: { color: colors.muted, fontSize: font.caption, lineHeight: 21 },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
  guest: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
