const {chromium}=require('playwright'),assert=require('node:assert/strict');
const localOrigin=process.env.TEST_DASHBOARD_ORIGIN||'http://127.0.0.1:4319';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:950}}),saved=new Set(),writes=[],activityReads=[];
  const products=[{id:'a',ean:'11111111',name:'Glass bottle',brandName:'Maker',state:'pending',runId:'run',completeness:100,missingFields:[]},{id:'b',ean:'22222222',name:'Second bottle',brandName:'Maker',state:'pending',runId:'run',completeness:100,missingFields:[]},{id:'c',ean:'33333333',name:'Higos',brandName:null,state:'unresolved',runId:null,completeness:75,missingFields:['brand']},{id:'d',ean:'44444444',name:null,brandName:null,state:'unprocessed',runId:null,completeness:0,missingFields:['name','brand','photo','packaging','guidance']}];
  const detail=barcode=>({barcode,productId:barcode,revision:'v1',readOnly:true,enrichment:false,stale:false,current:{name:'Bottle',brand:'Maker',packaging:[{key:'primary',role:'primary',form:'bottle',material:'glass',guidance:{status:'verified',container:{color:'green'}}}]},images:[{url:'https://fixtures.example.com/product.jpg',authenticated:false}],packet:{proposals:[],visualProposals:[{field:'packaging_component'}],sources:[],current:{name:'Bottle',brand:'Maker'}},actions:[],manualReview:{expectedRevision:'1',evidenceFingerprint:'a'.repeat(64),packetDigest:'b'.repeat(64),rejected:false,packagingKeys:['primary']}});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin===localOrigin)return route.continue();
   if(url.hostname==='fixtures.example.com')return route.fulfill({path:'public/greenloop-logo.jpg',contentType:'image/jpeg'});
   if(url.pathname!=='/fixture-session'&&!url.pathname.startsWith('/admin/recycling-intelligence/'))return route.abort();
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   let body,status=200;const path=url.pathname;
   if(path==='/fixture-session')body={localFixture:true,token:'local-test-only'};
   else if(path.endsWith('/summary'))body={summary:{totalProducts:4,classified:3,verified:2,scannedProducts:4,resolvedScannedProducts:2}};
   else if(path.endsWith('/outcomes'))body={totalProducts:4,completeProducts:2,completePercent:50,classified:3,catalogueCoveragePercent:75,productsImproved:saved.size,improvedLast24Hours:2,improvedLatestBatch:1,latestBatch:{id:'run',startedAt:'2026-09-11T10:00:00Z',endedAt:'2026-09-11T10:05:00Z'},contributions:{openFoodFacts:{products:3,completeAtImport:null,historyAvailable:false},intelligence:{improvedProducts:2},users:{products:1,improvedProducts:1}},topContributors:[{id:'u',name:'Morten',products:1,improvedProducts:1}],pendingCount:2-saved.size,pending:products.filter(p=>p.state==='pending'&&!saved.has(p.ean)).map(p=>({barcode:p.ean,name:p.name,runId:'run',fields:['packaging_component']})),photosAdded:0,missingInformation:2,gaps:{name:1,brand:2,photo:1,packaging:1},readOnly:true,enrichment:false,asOf:new Date().toISOString()};
   else if(path.endsWith('/activity')){const kind=url.searchParams.get('kind');activityReads.push(kind);body={kind,asOf:new Date().toISOString(),readOnly:true,enrichment:false,items:Array.from({length:7},(_,i)=>({id:kind+i,barcode:'11111111',name:kind==='recycled'?'Recycled bottle '+i:kind==='scans'?'Scanned bottle '+i:'Submitted bottle '+i,userName:'Activity user',occurredAt:'2026-09-11T10:00:00Z',units:2,...(kind==='submissions'?{photo:{url:'https://fixtures.example.com/product.jpg',authenticated:false}}:{})}))};}
   else if(path.endsWith('/runs'))body={runs:[],nextCursor:null,enrichment:false};
   else if(path.endsWith('/workflow-queue')){const all=products.map(p=>({...p,state:saved.has(p.ean)?'resolved':p.state}));const state=url.searchParams.get('status'),filter=url.searchParams.get('completeness');const rows=all.filter(p=>(state==='all'||p.state===state)&&(filter==='all'||filter==='below50'&&p.completeness<50||filter==='50'&&p.completeness===50||filter==='above50'&&p.completeness>50||filter==='100'&&p.completeness===100));body={products:rows,counts:{all:4,pending:2-saved.size,unprocessed:1,resolved:saved.size,unresolved:1},total:rows.length,nextOffset:null,readOnly:true,enrichment:false};}
   else if(path.endsWith('/decision')){const barcode=path.split('/').at(-2);writes.push(barcode);if(barcode==='22222222'){status=409;body={error:'REVIEW_CHANGED'};}else{saved.add(barcode);body={saved:true};}}
   else if(path.includes('/review/'))body=detail(path.split('/').at(-1));
   else return route.fulfill({status:404,headers,json:{error:'Fixture route missing'}});
   return route.fulfill({status,headers,json:body});
  });
  await page.goto(localOrigin+'/curation-preview');
  await page.getByRole('heading',{name:'Complete products',exact:true}).waitFor();
  assert.equal(await page.getByRole('progressbar',{name:'Complete products'}).getAttribute('aria-valuenow'),'2');
  await page.getByText('Last 24 hours',{exact:true}).waitFor();
  await page.getByText('2 products need information',{exact:true}).waitFor();await page.getByText('Of these:',{exact:true}).waitFor();
  assert.equal(await page.getByText(/complete at import/i).count(),0);
  const activity=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Recent user activity'})}).last();
  assert.equal(await activity.getAttribute('open'),null);assert.deepEqual(activityReads,[]);
  await activity.locator('summary').click();await activity.getByText('Recycled bottle 0',{exact:true}).waitFor();assert.equal(await activity.locator('li').count(),5);
  await activity.getByRole('button',{name:'See all',exact:true}).click();assert.equal(await activity.locator('li').count(),7);
  await activity.getByRole('combobox',{name:'Activity type'}).selectOption('scans');await activity.getByText('Scanned bottle 0',{exact:true}).waitFor();assert.equal(await activity.getByText('Recycled bottle 0',{exact:true}).count(),0);
  await activity.getByRole('combobox',{name:'Activity type'}).selectOption('submissions');await activity.getByText('Submitted bottle 0',{exact:true}).waitFor();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).some(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/recent-activity-${width}.png`,fullPage:true});
  await activity.locator('summary').click();assert.deepEqual([...new Set(activityReads)],['recycled','scans','submissions']);
  const leaders=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Top contributing users'})}).last();
  assert.equal(await leaders.getAttribute('open'),null);
  await leaders.locator('summary').click();await page.getByText('Morten',{exact:true}).waitFor();await leaders.locator('summary').click();
  await page.getByLabel('About these statistics',{exact:true}).click();await page.getByText(/Each counts for 25%/).waitFor();await page.getByLabel('About these statistics',{exact:true}).click();
  await page.screenshot({path:`/private/tmp/intelligence-statistics-${width}.png`,fullPage:true});
  const queue=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Product review queue'})}).last();
  await queue.waitFor();assert.equal(await queue.getAttribute('open'),null);
  assert.equal(await page.locator('details[aria-label="Latest batch"]').getAttribute('open'),null);
  await queue.locator('summary').first().click();
  await page.getByRole('checkbox',{name:'Select Glass bottle',exact:true}).check();
  await page.getByRole('checkbox',{name:'Select Second bottle',exact:true}).check();
  await page.getByRole('button',{name:'Review selected (2)',exact:true}).click();
  const confirm=page.getByRole('button',{name:'Confirm packaging (2)',exact:true});await confirm.waitFor();await confirm.click();
  await page.getByText('Review finished. Unsaved items remain selected.').waitFor();assert.deepEqual(writes,['11111111','22222222']);
  await page.getByRole('button',{name:'Close bulk review'}).click();
  assert.equal(await page.getByRole('checkbox',{name:'Select Second bottle',exact:true}).isChecked(),true);
  await page.getByRole('combobox',{name:'Product status'}).selectOption('all');
  await page.getByRole('combobox',{name:'Completeness',exact:true}).selectOption('below50');
  await page.getByText('44444444',{exact:true}).waitFor();assert.equal(await page.getByText('33333333',{exact:true}).count(),0);
  await page.getByRole('combobox',{name:'Completeness',exact:true}).selectOption('all');await page.getByText('33333333',{exact:true}).waitFor();
  assert.equal(await page.getByRole('checkbox',{name:'Select Higos',exact:true}).isEnabled(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/completeness-${width}.png`,fullPage:true});await page.close();
 }console.log('Desktop/mobile: collapsed sections, filters, photo loading, partial bulk success, retained failures and overflow checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
