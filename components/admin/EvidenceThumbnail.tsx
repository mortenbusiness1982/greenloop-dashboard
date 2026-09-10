'use client';
import {useEffect,useRef,useState} from 'react';
import {getToken} from '@/lib/auth';
import {apiFetch} from '@/lib/api';
import {ReviewData} from '@/lib/curationReview';
import {Photo} from './ProductReviewPhoto';
import {ImageOff,Loader2} from 'lucide-react';
// Internal evidence is independent of publication approval. Load only visible rows.
export function EvidenceThumbnail({barcode,language,revision}:{barcode:string;language:'en'|'es';revision?:number|null}){
 const node=useRef<HTMLSpanElement>(null);
 const [photo,setPhoto]=useState<ReviewData['images'][number]|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true,started=false;setPhoto(null);setLoading(true);const controller=new AbortController();let timeout:ReturnType<typeof setTimeout>|undefined;
 const load=()=>{if(started)return;started=true;timeout=setTimeout(()=>controller.abort(),20000);
 void apiFetch<ReviewData>('/admin/recycling-intelligence/review/'+encodeURIComponent(barcode),{token:getToken()||undefined,cache:'no-store',signal:controller.signal}).then(data=>{if(active&&data.barcode===barcode&&data.readOnly===true&&data.enrichment===false)setPhoto(data.images[0]||null);}).catch(()=>{}).finally(()=>{clearTimeout(timeout);if(active)setLoading(false);});};
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();observer?.disconnect();}});
 if(observer&&node.current)observer.observe(node.current);else load();return()=>{active=false;controller.abort();clearTimeout(timeout);observer?.disconnect();};},[barcode,revision]);
 return <span ref={node} className='inline-flex h-16 w-16 shrink-0 items-center justify-center rounded bg-stone-100 text-stone-500'>{photo?<Photo photo={photo} language={language} thumbnail/>:loading?<Loader2 size={18} className='animate-spin' aria-label={language==='es'?'Cargando foto':'Loading photo'}/>:<ImageOff size={20} aria-label={language==='es'?'Foto no disponible':'Photo unavailable'}/>}</span>;
}
