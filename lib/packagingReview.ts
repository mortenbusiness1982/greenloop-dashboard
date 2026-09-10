type Component={key:string;role:string;form:string;material:string};
export function initialPackaging(components:Component[]){
 const c=components.find(c=>c.role==='primary')||components[0];
 return c?{...c}:{key:'',role:'primary',form:'',material:''};
}
export function barcodeResearchLinks(barcode:string){
 if(!/^\d{8,14}$/.test(barcode))return [];
 return [{label:'Web',url:'https://www.google.com/search?q='+encodeURIComponent('"'+barcode+'"')},
  {label:'Open Food Facts',url:'https://world.openfoodfacts.org/product/'+barcode}];
}
export function queueNeed(p:{name:string|null;ean:string;brandName:string|null;materialType:string|null;packagingForm:string|null;state:string},es=false){
 const name=p.name?.trim();
 if(!name||name===p.ean||/^(unknown|product|producto)(\s+\d+)?$/i.test(name))return es?'Nombre pendiente':'Name needed';
 if(!p.materialType||p.materialType==='other'||!p.packagingForm)return es?'Envase pendiente':'Packaging needed';
 if(!p.brandName||/^(greenloop|unknown)$/i.test(p.brandName))return es?'Marca pendiente':'Brand needed';
 if(p.state==='rule_missing')return es?'Regla de reciclaje pendiente':'Recycling rule needed';
 if(p.state==='failed')return es?'La última búsqueda falló':'Last lookup failed';
 return es?'Revisar envase':'Review packaging';
}
