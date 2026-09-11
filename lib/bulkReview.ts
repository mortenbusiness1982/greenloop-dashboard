import type {ReviewData} from './curationReview';
type Permission={expectedRevision:string;evidenceFingerprint:string;packetDigest:string|null;rejected:boolean;completed?:boolean;metadataFields?:string[];packagingKeys?:string[]};
export type BulkData=ReviewData&{manualReview?:Permission};
export type BulkPlan={barcode:string;revision:string;label:string;body:Record<string,unknown>};
export function planBulkReview(data:BulkData,requestId:string):BulkPlan{
 const permission=data.manualReview;
 if(!permission?.packetDigest||permission.rejected||permission.completed||data.stale||!data.packet||data.readOnly!==true||data.enrichment!==false)throw Error('Review individually: evidence has changed or no approval is available.');
 if(!data.current.name||data.current.name===data.barcode||!data.current.brand||!data.images.length||/^(unknown|greenloop)$/i.test(data.current.brand))throw Error('Missing product information.');
 if(!data.current.packaging.some(c=>c.role==='primary'&&c.form&&c.material&&c.material!=='other'))throw Error('Main packaging is missing.');
 const keys=permission.packagingKeys||[];
 const metadata=data.packet.proposals||[];
 // One exact component per bulk item; mixed decisions need an individual review.
 if(metadata.length||keys.length!==1||(data.packet.visualProposals||[]).some(p=>p.field!=='packaging_component'))throw Error('Review individually: multiple or unsupported decisions.');
 const c=data.current.packaging.find(c=>c.key===keys[0]);
 if(!c||!c.form||!c.material||c.material==='other'||c.guidance?.status!=='verified'||!c.guidance.container)throw Error('Review individually: packaging or recycling guidance needs evidence.');
 return {barcode:data.barcode,revision:data.revision,label:`${c.key.replaceAll('_',' ')}: ${c.form} / ${c.material} / ${c.guidance.container.color}`,body:{requestId,expectedRevision:permission.expectedRevision,evidenceFingerprint:permission.evidenceFingerprint,packetDigest:permission.packetDigest,decision:'approve_packaging',component:{key:c.key,role:c.role,form:c.form,material:c.material}}};
}
export async function confirmBulkPlan(plan:BulkPlan,readFresh:()=>Promise<BulkData>,save:(body:Record<string,unknown>)=>Promise<{saved:boolean}>){
 const current=await readFresh();
 if(current.barcode!==plan.barcode)throw Error('Product mismatch. Review again.');
 const fresh=planBulkReview(current,String(plan.body.requestId));
 if(current.revision!==plan.revision||JSON.stringify(fresh.body)!==JSON.stringify(plan.body))throw Error('Record changed. Review again.');
 const result=await save(plan.body);
 if(result.saved!==true)throw Error('Save not confirmed. Reload before retrying.');
}
