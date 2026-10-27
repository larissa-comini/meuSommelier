const path=require('node:path');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {openStore,AdminError,STYLES,TYPES}=require('./admin-store.cjs');
const {importManager,FIELDS}=require('./imports.cjs');
async function readBody(req,limit=100000) {
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw new AdminError(413,'TOO_LARGE','O arquivo deve ter até 8 MB.');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function jsonBody(req) {if(!req.headers['content-type']?.startsWith('application/json'))throw new AdminError(415,'CONTENT_TYPE','Envie JSON.');try{return JSON.parse((await readBody(req,2*1024*1024)).toString('utf8'));}catch(error){if(error instanceof AdminError)throw error;throw new AdminError(400,'INVALID_JSON','Dados inválidos.');}}
const cookieToken=req=>String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('ms_admin='))?.slice(9);
const csvCell=value=>{const text=Array.isArray(value)?value.join(';'):String(value??'');return '"'+(/^[=+@\-\t\r]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"';};
function createAdminApi(options={}) {
  const store=options.store||openStore();const imports=importManager(store);const attempts=new Map();let importInFlight=0;
  function limit(req,route) {const key=`${req.socket.remoteAddress}:${route}`;const now=Date.now();let value=attempts.get(key);if(!value||now-value.start>60000)value={start:now,count:0};value.count++;attempts.set(key,value);if(value.count>10)throw new AdminError(429,'RATE_LIMIT','Muitas tentativas. Aguarde um minuto.');}
  const secure=process.env.NODE_ENV==='production'?'; Secure':'';
  const setCookie=(res,token,maxAge=28800)=>res.setHeader('Set-Cookie',`ms_admin=${token}; HttpOnly; SameSite=Lax; Path=/api/v1; Max-Age=${maxAge}${secure}`);
  async function handle(req,res,reply,allowedOrigins) {
    const url=new URL(req.url,'http://localhost');const route=url.pathname.replace(/^\/api\/v1/,'');
    if(!route.startsWith('/admin/')&&!route.startsWith('/auth/')&&!route.startsWith('/public/'))return false;
    try {
      const mutation=!['GET','HEAD','OPTIONS'].includes(req.method);
      if(mutation&&!allowedOrigins.has(req.headers.origin))throw new AdminError(403,'ORIGIN','Origem não autorizada para esta operação.');
      if(req.method==='GET'&&route==='/public/establishments') {reply(200,{items:store.listEstablishments()});return true;}
      if(req.method==='GET'&&route.startsWith('/public/establishments/')){const item=store.establishment(decodeURIComponent(route.slice(23)),true);if(!item)throw new AdminError(404,'NOT_FOUND','Estabelecimento não encontrado ou inativo.');reply(200,item);return true;}
      if(req.method==='POST'&&route==='/auth/login'){limit(req,'login');const body=await jsonBody(req);const session=store.login(body.email,body.password);setCookie(res,session.token);reply(200,{expiresAt:session.expiresAt});return true;}
      if(req.method==='POST'&&route==='/auth/password-reset/request'){
        limit(req,'reset');const body=await jsonBody(req);const result=store.requestReset(body.email);
        if(result){const directory=path.join(__dirname,'data','reset-outbox');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,randomUUID()+'.json'),JSON.stringify({email:String(body.email),url:`${process.env.PILOT_WEB_ORIGIN||'http://localhost:8081'}/admin/reset?token=${result.token}`,expiresAt:result.expiresAt},null,2),{mode:0o600});}
        reply(200,{message:'Se houver uma conta, a solicitação foi registrada. No piloto local, o responsável pelo ambiente fornece o link de recuperação.'});return true;
      }
      if(req.method==='POST'&&route==='/auth/password-reset/confirm'){limit(req,'reset-confirm');const body=await jsonBody(req);store.confirmReset(body.token,body.password);setCookie(res,'',0);reply(200,{message:'Senha atualizada. Entre novamente.'});return true;}
      const auth=store.authenticate(cookieToken(req),req.headers['x-csrf-token'],mutation);
      const tenant=auth.tenant;
      if(req.method==='POST'&&route==='/auth/logout'){store.logout(cookieToken(req));setCookie(res,'',0);reply(200,{ok:true});return true;}
      if(req.method==='GET'&&route==='/admin/me'){reply(200,{...auth,establishment:store.establishment(tenant)});return true;}
      if(req.method==='GET'&&route==='/admin/vocabularies'){reply(200,{types:TYPES,styles:STYLES,currencies:['BRL'],maxFileBytes:8*1024*1024,maxImportRows:500});return true;}
      if(route==='/admin/establishment'){
        const current=store.establishment(tenant);
        if(req.method==='GET'){reply(200,current);return true;}
        if(req.method==='PATCH'){
          const body=await jsonBody(req);if(body.version!==current.version)throw new AdminError(409,'VERSION_CONFLICT','O estabelecimento foi alterado. Recarregue antes de salvar.');
          const errors=[];for(const key of ['name','welcome','notice'])if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>(key==='name'?120:500))errors.push({field:key,message:'Preencha este campo dentro do limite.'});if(typeof body.active!=='boolean')errors.push({field:'active',message:'Informe o estado do estabelecimento.'});
          if(errors.length)throw new AdminError(400,'VALIDATION','Revise os campos.',errors);
          const {wines,version,...data}=current;void wines;void version;
          store.db.prepare('UPDATE establishments SET data=?,version=version+1 WHERE slug=?').run(JSON.stringify({...data,name:body.name.trim(),welcome:body.welcome.trim(),notice:body.notice.trim(),active:body.active}),tenant);
          reply(200,store.establishment(tenant));return true;
        }
      }
      if(req.method==='GET'&&route==='/admin/wines'){
        const page=Number(url.searchParams.get('page')||1),pageSize=Number(url.searchParams.get('pageSize')||20);
        if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new AdminError(400,'VALIDATION','Paginação inválida.');
        const query=(url.searchParams.get('q')||'').toLocaleLowerCase('pt-BR');const active=url.searchParams.get('active');const available=url.searchParams.get('available');
        const rows=store.establishment(tenant).wines.filter(w=>[w.name,w.sku,...w.grapes].join(' ').toLocaleLowerCase('pt-BR').includes(query)).filter(w=>!active||String(w.active)===active).filter(w=>!available||String(w.available)===available);
        reply(200,{items:rows.slice((page-1)*pageSize,page*pageSize),page,pageSize,total:rows.length});return true;
      }
      if(req.method==='POST'&&route==='/admin/wines'){reply(201,store.saveWine(tenant,await jsonBody(req)));return true;}
      if(route.startsWith('/admin/wines/')&&route!=='/admin/wines/export'){
        const id=decodeURIComponent(route.slice(13));
        if(req.method==='GET'){const wine=store.establishment(tenant).wines.find(w=>w.wineId===id);if(!wine)throw new AdminError(404,'NOT_FOUND','Vinho não encontrado.');reply(200,wine);return true;}
        if(req.method==='PUT'){reply(200,store.saveWine(tenant,await jsonBody(req),id));return true;}
      }
      if(req.method==='GET'&&(route==='/admin/import-template'||route==='/admin/wines/export')){
        const rows=route.endsWith('/export')?store.establishment(tenant).wines:[];
        const headers=['sku','name','type','style','priceCents','currency','active','available','producer','country','region','vintageYear','nonVintage','grapes','pairings','body','acidity','tannin','sweetness'];
        if(url.searchParams.get('format')==='xlsx'){
          const ExcelJS=require('exceljs');const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Carta');sheet.addRow(headers);for(const row of rows)sheet.addRow(headers.map(key=>Array.isArray(row[key])?row[key].join(';'):row[key]));const bytes=await book.xlsx.writeBuffer();res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="modelo-carta.xlsx"','Cache-Control':'no-store'});res.end(Buffer.from(bytes));
        }else{const text='\uFEFF'+[headers,...rows.map(row=>headers.map(key=>row[key]))].map(row=>row.map(csvCell).join(',')).join('\r\n');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="carta.csv"','Cache-Control':'no-store'});res.end(text);}return true;
      }
      if(route==='/admin/imports'){
        if(req.method==='GET'){reply(200,{items:imports.list(tenant)});return true;}
        if(req.method==='POST'){
          limit(req,'import');const contentType=req.headers['content-type']||'';if(!contentType.startsWith('multipart/form-data'))throw new AdminError(415,'CONTENT_TYPE','Envie um arquivo.');
          const buffer=await readBody(req,9*1024*1024);const form=await new Request('http://localhost',{method:'POST',headers:{'content-type':contentType},body:buffer}).formData();const file=form.get('file');if(!file||typeof file==='string')throw new AdminError(400,'FILE_REQUIRED','Selecione um arquivo.');
          if(importInFlight>=2)throw new AdminError(429,'IMPORT_BUSY','Há outros arquivos sendo processados. Aguarde um momento.');
          importInFlight++;try{reply(201,await imports.upload(tenant,file.name,Buffer.from(await file.arrayBuffer())));}finally{importInFlight--;}return true;
        }
      }
      const match=route.match(/^\/admin\/imports\/([^/]+)(?:\/(mapping|commit))?$/);
      if(match){if(req.method==='GET'&&!match[2]){reply(200,imports.get(tenant,match[1]));return true;}if(req.method==='PUT'&&match[2]==='mapping'){reply(200,imports.update(tenant,match[1],await jsonBody(req)));return true;}if(req.method==='POST'&&match[2]==='commit'){reply(200,imports.commit(tenant,match[1],await jsonBody(req)));return true;}}
      throw new AdminError(404,'NOT_FOUND','Rota não encontrada.');
    }catch(error){const known=error instanceof AdminError;reply(known?error.status:500,{error:{code:known?error.code:'INTERNAL',message:known?error.message:'Não foi possível concluir a operação.',fieldErrors:known?error.fieldErrors:[],requestId:randomUUID()}});return true;}
  }
  return {store,handle,fields:FIELDS};
}
module.exports={createAdminApi,jsonBody,cookieToken,csvCell};
