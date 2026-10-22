import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '@/components/ui-kit';
import { useAccount } from '@/features/account/context';
import { ConversationHistory, StorageNotice } from '@/components/conversation-history';
export default function Index() {
  const account = useAccount();
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>SEU PRÓXIMO VINHO COMEÇA AQUI</Text>
    <Text accessibilityRole="header" style={styles.hero}>{account.profile ? `Olá, ${account.profile.name}. Vamos descobrir outro vinho?` : 'Uma boa escolha, no seu tempo.'}</Text>
    <Text style={styles.body}>{account.profile ? 'Retome uma conversa ou escolha um estabelecimento para começar outra. Você pode voltar mesmo depois da visita.' : 'Escolha um estabelecimento para conversar sem cadastro ou entre para guardar suas descobertas.'}</Text>
    {account.profile ? <><Text style={styles.caption}>Conta de demonstração · histórico guardado somente neste aparelho.</Text><ConversationHistory /><Pressable accessibilityRole="button" onPress={account.signOut}><Text style={styles.link}>Sair da conta</Text></Pressable></> : <Pressable accessibilityRole="button" accessibilityLabel="Entrar ou criar conta" onPress={() => account.openAccount()}><Text style={styles.link}>Entrar · Criar conta</Text></Pressable>}
    <StorageNotice />
    <View style={styles.panel}><Text style={styles.sectionTitle}>Escolha uma carta</Text><Link href="/e/casa-da-uva" style={styles.link}>Casa da Uva →</Link><Link href="/e/mesa-do-vale" style={styles.link}>Mesa do Vale →</Link></View>
    <Text style={styles.caption}>Protótipo com estabelecimentos, vinhos e preços fictícios. No piloto, o QR Code abrirá diretamente a carta do estabelecimento.</Text>
  </ScrollView>;
}
