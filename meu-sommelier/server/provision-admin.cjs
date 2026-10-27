const { randomBytes }=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {openStore}=require('./admin-store.cjs');
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,index,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[index+1]]]:pairs,[]));
if(!args.email||!args.slug||!args.name){console.error('Uso: npm run admin:create -- --email email --slug identificador --name "Nome" --establishment "Estabelecimento"');process.exitCode=1;}
else{
  const store=openStore();
  try{const password=randomBytes(18).toString('base64url');const result=store.provision({email:args.email,slug:args.slug,name:args.name,establishmentName:args.establishment,password});const target=path.join(__dirname,'admin-access-'+args.slug+'.local.txt');fs.writeFileSync(target,`Meu Sommelier · acesso administrativo local\n\nPágina: http://localhost:8081/admin/login\nE-mail: ${result.email}\nSenha inicial: ${password}\nEstabelecimento: ${args.establishment||args.slug}\n\nArquivo privado, ignorado pelo Git. Guarde a senha com segurança.\n`,{mode:0o600,flag:'wx'});console.log('Acesso criado. Credenciais no arquivo admin-access do estabelecimento, dentro de server/.');}catch(error){console.error(error.message);process.exitCode=1;}finally{store.close();}
}
