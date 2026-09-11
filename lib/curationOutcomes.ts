export type Outcomes={productsImproved:number;pendingCount:number;photosAdded:number;missingInformation:number;gaps:{name:number;brand:number;photo:number;packaging:number};pending:{barcode:string;name:string|null;runId:string;fields:string[]}[];asOf:string;readOnly:true;enrichment:false};
export function validateOutcomes(value:Outcomes):Outcomes{
 if(value?.readOnly!==true||value.enrichment!==false||!Array.isArray(value.pending)||value.pending.length!==value.pendingCount||!Number.isFinite(Date.parse(value.asOf)))throw Error('Outcomes unavailable');
 for(const count of [value.productsImproved,value.pendingCount,value.photosAdded,value.missingInformation,...Object.values(value.gaps||{})])if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid outcome count');
 if(!value.gaps||['name','brand','photo','packaging'].some(k=>!(k in value.gaps)))throw Error('Missing gap counts');
 return value;
}
