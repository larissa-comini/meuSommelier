import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Text, View } from 'react-native';
import { useAdmin } from '@/features/admin/context';
import { useCatalog } from '@/features/catalog/context';
import type { ImportJob } from '@/features/admin/types';
import { reviewChanges, reviewMessage, reviewRows, type ImportDrafts } from '@/features/admin/import-review';
import { styleOptions } from '@/features/admin/form';
import { money, typeLabels } from '@/features/catalog/types';
import { AdminButton, AdminField, AdminGate, AdminSelect, adminError, adminStyles as s } from '@/components/admin-ui';

const fieldLabels: Record<string, string> = { sku: 'Código interno', name: 'Nome do vinho', type: 'Tipo do vinho', style: 'Estilo (opcional)', price: 'Preço (R$)', currency: 'Moeda', active: 'Ativo', available: 'Disponível', producer: 'Produtor', country: 'País', region: 'Região', vintageYear: 'Safra', nonVintage: 'Não safrado', grapes: 'Uvas', pairings: 'Harmonizações', body: 'Corpo', acidity: 'Acidez', tannin: 'Taninos', sweetness: 'Doçura' };
const typeOptions = [{ value: '', label: 'Escolha o tipo' }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))];
const pageSize = 8;

function ImportsContent() {
  const admin = useAdmin();
  const { request } = admin;
  const catalog = useCatalog();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState({ type: '', style: '', generateSku: true });
  const [drafts, setDrafts] = useState<ImportDrafts>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(true);
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState<number | null>(null);
  const [history, setHistory] = useState<Pick<ImportJob, 'id' | 'name' | 'status' | 'totals'>[]>([]);
  const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    let active = true;
    request<{ items: typeof history }>('admin/imports').then(result => { if (active) setHistory(result.items); }).catch(e => { if (active) setHistoryError(adminError(e)); }).finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [request]);

  const adopt = (item: ImportJob) => {
    setJob(item); setMapping(item.mapping); setDefaults({ ...item.defaults, generateSku: true });
    setDrafts({}); setMappingDirty(false); setPage(1); setEditRow(null);
    setOnlyProblems(item.preview.some(row => !row.valid));
  };
  const change = (index: number, field: string, value: string) => setDrafts(previous => ({ ...previous, [index]: { ...previous[index], [field]: value } }));
  const upload = async () => {
    if (busy) return;
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/xml', 'text/xml', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], multiple: false, base64: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file.file) throw new Error('Use o navegador para enviar sua carta.');
      if ((file.size ?? 0) > 8 * 1024 * 1024) throw new Error('Escolha um arquivo de até 8 MB.');
      setBusy(true);
      const form = new FormData(); form.append('file', file.file, file.name);
      adopt(await request<ImportJob>('admin/imports', { method: 'POST', body: form }));
      setAdvanced(false);
    } catch (e) { setError(adminError(e)); } finally { setBusy(false); }
  };
  const saveAdjustments = async () => {
    if (!job || busy) return;
    setBusy(true); setError('');
    try { adopt(await request<ImportJob>(`admin/imports/${job.id}/mapping`, { method: 'PUT', body: JSON.stringify({ version: job.version, mapping, defaults, changes: reviewChanges(drafts) }) })); }
    catch (e) { setError(adminError(e)); } finally { setBusy(false); }
  };
  const commit = async (skipProblems = false) => {
    if (!job || busy || mappingDirty || Object.keys(drafts).length) return;
    setBusy(true); setError('');
    try {
      const completed = await request<ImportJob>(`admin/imports/${job.id}/commit`, { method: 'POST', body: JSON.stringify({ version: job.version, ignoreInvalidRows: skipProblems }) });
      adopt(completed);
      // A refresh failure must not make a completed import look like a failed save.
      await Promise.allSettled([catalog.refresh(), request<{ items: typeof history }>('admin/imports').then(result => setHistory(result.items))]);
    } catch (e) { setError(adminError(e)); } finally { setBusy(false); }
  };
  const openHistory = async (id: string) => {
    if (busy) return;
    setBusy(true); setError('');
    try { adopt(await request<ImportJob>(`admin/imports/${id}`)); setAdvanced(false); }
    catch (e) { setError(adminError(e)); } finally { setBusy(false); }
  };
  const completed = job?.status === 'completed';
  const dirty = mappingDirty || Object.keys(drafts).length > 0;
  const problemCount = job?.preview.filter(row => !row.valid).length ?? 0;
  const readyCount = job?.preview.filter(row => row.valid).length ?? 0;
  const rows = job ? reviewRows(job, onlyProblems) : [];
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));

  return <>
    {!job && <View style={s.panel}>
      <Text style={s.sectionTitle}>Comece pela sua carta</Text>
      <Text style={s.subtitle}>Envie o arquivo. Nós organizamos os vinhos e mostramos o que precisa da sua revisão antes de salvar.</Text>
      <View style={s.row}><AdminButton title={busy ? 'Lendo sua carta…' : 'Escolher arquivo'} onPress={() => void upload()} disabled={busy} /></View>
      <Text style={s.subtitle}>PDF, planilha Excel, CSV ou XML · até 8 MB e 500 vinhos.</Text>
    </View>}
    {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {job && <>
      <View style={s.row}>
        <View style={s.reviewHeading}><Text style={s.label}>{job.name}</Text><Text style={s.subtitle}>{job.preview.length} vinhos encontrados · códigos internos automáticos</Text></View>
        <AdminButton title="Escolher outro arquivo" variant="secondary" onPress={() => void upload()} disabled={busy || dirty} />
      </View>
      {completed ? <View style={s.panel}>
        <Text accessibilityRole="header" style={s.sectionTitle}>Sua carta foi atualizada</Text>
        <Text accessibilityLiveRegion="polite" style={s.success}>{job.totals.created} vinhos adicionados · {job.totals.updated} atualizados{job.totals.ignored ? ` · ${job.totals.ignored} ficaram de fora` : ''}.</Text>
        <Link href="/admin/catalog" style={s.link}>Ver minha carta →</Link>
      </View> : <>
        <View style={[s.panel, problemCount > 0 && s.attention]}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.sectionTitle}>{reviewMessage(job)}</Text>
          <Text style={s.subtitle}>{problemCount ? 'Complete os campos destacados abaixo. Os outros vinhos já estão prontos.' : 'Confira os nomes e preços. Você pode editar qualquer vinho antes de adicionar.'}</Text>
          <Text style={s.label}>{readyCount} prontos{problemCount ? ` · ${problemCount} para revisar` : ''}</Text>
          {dirty && <><Text style={s.label}>Você fez alterações. Salve os ajustes para continuar.</Text><View style={s.row}><AdminButton title={busy ? 'Salvando ajustes…' : 'Salvar ajustes'} onPress={() => void saveAdjustments()} disabled={busy} /></View></>}
          {!dirty && !problemCount && <View style={s.row}><AdminButton title={busy ? 'Atualizando sua carta…' : `Confirmar ${job.preview.length} vinhos na carta`} onPress={() => void commit()} disabled={busy} /></View>}
          <Text style={s.subtitle}>Nenhum vinho é alterado na sua carta até você confirmar.</Text>
        </View>
        <View style={s.row}>
          <AdminButton title={`Para revisar (${problemCount})`} variant={onlyProblems ? 'primary' : 'secondary'} disabled={busy || !problemCount} onPress={() => { setOnlyProblems(true); setPage(1); }} />
          <AdminButton title={`Todos os vinhos (${job.preview.length})`} variant={!onlyProblems ? 'primary' : 'secondary'} disabled={busy} onPress={() => { setOnlyProblems(false); setPage(1); }} />
        </View>
        <View>
          {rows.slice((page - 1) * pageSize, page * pageSize).map(row => {
            const rowErrors = job.errors.filter(issue => issue.row === row.row);
            const hasError = (field: string) => rowErrors.some(issue => (issue.field === 'priceCents' ? 'price' : issue.field) === field);
            const value = (field: string) => drafts[row.index]?.[field] ?? (field === 'price' ? Number.isFinite(row.wine.priceCents) ? (row.wine.priceCents / 100).toFixed(2).replace('.', ',') : '' : String(row.wine[field as keyof typeof row.wine] ?? ''));
            const editing = editRow === row.index;
            const otherErrors = rowErrors.filter(issue => !['name', 'type', 'priceCents', 'style'].includes(issue.field));
            return <View style={s.reviewRow} key={row.index}>
              <View style={s.row}>
                <View style={s.reviewHeading}>
                  <Text style={row.valid ? s.success : s.error}>{row.valid ? row.action === 'create' ? 'Pronto para adicionar' : 'Vai atualizar um vinho da carta' : 'Precisa da sua revisão'}</Text>
                  <Text style={s.sectionTitle}>{row.wine.name || 'Vinho sem nome'}</Text>
                  <Text style={s.subtitle}>{typeLabels[row.wine.type] || 'Tipo a escolher'} · {Number.isFinite(row.wine.priceCents) ? money(row.wine.priceCents) : 'Preço a conferir'}</Text>
                </View>
                <AdminButton title={editing ? 'Fechar edição' : 'Editar vinho'} variant="secondary" disabled={busy} onPress={() => setEditRow(editing ? null : row.index)} />
              </View>
              <View style={s.row}>
                {(editing || hasError('name')) && <AdminField label="Nome do vinho" value={value('name')} editable={!busy} onChangeText={text => change(row.index, 'name', text)} error={hasError('name') && drafts[row.index]?.name === undefined ? 'Informe o nome deste vinho.' : undefined} />}
                {(editing || hasError('price')) && <AdminField label="Preço da garrafa (R$)" value={value('price')} keyboardType="decimal-pad" editable={!busy} onChangeText={text => change(row.index, 'price', text)} error={hasError('price') && drafts[row.index]?.price === undefined ? 'Confira o preço. Exemplo: 129,90.' : undefined} />}
                {(editing || hasError('type')) && <AdminSelect label={hasError('type') ? 'Falta escolher o tipo deste vinho' : 'Tipo do vinho'} value={value('type')} options={typeOptions} disabled={busy} onChange={text => change(row.index, 'type', text)} />}
                {(editing || hasError('style')) && <AdminSelect label="Estilo (opcional)" value={value('style')} options={styleOptions} disabled={busy} onChange={text => change(row.index, 'style', text)} />}
              </View>
              {otherErrors.map(issue => <AdminField key={issue.field} label={fieldLabels[issue.field] || 'Informação a conferir'} error={issue.message} value={value(issue.field)} editable={!busy} onChangeText={text => change(row.index, issue.field, text)} />)}
              {drafts[row.index] && <View style={s.row}><AdminButton title={busy ? 'Salvando ajustes…' : 'Salvar ajustes'} onPress={() => void saveAdjustments()} disabled={busy} /></View>}
            </View>;
          })}
        </View>
        {pages > 1 && <View style={s.row}><AdminButton title="Anteriores" variant="secondary" disabled={page <= 1 || busy} onPress={() => setPage(value => value - 1)} /><Text style={s.subtitle}>Página {page} de {pages}</Text><AdminButton title="Próximos" variant="secondary" disabled={page >= pages || busy} onPress={() => setPage(value => value + 1)} /></View>}
        <View style={s.panel}>
          <Text style={s.sectionTitle}>{dirty ? 'Salve seus ajustes para continuar' : problemCount ? `Ainda faltam ${problemCount} vinhos para revisar` : 'Pode confirmar'}</Text>
          <Text style={s.subtitle}>{job.totals.created} novos vinhos · {job.totals.updated} vinhos existentes serão atualizados.</Text>
          {dirty ? <AdminButton title={busy ? 'Salvando ajustes…' : 'Salvar ajustes'} disabled={busy} onPress={() => void saveAdjustments()} /> : <>
            {!problemCount && <AdminButton title={busy ? 'Atualizando sua carta…' : `Confirmar ${job.preview.length} vinhos na carta`} disabled={busy} onPress={() => void commit()} />}
            {problemCount > 0 && readyCount > 0 && <><Text style={s.subtitle}>Se preferir continuar agora, os {problemCount} vinhos pendentes ficarão de fora.</Text><AdminButton title={busy ? 'Atualizando sua carta…' : `Adicionar apenas os ${readyCount} vinhos prontos`} variant="secondary" disabled={busy} onPress={() => void commit(true)} /></>}
          </>}
        </View>
      </>}
    </>}
    {!completed && <View>
      <AdminButton title={advanced ? 'Fechar opções do arquivo' : 'Opções do arquivo e modelos'} variant="secondary" disabled={busy} onPress={() => setAdvanced(value => !value)} />
      {advanced && <View style={s.panel}>
        <Text style={s.sectionTitle}>Ajustar a leitura do arquivo</Text>
        <Text style={s.subtitle}>Use apenas se o nome, o preço ou outra informação foi lida na coluna errada. Os códigos internos são preenchidos automaticamente.</Text>
        <View style={s.row}><Link href={`${base}/admin/import-template?format=csv`} style={s.link}>Modelo CSV</Link><Link href={`${base}/admin/import-template?format=xlsx`} style={s.link}>Modelo Excel</Link><Link href={`${base}/admin/wines/export`} style={s.link}>Exportar minha carta</Link></View>
        {job && <>
          <View style={s.row}>{Object.keys(fieldLabels).filter(key => key !== 'sku').map(key => <AdminSelect key={key} label={fieldLabels[key]} value={mapping[key] || ''} options={[{ value: '', label: 'Não está no arquivo' }, ...job.columns.map(column => ({ value: column, label: column }))]} disabled={busy} onChange={value => { setMapping(previous => ({ ...previous, [key]: value })); setMappingDirty(true); }} />)}</View>
          <AdminSelect label="Usar este tipo onde ele estiver vazio" value={defaults.type} options={[{ value: '', label: 'Escolher em cada vinho' }, ...typeOptions.slice(1)]} disabled={busy} onChange={type => { setDefaults(previous => ({ ...previous, type })); setMappingDirty(true); }} />
          <AdminButton title={busy ? 'Salvando ajustes…' : 'Aplicar ajustes do arquivo'} disabled={busy} onPress={() => void saveAdjustments()} />
          {job.warnings.map((warning, index) => <Text key={index} style={s.subtitle}>{warning}</Text>)}
        </>}
      </View>}
    </View>}
    <AdminButton title={showHistory ? 'Fechar envios anteriores' : 'Ver envios anteriores'} variant="secondary" disabled={busy} onPress={() => setShowHistory(value => !value)} />
    {showHistory && <View style={s.panel}>
      <Text style={s.sectionTitle}>Seus envios anteriores</Text>
      {historyLoading && <Text style={s.subtitle}>Buscando seus arquivos…</Text>}
      {historyError && <Text style={s.error}>{historyError}</Text>}
      {!historyLoading && !historyError && !history.length && <Text style={s.subtitle}>Você ainda não enviou nenhuma carta.</Text>}
      {history.map(item => <View key={item.id} style={s.divider}><Text style={s.label}>{item.name}</Text><Text style={s.subtitle}>{item.status === 'completed' ? 'Adicionado à carta' : 'Ainda não confirmado'}</Text><View style={s.row}><AdminButton title="Abrir este envio" variant="secondary" disabled={busy || dirty} onPress={() => void openHistory(item.id)} /></View></View>)}
    </View>}
  </>;
}
export function AdminImports() { return <AdminGate title="Importar sua carta"><ImportsContent /></AdminGate>; }
