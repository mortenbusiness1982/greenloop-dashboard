'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,X,ExternalLink,RefreshCw,ImageOff} from 'lucide-react';
import {apiFetch} from '@/lib/api';
import {getToken} from '@/lib/auth';
import {createMetadataApplication,reviewedFields} from '@/lib/curationApplication';
import {createReviewSession} from '@/lib/curationReviewSession';
import {ReviewData,ReviewTarget,safeSource,usefulName} from '@/lib/curationReview';
import {Photo} from './ProductReviewPhoto';
import {initialPackaging,barcodeResearchLinks} from '@/lib/packagingReview';
import {ProductNameReview} from './ProductNameReview';
export {Photo} from './ProductReviewPhoto';
type ManualPermission={expectedRevision:string;evidenceFingerprint:string;packetDigest:string|null;rejected:boolean;completed?:boolean;metadataFields?:('name'|'brand')[];packagingKeys?:string[];confirmedPackagingKeys?:string[]};
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
 const [editing,setEditing]=useState(false);
 const initialized=useRef<string|null>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{
  initialized.current=null;
  ++generation.current;locked.current=false;setData(null);setNewer(null);setError(false);setMessage(null);setBusy(false);setUncertain(false);setComponentKey('');setRole('');setForm('');setMaterial('');
  app.current=createMetadataApplication((path,options)=>apiFetch(path,{...options,token:getToken()||undefined}));
  const active=createReviewSession<Data>(async signal=>{
   const value=await apiFetch<Data>('/admin/recycling-intelligence/review/'+target.barcode+(target.runId?'?run='+encodeURIComponent(target.runId):''),{token:getToken()||undefined,signal,cache:'no-store'});
   if(value.readOnly!==true||value.enrichment!==false||value.barcode!==target.barcode)throw Error();return value;
  },state=>{setData(state.data);setNewer(state.newer);setError(!!state.error);});
  session.current=active;void active.refresh();const interval=setInterval(()=>void active.refresh(),30000);
  return()=>{++generation.current;active.dispose();clearInterval(interval);app.current?.invalidate();};
 },[target.barcode,target.runId]);
 useEffect(()=>{
  if(!data)return;
  const key=target.barcode+':'+data.revision;
  if(initialized.current===key)return;
  initialized.current=key;
  const c=initialPackaging(data.current.packaging,data.manualReview?.packagingKeys);
  setComponentKey(c.key);setRole(c.role);setForm(c.form);setMaterial(c.material);
  setEditing(!c.form||!c.material||c.material==='other');
 },[data,target.barcode]);
 const blocked=busy||uncertain||!!newer;
 const packagingConfirmed=data?.manualReview?.confirmedPackagingKeys?.includes(componentKey)&&!data.manualReview.packagingKeys?.includes(componentKey);
 const action=data?.actions.find(a=>a.kind==='apply_metadata');
 const fields=data?.stale?null:reviewedFields(action,data?.packet?.proposals);
 const manualFields=reviewedFields({kind:'apply_metadata',runId:target.runId||'',barcode:target.barcode,packetDigest:data?.manualReview?.packetDigest||'',expectedRevision:data?.manualReview?.expectedRevision||'',fields:data?.manualReview?.metadataFields},data?.packet?.proposals);
 const approveLabel=fields?.length===1?(fields[0]==='name'?word('Approve name','Aprobar nombre'):word('Approve brand','Aprobar marca')):word('Approve changes','Aprobar cambios');
 function latest(){++generation.current;locked.current=false;app.current?.invalidate();app.current=createMetadataApplication((p,o)=>apiFetch(p,{...o,token:getToken()||undefined}));setMessage(null);setUncertain(false);setBusy(false);setComponentKey('');setRole('');setForm('');setMaterial('');session.current?.acceptLatest();}
 async function reconcile(saved:boolean){
  const version=generation.current;setBusy(true);
  const refreshed=await session.current?.refreshAfterSave();
  if(version!==generation.current)return;
  setBusy(false);setUncertain(!refreshed);locked.current=!refreshed;
  if(refreshed){app.current?.invalidate();app.current=createMetadataApplication((p,o)=>apiFetch(p,{...o,token:getToken()||undefined}));}
  setMessage(refreshed?(saved?word('Saved.','Guardado.'):word('Latest record loaded. Check the values before confirming.','Registro actualizado. Comprueba los valores antes de confirmar.')):word('Could not refresh the record. Retry loading before continuing.','No se pudo actualizar el registro. Reintenta la carga antes de continuar.'));
 }
 async function perform(operation:()=>Promise<boolean>,closeOnSuccess=false){
  if(blocked||locked.current)return;locked.current=true;setBusy(true);const version=generation.current;
  let success=false;try{success=await operation();}catch{}
  if(version!==generation.current)return;
  if(success){if(closeOnSuccess){onClose();return;}await reconcile(true);return;}
  setBusy(false);setUncertain(true);setMessage(word('Save not confirmed. Reload the record before retrying.','Guardado sin confirmar. Recarga el registro antes de reintentar.'));void session.current?.refresh();
 }
 function decide(decision:'approve_packaging'|'reject_proposal'|'confirm_name'|'approve_metadata',name?:string){
  const permission=data?.manualReview;if(!permission)return;
  void perform(async()=>{
   const response=await apiFetch<{saved:boolean}>('/admin/recycling-intelligence/review/'+target.barcode+'/decision',{method:'POST',token:getToken()||undefined,signal:AbortSignal.timeout(20000),body:{requestId:crypto.randomUUID(),expectedRevision:permission.expectedRevision,evidenceFingerprint:permission.evidenceFingerprint,packetDigest:decision==='confirm_name'?null:permission.packetDigest,decision,...(decision==='confirm_name'?{name}:decision==='approve_metadata'?{fields:manualFields}:decision==='approve_packaging'?{component:{key:componentKey||role,role,form,material}}:{})}});
   return response.saved===true;
  },decision==='approve_packaging'||decision==='approve_metadata');
 }
 function chooseComponent(key:string){setComponentKey(key);const c=data?.current.packaging.find(c=>c.key===key);setRole(c?.role||'');setForm(c?.form||'');setMaterial(c?.material||'');setEditing(!c?.form||!c?.material||c.material==='other');}
 const labelFor=(options:string[][],value:string)=>options.find(o=>o[0]===value)?.[es?2:1]||value;
 const partName=(key:string,partRole:string)=>key==='dispensing_cap'?word('Dispensing cap','Tapón dosificador'):key===partRole?labelFor(roles,partRole):key.replaceAll('_',' ');
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
      {!usefulName(data.current.name,target.barcode)&&data.manualReview?<ProductNameReview key={target.barcode} barcode={target.barcode} language={language} disabled={blocked} onConfirm={name=>decide('confirm_name',name)}/>:null}
      {data.packet?.proposals.length?<section><h3 className='mb-2 font-semibold'>{word('Suggested changes','Cambios propuestos')}</h3>{data.packet.proposals.map(p=><div key={p.field} className='border-b py-2 text-sm'><span className='text-stone-500'>{p.field==='brand'?word('Brand','Marca'):word('Name','Nombre')}</span><p className='font-semibold'>{p.value}</p></div>)}
       {data.manualReview?.rejected?<p className='mt-3 text-sm'>{word('Proposal rejected. Current values kept.','Propuesta rechazada. Se mantienen los valores actuales.')}</p>:data.manualReview?.completed?<p className='mt-3 text-sm'>{word('Changes saved.','Cambios guardados.')}</p>:<div className='mt-3 flex flex-wrap gap-2'>{manualFields?<button disabled={blocked} onClick={()=>decide('approve_metadata')} className='inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-white disabled:opacity-50'><Check size={18}/>{manualFields.length===2?word('Approve name and brand','Aprobar nombre y marca'):manualFields[0]==='brand'?word('Approve brand','Aprobar marca'):word('Approve name','Aprobar nombre')}</button>:fields&&action?<button disabled={blocked} onClick={()=>void perform(async()=>{const r=await app.current!.apply(action);return 'confirmed' in r&&r.confirmed;},true)} className='inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-white disabled:opacity-50'><Check size={18}/>{approveLabel}</button>:null}{data.manualReview?.packetDigest?<button disabled={blocked} onClick={()=>decide('reject_proposal')} className='inline-flex min-h-11 items-center gap-2 rounded border border-stone-400 px-4 disabled:opacity-50'><X size={18}/>{word('Reject','Rechazar')}</button>:null}</div>}
       {manualFields?.includes('brand')?<p className='mt-2 text-xs text-stone-600'>{word('Uses the matching brand, or creates it if missing.','Usa la marca existente o la crea si falta.')}</p>:null}
       {!manualFields&&!fields&&!data.manualReview?.rejected&&!data.manualReview?.completed?<p className='mt-2 text-sm text-stone-600'>{word('No missing fields can be approved. Existing values are kept.','No hay campos vacíos que aprobar. Se conservan los valores actuales.')}</p>:null}
      </section>:null}
      <section><h3 className='mb-3 font-semibold'>{word('Packaging','Envase')}</h3>
       {data.manualReview?<div className='space-y-3'>
        {data.current.packaging.length>1?select(word('Packaging part','Parte del envase'),componentKey,chooseComponent,data.current.packaging.map(c=>[c.key,partName(c.key,c.role),partName(c.key,c.role)])):<p className='text-sm text-stone-500'>{partName(componentKey,role)||labelFor(roles,role)}</p>}
        {!editing?<div><p className='font-semibold'>{labelFor(forms,form)} · {labelFor(materials,material)}</p><p className='mt-1 text-xs text-stone-500'>{word('Currently recorded','Datos actuales')}</p><button disabled={blocked} onClick={()=>setEditing(true)} className='min-h-11 text-sm font-semibold text-emerald-800 underline'>{word('Change','Cambiar')}</button></div>:<>
         {!componentKey?<details><summary className='cursor-pointer text-sm'>{word('Change packaging part','Cambiar parte del envase')}</summary>{select(word('Part','Parte'),role,setRole,roles)}</details>:null}
         {select(word('Packaging type','Tipo de envase'),form,setForm,forms)}
         {select(word('Material','Material'),material,setMaterial,materials)}
        </>}
        {packagingConfirmed&&!editing?<p role='status' className='flex items-center gap-2 font-medium text-emerald-800'><Check size={18}/>{word('Packaging confirmed','Envase confirmado')}</p>:<button disabled={blocked||!role||!form||!material||data.current.packaging.length>0&&!componentKey} onClick={()=>decide('approve_packaging')} className='inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 py-2 text-left text-white disabled:opacity-50'><Check size={18} className='shrink-0'/>{editing?word('Save packaging','Guardar envase'):word('Confirm','Confirmar')+' '+(partName(componentKey,role)||word('packaging','envase'))}</button>}
        <p className='text-xs text-stone-500'>{word('This packaging part only.','Solo esta parte del envase.')}</p>
        {packagingConfirmed&&!data.images.length?<p className='text-sm text-stone-600'>{word('Still missing: product photo. No further packaging confirmation needed.','Falta la foto del producto. No hace falta confirmar el envase de nuevo.')}</p>:null}
       </div>:<p className='text-sm'>{data.current.packaging.map(c=>`${c.form} · ${c.material}`).join(', ')||word('Not classified','Sin clasificar')}<span className='mt-2 block text-stone-500'>{word('Packaging editing is not available on this server yet.','La edición del envase aún no está disponible en este servidor.')}</span></p>}
      </section>
      {message?<p role='status' className='text-sm font-medium'>{message}{uncertain?<button disabled={busy} className='ml-2 min-h-11 underline' onClick={()=>void reconcile(false)}>{word('Reload record','Recargar registro')}</button>:null}</p>:null}
      {!usefulName(data.current.name,target.barcode)||!data.current.brand||!data.images.length?<section className='border-t pt-3'><h3 className='text-sm font-semibold'>{word('Find product information','Buscar información del producto')}</h3><div className='flex flex-wrap gap-3'>{barcodeResearchLinks(target.barcode).map(link=><a key={link.label} href={link.url} target='_blank' rel='noopener noreferrer' referrerPolicy='no-referrer' className='inline-flex min-h-11 items-center gap-1 text-sm text-emerald-800 underline'><ExternalLink size={15}/>{link.label==='Web'?word('Search barcode','Buscar código'):link.label}</a>)}</div></section>:null}
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
