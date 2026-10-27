import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';
import { AccountProvider } from '@/features/account/context';
import { AccountDialog } from '@/components/account-dialog';
import { CatalogProvider } from '@/features/catalog/context';
export default function RootLayout() {
  return <CatalogProvider><AccountProvider><StatusBar style="dark" /><Stack screenOptions={{ headerTintColor: colors.accent, headerStyle: { backgroundColor: colors.paper }, contentStyle: { backgroundColor: colors.paper }, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Meu Sommelier' }} /><Stack.Screen name="e/[slug]" options={{ headerShown: false }} /><Stack.Screen name="admin" options={{headerShown:false}} /></Stack><AccountDialog /></AccountProvider></CatalogProvider>;
}
