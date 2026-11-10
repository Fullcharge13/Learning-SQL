import { test } from "node:test";
import assert from "node:assert/strict";
import { SqlRun } from "../../src/sqlrun.js";

test("sqlrun listen: several listeners get status, off stops them", () => {
  const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm" });
  const a = [], b = [];
  r.onstatus = (s) => a.push("on:" + s);
  const offA = r.listen((s, phase) => a.push(s + "/" + phase));
  r.listen((s) => b.push(s));
  r._setStatus("loading");
  offA();
  r._setStatus("ready");
  assert.deepEqual(a, ["on:loading", "loading/first-load", "on:ready"]);
  assert.deepEqual(b, ["loading", "ready"]);
});

// ---- runLedger: 가짜 작업자 ----
class LedgerWorker {
  static mode = "ok";
  constructor() { this.dead = false; this.sent = []; LedgerWorker.last = this; }
  postMessage(m) {
    this.sent.push(m);
    if (m.type === "init") setTimeout(() => this.onmessage({ data: { type: "ready" } }), 0);
    if (m.type === "ledger") {
      setTimeout(() => !this.dead && this.onmessage({ data: { type: "started", id: m.id } }), 0);
      if (LedgerWorker.mode === "ok") {
        const results = m.queries.map((q) => ({ columns: ["q"], rows: [[q]], error: null, truncated: false }));
        setTimeout(() => !this.dead && this.onmessage({ data: { type: "result", id: m.id, result: { results } } }), 0);
      }
    }
  }
  terminate() { this.dead = true; }
}

test("runLedger: 장부와 질의를 보내고 결과 배열을 돌려받는다", async () => {
  const saved = globalThis.Worker;
  globalThis.Worker = LedgerWorker;
  try {
    LedgerWorker.mode = "ok";
    const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm", timeoutMs: 1000 });
    const out = await r.runLedger("CREATE TABLE t(x);", ["A", "B"]);
    assert.equal(out.error, null);
    assert.equal(out.timeout, false);
    assert.equal(out.results.length, 2);
    assert.deepEqual(out.results[1].rows, [["B"]]);
    assert.equal(out.results[0].timeout, false);
    const sent = LedgerWorker.last.sent.find((m) => m.type === "ledger");
    assert.equal(sent.ledgerSql, "CREATE TABLE t(x);");
    assert.deepEqual(sent.queries, ["A", "B"]);
  } finally {
    globalThis.Worker = saved;
  }
});

test("runLedger: 시간 초과면 timeout 결과, 다음 실행은 정상", async () => {
  const saved = globalThis.Worker;
  globalThis.Worker = LedgerWorker;
  try {
    LedgerWorker.mode = "hang";
    const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm", timeoutMs: 1000 });
    const out = await r.runLedger("x", ["A"], { timeoutMs: 50 });
    assert.equal(out.timeout, true);
    assert.equal(out.error, "timeout");
    assert.deepEqual(out.results, []);
    LedgerWorker.mode = "ok";
    const again = await r.runLedger("x", ["A"]);
    assert.equal(again.error, null);
    assert.equal(again.results.length, 1);
  } finally {
    globalThis.Worker = saved;
  }
});

test("runLedger: 일반 run과 대기열을 같이 쓴다(순서대로)", async () => {
  const saved = globalThis.Worker;
  globalThis.Worker = LedgerWorker;
  try {
    LedgerWorker.mode = "ok";
    const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm", timeoutMs: 1000 });
    const [a, b] = await Promise.all([r.runLedger("x", ["1"]), r.runLedger("x", ["2"])]);
    assert.deepEqual(a.results[0].rows, [["1"]]);
    assert.deepEqual(b.results[0].rows, [["2"]]);
  } finally {
    globalThis.Worker = saved;
  }
});
