import { test } from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { REQUESTS, CARDS, SLOTS } from "../../data/stall.js";
import { newStall } from "../../src/stall/state.js";
import { currentRequest, checkRequest, advanceRequests, checkUpgradeNow } from "../../src/stall/requests.js";
import { playDay } from "../../src/stall/play.js";
import { runLedger } from "../../src/sqlcore.js";

const SQL = await initSqlJs();
const runner = async (l, q) => ({ results: runLedger(SQL, l, q), error: null, timeout: false });
const upTo = (n) => new Set(Array.from({ length: n - 2 }, (_, i) => i + 3)); // {3..n}
const sum = (o = {}) => ({ day: 1, customers: 9, sold: 9, missed: 0, missBy: { shelf: 0, stock: 0, price: 0 }, lost: 0, revenue: 50, bought: 10, fees: 4, profit: 36, report: null, rest: {}, trend: 1, ...o });
const req = (goal, o = {}) => ({ id: "t", need: 3, from: "두억이", line: "", goal, xp: 5, solution: {}, withinDays: 3, ...o });
// 의뢰 idx번째를 지금 의뢰로 둔 가게(앞 의뢰는 다 끝낸 상태)
const at = (i, s = newStall(1)) => ({ ...s, order: { idx: i, done: REQUESTS.slice(0, i).map((r) => r.id), progress: {} } });
const idxOf = (type) => REQUESTS.findIndex((r) => r.goal.type === type);

test("REQUESTS: 15개, 장 순서 3·3·3·3·4·4·5·5·6·6·7·7·7·8·8, XP 5, 목표 종류 순서", () => {
  assert.equal(REQUESTS.length, 15);
  assert.deepEqual(REQUESTS.map((r) => r.need), [3, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8]);
  assert.deepEqual(REQUESTS.map((r) => r.goal.type), [
    "slot_ok", "no_miss", "cart_max", "profit", "slot_ok", "upgrade", "slot_ok", "profit",
    "upgrade", "no_miss", "report", "report", "upgrade", "slot_ok", "profit"]);
  assert.equal(new Set(REQUESTS.map((r) => r.id)).size, 15);
  for (const r of REQUESTS) {
    assert.equal(r.xp, 5);
    assert.ok(r.from && r.line, r.id);
    assert.ok(Number.isInteger(r.withinDays) && r.withinDays >= 1, r.id);
    for (const [slot, st] of Object.entries(r.solution)) {
      assert.ok(SLOTS.some((d) => d.id === slot), `${r.id} ${slot}`);
      for (const list of Object.values(st.parts)) for (const t of list) assert.ok(CARDS.some((c) => c.id === t.c), `${r.id} ${t.c}`);
    }
  }
  assert.equal(REQUESTS.find((r) => r.goal.type === "slot_ok").goal.slot, "restock");
});

test("slot_ok: 칸이 켜졌고 쉬지 않았으면 완료, 쉬었거나 꺼졌으면 미달", () => {
  const r = req({ type: "slot_ok", slot: "restock" });
  const s = newStall(1);
  assert.deepEqual(checkRequest(r, s, sum()), { done: true, progress: { n: 1, of: 1 } });
  assert.equal(checkRequest(r, s, sum({ rest: { restock: "오류" } })).done, false);
  const off = { ...s, slots: { restock: { ...s.slots.restock, on: false } } };
  assert.equal(checkRequest(r, off, sum()).done, false);
  assert.equal(checkRequest(r, { ...s, slots: {} }, sum()).done, false);
});

test("no_miss: 고칠 수 있는 허탕(재고·값)이 없는 날이 연속 n일; 진열 허탕은 세지 않음", () => {
  const r = req({ type: "no_miss", days: 2 });
  const s = newStall(1);
  const one = checkRequest(r, s, sum({ missed: 3, missBy: { shelf: 3, stock: 0, price: 0 } }));
  assert.deepEqual(one, { done: false, progress: { n: 1, of: 2 } });
  const s1 = { ...s, order: { ...s.order, progress: { t: 1 } } };
  assert.equal(checkRequest(r, s1, sum()).done, true);
  assert.deepEqual(checkRequest(r, s1, sum({ missed: 1, missBy: { shelf: 0, stock: 1, price: 0 } })), { done: false, progress: { n: 0, of: 2 } });
  assert.equal(checkRequest(r, s1, sum({ missed: 1, missBy: { shelf: 0, stock: 0, price: 1 } })).done, false);
});

test("cart_max: 허탕 없음 + 수레 삯 ≤ fee가 연속 n일; 끊기면 0부터", () => {
  const r = req({ type: "cart_max", fee: 6, days: 2 });
  const s = newStall(1);
  const s1 = { ...s, order: { ...s.order, progress: { t: 1 } } };
  assert.equal(checkRequest(r, s1, sum({ fees: 6 })).done, true);
  assert.deepEqual(checkRequest(r, s1, sum({ fees: 8 })).progress, { n: 0, of: 2 });
  assert.deepEqual(checkRequest(r, s1, sum({ missBy: { shelf: 0, stock: 2, price: 0 }, missed: 2 })).progress, { n: 0, of: 2 });
  assert.deepEqual(checkRequest(r, s, sum({ fees: 2 })).progress, { n: 1, of: 2 });
});

test("profit: 하루 이익 ≥ n이면 완료", () => {
  const r = req({ type: "profit", n: 25 });
  assert.equal(checkRequest(r, newStall(1), sum({ profit: 25 })).done, true);
  assert.equal(checkRequest(r, newStall(1), sum({ profit: 24 })).done, false);
});

test("report: 숫자는 숫자로, 나머지는 글자로 비교, 빈 값은 미달", () => {
  const r = req({ type: "report", answerSql: "SELECT 1" });
  const s = newStall(1);
  assert.equal(checkRequest(r, s, sum({ report: 42 }), 42).done, true);
  assert.equal(checkRequest(r, s, sum({ report: 42 }), 42.0).done, true);
  assert.equal(checkRequest(r, s, sum({ report: 41 }), 42).done, false);
  assert.equal(checkRequest(r, s, sum({ report: "약과" }), "약과").done, true);
  assert.equal(checkRequest(r, s, sum({ report: null }), null).done, false);
  assert.equal(checkRequest(r, s, sum({ report: 3 }), null).done, false);
});

test("upgrade: 그 성장을 샀으면 완료(summary 없어도)", () => {
  const r = req({ type: "upgrade", id: "sign" });
  assert.equal(checkRequest(r, newStall(1), sum()).done, false);
  assert.equal(checkRequest(r, { ...newStall(1), upgrades: ["sign"] }, null).done, true);
});

test("currentRequest: 처음은 첫 의뢰, need 8인데 3~7장만 → waiting", () => {
  assert.deepEqual(currentRequest(newStall(1), upTo(3)), { req: REQUESTS[0], waiting: false });
  const i8 = REQUESTS.findIndex((r) => r.need === 8);
  const c = currentRequest(at(i8), upTo(7));
  assert.equal(c.req, REQUESTS[i8]);
  assert.equal(c.waiting, true);
  assert.equal(currentRequest(at(i8), upTo(8)).waiting, false);
  assert.deepEqual(currentRequest(at(15), upTo(8)), { req: null, waiting: false });
});

test("advanceRequests: 기다리는 의뢰는 판정하지 않음", () => {
  const i8 = REQUESTS.findIndex((r) => r.need === 8);
  const s = at(i8);
  const out = advanceRequests(s, upTo(7), sum({ profit: 999 }), null);
  assert.deepEqual(out.completed, []);
  assert.equal(out.stall, s);
});

test("advanceRequests: 완료는 한 번에 하나, done에 한 번만, 다시 완료 안 됨; 입력은 그대로", () => {
  const s = newStall(1); // 첫 의뢰 slot_ok restock
  const before = JSON.stringify(s);
  const a = advanceRequests(s, upTo(8), sum({ profit: 999 }), null);
  assert.equal(JSON.stringify(s), before);
  assert.equal(a.completed.length, 1);
  assert.equal(a.completed[0].id, REQUESTS[0].id);
  assert.deepEqual(a.stall.order.done, [REQUESTS[0].id]);
  assert.equal(a.stall.order.idx, 1);
  // 다음 의뢰(no_miss 2)는 같은 날 판정하지 않았으니 진행 없음; 다음 날 1/2
  assert.equal(a.stall.order.progress[REQUESTS[1].id], undefined);
  const b = advanceRequests(a.stall, upTo(8), sum(), null);
  assert.deepEqual(b.completed, []);
  assert.equal(b.stall.order.progress[REQUESTS[1].id], 1);
  const c = advanceRequests(b.stall, upTo(8), sum(), null);
  assert.equal(c.completed.length, 1);
  assert.deepEqual(c.stall.order.done, [REQUESTS[0].id, REQUESTS[1].id]);
  assert.equal(c.stall.order.progress[REQUESTS[1].id], undefined);
});

test("advanceRequests: 연속이 끊기면 progress 0", () => {
  const i = idxOf("no_miss");
  const s = { ...at(i), order: { ...at(i).order, progress: { [REQUESTS[i].id]: 1 } } };
  const out = advanceRequests(s, upTo(8), sum({ missed: 1, missBy: { shelf: 0, stock: 1, price: 0 } }), null);
  assert.equal(out.stall.order.progress[REQUESTS[i].id], 0);
});

test("checkUpgradeNow: 지금 의뢰가 성장이고 샀으면 바로 완료, 아니면 그대로", () => {
  const i = idxOf("upgrade");
  const s = at(i);
  assert.deepEqual(checkUpgradeNow(s, upTo(8)), { stall: s, completed: [] });
  const bought = { ...s, upgrades: [REQUESTS[i].goal.id] };
  const out = checkUpgradeNow(bought, upTo(8));
  assert.equal(out.completed.length, 1);
  assert.equal(out.stall.order.done.at(-1), REQUESTS[i].id);
  assert.deepEqual(checkUpgradeNow(out.stall, upTo(8)).completed, []);
  // 성장 의뢰가 아니면 아무것도 안 함
  assert.deepEqual(checkUpgradeNow({ ...newStall(1), upgrades: ["sign"] }, upTo(8)).completed, []);
});

// --- playDay (실제 sql.js) ---

test("playDay: 하루가 지나고, 켜진 재고 채우기 칸이 결과대로 채운다", async () => {
  const s = newStall(1); // restock stock < 1: 시작 재고는 모두 1 이상 → 채울 것 없음
  const out = await playDay(s, upTo(3), runner);
  assert.equal(out.stall.day, 2);
  assert.equal(out.summary.fees, 0);
  assert.deepEqual(out.rest, {});
  assert.equal(out.completed[0].id, REQUESTS[0].id);
  const s2 = { ...s, slots: { restock: { on: true, mode: "frame", parts: { where: [{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 4 }] } } } };
  const out2 = await playDay(s2, upTo(3), runner);
  assert.equal(out2.summary.fees, 2); // 짚신(재고 3)만
  assert.equal(out2.stall.items.find((i) => i.item_id === 5).stock >= 3, true);
});

test("playDay: 진열 칸이 꺼졌거나 안 열렸으면 기본 진열(null), 결과 0행이면 빈 진열([])", async () => {
  const seen = [];
  const spy = async (l, q) => { seen.push(q); return runner(l, q); };
  const disp = (on, n) => ({ on, mode: "frame", parts: { order: [{ c: "col_stock" }], limit: [{ c: "num", n }] } });
  const base = newStall(1);
  // 안 열림(4장까지): 질의도 안 돌고 기본 진열 → 팔림
  const a = await playDay({ ...base, slots: { display: disp(true, 0) } }, upTo(4), spy);
  assert.equal(seen.length, 0);
  assert.ok(a.summary.sold > 0);
  // 열림 + LIMIT 0 → 진열 없음 → 모두 허탕
  const b = await playDay({ ...base, slots: { display: disp(true, 0) } }, upTo(5), spy);
  assert.equal(b.summary.sold, 0);
  assert.equal(b.summary.missBy.shelf, b.summary.customers);
  // 꺼짐 → 기본 진열
  const c = await playDay({ ...base, slots: { display: disp(false, 0) } }, upTo(5), spy);
  assert.ok(c.summary.sold > 0);
});

test("playDay: 빈자리·오류·name 열 없음은 그 칸만 쉬고 하루는 지남", async () => {
  const s = {
    ...newStall(1),
    slots: {
      restock: { on: true, mode: "frame", parts: { where: [] } },
      discount: { on: true, mode: "frame", parts: { where: [{ c: "col_stock" }, { c: "op_lt" }] } },
      best: { on: true, mode: "full", parts: { full: [{ c: "kw_select" }, { c: "col_qty" }, { c: "kw_from" }, { c: "tbl_order_items" }] } },
    },
  };
  const out = await playDay(s, upTo(8), runner);
  assert.equal(out.stall.day, 2);
  assert.equal(out.rest.restock, "빈자리를 채워 주세요");
  assert.equal(typeof out.rest.discount, "string");
  assert.notEqual(out.rest.discount, "");
  assert.equal(out.rest.best, "결과에 name이나 item_id 열이 있어야 해요");
  assert.deepEqual(out.summary.rest, out.rest);
});

test("playDay: 실행기 자체 실패(load·worker)면 throw, 하루 안 지남", async () => {
  const s = newStall(1);
  for (const error of ["load", "worker"]) {
    await assert.rejects(playDay(s, upTo(3), async () => ({ results: [], error, timeout: false })));
  }
  assert.equal(s.day, 1);
});

test("playDay: 시간 초과면 질의한 칸이 모두 쉬고 하루는 지남", async () => {
  const out = await playDay(newStall(1), upTo(3), async () => ({ results: [], error: "timeout", timeout: true }));
  assert.equal(out.stall.day, 2);
  assert.equal(typeof out.rest.restock, "string");
});

test("playDay: 하루 보고 의뢰면 answerSql을 같은 묶음에 붙여 같은 장부로 판정", async () => {
  const i = idxOf("report");
  const r = REQUESTS[i];
  const seen = [];
  const spy = async (l, q) => { seen.push(q); return runner(l, q); };
  const s = { ...at(i), slots: { ...at(i).slots, report: r.solution.report && { on: true, ...r.solution.report } } };
  const out = await playDay(s, upTo(8), spy);
  assert.equal(seen[0].at(-1), r.goal.answerSql);
  assert.equal(out.completed.length, 1);
  assert.equal(out.completed[0].id, r.id);
  // 보고 칸이 꺼져 있으면 미완료
  const off = { ...at(i), slots: {} };
  assert.deepEqual((await playDay(off, upTo(8), runner)).completed, []);
});
