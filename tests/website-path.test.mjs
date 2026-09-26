import assert from 'node:assert/strict';
import test from 'node:test';
import {loader} from './support/load-ts.mjs';
const params=name=>({params:Promise.resolve({websiteName:name})});
const makeRoute=(slug,calls=[])=>loader({
 react:{cache:fn=>fn},
 'next/navigation':{notFound:()=>{throw new Error('NOT_FOUND');}},
 '@/db/repository':{runOperation:async(name,args)=>{calls.push({name,args});return slug;}},
 '@/app/site/[slug]/page':{default:()=>null,generateMetadata:async({params})=>{assert.equal((await params).slug,'sung-noen');return{title:'เทศบาลต้นฉบับ',alternates:{canonical:'/site/sung-noen'},openGraph:{title:'เทศบาลต้นฉบับ'}};}},
})('@/app/[websiteName]/page');

test('website path resolves the configured name, keeps the underlying tenant slug and emits the new canonical URL',async()=>{
 const calls=[];const route=makeRoute('sung-noen',calls);
 const page=await route.default(params('demo'));
 assert.equal((await page.props.params).slug,'sung-noen');
 assert.equal(page.props.publicPath,'/demo');
 const metadata=await route.generateMetadata(params('demo'));
 assert.equal(metadata.alternates.canonical,'https://weblocalgov.com/demo');
 assert.equal(metadata.openGraph.url,'https://weblocalgov.com/demo');
 assert.ok(calls.every(c=>c.name==='resolve_domain'&&c.args.p_label==='demo'));
});
test('missing or inactive tenant aliases cannot fall back to another site',async()=>{
 const route=makeRoute(null);
 await assert.rejects(route.default(params('unknown-town')),/NOT_FOUND/);
 assert.equal((await route.generateMetadata(params('unknown-town'))).robots.index,false);
});
test('reserved pages, path injection and invalid names never reach tenant lookup',async()=>{
 const calls=[];const route=makeRoute('sung-noen',calls);
 for(const name of ['admin','api','login','website','register','site','graphics','assets','sungnoen-demo','../demo','demo/another','demo?admin=true'])await assert.rejects(route.default(params(name)),/NOT_FOUND/);
 assert.equal(calls.length,0);
});
test('registration and central review reserve routes consistently',()=>{
 const {agencyReviewSchema,createSiteSchema}=loader({})('@/lib/validators');
 for(const name of ['admin','login','site','graphics','assets']){
  assert.equal(agencyReviewSchema.safeParse({status:'approved',domainLabel:name,startOn:'2026-09-27'}).success,false);
  assert.equal(createSiteSchema.safeParse({name:'Municipality',slug:name,organizationType:'เทศบาลตำบล'}).success,false);
 }
 assert.equal(agencyReviewSchema.safeParse({status:'approved',domainLabel:'demo',startOn:'2026-09-27'}).success,true);
});
