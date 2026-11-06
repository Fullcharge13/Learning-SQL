// v0.1.1: 느린 휴대폰의 시간 초과 (사용자 승인 「느린 기기면 한 번 더 기다리기」)
// 학습자 SQL이 시간 초과면 그 문제 정답 SQL이 이 기기에서 얼마나 걸리는지 보고,
// 정답도 1초를 넘게 걸리는 느린 기기면 학습자 SQL을 10초 제한으로 한 번 더 돌린다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SqlRun, DEFAULT_TIMEOUT_MS } from "../../src/sqlrun.js";
import {
  SLOW_EXPECTED_MS, SLOW_RETRY_TIMEOUT_MS, isSlowDevice, runExpected, settleTimeout,
} from "../../src/slowdevice.js";
import { systemLine, SYSTEM_ERRORS } from "../../src/ui/build.js";
import { explain } from "../../src/grade.js";

const OK = (ms = 5) => ({ columns: ["a"], rows: [[1]], error: null, truncated: false, timeout: false, ms });
const TIMEOUT = (ms) => ({ columns: [], rows: [], error: "timeout", truncated: false, timeout: true, ms });

// 가짜 실행기: SQL마다 [기본 제한일 때 결과, 긴 제한일 때 결과]. 부른 차례를 기록한다
function fakeSql(script) {
  const calls = [];
  return {
    calls,
    run(sql, opts = {}) {
      const t = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      calls.push({ sql, timeoutMs: t });
      const s = script[sql];
      return Promise.resolve(typeof s === "function" ? s(t) : s);
    },
  };
}

test("상수: 정답 1000ms 넘으면 느린 기기, 다시 돌릴 때 제한 10초", () => {
  assert.equal(SLOW_EXPECTED_MS, 1000);
  assert.equal(SLOW_RETRY_TIMEOUT_MS, 10000);
  assert.equal(DEFAULT_TIMEOUT_MS, 3000, "기본 제한은 그대로");
});

test("isSlowDevice: 정답 실행 시간 > 1000ms, 정답 자체가 시간 초과면 느린 기기", () => {
  assert.equal(isSlowDevice(OK(12)), false);
  assert.equal(isSlowDevice(OK(1000)), false, "딱 1000ms는 빠른 쪽");
  assert.equal(isSlowDevice(OK(1001)), true);
  assert.equal(isSlowDevice(TIMEOUT(3000)), true);
  assert.equal(isSlowDevice({ ...OK(), slow: true }), true);
  assert.equal(isSlowDevice({ columns: [], rows: [], error: "worker" }), false, "실행기 멈춤은 느림이 아님");
  assert.equal(isSlowDevice(null), false);
  assert.equal(isSlowDevice({ columns: [], rows: [], error: null }), false, "잰 시간이 없으면 빠른 쪽(지금 그대로)");
});

test("(a) 빠른 기기 + 시간 초과 → 다시 돌리지 않고 그대로(오답·ON 안내)", async () => {
  const sql = fakeSql({ MINE: TIMEOUT(3000), ANS: OK(8) });
  const first = await sql.run("MINE");
  const s = await settleTimeout(first, { sql, text: "MINE", expectedText: "ANS", expected: () => runExpected(sql, "ANS") });
  assert.equal(s.busy, false);
  assert.equal(s.retried, false);
  assert.equal(s.r.error, "timeout", "시간 초과 결과가 그대로 채점으로 감");
  assert.deepEqual(sql.calls.map((c) => c.sql), ["MINE", "ANS"]);
});

test("(b) 느린 기기 + 다시 돌려 끝남 → 그 결과로 채점", async () => {
  const sql = fakeSql({ MINE: (t) => (t > DEFAULT_TIMEOUT_MS ? OK(4200) : TIMEOUT(3000)), ANS: OK(1500) });
  const first = await sql.run("MINE");
  const s = await settleTimeout(first, { sql, text: "MINE", expectedText: "ANS", expected: () => runExpected(sql, "ANS") });
  assert.equal(s.busy, false);
  assert.equal(s.retried, true);
  assert.equal(s.r.error, null);
  assert.deepEqual(s.r.rows, [[1]]);
  // 정답이 1초를 넘으면 한 번 더 재 보고(작은 쪽), 그래도 느리면 10초로 다시
  assert.deepEqual(sql.calls, [
    { sql: "MINE", timeoutMs: 3000 }, { sql: "ANS", timeoutMs: 3000 }, { sql: "ANS", timeoutMs: 3000 }, { sql: "MINE", timeoutMs: 10000 },
  ]);
});

test("(c) 느린 기기 + 다시 돌려도 시간 초과 → 세지 않음(busy), 두억이 「휴대폰이 바빠」 안내", async () => {
  const sql = fakeSql({ MINE: TIMEOUT(3000), ANS: OK(2400) });
  const first = await sql.run("MINE");
  const s = await settleTimeout(first, { sql, text: "MINE", expectedText: "ANS", expected: () => runExpected(sql, "ANS") });
  assert.equal(s.busy, true);
  assert.equal(s.retried, true);
  const line = systemLine("busy", "basic");
  assert.equal(line.text.startsWith(explain("busy", "basic")), true);
  assert.match(line.text, /휴대폰이 좀 바빠서 오래 걸렸어요\. 잠시 뒤 다시 눌러 볼까요\?/);
  assert.match(line.text, /제출 횟수에 들어가지 않아요/);
  // 고침 3: 바쁨 안내에도 ON을 부드럽게 짚는다(두 말투 모두)
  assert.match(line.text, /혹시 표를 잇는 조건\(ON\)이 빠지진 않았는지도/);
  assert.match(explain("busy", "detective"), /ON/);
  const det = systemLine("busy", "detective");
  assert.notEqual(det.text, line.text, "탐정 말투가 따로 있음");
  assert.ok(det.text.startsWith(explain("busy", "detective")));
});

test("(c') 정답도 기본 제한에서 시간 초과면 긴 제한으로 정답을 다시 재고, 느린 기기로 봄", async () => {
  const sql = fakeSql({ MINE: TIMEOUT(3000), ANS: (t) => (t > DEFAULT_TIMEOUT_MS ? OK(3600) : TIMEOUT(3000)) });
  const exp = await runExpected(sql, "ANS");
  assert.equal(exp.error, null);
  assert.equal(isSlowDevice(exp), true);
  assert.deepEqual(sql.calls.map((c) => c.timeoutMs), [3000, 10000]);
});

test("시간 초과가 아니면 정답을 재지도, 다시 돌리지도 않음", async () => {
  const sql = fakeSql({ ANS: OK() });
  let asked = 0;
  for (const r of [OK(), { columns: [], rows: [], error: "no such table: x" }, { columns: [], rows: [], error: "worker" }]) {
    const s = await settleTimeout(r, { sql, text: "MINE", expectedText: "ANS", expected: () => { asked++; return runExpected(sql, "ANS"); } });
    assert.equal(s.r, r);
    assert.equal(s.busy, false);
  }
  assert.equal(asked, 0);
  assert.equal(sql.calls.length, 0);
});

// ---- 고침 1: 한 번 멈칫한 빠른 기기를 느린 기기로 보지 않음 ----
test("고침 1: 정답 첫 측정만 멈칫(1500ms)하고 다시 재면 빠름(8ms) → 작은 값으로 빠른 기기, 오답·ON 안내", async () => {
  let n = 0;
  const sql = fakeSql({ MINE: TIMEOUT(3000), ANS: () => (n++ === 0 ? OK(1500) : OK(8)) });
  const first = await sql.run("MINE");
  const s = await settleTimeout(first, { sql, text: "MINE", expectedText: "ANS", expected: () => runExpected(sql, "ANS") });
  assert.equal(s.busy, false);
  assert.equal(s.retried, false, "10초로 다시 돌리지 않음");
  assert.equal(s.r.error, "timeout");
  assert.match(explain(s.r.error, "basic"), /ON/, "지금처럼 ON 안내");
  assert.deepEqual(sql.calls.map((c) => c.sql + ":" + c.timeoutMs), ["MINE:3000", "ANS:3000", "ANS:3000"], "정답은 딱 한 번 더");
});

test("고침 1: 다시 잰 정답이 실행기 문제(worker)면 첫 측정을 그대로 씀", async () => {
  let n = 0;
  const sql = fakeSql({ MINE: (t) => (t > DEFAULT_TIMEOUT_MS ? OK(4000) : TIMEOUT(3000)),
    ANS: () => (n++ === 0 ? OK(1500) : { columns: [], rows: [], error: "worker", ms: 1 }) });
  const s = await settleTimeout(await sql.run("MINE"), { sql, text: "MINE", expectedText: "ANS", expected: () => runExpected(sql, "ANS") });
  assert.equal(s.retried, true);
  assert.equal(s.r.error, null);
});

// ---- 고침 2: 기다림 안내는 첫 시간 초과 바로 뒤, 정답을 재기 전에 ----
test("고침 2: onWait는 학습자 첫 시간 초과 직후, 정답 측정보다 먼저 한 번", async () => {
  const order = [];
  const sql = fakeSql({ MINE: TIMEOUT(3000), ANS: OK(2000) });
  const orig = sql.run;
  sql.run = (q, o) => { order.push("run:" + q + ":" + ((o && o.timeoutMs) || 3000)); return orig(q, o); };
  await settleTimeout(TIMEOUT(3000), {
    sql, text: "MINE", expectedText: "ANS",
    expected: () => { order.push("expected"); return runExpected(sql, "ANS"); },
    onWait: () => order.push("wait"),
  });
  assert.equal(order[0], "wait", order.join(" "));
  assert.equal(order.filter((x) => x === "wait").length, 1);
  // 시간 초과가 아니면 부르지 않음
  let waited = 0;
  await settleTimeout(OK(), { sql, text: "MINE", expectedText: "ANS", expected: () => runExpected(sql, "ANS"), onWait: () => waited++ });
  assert.equal(waited, 0);
});

// ---- 고침 4: busy도 시스템 오류 묶음에 ----
test("고침 4: SYSTEM_ERRORS에 busy가 들어 있음(세지 않는 실패)", () => {
  assert.ok(SYSTEM_ERRORS.has("busy"));
  assert.ok(SYSTEM_ERRORS.has("load") && SYSTEM_ERRORS.has("worker"));
  assert.ok(!SYSTEM_ERRORS.has("timeout"), "빠른 기기 시간 초과는 학습자 SQL 탓으로 셈");
});

// ---- (d) SqlRun: 한 번만 쓰는 제한 시간, 실행 시간 ms ----
// 가짜 Worker: init → ready, run → started 후 delay ms 뒤 result
class FakeWorker {
  static delay = 0;
  constructor() { this.dead = false; FakeWorker.last = this; }
  postMessage(m) {
    if (m.type === "init") setTimeout(() => this.onmessage && this.onmessage({ data: { type: "ready" } }), 0);
    if (m.type === "run") {
      setTimeout(() => !this.dead && this.onmessage({ data: { type: "started", id: m.id } }), 0);
      setTimeout(() => !this.dead && this.onmessage({ data: { type: "result", id: m.id, result: { columns: ["x"], rows: [[1]], error: null } } }), FakeWorker.delay);
    }
  }
  terminate() { this.dead = true; }
}

test("(d) SqlRun.run(sql, { timeoutMs }): 그 실행만 제한을 바꾸고 기본값은 그대로, 결과에 ms", async () => {
  const saved = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm", timeoutMs: 60 });
    FakeWorker.delay = 150;
    const short = await r.run("SELECT 1");
    assert.equal(short.error, "timeout", "기본 60ms로는 시간 초과");
    const long = await r.run("SELECT 1", { timeoutMs: 400 });
    assert.equal(long.error, null, "이번만 400ms");
    assert.deepEqual(long.rows, [[1]]);
    assert.equal(typeof long.ms, "number");
    assert.ok(long.ms >= 120 && long.ms < 400, `ms=${long.ms}`);
    assert.equal(r.timeoutMs, 60, "기본값은 바뀌지 않음");
    const again = await r.run("SELECT 1");
    assert.equal(again.error, "timeout", "다음 실행은 다시 기본 제한");
    FakeWorker.delay = 5;
    const fast = await r.run("SELECT 1");
    assert.equal(fast.error, null);
    assert.ok(fast.ms < 60, `ms=${fast.ms}`);
  } finally {
    globalThis.Worker = saved;
  }
});

test("(d') ms는 대기열·실행기 준비를 기다린 시간을 빼고 잰다", async () => {
  const saved = globalThis.Worker;
  globalThis.Worker = FakeWorker;
  try {
    const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm", timeoutMs: 1000 });
    FakeWorker.delay = 80;
    // 둘을 한꺼번에: 둘째는 첫째가 끝날 때까지(약 80ms) 줄을 서지만, 그 기다림은 ms에 들어가지 않음
    const [a, b] = await Promise.all([r.run("SELECT 1"), r.run("SELECT 2")]);
    assert.ok(a.ms >= 60 && a.ms < 140, `a.ms=${a.ms}`);
    assert.ok(b.ms >= 60 && b.ms < 140, `b.ms=${b.ms}`);
  } finally {
    globalThis.Worker = saved;
  }
});
