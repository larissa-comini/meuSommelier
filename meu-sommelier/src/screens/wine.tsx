import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notice, styles } from '@/components/ui-kit';
import { getWine, getEstablishment } from '@/features/catalog/mock';
import { money, typeLabels } from '@/features/catalog/types';
import { space } from '@/theme';
import { useCatalog, CatalogNotice } from '@/features/catalog/context';
export function WineScreen() {
  useCatalog();
  const { slug, id, recommendedPriceCents, conversation } = useLocalSearchParams<{ slug: string; id: string; recommendedPriceCents?: string; conversation?: string }>();
  const previousPrice = typeof recommendedPriceCents === 'string' && /^\d+$/.test(recommendedPriceCents) ? Number(recommendedPriceCents) : null;
  const wine = getWine(slug, id);
  const insets = useSafeAreaInsets();
  if (!wine) return <ScrollView contentContainerStyle={styles.page}><Text style={styles.title}>Vinho não encontrado</Text><Text style={styles.body}>Este rótulo não pertence à carta acessada ou não está ativo.</Text><Link dismissTo href={{ pathname: '/e/[slug]', params: { slug, conversation } }} style={styles.link}>Voltar à carta</Link></ScrollView>;
  const rows: [string, string][] = [
    ['Produtor', wine.producer ?? 'Não informado'], ['Tipo', typeLabels[wine.type]], ['Uvas', wine.grapes.join(', ') || 'Não informado'],
    ['País', wine.country ?? 'Não informado'], ['Região', wine.region ?? 'Não informado'], ['Safra', wine.nonVintage ? 'Não safrado' : wine.vintageYear?.toString() ?? 'Não informada'],
    ['Corpo', wine.body === null ? 'Não informado' : `${wine.body}/5`], ['Acidez', wine.acidity === null ? 'Não informada' : `${wine.acidity}/5`],
    ['Taninos', wine.tannin === null ? 'Não informados' : `${wine.tannin}/5`], ['Doçura', wine.sweetness === null ? 'Não informada' : `${wine.sweetness}/5`],
    ['Harmonizações', wine.pairings.join(', ') || 'Não informadas'],
  ];
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxxl }]}>
    <Notice>{getEstablishment(slug)?.demo === false ? 'Ficha e preço cadastrados pelo estabelecimento' : 'Rótulo e preço fictícios · ficha de demonstração'}</Notice>
    <CatalogNotice />
    {previousPrice !== null && Number.isSafeInteger(previousPrice) && previousPrice !== wine.priceCents && <Notice>O preço mudou desde a recomendação: era {money(previousPrice)}. O preço atual é {money(wine.priceCents)}.</Notice>}
    <Text style={styles.eyebrow}>{typeLabels[wine.type].toUpperCase()}</Text><Text accessibilityRole="header" selectable style={styles.hero}>{wine.name}</Text><Text selectable style={styles.price}>{money(wine.priceCents)}</Text><Text style={styles.body}>{wine.available ? 'Disponível na carta' : 'Indisponível no momento'}</Text>
    <View style={styles.notice}><Text style={styles.caption}>Fotografia não disponível.</Text></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Conheça o rótulo</Text>{rows.map(([label, value]) => <View key={label} style={styles.divider}><Text style={styles.caption}>{label}</Text><Text selectable style={styles.body}>{value}</Text></View>)}</View>
    <Link dismissTo href={{ pathname: '/e/[slug]', params: { slug, conversation } }} style={styles.link}>Voltar às minhas escolhas</Link>
  </ScrollView>;
}
