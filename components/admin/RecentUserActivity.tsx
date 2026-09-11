'use client';
import {useEffect,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {apiFetch} from '@/lib/api';
import {getToken} from '@/lib/auth';
import {createRefreshController} from '@/lib/refreshController';
import {EvidenceThumbnail} from './EvidenceThumbnail';
import {Photo} from './ProductReviewPhoto';

type Kind='recycled'|'scans'|'submissions';
type Activity={kind:Kind;asOf:string;readOnly:boolean;enrichment:boolean;items:{id:string;barcode:string;name:string|null;userName:string|null;unattributed:boolean;occurredAt:string;units:number;photo?:{url:string;authenticated:boolean}}[]};
type Props={language:'en'|'es';format:(value:string)=>string;onProduct:(barcode:string)=>void};

function ActivityList({language,format,onProduct}:Props){
 const es=language==='es',t=(en:string,sp:string)=>es?sp:en;
 const [kind,setKind]=useState<Kind>('recycled'),[all,setAll]=useState(false);
 const [data,setData]=useState<Activity|null>(null),[error,setError]=useState(false);
 useEffect(()=>{
  setData(null);setError(false);setAll(false);
  const controller=createRefreshController(async(signal)=>{
   const token=getToken();if(!token)throw Error('Sign in required');
   const result=await apiFetch<Activity>('/admin/recycling-intelligence/activity?kind='+kind,{token,signal,cache:'no-store'});
   if(result.kind!==kind||result.readOnly!==true||result.enrichment!==false||!Array.isArray(result.items))throw Error('Invalid activity');
   return result;
  },setData,state=>setError(!!state.error),{window,document});
  void controller.refresh();return()=>controller.dispose();
 },[kind]);
 return <div className='pt-2'>
  <label className='sr-only' htmlFor='activity-kind'>{t('Activity type','Tipo de actividad')}</label>
  <select id='activity-kind' value={kind} onChange={e=>setKind(e.target.value as Kind)} className='min-h-11 w-full rounded border bg-white px-3 text-sm sm:w-auto'>
   <option value='recycled'>{t('Recycled products','Productos reciclados')}</option><option value='scans'>{t('Scans','Escaneos')}</option><option value='submissions'>{t('Photo submissions','Fotos enviadas')}</option>
  </select>
  {error?<p role='alert' className='mt-2 text-sm text-amber-800'>{t('Activity could not refresh.','No se pudo actualizar la actividad.')}</p>:null}
  {!data&&!error?<p className='py-3 text-sm'>{t('Loading…','Cargando…')}</p>:null}
  {data?<><p className='mt-2 text-xs text-stone-500'>{t('Latest 20','Últimos 20')} · {format(data.asOf)}</p>
   <ul className='mt-2 divide-y'>{data.items.slice(0,all?20:5).map(item=><li key={item.id}><button onClick={()=>onProduct(item.barcode)} className='flex min-h-20 w-full items-center gap-3 py-3 text-left'>
    {kind==='submissions'&&item.photo?<span className='inline-flex h-16 w-16 shrink-0 items-center justify-center rounded bg-stone-100'><Photo photo={item.photo} language={language} thumbnail/></span>:<EvidenceThumbnail barcode={item.barcode} language={language}/>}
    <span className='min-w-0 flex-1 break-words'><strong className='block text-sm'>{item.name&&item.name!==item.barcode?item.name:item.barcode}</strong><span className='block text-sm text-stone-600'>{item.userName||t('Unattributed user','Usuario sin atribuir')}{kind==='recycled'&&item.units>1?` · ${item.units} ${t('items','artículos')}`:''}</span><span className='block text-xs text-stone-500'>{format(item.occurredAt)}</span></span>
    <ChevronRight size={18} className='shrink-0' aria-hidden='true'/>
   </button></li>)}</ul>
   {!data.items.length?<p className='py-3 text-sm text-stone-600'>{t('No recent activity.','No hay actividad reciente.')}</p>:null}
   {data.items.length>5?<button className='min-h-11 text-sm font-medium text-emerald-800 underline' onClick={()=>setAll(v=>!v)}>{all?t('Show less','Ver menos'):t('See all','Ver todo')}</button>:null}
  </>:null}
 </div>;
}

export function RecentUserActivity(props:Props){
 const [open,setOpen]=useState(false);
 return <details className='bg-white p-4' onToggle={e=>setOpen(e.currentTarget.open)}><summary className='min-h-11 cursor-pointer py-2 font-semibold'>{props.language==='es'?'Actividad reciente de usuarios':'Recent user activity'}</summary>{open?<ActivityList {...props}/>:null}</details>;
}
