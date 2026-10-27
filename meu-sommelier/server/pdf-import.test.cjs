const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseFile,pdfRows}=require('./import-parser.cjs');

// Names are drawn before the price column, as in designer-exported menus.
function columnPdf() {
  const commands=[
    [50,750,'TINTO'],
    [50,700,'Reserva de Teste'],[50,686,'(Portugal)'],[50,672,'Produtor, Regiao'],
    [50,620,'Outro Vinho (Brasil)'],[50,606,'Outro Produtor, Regiao'],
    [50,550,'TAMANHOS ESPECIAIS'],[50,510,'Vinho Pequeno (Brasil)'],
    [50,450,'TAXA DE ROLHA'],[50,420,'TAXA DE SERVICO'],
    [450,700,'1.207'],[450,620,'129,90'],[450,510,'49'],
    [450,450,'80'],[450,420,'12%'],
  ];
  const escape=text=>text.replace(/[\\()]/g,'\\$&');
  const stream=commands.map(([x,y,text])=>`BT /F1 12 Tf ${x} ${y} Td (${escape(text)}) Tj ET`).join('\n');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf='%PDF-1.4\n';const offsets=[];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(pdf);
  pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test('PDF associa preços pela posição, preserva nome quebrado e exclui taxas',async()=>{
  const result=await parseFile('carta.pdf',columnPdf());
  assert.deepEqual(result.rows.map(({nome,preco,tipo})=>({nome,preco,tipo})),[
    {nome:'Reserva de Teste (Portugal)',preco:'1207',tipo:'red'},
    {nome:'Outro Vinho (Brasil)',preco:'129,90',tipo:'red'},
    {nome:'Vinho Pequeno (Brasil)',preco:'49',tipo:''},
  ]);
});

test('PDF preserva preços brasileiros e não agrega nome através de outra página',()=>{
  const result=pdfRows('BRANCOS\nVinho A (Chile) R$ 1.207,90\nVinho B (Brasil) 165\nNome incompleto\t200\n\f\n(Portugal)\nTINTO\nVinho C (Brasil) 175.90');
  assert.deepEqual(result.rows.map(row=>row.preco),['1.207,90','165','200','175.90']);
  assert.equal(result.rows[2].nome,'Nome incompleto');
  assert.equal(result.rows[0].tipo,'white');
  assert.equal(result.rows[3].tipo,'red');
});
