'use client';
import {Info} from 'lucide-react';
import type {Outcomes} from '@/lib/curationOutcomes';

export function IntelligenceStatistics({data,language,format,onPending}:{data:Outcomes;language:'en'|'es';format:(v:string)=>string;onPending:()=>void}){
 const es=language==='es',t=(en:string,sp:string)=>es?sp:en;
 const n=(v:number|null|undefined)=>v==null?'—':v.toLocaleString(language);
 const stat=(label:string,value:number|null|undefined)=><div><dd className='text-xl font-semibold tabular-nums'>{n(value)}</dd><dt className='text-sm text-stone-600'>{label}</dt></div>;
 return <>
  <section aria-label={t('Catalogue progress','Progreso del catálogo')} className='bg-white p-4'>
   <div className='flex items-center justify-between gap-3'><h2 className='font-semibold'>{t('Complete products','Productos completos')}</h2><details className='relative'><summary aria-label={t('About these statistics','Acerca de estas estadísticas')} title={t('About these statistics','Acerca de estas estadísticas')} className='flex h-11 w-11 cursor-pointer list-none items-center justify-center'><Info size={19}/></summary><div className='absolute right-0 z-20 w-72 max-w-[80vw] rounded border bg-white p-3 text-sm shadow'>
    <p>{t('Complete means name, brand, photo and packaging are present. Each counts for 25%; this is not an accuracy score.','Completo significa nombre, marca, foto y envase presentes. Cada uno vale 25%; no mide exactitud.')}</p>
    <p className='mt-2'>{t('Packaging recorded includes incomplete classifications. Completeness requires both material and packaging type. Missing-field counts overlap. Queue status also considers pending decisions and recycling guidance.','Envase registrado incluye clasificaciones incompletas. La integridad requiere material y tipo de envase. Los datos que faltan se solapan. La cola también considera decisiones pendientes y guía de reciclaje.')}</p>
    <p className='mt-2'>{t('Improvements count distinct products with Intelligence-supported changes still in use. Proposals, unchanged saves and rolled-back changes do not count. Latest batch means the latest completed run.','Las mejoras cuentan productos distintos con cambios de Inteligencia aún vigentes. No cuentan propuestas, guardados sin cambios ni cambios revertidos. Último lote significa el último terminado.')}</p>
   </div></details></div>
   <div className='my-2 flex flex-wrap items-baseline gap-x-3'><strong className='text-3xl font-semibold tabular-nums'>{data.completePercent==null?'—':n(data.completePercent)+'%'}</strong><span>{n(data.completeProducts)} / {n(data.totalProducts)} {t('complete','completos')}</span></div>
   {data.completePercent!=null?<div role='progressbar' aria-label={t('Complete products','Productos completos')} aria-valuemin={0} aria-valuemax={data.totalProducts} aria-valuenow={data.completeProducts} className='h-2 overflow-hidden rounded bg-stone-200'><div className='h-full bg-emerald-700' style={{width:data.completePercent+'%'}}/></div>:null}
   <dl className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4'>
    {stat(t('Total products','Productos totales'),data.totalProducts)}
    <div><dd className='text-xl font-semibold tabular-nums'>{n(data.classified)} <span className='text-sm font-normal'>{data.catalogueCoveragePercent==null?'':`(${n(data.catalogueCoveragePercent)}%)`}</span></dd><dt className='text-sm text-stone-600'>{t('Packaging recorded','Envase registrado')}</dt></div>
    {stat(t('Missing information','Información incompleta'),data.missingInformation)}
    <div><dd className='text-xl font-semibold tabular-nums'>{n(data.pendingCount)}</dd><dt><button onClick={onPending} className='min-h-11 text-left text-sm text-emerald-800 underline'>{t('Needs your decision','Necesita tu decisión')}</button></dt></div>
   </dl>
   <dl aria-label={t('Missing information breakdown','Información que falta')} className='mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-sm sm:grid-cols-4'>{Object.entries(data.gaps).map(([k,v])=><div key={k} className='flex justify-between gap-2'><dt>{({name:t('Missing name','Sin nombre'),brand:t('Missing brand','Sin marca'),photo:t('Missing photo','Sin foto'),packaging:t('Missing packaging','Sin envase')} as Record<string,string>)[k]}</dt><dd className='font-semibold tabular-nums'>{n(v)}</dd></div>)}</dl>
   <p className='mt-3 text-xs text-stone-500'>{format(data.asOf)}</p>
  </section>
  <section aria-label={t('Live improvements','Mejoras aplicadas')} className='bg-white p-4'><h2 className='font-semibold'>{t('Live improvements','Mejoras aplicadas')}</h2><dl className='mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4'>
   {stat(t('Intelligence · all time','Inteligencia · total'),data.contributions?.intelligence.improvedProducts)}
   {stat(t('Last 24 hours','Últimas 24 horas'),data.improvedLast24Hours)}
   {stat(t('Latest completed batch','Último lote terminado'),data.improvedLatestBatch)}
   {stat(t('Photos published','Fotos publicadas'),data.photosAdded)}
  </dl>{data.latestBatch?<p className='mt-3 text-xs text-stone-500'>{t('Latest batch','Último lote')}: {format(data.latestBatch.endedAt)}</p>:null}</section>
  <section aria-label={t('Intelligence Contribution','Aportaciones')} className='bg-white p-4'><div className='flex items-center justify-between'><h2 className='font-semibold'>{t('Intelligence Contribution','Aportaciones')}</h2><details className='relative'><summary aria-label={t('About contribution counts','Acerca de las aportaciones')} title={t('About contribution counts','Acerca de las aportaciones')} className='flex h-11 w-11 cursor-pointer list-none items-center justify-center'><Info size={19}/></summary><p className='absolute right-0 z-20 w-72 max-w-[80vw] rounded border bg-white p-3 text-sm shadow'>{t('Products may have multiple sources. User evidence is counted separately from improvements linked to accepted evidence. Historical completeness at import is unknown where no original snapshot was saved.','Un producto puede tener varias fuentes. La evidencia de usuarios se distingue de las mejoras vinculadas a evidencia aceptada. Se desconoce la integridad al importar si no se guardó el estado original.')}</p></details></div>
   <dl className='divide-y text-sm'><div className='flex flex-wrap justify-between gap-2 py-3'><dt>Open Food Facts</dt><dd><strong>{n(data.contributions?.openFoodFacts.products)}</strong> {t('products','productos')} · {t('complete at import','completos al importar')}: {data.contributions?.openFoodFacts.completeAtImport==null?t('Unknown','Desconocido'):n(data.contributions.openFoodFacts.completeAtImport)}</dd></div>
   <div className='flex justify-between gap-3 py-3'><dt>GreenLoop Intelligence</dt><dd><strong>{n(data.contributions?.intelligence.improvedProducts)}</strong> {t('improved','mejorados')}</dd></div>
   <div className='flex flex-wrap justify-between gap-2 py-3'><dt>{t('User contributions','Aportaciones de usuarios')}</dt><dd><strong>{n(data.contributions?.users.products)}</strong> {t('with evidence','con evidencia')} · <strong>{n(data.contributions?.users.improvedProducts)}</strong> {t('improved','mejorados')}</dd></div></dl>
   <details className='border-t pt-2'><summary className='min-h-11 cursor-pointer py-2 font-medium'>{t('Top contributing users','Usuarios que más contribuyen')}</summary><ul className='divide-y text-sm'>{data.topContributors?.map(u=><li key={u.id} className='flex flex-wrap justify-between gap-2 py-3'><span>{u.name}</span><span>{n(u.improvedProducts)} {t('improved','mejorados')} · {n(u.products)} {t('with evidence','con evidencia')}</span></li>)}</ul>{!data.topContributors?.length?<p className='py-2 text-sm text-stone-500'>{t('No attributed contributions recorded.','No hay aportaciones atribuidas.')}</p>:null}</details>
  </section>
 </>;
}
