import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SessionProvider } from '@/features/session/context';
import { getEstablishment } from '@/features/catalog/mock';
import { colors } from '@/theme';
import { useAccount } from '@/features/account/context';
export default function EstablishmentLayout() {
  const { slug: localSlug } = useLocalSearchParams<{ slug: string }>();
  const { slug: activeSlug, conversation } = useGlobalSearchParams<{ slug?: string; conversation?: string | string[] }>();
  const slug = typeof activeSlug === 'string' ? activeSlug : localSlug;
  const { profile } = useAccount();
  const conversationId = activeSlug === slug && typeof conversation === 'string' ? conversation : undefined;
  return <SessionProvider key={`${slug}:${conversationId ?? 'new'}:${conversationId ? profile?.id ?? 'guest' : ''}`} slug={slug} conversationId={conversationId}><Stack screenOptions={{ headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.paper }, contentStyle: { backgroundColor: colors.paper }, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: getEstablishment(slug)?.name ?? 'Estabelecimento', headerShown: process.env.EXPO_OS !== 'web' }} /><Stack.Screen name="wines/[id]" options={{ title: 'Conheça o vinho' }} /></Stack></SessionProvider>;
}
