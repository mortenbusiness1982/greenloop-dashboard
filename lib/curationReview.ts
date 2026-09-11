import type {ProductOutcome, Counts} from './curationMonitoring';
export function actionableBatchProducts(products:ProductOutcome[],states:Record<string,string>,runId:string){
 return products.filter(p=>(p.outcome==='staged'||p.outcome==='proposed_not_published')&&!['recorded','rejected','research','finished'].includes(states[runId+':'+p.barcode]));
}
export type ReviewTarget={barcode:string;runId?:string;outcome?:ProductOutcome};
export type ReviewData={barcode:string;productId:string;current:{name:string|null;brand:string|null;packaging:{key:string;role:string;material:string;form:string;guidance?:{container?:{color:string};status:string}}[];publication:unknown};packet:null|{current:{name:string|null;brand:string|null;packaging:{key:string;role:string;material:string;form:string}[]};sources:{id:string;url:string;identityExcerpt:string;trustReason:string;independentlyVerified:boolean}[];proposals:{field:string;value:string;sourceId:string}[];inspectedPhotoHashes:string[];visualProposals?:{field:string;value?:string;componentKey?:string;materialType?:string;materialStatus?:string;visualEvidence?:string;labelTranscription?:string}[]};outcome:ProductOutcome|null;images:{url:string;authenticated:boolean}[];stale:boolean;revision:string;readOnly:true;enrichment:false;visualGuidance?:{componentKey:string;materialStatus:string;guidance:{status:string;container?:{color:string};instructionCode?:string}}[];actions:{kind:"apply_metadata";runId:string;barcode:string;packetDigest:string;expectedRevision:string;fields?:('name'|'brand')[];mode?:'fill_missing'|'reviewed_correction'}[]};
export function safeSource(value:string){try{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9.-]+\.[a-z]{2,}$/.test(u.hostname)&&!/^[\d.]+$/.test(u.hostname)&&!/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&!u.pathname.includes('%')&&!/[a-f0-9]{48,}|token|secret|credential|signature/i.test(u.pathname);}catch{return false;}}
export function usefulName(value:string|null|undefined,barcode:string){return value&&value!==barcode&&!/^(unknown|product|producto)(\s+\d+)?$/i.test(value)?value:null;}
export function reviewState(p?:Pick<ProductOutcome,'outcome'|'reason'|'gaps'>|null){
 const reason=p?.reason||'';
 if(p?.outcome==='published')return 'published';
 if(/identity conflict|identidad.*conflicto/i.test(reason))return 'identity';
 if(/packaging conflict|material.*conflict/i.test(reason))return 'material';
 if(p?.outcome==='staged'||p?.outcome==='proposed_not_published')return 'ready';
 if(p?.outcome==='failed')return 'failed';
 if(/did not establish|no authoritative/i.test(reason)&&p?.gaps?.includes('photo_missing'))return 'none';
 if(p?.gaps?.some(g=>g==='name'||g==='brand'))return 'metadata';
 if(p?.gaps?.some(g=>g.startsWith('photo_')))return 'photo';
 if(p?.gaps?.includes('packaging')||p?.gaps?.includes('bin_guidance'))return 'material';
 return 'none';
}
export const reviewLabels={en:{metadata:'Metadata evidence needed',ready:'Ready for review',identity:'Identity conflict',material:'Missing material evidence',photo:'Photo rights / quality unresolved',published:'Already published',none:'No evidence',failed:'Research failed'},es:{metadata:'Falta evidencia de metadatos',ready:'Listo para revisar',identity:'Conflicto de identidad',material:'Falta evidencia del material',photo:'Derechos / calidad de foto pendientes',published:'Ya publicado',none:'Sin evidencia',failed:'Investigación fallida'}};
export function compactCounts(c:Counts){return {processed:c.attempted,photosPublished:c.published,staged:c.staged,unresolved:c.deferred,failed:c.failed,unknown:c.attemptedUnknown||0};}
export type CatalogueSummary={totalProducts:number;classified:number;verified:number;scannedProducts:number;resolvedScannedProducts:number};
export function catalogueProgress(s:CatalogueSummary){
 for(const k of ['totalProducts','classified','verified','scannedProducts','resolvedScannedProducts'] as const)if(!Number.isSafeInteger(s?.[k])||s[k]<0)throw Error('Catalogue totals unavailable');
 if(s.classified>s.totalProducts||s.verified>s.classified||s.scannedProducts>s.totalProducts||s.resolvedScannedProducts>s.scannedProducts)throw Error('Catalogue totals inconsistent');
 return {...s,remaining:s.totalProducts-s.classified,percent:s.totalProducts?100*s.classified/s.totalProducts:null};
}
