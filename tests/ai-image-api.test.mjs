import assert from 'node:assert/strict';
import test from 'node:test';
import {loader} from './support/load-ts.mjs';
const req=()=>new Request('https://app.test/api/sites/one/images',{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({id:'5a88a3e3-e14a-4aba-8568-bbc131753218',prompt:'community park illustration',size:'1024x1024'})});
const params={params:Promise.resolve({siteId:'one'})};
test('image endpoint rejects unrelated tenant before contacting provider',async()=>{const route=loader({'cloudflare:workers':{env:{}},'@/app/chatgpt-auth':{getChatGPTUser:async()=>({id:'site-admin:two'})},'@/lib/site-repository':{getManagedSite:async()=>null},'@/db/repository':{},'@/lib/openai-images':{generateAgencyImage:()=>assert.fail('Provider called')}})('@/app/api/sites/[siteId]/images/route');assert.equal((await route.POST(req(),params)).status,403);});
test('AI request is reserved once, stored as media, and finalised with usage',async()=>{
 const operations=[];const bytes=new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80]);
 const route=loader({'cloudflare:workers':{env:{OPENAI_API_KEY:'test-secret',BUCKET:{put:async()=>operations.push('store'),delete:async()=>{}}}},'@/app/chatgpt-auth':{getChatGPTUser:async()=>({id:'site-admin:one',email:'staff@example.invalid'})},'@/lib/site-repository':{getManagedSite:async()=>({id:'one'})},'@/db/repository':{runOperation:async(name,args)=>{operations.push(name);if(name==='reserve_ai_image')return{created:true};assert.equal(args.p_media_id,'5a88a3e3-e14a-4aba-8568-bbc131753218');},createRecord:async(name,data)=>{operations.push(name);assert.equal(data.siteId,'one');assert.equal(data.contentType,'image/webp');}},'@/lib/openai-images':{IMAGE_MODEL:'test-model',generateAgencyImage:async()=>({bytes,usage:{total_tokens:1}})}})('@/app/api/sites/[siteId]/images/route');
 const res=await route.POST(req(),params);assert.equal(res.status,201);assert.deepEqual(operations,['reserve_ai_image','store','media_files','finish_ai_image']);assert.match((await res.json()).file.url,/^\/api\/media\//);
});
test('daily limit prevents an additional paid provider request',async()=>{
 const route=loader({'cloudflare:workers':{env:{OPENAI_API_KEY:'test',BUCKET:{}}},'@/app/chatgpt-auth':{getChatGPTUser:async()=>({id:'site-admin:one'})},'@/lib/site-repository':{getManagedSite:async()=>({id:'one'})},'@/db/repository':{runOperation:async()=>({created:false,status:'limit'})},'@/lib/openai-images':{generateAgencyImage:()=>assert.fail('Provider called')}})('@/app/api/sites/[siteId]/images/route');assert.equal((await route.POST(req(),params)).status,429);
});
