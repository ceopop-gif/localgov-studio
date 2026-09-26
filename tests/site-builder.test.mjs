import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "..");
const nativeRequire = createRequire(import.meta.url);
function loader(mocks = {}) {
  const cache = new Map();
  return function load(name) {
    if (name in mocks) return mocks[name];
    if (!name.startsWith("@/")) return nativeRequire(name);
    if (cache.has(name)) return cache.get(name);
    const base = path.join(root, name.slice(2));
    const file = existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
    const exports = {};
    cache.set(name, exports);
    runInNewContext(
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      {
        exports,
        require: load,
        Response,
        Request,
        URL,
        URLSearchParams,
        crypto,
        Error,
        console: { error() {} },
        Set,
      },
    );
    return exports;
  };
}
const load = loader();
const { createSiteSchema } = load("@/lib/validators");
const { buildSiteFromTemplate, templateOptions } = load("@/lib/site-template");
const { getDefaultHomepageConfig } = load("@/lib/homepage-config");
const base = {
  name: "องค์การบริหารส่วนตำบลทดสอบ",
  slug: "new-localgov",
  organizationType: "องค์การบริหารส่วนตำบล",
};
const creator = {
  id: "creator-1",
  email: "creator@example.test",
  authSource: "chatgpt",
};
const source = {
  ...createSiteSchema.parse({ ...base, slug: "original" }),
  id: "source-1",
  ownerUserId: "creator-1",
  name: "OLD-AGENCY",
  phone: "OLD-PHONE",
  vision: "OLD-VISION",
  servicesJson: '["road"]',
  homepageJson: JSON.stringify({
    ...getDefaultHomepageConfig({ vision: "OLD-VISION" }),
    hero: {
      ...getDefaultHomepageConfig().hero,
      title: "OLD-AGENCY",
      imageUrl: "/graphics/custom.webp",
    },
  }),
};
const request = (body, origin = "https://app.test") =>
  new Request("https://app.test/api/sites", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
function routes(user = creator, db = {}) {
  return loader({
    "@/app/chatgpt-auth": { getChatGPTUser: async () => user },
    "@/db/repository": {
      rows: async () => [],
      createRecord: async () => assert.fail("Unexpected write"),
      ...db,
    },
  });
}

test("new websites copy presentation without inheriting agency identity or content", () => {
  const input = createSiteSchema.parse({
    ...base,
    services: ["road"],
    sections: { ...templateOptions(source).sections, news: false },
  });
  const snapshot = JSON.stringify(source);
  const site = buildSiteFromTemplate(input, source);
  assert.equal(site.status, "draft");
  assert.equal(site.phone, "");
  assert.equal(site.name, base.name);
  assert.doesNotMatch(
    JSON.stringify(site),
    /OLD-AGENCY|OLD-PHONE|OLD-VISION|สูงเนิน/,
  );
  assert.equal(
    JSON.parse(site.homepageJson).hero.imageUrl,
    "/graphics/custom.webp",
  );
  assert.equal(JSON.parse(site.homepageJson).news.visible, false);
  assert.equal(site.servicesJson, '["road"]');
  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(site.ownerUserId, undefined);
  assert.equal(site.content, undefined);
});
test("validation prevents reserved URL, unsafe input and client-assigned ownership", () => {
  for (const extra of [
    { slug: "sungnoen-demo" },
    { slug: "abc&owner=other" },
    { ownerUserId: "other" },
    { status: "published" },
    { logoUrl: "javascript:alert(1)" },
    { sourceSiteId: "a&b" },
    { services: ["unknown"] },
  ])
    assert.equal(
      createSiteSchema.safeParse({ ...base, ...extra }).success,
      false,
    );
});
test("anonymous and local-only accounts cannot create websites", async () => {
  assert.equal(
    (await routes(null)("@/app/api/sites/route").POST(request(base))).status,
    401,
  );
  assert.equal(
    (
      await routes({ ...creator, authSource: "local" })(
        "@/app/api/sites/route",
      ).POST(request(base))
    ).status,
    403,
  );
});
test("cross-origin writes and invalid ownership fields are rejected", async () => {
  const route = routes()("@/app/api/sites/route");
  assert.equal(
    (await route.POST(request(base, "https://attacker.test"))).status,
    403,
  );
  assert.equal(
    (await route.POST(request({ ...base, ownerUserId: "other" }))).status,
    400,
  );
});
test("template selection is scoped to the authenticated owner", async () => {
  let read = 0;
  const route = routes(creator, {
    rows: async (table, filters) => {
      read++;
      assert.equal(table, "sites");
      assert.equal(filters.owner_user_id, "eq.creator-1");
      assert.equal(filters.id, "eq.source-1");
      return [];
    },
  })("@/app/api/sites/route");
  assert.equal(
    (await route.POST(request({ ...base, sourceSiteId: "source-1" }))).status,
    403,
  );
  assert.equal(read, 1);
});
test("creation atomically records a draft, its owner and audit metadata", async () => {
  let writes = 0;
  const route = routes(creator, {
    rows: async () => [source],
    createRecord: async (table, site, audit, member) => {
      writes++;
      assert.equal(table, "sites");
      assert.equal(site.status, "draft");
      assert.equal(site.ownerUserId, creator.id);
      assert.equal(member.siteId, site.id);
      assert.equal(member.userId, creator.id);
      assert.equal(member.role, "super_admin");
      assert.equal(audit.actorUserId, creator.id);
      assert.equal(audit.siteId, site.id);
      assert.equal(JSON.parse(audit.metadata).sourceSiteId, source.id);
      return site;
    },
  })("@/app/api/sites/route");
  const response = await route.POST(
    request({ ...base, sourceSiteId: source.id }),
  );
  assert.equal(response.status, 201);
  assert.equal((await response.json()).site.slug, base.slug);
  assert.equal(writes, 1);
});
test("duplicate slug races return a recoverable conflict", async () => {
  const route = routes(creator, {
    createRecord: async () => {
      throw new Error("UNIQUE conflict");
    },
  })("@/app/api/sites/route");
  assert.equal((await route.POST(request(base))).status, 409);
});
test("availability checks require identity and return only availability", async () => {
  const req = new Request(
    "https://app.test/api/sites/availability?slug=taken-slug",
  );
  assert.equal(
    (await routes(null)("@/app/api/sites/availability/route").GET(req)).status,
    401,
  );
  const response = await routes(creator, {
    rows: async (_table, filters) => {
      assert.equal(filters.select, "id");
      return [{ id: "hidden" }];
    },
  })("@/app/api/sites/availability/route").GET(req);
  assert.deepEqual(await response.json(), { available: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("draft sites cannot receive public requests or expose tracking results", async () => {
  const route = routes(creator, {
    rows: async (table, filters) => {
      assert.equal(table, "sites");
      assert.equal(filters.status, "eq.published");
      return [];
    },
  })("@/app/api/public/requests/route");
  const data = {
    siteSlug: base.slug,
    requestType: "ร้องเรียน",
    fullName: "ผู้ทดสอบ",
    phone: "0000000000",
    details: "ข้อมูลทดสอบสำหรับตรวจระบบ",
    consent: true,
  };
  assert.equal((await route.POST(request(data))).status, 404);
  assert.equal(
    (
      await route.GET(
        new Request(
          `https://app.test/api/public/requests?site=${base.slug}&code=TEST-CODE`,
        ),
      )
    ).status,
    404,
  );
});

test("draft metadata and pages are visible only to that site's managers", async () => {
  for (const [user, managed, allowed] of [
    [null, null, false],
    [creator, null, false],
    [creator, source, true],
  ]) {
    const route = loader({
      react: { cache: (fn) => fn },
      "@/components/public-site-home": { PublicSiteHome: () => null },
      "@/app/chatgpt-auth": { getChatGPTUser: async () => user },
      "@/lib/site-repository": {
        getPublicSiteBySlug: async () => ({ ...source, status: "draft" }),
        getManagedSite: async () => managed,
        listPublishedContent: async () => [],
        SUNG_NOEN_SITE_SLUG: "sung-noen",
      },
    })("@/app/site/[slug]/page");
    const metadata = await route.generateMetadata({
      params: Promise.resolve({ slug: "original" }),
    });
    assert.equal(metadata.title, allowed ? "OLD-AGENCY" : "ไม่พบเว็บไซต์");
    if (allowed) assert.equal(metadata.robots.index, false);
  }
});
