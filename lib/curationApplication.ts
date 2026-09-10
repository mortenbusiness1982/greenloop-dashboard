export type MetadataAction={kind:'apply_metadata';runId:string;barcode:string;packetDigest:string;expectedRevision:string};
// One explicit review-session attempt. Ambiguous outcomes stay unconfirmed and
// cannot be retried silently with a new idempotency key.
export function createMetadataApplication(request:(path:string,options:any)=>Promise<any>,id:()=>string=()=>crypto.randomUUID()){
 let attempt:Promise<{confirmed:boolean}>|null=null;
 return {apply(action:MetadataAction){
  if(attempt)return attempt;
  const {kind,...binding}=action;
  attempt=(async()=>{try{
   const result=await request('/admin/recycling-intelligence/catalogue/apply',{method:'POST',body:{...binding,requestId:id()},signal:AbortSignal.timeout(20000)});
   return {confirmed:result?.active===true&&typeof result.id==='string'};
  }catch{return {confirmed:false};}})();
  return attempt;
 }};
}
