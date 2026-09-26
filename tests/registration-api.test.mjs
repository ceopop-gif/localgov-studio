import assert from 'node:assert/strict';
import test from 'node:test';
import {loader} from './support/load-ts.mjs';
const body={site:{name:'องค์การบริหารส่วนตำบลทดสอบ',slug:'test-town',organizationType:'องค์การบริหารส่วนตำบล',email:'staff@example.invalid'},username:'test.staff',password:'test-only-password',contactName:'เจ้าหน้าที่ทดสอบ',consent:true};
const request=(data=body,origin='https://app.test')=>new Request('https://app.test/api/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)});
test('registration rejects cross-origin, client approval, ownership and reserved credentials before storing data',async()=>{
 const route=loader({'@/db/repository':{rows:()=>assert.fail('Unexpected DB read'),runOperation:()=>assert.fail('Unexpected write')},'@/lib/site-repository':{SUNG_NOEN_SITE_ID:'sung-noen-municipality'}})('@/app/api/register/route');
 assert.equal((await route.POST(request(body,'https://attacker.test'))).status,403);
 for(const bad of [{...body,approved:true},{...body,site:{...body.site,ownerUserId:'attacker'}},{...body,username:'admin'},{...body,password:'short'},{...body,consent:false}])assert.equal((await route.POST(request(bad))).status,400);
});
test('public signup provisions the neutral template with chosen credentials and no approval actor',async()=>{
 let registered=false;const route=loader({'@/lib/site-repository':{SUNG_NOEN_SITE_ID:'sung-noen-municipality'},'@/db/repository':{rows:async()=>[],toDatabase:value=>value,runOperation:async(name,args)=>{
 if(name==='consume_request_limit')return true;
 assert.equal(name,'register_agency');assert.equal(args.p_actor_id,null);assert.equal(args.p_username,'test.staff');assert.equal(args.p_password,body.password);assert.equal(args.p_data.name,body.site.name);assert.doesNotMatch(JSON.stringify(args.p_data),/สูงเนิน|sung-noen/);registered=true;return{id:args.p_data.id,name:args.p_data.name,slug:'test-town',approvalStatus:'pending'};
 }}})('@/app/api/register/route');const res=await route.POST(request());assert.equal(res.status,201);const data=await res.json();assert.equal(data.site.approvalStatus,'pending');assert.ok(registered);assert.ok(!JSON.stringify(data).includes(body.password));
});
test('registration stops on request limit without creating an account',async()=>{const route=loader({'@/lib/site-repository':{SUNG_NOEN_SITE_ID:'template'},'@/db/repository':{rows:()=>assert.fail('Unexpected read'),runOperation:async()=>false}})('@/app/api/register/route');assert.equal((await route.POST(request())).status,429);});
test('only a platform identity can review agencies',async()=>{const route=loader({'@/lib/platform':{getPlatformUser:async()=>null},'@/db/repository':{runOperation:()=>assert.fail('Unexpected approval')}})('@/app/api/platform/agencies/[siteId]/route');assert.equal((await route.PATCH(request(),{params:Promise.resolve({siteId:'other'})})).status,403);});
