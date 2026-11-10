import { test } from "node:test";
import assert from "node:assert/strict";
import { newStall, cleanStall, buyUpgrade, passedChapters, stallOpen } from "../../src/stall/state.js";
import { migrate, newSave } from "../../src/save.js";
import { ITEMS, CUSTOMERS, UPGRADES, CARDS, SLOTS, REQUESTS, MONEY_MAX, STOCK_MAX, SHELF, SHELF_BIG } from "../../data/stall.js";

test("newStall: 시작 상태", () => {
  const s = newStall(42);
  assert.equal(s.v, 1);
  assert.equal(s.seed, 42);
  assert.equal(s.money, 100);
  assert.equal(s.day, 1);
  assert.equal(s.shelf, SHELF);
  assert.equal(s.regulars, 20);
  assert.equal(s.items.length, 6);
  assert.deepEqual(s.items.map((i) => i.item_id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(s.items.map((i) => i.stock), [6, 4, 8, 10, 3, 5]);
  assert.equal(s.slots.restock.on, true);
  assert.equal(s.slots.restock.mode, "frame");
  assert.deepEqual(s.slots.restock.parts.where, [{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 1 }]);
  assert.deepEqual(s.upgrades, []);
  assert.equal(s.opened, false);
  assert.equal(s.last, null);
});

test("데이터 표 모양", () => {
  assert.equal(ITEMS.length, 8);
  assert.equal(ITEMS[6].price, null); assert.equal(ITEMS[6].std, 8);
  assert.equal(ITEMS[7].price, null); assert.equal(ITEMS[7].std, 11);
  assert.equal(CUSTOMERS.length, 30);
  assert.equal(new Set(CUSTOMERS.map((c) => c.name)).size, 30);
  assert.deepEqual(UPGRADES.map((u) => u.id), ["sign", "newitems", "cart", "shelf", "regulars"]);
  assert.equal(REQUESTS.length, 15); // 작업 5에서 채움(자세한 모양은 stall_requests.test.js)
});

test("카드 id는 겹치지 않고 칸 id는 6개", () => {
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
  assert.deepEqual(SLOTS.map((s) => s.id), ["pricing", "restock", "best", "discount", "display", "report"]);
});

test("cleanStall: 깨진 값을 고친다", () => {
  const s = cleanStall({
    money: -5, items: [{ item_id: 1, price: 6, stock: 99 }, { item_id: 77 }],
    slots: { zzz: {} }, upgrades: ["cart", "zzz"],
  });
  assert.equal(s.money, 0);
  assert.equal(s.items.find((i) => i.item_id === 1).stock, STOCK_MAX);
  assert.ok(!s.items.some((i) => i.item_id === 77));
  assert.equal(s.items.length, 6);
  assert.ok(!("zzz" in s.slots));
  assert.deepEqual(s.upgrades, ["cart"]);
});

test("cleanStall: 돈 상한, 정수 아님은 기본, 카드 id 정리", () => {
  assert.equal(cleanStall({ money: 5e9 }).money, MONEY_MAX);
  assert.equal(cleanStall({ money: "abc" }).money, 100);
  assert.equal(cleanStall({ money: 1.5 }).money, 100);
  const s = cleanStall({ slots: { restock: { on: true, mode: "frame", parts: { where: [{ c: "col_stock" }, { c: "nope" }, { c: "num", n: 99 }, { c: "num", n: "x" }] } }, best: { on: "yes", parts: { bad: [] } } } });
  assert.deepEqual(s.slots.restock.parts.where, [{ c: "col_stock" }, { c: "num", n: 30 }, { c: "num", n: 0 }]);
  assert.equal(s.slots.best.on, false);
  assert.deepEqual(Object.keys(s.slots.best.parts), []);
});

test("cleanStall: 새 물건은 성장을 샀을 때만 남고, 쓸 값은 성장에서 나옴", () => {
  const a = cleanStall({ items: [{ item_id: 7, price: null, stock: 10 }], shelf: 99, regulars: 1 });
  assert.ok(!a.items.some((i) => i.item_id === 7));
  assert.equal(a.shelf, SHELF); assert.equal(a.regulars, 20);
  const b = cleanStall({ items: [{ item_id: 7, price: null, stock: 10 }], upgrades: ["newitems", "shelf", "regulars", "shelf"] });
  const i7 = b.items.find((i) => i.item_id === 7);
  assert.equal(i7.price, null);
  assert.equal(b.shelf, SHELF_BIG); assert.equal(b.regulars, 30);
  assert.deepEqual(b.upgrades, ["newitems", "shelf", "regulars"]);
});

test("cleanStall: orders는 최근 KEEP_DAYS일만", () => {
  const orders = [1, 2, 3, 4, 5, 6].map((d) => ({ order_id: d, customer_id: 1, day: d }));
  const s = cleanStall({ day: 7, orders: [...orders, "x", null, { day: "a" }] });
  assert.deepEqual(s.orders.map((o) => o.day), [4, 5, 6]);
});

test("cleanStall(null / 문자열) = newStall 모양", () => {
  for (const raw of [null, "x", 5, [], undefined]) {
    const s = cleanStall(raw);
    assert.deepEqual(Object.keys(s), Object.keys(newStall(1)));
    assert.equal(typeof s.seed, "number");
    assert.equal(s.money, 100);
    assert.equal(s.items.length, 6);
  }
});

test("cleanStall는 멱등이고 원본을 바꾸지 않는다", () => {
  const raw = { money: 50, day: 3, items: [{ item_id: 2, price: 9, stock: 1 }] };
  const copy = JSON.parse(JSON.stringify(raw));
  const once = cleanStall(raw);
  assert.deepEqual(raw, copy);
  assert.deepEqual(cleanStall(once), once);
});

test("buyUpgrade", () => {
  const poor = newStall(1);
  const r0 = buyUpgrade(poor, "sign");
  assert.equal(r0.ok, false); assert.equal(r0.reason, "money");
  assert.equal(r0.stall.money, 100);

  const rich = { ...newStall(1), money: 300 };
  const r1 = buyUpgrade(rich, "sign");
  assert.equal(r1.ok, true);
  assert.equal(r1.stall.money, 150);
  assert.ok(r1.stall.upgrades.includes("sign"));
  assert.equal(rich.money, 300); assert.deepEqual(rich.upgrades, []); // 순수
  const r2 = buyUpgrade(r1.stall, "sign");
  assert.equal(r2.ok, false); assert.equal(r2.reason, "owned");
  assert.equal(buyUpgrade(rich, "zzz").reason, "unknown");
});

test("buyUpgrade: 새 물건·진열대·단골", () => {
  const rich = { ...newStall(1), money: 5000 };
  const n = buyUpgrade(rich, "newitems").stall;
  assert.equal(n.items.length, 8);
  for (const id of [7, 8]) {
    const it = n.items.find((i) => i.item_id === id);
    assert.equal(it.price, null); assert.equal(it.stock, 10);
  }
  assert.equal(rich.items.length, 6);
  assert.equal(buyUpgrade(rich, "shelf").stall.shelf, SHELF_BIG);
  assert.equal(buyUpgrade(rich, "regulars").stall.regulars, 30);
  const c = buyUpgrade(rich, "cart").stall;
  assert.deepEqual(c.upgrades, ["cart"]); assert.equal(c.shelf, SHELF);
});

test("passedChapters / stallOpen", () => {
  const chapters = [
    { id: 2, lessons: [{ id: "2-1" }, { id: "2-5", isExam: true }] },
    { id: 3, lessons: [{ id: "3-1" }, { id: "3-5", isExam: true }] },
    { id: 4, lessons: [{ id: "4-1" }, { id: "4-2" }] },
  ];
  const p = passedChapters(chapters, ["2-1", "3-1", "3-5"]);
  assert.ok(p.has(3)); assert.ok(!p.has(2)); assert.ok(!p.has(4));
  assert.equal(stallOpen(p), true);
  const q = passedChapters(chapters, ["3-1", "4-2"]);
  assert.equal(stallOpen(q), false);
  assert.ok(q.has(4)); // isExam 없으면 마지막 본 과정 레슨
  assert.equal(stallOpen(passedChapters([], [])), false);
});

test("저장 이어받기: 옛 저장과 깨진 가게", () => {
  assert.equal(newSave().stall, null);
  assert.equal(migrate({ saveVer: 1, xp: 3 }).stall, null);
  assert.equal(migrate({ saveVer: 1, stall: "x" }).stall, null);
  const s = migrate({ saveVer: 1, stall: { money: "abc" } });
  assert.equal(s.stall.money, 100);
  assert.equal(s.stall.items.length, 6);
  const t = migrate({ saveVer: 1, stall: { money: 7, day: 4, slots: { zzz: {} } } });
  assert.equal(t.stall.money, 7); assert.equal(t.stall.day, 4);
  assert.ok(!("zzz" in t.stall.slots));
});

// 작업 1 검토 지적: 큰 수 씨앗·날짜는 기본으로, 칸·카드 장 번호는 설계 §3 표와 같다
test("cleanStall: 안전하지 않은 큰 수 씨앗·날짜는 기본값", () => {
  const s = cleanStall({ seed: 1e308, day: 2 ** 60 });
  assert.equal(s.seed, 1);
  assert.equal(s.day, 1);
});

test("SLOTS·CARDS 장 번호와 틀은 설계 §3-1·§3-2와 같다", () => {
  const want = { pricing: [6, "where"], restock: [3, "where"], best: [8, "full"], discount: [4, "where"], display: [5, "order"], report: [7, "full"] };
  assert.deepEqual(SLOTS.map((s) => s.id), ["pricing", "restock", "best", "discount", "display", "report"]);
  for (const s of SLOTS) assert.deepEqual([s.chapter, s.frame], want[s.id], s.id);
  const byText = Object.fromEntries(CARDS.map((c) => [c.text, c.chapter]));
  for (const [t, ch] of [["stock", 3], ["<", 3], ["'먹거리'", 3], ["AND", 4], ["BETWEEN", 4], ["DESC", 5], ["IS NULL", 6], ["COALESCE(", 6], ["COUNT(*)", 7], ["SELECT", 7], ["order_items", 7], ["GROUP BY", 8], ["HAVING", 8]])
    assert.equal(byText[t], ch, t);
  assert.ok(CARDS.every((c) => c.chapter >= 3 && c.chapter <= 8));
});
