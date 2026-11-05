import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { openMarket, execOne, ROW_CAP } from "../../src/sqlcore.js";

let db;
before(async () => {
  const SQL = await initSqlJs();
  db = openMarket(SQL, readFileSync(new URL("../../data/market.sql", import.meta.url), "utf8"));
});

test("select works", () => {
  const r = execOne(db, "SELECT name FROM shops ORDER BY shop_id LIMIT 1");
  assert.equal(r.error, null);
  assert.deepEqual(r.columns, ["name"]);
  assert.equal(r.rows.length, 1);
  assert.equal(r.truncated, false);
});

test("korean values", () => {
  const r = execOne(db, "SELECT name FROM customers ORDER BY customer_id LIMIT 3");
  for (const [n] of r.rows) assert.match(n, /[가-힣]/);
});

test("window function", () => {
  const r = execOne(db, "SELECT order_id, SUM(qty) OVER (PARTITION BY order_id) AS t FROM order_items LIMIT 5");
  assert.equal(r.error, null);
  assert.deepEqual(r.columns, ["order_id", "t"]);
});

test("read-only guard", () => {
  assert.equal(execOne(db, "DELETE FROM shops").error, "read-only");
  assert.equal(execOne(db, "SELECT 1; SELECT 2").error, "read-only");
  assert.equal(execOne(db, "SELECT 1; DELETE FROM shops").error, "read-only");
  assert.equal(execOne(db, "  with x as (select 1) select * from x").error, null);
  assert.equal(execOne(db, "/* c */ -- d\n SELECT 1;  -- end\n").error, null);
  assert.equal(execOne(db, "SELECT ';' AS s; ").rows[0][0], ";");
  assert.equal(execOne(db, "").error, "read-only");
  assert.equal(execOne(db, "PRAGMA table_info(shops)").error, "read-only");
});

test("CTE-wrapped writes are read-only", () => {
  assert.equal(execOne(db, "WITH x AS (SELECT 1) DELETE FROM shops").error, "read-only");
  assert.equal(execOne(db, "WITH x AS (SELECT 1) INSERT INTO shops VALUES (99,'a','b','c','d')").error, "read-only");
  assert.equal(execOne(db, "SELECT COUNT(*) FROM shops").rows[0][0] > 0, true);
  assert.equal(execOne(db, "WITH x AS (SELECT 1) REPLACE INTO shops VALUES (1)").error, "read-only");
  assert.equal(execOne(db, "WITH x AS (SELECT 1) REPLACE\n  OR ROLLBACK INTO shops VALUES (1)").error, "read-only");
  assert.equal(execOne(db, "SELECT replace(name,'a','b') FROM shops").error, null);
  assert.equal(execOne(db, "SELECT REPLACE (name, 'a', 'b'), 'replace into x' FROM shops").error, null);
  // words inside strings are fine
  assert.equal(execOne(db, "SELECT 'delete me' AS s").error, null);
});

test("sqlite error text", () => {
  const r = execOne(db, "SELECT nope FROM shops");
  assert.match(r.error, /no such column/);
});

test("empty result keeps column names; NULL stays null", () => {
  const e = execOne(db, "SELECT shop_id, name FROM shops WHERE 1 = 0");
  assert.deepEqual(e.columns, ["shop_id", "name"]);
  assert.deepEqual(e.rows, []);
  assert.equal(e.error, null);
  const n = execOne(db, "SELECT NULL AS a, 1 AS b, 'x' AS c");
  assert.deepEqual(n.rows, [[null, 1, "x"]]);
});

test("crossJoinFinishes", () => {
  const t0 = performance.now();
  const r = execOne(db, "SELECT * FROM orders, order_items");
  const ms = performance.now() - t0;
  assert.equal(r.truncated, true);
  assert.equal(r.rows.length, ROW_CAP);
  assert.equal(ROW_CAP, 5000);
  assert.ok(ms < 3000, "took " + ms);
});
