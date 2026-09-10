'use client';
import {useEffect,useRef,useState} from 'react';
import {getToken} from '@/lib/auth';
import {apiFetch} from '@/lib/api';
import {ReviewData} from '@/lib/curationReview';
import {Photo} from './CurationReviewDialog';
// Internal evidence is independent of publication approval. Load only visible rows.
export function EvidenceThumbnail({barcode,language,revision}:{barcode:string;language:'en'|'es';revision?:number|null}){
 const node=useRef<HTMLSpanElement>(null);
 const [photo,setPhoto]=useState<ReviewData['images'][number]|null>(null);
 useEffect(()=>{let active=true,started=false;setPhoto(null);
 const observer=new IntersectionObserver(entries=>{if(started||!entries.some(e=>e.isIntersecting))return;started=true;observer.disconnect();
 void apiFetch<ReviewData>('/admin/recycling-intelligence/review/'+encodeURIComponent(barcode),{token:getToken()||undefined,cache:'no-store'}).then(data=>{if(active&&data.readOnly===true&&data.enrichment===false)setPhoto(data.images[0]||null);}).catch(()=>{});
 });if(node.current)observer.observe(node.current);return()=>{active=false;observer.disconnect();};},[barcode,revision]);
 return <span ref={node} className='inline-flex h-16 w-16 shrink-0'>{photo?<Photo photo={photo} language={language} thumbnail/>:null}</span>;
}
