'use client';
import {useEffect,useState,useRef} from 'react';
import {ImageOff,Loader2,RotateCcw} from 'lucide-react';
import {API_BASE} from '@/lib/api';
import {getToken} from '@/lib/auth';
import {ReviewData,safeSource} from '@/lib/curationReview';

export function Photo({photo,language,thumbnail=false,onReady}:{photo:ReviewData['images'][number];language:'en'|'es';thumbnail?:boolean;onReady?:(ready:boolean)=>void}) {
 const ready=useRef(onReady);ready.current=onReady;
 const [src,setSrc]=useState<string|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let objectUrl:string|undefined;
  setSrc(null);setFailed(false);
  ready.current?.(false);
  const timer=setTimeout(()=>{setFailed(true);controller.abort();},25000);
  async function load(){
   if(!photo.authenticated){
    const published=/^\/published-product-images\/[a-f0-9-]{36}\/[a-f0-9]{64}\.png$/.test(photo.url);
    if(!published&&!(safeSource(photo.url)&&/\.(jpe?g|png|webp)$/i.test(new URL(photo.url).pathname)))throw Error();
    if(!controller.signal.aborted)setSrc(published?API_BASE+photo.url:photo.url);return;
   }
   if(!/^\/admin\/recycling-intelligence\/products\/[a-f0-9-]{36}\/(?:evidence\/[a-f0-9-]{36}\/)?photo$/.test(photo.url))throw Error();
   const token=getToken();if(!token)throw Error();
   const response=await fetch(API_BASE+photo.url,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal,cache:'no-store',redirect:'error'});
   const type=response.headers.get('content-type')||'';
   if(!response.ok||!/^image\/(jpeg|png|webp)(;|$)/.test(type)||Number(response.headers.get('content-length'))>20*1024*1024)throw Error();
   const reader=response.body?.getReader();if(!reader)throw Error();
   const chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>20*1024*1024){await reader.cancel();throw Error();}chunks.push(new Uint8Array(part.value));}
   objectUrl=URL.createObjectURL(new Blob(chunks,{type}));if(!controller.signal.aborted)setSrc(objectUrl);
  }
  void load().catch(()=>{if(!controller.signal.aborted)setFailed(true);}).finally(()=>clearTimeout(timer));
  return()=>{controller.abort();clearTimeout(timer);if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[photo.url,photo.authenticated,retry]);
 const frame=thumbnail?'flex h-16 w-16 shrink-0 items-center justify-center rounded bg-stone-100':'flex min-h-48 items-center justify-center rounded bg-stone-100 p-3';
 if(failed)return <span className={frame}><ImageOff size={thumbnail?20:28} aria-label={language==='es'?'Error al cargar foto':'Photo failed to load'}/>{!thumbnail?<button type='button' onClick={()=>setRetry(v=>v+1)} className='ml-3 inline-flex min-h-11 items-center gap-2 text-sm'><RotateCcw size={16}/>{language==='es'?'Reintentar':'Retry photo'}</button>:null}</span>;
 if(!src)return <span className={frame}><Loader2 className='animate-spin' size={20} aria-label={language==='es'?'Cargando foto':'Loading photo'}/></span>;
 const image=<img src={src} alt={language==='es'?'Foto del producto':'Product photo'} referrerPolicy='no-referrer' onLoad={()=>ready.current?.(true)} onError={()=>{setFailed(true);ready.current?.(false);}} className={thumbnail?'h-16 w-16 rounded bg-stone-100 object-contain':'h-64 w-full object-contain sm:h-80'}/>;
 return thumbnail?image:<a href={src} target='_blank' rel='noopener noreferrer' aria-label={language==='es'?'Ampliar foto':'Enlarge photo'} className={frame}>{image}</a>;
}
