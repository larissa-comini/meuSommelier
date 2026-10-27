const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function parseCsv(text) {
  const firstLine = text.split(/\r?\n/)[0];
  const separator = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i=0;i<text.length;i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i+1] === '"') { cell+='"'; i++; } else quoted=!quoted; }
    else if (char===separator && !quoted) { row.push(cell); cell=''; }
    else if ((char==='\n'||char==='\r') && !quoted) { if (char==='\r' && text[i+1]==='\n') i++; row.push(cell); if(row.some(v=>v.trim())) rows.push(row); row=[];cell=''; }
    else cell+=char;
    if (rows.length > 501 || row.length > 50 || cell.length > 4000) throw new Error('Limite de 500 linhas, 50 colunas e 4.000 caracteres por célula.');
  }
  if (quoted) throw new Error('CSV com aspas não fechadas.');
  row.push(cell); if(row.some(v=>v.trim())) rows.push(row);
  return tableToRows(rows);
}
function tableToRows(table) {
  if (!table.length) throw new Error('O arquivo não contém linhas.');
  const columns = table[0].map((value,index) => String(value ?? '').replace(/^\uFEFF/,'').trim() || `Coluna ${index+1}`);
  if (columns.length>50 || new Set(columns).size!==columns.length) throw new Error('Use até 50 colunas com nomes distintos.');
  return { columns, rows: table.slice(1).filter(row=>row.some(value=>String(value??'').trim())).map(row=>Object.fromEntries(columns.map((key,index)=>[key,String(row[index]??'').slice(0,4000)]))), warnings: [] };
}
function pdfRows(text) {
  if (!text.trim()) throw new Error('PDF sem texto extraível. Se for escaneado, aplique OCR antes de importar.');
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const rows=[]; const unparsed=[];
  for(let index=0;index<lines.length;index++) {
    const line=lines[index];
    const match=line.match(/^(.*?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}|\d{2,5})\s*$/);
    if(match && match[1].trim()) rows.push({ nome:match[1].trim(), preco:match[2], sku:'', tipo:'', estilo:'', origem:line });
    else unparsed.push(line);
  }
  if(!rows.length) throw new Error('Não identifiquei linhas com nome e preço no PDF. Exporte uma planilha ou CSV, ou organize cada vinho com seu preço na mesma linha.');
  return { columns:['sku','nome','tipo','estilo','preco','origem'],rows,warnings:[`Extração de PDF exige revisão: confira preços e nomes e preencha SKU, tipo e estilo. ${unparsed.length} linha(s) sem nome e preço não viraram registros.`,...unparsed.slice(0,15).map(line=>`Texto não importado: ${line.slice(0,180)}`)] };
}
async function parseFile(filename, buffer) {
  const extension=filename.toLowerCase().split('.').pop();
  let result;
  if(extension==='csv') result=parseCsv(buffer.toString('utf8'));
  else if(extension==='xml') {
    const text=buffer.toString('utf8');
    if(/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('XML com declarações de entidades não é aceito.');
    const { XMLParser,XMLValidator }=require('fast-xml-parser');
    if(XMLValidator.validate(text)!==true) throw new Error('XML inválido.');
    const parsed=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false,parseAttributeValue:false}).parse(text);
    let records=[];
    function visit(value,depth=0) {
      if(depth>12) throw new Error('Estrutura XML muito profunda.');
      if(Array.isArray(value)) { if(value.every(row=>row&&typeof row==='object'&&!Array.isArray(row))) { records=value;return; } }
      if(value&&typeof value==='object') for(const [key,item] of Object.entries(value)) {
        if(['wine','vinho','produto','item','row','record','prod'].includes(key.toLowerCase())) { const list=Array.isArray(item)?item:[item]; if(list.every(v=>v&&typeof v==='object')) { records=list;return; } }
        visit(item,depth+1); if(records.length) return;
      }
    }
    visit(parsed);
    if(!records.length) throw new Error('Não encontrei registros de vinho ou produto no XML.');
    const flatten=(row,prefix='',depth=0)=>Object.fromEntries(Object.entries(row).flatMap(([key,value])=>value&&typeof value==='object'&&depth<3?Object.entries(flatten(value,`${prefix}${key}.`,depth+1)):[[`${prefix}${key}`,typeof value==='object'?'':String(value??'')]]));
    const rows=records.map(row=>flatten(row)); const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
    result={columns,rows,warnings:['Confira o significado do preço e a moeda antes de confirmar. XML fiscal pode conter preço unitário de compra, diferente do preço da carta.']};
  } else if(extension==='xlsx') {
    const ExcelJS=require('exceljs'); const book=new ExcelJS.Workbook();
    await book.xlsx.load(buffer,{ignoreNodes:['drawing','picture','extLst']});
    const sheet=book.worksheets.find(item=>item.state==='visible'&&item.actualRowCount);
    if(!sheet) throw new Error('A planilha não tem uma aba visível com dados.');
    if(sheet.rowCount>501||sheet.columnCount>50) throw new Error('Limite de 500 linhas e 50 colunas.');
    const table=[];
    sheet.eachRow(row=>{ const cells=[]; for(let i=1;i<=sheet.columnCount;i++) { const cell=row.getCell(i); if(cell.type===ExcelJS.ValueType.Formula) throw new Error('Remova fórmulas e cole os valores antes de importar.'); cells.push(cell.value instanceof Date?String(cell.value.getUTCFullYear()):cell.text); } table.push(cells); });
    result=tableToRows(table); result.warnings.push(`Aba importada: ${sheet.name}. Outras abas não foram importadas.`);
  } else if(extension==='pdf') {
    const { PDFParse }=require('pdf-parse'); const parser=new PDFParse({data:new Uint8Array(buffer)});
    try { const info=await parser.getInfo(); if(info.total>30) throw new Error('PDF limitado a 30 páginas.'); const content=await parser.getText(); const text=content.pages.map(page=>page.text).join('\n'); if(text.length>200000) throw new Error('PDF com texto demais. Separe o arquivo.'); result=pdfRows(text); }
    finally { await parser.destroy(); }
  } else throw new Error('Escolha PDF, XML, XLSX ou CSV.');
  if(!result.rows.length) throw new Error('O arquivo não tem linhas de dados.');
  if(result.rows.length>500||result.columns.length>50) throw new Error('Limite de 500 linhas e 50 colunas.');
  return result;
}
if(require.main===module&&process.send)process.once('message',input=>parseFile(input.name,Buffer.from(input.buffer)).then(result=>process.send({result})).catch(error=>process.send({error:error.message})));
module.exports={parseFile,parseCsv,pdfRows,normalize};
