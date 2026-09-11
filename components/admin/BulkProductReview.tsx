'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,X} from 'lucide-react';
import {apiFetch} from '@/lib/api';
import {getToken} from '@/lib/auth';
import {planBulkReview,confirmBulkPlan,BulkData,BulkPlan} from '@/lib/bulkReview';
import type {WorkflowProduct} from '@/lib/workflowQueue';
import {Photo} from './ProductReviewPhoto';
type Item={product:WorkflowProduct;data?:BulkData;plan?:BulkPlan;error?:string;saved?:boolean};
export function BulkProductReview({products,language,onClose,onSaved}:{products:WorkflowProduct[];language:'en'|'es';onClose:()=>void;onSaved:(barcode:string)=>void}){
 const es=language==='es',dialog=useRef<HTMLDialogElement>(null),lock=useRef(false);
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const [readyPhotos,setReadyPhotos]=useState<Record<string,boolean>>({});
 useEffect(()=>{dialog.current?.showModal();let active=true;const controller=new AbortController();
  void(async()=>{const result:Item[]=[];for(const product of products.slice(0,20)){
   if(controller.signal.aborted)return;
   try{const data=await apiFetch<BulkData>('/admin/recycling-intelligence/review/'+product.ean+'?run='+encodeURIComponent(product.runId!),{token:getToken()||undefined,cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
    if(data.barcode!==product.ean)throw Error('Product mismatch');
    result.push({product,data,plan:planBulkReview(data,crypto.randomUUID())});
   }catch(error){result.push({product,error:error instanceof Error?error.message:'Review unavailable'});}
  }if(active){setItems(result);setLoading(false);}})();return()=>{active=false;controller.abort();};
 },[products]);
 async function approve(){if(lock.current||done)return;lock.current=true;setBusy(true);
  for(const item of items){if(!item.plan||!readyPhotos[item.product.ean])continue;let saved=false,error='';
   try{await confirmBulkPlan(item.plan,()=>apiFetch<BulkData>('/admin/recycling-intelligence/review/'+item.product.ean+'?run='+encodeURIComponent(item.product.runId!),{token:getToken()||undefined,cache:'no-store',signal:AbortSignal.timeout(15000)}),body=>apiFetch<{saved:boolean}>('/admin/recycling-intelligence/review/'+item.product.ean+'/decision',{method:'POST',token:getToken()||undefined,signal:AbortSignal.timeout(20000),body}));
    saved=true;onSaved(item.product.ean);
   }catch(e){error=e instanceof Error?e.message:'Save not confirmed';}
   setItems(rows=>rows.map(row=>row.product.ean===item.product.ean?{...row,saved,error}:row));
  }setBusy(false);setDone(true);
 }
 const eligible=items.filter(i=>i.plan&&!i.saved&&!i.error&&readyPhotos[i.product.ean]).length;
 return <dialog ref={dialog} onCancel={e=>{if(busy)e.preventDefault();else onClose();}} onClose={onClose} aria-labelledby='bulk-title' className='m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto rounded-lg bg-[#faf9f4] p-4 text-stone-900 backdrop:bg-black/40'>
  <header className='flex items-center justify-between gap-3'><h2 id='bulk-title' className='text-lg font-semibold'>{es?'Revisar selección':'Review selected products'}</h2><button disabled={busy} aria-label={es?'Cerrar':'Close bulk review'} onClick={onClose} className='flex h-11 w-11 items-center justify-center'><X/></button></header>
  {loading?<p role='status'>{es?'Cargando decisiones…':'Loading decisions…'}</p>:<>
   <p className='my-2 text-sm'>{es?'Solo se guardan los envases indicados. No se publican fotos.':'Only the packaging shown below will be saved. Photos will not be published.'}</p>
   <ul className='divide-y'>{items.map(item=><li key={item.product.ean} className='py-3'><strong>{item.product.name||item.product.ean}</strong><p className='text-sm'>{item.product.ean}</p>{item.data?.images[0]?<div className='my-2 max-w-40'><Photo photo={item.data.images[0]} language={language} onReady={ready=>setReadyPhotos(v=>({...v,[item.product.ean]:ready}))}/></div>:null}<p className='my-2 text-sm'>{item.plan?.label}</p>{item.plan&&!readyPhotos[item.product.ean]?<p className='text-sm'>{es?'La foto debe cargarse antes de aprobar.':'Photo must load before approval.'}</p>:null}{item.saved?<p role='status' className='text-emerald-800'>{es?'Guardado':'Saved'}</p>:item.error?<p role='alert' className='text-sm text-red-800'>{item.error}</p>:null}</li>)}</ul>
   {!done?<button disabled={busy||!eligible} onClick={()=>void approve()} className='my-3 inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-white disabled:opacity-50'><Check size={18}/>{busy?(es?'Guardando…':'Saving…'):(es?'Confirmar envases':'Confirm packaging')+` (${eligible})`}</button>:<p role='status'>{es?'Revisión terminada. Los elementos sin guardar siguen seleccionados.':'Review finished. Unsaved items remain selected.'}</p>}
  </>}
 </dialog>;
}
