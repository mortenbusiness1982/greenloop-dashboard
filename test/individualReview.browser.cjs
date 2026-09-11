const {chromium}=require('playwright'),assert=require('node:assert/strict');
const origin=process.env.TEST_DASHBOARD_ORIGIN||'http://127.0.0.1:3098';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:950}}),writes=[];
  const barcode='3276007482768';let pending=true,mode='proposal';
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin===origin)return route.continue();
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   const path=url.pathname;let body;
   if(path==='/fixture-session')body={localFixture:true,token:'isolated-test'};
   else if(path.endsWith('/summary'))body={summary:{totalProducts:1,classified:0,verified:0,scannedProducts:1,resolvedScannedProducts:0}};
   else if(path.endsWith('/outcomes'))body={asOf:new Date().toISOString(),totalProducts:1,classified:0,catalogueCoveragePercent:0,productsImproved:0,pendingCount:pending?1:0,pending:pending?[{barcode,name:null,runId:'run',fields:['brand']}]:[],photosAdded:0,missingInformation:1,gaps:{name:1,brand:1,photo:1,packaging:1},readOnly:true,enrichment:false};
   else if(path.endsWith('/runs'))body={runs:[],nextCursor:null,enrichment:false};
   else if(path.endsWith('/workflow-queue'))body={products:[{id:'p',ean:barcode,name:null,brandName:null,state:pending?'pending':'unresolved',runId:pending?'run':null,completeness:0,missingFields:['name','brand','photo','packaging']}],counts:{all:1,pending:pending?1:0,unprocessed:0,resolved:0,unresolved:pending?0:1},total:1,nextOffset:null,readOnly:true,enrichment:false};
   else if(path.endsWith('/decision')){writes.push(route.request().postDataJSON());pending=false;body={saved:true};}
   else if(path.endsWith('/name-suggestions'))body={barcode,suggestions:[],readOnly:true,enrichment:false,lookupStatus:'complete'};
   else if(path.includes('/review/'))body={barcode,productId:'p',revision:mode,readOnly:true,enrichment:false,stale:false,current:{name:null,brand:null,packaging:[]},images:[],packet:mode==='proposal'?{proposals:[{field:'brand',value:'LEXMAN',sourceId:'retailer'}],visualProposals:[],sources:[{id:'retailer',url:'https://example.com/product',identityExcerpt:'Exact barcode: LEXMAN'}],current:{name:null,brand:null}}:null,actions:[],manualReview:{expectedRevision:'1',evidenceFingerprint:'a'.repeat(64),packetDigest:mode==='proposal'?'b'.repeat(64):null,rejected:false,detailFields:mode==='proposal'?['brand']:[],packagingKeys:[]}};
   else return route.abort();
   return route.fulfill({headers,json:body});
  });
  await page.goto(origin+'/curation-preview');
  const queue=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Product review queue'})}).last();await queue.locator('summary').first().click();
  await queue.getByText(barcode,{exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByText('No photo available').waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Approve & finish review',exact:true}).isEnabled(),false);
  await dialog.getByRole('checkbox',{name:/Brand.*LEXMAN/}).check();
  await dialog.getByRole('button',{name:'Approve & finish review',exact:true}).click();
  await dialog.waitFor({state:'detached'});assert.equal(writes.length,1);assert.deepEqual(writes[0].fields,['brand']);assert.equal(writes[0].component,undefined);assert.equal(writes[0].finishReview,true);
  mode='empty';await page.getByRole('combobox',{name:'Product status'}).selectOption('all');
  await queue.getByText(barcode,{exact:true}).click();await page.getByRole('dialog').getByText('No photo available').waitFor();
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Approve selected details',exact:true}).isEnabled(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/individual-review-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Send for research',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal(writes[1].decision,'send_research');assert.equal(writes[1].packetDigest,null);assert.equal(writes[1].fields,undefined);assert.equal(writes[1].component,undefined);
  await page.close();
 }console.log('Mobile/desktop: partial brand approval without image, finish-and-close, empty product research and overflow checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
