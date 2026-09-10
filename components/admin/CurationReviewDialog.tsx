'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,X,ExternalLink,RefreshCw,ImageOff} from 'lucide-react';
import {apiFetch} from '@/lib/api';
import {getToken} from '@/lib/auth';
import {createMetadataApplication,reviewedFields} from '@/lib/curationApplication';
import {createReviewSession} from '@/lib/curationReviewSession';
import {ReviewData,ReviewTarget,safeSource,usefulName} from '@/lib/curationReview';
import {Photo} from './ProductReviewPhoto';
export {Photo} from './ProductReviewPhoto';
type ManualPermission={expectedRevision:string;evidenceFingerprint:string;packetDigest:string|null;rejected:boolean};
type Data=ReviewData&{manualReview?:ManualPermission};
const forms=[['bottle','Bottle','Botella'],['can','Can','Lata'],['jar','Jar','Tarro'],['carton','Carton','Brik'],['box','Box','Caja'],['tray','Tray','Bandeja'],['wrapper','Wrapper','Envoltorio'],['bag','Bag','Bolsa'],['cup','Cup / pot','Vaso / tarrina'],['container','Container','Recipiente'],['other','Other','Otro']];
const materials=[['plastic','Plastic','Plástico'],['glass','Glass','Vidrio'],['paper','Paper','Papel'],['cardboard','Cardboard','Cartón'],['metal','Metal','Metal'],['aluminium','Aluminium','Aluminio'],['steel','Steel','Acero'],['composite','Mixed layers','Multicapa'],['pet','PET','PET'],['hdpe','HDPE','HDPE'],['ldpe','LDPE','LDPE'],['pp','PP','PP'],['ps','PS','PS'],['compostable','Compostable','Compostable'],['other','Other','Otro']];
const roles=[['primary','Main packaging','Envase principal'],['secondary','Outer packaging','Envase exterior'],['cap','Cap','Tapón'],['lid','Lid','Tapa'],['label','Label','Etiqueta'],['sleeve','Sleeve','Funda'],['other','Other component','Otro componente']];

export function CurationReviewDialog({target,language,onClose}:{target:ReviewTarget;language:'en'|'es';onClose:()=>void}){
 const es=language==='es',word=(en:string,sp:string)=>es?sp:en;
 const dialog=useRef<HTMLDialogElement>(null),session=useRef<ReturnType<typeof createReviewSession<Data>>|null>(null);
 const app=useRef<ReturnType<typeof createMetadataApplication>|null>(null),generation=useRef(0),locked=useRef(false);
 const [data,setData]=useState<Data|null>(null),[newer,setNewer]=useState<Data|null>(null),[error,setError]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null),[uncertain,setUncertain]=useState(false);
 const [componentKey,setComponentKey]=useState(''),[role,setRole]=useState(''),[form,setForm]=useState(''),[material,setMaterial]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{
  ++generation.current;locked.current=false;setData(null);setNewer(null);setError(false);setMessage(null);setBusy(false);setUncertain(false);setComponentKey('');setRole('');setForm('');setMaterial('');
  app.current=createMetadataApplication((path,options)=>apiFetch(path,{...options,token:getToken()||undefined}));
  const active=createReviewSession<Data>(async signal=>{
   const value=await apiFetch<Data>('/admin/recycling-intelligence/review/'+target.barcode+(target.runId?'?run='+encodeURIComponent(target.runId):''),{token:getToken()||undefined,signal,cache:'no-store'});
   if(value.readOnly!==true||value.enrichment!==false||value.barcode!==target.barcode)throw Error();return value;
  },state=>{setData(state.data);setNewer(state.newer);setError(!!state.error);});
  session.current=active;void active.refresh();const interval=setInterval(()=>void active.refresh(),30000);
  return()=>{++generation.current;active.dispose();clearInterval(interval);app.current?.invalidate();};
 },[target.barcode,target.runId]);
 const blocked=busy||uncertain||!!newer;
 const action=data?.actions.find(a=>a.kind==='apply_metadata');
 const fields=data?.stale?null:reviewedFields(action,data?.packet?.proposals);
 const approveLabel=fields?.length===1?(fields[0]==='name'?word('Approve name','Aprobar nombre'):word('Approve brand','Aprobar marca')):word('Approve changes','Aprobar cambios');
 function latest(){++generation.current;locked.current=false;app.current?.invalidate();app.current=createMetadataApplication((p,o)=>apiFetch(p,{...o,token:getToken()||undefined}));setMessage(null);setUncertain(false);setBusy(false);setComponentKey('');setRole('');setForm('');setMaterial('');session.current?.acceptLatest();}
 async function perform(operation:()=>Promise<boolean>){
  if(blocked||locked.current)return;locked.current=true;setBusy(true);const version=generation.current;
  let success=false;try{success=await operation();}catch{}
  if(version!==generation.current)return;
  setBusy(false);setUncertain(true);setMessage(success?word('Saved.','Guardado.'):word('Save not confirmed. Reload the record before retrying.','Guardado sin confirmar. Recarga el registro antes de reintentar.'));void session.current?.refresh();
 }
 function decide(decision:'approve_packaging'|'reject_proposal'){
  const permission=data?.manualReview;if(!permission)return;
  void perform(async()=>{
   const response=await apiFetch<{saved:boolean}>('/admin/recycling-intelligence/review/'+target.barcode+'/decision',{method:'POST',token:getToken()||undefined,signal:AbortSignal.timeout(20000),body:{requestId:crypto.randomUUID(),expectedRevision:permission.expectedRevision,evidenceFingerprint:permission.evidenceFingerprint,packetDigest:permission.packetDigest,decision,...(decision==='approve_packaging'?{component:{key:componentKey||role,role,form,material}}:{})}});
   return response.saved===true;
  });
 }
 function chooseComponent(key:string){setComponentKey(key);const c=data?.current.packaging.find(c=>c.key===key);setRole(c?.role||'');setForm(c?.form||'');setMaterial(c?.material||'');}
 const select=(label:string,value:string,change:(v:string)=>void,options:string[][])=><label className='block text-sm font-medium'>{label}<select disabled={blocked} value={value} onChange={e=>change(e.target.value)} className='mt-1 min-h-11 w-full rounded border border-stone-300 bg-white px-3'><option value=''>{word('Select…','Seleccionar…')}</option>{options.map(o=><option key={o[0]} value={o[0]}>{o[es?2:1]}</option>)}</select></label>;
 const title=usefulName(data?.current.name||target.outcome?.name,target.barcode)||word('Product review','Revisar producto');
 return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby='curation-review-title' className='m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-lg bg-[#faf9f4] p-0 text-stone-900 shadow-xl backdrop:bg-black/40'>
  <header className='sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-[#faf9f4] p-4'><div className='min-w-0'><h2 id='curation-review-title' className='break-words text-lg font-semibold'>{title}</h2><p className='text-sm text-stone-500'>{target.barcode}{data?.current.brand?' · '+data.current.brand:''}</p></div><button autoFocus onClick={onClose} aria-label={word('Close review','Cerrar revisión')} className='flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-stone-200'><X size={22}/></button></header>
  <div className='space-y-5 p-4'>
   {error?<p role='alert'>{word('Could not load this product.','No se pudo cargar el producto.')} <button className='min-h-11 underline' onClick={()=>void session.current?.refresh()}>{word('Retry','Reintentar')}</button></p>:!data?<p role='status'>{word('Loading product…','Cargando producto…')}</p>:null}
   {newer?<div role='alert' className='flex flex-wrap items-center gap-2 rounded bg-amber-100 p-3 text-sm'>{word('This record has changed.','Este registro ha cambiado.')}<button onClick={latest} className='inline-flex min-h-11 items-center gap-2 font-semibold'><RefreshCw size={16}/>{word('Load latest','Cargar actual')}</button></div>:null}
   {data?<>
    <div className='grid gap-5 sm:grid-cols-2'>
     <section aria-label={word('Product photos','Fotos del producto')} className='space-y-2'>{data.images.length?data.images.map(p=><Photo key={p.url} photo={p} language={language}/>):<div className='flex h-64 flex-col items-center justify-center gap-2 rounded bg-stone-100 text-stone-500'><ImageOff size={32}/><p>{word('No photo available','No hay foto disponible')}</p></div>}</section>
     <div className='space-y-5'>
      {data.packet?.proposals.length?<section><h3 className='mb-2 font-semibold'>{word('Suggested changes','Cambios propuestos')}</h3>{data.packet.proposals.map(p=><div key={p.field} className='border-b py-2 text-sm'><span className='text-stone-500'>{p.field==='brand'?word('Brand','Marca'):word('Name','Nombre')}</span><p className='font-semibold'>{p.value}</p></div>)}
       {data.manualReview?.rejected?<p className='mt-3 text-sm'>{word('Proposal rejected. Current values kept.','Propuesta rechazada. Se mantienen los valores actuales.')}</p>:<div className='mt-3 flex flex-wrap gap-2'>{fields&&action?<button disabled={blocked} onClick={()=>void perform(async()=>{const r=await app.current!.apply(action);return 'confirmed' in r&&r.confirmed;})} className='inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-white disabled:opacity-50'><Check size={18}/>{approveLabel}</button>:null}{data.manualReview?.packetDigest?<button disabled={blocked} onClick={()=>decide('reject_proposal')} className='inline-flex min-h-11 items-center gap-2 rounded border border-stone-400 px-4 disabled:opacity-50'><X size={18}/>{word('Reject','Rechazar')}</button>:null}</div>}
       {!fields&&!data.manualReview?.rejected?<p className='mt-2 text-sm text-stone-600'>{word('These changes are not enabled for application.','Estos cambios no están habilitados para aplicar.')}</p>:null}
      </section>:null}
      <section><h3 className='mb-3 font-semibold'>{word('Packaging','Envase')}</h3>
       {data.manualReview?<div className='space-y-3'>
        {data.current.packaging.length?select(word('Component','Componente'),componentKey,chooseComponent,data.current.packaging.map(c=>[c.key,c.key.replaceAll('_',' '),c.key.replaceAll('_',' ')])):null}
        {!componentKey?select(word('Part','Parte'),role,setRole,roles):null}
        {select(word('Packaging type','Tipo de envase'),form,setForm,forms)}
        {select(word('Material','Material'),material,setMaterial,materials)}
        <button disabled={blocked||!role||!form||!material||data.current.packaging.length>0&&!componentKey} onClick={()=>decide('approve_packaging')} className='inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-white disabled:opacity-50'><Check size={18}/>{word('Save packaging','Guardar envase')}</button>
        <p className='text-xs text-stone-500'>{word('Applies to this component only. Does not publish a photo.','Solo este componente. No publica ninguna foto.')}</p>
       </div>:<p className='text-sm'>{data.current.packaging.map(c=>`${c.form} · ${c.material}`).join(', ')||word('Not classified','Sin clasificar')}<span className='mt-2 block text-stone-500'>{word('Packaging editing is not available on this server yet.','La edición del envase aún no está disponible en este servidor.')}</span></p>}
      </section>
      {message?<p role='status' className='text-sm font-medium'>{message}</p>:null}
     </div>
    </div>
    <details className='border-t pt-3'><summary className='min-h-11 cursor-pointer font-medium'>{word('Evidence and history','Evidencia e historial')}</summary>
     <p className='mb-3 text-sm'>{data.outcome?.reason||target.outcome?.reason||word('No research notes.','Sin notas de investigación.')}</p>
     {data.packet?.visualProposals?.map((p,i)=><p key={i} className='mb-2 text-sm'>{p.componentKey||p.field}: {p.value||p.materialType} · {word('Suggested, not verified','Propuesto, no verificado')}<br/>{p.visualEvidence||p.labelTranscription}</p>)}
     {data.packet?.sources.map(s=><div key={s.id} className='border-b py-2 text-sm'>{safeSource(s.url)?<a href={s.url} target='_blank' rel='noopener noreferrer' referrerPolicy='no-referrer' className='inline-flex min-h-11 max-w-full items-center gap-2 break-all text-emerald-800 underline'><ExternalLink size={16}/>{new URL(s.url).hostname}</a>:null}<p>{s.identityExcerpt}</p></div>)}
     {data.packet?<p className='mt-3 text-xs text-stone-500'>{word('Previously recorded name','Nombre anterior')}: {data.packet.current.name||'—'} · {data.packet.current.brand||'—'}</p>:null}
    </details>
   </>:null}
  </div>
 </dialog>;
}
