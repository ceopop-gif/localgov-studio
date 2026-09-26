import { readFileSync } from 'node:fs';
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
    runInNewContext(ts.transpileModule(readFileSync(path.join(root, name.slice(2)) + '.ts', 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
    }).outputText, { exports, require: dependency => load(dependency, name), Request, Response, URL, URLSearchParams, TextEncoder, crypto, Headers, AbortSignal, atob, console: {error() {}} });
    return exports;
  }
  return load;
}
