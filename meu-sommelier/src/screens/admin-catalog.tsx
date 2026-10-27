import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { AdminButton, AdminField, AdminGate, AdminSelect, AdminSwitch, adminError, adminStyles as s } from '@/components/admin-ui';
import { useAdmin } from '@/features/admin/context';
import type { AdminWine } from '@/features/admin/types';
import { money, typeLabels } from '@/features/catalog/types';
import { useCatalog } from '@/features/catalog/context';
import { parseWineDraft, styleOptions, wineDraft } from '@/features/admin/form';
import { ApiError } from '@/lib/api-client';
import { catalogFilter, catalogStatus } from '@/features/admin/catalog-state';

function WineEditor({wine,onClose,onSaved}:{wine?:AdminWine;onClose:()=>void;onSaved:()=>void}){
  const admin=useAdmin();
  const [draft,setDraft]=useState(()=>wineDraft(wine));
  const [version,setVersion]=useState(wine?.version);
  const [flags,setFlags]=useState({active:wine?.active??true,available:wine?.available??true,nonVintage:wine?.nonVintage??false});
  const [pending,setPending]=useState(false);
  const [details,setDetails]=useState(false);
  const [error,setError]=useState('');
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const field=(key:string,label:string,numeric=false)=> <AdminField key={key} label={label} value={draft[key]} onChangeText={value=>setDraft(previous=>({...previous,[key]:value}))} error={fieldErrors[key]} editable={!pending} autoFocus={key==='name'} keyboardType={numeric?'decimal-pad':'default'}/>;
  const save=async()=>{
    if(pending)return;
    const parsed=parseWineDraft(draft,flags,version);
    setFieldErrors(parsed.errors);setError('');
    if(Object.keys(parsed.errors).length){if(Object.keys(parsed.errors).some(key=>!['name','type','price'].includes(key)))setDetails(true);return;}
    setPending(true);
    try{await admin.request(wine?`admin/wines/${wine.wineId}`:'admin/wines',{method:wine?'PUT':'POST',body:JSON.stringify(parsed.wine)});onSaved();}
    catch(e){setError(adminError(e));if(e instanceof ApiError){setFieldErrors(Object.fromEntries(e.fieldErrors.map(item=>[item.field==='priceCents'?'price':item.field,item.message])));if(e.fieldErrors.some(item=>!['name','type','priceCents'].includes(item.field)))setDetails(true);}}
    finally{setPending(false);}
  };
  return <View style={s.panel}>
    <Text style={s.sectionTitle}>{wine?'Editar vinho':'Adicionar vinho'}</Text>
    {field('name','Nome do vinho')}
    <View style={s.row}>
      <AdminSelect label="Tipo do vinho" value={draft.type} onChange={value=>setDraft(prev=>({...prev,type:value}))} options={[{value:'',label:'Escolha o tipo'},...Object.entries(typeLabels).map(([value,label])=>({value,label}))]} disabled={pending}/>
      {field('price','Preço da garrafa (R$)',true)}
    </View>
    {fieldErrors.type&&<Text style={s.error}>{fieldErrors.type}</Text>}
    <AdminSelect label="Situação na carta" value={!flags.active?'hidden':flags.available?'available':'unavailable'} options={[{value:'available',label:'Disponível'},{value:'unavailable',label:'Sem estoque'},{value:'hidden',label:'Oculto da carta'}]} onChange={value=>setFlags(previous=>({...previous,active:value!=='hidden',available:value==='hidden'?previous.available:value==='available'}))} disabled={pending}/>
    <AdminButton title={details?'Fechar informações opcionais':'Informações do rótulo (opcional)'} variant="secondary" onPress={()=>setDetails(value=>!value)} disabled={pending}/>
    {details&&<>
      <AdminSelect label="Estilo (opcional)" value={draft.style} onChange={value=>setDraft(prev=>({...prev,style:value}))} options={styleOptions} disabled={pending}/>
      {fieldErrors.style&&<Text style={s.error}>{fieldErrors.style}</Text>}
      <View style={s.row}>{field('producer','Produtor')}{field('country','País')}{field('region','Região')}</View>
      {field('grapes','Uvas (separadas por vírgula)')}
      <View style={s.row}>{field('vintageYear','Safra',true)}<AdminSwitch label="Vinho sem safra" value={flags.nonVintage} onChange={value=>setFlags(prev=>({...prev,nonVintage:value}))} disabled={pending}/></View>
      <View style={s.row}>{field('body','Corpo (1–5)',true)}{field('acidity','Acidez (1–5)',true)}{field('tannin','Taninos (1–5)',true)}{field('sweetness','Doçura (1–5)',true)}</View>
      {field('pairings','Harmonizações (separadas por ponto e vírgula)')}
    </>}
    {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <View style={s.row}><AdminButton title={pending?'Salvando…':'Salvar vinho'} disabled={pending} onPress={()=>void save()}/><AdminButton title="Cancelar" variant="secondary" disabled={pending} onPress={onClose}/></View>
    {error&&wine&&<AdminButton title="Recarregar ficha atual" variant="secondary" disabled={pending} onPress={()=>void admin.request<AdminWine>(`admin/wines/${wine.wineId}`).then(current=>{setDraft(wineDraft(current));setVersion(current.version);setFlags({active:current.active,available:current.available,nonVintage:current.nonVintage});setFieldErrors({});setError('');}).catch(e=>setError(adminError(e)))}/>}
  </View>;
}
function CatalogContent(){
  const admin=useAdmin();
  const {request}=admin;
  const catalog=useCatalog();
  const [items,setItems]=useState<AdminWine[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);
  const [search,setSearch]=useState('');
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('');
  const [settledRequest,setSettledRequest]=useState('');
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [editor,setEditor]=useState<AdminWine|'new'|null>(null);
  const [revision,setRevision]=useState(0);
  const filtered=!!(query||status);
  const requestKey=JSON.stringify([page,query,status,revision]);
  const loading=settledRequest!==requestKey;

  useEffect(()=>{
    const controller=new AbortController();
    const filter=catalogFilter(status);
    request<{items:AdminWine[];total:number}>(`admin/wines?page=${page}&q=${encodeURIComponent(query)}&active=${filter.active}&available=${filter.available}`,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted){const lastPage=Math.max(1,Math.ceil(data.total/20));if(page>lastPage){setPage(lastPage);return;}setItems(data.items);setTotal(data.total);setError('');}})
      .catch(e=>{if(!controller.signal.aborted)setError(adminError(e));})
      .finally(()=>{if(!controller.signal.aborted)setSettledRequest(requestKey);});
    return()=>controller.abort();
  },[request,page,query,status,revision,requestKey]);

  useEffect(()=>{
    const timer=setTimeout(()=>{setQuery(search.trim());setPage(1);},250);
    return()=>clearTimeout(timer);
  },[search]);

  const refresh=()=>{setRevision(value=>value+1);void catalog.refresh().catch(()=>{});};
  const clearFilters=()=>{setSearch('');setQuery('');setStatus('');setPage(1);};

  if(editor)return <>
    <WineEditor key={editor==='new'?'new':editor.wineId} wine={editor==='new'?undefined:editor} onClose={()=>setEditor(null)} onSaved={()=>{const name=editor==='new'?'Novo vinho':editor.name;setEditor(null);setSuccess(`${name} salvo na carta.`);refresh();}}/>
  </>;

  return <>
    <View style={s.catalogToolbar}>
      <View style={s.row}>
        <AdminButton title="Adicionar vinho" onPress={()=>{setEditor('new');setSuccess('');}}/>
        <Link href="/admin/imports" style={s.link}>Importar arquivo</Link>
      </View>
      {admin.session&&<Link href={{pathname:'/e/[slug]',params:{slug:admin.session.tenant}}} style={s.link}>Ver carta →</Link>}
    </View>
    <View style={s.row}>
      <AdminField label="Buscar" placeholder="Nome do vinho ou uva" value={search} onChangeText={setSearch} onSubmitEditing={()=>{setQuery(search.trim());setPage(1);}}/>
      <AdminSelect label="Situação" value={status} onChange={value=>{setStatus(value);setPage(1);}} options={[{value:'',label:'Todos os vinhos'},{value:'available',label:'Disponíveis'},{value:'unavailable',label:'Sem estoque'},{value:'hidden',label:'Ocultos da carta'}]}/>
    </View>
    <View style={s.catalogToolbar}>
      <Text style={s.subtitle}>{loading?'Buscando…':`${total} ${total===1?'vinho':'vinhos'}${filtered?' encontrados':''}`}</Text>
      {(filtered||search)&&<AdminButton title="Limpar filtros" variant="secondary" onPress={clearFilters}/>}
    </View>
    {error&&!loading&&<View style={s.panel}><Text accessibilityRole="alert" style={s.error}>{error}</Text><AdminButton title="Tentar novamente" variant="secondary" onPress={refresh}/></View>}
    {success&&<Text accessibilityLiveRegion="polite" style={s.success}>{success}</Text>}
    {!loading&&!error&&!items.length&&<View style={s.panel}>
      <Text style={s.sectionTitle}>{filtered?'Nenhum vinho com essa busca':'Vamos montar sua carta?'}</Text>
      <Text style={s.subtitle}>{filtered?'Tente outro nome ou veja todos os vinhos.':'Adicione um vinho pelo nome, tipo e preço. Se você já tem uma carta em PDF ou planilha, envie o arquivo e nós organizamos a revisão.'}</Text>
      {filtered?<View style={s.row}><AdminButton title="Ver todos os vinhos" variant="secondary" onPress={clearFilters}/></View>:<Link href="/admin/imports" style={s.link}>Enviar minha carta →</Link>}
    </View>}
    {items.length>0&&<View style={s.catalogList}>{items.map((wine,index)=>{
      const state=catalogStatus(wine);
      return <View key={wine.wineId} style={[s.catalogItem,index===items.length-1&&s.catalogLastItem]}>
        <View style={s.catalogInfo}>
          <Text style={s.catalogName}>{wine.name}</Text>
          <Text style={s.subtitle}>{typeLabels[wine.type]}</Text>
        </View>
        <View style={s.catalogMeta}>
          <Text style={s.catalogPrice}>{money(wine.priceCents)}</Text>
          <Text style={wine.active&&wine.available?s.success:s.subtitle}>{state.label}</Text>
          <AdminButton title="Editar" variant="secondary" disabled={loading} onPress={()=>{setEditor(wine);setSuccess('');}}/>
        </View>
      </View>;
    })}</View>}
    {total>20&&<View style={s.row}>
      <AdminButton title="Anteriores" variant="secondary" disabled={page<=1||loading} onPress={()=>setPage(value=>value-1)}/>
      <Text style={s.subtitle}>Página {page} de {Math.max(1,Math.ceil(total/20))}</Text>
      <AdminButton title="Próximos" variant="secondary" disabled={page*20>=total||loading} onPress={()=>setPage(value=>value+1)}/>
    </View>}
  </>;
}
export function AdminCatalog(){return <AdminGate title="Sua carta"><CatalogContent/></AdminGate>;}

function SettingsContent(){
  const admin=useAdmin();
  const catalog=useCatalog();
  const [data,setData]=useState(admin.session!.establishment);
  const [saved,setSaved]=useState(admin.session!.establishment);
  const [more,setMore]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [success,setSuccess]=useState('');
  const [conflict,setConflict]=useState(false);
  const dirty=['name','welcome','notice','active'].some(key=>data[key as keyof typeof data]!==saved[key as keyof typeof saved]);
  function change<K extends keyof typeof data>(key:K,value:(typeof data)[K]){
    setData(previous=>({...previous,[key]:value}));setSuccess('');
    setFieldErrors(previous=>({...previous,[key]:''}));
  }
  const save=async()=>{
    if(busy||!dirty)return;
    const errors:Record<string,string>={};
    if(!data.name.trim())errors.name='Informe o nome do estabelecimento.';
    if(!data.welcome.trim())errors.welcome='Escreva uma mensagem para receber seus clientes.';
    if(!data.notice.trim())errors.notice='Informe o aviso que aparece no rodapé da carta.';
    setFieldErrors(errors);setError('');setSuccess('');setConflict(false);
    if(Object.keys(errors).length){if(errors.notice)setMore(true);return;}
    setBusy(true);
    try{
      const result=await admin.request<typeof data>('admin/establishment',{method:'PATCH',body:JSON.stringify({version:data.version,name:data.name,welcome:data.welcome,notice:data.notice,active:data.active})});
      setData(result);setSaved(result);setSuccess('Alterações salvas.');
      await Promise.allSettled([catalog.refresh(),admin.refresh()]);
    }catch(e){
      setError(adminError(e));
      if(e instanceof ApiError){setConflict(e.status===409);setFieldErrors(Object.fromEntries(e.fieldErrors.map(item=>[item.field,item.message])));if(e.fieldErrors.some(item=>['notice','active'].includes(item.field)))setMore(true);}
    }finally{setBusy(false);}
  };
  const reload=async()=>{
    if(busy)return;setBusy(true);setError('');
    try{const current=await admin.request<typeof data>('admin/establishment');setData(current);setSaved(current);setConflict(false);setFieldErrors({});setSuccess('Dados atualizados.');}
    catch(e){setError(adminError(e));}finally{setBusy(false);}
  };
  return <View style={s.settingsForm}>
    <View style={s.catalogToolbar}>
      <Text style={saved.active?s.success:s.subtitle}>{saved.active?'Carta visível para clientes':'Carta oculta para clientes'}</Text>
      <Link href={{pathname:'/e/[slug]',params:{slug:data.slug}}} style={s.link}>Ver carta →</Link>
    </View>
    <AdminField label="Nome do estabelecimento" value={data.name} error={fieldErrors.name} maxLength={120} editable={!busy} onChangeText={name=>change('name',name)}/>
    <AdminField label="Mensagem de boas-vindas" placeholder="Como você quer receber seus clientes?" value={data.welcome} error={fieldErrors.welcome} editable={!busy} maxLength={500} multiline onChangeText={welcome=>change('welcome',welcome)}/>
    <View style={s.settingsExtras}>
      <View style={s.row}><AdminButton title={more?'Fechar avisos e visibilidade':'Avisos e visibilidade da carta'} variant="secondary" disabled={busy} onPress={()=>setMore(value=>!value)}/></View>
      {more&&<>
        <AdminField label="Aviso no rodapé" value={data.notice} error={fieldErrors.notice} maxLength={500} editable={!busy} multiline onChangeText={notice=>change('notice',notice)}/>
        <AdminSwitch label="Mostrar a carta para clientes" value={data.active} onChange={active=>change('active',active)} disabled={busy}/>
        {!data.active&&<Text style={s.subtitle}>Com a carta oculta, os clientes não conseguem abri-la pelo link ou QR Code.</Text>}
      </>}
    </View>
    {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {conflict&&<><Text style={s.subtitle}>Carregar a versão atual substitui as alterações deste formulário.</Text><View style={s.row}><AdminButton title="Carregar versão atual" variant="secondary" onPress={()=>void reload()} disabled={busy}/></View></>}
    {success&&<Text accessibilityLiveRegion="polite" style={s.success}>{success}</Text>}
    {dirty&&<Text style={s.subtitle}>Você tem alterações para salvar.</Text>}
    <View style={s.row}>
      <AdminButton title={busy?'Salvando…':'Salvar alterações'} onPress={()=>void save()} disabled={busy||!dirty}/>
      {dirty&&<AdminButton title="Desfazer alterações" variant="secondary" disabled={busy} onPress={()=>{setData(saved);setFieldErrors({});setError('');setSuccess('');setConflict(false);}}/>}
    </View>
  </View>;
}
export function AdminSettings(){return <AdminGate title="Configurações"><SettingsContent/></AdminGate>;}
