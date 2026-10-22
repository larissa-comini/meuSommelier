import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useSession } from '@/features/session/context';
import { releaseVoiceNote } from '@/features/chat/audio-storage';
import type { VoiceNote as Note } from '@/features/chat/conversation';
import { formatDuration, VoiceNote } from './voice-note';
import { colors, font, radius, space } from '@/theme';

export function ChatComposer() {
  const { draft, setDraft, pending, sendText, sendAudio } = useSession();
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftUri = useRef<string | null>(null);
  const duration = useRef(0);
  const mounted = useRef(true);
  const lock = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, status => {
    if (!mounted.current) { if (status.url) releaseVoiceNote(status.url); return; }
    if (status.hasError) setError('A gravação foi interrompida. Tente gravar novamente.');
    if (status.isFinished && status.url && !status.hasError) {
      draftUri.current = status.url;
      setNote({ uri: status.url, duration: duration.current });
    }
  });
  const state = useAudioRecorderState(recorder, 250);
  const recording = state.isRecording;
  const stop = useCallback(async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      duration.current = recorder.getStatus().durationMillis / 1000;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (mounted.current && recorder.uri) {
        draftUri.current = recorder.uri;
        setNote({ uri: recorder.uri, duration: duration.current });
      }
    } catch { if (mounted.current) setError('Não foi possível finalizar o áudio. Tente novamente.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }, [recorder]);

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', next => { if (next !== 'active' && recorder.isRecording) void stop(); });
    return () => {
      mounted.current = false; listener.remove();
      // O hook web remove listeners, mas não encerra a captura sozinho.
      try {
        if (recorder.isRecording) void recorder.stop().then(() => {
          if (recorder.uri) releaseVoiceNote(recorder.uri);
        }).catch(() => {});
      } catch { /* O hook nativo pode já ter liberado o gravador. */ }
      if (draftUri.current) releaseVoiceNote(draftUri.current);
    };
  }, [recorder, stop]);
  useFocusEffect(useCallback(() => () => { try { if (recorder.isRecording) void stop(); } catch { /* Gravador já liberado na desmontagem. */ } }, [recorder, stop]));
  useEffect(() => { if (recording && state.durationMillis >= 60000) void stop(); }, [recording, state.durationMillis, stop]);

  const start = async () => {
    if (lock.current || pending || note || recorder.isRecording) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) { setError('Microfone não autorizado. Libere o acesso nas configurações do navegador ou do aparelho. Você também pode escrever.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      duration.current = 0;
      recorder.record();
      if (!mounted.current) {
        await recorder.stop();
        if (recorder.uri) releaseVoiceNote(recorder.uri);
        await setAudioModeAsync({ allowsRecording: false });
      }
    } catch { if (mounted.current) setError('Não consegui abrir o microfone. Confira a permissão e use HTTPS ou localhost no navegador.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const discard = () => { if (note) releaseVoiceNote(note.uri); draftUri.current = null; setNote(null); setError(null); };
  const sendVoice = () => { if (!note || pending) return; draftUri.current = null; sendAudio(note); setNote(null); };
  const submitText = () => { if (!pending && !busy && draft.trim()) void sendText(draft); };
  return <View style={s.outer}>
    {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {note ? <View style={s.preview}><VoiceNote note={note} /><Text style={s.hint}>Prévia · o áudio fica somente nesta conversa de demonstração.</Text><View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel="Descartar áudio" onPress={discard} style={s.textButton}><Text style={s.actionText}>Descartar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Enviar áudio" disabled={pending} onPress={sendVoice} style={s.sendVoice}><Text style={s.sendLabel}>Adicionar à conversa ↑</Text></Pressable></View></View> : <View style={s.composer}>
      {recording ? <View style={s.recording}><View style={s.redDot} /><Text accessibilityLiveRegion="polite" style={s.recordingText}>Gravando · {formatDuration(state.durationMillis / 1000)}</Text></View> : <TextInput accessibilityLabel="Mensagem para o sommelier" placeholder="Me conte o que você procura…" placeholderTextColor={colors.muted} value={draft} onChangeText={setDraft} editable={!busy} multiline returnKeyType="send" submitBehavior={process.env.EXPO_OS === 'web' ? 'newline' : 'submit'} onSubmitEditing={process.env.EXPO_OS === 'web' ? undefined : submitText} onKeyPress={event => {
        if (process.env.EXPO_OS !== 'web') return;
        const keyboard = event as unknown as KeyboardEvent;
        if (keyboard.key !== 'Enter' || keyboard.shiftKey || keyboard.nativeEvent.isComposing || keyboard.nativeEvent.keyCode === 229) return;
        event.preventDefault();
        if (!keyboard.repeat) submitText();
      }} style={s.input} />}
      <View style={s.composerFooter}><Text style={s.hint}>{recording ? 'Até 1 min · você pode ouvir antes de enviar' : 'Escreva ou toque no microfone'}</Text><View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={recording ? 'Parar gravação' : 'Gravar mensagem de voz'} aria-disabled={busy || pending} disabled={busy || pending} onPress={() => void (recording ? stop() : start())} style={({ pressed }) => [s.micButton, recording && s.activeMic, { opacity: busy || pending ? 0.4 : pressed ? 0.7 : 1 }]}>{recording ? <View style={s.stopIcon} /> : <View style={s.micIcon}><View style={s.micCapsule} /><View style={s.micBase} /><View style={s.micStem} /></View>}</Pressable>
        {!recording && <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensagem" aria-disabled={pending || busy || !draft.trim()} disabled={pending || busy || !draft.trim()} onPress={submitText} style={({ pressed }) => [s.send, { opacity: pending || busy || !draft.trim() ? 0.4 : pressed ? 0.7 : 1 }]}><Text style={s.arrow}>↑</Text></Pressable>}
      </View></View>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  outer: { gap: space.sm },
  composer: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.xs, boxShadow: '0 4px 24px rgba(48,39,40,0.04)' },
  input: { color: colors.ink, fontSize: font.body, minHeight: 36, maxHeight: 112, textAlignVertical: 'top', padding: space.xs },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  hint: { fontSize: font.caption, lineHeight: 18, color: colors.muted, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  micButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  activeMic: { backgroundColor: colors.tint },
  micIcon: { width: 24, height: 26, alignItems: 'center' },
  micCapsule: { width: 10, height: 16, borderWidth: 1.7, borderColor: colors.accent, borderRadius: 8 },
  micBase: { position: 'absolute', top: 8, width: 18, height: 13, borderWidth: 1.7, borderTopWidth: 0, borderColor: colors.accent, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  micStem: { position: 'absolute', top: 21, height: 5, borderLeftWidth: 1.7, borderColor: colors.accent },
  send: { width: 44, height: 44, backgroundColor: colors.accent, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: font.heading, color: colors.surface },
  recording: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  recordingText: { fontSize: font.body, color: colors.accent, fontVariant: ['tabular-nums'] },
  stopIcon: { width: 14, height: 14, borderRadius: 3, backgroundColor: colors.accent },
  preview: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.lg, gap: space.md },
  textButton: { padding: space.md, minHeight: 44, justifyContent: 'center' }, actionText: { fontSize: font.caption, color: colors.muted },
  sendVoice: { padding: space.md, borderRadius: radius.sm, backgroundColor: colors.accent, minHeight: 44, justifyContent: 'center' },
  sendLabel: { fontSize: font.caption, color: colors.surface, fontWeight: '600' }, error: { fontSize: font.caption, color: colors.error, lineHeight: 20 },
});
