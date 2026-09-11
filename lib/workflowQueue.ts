export const workflowStates=['pending','unprocessed','resolved','unresolved','all'] as const;
export type WorkflowProduct={id:string;ean:string;name:string|null;brandName:string|null;state:string;runId:string|null;missingFields?:string[];completeness?:number};
export function bulkCandidate(p:WorkflowProduct){return p.state==='pending'&&!!p.runId&&p.completeness===100&&Array.isArray(p.missingFields)&&p.missingFields.length===0;}
export function missingFieldLabel(fields:string[]|undefined,language:'en'|'es'){
 const labels:Record<string,string>=language==='es'?{name:'Nombre',brand:'Marca',photo:'Foto',packaging:'Envase',guidance:'Regla de reciclaje'}:{name:'Name',brand:'Brand',photo:'Photo',packaging:'Packaging',guidance:'Recycling rule'};
 return fields?.length?(language==='es'?'Falta: ':'Missing: ')+fields.map(f=>labels[f]||f).join(', '):null;
}
export type WorkflowPage={products:WorkflowProduct[];counts:Record<string,number>;total:number;nextOffset:number|null;readOnly:true;enrichment:false};
export function validateWorkflowPage(value:WorkflowPage):WorkflowPage{
 if(value?.readOnly!==true||value.enrichment!==false||!Array.isArray(value.products)||!value.counts)throw Error('Product queue unavailable');
 if(workflowStates.some(k=>!Number.isSafeInteger(value.counts[k])||value.counts[k]<0)||value.counts.all!==workflowStates.filter(k=>k!=='all').reduce((n,k)=>n+value.counts[k],0))throw Error('Invalid queue counts');
 if(!Number.isSafeInteger(value.total)||value.total<value.products.length||value.total>value.counts.all||value.nextOffset!==null&&(!Number.isSafeInteger(value.nextOffset)||value.nextOffset<=0))throw Error('Invalid queue page');
 if(value.products.some(p=>!p.id||!p.ean||!workflowStates.includes(p.state as typeof workflowStates[number])||p.state==='all'||p.state==='pending'&&!p.runId))throw Error('Invalid queue product');
 return value;
}
