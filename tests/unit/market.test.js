// 작업 2: 도깨비 장터 데이터 (설계 §5)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { generateMarket } from "../../tools/gen_market.js";
import { SCHEMA } from "../../data/schema.js";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");
const FILE = new URL("../../data/market.sql", import.meta.url);

let db;
before(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.exec(readFileSync(FILE, "utf8"));
});

function rows(sql) {
  const r = db.exec(sql);
  return r.length ? r[0].values : [];
}
const one = (sql) => rows(sql)[0][0];

// 매출 = 완료 주문의 SUM(qty * price) (취소 제외)
const REV = `SELECT o.ordered_on, s.category, oi.qty * i.price AS amt, o.order_id
  FROM orders o JOIN order_items oi ON oi.order_id = o.order_id
  JOIN items i ON i.item_id = oi.item_id JOIN shops s ON s.shop_id = i.shop_id
  WHERE o.status = '완료'`;

test("same seed same sql", () => {
  assert.equal(generateMarket(2026), generateMarket(2026));
  assert.equal(generateMarket(2026), readFileSync(FILE, "utf8"));
  assert.notEqual(generateMarket(1), generateMarket(2026));
});

test("row counts", () => {
  assert.equal(one("SELECT COUNT(*) FROM shops"), 8);
  assert.equal(one("SELECT COUNT(*) FROM items"), 40);
  assert.equal(one("SELECT COUNT(*) FROM customers"), 60);
  const o = one("SELECT COUNT(*) FROM orders");
  assert.ok(o >= 550 && o <= 650, `orders ${o}`);
  const oi = one("SELECT COUNT(*) FROM order_items");
  assert.ok(oi >= 1100 && oi <= 1300, `order_items ${oi}`);
});

test("schema matches tables", () => {
  const tables = rows("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map((r) => r[0]);
  assert.deepEqual(tables, Object.keys(SCHEMA).sort());
  for (const t of tables) {
    const cols = rows(`PRAGMA table_info(${t})`).map((r) => r[1]);
    assert.deepEqual(cols, Object.keys(SCHEMA[t].cols), t);
    assert.ok(SCHEMA[t].ko);
    for (const c of cols) assert.ok(SCHEMA[t].cols[c], `${t}.${c}`);
  }
});

test("values: categories, status, kinds, 방망이", () => {
  assert.deepEqual(rows("SELECT DISTINCT category FROM shops ORDER BY 1").map((r) => r[0]).sort(),
    ["먹거리", "약재", "잡화", "공방"].sort());
  assert.deepEqual(rows("SELECT DISTINCT status FROM orders").map((r) => r[0]).sort(), ["완료", "취소"]);
  for (const [k] of rows("SELECT DISTINCT kind FROM customers")) assert.ok(["도깨비", "사람", "여우"].includes(k), k);
  assert.ok(one("SELECT COUNT(*) FROM items i JOIN shops s ON s.shop_id=i.shop_id WHERE s.category='공방' AND i.name LIKE '%방망이%'") >= 1);
  assert.equal(one("SELECT COUNT(*) FROM items i JOIN shops s ON s.shop_id=i.shop_id WHERE i.name LIKE '%방망이%' AND s.category<>'공방'"), 0);
});

test("nulls planted", () => {
  const a = one("SELECT COUNT(*) FROM customers WHERE age IS NULL");
  assert.ok(a >= 3 && a <= 7, `null ages ${a}`);
  assert.ok(one("SELECT COUNT(*) FROM items WHERE stock IS NULL") >= 2);
  assert.ok(one("SELECT COUNT(*) FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)") >= 2);
  assert.ok(one("SELECT COUNT(*) FROM items WHERE item_id NOT IN (SELECT item_id FROM order_items)") >= 2);
});

test("dates in 2026", () => {
  const re = /^2026-\d\d-\d\d$/;
  const all = [
    ...rows("SELECT opened_on FROM shops"), ...rows("SELECT first_visit FROM customers"),
    ...rows("SELECT ordered_on FROM orders"),
  ].map((r) => r[0]);
  for (const d of all) {
    assert.match(d, re);
    assert.ok(d >= "2026-01-01" && d <= "2026-12-31", d);
    assert.equal(rows(`SELECT date('${d}')`)[0][0], d, `valid date ${d}`);
  }
});

test("first_visit equals first order date", () => {
  const bad = rows(`SELECT c.customer_id FROM customers c JOIN orders o ON o.customer_id=c.customer_id
    GROUP BY c.customer_id HAVING MIN(o.ordered_on) <> c.first_visit`);
  assert.equal(bad.length, 0);
});

test("referential integrity", () => {
  assert.equal(one("SELECT COUNT(*) FROM items WHERE shop_id NOT IN (SELECT shop_id FROM shops)"), 0);
  assert.equal(one("SELECT COUNT(*) FROM orders WHERE customer_id NOT IN (SELECT customer_id FROM customers)"), 0);
  assert.equal(one("SELECT COUNT(*) FROM order_items WHERE order_id NOT IN (SELECT order_id FROM orders)"), 0);
  assert.equal(one("SELECT COUNT(*) FROM order_items WHERE item_id NOT IN (SELECT item_id FROM items)"), 0);
  assert.equal(one("SELECT COUNT(*) FROM (SELECT order_id, item_id FROM order_items GROUP BY 1,2 HAVING COUNT(*)>1)"), 0);
});

test("pattern herbs summer", () => {
  const m = {};
  for (const [d, cat, amt] of rows(REV)) {
    if (cat !== "약재") continue;
    const mon = +d.slice(5, 7);
    m[mon] = (m[mon] || 0) + amt;
  }
  let s = 0, o = 0;
  for (let k = 1; k <= 12; k++) (k >= 6 && k <= 8 ? (s += m[k] || 0) : (o += m[k] || 0));
  const summer = s / 3, other = o / 9;
  console.log(`  herbs summer avg ${summer.toFixed(0)} vs other ${other.toFixed(0)} ratio ${(summer / other).toFixed(2)}`);
  assert.ok(summer > other * 1.3, `ratio ${summer / other}`);
});

test("pattern march cohort", () => {
  const cust = rows("SELECT customer_id, first_visit FROM customers");
  const later = new Set(rows(`SELECT DISTINCT c.customer_id FROM customers c JOIN orders o ON o.customer_id=c.customer_id
    WHERE o.status='완료' AND substr(o.ordered_on,1,7) > substr(c.first_visit,1,7)`).map((r) => r[0]));
  const coh = {};
  for (const [id, fv] of cust) {
    const m = +fv.slice(5, 7);
    (coh[m] ||= { n: 0, r: 0 });
    coh[m].n++;
    if (later.has(id)) coh[m].r++;
  }
  const rate = (m) => coh[m].r / coh[m].n;
  assert.ok(coh[3] && coh[3].n >= 3, "march cohort size");
  let best = 0;
  for (const m of Object.keys(coh)) if (+m !== 3 && coh[m].n >= 3) best = Math.max(best, rate(m));
  console.log(`  march cohort ${coh[3].r}/${coh[3].n}=${rate(3).toFixed(2)} vs other max ${best.toFixed(2)}`);
  assert.ok(rate(3) > best + 0.1, `march ${rate(3)} other ${best}`);
});

test("pattern workshop", () => {
  const by = {};
  const seen = {};
  for (const [, cat, amt, oid] of rows(REV)) {
    by[cat] ||= { sum: 0, orders: new Set() };
    by[cat].sum += amt; by[cat].orders.add(oid);
  }
  const stat = Object.entries(by).map(([c, v]) => ({ c, n: v.orders.size, avg: v.sum / v.orders.size }));
  console.log("  " + stat.map((s) => `${s.c}: ${s.n}건 평균 ${s.avg.toFixed(0)}`).join(" | "));
  const w = stat.find((s) => s.c === "공방");
  for (const s of stat) if (s.c !== "공방") {
    assert.ok(w.avg > s.avg * 1.2, `avg ${s.c}`);
    assert.ok(w.n < s.n * 0.8, `count ${s.c}`);
  }
});

test("pattern december", () => {
  const m = rows("SELECT substr(ordered_on,6,2), COUNT(*) FROM orders GROUP BY 1 ORDER BY 1").map((r) => r[1]);
  assert.equal(m.length, 12);
  const dec = m[11];
  const second = Math.max(...m.slice(0, 11));
  console.log(`  orders per month ${m.join(",")}`);
  assert.ok(dec > second * 1.15, `dec ${dec} second ${second}`);
});
