// 작업 7: 결과 표 채우기 — 화면을 떠난 뒤 끝난 실행은 아무것도 그리지 않는다
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillResults, whenEngine, FAIL_LINE } from "../../src/ui/sqlview.js";

function fakeSql(status = "loading") {
  const ls = new Set();
  const sql = {
    status, ran: [],
    listen(fn) { ls.add(fn); return () => ls.delete(fn); },
    preload() { return Promise.resolve(); },
    set(s) { sql.status = s; for (const f of [...ls]) f(s); },
    run(q) { sql.ran.push(q); return Promise.resolve({ columns: ["n"], rows: [[1]], error: null }); },
  };
  return sql;
}
const node = (q) => ({ dataset: { sql: q, box: "card" }, innerHTML: "loading", isConnected: true, closest: () => null });
const root = (nodes) => ({ querySelectorAll: () => nodes });
const tick = () => new Promise((r) => setTimeout(r, 5));

test("fill waits for the engine then paints", async () => {
  const sql = fakeSql("loading"), n = node("SELECT 1");
  fillResults(root([n]), sql);
  await tick();
  assert.equal(n.innerHTML, "loading");
  sql.set("ready");
  await tick();
  assert.ok(n.innerHTML.includes("rtable"), n.innerHTML);
});

test("stopped fill paints nothing even if the engine becomes ready later", async () => {
  const sql = fakeSql("loading"), n = node("SELECT 1");
  const stop = fillResults(root([n]), sql);
  stop();
  sql.set("ready");
  await tick();
  assert.equal(n.innerHTML, "loading");
  assert.deepEqual(sql.ran, []);
});

test("stop during a run keeps the node untouched", async () => {
  const sql = fakeSql("ready"), n = node("SELECT 1");
  const stop = fillResults(root([n]), sql);
  stop();
  await tick();
  assert.equal(n.innerHTML, "loading");
});

test("failed engine shows the note, or calls onFailed", async () => {
  const a = node("SELECT 1"), b = node("SELECT 2");
  fillResults(root([a]), fakeSql("failed"));
  let seen = null;
  fillResults(root([b]), fakeSql("failed"), { onFailed: (x) => { seen = x; } });
  await tick();
  assert.ok(a.innerHTML.includes(FAIL_LINE));
  assert.equal(seen, b);
  assert.equal((await whenEngine(null).promise), false);
});
