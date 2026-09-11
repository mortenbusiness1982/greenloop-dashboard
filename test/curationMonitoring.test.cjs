const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
function load(file,mocks={}){const m=new Module(file,module);m.require=id=>id in mocks?mocks[id]:require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {createRefreshController}=load('lib/refreshController.ts'),{validateHistory}=load('lib/curationMonitoring.ts');
const {initialPackaging,barcodeResearchLinks,queueNeed}=load('lib/packagingReview.ts');
test('queue explains the actual missing field, not another packaging confirmation',()=>{
 const {missingFieldLabel}=load('lib/workflowQueue.ts');
 assert.equal(missingFieldLabel(['brand'],'en'),'Missing: Brand');
 assert.equal(missingFieldLabel(['brand'],'es'),'Falta: Marca');
 assert.equal(missingFieldLabel([],'en'),null);
});
const {actionableBatchProducts}=load('lib/curationReview.ts');
test('compact batch shows decisions only, not unresolved historical Cheddar results',()=>{
 const products=[{barcode:'cheddar',outcome:'deferred'},{barcode:'name',outcome:'staged'},{barcode:'cap',outcome:'proposed_not_published'},{barcode:'failed',outcome:'failed'}];
 assert.deepEqual(actionableBatchProducts(products,{},'run').map(p=>p.barcode),['name','cap']);
 assert.deepEqual(actionableBatchProducts(products,{'run:name':'recorded','run:cap':'rejected'},'run'),[]);
 assert.equal(products.length,4);
});
test('pending cap takes priority over the primary bottle',()=>{
 const bottle={key:'primary',role:'primary',form:'bottle',material:'plastic'};
 const cap={key:'dispensing_cap',role:'secondary',form:'other',material:'plastic'};
 assert.deepEqual(initialPackaging([bottle,cap],['dispensing_cap']),cap);
 assert.deepEqual(initialPackaging([bottle],['dispensing_cap']),{key:'',role:'primary',form:'',material:''});
});
const {proposalProgress}=load('lib/proposalProgress.ts');
const {validateOutcomes}=load('lib/curationOutcomes.ts');
const {validateWorkflowPage}=load('lib/workflowQueue.ts');
test('workflow dropdown counts and pending links validate before display',()=>{
 const value={readOnly:true,enrichment:false,products:[{id:'p',ean:'12345678',state:'pending',runId:'run'}],counts:{all:4,pending:1,unprocessed:1,resolved:1,unresolved:1},total:1,nextOffset:null};
 assert.equal(validateWorkflowPage(value).counts.pending,1);
 for(const bad of [{...value,counts:{...value.counts,all:5}},{...value,total:null},{...value,products:[{...value.products[0],runId:null}]},{...value,enrichment:true}])assert.throws(()=>validateWorkflowPage(bad));
});
test('current outcomes reject unknown or inconsistent counts rather than showing zero',()=>{
 const value={readOnly:true,enrichment:false,asOf:'2026-09-11T09:00:00Z',productsImproved:10,pendingCount:0,pending:[],photosAdded:1,missingInformation:20,gaps:{name:1,brand:2,photo:20,packaging:3}};
 assert.equal(validateOutcomes(value).productsImproved,10);
 for(const bad of [{...value,pendingCount:1},{...value,productsImproved:null},{...value,gaps:{}},{...value,enrichment:true}])assert.throws(()=>validateOutcomes(bad));
});
test('pending proposals reconcile against persisted values across reloads',()=>{
 const data={readOnly:true,enrichment:false,current:{name:'Saved name',brand:'Saved brand',packaging:[]},packet:{proposals:[{field:'name',value:'Saved name'},{field:'brand',value:'Saved brand'}]}};
 assert.equal(proposalProgress(data),'recorded');
 assert.equal(proposalProgress({...data,manualReview:{rejected:false,completed:false}}),'pending');
 assert.equal(proposalProgress({...data,current:{...data.current,name:'Human alternative'},manualReview:{rejected:false,completed:true}}),'recorded');
 assert.equal(proposalProgress({...data,current:{...data.current,brand:'Old brand'}}),'pending');
 assert.equal(proposalProgress({...data,manualReview:{rejected:true}}),'rejected');
 assert.equal(proposalProgress({...data,packet:null}),'unavailable');
 assert.equal(proposalProgress({...data,packet:{proposals:[]}}),'pending');
});
test('packaging confirmation cannot clear outstanding identity or unknown proposals',()=>{
 const current={name:'Old name',brand:null,packaging:[{key:'main',role:'primary',form:'bottle',material:'plastic'}]};
 const visual={field:'packaging_component',componentKey:'main',componentRole:'primary',packagingForm:'bottle',materialType:'plastic'};
 const data={readOnly:true,enrichment:false,current,packet:{proposals:[],visualProposals:[visual]}};
 assert.equal(proposalProgress(data),'recorded');
 assert.equal(proposalProgress({...data,packet:{...data.packet,proposals:[{field:'name',value:'New name'}]}}),'pending');
 assert.equal(proposalProgress({...data,packet:{proposals:[{field:'photo',value:'new image'}]}}),'pending');
 assert.equal(proposalProgress({...data,current:{...current,packaging:[]}}),'pending');
});
test('review starts from recorded primary packaging, never invents material',()=>{
 const cap={key:'cap',role:'cap',form:'other',material:'plastic'},bottle={key:'main',role:'primary',form:'bottle',material:'glass'};
 assert.deepEqual(initialPackaging([cap,bottle]),bottle);assert.deepEqual(initialPackaging([cap]),cap);
 assert.deepEqual(initialPackaging([]),{key:'',role:'primary',form:'',material:''});
});
test('barcode research links use exact digits and reject unsafe input',()=>{
 assert.equal(barcodeResearchLinks('8414100381785').length,2);
 assert.equal(new URL(barcodeResearchLinks('8414100381785')[0].url).searchParams.get('q'),'"8414100381785"');
 assert.deepEqual(barcodeResearchLinks('1234<script>'),[]);
});
test('queue labels reflect current gaps instead of historical metadata errors',()=>{
 const p={name:'Kofu wall light',ean:'3276007147575',brandName:'Unknown',materialType:null,packagingForm:null,state:'under_review'};
 assert.equal(queueNeed(p),'Packaging needed');assert.equal(queueNeed({...p,name:p.ean}),'Name needed');
 assert.equal(queueNeed({...p,materialType:'cardboard',packagingForm:'box'}),'Brand needed');
});
function environment(){const w=new EventTarget(),d=new EventTarget();d.visibilityState='visible';const timers=new Map();let id=0;w.setTimeout=fn=>{timers.set(++id,fn);return id;};w.clearTimeout=n=>timers.delete(n);w.setInterval=fn=>{timers.set(++id,fn);return id;};w.clearInterval=n=>timers.delete(n);return {window:w,document:d,timers};}
test('manual refresh coalesces overlapping requests and preserves last success on failure',async()=>{const env=environment(),states=[],values=[];let resolve,calls=0;const c=createRefreshController(()=>{calls++;return new Promise(r=>resolve=r);},v=>values.push(v),s=>states.push(s),env);const a=c.refresh();await c.refresh();assert.equal(calls,1);resolve('first');await a;assert.deepEqual(values,['first']);assert.ok(states.at(-1).lastUpdated);c.dispose();assert.equal(env.timers.size,0);});
test('poll, focus, visible and online events refresh; hidden and disposed do not',async()=>{const env=environment();let calls=0;const c=createRefreshController(async()=>++calls,()=>{},()=>{},env);await c.refresh();env.document.visibilityState='hidden';env.window.dispatchEvent(new Event('focus'));assert.equal(calls,1);env.document.visibilityState='visible';env.window.dispatchEvent(new Event('online'));await new Promise(setImmediate);assert.equal(calls,2);[...env.timers.values()][0]();await new Promise(setImmediate);assert.equal(calls,3);env.document.dispatchEvent(new Event('visibilitychange'));await new Promise(setImmediate);assert.equal(calls,4);c.dispose();env.window.dispatchEvent(new Event('focus'));assert.equal(calls,4);});
test('failure retains data and timestamp; timeout aborts and reports a real error',async()=>{const env=environment(),states=[],values=[];let fail=false;const c=createRefreshController(async()=>{if(fail)throw Error('HTTP 401');return 'good';},x=>values.push(x),s=>states.push(s),env);await c.refresh();const at=states.at(-1).lastUpdated;fail=true;await c.refresh();assert.deepEqual(values,['good']);assert.equal(states.at(-1).lastUpdated,at);assert.equal(states.at(-1).error,'HTTP 401');c.dispose();const b=createRefreshController(signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')))),()=>{},s=>states.push(s),env);const pending=b.refresh();[...env.timers.values()].at(-1)();await pending;assert.equal(states.at(-1).error,'Request timed out');b.dispose();});
test('filter-change disposal ignores late old response and cancels requests',async()=>{const env=environment(),values=[];let resolve,signal;const c=createRefreshController(s=>{signal=s;return new Promise(r=>resolve=r);},x=>values.push(x),()=>{},env);const pending=c.refresh();c.dispose();assert.equal(signal.aborted,true);resolve('old');await pending;assert.deepEqual(values,[]);});
test('empty and unavailable histories remain distinct; invalid counts rejected',()=>{assert.deepEqual(validateHistory({runs:[],nextCursor:null,enrichment:false}).runs,[]);const unavailable={runId:'id',reservedAt:'2026-09-10',report:null,counts:null,historyState:'outcomes_unavailable'};assert.equal(validateHistory({runs:[unavailable],nextCursor:'next',enrichment:false}).runs[0].counts,null);assert.throws(()=>validateHistory({runs:[{...unavailable,report:{products:[{}]},counts:{reserved:0}}],nextCursor:null,enrichment:false}),/count mismatch/);});
test('monitor API uses session auth, no-store and cancellation; returns HTTP status',async()=>{let cleared=false,seen;const {apiFetch}=load('lib/api.ts',{'@/lib/auth':{clearToken:()=>cleared=true}});const old=global.fetch;global.fetch=async(url,options)=>{seen=options;return {ok:false,status:401,text:async()=>JSON.stringify({error:'Token expired'})};};try{const signal=new AbortController().signal;await assert.rejects(apiFetch('/admin/recycling-intelligence/runs',{token:'isolated-jwt',cache:'no-store',signal}),e=>e.status===401);assert.equal(seen.cache,'no-store');assert.equal(seen.signal,signal);assert.equal(seen.headers.Authorization,'Bearer isolated-jwt');assert.equal(cleared,true);}finally{global.fetch=old;}});
const {catalogueProgress,compactCounts,reviewState,safeSource,usefulName}=load('lib/curationReview.ts');
test('catalogue progress uses all products and primary classifications, not queue or staged counts',()=>{
 assert.deepEqual(catalogueProgress({totalProducts:100,classified:60,verified:45,scannedProducts:70,resolvedScannedProducts:50}),{totalProducts:100,classified:60,verified:45,scannedProducts:70,resolvedScannedProducts:50,remaining:40,percent:60});
 assert.equal(catalogueProgress({totalProducts:0,classified:0,verified:0,scannedProducts:0,resolvedScannedProducts:0}).percent,null);
 for(const s of [{},{totalProducts:10,classified:11,verified:0,scannedProducts:0,resolvedScannedProducts:0},{totalProducts:10,classified:5,verified:6,scannedProducts:0,resolvedScannedProducts:0}])assert.throws(()=>catalogueProgress(s));
});
test('compact batch counts never equate reserved with processed or staged with updated',()=>{
 assert.deepEqual(compactCounts({reserved:10,attempted:6,attemptedUnknown:2,published:1,staged:2,deferred:3,failed:0,inspected:4}),{processed:6,photosPublished:1,staged:2,unresolved:3,failed:0,unknown:2});
});
test('specific review states, missing names and safe full source URLs',()=>{
 assert.equal(reviewState({outcome:'uncertain',reason:'Identity conflict: current name differs',gaps:['photo_missing']}),'identity');
 assert.equal(reviewState({outcome:'uncertain',reason:'Packaging conflict: PET versus glass',gaps:['photo_unreviewed']}),'material');
 assert.equal(reviewState({outcome:'staged',gaps:[],reason:null}),'ready');assert.equal(reviewState({outcome:'published',gaps:[],reason:null}),'published');assert.equal(reviewState(null),'none');
 assert.equal(usefulName('8411327002745','8411327002745'),null);assert.equal(usefulName('Unknown','12345678'),null);
 assert.equal(safeSource('https://tienda.consum.es/es/p/item/1234'),true);for(const url of ['tienda.consum.es','javascript:alert(1)','https://example.com/a?signature=secret','https://user:pass@example.com/a','https://127.0.0.1/a'])assert.equal(safeSource(url),false);
});

const {createReviewSession}=load('lib/curationReviewSession.ts');
test('own saves automatically accept fresh bindings; external changes still require review',async()=>{
 let revision='1';const states=[];const session=createReviewSession(async()=>({revision}),s=>states.push(s));
 await session.refresh();revision='2';assert.equal(await session.refreshAfterSave(),true);
 assert.equal(states.at(-1).data.revision,'2');assert.equal(states.at(-1).newer,null);
 revision='3';await session.refresh();assert.equal(states.at(-1).data.revision,'2');assert.equal(states.at(-1).newer.revision,'3');session.dispose();
});
test('post-save read supersedes a pending old poll and ignores its late response',async()=>{
 let calls=0,oldResolve,oldSignal;const states=[];
 const session=createReviewSession(signal=>{calls++;if(calls===2){oldSignal=signal;return new Promise(r=>oldResolve=r);}return Promise.resolve({revision:String(calls)});},s=>states.push(s));
 await session.refresh();const old=session.refresh();await new Promise(setImmediate);
 assert.equal(await session.refreshAfterSave(),true);assert.equal(oldSignal.aborted,true);
 oldResolve({revision:'2'});await old;assert.equal(states.at(-1).data.revision,'3');assert.equal(states.at(-1).newer,null);assert.equal(states.at(-1).loading,false);session.dispose();
});
test('failed post-save refresh preserves evidence and read-only retry recovers',async()=>{
 let fail=false;const states=[];const session=createReviewSession(async()=>{if(fail)throw Error('offline');return {revision:'current'};},s=>states.push(s));
 await session.refresh();fail=true;assert.equal(await session.refreshAfterSave(),false);assert.equal(states.at(-1).data.revision,'current');assert.ok(states.at(-1).error);
 fail=false;assert.equal(await session.refreshAfterSave(),true);assert.equal(states.at(-1).error,null);session.dispose();
});
test('unmount during post-save refresh cannot accept a late response',async()=>{
 let resolve;const states=[];const session=createReviewSession(()=>new Promise(r=>resolve=r),s=>states.push(s));
 const pending=session.refreshAfterSave();await new Promise(setImmediate);session.dispose();const count=states.length;resolve({revision:'late'});
 assert.equal(await pending,false);assert.equal(states.length,count);
});
test('detail timeout preserves evidence, releases request and allows retry without silent replacement',async()=>{
 const timers=new Map();let timerId=0;const clock={setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}};
 let calls=0,signal;const states=[];const session=createReviewSession(s=>{signal=s;calls++;return calls===2?new Promise(()=>{}):Promise.resolve({revision:String(calls),name:'Evidence '+calls});},s=>states.push(s),clock);
 await session.refresh();assert.equal(states.at(-1).data.name,'Evidence 1');
 const pending=session.refresh();await new Promise(setImmediate);[...timers.values()][0]();await pending;
 assert.equal(signal.aborted,true);assert.match(states.at(-1).error.message,/timed out/);assert.equal(states.at(-1).loading,false);assert.equal(states.at(-1).data.name,'Evidence 1');
 await session.refresh();assert.equal(calls,3);assert.equal(states.at(-1).data.name,'Evidence 1');assert.equal(states.at(-1).newer.name,'Evidence 3');session.acceptLatest();assert.equal(states.at(-1).data.name,'Evidence 3');session.dispose();assert.equal(timers.size,0);
});
test('detail unmount cancels a hanging request and ignores late results',async()=>{
 let resolve,signal;const states=[];const session=createReviewSession(s=>{signal=s;return new Promise(r=>resolve=r);},s=>states.push(s));
 const pending=session.refresh();await new Promise(setImmediate);session.dispose();const count=states.length;assert.equal(signal.aborted,true);resolve({revision:'late'});await pending;assert.equal(states.length,count);
});
test('both genuine unpublished proposal statuses are ready for review',()=>{
 for(const outcome of ['staged','proposed_not_published'])assert.equal(reviewState({outcome,reason:'Saved proposal',gaps:['packaging']}),'ready');
});
const {createMetadataApplication}=load('lib/curationApplication.ts');
test('explicit metadata application coalesces double clicks and preserves exact binding',async()=>{
 let calls=0,resolve,options;const c=createMetadataApplication(async(path,o)=>{calls++;options=o;assert.equal(path,'/admin/recycling-intelligence/catalogue/apply');return new Promise(r=>resolve=r);},()=> 'fixture-request');
 const action={kind:'apply_metadata',runId:'run',barcode:'20174705',packetDigest:'digest',expectedRevision:'3',fields:['name']};const first=c.apply(action),second=c.apply(action);assert.equal(calls,1);assert.deepEqual(options.body,{runId:'run',barcode:'20174705',packetDigest:'digest',expectedRevision:'3',fields:['name'],requestId:'fixture-request'});assert.ok(options.signal);resolve({id:'application',active:true});assert.deepEqual(await first,{confirmed:true});assert.deepEqual(await second,{confirmed:true});
});
test('timeout, failed and inactive application results remain unconfirmed without retry',async()=>{
 for(const result of [null,{active:false,id:'revoked'},'failure']){let calls=0;const c=createMetadataApplication(async()=>{calls++;if(result==='failure')throw Error('timeout');return result;},()=> 'fixture');assert.deepEqual(await c.apply({fields:['name']}),{confirmed:false});assert.deepEqual(await c.apply({fields:['name']}),{confirmed:false});assert.equal(calls,1);}
});
test('late A result cannot confirm accepted B and different bindings cannot reuse success',async()=>{
 let resolve,updates=0,refreshes=0;const action={kind:'apply_metadata',runId:'A',barcode:'20174705',packetDigest:'digestA',expectedRevision:'1',fields:['name']};
 let active=createMetadataApplication(()=>new Promise(r=>resolve=r),()=> 'requestA');const a=active;
 const completion=a.apply(action).then(result=>{if('stale' in result||a!==active)return;updates++;refreshes++;});
 a.invalidate();active=createMetadataApplication(async()=>({id:'B',active:true}),()=> 'requestB');resolve({id:'A',active:true});await completion;assert.equal(updates,0);assert.equal(refreshes,0);
 const b={...action,runId:'B',packetDigest:'digestB',expectedRevision:'2'};assert.deepEqual(await active.apply(b),{confirmed:true});assert.deepEqual(await active.apply(action),{confirmed:false,stale:true});
});

test('field subset is part of exact action identity and request',async()=>{
 let body;const c=createMetadataApplication(async(_p,o)=>{body=o.body;return {active:true,id:'one'};},()=> 'request');
 const action={kind:'apply_metadata',runId:'run',barcode:'12345678',packetDigest:'digest',expectedRevision:'1',fields:['name']};
 assert.deepEqual(await c.apply(action),{confirmed:true});assert.deepEqual(body.fields,['name']);
 assert.deepEqual(await c.apply({...action,fields:['brand']}),{confirmed:false,stale:true});
 assert.equal(reviewState({outcome:'uncertain',gaps:['photo_missing','name']}),'metadata');
});

test('legacy and malformed subsets fail closed with no misleading action or request',async()=>{
 const {reviewedFields}=load('lib/curationApplication.ts');let calls=0;
 const client=createMetadataApplication(async()=>{calls++;return {id:'bad',active:true};});
 const packet=[{field:'name'},{field:'brand'}];
 for(const fields of [undefined,[],['name','name'],['size'],['name','brand','size']]){
  const action={kind:'apply_metadata',fields};assert.equal(reviewedFields(action,packet),null);
  assert.equal((await client.apply(action)).confirmed,false);
 }
 assert.equal(calls,0);assert.deepEqual(reviewedFields({fields:['name','brand']},packet),['name','brand']);
 assert.equal(reviewedFields({fields:['brand']},[{field:'name'}]),null);
});
