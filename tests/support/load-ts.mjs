import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const native = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '../..');
export function loader(mocks = {}) {
  mocks = {'cloudflare:workers':{env:{}}, '@/lib/legacy-local-admin':{getLocalAdminIdentity:async()=>null},...mocks};
  const cache = new Map();
  function load(name, parent = '@/') {
    if (name.startsWith('.')) name = '@/' + path.posix.normalize(path.posix.join(path.posix.dirname(parent.slice(2)), name));
    if (name in mocks) return mocks[name];
    if (!name.startsWith('@/')) return native(name);
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    cache.set(name, exports);
    const base = path.join(root, name.slice(2));
    const file = existsSync(base + '.ts') ? base + '.ts' : base + '.tsx';
    runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}
    }).outputText, { exports, require: dependency => load(dependency, name), Request, Response, URL, URLSearchParams, TextEncoder, crypto, Headers, AbortSignal, atob, console: {error() {}} });
    return exports;
  }
  return load;
}
