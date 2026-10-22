// Paleta fixa da primeira identidade visual; esta versão usa tema claro.
export const colors = { paper: '#FAF7F2', surface: '#FFFFFF', ink: '#302728', muted: '#6F6261', accent: '#742E43', tint: '#F1E3E7', border: '#DDCFCA', green: '#315D44', error: '#972F2F' };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const font = { caption: 13, body: 16, heading: 22, title: 30, hero: 40 };
export const radius = { sm: 8, md: 16, pill: 100 };
export const chatTheme = {
  side: '#F3EDE7', wineDark: '#522031', hairline: '#EAE2DC', tag: '#EEE6DD',
  headingFamily: process.env.EXPO_OS === 'android' ? 'serif' : 'Georgia', headingSize: 46, headingCompact: 34,
  lineHeight: 56, compactLineHeight: 42, conversationWidth: 820, sidebarWidth: 248,
};
