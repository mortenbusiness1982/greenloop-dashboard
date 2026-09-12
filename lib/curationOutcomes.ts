export type Outcomes={productsImproved:number;pendingCount:number;photosAdded:number;missingInformation:number;gaps:{name:number;brand:number;photo:number;packaging:number};pending:{barcode:string;name:string|null;runId:string;fields:string[]}[];asOf:string;readOnly:true;enrichment:false;
 recentImprovements?:{productId:string;barcode:string;name:string|null;at:string;fields:{field:'name'|'brand'|'packaging'|'photo';value:string|null}[]}[];
 totalProducts?:number;completeProducts?:number;completePercent?:number|null;classified?:number;catalogueCoveragePercent?:number|null;
 improvedLast24Hours?:number;improvedLatestBatch?:number|null;latestBatch?:{id:string;startedAt:string;endedAt:string}|null;
 contributions?:{openFoodFacts:{products:number;completeAtImport:number|null;historyAvailable:boolean};intelligence:{improvedProducts:number;fields?:{name:number;brand:number;photo:number;packaging:number}};users:{products:number;improvedProducts:number}};
 topContributors?:{id:string;name:string;products:number;improvedProducts:number}[]};
export function validateOutcomes(value:Outcomes):Outcomes{
 if(value?.readOnly!==true||value.enrichment!==false||!Array.isArray(value.pending)||value.pending.length!==value.pendingCount||!Number.isFinite(Date.parse(value.asOf)))throw Error('Outcomes unavailable');
 for(const count of [value.productsImproved,value.pendingCount,value.photosAdded,value.missingInformation,...Object.values(value.gaps||{})])if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid outcome count');
 if(!value.gaps||['name','brand','photo','packaging'].some(k=>!(k in value.gaps)))throw Error('Missing gap counts');
 for(const k of ['totalProducts','completeProducts','classified','improvedLast24Hours','improvedLatestBatch'] as const)if(value[k]!=null&&(!Number.isSafeInteger(value[k])||(value[k] as number)<0))throw Error('Invalid progress count');
 for(const k of ['completePercent','catalogueCoveragePercent'] as const)if(value[k]!=null&&(!Number.isFinite(value[k])||(value[k] as number)<0||(value[k] as number)>100))throw Error('Invalid percentage');
 if(value.totalProducts!=null&&value.completeProducts!=null&&value.completeProducts+value.missingInformation!==value.totalProducts)throw Error('Inconsistent completeness');
 const fields=value.contributions?.intelligence.fields;
 if(fields&&['name','brand','photo','packaging'].some(k=>!Number.isSafeInteger(fields[k as keyof typeof fields])||fields[k as keyof typeof fields]<0||fields[k as keyof typeof fields]>value.contributions!.intelligence.improvedProducts))throw Error('Invalid improvement breakdown');
 if(value.recentImprovements!=null){
  if(!Array.isArray(value.recentImprovements)||value.recentImprovements.length>20)throw Error('Invalid recent improvements');
  const ids=new Set();
  for(const p of value.recentImprovements){
   if(typeof p.productId!=='string'||!p.productId||ids.has(p.productId)||!/^\d{8,14}$/.test(p.barcode)||!Number.isFinite(Date.parse(p.at))||Date.parse(p.at)>Date.parse(value.asOf)||p.name!=null&&typeof p.name!=='string'||!Array.isArray(p.fields)||!p.fields.length||p.fields.some(f=>!['name','brand','photo','packaging'].includes(f.field)||f.value!=null&&typeof f.value!=='string'))throw Error('Invalid recent improvement');
   ids.add(p.productId);
  }
 }
 return value;
}
