import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../db/supabase-rest.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function adapter(env, fetch) {
  const exports = {};
  runInNewContext(compiled, {
    exports, fetch, URLSearchParams, AbortSignal,
    require(name) {
      assert.equal(name, "cloudflare:workers");
      return { env };
    },
  });
  return exports;
}

const config = {
  SUPABASE_URL: "https://example.supabase.co/",
  SUPABASE_SECRET_KEY: "sb_secret_test_placeholder",
};

test("missing configuration and unknown tables fail before a network call", async () => {
  const { supabaseRest } = adapter({}, () => assert.fail("Unexpected network call"));
  await assert.rejects(supabaseRest.select("sites"), /configuration is incomplete/);
  await assert.rejects(supabaseRest.select("secrets"), /Unknown application table/);
});

test("atomic updates retain both tenant and row identifiers", async () => {
  const { supabaseRest } = adapter(config, async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://example.supabase.co");
    assert.equal(parsed.pathname, "/rest/v1/rpc/update_content");
    assert.equal(options.headers.apikey, config.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.authorization, undefined);
    assert.equal(options.headers["content-profile"], "localgov");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.equal(body.p_site_id, "site-a");
    assert.equal(body.p_id, "a&or=(id.eq.b)");
    return new Response('{"id":"a"}');
  });
  const result = await supabaseRest.rpc("update_content", {p_id:"a&or=(id.eq.b)",p_site_id:"site-a",p_data:{title:"Updated"},p_audit:{}});
  assert.equal(result.id, "a");
  await assert.rejects(supabaseRest.rpc("execute_sql", {query:"anything"}), /Unknown application operation/);
});

test("database failures do not include response bodies or secrets", async () => {
  const { supabaseRest } = adapter(config, async () =>
    new Response("private citizen data and credentials", { status: 403 }));
  await assert.rejects(supabaseRest.select("service_requests"), (error) => {
    assert.equal(error.message, "Supabase Data API failed (403)");
    return true;
  });
});

test("a connection check must receive a successful database response", async () => {
  const good = adapter(config, async (url) => {
    assert.equal(new URL(url).searchParams.get("limit"), "1");
    return new Response("[]");
  });
  assert.equal((await good.checkSupabaseConnection()).connected, true);
  const bad = adapter(config, async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(bad.checkSupabaseConnection(), /503/);
});
