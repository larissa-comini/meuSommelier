import { useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VoiceNote as Note } from '@/features/chat/conversation';
import { colors, font, radius, space } from '@/theme';

export const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export function VoiceNote({ note }: { note: Note }) {
  const player = useAudioPlayer(note.uri);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);
  const toggle = async () => {
    try {
      setError(false);
      if (status.playing) player.pause();
      else { if (status.didJustFinish || status.currentTime >= note.duration) await player.seekTo(0); player.play(); }
    } catch { setError(true); }
  };
  return <View style={s.wrap}>
    <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Pausar áudio' : 'Ouvir áudio'} onPress={() => void toggle()} style={s.play}><Text style={s.playText}>{status.playing ? 'Ⅱ' : '▶'}</Text></Pressable>
    <View style={s.content}><Text style={s.label}>Mensagem de voz</Text><Text style={s.duration}>{formatDuration(status.playing ? status.currentTime : note.duration)} · {status.playing ? 'Reproduzindo' : 'Toque para ouvir'}</Text>{error && <Text accessibilityRole="alert" style={s.error}>Não foi possível reproduzir. Tente novamente.</Text>}</View>
  </View>;
}
const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.sm },
  play: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint },
  playText: { color: colors.accent, fontSize: font.body }, content: { flex: 1, gap: space.xs },
  label: { fontSize: font.body, fontWeight: '600', color: colors.ink }, duration: { fontSize: font.caption, color: colors.muted },
  error: { color: colors.error, fontSize: font.caption },
});
