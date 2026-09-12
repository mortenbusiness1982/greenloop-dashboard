'use client';
import {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import type {Outcomes} from '@/lib/curationOutcomes';
import {EvidenceThumbnail} from './EvidenceThumbnail';

export function LatestImprovements({items,language,format,onProduct}:{items:Outcomes['recentImprovements'];language:'en'|'es';format:(at:string)=>string;onProduct:(barcode:string)=>void}){
 const [expanded,setExpanded]=useState(false),es=language==='es';
 const labels={name:es?'Nombre':'Name',brand:es?'Marca':'Brand',packaging:es?'Envase':'Packaging',photo:es?'Foto publicada':'Photo published'};
 return <section aria-label={es?'Últimas mejoras':'Latest improvements'} className='bg-white p-4'>
  <div className='flex items-center justify-between gap-3'><h2 className='font-semibold'>{es?'Últimas mejoras':'Latest improvements'}</h2>{items&&items.length>5?<button aria-expanded={expanded} onClick={()=>setExpanded(!expanded)} className='min-h-11 shrink-0 text-sm font-semibold text-emerald-800'>{expanded?(es?'Ver menos':'Show less'):(es?'Ver todas':'See all')}</button>:null}</div>
  {!items?<p className='py-3 text-sm text-stone-500'>{es?'Historial no disponible':'History unavailable'}</p>:items.length===0?<p className='py-3 text-sm text-stone-500'>{es?'Aún no hay mejoras aplicadas':'No applied improvements yet'}</p>:<ul className='divide-y'>
   {items.slice(0,expanded?20:5).map(p=><li key={p.productId}><button onClick={()=>onProduct(p.barcode)} className='flex min-h-20 w-full items-center gap-3 py-3 text-left hover:bg-stone-50'>
    <EvidenceThumbnail barcode={p.barcode} language={language} revision={Date.parse(p.at)}/>
    <span className='min-w-0 flex-1'><strong className='block break-words'>{p.name&&p.name!==p.barcode?p.name:p.barcode}</strong><span className='block text-xs text-stone-500'>{p.barcode}</span>
     {p.fields.map((f,i)=><span key={i} className='mt-1 block break-words text-sm'><span className='font-medium'>{labels[f.field]}</span>{f.value?': '+f.value.replace(/_/g,' '):''}</span>)}
     <time dateTime={p.at} className='mt-1 block text-xs text-stone-500'>{format(p.at)}</time>
    </span><ChevronRight size={18} className='shrink-0 text-stone-500'/>
   </button></li>)}
  </ul>}
 </section>;
}
