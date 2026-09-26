/* eslint-disable @typescript-eslint/no-require-imports -- Standalone mocked browser verification. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_DASHBOARD_ORIGIN || 'http://localhost:3000';
const output = '/private/tmp/greenloop-workspaces-check';
const products = Array.from({length: 25}, (_, i) => ({id: 'product'+i, name: i===1 ? 'A very long product name for a large reusable bottle with detailed packaging information' : 'Product '+String(i).padStart(2,'0'), ean: '123456789'+i, barcode: '123456789'+i, brand_id: 'brand1', brand_name: 'Fixture brand', source:'open_food_facts', verification_status: i%2 ? 'pending':'verified', verificationStatus:i%2 ? 'imported':'verified', scan_count:12, recycled_units_count:8, updated_at:'2026-09-14T10:00:00Z', is_placeholder_name:i===2}));
const user = {id:'user1',email:'private-user@example.invalid',display_name:'Private User Name',role:'user',brand_id:'brand1',wallet_points:32,created_at:'2026-09-01T10:00:00Z',latest_city:'Benalmadena'};
const brands = [{id:'brand1',name:'Fixture brand',product_count:25,admin_count:1,reward_count:1,eco_points_issued:500}];
const rewards = [{id:'reward1',title:'Fixture reward',brand_id:'brand1',cost_points:10,status:'active'}];
const challenges = [{id:'challenge1',title:'Fixture challenge',required_count:100,active:true,visibility:'private',allowDirectInvites:true}];
const partners = [{id:'partner1',display_name:'Fixture partner',email:'partner@example.invalid',fulfilled_unlocks_count:3}];
const unlocks = [{id:'unlock1',reward_id:'reward1',unlock_status:'active',reward:rewards[0],user,created_at:'2026-09-14T10:00:00Z',promo_code:'FIXTURE'}];
const event = {event_id:'event1',created_at:'2026-09-14T10:00:00Z',product_name:products[1].name,barcode:'123456789',units:8,points_issued:16,city:'Benalmadena',lat:36.59,lng:-4.57,display_name:user.display_name,email:user.email};
const platform = {totals:{totalUnits:200,totalEvents:25,uniqueConsumers:8,ecoPointsIssued:400},events:[event],perProduct:[{product_name:products[0].name,units_recycled:200}],dailyTrend:[{date:'2026-09-14',units:200}],geoBreakdown:[{city:'Benalmadena',units:200,consumers:8}]};
const campaign = {challengeId:'challenge1',title:'Fixture campaign',startsAt:'2026-09-01',endsAt:'2026-10-01',participants:20,completed:10,completionRate:.5,bonusPointsIssued:200,avgUnitsPerParticipant:10,incrementalUnitsLift:5};
const analytics = {totals:{totalEvents:200,trackedUsers:30,trackedSessions:50,eventsPerSession:4,averageSessionDurationMs:50000},movement:{daily:[{day:'2026-09-14',events:100,users:30,sessions:50}],topScreens:[{screen:'Home',screen_views:100,users:30,sessions:50}],topTransitions:[],entryScreens:[],exitScreens:[],screenLoops:[],averageDurationByScreen:[]},funnels:{recycling:{steps:[{step:'scan',users:30,events:100,sessions:50,conversionFromPrevious:1}],largestDropOff:null},rewards:{steps:[],largestDropOff:null},challenges:{steps:[],largestDropOff:null}},friction:{byScreen:[],byDay:[]},breakdowns:{platform:[],appVersion:[]},outcomes:[],health:{latestAppEventAt:'2026-09-14',sessionIdPercent:100,sequenceIndexPercent:100,durationMsPercent:100},filterOptions:{platforms:['android'],locales:['es'],appVersions:['1.0'],screens:['Home'],eventNames:['scan']},privacy:{aggregateOnly:true,rawUserIdsExposed:false,rawMetadataExposed:false,source:'reporting'}};
const adminRoutes=['products','brands','partners','reports','reports/platform','reports/brands','reports/users','reports/geo','reports/exports','reports/app-analytics','maps','maps/recycling-heatmap','bins','settings','audit','users/user1','brands/brand1','partners/partner1','rewards/reward1','challenges/challenge1'];
const brandRoutes=['overview','products','rewards','challenges','reports','reports/recycling','reports/campaigns','reports/behavior','reports/geo','reports/exports','maps','settings'];
const partnerRoutes=['overview','rewards','unlocks','history','settings'];

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const failures=[];
 try {
  for(const width of (process.env.TEST_WIDTH ? [Number(process.env.TEST_WIDTH)] : [390,1512])) {
   for(const [role,prefix,routes] of [['admin','admin',adminRoutes],['brand_admin','brand',brandRoutes],['partner','partner',partnerRoutes]]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[],requests=[];
    let mode='ready';
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
     const req=route.request(),url=new URL(req.url()),p=url.pathname;
     if(url.origin===origin)return route.continue();
     const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,OPTIONS'};
     if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
     if(req.resourceType()==='image')return route.fulfill({path:'public/greenloop-logo.jpg',contentType:'image/jpeg'});
     assert.equal(req.method(),'GET','Read-only workflow checks must not mutate records');
     if(!p.startsWith('/'+prefix+'/')){requests.push('UNEXPECTED '+p);return route.abort();}
     requests.push(p+url.search);
     if(mode==='error')return route.fulfill({headers,status:500,json:{error:'Fixture unavailable'}});
     let body={};
     if(p==='/admin/products')body={products:mode==='empty'?[]:products.filter(x=>!url.searchParams.get('search')||x.name.toLowerCase().includes(url.searchParams.get('search').toLowerCase()))};
     else if(p==='/admin/brands')body={brands};
     else if(p==='/admin/users')body={users:[user]};
     else if(p==='/admin/partners')body={partners};
     else if(p==='/admin/rewards')body={rewards};
     else if(p==='/admin/challenges')body={challenges};
     else if(p==='/admin/rewards/unlocks')body={unlocks};
     else if(p.endsWith('/promo-codes/stats'))body={stats:{available:10}};
     else if(p.endsWith('/participants'))body={participants:[{id:'participant1',displayName:'Private User Name',email:user.email,status:'approved',approvedRecycles:8}]};
     else if(p==='/admin/users/user1/activity')body={user,recycling:[event],scans:[event],activeChallenges:[]};
     else if(p==='/admin/reports/platform')body=platform;
     else if(p==='/admin/reports/app-analytics')body=analytics;
     else if(p.endsWith('/redemptions')&&p.includes('/reports/'))body={totals:{totalRedemptions:15,activeTokens:10,expiredTokens:5,redemptionRate:.5}};
     else if(p==='/admin/bins')body={bins:[{id:'bin1',city:'Benalmadena',lat:36.59,lng:-4.57,verification_status:'active',bin_type:'glass',source:'community',recycling_events_count:10,recycled_units_count:30,user_email:user.email}]};
     else if(p==='/brand/meta')body={brand:brands[0]};
     else if(p==='/brand/products')body={products};
     else if(p==='/brand/reports/campaigns')body={campaigns:[campaign]};
     else if(p==='/brand/reports/behavior')body={redeemerCount:10,nonRedeemerCount:5,brandShareRedeemers:.5,brandShareNonRedeemers:.2};
     else if(p==='/brand/reports/events')body={events:[{recycling_event_id:'event1',recycled_at:event.created_at,product_name:event.product_name,barcode:event.barcode,units:8,points:16,city:event.city,lat:event.lat,lng:event.lng,scan_status:'approved',anonymized_user_id:'participant-opaque-1'}]};
     else if(p==='/brand/challenges')body={challenges:[]};
     else if(p==='/partner/redemptions/pending')body={pending:[{token:'fixture-token-long-0123456789',reward_title:'Fixture reward',user_email:user.email,expires_at:'2030-01-01'},{token:'expired',reward_title:'Expired reward',user_email:user.email,expires_at:'2020-01-01'}]};
     else if(p==='/partner/redemptions/history')body={history:[{reward_title:'Used reward',user_email:user.email,redeemed_at:event.created_at,redeemed_by_partner_email:partners[0].email}]};
     else if(p.includes('/invitations'))body={invitations:[]};
     else return route.fulfill({headers,status:404,json:{error:'Missing fixture '+p}});
     return route.fulfill({headers,json:body});
    });
    await page.addInitScript(role=>{
     localStorage.setItem('greenloop_jwt','fixture.'+btoa(JSON.stringify({role,email:'operator@example.invalid',userId:'operator',brandId:'brand1',exp:4102444800}))+'.fixture');
     localStorage.setItem('greenloop_dashboard_language','en');
    },role);
    for(const route of routes.filter(x=>!process.env.TEST_ROUTE||x===process.env.TEST_ROUTE)){
     const name=prefix+'-'+route.replaceAll('/','-')+'-'+width;
     try{
      await page.goto(origin+'/'+prefix+'/'+route);
      await page.locator('.crm-page-heading h1').waitFor();
      await page.waitForTimeout(800);
      assert.equal(await page.locator('main').count(),1,'Single dashboard frame');
      const unauthorized=await page.locator('aside a').evaluateAll((links,prefix)=>links.map(x=>x.getAttribute('href')).filter(x=>x&&!x.startsWith('/'+prefix+'/')&&x!=='/'+prefix),prefix);
      assert.deepEqual(unauthorized,[],'Role-scoped sidebar');
      for(const lang of ['en','es']){
       await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
       await page.waitForTimeout(400);
       const tabs=await page.locator('main [role=tablist] [role=tab]').all();
       for(const tab of tabs){
        await tab.click();
        await page.waitForTimeout(500);
        assert.equal(await tab.getAttribute('aria-selected'),'true');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Pane has horizontal overflow');
       }
       if(tabs.length){await tabs[0].press('End');assert.equal(await tabs.at(-1).getAttribute('aria-selected'),'true');await tabs[0].click();}
       await page.waitForTimeout(600);
       const blankCharts=await page.locator('main .recharts-responsive-container').evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0&&!node.querySelector('svg')).map(node=>node.outerHTML.slice(0,250)));
       assert.deepEqual(blankCharts,[],'Visible charts must render after switching panes');
       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Page has horizontal overflow');
       if(prefix==='brand')assert.doesNotMatch(await page.locator('main').innerText(),/private-user@example.invalid|Private User Name/,'No private user identity in brand views');
       await page.screenshot({path:output+'/'+name+'-'+lang+'.png',fullPage:true});
      }
      if(route==='products'&&prefix==='brand'){
       await page.getByRole('button',{name:'EN',exact:true}).click();
       await page.getByRole('button',{name:'Next page',exact:true}).click();
       await page.getByText('Product 24',{exact:true}).waitFor();
       await page.getByRole('textbox',{name:'Search product or barcode'}).fill('Product 24');
       assert.equal(await page.locator('tbody tr').count(),1);
       assert.equal(await page.getByRole('button',{name:'Next page',exact:true}).isDisabled(),true);
       await page.getByRole('button',{name:'Edit',exact:true}).click();
       await page.getByRole('dialog').waitFor();
       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
       await page.getByRole('button',{name:'Cancel',exact:true}).click();
      }
      if(route==='products'&&prefix==='admin'){
       await page.getByRole('button',{name:'EN',exact:true}).click();
       await page.getByRole('textbox',{name:'Search name, barcode, brand'}).fill('Product 24');
       await page.waitForTimeout(600);
       assert.ok(requests.some(x=>x.includes('search=Product+24')));
       await page.getByRole('combobox',{name:'Brand',exact:true}).selectOption('brand1');
       await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('pending');
       await page.waitForTimeout(600);
       assert.ok(requests.some(x=>x.includes('brandId=brand1')&&x.includes('verificationStatus=pending')));
       await page.getByRole('button',{name:'Clear filters',exact:true}).click();
       await page.waitForTimeout(500);
       mode='error';await page.getByRole('button',{name:'Refresh products'}).click();await page.getByRole('alert').filter({hasText:'Fixture unavailable'}).waitFor();
       mode='empty';await page.getByRole('button',{name:'Refresh products'}).click();await page.getByText('No products match the current filters.').waitFor();mode='ready';
      }
      assert.deepEqual(errors,[],'No runtime errors');
      console.log('PASS '+name);
     }catch(error){failures.push(name+': '+error.message);console.error('FAIL '+name+': '+error.message);await page.screenshot({path:output+'/'+name+'-failure.png',fullPage:true}).catch(()=>{});errors.length=0;mode='ready';}
    }
    assert.ok(!requests.some(x=>x.startsWith('UNEXPECTED')),'No cross-role API requests: '+requests.filter(x=>x.startsWith('UNEXPECTED')).join(','));
    await page.close();
   }
  }
 }finally{await browser.close();}
 fs.writeFileSync(output+'/results.json',JSON.stringify({failures},null,2));
 assert.deepEqual(failures,[]);
})().catch(error=>{console.error(error);process.exitCode=1;});
