import { useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useAdmin } from '@/features/admin/context';
import { apiRequest } from '@/lib/api-client';
import { AdminButton, AdminField, adminError, adminStyles as s } from '@/components/admin-ui';
import { colors } from '@/theme';
export function AdminLogin(){
  const admin=useAdmin();const router=useRouter();const {expired}=useLocalSearchParams<{expired?:string}>();
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [recovery,setRecovery]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const submit=async()=>{if(pending)return;setError('');setMessage('');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Informe um e-mail válido.');return;}setPending(true);try{if(recovery){const result=await apiRequest<{message:string}>('auth/password-reset/request',{method:'POST',credentials:'include',body:JSON.stringify({email:email.trim()})});setMessage(result.message);}else{await admin.login(email.trim(),password);setPassword('');router.replace('/admin/catalog');}}catch(e){setError(adminError(e));}finally{setPending(false);}};
  return <ScrollView style={{backgroundColor:colors.paper}} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page,{maxWidth:520,justifyContent:'center'}]}>
    <Text style={s.brand}>ms.</Text><Text accessibilityRole="header" style={s.title}>{recovery?'Recuperar acesso':'Seu catálogo,\ndo seu jeito.'}</Text><Text style={s.subtitle}>Área administrativa do Meu Sommelier. Entre para cuidar da carta do seu estabelecimento.</Text>
    {expired&&<Text accessibilityRole="alert" style={s.error}>Sua sessão expirou. Entre novamente para continuar.</Text>}
    <View style={s.panel}><AdminField label="E-mail administrativo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!pending}/>{!recovery&&<AdminField label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!pending} onSubmitEditing={()=>void submit()}/>}
      {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{message&&<Text accessibilityLiveRegion="polite" style={s.success}>{message}</Text>}
      <AdminButton title={pending?'Processando…':recovery?'Solicitar recuperação':'Entrar na administração'} disabled={pending||!email.trim()||(!recovery&&!password)} onPress={()=>void submit()}/>
      <AdminButton title={recovery?'Voltar ao login':'Esqueci minha senha'} disabled={pending} onPress={()=>{setRecovery(value=>!value);setError('');setMessage('');setPassword('');}}/>
    </View><Link href="/" style={s.link}>← Voltar às cartas</Link>
  </ScrollView>;
}
export function AdminReset(){const {token}=useLocalSearchParams<{token?:string}>();const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [pending,setPending]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);const submit=async()=>{if(pending)return;setError('');if(password.length<12||password.length>128||password!==confirm){setError('Use de 12 a 128 caracteres e confirme a mesma senha.');return;}setPending(true);try{await apiRequest('auth/password-reset/confirm',{method:'POST',credentials:'include',body:JSON.stringify({token,password})});setPassword('');setConfirm('');setDone(true);}catch(e){setError(adminError(e));}finally{setPending(false);}};return <ScrollView contentContainerStyle={[s.page,{maxWidth:520}]}><Text style={s.brand}>ms.</Text><Text style={s.title}>Nova senha</Text>{done?<><Text style={s.success}>Senha atualizada. Entre novamente para continuar.</Text><Link href="/admin/login" style={s.link}>Ir para o login</Link></>:<View style={s.panel}><AdminField label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry editable={!pending}/><AdminField label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} secureTextEntry editable={!pending}/>{error&&<Text style={s.error}>{error}</Text>}<AdminButton title={pending?'Atualizando…':'Atualizar senha'} disabled={pending||!token} onPress={()=>void submit()}/></View>}</ScrollView>;}
