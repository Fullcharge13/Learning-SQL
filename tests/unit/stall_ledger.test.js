import { test } from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { newStall, cleanStall, buyUpgrade } from "../../src/stall/state.js";
import { ledgerSql, LEDGER_SCHEMA } from "../../src/stall/ledger.js";
import { runLedger } from "../../src/sqlcore.js";

const SQL = await initSqlJs();
const one = (q, s) => runLedger(SQL, ledgerSql(s), [q])[0];
const count = (t, s) => one(`SELECT COUNT(*) FROM ${t}`, s).rows[0][0];

test("새 가게의 장부: 물건 6, 단골 20, 주문 0", () => {
  const s = newStall(1);
  assert.equal(count("items", s), 6);
  assert.equal(count("customers", s), 20);
  assert.equal(count("orders", s), 0);
  assert.equal(count("order_items", s), 0);
});

test("새 물건을 산 뒤 값이 빈칸인 물건은 꿀떡·한지", () => {
  const r = buyUpgrade({ ...newStall(1), money: 999 }, "newitems");
  assert.ok(r.ok);
  const out = one("SELECT name FROM items WHERE price IS NULL ORDER BY item_id", r.stall);
  assert.deepEqual(out.rows, [["꿀떡"], ["한지"]]);
  assert.equal(count("items", r.stall), 8);
});

test("단골 늘리기 뒤에는 30명", () => {
  const r = buyUpgrade({ ...newStall(1), money: 999 }, "regulars");
  assert.equal(count("customers", r.stall), 30);
});

test("이름에 작은따옴표가 든 손님도 올라간다(글자 이스케이프)", () => {
  const s = newStall(1);
  const custs = [{ customer_id: 1, name: "O'Neil'; DROP TABLE items; --", kind: "사람", age: 3, village: "a'b" }];
  const sql = ledgerSql(s, custs);
  const r = runLedger(SQL, sql, ["SELECT name, village FROM customers", "SELECT COUNT(*) FROM items"]);
  assert.deepEqual(r[0].rows, [["O'Neil'; DROP TABLE items; --", "a'b"]]);
  assert.equal(r[1].rows[0][0], 6);
});

test("runLedger: 읽기는 되고 쓰기는 read-only, 문법 오류는 글자", () => {
  const s = newStall(1);
  const r = runLedger(SQL, ledgerSql(s), ["SELECT name FROM items WHERE stock < 5", "DELETE FROM items", "SELEC"]);
  assert.equal(r.length, 3);
  assert.equal(r[0].error, null);
  assert.deepEqual(r[0].rows.map((x) => x[0]).sort(), ["약과", "짚신"].sort());
  assert.equal(r[1].error, "read-only");
  assert.equal(typeof r[2].error, "string");
  assert.ok(r[2].error.length > 0); // "SELEC"은 SELECT로 시작하지 않아 기존 checkReadOnly가 read-only로 막는다
  const syn = runLedger(SQL, ledgerSql(s), ["SELECT FROM items"])[0];
  assert.ok(syn.error && syn.error !== "read-only", "진짜 문법 오류는 sql.js 오류 글자");
});

test("runLedger: 질의마다 같은 장부(앞 질의가 뒤에 영향 없음), 쓰기 시도 뒤에도 물건 그대로", () => {
  const s = newStall(1);
  const r = runLedger(SQL, ledgerSql(s), ["DELETE FROM items", "SELECT COUNT(*) FROM items"]);
  assert.equal(r[1].rows[0][0], 6);
});

test("주문이 장부에 오른다: orders·order_items", () => {
  const s = newStall(1);
  s.day = 4;
  s.orders = [
    { order_id: 1, customer_id: 2, day: 3, items: [{ item_id: 1, qty: 2 }, { item_id: 3, qty: 1 }] },
    { order_id: 2, customer_id: 5, day: 4, items: [{ item_id: 1, qty: 4 }] },
  ];
  assert.equal(count("orders", s), 2);
  assert.equal(count("order_items", s), 3);
  const g = one("SELECT item_id, SUM(qty) FROM order_items GROUP BY item_id ORDER BY item_id", s);
  assert.deepEqual(g.rows, [[1, 6], [3, 1]]);
  assert.deepEqual(one("SELECT order_id, customer_id, day FROM orders ORDER BY order_id", s).rows, [[1, 2, 3], [2, 5, 4]]);
});

test("5일 전 주문은 cleanStall 뒤 장부에 없다", () => {
  const raw = newStall(1);
  raw.day = 10;
  raw.orders = [
    { order_id: 1, customer_id: 1, day: 5, items: [{ item_id: 1, qty: 1 }] },
    { order_id: 2, customer_id: 1, day: 9, items: [{ item_id: 2, qty: 1 }] },
  ];
  const s = cleanStall(raw);
  assert.equal(count("orders", s), 1);
  assert.deepEqual(one("SELECT order_id FROM orders", s).rows, [[2]]);
  assert.deepEqual(one("SELECT item_id FROM order_items", s).rows, [[2]]);
});

test("망가진 주문 항목은 건너뛴다", () => {
  const s = newStall(1);
  s.orders = [{ order_id: 1, customer_id: 1, day: 1, items: [{ item_id: "x", qty: 1 }, null, { item_id: 2, qty: 3 }] }, { day: 1 }, null];
  assert.equal(count("orders", s), 1);
  assert.deepEqual(one("SELECT item_id, qty FROM order_items", s).rows, [[2, 3]]);
});

test("LEDGER_SCHEMA: 4표, 한글 이름·뜻, 열이 실제 표와 같음", () => {
  assert.deepEqual(Object.keys(LEDGER_SCHEMA), ["items", "customers", "orders", "order_items"]);
  assert.equal(LEDGER_SCHEMA.items.ko, "내 물건");
  assert.equal(LEDGER_SCHEMA.orders.cols.day, "며칠째");
  const s = newStall(1);
  for (const [t, def] of Object.entries(LEDGER_SCHEMA)) {
    const cols = one(`SELECT * FROM ${t}`, s).columns;
    assert.deepEqual(Object.keys(def.cols), cols, t);
    for (const v of Object.values(def.cols)) assert.ok(typeof v === "string" && v.length > 0);
  }
});

test("같은 order_id가 두 번 있는 깨진 저장도 장부가 UNIQUE 오류 없이 올라간다(첫 주문만)", () => {
  const s = { ...newStall(1), day: 3, orders: [
    { order_id: 5, customer_id: 1, day: 2, items: [{ item_id: 1, qty: 1 }] },
    { order_id: 5, customer_id: 2, day: 2, items: [{ item_id: 2, qty: 3 }] },
  ] };
  assert.equal(count("orders", s), 1);
  assert.deepEqual(one("SELECT customer_id FROM orders", s).rows, [[1]]);
  assert.deepEqual(one("SELECT item_id, qty FROM order_items", s).rows, [[1, 1]]);
});

test("장부는 최근 3일(day >= 오늘 - 3) 주문만 올린다: 호출하는 쪽이 정리하지 않아도", () => {
  const mk = (id, day) => ({ order_id: id, customer_id: 1, day, items: [{ item_id: 1, qty: 1 }] });
  const s = { ...newStall(1), day: 5, orders: [mk(1, 1), mk(2, 2), mk(3, 3), mk(4, 4)] };
  assert.deepEqual(one("SELECT day FROM orders ORDER BY day", s).rows, [[2], [3], [4]]);
  assert.equal(count("order_items", s), 3);
});
