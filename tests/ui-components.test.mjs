import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("limits article galleries and embeds only supported YouTube links", async () => {
  const { getContentImages, getYouTubeEmbedUrl, isSupportedYouTubeUrl } = await vite.ssrLoadModule(
    "/lib/content-media.ts",
  );

  assert.deepEqual(
    getContentImages({ coverUrl: "/cover.webp", galleryJson: '["/cover.webp","/2.webp","/3.webp","/4.webp","/5.webp","/6.webp"]' }),
    ["/cover.webp", "/2.webp", "/3.webp", "/4.webp", "/5.webp"],
  );
  assert.equal(isSupportedYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(isSupportedYouTubeUrl("https://example.com/video"), false);
});

test("renders the municipal admin login without exposing demo credentials", async () => {
  const { LocalAdminLogin } = await vite.ssrLoadModule(
    "/components/local-admin-login.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(LocalAdminLogin, {
      chatGPTSignInUrl: "/signin-with-chatgpt?return_to=%2Fadmin",
      localReturnTo: "/admin/sung-noen-municipality",
    }),
  );

  assert.match(html, /เข้าสู่ระบบเจ้าหน้าที่/);
  assert.match(html, /name="username"/);
  assert.match(html, /name="password"/);
  assert.match(html, /type="password"/);
  assert.doesNotMatch(html, /value="admin"/);
});


test("registration, approval and image controls expose the intended workflow", async () => {
  const {AgencyRegistration}=await vite.ssrLoadModule('/components/agency-registration.tsx');
  const registration=renderToStaticMarkup(React.createElement(AgencyRegistration,{mapsKey:''}));
  assert.match(registration,/name="username"/);assert.match(registration,/name="password"/);assert.match(registration,/ส่งคำขอลงทะเบียน/);assert.match(registration,/แผนที่ Google Maps/);assert.match(registration,/name="officerPosition"/);assert.doesNotMatch(registration,/สูงเนิน/);
  const {PlatformConsole}=await vite.ssrLoadModule('/components/platform-console.tsx');
  const html=renderToStaticMarkup(React.createElement(PlatformConsole,{userName:'Test',initialAgencies:[{id:'one',name:'หน่วยงานทดสอบ',slug:'test-town',province:'จังหวัด',email:'test@example.invalid',phone:'',status:'draft',username:'test.staff',contactName:'Staff',approvalStatus:'pending',domainLabel:'test-town',domainStatus:'pending_dns',submittedAt:'2026-09-26'}]}));
  assert.match(html,/ตรวจและอนุมัติ/);assert.match(html,/test-town.weblocalgov.com/);assert.match(html,/รอเชื่อมโดเมน/);
  const {AiImagePanel}=await vite.ssrLoadModule('/components/ai-image-panel.tsx');
  const panel=renderToStaticMarkup(React.createElement(AiImagePanel,{siteId:'one',onCreated:()=>{}}));assert.match(panel,/AI สร้างภาพ/);assert.match(panel,/ai-image-prompt/);assert.doesNotMatch(panel,/sk-proj-/);
});
