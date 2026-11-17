// v0.3.2 하단 메뉴 「가게」 칸: 잠김·열림과 새 소식 점(stallTab), 본 의뢰·살 수 있던 성장 기억(markStallSeen)
import { test } from "node:test";
import assert from "node:assert/strict";
import { UPGRADES, REQUESTS } from "../../data/stall.js";
import { newStall, cleanStall, stallTab, markStallSeen } from "../../src/stall/state.js";

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

// (b)는 사용자 결정 「새로 살 수 있게 됐을 때만」(fix round 1): 지난번 가게에서 본(살 수 있던) 성장은 다시 점을 켜지 않음
const byPrice = [...UPGRADES].sort((a, b) => a.price - b.price);
test("(b) 아직 안 본 성장을 새로 살 수 있게 됨 → 점(산 성장은 셈에서 뺌, 다 샀으면 없음)", () => {
  assert.equal(stallTab({ stall: played({ money: cheapest }) }, upTo(3)).dot, true);
  const cheapId = byPrice[0].id;
  const next = byPrice[1].price;
  assert.equal(stallTab({ stall: played({ money: next - 1, upgrades: [cheapId] }) }, upTo(3)).dot, false);
  assert.equal(stallTab({ stall: played({ money: next, upgrades: [cheapId] }) }, upTo(3)).dot, true);
  assert.equal(stallTab({ stall: played({ money: 999999, upgrades: UPGRADES.map((u) => u.id) }) }, upTo(3)).dot, false);
});

test("(b) 살 수 있게 됨 → 가게에 들어가 봄 → 점 꺼짐", () => {
  const st = played({ money: byPrice[0].price });
  assert.equal(stallTab({ stall: st }, upTo(3)).dot, true);
  const seen = markStallSeen(st, upTo(3));
  assert.deepEqual(seen.seenBuy, [byPrice[0].id]);
  assert.equal(stallTab({ stall: seen }, upTo(3)).dot, false, "본 성장은 돈이 있어도 점 없음");
});

test("(b) 두 번째 성장을 새로 살 수 있게 됨 → 다시 점", () => {
  const seen = markStallSeen(played({ money: byPrice[0].price }), upTo(3));
  const richer = { ...seen, money: byPrice[1].price };
  assert.equal(stallTab({ stall: richer }, upTo(3)).dot, true);
  const seen2 = markStallSeen(richer, upTo(3));
  assert.deepEqual([...seen2.seenBuy].sort(), [byPrice[0].id, byPrice[1].id].sort());
  assert.equal(stallTab({ stall: seen2 }, upTo(3)).dot, false);
});

test("(b) 돈이 줄었다가(그 사이 가게에 들어가 봐도) 다시 같은 성장 값까지 오르면 → 점 없음", () => {
  const seen = markStallSeen(played({ money: byPrice[0].price }), upTo(3));
  const poor = markStallSeen({ ...seen, money: 10 }, upTo(3));      // 줄어든 채 다시 봄
  assert.deepEqual(poor.seenBuy, [byPrice[0].id], "본 기록은 남음");
  assert.equal(stallTab({ stall: { ...poor, money: byPrice[0].price } }, upTo(3)).dot, false);
  assert.equal(stallTab({ stall: { ...seen, money: byPrice[0].price + 5 } }, upTo(3)).dot, false);
});

test("markStallSeen: 산 성장은 seenBuy에서 빠지고, 바뀔 것이 없으면 같은 객체", () => {
  const seen = markStallSeen(played({ money: byPrice[1].price }), upTo(3));
  assert.equal(markStallSeen(seen, upTo(3)), seen);
  const bought = markStallSeen({ ...seen, upgrades: [byPrice[0].id], money: 0 }, upTo(3));
  assert.deepEqual(bought.seenBuy, [byPrice[1].id]);
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

test("markStallSeen: 지금 할 수 있는 의뢰 id를 적음(같으면 같은 객체, 기다림이면 그대로)", () => {
  const st = played({ order: { idx: 1, done: ["r01"], progress: {} } });
  const seen = markStallSeen(st, upTo(3));
  assert.equal(seen.seenOrder, "r02");
  assert.equal(st.seenOrder, "r01", "원본은 그대로");
  assert.equal(markStallSeen(seen, upTo(3)), seen);
  const i = REQUESTS.findIndex((r) => r.need === 4);
  const wait = played({ order: { idx: i, done: REQUESTS.slice(0, i).map((r) => r.id), progress: {} }, seenOrder: "r04" });
  assert.equal(markStallSeen(wait, upTo(3)), wait);
  assert.equal(markStallSeen(null, upTo(3)), null);
});

test("cleanStall: seenBuy는 성장 표의 id만(중복 없이), 없거나 배열이 아니면 [], 새 가게는 []", () => {
  assert.deepEqual(newStall(1).seenBuy, []);
  assert.deepEqual(cleanStall({ ...newStall(1), seenBuy: ["sign", "zzz", "sign", 3] }).seenBuy, ["sign"]);
  assert.deepEqual(cleanStall({ ...newStall(1), seenBuy: "sign" }).seenBuy, []);
  const old = { ...newStall(1) };
  delete old.seenBuy;
  assert.deepEqual(cleanStall(old).seenBuy, []);
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
