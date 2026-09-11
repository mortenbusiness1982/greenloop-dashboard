const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
function load(file){const m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {planBulkReview,confirmBulkPlan}=load('lib/bulkReview.ts');
const {bulkCandidate}=load('lib/workflowQueue.ts');
const data={barcode:'12345678',revision:'view1',readOnly:true,enrichment:false,stale:false,current:{name:'Product name',brand:'Brand',packaging:[{key:'primary',role:'primary',form:'bottle',material:'glass',guidance:{status:'verified',container:{color:'green'}}}]},images:[{url:'https://example.com/photo.jpg'}],packet:{proposals:[],visualProposals:[{field:'packaging_component'}]},manualReview:{expectedRevision:'3',evidenceFingerprint:'evidence',packetDigest:'packet',rejected:false,packagingKeys:['primary']}};
test('only complete pending products with guidance can be selected',()=>{
 const row={state:'pending',runId:'run',completeness:100,missingFields:[]};assert.equal(bulkCandidate(row),true);
 for(const change of [{completeness:75},{state:'resolved'},{missingFields:['guidance']},{missingFields:undefined}])assert.equal(bulkCandidate({...row,...change}),false);
});
test('preview binds exact component, evidence, revision and stable request ID',()=>{
 const plan=planBulkReview(data,'request');assert.equal(plan.body.requestId,'request');assert.equal(plan.body.packetDigest,'packet');assert.deepEqual(plan.body.component,{key:'primary',role:'primary',form:'bottle',material:'glass'});
});
test('stale, missing, mixed and unsupported proposals require individual review',()=>{
 for(const patch of [{stale:true},{images:[]},{manualReview:{...data.manualReview,completed:true}},{packet:{proposals:[{field:'name',value:'Other'}]}},{manualReview:{...data.manualReview,packagingKeys:['primary','cap']}},{current:{...data.current,brand:null}},{current:{...data.current,packaging:[]}}])assert.throws(()=>planBulkReview({...data,...patch},'id'));
});
test('changed evidence or guidance never dispatches approval',async()=>{
 const plan=planBulkReview(data,'request');let writes=0;
 for(const changed of [{...data,revision:'new'},{...data,barcode:'87654321'},{...data,manualReview:{...data.manualReview,evidenceFingerprint:'changed'}},{...data,current:{...data.current,packaging:[{...data.current.packaging[0],guidance:{status:'unknown'}}]}}])await assert.rejects(confirmBulkPlan(plan,async()=>changed,async()=>{writes++;return {saved:true};}));
 assert.equal(writes,0);
});
test('only confirmed saves succeed; failures do not retry or prevent another item',async()=>{
 const plan=planBulkReview(data,'request');let calls=0;
 await assert.rejects(confirmBulkPlan(plan,async()=>data,async()=>{calls++;throw Error('timeout');}));assert.equal(calls,1);
 await assert.rejects(confirmBulkPlan(plan,async()=>data,async()=>({saved:false})));
 await confirmBulkPlan(plan,async()=>data,async body=>{assert.equal(body.requestId,'request');return {saved:true};});
});
