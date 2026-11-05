// 리아와 같은 주소(fullcharge13.github.io)에서 돌므로 저장 칸·캐시 이름은 모두 dueogi-로 시작해야 한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { newSave, SAVE_KEY, SAVE_VER } from "../../src/save.js";
import { RESUME_KEY } from "../../src/resume.js";
import { INSTALL_HINT_KEY } from "../../src/install.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function jsFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...jsFiles(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

// 글자에서 저장 칸·캐시 이름을 모은다(작업 16에서 넓힘): localStorage·sessionStorage(…Item 부르기 첫 인자),
// caches.open/delete/has, indexedDB.open, 서비스 작업자의 *CACHE* 상수와 key.startsWith(…) 조건.
// 첫 인자가 이름(식별자)이면 같은 파일의 const 글자를 찾아 쓴다(내보내기 없는 const도). 템플릿 글자는 ${ 앞까지.
// 같은 파일에서 찾을 수 없는 식별자(돌며 받는 변수 등)는 건너뛴다. *_KEY·*_PREFIX로 내보낸 상수는 쓰이는지와 상관없이 센다.
export function storageNames(sources) {
  const names = new Map(); // 이름 -> 출처
  const lit = String.raw`(?:"([^"]*)"|'([^']*)'|\`([^\`$]*)(?:\$\{[^\`]*)?\`)`;
  const constRe = new RegExp(String.raw`\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*` + lit, "g");
  const exportedRe = /export\s+const\s+([A-Z_]*(?:KEY|PREFIX))\s*=/g;
  const callRe = new RegExp(String.raw`(?:\.(?:getItem|setItem|removeItem)|\bcaches\.(?:open|delete|has)|\bindexedDB\.(?:open|deleteDatabase))\(\s*(?:` + lit + String.raw`|([A-Za-z_$][\w$]*))`, "g");
  const swCacheRe = /const\s+\w*CACHE\w*\s*=\s*["'`]([^"'`$]+)/g;
  const startsRe = /key\.startsWith\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  const val = (m, i) => (m[i] ?? m[i + 1] ?? m[i + 2]);
  for (const { where, src } of sources) {
    const consts = new Map();
    for (const m of src.matchAll(constRe)) consts.set(m[1], val(m, 2));
    for (const m of src.matchAll(exportedRe)) if (consts.has(m[1])) names.set(consts.get(m[1]), where);
    for (const m of src.matchAll(callRe)) {
      const v = val(m, 1);
      if (v !== undefined) names.set(v, where);
      else if (consts.has(m[4])) names.set(consts.get(m[4]), where);
    }
    for (const m of src.matchAll(swCacheRe)) names.set(m[1], where);
    for (const m of src.matchAll(startsRe)) names.set(m[1], where);
  }
  return names;
}

test("storageNames finds cache and session names the old scan missed", () => {
  const got = storageNames([
    { where: "a.js", src: 'const c = await caches.open("ria-x"); await caches.delete(\'tmp-y\');' },
    { where: "b.js", src: 'sessionStorage.setItem("seeded", "1"); const K = "plain-key"; sessionStorage.getItem(K);' },
    { where: "c.js", src: "const NAME = `other-${v}`; caches.open(NAME); indexedDB.open('idb-z'); for (const n of xs) caches.open(n);" },
    { where: "d.js", src: 'export const OLD_KEY = "legacy-save"; export const FOO_PREFIX = "foo-";' },
  ]);
  assert.deepEqual([...got.keys()].sort(), ["foo-", "idb-z", "legacy-save", "other-", "plain-key", "ria-x", "seeded", "tmp-y"]);
  assert.equal(got.get("ria-x"), "a.js");
});

test("all storage keys start with dueogi-", () => {
  const files = [...jsFiles(path.join(ROOT, "src")), path.join(ROOT, "sw.js")];
  const names = storageNames(files.map((f) => ({ where: path.relative(ROOT, f), src: fs.readFileSync(f, "utf8") })));
  assert.ok(names.size >= 6, "찾은 이름이 너무 적다: " + [...names.keys()].join(", "));
  for (const want of ["dueogi-sql-save", "dueogi-sql-resume", "dueogi-engine-", "dueogi-game-", "dueogi-"]) {
    assert.ok([...names.keys()].some((n) => n === want || n.startsWith(want)), want + " not found: " + [...names.keys()].join(", "));
  }
  for (const [n, where] of names) assert.ok(n.startsWith("dueogi-"), `${where}: "${n}"는 dueogi-로 시작하지 않는다`);
  assert.equal(SAVE_KEY, "dueogi-sql-save");
  assert.equal(RESUME_KEY, "dueogi-sql-resume");
  assert.equal(INSTALL_HINT_KEY, "dueogi-sql-install-hint");
  assert.equal(SAVE_VER, 1);
});

test("newSave has yeopjeon not bytes", () => {
  const s = newSave();
  assert.equal(s.yeopjeon, 0);
  assert.equal("bytes" in s, false);
});
