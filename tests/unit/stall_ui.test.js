// 가게 화면의 순수 글 만들기(작업 7): 사건 → 재생 말풍선·줄, 정산 줄, 어제 장부 칸 줄, 의뢰 진행 글.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REQUESTS } from "../../data/stall.js";
import { newStall } from "../../src/stall/state.js";
import { eventLine, bubbleText, summaryRows, lastLines, requestProgress, arrivalLine, TIMEOUT_LINE, restLines } from "../../src/ui/stall.js";
import { explain } from "../../src/grade.js";

const sum = (o = {}) => ({ day: 1, customers: 9, sold: 8, missed: 2, missBy: { shelf: 1, stock: 1, price: 0 }, lost: 11, revenue: 50, bought: 10, fees: 4, profit: 36, report: null, rest: {}, trend: 2, ...o });

test("eventLine: 허탕 세 가지 — 다 팔림·값 없음·안 보임, 물건 이름이 들어감", () => {
  const s = newStall(1);
  const stock = eventLine({ t: "miss", why: "stock", item_id: 3 }, s);
  assert.match(stock, /식혜/);
  assert.match(stock, /다 팔렸/);
  assert.match(eventLine({ t: "miss", why: "price", item_id: 7 }, s), /값이 없/);
  assert.match(eventLine({ t: "miss", why: "shelf", item_id: 5 }, s), /안 보이/);
  // 다 팔려 진열대에서 내려간 물건은 「다 팔렸네」
  assert.match(eventLine({ t: "miss", why: "shelf", soldOut: true, item_id: 5 }, s), /다 팔렸/);
  assert.equal(bubbleText({ t: "miss", why: "shelf", soldOut: true, item_id: 5 }), "다 팔렸네");
  assert.equal(bubbleText({ t: "miss", why: "shelf", item_id: 5 }), "안 보이네");
  assert.equal(bubbleText({ t: "miss", why: "price", item_id: 7 }), "값이 없네");
});

test("eventLine: 손님 이름(CUSTOMERS), 사기·찾던 물건·모자란 개수", () => {
  const s = newStall(1);
  const buy = eventLine({ t: "buy", customer_id: 1, item_id: 3, qty: 1, want: 1, price: 5 }, s);
  assert.match(buy, /가온/);
  assert.match(buy, /식혜 1개/);
  const sub = eventLine({ t: "buy", customer_id: 2, item_id: 1, qty: 1, want: 1, price: 6, want_item: 2 }, s);
  assert.match(sub, /나루/);
  assert.match(sub, /약과/);
  assert.match(sub, /인절미/);
  const short = eventLine({ t: "buy", customer_id: 3, item_id: 4, qty: 1, want: 2, price: 4 }, s);
  assert.match(short, /2개/);
  assert.match(short, /1개/);
});

test("eventLine: 아침 주문은 저녁 도착, 꽉 참·돈 모자람, 값 매김, 쉰 칸", () => {
  const s = newStall(1);
  assert.match(eventLine({ t: "fill", item_id: 3, n: 10, cost: 20, fee: 2, slot: "restock" }, s), /식혜 10개 주문 → 저녁에 도착/);
  assert.match(eventLine({ t: "full", item_id: 4, fee: 2, slot: "restock" }, s), /엿/);
  assert.match(eventLine({ t: "broke", item_id: 5, slot: "restock" }, s), /돈이 모자라/);
  assert.match(eventLine({ t: "price", item_id: 7, price: 8 }, s), /꿀떡.*8냥/);
  assert.match(eventLine({ t: "slot", slot: "discount", line: "빈자리를 채워 주세요" }, s), /할인 걸기.*쉼/);
  assert.match(arrivalLine([{ t: "fill", item_id: 3, n: 10 }, { t: "fill", item_id: 4, n: 10 }, { t: "buy", item_id: 3 }], s), /식혜 10개.*엿 10개.*도착/);
  assert.equal(arrivalLine([{ t: "buy", item_id: 3 }], s), null);
});

test("restLines: 시간 초과면 한 칸 탓 없이 한 줄", () => {
  const T = explain("timeout");
  const lines = restLines([{ t: "slot", slot: "restock", line: T }, { t: "slot", slot: "discount", line: T }], newStall(1), true);
  assert.deepEqual(lines, [TIMEOUT_LINE]);
  assert.match(TIMEOUT_LINE, /오늘은 장부 셈이 너무 오래 걸려 칸들이 쉬었어요/);
  const normal = restLines([{ t: "slot", slot: "restock", line: "빈자리를 채워 주세요" }], newStall(1), false);
  assert.equal(normal.length, 1);
  assert.match(normal[0], /재고 채우기/);
});

test("summaryRows: 손님·팔린 개수·허탕·매출·들여온 값·수레 삯·이익, 이익 줄은 profit", () => {
  const rows = summaryRows(sum());
  const map = new Map(rows);
  for (const k of ["손님", "팔린 개수", "허탕", "매출", "들여온 값", "수레 삯", "이익"]) assert.ok(map.has(k), k);
  assert.match(map.get("이익"), /36냥/);
  assert.match(map.get("허탕"), /2/);
  assert.match(summaryRows(sum({ profit: -7 })).find(([k]) => k === "이익")[1], /7냥/);
  assert.match(summaryRows(sum({ profit: -7 })).find(([k]) => k === "이익")[1], /^[-−]/);
});

test("lastLines: 켜진 칸만, 「재고 채우기: 식혜·엿 → 20개 들임(저녁 도착)」 꼴, 쉰 칸은 까닭", () => {
  const s = newStall(1);
  s.slots.discount = { on: false, mode: "frame", parts: {} };
  const last = {
    summary: sum(),
    slots: { pricing: { ids: [] }, restock: { ids: [3, 4], n: 20, fee: 4 }, best: { ids: [], n: 0, fee: 0 }, discount: { ids: [1] } },
    rested: {},
  };
  const lines = lastLines(last, s);
  assert.equal(lines.length, 1, lines.join(" | "));
  assert.match(lines[0], /재고 채우기: 식혜·엿 → 20개 들임\(저녁 도착\)/);
  const none = lastLines({ ...last, slots: { ...last.slots, restock: { ids: [], n: 0, fee: 0 } } }, s);
  assert.match(none[0], /재고 채우기:.*없/);
  const rested = lastLines({ ...last, rested: { restock: "빈자리를 채워 주세요" } }, s);
  assert.match(rested[0], /재고 채우기:.*쉼.*빈자리/);
  const timed = lastLines({ ...last, rested: { restock: explain("timeout") } }, s);
  assert.doesNotMatch(timed[0], /ON/);
  assert.match(timed[0], /오래 걸/);
  assert.deepEqual(lastLines(null, s), []);
});

test("requestProgress: 허탕 없는 날은 다 팔림·값 없음만 센다는 글, 진행 n/days", () => {
  const s = newStall(1);
  const r02 = REQUESTS.find((r) => r.id === "r02");
  s.order.progress.r02 = 1;
  assert.equal(requestProgress(r02, s), "다 팔림·값 없음 허탕 없는 날 1/2");
  const r03 = REQUESTS.find((r) => r.id === "r03");
  assert.match(requestProgress(r03, s), /수레 삯 6냥 이하/);
  assert.match(requestProgress(r03, s), /0\/2/);
  const r04 = REQUESTS.find((r) => r.id === "r04");
  assert.match(requestProgress(r04, s), /25냥/);
  const r01 = REQUESTS.find((r) => r.id === "r01");
  assert.match(requestProgress(r01, s), /재고 채우기/);
  const r06 = REQUESTS.find((r) => r.id === "r06");
  assert.match(requestProgress(r06, s), /간판/);
});
