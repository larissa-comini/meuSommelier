import { Stack } from 'expo-router/stack';
import { AdminProvider } from '@/features/admin/context';
export default function AdminLayout(){return <AdminProvider><Stack screenOptions={{headerShown:false}}/></AdminProvider>;}
