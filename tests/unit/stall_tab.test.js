// v0.3.2 하단 메뉴 「가게」 칸: 잠김·열림과 새 소식 점(stallTab), 본 의뢰 기억(markOrderSeen)
import { test } from "node:test";
import assert from "node:assert/strict";
import { UPGRADES, REQUESTS } from "../../data/stall.js";
import { newStall, cleanStall, stallTab, markOrderSeen } from "../../src/stall/state.js";

const upTo = (n) => new Set(Array.from({ length: n }, (_, i) => i + 1)); // {1..n}
const cheapest = Math.min(...UPGRADES.map((u) => u.price));
// 한 번 열고 하루를 지낸 가게, 지금 의뢰(r01)는 이미 봄, 돈은 성장 값보다 적게
const played = (o = {}) => ({ ...newStall(1), opened: true, day: 2, last: { summary: { day: 1 } }, money: cheapest - 1, seenOrder: "r01", ...o });

test("잠김: 3장 평가 전에는 열리지 않고 점도 없음(가게 상태와 상관없이)", () => {
  assert.deepEqual(stallTab({ stall: null }, upTo(2)), { open: false, dot: false });
  assert.deepEqual(stallTab({ stall: played({ money: 9999 }) }, upTo(2)), { open: false, dot: false });
  assert.deepEqual(stallTab({ stall: null }, null), { open: false, dot: false });
  assert.deepEqual(stallTab(null, upTo(3)).open, true);
});

test("(a) 열렸지만 아직 한 번도 안 열어 봄: stall 없음·opened false·1일째에 어제 장부 없음 → 점", () => {
  assert.deepEqual(stallTab({ stall: null }, upTo(3)), { open: true, dot: true });
  assert.equal(stallTab({ stall: { ...newStall(1) } }, upTo(3)).dot, true);
  assert.equal(stallTab({ stall: { ...newStall(1), opened: true, seenOrder: "r01", money: 0 } }, upTo(3)).dot, true, "들어가 봤지만 장을 한 번도 안 열었음");
});

test("아무 소식 없음: 하루 이상 지냈고, 살 수 있는 성장 없고, 지금 의뢰는 이미 봄 → 점 없음", () => {
  assert.deepEqual(stallTab({ stall: played() }, upTo(3)), { open: true, dot: false });
});

test("(b) 가게 돈이 아직 안 산 성장 중 가장 싼 값 이상 → 점(산 성장은 셈에서 뺌)", () => {
  assert.equal(stallTab({ stall: played({ money: cheapest }) }, upTo(3)).dot, true);
  const cheapId = UPGRADES.find((u) => u.price === cheapest).id;
  const next = Math.min(...UPGRADES.filter((u) => u.id !== cheapId).map((u) => u.price));
  assert.equal(stallTab({ stall: played({ money: next - 1, upgrades: [cheapId] }) }, upTo(3)).dot, false);
  assert.equal(stallTab({ stall: played({ money: next, upgrades: [cheapId] }) }, upTo(3)).dot, true);
  // 성장을 모두 샀으면 돈이 많아도 (b)는 아님
  assert.equal(stallTab({ stall: played({ money: 999999, upgrades: UPGRADES.map((u) => u.id) }) }, upTo(3)).dot, false);
});

test("(c) 의뢰를 끝내 다음 의뢰가 생겼는데 아직 안 봄 → 점. 의뢰가 늘 있다고 늘 켜지지 않음", () => {
  const after1 = played({ order: { idx: 1, done: ["r01"], progress: {} } });
  assert.equal(stallTab({ stall: after1 }, upTo(3)).dot, true, "r02가 새로 생김");
  assert.equal(stallTab({ stall: { ...after1, seenOrder: "r02" } }, upTo(3)).dot, false, "r02를 봤으면 점 없음");
});

test("(c) 장 기다림 중인 의뢰는 점을 켜지 않고, 그 장 평가를 통과해 할 수 있게 되면 켬", () => {
  const i = REQUESTS.findIndex((r) => r.need === 4);
  const st = played({ order: { idx: i, done: REQUESTS.slice(0, i).map((r) => r.id), progress: {} }, seenOrder: REQUESTS[i - 1].id });
  assert.equal(stallTab({ stall: st }, upTo(3)).dot, false, "4장 평가 전: 기다림");
  assert.equal(stallTab({ stall: st }, upTo(4)).dot, true, "4장 통과: 새로 할 수 있음");
});

test("의뢰를 모두 끝냈으면 (c)는 없음", () => {
  const st = played({ order: { idx: REQUESTS.length, done: REQUESTS.map((r) => r.id), progress: {} }, seenOrder: REQUESTS.at(-1).id });
  assert.equal(stallTab({ stall: st }, upTo(17)).dot, false);
});

test("markOrderSeen: 지금 할 수 있는 의뢰 id를 적음(같으면 같은 객체, 기다림이면 그대로)", () => {
  const st = played({ order: { idx: 1, done: ["r01"], progress: {} } });
  const seen = markOrderSeen(st, upTo(3));
  assert.equal(seen.seenOrder, "r02");
  assert.equal(st.seenOrder, "r01", "원본은 그대로");
  assert.equal(markOrderSeen(seen, upTo(3)), seen);
  const i = REQUESTS.findIndex((r) => r.need === 4);
  const wait = played({ order: { idx: i, done: REQUESTS.slice(0, i).map((r) => r.id), progress: {} }, seenOrder: "r04" });
  assert.equal(markOrderSeen(wait, upTo(3)), wait);
  assert.equal(markOrderSeen(null, upTo(3)), null);
});

test("cleanStall: seenOrder는 의뢰 표의 id만 남기고 아니면 null, 새 가게는 null", () => {
  assert.equal(newStall(1).seenOrder, null);
  assert.equal(cleanStall({ ...newStall(1), seenOrder: "r03" }).seenOrder, "r03");
  assert.equal(cleanStall({ ...newStall(1), seenOrder: "zzz" }).seenOrder, null);
  assert.equal(cleanStall({ ...newStall(1), seenOrder: 3 }).seenOrder, null);
  const old = { ...newStall(1) };
  delete old.seenOrder;
  assert.equal(cleanStall(old).seenOrder, null, "v0.3.1 저장");
});
