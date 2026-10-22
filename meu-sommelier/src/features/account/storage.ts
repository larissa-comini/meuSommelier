import 'expo-sqlite/localStorage/install';
export const readDemoStorage = async () => localStorage.getItem('meu-sommelier.demo.v1');
export const writeDemoStorage = async (value: string) => { localStorage.setItem('meu-sommelier.demo.v1', value); };
