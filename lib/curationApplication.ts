export type MetadataAction={kind:'apply_metadata';runId:string;barcode:string;packetDigest:string;expectedRevision:string;fields?:('name'|'brand')[];mode?:'fill_missing'|'reviewed_correction'};
export function reviewedFields(action:MetadataAction|undefined,proposals?:{field:string}[]):('name'|'brand')[]|null {
 const fields=action?.fields;
 if(!Array.isArray(fields)||!fields.length||fields.length>2||new Set(fields).size!==fields.length||fields.some(f=>!['name','brand'].includes(f)))return null;
 if(action?.mode!==undefined&&!['fill_missing','reviewed_correction'].includes(action.mode))return null;
 if(proposals&&fields.some(f=>proposals.filter(p=>p.field===f).length!==1))return null;
 return fields;
}
const key=(a:MetadataAction)=>JSON.stringify([a.runId,a.barcode,a.packetDigest,a.expectedRevision,a.fields||null,a.mode||null]);
// One exact evidence binding per review-session attempt. Late completions never
// confirm a newer review, and ambiguity cannot silently create a new request.
export function createMetadataApplication(request:(path:string,options:any)=>Promise<any>,id:()=>string=()=>crypto.randomUUID()){
 let attempt:Promise<{confirmed:boolean}>|null=null,binding:string|null=null,invalid=false;
 return {
  invalidate(){invalid=true;},
  async apply(action:MetadataAction){
   if(!reviewedFields(action))return {confirmed:false,invalid:true};
   const current=key(action);
   if(invalid||binding!==null&&binding!==current)return {confirmed:false,stale:true};
   if(!attempt){
    binding=current;const {kind,...reviewed}=action;
    attempt=(async()=>{try{
     const result=await request('/admin/recycling-intelligence/catalogue/apply',{method:'POST',body:{...reviewed,requestId:id()},signal:AbortSignal.timeout(20000)});
     return {confirmed:result?.active===true&&typeof result.id==='string'};
    }catch{return {confirmed:false};}})();
   }
   const result=await attempt;
   return invalid||binding!==current?{confirmed:false,stale:true}:result;
  }
 };
}
