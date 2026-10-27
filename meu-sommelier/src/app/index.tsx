import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '@/components/ui-kit';
import { useAccount } from '@/features/account/context';
import { ConversationHistory, StorageNotice } from '@/components/conversation-history';
import { useCatalog, CatalogNotice } from '@/features/catalog/context';
export default function Index() {
  const account = useAccount();
  const {items}=useCatalog();
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>SEU PRÓXIMO VINHO COMEÇA AQUI</Text>
    <Text accessibilityRole="header" style={styles.hero}>{account.profile ? `Olá, ${account.profile.name}. Vamos descobrir outro vinho?` : 'Uma boa escolha, no seu tempo.'}</Text>
    <Text style={styles.body}>{account.profile ? 'Retome uma conversa ou escolha um estabelecimento para começar outra. Você pode voltar mesmo depois da visita.' : 'Escolha um estabelecimento para conversar sem cadastro ou entre para guardar suas descobertas.'}</Text>
    {account.profile ? <><Text style={styles.caption}>Conta de demonstração · histórico guardado somente neste aparelho.</Text><ConversationHistory /><Pressable accessibilityRole="button" onPress={account.signOut}><Text style={styles.link}>Sair da conta</Text></Pressable></> : <Pressable accessibilityRole="button" accessibilityLabel="Entrar ou criar conta" onPress={() => account.openAccount()}><Text style={styles.link}>Entrar · Criar conta</Text></Pressable>}
    <StorageNotice />
    <CatalogNotice />
    <View style={styles.panel}><Text style={styles.sectionTitle}>Escolha uma carta</Text>{items.map(item=><Link key={item.slug} href={{pathname:'/e/[slug]',params:{slug:item.slug}}} style={styles.link}>{item.name} →</Link>)}{!items.length&&<Text style={styles.caption}>Nenhum estabelecimento disponível.</Text>}</View>
    <Link href="/admin/login" style={styles.link}>Acesso administrativo →</Link>
    <Text style={styles.caption}>Ambiente piloto. As cartas de demonstração usam dados fictícios. Cada QR Code pode abrir diretamente a carta do estabelecimento.</Text>
  </ScrollView>;
}
