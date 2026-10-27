import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '@/features/session/context';
import { formatBrl, formatUsd, referenceExchangeRate } from '@/features/chat/usage';
import { colors, font, radius, space } from '@/theme';

export function PilotControls({demo=true}:{demo?:boolean}) {
  const { aiEnabled, connectingAi, toggleAi, pending, usage } = useSession();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exchange, setExchange] = useState('');
  const rate = referenceExchangeRate(exchange);
  return <View style={s.container}>
    <View style={s.row}>
      <Text accessibilityLiveRegion="polite" style={s.caption}>{aiEnabled ? `Piloto com Claude · ${demo ? 'carta fictícia' : 'carta do estabelecimento'}` : 'Demonstração · respostas por regras'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={aiEnabled ? 'Voltar à demonstração' : 'Usar Claude'} disabled={pending || connectingAi} onPress={() => void toggleAi()} style={s.button}>
        <Text style={s.action}>{connectingAi ? 'Conectando…' : aiEnabled ? 'Usar demonstração' : 'Usar Claude'}</Text>
      </Pressable>
    </View>
    {usage ? <>
      <View style={s.row}>
        <View style={s.totals} accessibilityLiveRegion="polite">
          <Text style={s.caption}>Nesta sessão: {usage.inputTokens.toLocaleString('pt-BR')} tokens de entrada · {usage.outputTokens.toLocaleString('pt-BR')} de saída</Text>
          <Text style={s.cost}>{usage.estimatedCostUsd === null ? 'Custo indisponível para este modelo' : `Custo estimado: ${formatUsd(usage.estimatedCostUsd)}${rate ? ` · ≈ ${formatBrl(usage.estimatedCostUsd * rate)}` : ''}`}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Detalhes do consumo e custo" aria-expanded={detailsOpen} onPress={() => setDetailsOpen(open => !open)} style={s.button}><Text style={s.action}>{detailsOpen ? 'Fechar detalhes' : 'Ver custos'}</Text></Pressable>
      </View>
      {detailsOpen && <View style={s.details}>
        <Text style={s.caption}>Última resposta: {usage.lastRequest.inputTokens.toLocaleString('pt-BR')} tokens de entrada · {usage.lastRequest.outputTokens.toLocaleString('pt-BR')} de saída{usage.lastRequest.estimatedCostUsd !== null ? ` · ${formatUsd(usage.lastRequest.estimatedCostUsd)}` : ''}</Text>
        <Text style={s.caption}>Modelo: {usage.model}</Text>
        {usage.pricing && <Text style={s.caption}>Por 1 milhão de tokens: US$ {usage.pricing.inputUsdPerMillion.toFixed(2).replace('.', ',')} na entrada · US$ {usage.pricing.outputUsdPerMillion.toFixed(2).replace('.', ',')} na saída. Tarifas de {usage.pricing.checkedAt.split('-').reverse().join('/')}.</Text>}
        <View style={s.exchange}>
          <Text style={s.caption}>Converter para reais · R$ por US$ 1</Text>
          <TextInput accessibilityLabel="Câmbio de referência em reais por dólar" value={exchange} onChangeText={setExchange} keyboardType="decimal-pad" maxLength={10} placeholder="Ex.: 5,00" placeholderTextColor={colors.muted} style={s.input} />
        </View>
        {exchange.trim() && rate === null ? <Text style={s.caption}>Informe um câmbio positivo, como 5,00.</Text> : null}
        <Text style={s.caption}>Câmbio informado por você. Estimativa sem impostos, IOF ou taxas. Conta apenas respostas concluídas nesta sessão; zera em nova conversa. Consulte a Anthropic para o total faturado.</Text>
      </View>}
    </> : aiEnabled ? <Text style={s.caption}>Tokens e custo aparecerão após a primeira resposta.</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  container: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  action: { color: colors.accent, fontSize: font.caption, fontWeight: '600' },
  totals: { flex: 1, gap: space.xs },
  cost: { color: colors.accent, fontSize: font.caption, fontWeight: '600' },
  details: { gap: space.sm, padding: space.md, backgroundColor: colors.tint, borderRadius: radius.sm },
  exchange: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  input: { minHeight: 44, width: 104, paddingHorizontal: space.sm, backgroundColor: colors.surface, color: colors.ink, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, fontSize: font.caption },
});
