import assert from 'node:assert/strict';
import test from 'node:test';
import {loader} from './support/load-ts.mjs';
const context={params:Promise.resolve({siteId:'town'})};
const request=body=>new Request('https://app.test/api/platform/agencies/town',{method:'PATCH',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify(body)});

test('two-year periods use calendar years and clamp leap day consistently with Postgres',()=>{
 const {validStartDate,twoYearExpiry}=loader({})('@/lib/agency-term');
 assert.equal(twoYearExpiry('2026-09-26'),'2028-09-26');
 assert.equal(twoYearExpiry('2024-02-29'),'2026-02-28');
 for(const value of ['2026-02-29','2026-13-01','2026-9-26','not-a-date','9998-01-01'])assert.equal(validStartDate(value),false);
});
test('approval requires a real delivery date and rejects client-assigned expiry',async()=>{
 const route=loader({'@/lib/platform':{getPlatformUser:async()=>({id:'platform-admin'})},'@/db/repository':{runOperation:()=>assert.fail('Invalid term reached DB')}})('@/app/api/platform/agencies/[siteId]/route');
 for(const extra of [{},{startOn:'2026-02-29'},{startOn:'2026-09-26',expiresOn:'2099-01-01'}])assert.equal((await route.PATCH(request({status:'approved',domainLabel:'town',...extra}),context)).status,400);
});
test('approved delivery date and date-less suspension reach the scoped central operation',async()=>{
 const calls=[];const route=loader({'@/lib/platform':{getPlatformUser:async()=>({id:'platform-admin'})},'@/db/repository':{runOperation:async(name,args)=>calls.push({name,args})}})('@/app/api/platform/agencies/[siteId]/route');
 assert.equal((await route.PATCH(request({status:'approved',domainLabel:'town',startOn:'2026-10-01'}),context)).status,200);
 assert.equal((await route.PATCH(request({status:'suspended',domainLabel:'town'}),context)).status,200);
 assert.equal(calls[0].args.p_start_on,'2026-10-01');assert.equal(calls[1].args.p_start_on,null);assert.ok(calls.every(c=>c.args.p_actor_id==='platform-admin'&&c.args.p_site_id==='town'));
});
test('inactive published websites reject citizen submissions and tracking reads',async()=>{
 for(const state of ['expired','suspended','scheduled','awaiting_start']){
 const route=loader({'@/lib/site-access':{getSiteAccessStatus:async()=>state},'@/db/repository':{rows:async(table)=>{assert.equal(table,'sites');return[{id:'town',status:'published'}];},createRecord:()=>assert.fail('Inactive request inserted')}})('@/app/api/public/requests/route');
 const response=await route.POST(new Request('https://app.test/api/public/requests',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({siteSlug:'town',requestType:'ร้องเรียน',fullName:'เจ้าหน้าที่ทดสอบ',phone:'0000000000',details:'ทดสอบคำร้องของหน่วยงาน',consent:true})}));
 assert.equal(response.status,404);assert.equal((await route.GET(new Request('https://app.test/api/public/requests?site=town&code=TEST'))).status,404);
 }
});
test('expired website hides public metadata while central staff can preview without indexing',async()=>{
 for(const manager of [false,true]){
 const route=loader({react:{cache:f=>f},'@/components/public-site-home':{PublicSiteHome:()=>null},'@/app/chatgpt-auth':{getChatGPTUser:async()=>manager?{id:'platform-admin'}:null},'@/lib/site-access':{getSiteAccessStatus:async()=> 'expired'},'@/lib/site-repository':{getPublicSiteBySlug:async()=>({id:'town',name:'Private expired title',slug:'town',status:'published'}),getManagedSite:async()=>manager?{id:'town'}:null}})('@/app/site/[slug]/page');
 const metadata=await route.generateMetadata({params:Promise.resolve({slug:'town'})});
 assert.equal(metadata.title,manager?'Private expired title':'ไม่พบเว็บไซต์');if(manager)assert.equal(metadata.robots.index,false);
 }
});
test('legacy sessions and valid-password login cannot bypass a suspended term',async()=>{
 const legacy={LOCAL_ADMIN_USER_ID:'local-admin-demo',verifyLocalAdminCredentials:async()=>true,createLocalAdminSession:()=>assert.fail('Legacy session created'),getLocalAdminIdentity:async()=>({id:'local-admin-demo',siteId:'sung-noen-municipality'})};
 const auth=loader({'@/lib/legacy-local-admin':legacy,'@/lib/site-access':{getSiteAccessStatus:async()=> 'suspended'},'@/db/repository':{runOperation:async(name)=>name==='consume_request_limit'?true:null}})('@/lib/local-admin-auth');
 assert.equal((await auth.createLocalAdminSession('','admin','valid-test-password')).accessStatus,'suspended');
 assert.equal(await auth.getLocalAdminIdentity('__Host-localgov_admin_session='+'a'.repeat(64)),null);
});
test('paused tenant cannot read managed data and central admin can still manage it',async()=>{
 for(const central of [false,true]){
 const repo=loader({'@/lib/site-access':{getSiteAccessStatus:async()=> 'suspended'},'@/db/repository':{runOperation:async()=>central,rows:async(table)=>{assert.equal(table,'sites');return[{id:'town',ownerUserId:'owner'}];}}})('@/lib/site-repository');
 assert.equal(Boolean(await repo.getManagedSite('town','owner')),central);
 }
});
