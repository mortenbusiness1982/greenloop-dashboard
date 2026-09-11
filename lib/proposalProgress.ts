import type {ReviewData} from './curationReview';

export type ProposalProgress='pending'|'recorded'|'rejected'|'research'|'finished'|'unavailable';
// Compare persisted values, not the immutable outcome recorded when the batch ran.
export function proposalProgress(data:ReviewData&{manualReview?:{rejected:boolean;completed?:boolean;disposition?:string|null}}):ProposalProgress{
 if(data.readOnly!==true||data.enrichment!==false||!data.packet)return 'unavailable';
 if(data.manualReview?.rejected)return 'rejected';
 if(data.manualReview?.disposition==='research')return 'research';
 if(data.manualReview?.disposition==='finished')return 'finished';
 if(typeof data.manualReview?.completed==='boolean')return data.manualReview.completed?'recorded':'pending';
 const proposals=[...data.packet.proposals,...(data.packet.visualProposals||[])];
 if(!proposals.length)return 'pending';
 const matches=proposals.every(p=>{
  if(p.field==='name'||p.field==='brand')return !!p.value&&data.current[p.field]?.trim()===p.value.trim();
  if(p.field==='packaging_component'&&'componentKey' in p&&'materialType' in p){
   const component=data.current.packaging.find(c=>c.key===p.componentKey);
   const visual=p as {materialType?:string;packagingForm?:string;componentRole?:string};
   return !!component&&!!visual.materialType&&!!visual.packagingForm&&!!visual.componentRole&&component.material===visual.materialType&&component.form===visual.packagingForm&&component.role===visual.componentRole;
  }
  return false;
 });
 return matches?'recorded':'pending';
}
