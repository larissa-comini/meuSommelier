import { File } from 'expo-file-system';

// Somente URIs criadas pelo gravador e mantidas pela sessão chegam a este helper.
export function releaseVoiceNote(uri: string) {
  try {
    if (process.env.EXPO_OS === 'web') {
      if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
    } else if (uri.startsWith('file:')) {
      const file = new File(uri);
      if (file.exists) file.delete();
    }
  } catch { /* Arquivos em cache podem já ter sido removidos pelo sistema. */ }
}
