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

test("all storage keys start with dueogi-", () => {
  const names = new Map(); // 이름 -> 출처
  const add = (n, where) => names.set(n, where);
  const consts = []; // { id, value, where }
  const constRe = /export\s+const\s+([A-Z_]*(?:KEY|PREFIX))\s*=\s*["'`]([^"'`]+)["'`]/g;
  const callRe = /\.(?:getItem|setItem|removeItem)\(\s*(?:["'`]([^"'`]+)["'`]|([A-Za-z_]\w*))/g;
  const used = new Set(); // getItem/setItem/removeItem의 첫 인자로 쓰인 상수 이름
  for (const f of jsFiles(path.join(ROOT, "src"))) {
    const src = fs.readFileSync(f, "utf8");
    const where = path.relative(ROOT, f);
    for (const m of src.matchAll(constRe)) consts.push({ id: m[1], value: m[2], where });
    for (const m of src.matchAll(callRe)) { if (m[1]) add(m[1], where); else used.add(m[2]); }
  }
  // 저장 칸으로 쓰이는 *_KEY 와 캐시 이름 접두사(*_PREFIX)만 본다(예: template.js의 OUT_KEY는 저장 칸이 아님)
  for (const c of consts) if (c.id.endsWith("PREFIX") || used.has(c.id)) add(c.value, c.where);
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  for (const m of sw.matchAll(/const\s+\w*CACHE\w*\s*=\s*["'`]([^"'`]+)["'`]/g)) add(m[1], "sw.js");
  for (const m of sw.matchAll(/key\.startsWith\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) add(m[1], "sw.js");
  assert.ok(names.size >= 5, "찾은 이름이 너무 적다: " + [...names.keys()].join(", "));
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
