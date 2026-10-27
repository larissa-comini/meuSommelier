const { randomUUID }=require('node:crypto');
const { fork }=require('node:child_process');
const path=require('node:path');
const { AdminError,validateWine }=require('./admin-store.cjs');
const { normalize }=require('./import-parser.cjs');
const FIELDS=['sku','name','type','style','price','currency','active','available','producer','country','region','vintageYear','nonVintage','grapes','pairings','body','acidity','tannin','sweetness'];
const aliases={sku:['sku','codigo','cod','cprod'],name:['name','nome','vinho','produto','xprod'],type:['type','tipo'],style:['style','estilo'],price:['price','preco','valor','pricecents','vuncom'],currency:['currency','moeda'],active:['active','ativo'],available:['available','disponivel'],producer:['producer','produtor'],country:['country','pais'],region:['region','regiao'],vintageYear:['vintageyear','safra'],nonVintage:['nonvintage','naosafrado'],grapes:['grapes','uvas','uva'],pairings:['pairings','harmonizacoes'],body:['body','corpo'],acidity:['acidity','acidez'],tannin:['tannin','taninos'],sweetness:['sweetness','docura']};
function parsePrice(value,centavos=false) {
  let text=String(value??'').trim().replace(/^R\$\s*/, '');
  if(centavos) return /^\d+$/.test(text)?Number(text):NaN;
  if(/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(text)) text=text.replace(/\./g,'').replace(',','.');
  else if(/^\d+(?:[.,]\d{1,2})?$/.test(text)) text=text.replace(',','.');
  else return NaN;
  return Math.round(Number(text)*100);
}
const bool=(value,fallback)=> value===''?fallback:['sim','true','1','yes','ativo','disponivel'].includes(normalize(value))?true:['nao','false','0','no','inativo','indisponivel'].includes(normalize(value))?false:null;
function parseUpload(name,buffer) {
  return new Promise((resolve,reject)=>{
    const worker=fork(path.join(__dirname,'import-parser.cjs'),[],{execArgv:['--max-old-space-size=192'],stdio:['ignore','ignore','ignore','ipc'],serialization:'advanced',windowsHide:true});
    const timer=setTimeout(()=>{ worker.kill(); reject(new AdminError(400,'PARSING_TIMEOUT','O arquivo demorou demais para ser lido. Separe em arquivos menores.')); },20000);
    worker.once('message',message=>{clearTimeout(timer);worker.kill();if(message.error)reject(new AdminError(400,'FILE_INVALID',message.error));else resolve(message.result);});
    worker.once('error',()=>{clearTimeout(timer);reject(new AdminError(400,'FILE_INVALID','Não foi possível ler o arquivo. Confira o formato e o tamanho.'));});
    worker.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(new AdminError(400,'FILE_INVALID','Não foi possível ler o arquivo.'));});
    worker.send({name,buffer});
  });
}
function importManager(store) {
  const {db}=store;
  function get(tenant,id) {const row=db.prepare('SELECT data FROM imports WHERE id=? AND tenant=?').get(id,tenant);if(!row)throw new AdminError(404,'NOT_FOUND','Importação não encontrada.');return JSON.parse(row.data);}
  const persist=item=>db.prepare('UPDATE imports SET data=? WHERE id=? AND tenant=?').run(JSON.stringify(item),item.id,item.tenant);
  function preview(item) {
    const seen=new Set(); const errors=[];const current=store.establishment(item.tenant);
    const rows=item.rows.map((raw,index)=>{
      const field=name=>String(raw[item.mapping[name]]??'').trim();
      const rawType=normalize(field('type')||item.defaults.type||'');
      const type=({tinto:'red',branco:'white',rose:'rose',espumante:'sparkling',fortificado:'fortified'})[rawType]||rawType;
      const year=field('vintageYear');
      const wine={sku:field('sku')||(item.defaults.generateSku?`IMP-${item.id.slice(0,8)}-${index+1}`:''),name:field('name'),type,style:field('style')||item.defaults.style||'',priceCents:parsePrice(field('price'),normalize(item.mapping.price)==='pricecents'),currency:field('currency')||'BRL',active:bool(field('active'),true),available:bool(field('available'),true),nonVintage:bool(field('nonVintage'),false),vintageYear:year?Number(year):null,producer:field('producer')||null,country:field('country')||null,region:field('region')||null,grapes:field('grapes')?field('grapes').split(/[,;]/).map(v=>v.trim()).filter(Boolean):[],pairings:field('pairings')?field('pairings').split(';').map(v=>v.trim()).filter(Boolean):[],...Object.fromEntries(['body','acidity','tannin','sweetness'].map(key=>[key,field(key)?Number(field(key)):null]))};
      let rowErrors=[];
      try {validateWine(wine);if(seen.has(wine.sku))throw new AdminError(400,'DUPLICATE','SKU repetido no arquivo.',[{field:'sku',message:'SKU repetido no arquivo.'}]);seen.add(wine.sku);}catch(error){rowErrors=error.fieldErrors||[{field:'row',message:error.message}];}
      errors.push(...rowErrors.map(error=>({row:index+2,...error,code:'VALIDATION'})));
      const existing=current.wines.find(value=>value.sku===wine.sku);
      return {row:index+2,wine,action:existing?'update':'create',valid:!rowErrors.length};
    });
    return {...item,preview:rows,errors,totals:{created:rows.filter(row=>row.valid&&row.action==='create').length,updated:rows.filter(row=>row.valid&&row.action==='update').length,ignored:0,error:rows.filter(row=>!row.valid).length},status:errors.length?'validating':'ready'};
  }
  async function upload(tenant,name,buffer) {
    if(buffer.length>8*1024*1024)throw new AdminError(413,'FILE_TOO_LARGE','O arquivo deve ter até 8 MB.');
    const parsed=await parseUpload(name,buffer);
    const mapping=Object.fromEntries(FIELDS.map(field=>[field,parsed.columns.find(column=>aliases[field].includes(normalize(column.split('.').pop())))||'']));
    const item=preview({id:randomUUID(),tenant,name:name.slice(0,160),version:1,catalogVersion:store.establishment(tenant).version,mapping,defaults:{type:'',style:'',generateSku:false},columns:parsed.columns,rows:parsed.rows,warnings:parsed.warnings,createdAt:new Date().toISOString()});
    db.prepare('INSERT INTO imports VALUES(?,?,?)').run(item.id,tenant,JSON.stringify(item));return item;
  }
  function update(tenant,id,body) {
    const item=get(tenant,id);if(['completed','rolled_back'].includes(item.status))throw new AdminError(409,'IMPORT_CLOSED','Esta importação já foi concluída.');
    if(body.version!==item.version)throw new AdminError(409,'VERSION_CONFLICT','A prévia mudou. Recarregue a importação.');
    if(!body.mapping||typeof body.mapping!=='object'||Object.values(body.mapping).some(column=>column!==''&&!item.columns.includes(column)))throw new AdminError(400,'VALIDATION','Mapeamento inválido.');
    const defaults={type:body.defaults?.type||'',style:body.defaults?.style||'',generateSku:body.defaults?.generateSku===true};
    if(body.corrections) for(const correction of body.corrections) {if(!Number.isInteger(correction.index)||!item.rows[correction.index]||!item.columns.includes(correction.column)||typeof correction.value!=='string'||correction.value.length>4000)throw new AdminError(400,'VALIDATION','Correção inválida.');item.rows[correction.index][correction.column]=correction.value;}
    const result=preview({...item,mapping:Object.fromEntries(FIELDS.map(field=>[field,body.mapping[field]||''])),defaults,version:item.version+1,catalogVersion:store.establishment(tenant).version});persist(result);return result;
  }
  function commit(tenant,id,body) {
    const item=get(tenant,id);if(item.status==='completed')return item;
    if(item.status==='rolled_back'||body.version!==item.version)throw new AdminError(409,'VERSION_CONFLICT','A prévia mudou. Recarregue e confira novamente.');
    if(store.establishment(tenant).version!==item.catalogVersion)throw new AdminError(409,'CATALOG_CHANGED','A carta mudou desde a prévia. Revalide antes de confirmar.');
    const checked=preview(item);if(checked.errors.length&&!body.ignoreInvalidRows)throw new AdminError(400,'INVALID_ROWS','Corrija as linhas ou escolha ignorar as inválidas.');
    const valid=checked.preview.filter(row=>row.valid);if(!valid.length)throw new AdminError(400,'EMPTY_IMPORT','Não há linhas válidas para importar.');
    db.exec('BEGIN IMMEDIATE');
    try {for(const row of valid){const existing=store.establishment(tenant).wines.find(w=>w.sku===row.wine.sku);store.saveWine(tenant,{...row.wine,version:existing?.version},existing?.wineId);}const result={...checked,status:'completed',version:item.version+1,completedAt:new Date().toISOString(),totals:{...checked.totals,ignored:checked.totals.error},rollbackEligible:false};persist(result);db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
  }
  return {get,upload,update,commit,list:tenant=>db.prepare('SELECT data FROM imports WHERE tenant=? ORDER BY rowid DESC LIMIT 20').all(tenant).map(row=>{const item=JSON.parse(row.data);return {id:item.id,name:item.name,status:item.status,createdAt:item.createdAt,totals:item.totals};})};
}
module.exports={importManager,parseUpload,parsePrice,FIELDS};
