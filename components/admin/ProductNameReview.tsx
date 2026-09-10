'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,ExternalLink,Loader2} from 'lucide-react';
import {apiFetch} from '@/lib/api';
import {getToken} from '@/lib/auth';
type Suggestion={name:string;source:string;url:string|null;kind:string};
export function ProductNameReview({barcode,language,disabled,onConfirm}:{barcode:string;language:'en'|'es';disabled:boolean;onConfirm:(name:string)=>void}){
 const es=language==='es';
 const [name,setName]=useState(''),[suggestions,setSuggestions]=useState<Suggestion[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const edited=useRef(false);
 useEffect(()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  let active=true;edited.current=false;setName('');setSuggestions([]);setLoading(true);setFailed(false);
  apiFetch<{barcode:string;suggestions:Suggestion[];readOnly:boolean;enrichment:boolean;lookupStatus:string}>('/admin/recycling-intelligence/review/'+barcode+'/name-suggestions',{token:getToken()||undefined,signal:controller.signal,cache:'no-store'}).then(result=>{
   if(!active)return;
   if(result.barcode!==barcode||result.readOnly!==true||result.enrichment!==false||!Array.isArray(result.suggestions))throw Error();
   setSuggestions(result.suggestions);setFailed(result.lookupStatus==='unavailable');
   if(!edited.current&&result.suggestions[0])setName(result.suggestions[0].name);
  }).catch(()=>{if(active)setFailed(true);}).finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[barcode]);
 const selected=suggestions.find(s=>s.name===name);
 const sourceUrl=selected?.url&&/^https:\/\/(www\.compraonline\.alcampo\.es|onlinebutikken\.com|world\.openfoodfacts\.org)\//.test(selected.url)?selected.url:null;
 return <section className='space-y-2'>
  <label className='block font-semibold' htmlFor='review-product-name'>{es?'Nombre del producto':'Product name'}</label>
  <input id='review-product-name' disabled={disabled} maxLength={180} value={name} onChange={e=>{edited.current=true;setName(e.target.value);}} className='min-h-11 w-full rounded border border-stone-300 bg-white px-3 text-base' placeholder={es?'Nombre pendiente':'Name needed'}/>
  {loading?<p role='status' className='flex items-center gap-2 text-sm text-stone-500'><Loader2 size={16} className='animate-spin'/>{es?'Buscando nombre…':'Looking up name…'}</p>:selected?<p className='text-xs text-stone-500'>{es?'Sugerencia de ':'Suggested by '}{sourceUrl?<a href={sourceUrl} target='_blank' rel='noopener noreferrer' referrerPolicy='no-referrer' className='inline-flex items-center gap-1 underline'>{selected.source}<ExternalLink size={12}/></a>:selected.source}</p>:!name?<p className='text-xs text-stone-500'>{failed?(es?'La búsqueda no está disponible. Puedes escribir el nombre.':'Lookup unavailable. You can enter the name.'):(es?'No se encontró un nombre. Puedes escribirlo.':'No name found. You can enter it.')}</p>:null}
  {suggestions.length>1?<select aria-label={es?'Otros nombres sugeridos':'Other suggested names'} disabled={disabled} value={selected?.name||''} onChange={e=>{edited.current=true;setName(e.target.value);}} className='min-h-11 w-full rounded border bg-white px-2'><option value=''>{es?'Otras sugerencias':'Other suggestions'}</option>{suggestions.map(s=><option key={s.name} value={s.name}>{s.name} · {s.source}</option>)}</select>:null}
  <button disabled={disabled||name.trim().length<2||name.trim()===barcode} onClick={()=>onConfirm(name.trim())} className='inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-white disabled:opacity-50'><Check size={18}/>{es?'Confirmar nombre':'Confirm name'}</button>
 </section>;
}
