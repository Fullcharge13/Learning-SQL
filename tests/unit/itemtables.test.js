// v0.2.1: 「쓸 표 보기」가 장부를 읽는 모든 문제에 — 문제에 tables가 없어도 SQL·문제 글에서 표를 찾는다.
// 시트는 작은 표(60행 이하)를 통째로, 큰 표는 앞 20행 + 「전체 N행」.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tablesForItem } from "../../src/itemtables.js";
import { tablesHTML } from "../../src/ui/tables.js";
import { resultHTML, SHEET_FULL, SHEET_HEAD } from "../../src/ui/sqlview.js";
import * as ch1 from "../../data/lessons/ch1.js";

const T = ["shops", "items", "customers", "orders", "order_items"];

test("explicit tables win", () => {
  assert.deepEqual(tablesForItem({ tables: ["shops"], code: "SELECT * FROM items" }), ["shops"]);
});

test("1-2 국밥 question gets items", () => {
  const it = ch1.LESSONS.find((l) => l.id === "1-2").items.find((x) => (x.q || "").includes("국밥"));
  assert.ok(it, "국밥 question missing");
  assert.deepEqual(tablesForItem(it), ["items"]);
});

test("derives from code, option sql, order lines and question text", () => {
  assert.deepEqual(tablesForItem({ code: "SELECT name FROM shops WHERE shop_id = 1" }), ["shops"]);
  assert.deepEqual(tablesForItem({ options: [{ sql: "SELECT * FROM orders" }, { sql: "SELECT * FROM customers" }] }), ["customers", "orders"]);
  assert.deepEqual(tablesForItem({ lines: ["SELECT *", "FROM order_items"] }), ["order_items"]);
  assert.deepEqual(tablesForItem({ q: "가게(shops) 표에는 열이 몇 개 있을까요?" }), ["shops"]);
  assert.deepEqual(tablesForItem({ q: "물건 표에서 가장 비싼 것은?" }), ["items"]);
  assert.deepEqual(tablesForItem({ q: "주문 내역 표의 행 하나는?" }), ["order_items"]);
});

test("no false hits: order_items is not items/orders, chips are ignored", () => {
  assert.deepEqual(tablesForItem({ code: "SELECT * FROM order_items" }), ["order_items"]);
  assert.deepEqual(tablesForItem({ code: "SELECT * FROM ___", chips: ["items", "shops"] }), []);
  assert.deepEqual(tablesForItem({ q: "행과 열을 바르게 설명한 것은?" }), []);
});

test("every main and advanced question whose SQL reads a ledger gets the sheet", async () => {
  let n = 0;
  const miss = [];
  for (let c = 1; c <= 17; c++) {
    const m = await import(`../../data/lessons/ch${c}.js`);
    for (const L of [...m.LESSONS, ...(m.ADVANCED || [])]) {
      for (const it of L.items || []) {
        const sql = [it.code, ...(it.lines || []), ...(Array.isArray(it.options) ? it.options.map((o) => o && o.sql) : [])].join(" ");
        if (!T.some((t) => new RegExp(`\\b${t}\\b`).test(sql))) continue;
        n++;
        if (!tablesForItem(it).length) miss.push(`${L.id}: ${it.q}`);
      }
    }
  }
  assert.ok(n > 500, `only ${n} ledger questions found`);
  assert.deepEqual(miss, []);
});

test("sheet reads the whole table, not LIMIT 5", () => {
  const h = tablesHTML(["items"]);
  assert.match(h, /data-sql="SELECT \* FROM items"/);
  assert.doesNotMatch(h, /LIMIT/);
});

const fake = (n) => ({ columns: ["a"], rows: Array.from({ length: n }, (_, i) => [i]) });
const trs = (h) => (h.match(/<tr>/g) || []).length - 1; // 머리 줄 빼기

test("sheet shows small tables whole (40 items, 60 customers)", () => {
  assert.equal(SHEET_FULL, 60);
  assert.equal(trs(resultHTML(fake(40), "sheet")), 40);
  assert.equal(trs(resultHTML(fake(60), "sheet")), 60);
  assert.match(resultHTML(fake(40), "sheet"), /40행/);
});

test("sheet shows big tables as first 20 rows + 전체 N행", () => {
  assert.equal(SHEET_HEAD, 20);
  const h = resultHTML(fake(591), "sheet");
  assert.equal(trs(h), 20);
  assert.match(h, /처음 20행만 보여요 · 전체 591행/);
});

test("card results keep the old 50-row cap", () => {
  assert.equal(trs(resultHTML(fake(591), "card")), 50);
});
