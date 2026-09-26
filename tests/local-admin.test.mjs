import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {loader} from './support/load-ts.mjs';
const request = (extra = {}, origin = 'https://example.test') => new Request('https://example.test/api/auth/local/login', {
  method: 'POST', headers: {origin, 'content-type': 'application/json'},
  body: JSON.stringify({siteSlug:'agency-one', username:'agency-admin', password:'test-only-password', ...extra})
});
test('login rejects cross-origin, invalid tenant and multibyte passwords over bcrypt limit before database access', async () => {
  const route = loader({'@/db/repository': {runOperation: () => assert.fail('Unexpected login')}})('@/app/api/auth/local/login/route');
  assert.equal((await route.POST(request({}, 'https://attacker.test'))).status, 403);
  assert.equal((await route.POST(request({siteSlug:'bad&scope'}))).status, 401);
  assert.equal((await route.POST(request({password:'ก'.repeat(25)}))).status, 401);
});
test('success uses database tenant redirect and a secure opaque cookie; only token digest reaches storage', async () => {
  let hash;
  const route = loader({'@/db/repository': {runOperation: async (operation, args) => {
    assert.equal(operation, 'login_site_admin');
    assert.equal(args.p_site_slug, 'agency-one');
    hash=args.p_session_hash;
    assert.match(hash, /^[a-f0-9]{64}$/);
    return {ok:true, siteId:'tenant-verified-by-database', expiresAt:new Date(Date.now()+28800000).toISOString()};
  }}})('@/app/api/auth/local/login/route');
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {ok:true, redirectTo:'/admin/tenant-verified-by-database'});
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^__Host-localgov_admin_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800$/);
  assert.ok(!cookie.includes(hash));
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('wrong and locked credentials never issue a cookie', async () => {
  for (const blocked of [false,true]) {
    const route=loader({'@/db/repository': {runOperation:async()=>({ok:false,blocked})}})('@/app/api/auth/local/login/route');
    const response=await route.POST(request());
    assert.equal(response.status,blocked?429:401);
    assert.equal(response.headers.get('set-cookie'),null);
  }
});
test('malformed cookies do not query storage and valid cookies resolve current active membership', async () => {
  let reads=0;
  const auth=loader({'@/db/repository': {runOperation:async (name,args)=>{
    reads++; assert.ok(['resolve_site_admin_session','resolve_platform_session'].includes(name));
    assert.match(args.p_session_hash,/^[a-f0-9]{64}$/); return null;
  }}})('@/lib/local-admin-auth');
  assert.equal(await auth.getLocalAdminIdentity('__Host-localgov_admin_session=bad'),null);
  assert.equal(reads,0);
  assert.equal(await auth.getLocalAdminIdentity('__Host-localgov_admin_session='+'a'.repeat(64)),null);
  assert.equal(reads,2);
});
test('site-scoped accounts cannot read another site even with an accidental extra membership',async()=>{
  const repo=loader({'@/db/supabase-rest':{},'@/db/repository':{rows:()=>assert.fail('Cross-tenant database query')}})('@/lib/site-repository');
  assert.equal(await repo.getManagedSite('tenant-b','site-admin:tenant-a'),null);
});
test('local login wins on site routes while central registration can use trusted ChatGPT identity',async()=>{
  const auth=loader({'next/headers':{headers:async()=>new Headers({'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'})},'next/navigation':{},'@/lib/local-admin-auth':{getLocalAdminIdentity:async()=>({id:'site-admin:tenant-a',siteId:'tenant-a',email:'admin@a.invalid',displayName:'admin'})}})('@/app/chatgpt-auth');
  assert.equal((await auth.getChatGPTUser()).siteId,'tenant-a');
  assert.equal((await auth.getChatGPTUser({preferChatGPT:true})).id,'owner');
});

test('platform access requires a local platform session and an active platform role',async()=>{
 for(const [user,active,allowed] of [
  [{id:'owner',authSource:'chatgpt',platform:true},true,false],
  [{id:'site-admin:one',authSource:'local',siteId:'one'},true,false],
  [{id:'platform-admin',authSource:'local',platform:true},false,false],
  [{id:'platform-admin',authSource:'local',platform:true},true,true],
 ]){
  let lookups=0;
  const platform=loader({'@/app/chatgpt-auth':{getChatGPTUser:async()=>user},'@/db/repository':{runOperation:async(name,args)=>{lookups++;assert.equal(name,'is_platform_admin');assert.equal(args.p_user_id,user.id);return active;}}})('@/lib/platform');
  assert.equal(Boolean(await platform.getPlatformUser()),allowed);
  if(user.authSource==='chatgpt'||!user.platform)assert.equal(lookups,0);
 }
});
test('platform login redirects to the central console and never uses the legacy tenant account',async()=>{
 const route=loader({'@/db/repository':{runOperation:async(name,args)=>{assert.equal(name,'login_platform_admin');assert.equal(args.p_username,'admin');assert.equal(args.p_site_slug,undefined);return{ok:true,platform:true};}},'@/lib/legacy-local-admin':{verifyLocalAdminCredentials:()=>assert.fail('Legacy login must not be used')}})('@/app/api/auth/local/login/route');
 const response=await route.POST(request({platform:true,username:'admin',siteSlug:''}));
 assert.equal(response.status,200);assert.equal((await response.json()).redirectTo,'/admin');assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure/);
});
