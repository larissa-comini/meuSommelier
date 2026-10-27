import { useEffect, useState, type PropsWithChildren } from 'react';
import { Link, useRouter } from 'expo-router';
import { Host, Picker, Switch } from '@expo/ui';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAdmin } from '@/features/admin/context';
import { ApiError } from '@/lib/api-client';
import { colors, chatTheme, space, radius } from '@/theme';
import { Loading } from './ui-kit';

export const adminStyles=StyleSheet.create({
  page:{flexGrow:1,padding:space.xl,paddingBottom:space.xxxl,gap:space.xl,width:'100%',maxWidth:1160,alignSelf:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:space.md,flexWrap:'wrap',borderBottomWidth:1,borderColor:colors.border,paddingBottom:space.lg},
  brand:{fontFamily:chatTheme.headingFamily,fontStyle:'italic',fontSize:36,color:colors.accent},
  title:{fontFamily:chatTheme.headingFamily,fontSize:34,color:chatTheme.wineDark},
  subtitle:{color:colors.muted,fontSize:14,lineHeight:22},
  row:{flexDirection:'row',gap:space.md,alignItems:'center',flexWrap:'wrap'},
  panel:{backgroundColor:colors.surface,padding:space.xl,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,gap:space.lg},
  field:{gap:space.xs,flexGrow:1,minWidth:200},label:{fontSize:14,fontWeight:'600',color:colors.ink},
  input:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,minHeight:48,padding:space.md,color:colors.ink,backgroundColor:colors.surface,fontSize:16},
  error:{color:colors.error,fontSize:13,lineHeight:20},success:{color:colors.green,fontSize:14,lineHeight:22},
  button:{minHeight:44,paddingHorizontal:space.lg,paddingVertical:space.md,borderRadius:radius.sm,backgroundColor:colors.accent,justifyContent:'center',alignItems:'center'},
  buttonText:{color:colors.surface,fontWeight:'600',fontSize:14},link:{color:colors.accent,fontSize:14,paddingVertical:space.sm},
  sectionTitle:{color:colors.ink,fontSize:20,fontWeight:'600'},divider:{borderBottomWidth:1,borderColor:colors.border,paddingBottom:space.lg,gap:space.sm},
});
export function AdminButton({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[adminStyles.button,disabled&&{opacity:0.45}]}><Text style={adminStyles.buttonText}>{title}</Text></Pressable>;}
export function AdminField({label,error,...props}:TextInputProps&{label:string;error?:string}){return <View style={adminStyles.field}><Text style={adminStyles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} accessibilityHint={error} aria-invalid={!!error} style={[adminStyles.input,props.multiline&&{minHeight:80},props.style]}/>{error&&<Text accessibilityRole="alert" style={adminStyles.error}>{error}</Text>}</View>;}
export function AdminSelect({label,value,onChange,options,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];disabled?:boolean}){
  const control=<Host matchContents colorScheme="light" seedColor={colors.accent}><Picker selectedValue={value} onValueChange={onChange} enabled={!disabled} testID={label}>{options.map(option=><Picker.Item key={option.value} value={option.value} label={option.label}/>)}</Picker></Host>;
  if(process.env.EXPO_OS==='web')return <label style={{display:'flex',flexDirection:'column',gap:4,flexGrow:1,minWidth:200,color:colors.ink,fontSize:14,fontWeight:600}}><span>{label}</span>{control}</label>;
  return <View style={adminStyles.field}><Text style={adminStyles.label}>{label}</Text>{control}</View>;
}
export function AdminSwitch({label,value,onChange,disabled=false}:{label:string;value:boolean;onChange:(value:boolean)=>void;disabled?:boolean}){return <Host matchContents colorScheme="light" seedColor={colors.accent}><Switch label={label} value={value} onValueChange={onChange} disabled={disabled}/></Host>;}
export const adminError=(error:unknown)=>error instanceof Error?error.message:'Não foi possível concluir a operação.';
export function AdminGate({children,title}:PropsWithChildren<{title:string}>){
  const admin=useAdmin();const {refresh:refreshSession}=admin;const router=useRouter();const [checking,setChecking]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{let active=true;refreshSession().catch(error=>{if(!active)return;if(error instanceof ApiError&&error.status===401)router.replace({pathname:'/admin/login',params:{expired:'1'}});else setError(adminError(error));}).finally(()=>{if(active)setChecking(false);});return()=>{active=false;};},[refreshSession,router]);
  useEffect(()=>{if(admin.expired)router.replace({pathname:'/admin/login',params:{expired:'1'}});},[admin.expired,router]);
  if(checking)return <Loading message="Verificando acesso administrativo…"/>;
  if(error)return <View style={adminStyles.page}><Text accessibilityRole="alert" style={adminStyles.error}>{error}</Text><AdminButton title="Tentar novamente" onPress={()=>{setChecking(true);setError('');void refreshSession().catch(e=>setError(adminError(e))).finally(()=>setChecking(false));}}/><Link href="/admin/login" style={adminStyles.link}>Voltar ao acesso</Link></View>;
  if(!admin.session)return null;
  return <ScrollView style={{flex:1,backgroundColor:colors.paper}} keyboardShouldPersistTaps="handled" contentContainerStyle={adminStyles.page}>
    <View style={adminStyles.header}><View><Text style={adminStyles.brand}>ms.</Text><Text style={adminStyles.subtitle}>{admin.session.establishment.name} · Administração</Text></View><View style={adminStyles.row}><Link href="/admin/catalog" style={adminStyles.link}>Catálogo</Link><Link href="/admin/imports" style={adminStyles.link}>Importar carta</Link><Link href="/admin/settings" style={adminStyles.link}>Estabelecimento</Link><Pressable accessibilityRole="button" onPress={()=>void admin.logout().then(()=>router.replace('/admin/login')).catch(e=>setError(adminError(e)))}><Text style={adminStyles.link}>Sair</Text></Pressable></View></View>
    <Text accessibilityRole="header" style={adminStyles.title}>{title}</Text>{children}
  </ScrollView>;
}
