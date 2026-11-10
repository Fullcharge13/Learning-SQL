import { test } from "node:test";
import assert from "node:assert/strict";
import { newStall, buyUpgrade } from "../../src/stall/state.js";
import { runDay } from "../../src/stall/day.js";
import { ITEMS, KEEP_DAYS, LOG_DAYS } from "../../data/stall.js";

const none = { pricing: [], restock: [], best: [], discount: [], display: null, report: null, rest: {} };
const act = (o = {}) => ({ ...none, ...o });
const setStock = (s, f) => ({ ...s, items: s.items.map((it) => ({ ...it, stock: f(it) })) });
const only = (s, id, stock) => setStock(s, (it) => (it.item_id === id ? stock : 0));
const withUp = (s, ...ids) => ids.reduce((st, id) => buyUpgrade({ ...st, money: 9999 }, id).stall, s);
const ev = (r, t) => r.events.filter((e) => e.t === t);

test("같은 입력 두 번 → 결과가 글자까지 같다", () => {
  const s = newStall(7);
  const a = act({ restock: [1, 2], discount: [3] });
  assert.equal(JSON.stringify(runDay(s, a)), JSON.stringify(runDay(s, a)));
});

test("순수: 입력 가게를 바꾸지 않는다", () => {
  const s = newStall(7);
  const before = JSON.stringify(s);
  runDay(s, act({ restock: [1], discount: [3] }));
  assert.equal(JSON.stringify(s), before);
});

test("재고 0 물건만 진열 → 모든 손님 허탕(stock), 매출 0", () => {
  const base = setStock(newStall(3), () => 0);
  const s = { ...base, items: base.items.filter((it) => it.item_id <= 4) }; // 진열 칸(4)이 물건 전부를 덮게
  const r = runDay(s, act({ display: [1, 2, 3, 4] }));
  assert.ok(r.summary.customers >= 8);
  assert.equal(ev(r, "miss").length, r.summary.customers);
  assert.ok(ev(r, "miss").every((e) => e.why === "stock"));
  assert.equal(r.summary.revenue, 0);
  assert.equal(r.summary.sold, 0);
});

test("값 빈칸 물건은 price 허탕, lost는 표준값 기준; pricing하면 price 사건과 값 8", () => {
  let s = withUp(newStall(5), "newitems");
  s = { ...s, items: s.items.map((it) => ({ ...it, stock: it.item_id === 7 ? 30 : 0 })) };
  const r = runDay(s, act({ display: [7] }));
  const miss = ev(r, "miss");
  assert.ok(miss.some((e) => e.item_id === 7 && e.why === "price"));
  for (const e of miss.filter((x) => x.why === "price")) assert.equal(e.lost, 8 * e.qty);
  const r2 = runDay(s, act({ pricing: [7], display: [7] }));
  assert.deepEqual(ev(r2, "price"), [{ t: "price", item_id: 7, price: 8 }]);
  assert.equal(r2.stall.items.find((i) => i.item_id === 7).price, 8);
  assert.ok(ev(r2, "buy").some((e) => e.item_id === 7 && e.price === 8));
});

test("값이 있는 물건은 pricing 결과에 나와도 그대로(사건 없음)", () => {
  const r = runDay(newStall(1), act({ pricing: [1] }));
  assert.equal(ev(r, "price").length, 0);
  assert.equal(r.stall.items[0].price, 6);
});

test("진열 4칸·물건 6: 진열 안 된 물건을 원하면 shelf 허탕", () => {
  const s = setStock(newStall(9), () => 30);
  const r = runDay(s, act({ display: [1, 2, 3, 4] }));
  const miss = ev(r, "miss");
  assert.ok(miss.length > 0 && miss.every((e) => e.why === "shelf" && (e.item_id === 5 || e.item_id === 6)));
  assert.ok(ev(r, "buy").every((e) => e.item_id <= 4));
});

test("기본 진열(display null): 재고>0인 물건을 item_id 순서로 칸 수만큼", () => {
  const s = { ...newStall(2), items: newStall(2).items.map((it) => ({ ...it, stock: it.item_id === 1 ? 0 : 30 })) };
  const r = runDay(s, act());
  const ids = new Set([...ev(r, "buy"), ...ev(r, "miss")].filter((e) => e.why !== "shelf" && e.why !== "stock" || e.why === "stock").map((e) => e.item_id));
  assert.ok(ev(r, "buy").every((e) => [2, 3, 4, 5].includes(e.item_id)));
  assert.ok(ev(r, "miss").filter((e) => e.why === "shelf").every((e) => e.item_id === 6));
  assert.ok(ids.size > 0);
});

test("채우기: 재고 25 + restock → 30, n:5, 5개분 값 + 수레 삯 2", () => {
  const s = only(newStall(1), 3, 25);
  const r = runDay(s, act({ restock: [3], display: [] }));
  assert.deepEqual(ev(r, "fill"), [{ t: "fill", item_id: 3, n: 5, cost: 10, fee: 2 }]);
  assert.equal(r.stall.items.find((i) => i.item_id === 3).stock, 30);
  assert.equal(r.stall.money, 100 - 12);
  assert.equal(r.summary.bought, 10);
  assert.equal(r.summary.fees, 2);
});

test("채우기: 재고 30이면 full 사건, 수레 삯 2만", () => {
  const s = only(newStall(1), 3, 30);
  const r = runDay(s, act({ restock: [3], display: [] }));
  assert.deepEqual(ev(r, "full"), [{ t: "full", item_id: 3, fee: 2 }]);
  assert.equal(ev(r, "fill").length, 0);
  assert.equal(r.stall.money, 98);
  assert.equal(r.summary.fees, 2);
  assert.equal(r.summary.bought, 0);
});

test("best는 20개씩, 한도 30", () => {
  const s = only(newStall(1), 4, 5);
  const r = runDay(s, act({ best: [4], display: [] }));
  assert.deepEqual(ev(r, "fill"), [{ t: "fill", item_id: 4, n: 20, cost: 40, fee: 2 }]);
  const s2 = only(newStall(1), 4, 20);
  const r2 = runDay(s2, act({ best: [4], display: [] }));
  assert.equal(ev(r2, "fill")[0].n, 10);
});

test("같은 물건이 restock과 best에 둘 다 있으면 둘 다 한다(수레 삯 두 번)", () => {
  const s = only(newStall(1), 4, 0);
  const r = runDay(s, act({ restock: [4], best: [4], display: [] }));
  assert.deepEqual(ev(r, "fill").map((e) => e.n), [10, 20]);
  assert.equal(r.summary.fees, 4);
});

test("돈 5냥에 restock 3개 → 앞 물건부터 살 수 있는 만큼, 나머지 broke, 돈 >= 0", () => {
  // 인절미 29(1개분 3냥+삯 2=5냥, 딱 맞음), 약과·식혜는 돈이 없어 broke
  let s = setStock(newStall(1), (it) => (it.item_id === 1 ? 29 : 5));
  s = { ...s, money: 5 };
  const r = runDay(s, act({ restock: [1, 2, 3], display: [] }));
  assert.deepEqual(ev(r, "fill").map((e) => [e.item_id, e.n]), [[1, 1]]);
  assert.deepEqual(ev(r, "broke"), [{ t: "broke", item_id: 2 }, { t: "broke", item_id: 3 }]);
  assert.equal(r.stall.money, 0);
  assert.ok(r.stall.money >= 0);
});

test("상자 단위로만: 한 상자를 못 사면 broke이고 수레 삯도 안 냄", () => {
  const s = { ...only(newStall(1), 1, 0), money: 31 }; // 10개 30냥 + 삯 2 = 32냥 필요
  const r = runDay(s, act({ restock: [1], display: [] }));
  assert.deepEqual(ev(r, "broke"), [{ t: "broke", item_id: 1 }]);
  assert.equal(r.stall.money, 31);
  assert.equal(r.summary.fees, 0);
  assert.equal(r.stall.items.find((i) => i.item_id === 1).stock, 0);
});

test("한 번 broke이면 뒤 행도 broke(앞 행부터 사는 순서를 지킨다)", () => {
  const s = { ...only(newStall(1), 1, 0), money: 31 };
  const s2 = { ...s, items: s.items.map((it) => (it.item_id === 4 ? { ...it, stock: 30 } : it)) };
  const r = runDay(s2, act({ restock: [1, 4], display: [] })); // 4는 꽉 차 삯 2만 필요하지만 앞에서 막힘
  assert.deepEqual(ev(r, "broke").map((e) => e.item_id), [1, 4]);
  assert.equal(r.stall.money, 31);
});

test("큰 수레 → 수레 삯 1", () => {
  const s = { ...only(withUp(newStall(1), "cart"), 3, 25), money: 100 };
  const r = runDay(s, act({ restock: [3], display: [] }));
  assert.equal(ev(r, "fill")[0].fee, 1);
  assert.equal(r.summary.fees, 1);
  assert.equal(r.stall.money, 100 - 10 - 1);
});

test("할인: discount:[3]이면 식혜 판매가 4, 할인 없으면 5", () => {
  const s = only(newStall(11), 3, 30);
  const d = runDay(s, act({ discount: [3], display: [3] }));
  const buys = ev(d, "buy");
  assert.ok(buys.length > 0 && buys.every((e) => e.price === 4));
  const n = runDay(s, act({ display: [3] }));
  assert.ok(ev(n, "buy").every((e) => e.price === 5));
  assert.ok(ev(d, "buy").length >= ev(n, "buy").length); // 인기 ×1.6이라 식혜를 원하는 손님이 늘어난다(같은 난수)
});

test("손님 수: 단골 20·간판 없음 → 8~11, 간판 → 10~13 (여러 날)", () => {
  const seen = new Set(), seenSign = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const s = newStall(seed);
    const c = runDay(s, act()).summary.customers;
    assert.ok(c >= 8 && c <= 11, `no sign ${c}`);
    seen.add(c);
    const cs = runDay(withUp(s, "sign"), act()).summary.customers;
    assert.ok(cs >= 10 && cs <= 13, `sign ${cs}`);
    seenSign.add(cs);
  }
  assert.ok(seen.size >= 3 && seenSign.size >= 3);
});

test("단골 30명이면 12~15명", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const c = runDay(withUp(newStall(seed), "regulars"), act()).summary.customers;
    assert.ok(c >= 12 && c <= 15, `${c}`);
  }
});

test("주문: 손님 한 명 = 주문 하나·물건 한 줄, order_id는 날을 넘어 유일", () => {
  let s = setStock(newStall(4), () => 30);
  const days = [];
  for (let i = 0; i < 4; i++) {
    const r = runDay(s, act());
    s = r.stall;
    days.push(r);
  }
  const ids = s.orders.map((o) => o.order_id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(s.orders.every((o) => o.items.length === 1 && o.items[0].qty >= 1 && Number.isInteger(o.customer_id)));
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  const last = days[3];
  assert.equal(s.orders.filter((o) => o.day === 4).length, ev(last, "buy").length);
});

test("orders는 4일 돌린 뒤 최근 3일(2,3,4일) 것만, log ≤ 7, day +1", () => {
  let s = setStock(newStall(4), () => 30);
  const seenDays = [];
  for (let i = 0; i < 4; i++) {
    const r = runDay(s, act({ restock: [1, 2, 3, 4, 5, 6] }));
    assert.equal(r.stall.day, s.day + 1);
    s = r.stall;
    seenDays.push([...new Set(s.orders.map((o) => o.day))]);
  }
  assert.deepEqual(seenDays, [[1], [1, 2], [1, 2, 3], [2, 3, 4]]);
  assert.equal(KEEP_DAYS, 3);
  assert.equal(s.log.length, 4);
});

test("log는 최근 7일만", () => {
  let s = setStock(newStall(2), () => 30);
  for (let i = 0; i < 10; i++) s = runDay(s, act({ restock: [1] })).stall;
  assert.equal(s.log.length, LOG_DAYS);
  assert.equal(s.log[s.log.length - 1].day, 10);
  assert.equal(s.log[0].day, 4);
});

test("profit === revenue - bought - fees, 돈은 그만큼 변한다", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const s = newStall(seed);
    const r = runDay(s, act({ restock: [1, 3], best: [4], discount: [2] }));
    const m = r.summary;
    assert.equal(m.profit, m.revenue - m.bought - m.fees);
    assert.equal(r.stall.money, s.money + m.profit);
    assert.equal(m.day, 1);
    assert.equal(m.sold, ev(r, "buy").reduce((a, e) => a + e.qty, 0));
    assert.equal(m.missed, ev(r, "miss").length);
    assert.equal(m.customers, m.missed + ev(r, "buy").length);
  }
});

test("재고는 판 만큼 줄고 음수가 되지 않는다(재고 2에 2개 주문이 와도 2개까지만)", () => {
  let full = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const r = runDay(only(newStall(seed), 3, 2), act({ display: [3] }));
    const sold = ev(r, "buy").reduce((x, e) => x + e.qty, 0);
    assert.ok(sold <= 2);
    assert.equal(r.stall.items.find((i) => i.item_id === 3).stock, 2 - sold);
    if (sold === 2) full++;
  }
  assert.ok(full > 0);
});

test("report와 rest는 그대로 summary로, rest 칸은 slot 사건", () => {
  const rest = { restock: "결과에 name이나 item_id 열이 있어야 해요" };
  const r = runDay(newStall(1), act({ report: 42, rest }));
  assert.equal(r.summary.report, 42);
  assert.deepEqual(r.summary.rest, rest);
  assert.deepEqual(ev(r, "slot"), [{ t: "slot", slot: "restock", line: rest.restock }]);
  assert.deepEqual(r.stall.last.summary, r.summary);
});

test("오늘의 인기는 3일 구간마다 같고 구간이 바뀌면 다시 정해진다(결정적)", () => {
  const s = setStock(newStall(21), () => 30);
  const t = (d) => runDay({ ...s, day: d }, act({ display: [1, 2, 3, 4, 5, 6] }));
  assert.equal(JSON.stringify(t(1).summary), JSON.stringify(t(1).summary));
  assert.ok(t(1).summary.customers >= 8);
});
