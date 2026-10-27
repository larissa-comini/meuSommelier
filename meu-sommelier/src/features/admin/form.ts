import type { AdminWine } from './types';
export const styleOptions=[{value:'',label:'Selecione o estilo'},{value:'seco',label:'Seco'},{value:'meio_seco',label:'Meio seco'},{value:'doce',label:'Doce'},{value:'brut',label:'Brut'},{value:'demi_sec',label:'Demi-sec'}];
export type WineDraft = Record<string,string> & { sku:string;name:string;type:string;style:string;price:string };
export function wineDraft(wine?:AdminWine):WineDraft {return Object.fromEntries(['sku','name','type','style','producer','country','region','vintageYear','body','acidity','tannin','sweetness'].map(key=>[key,String(wine?.[key as keyof AdminWine]??'')]).concat([['price',wine?(wine.priceCents/100).toFixed(2).replace('.',','):''],['grapes',wine?.grapes.join(', ')??''],['pairings',wine?.pairings.join('; ')??'']])) as WineDraft;}
export function parseWineDraft(draft:WineDraft, flags:{active:boolean;available:boolean;nonVintage:boolean}, version=0) {
  const errors:Record<string,string>={};
  if(!draft.sku.trim()||draft.sku.length>80)errors.sku='Informe um SKU de até 80 caracteres.';
  if(!draft.name.trim()||draft.name.length>160)errors.name='Informe um nome de até 160 caracteres.';
  if(!['red','white','rose','sparkling','fortified'].includes(draft.type))errors.type='Selecione o tipo.';
  if(!styleOptions.some(option=>option.value&&option.value===draft.style))errors.style='Selecione o estilo.';
  const priceCents=/^\d+(?:[.,]\d{1,2})?$/.test(draft.price.trim())?Math.round(Number(draft.price.replace(',','.'))*100):NaN;
  if(!Number.isSafeInteger(priceCents)||priceCents<0||priceCents>10000000)errors.price='Informe um preço válido, como 129,90.';
  for(const key of ['body','acidity','tannin','sweetness'])if(draft[key]&&(!Number.isInteger(Number(draft[key]))||Number(draft[key])<1||Number(draft[key])>5))errors[key]='Informe de 1 a 5 ou deixe vazio.';
  if(draft.vintageYear&&(!/^\d{4}$/.test(draft.vintageYear)||Number(draft.vintageYear)<1800||Number(draft.vintageYear)>new Date().getFullYear()+1))errors.vintageYear='Safra inválida.';
  if(flags.nonVintage&&draft.vintageYear)errors.vintageYear='Apague a safra para marcar não safrado.';
  const wine={sku:draft.sku.trim(),name:draft.name.trim(),type:draft.type,style:draft.style,priceCents,currency:'BRL',version,...flags,...Object.fromEntries(['producer','country','region'].map(key=>[key,draft[key].trim()||null])),...Object.fromEntries(['vintageYear','body','acidity','tannin','sweetness'].map(key=>[key,draft[key]?Number(draft[key]):null])),grapes:draft.grapes.split(',').map(value=>value.trim()).filter(Boolean),pairings:draft.pairings.split(';').map(value=>value.trim()).filter(Boolean)};
  return {errors,wine};
}
