import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, hasOrderBy, sameTable, judgeBuild, explain, cardsToSql } from "../../src/grade.js";
import { ERRORS, FALLBACK } from "../../data/errors.js";

const T = (columns, rows, extra = {}) => ({ columns, rows, error: null, truncated: false, ...extra });

test("normalize", () => {
  assert.equal(normalize("a  \r\nb\n\n"), "a\nb");
  assert.equal(normalize(null), "");
});

test("cardsToSql joins with one space", () => {
  assert.equal(cardsToSql(["SELECT", "name", "FROM", "items"]), "SELECT name FROM items");
});

test("column names case-insensitive", () => {
  assert.equal(sameTable(T(["Name"], [["a"]]), T(["name"], [["a"]]), { ordered: false }).ok, true);
  assert.equal(sameTable(T(["a"], []), T(["a", "b"], []), {}).why, "columns");
});

test("float rounding", () => {
  assert.equal(sameTable(T(["x"], [[0.33333]]), T(["x"], [[0.33334]]), {}).ok, true);
  const r = sameTable(T(["x"], [[0.3333]]), T(["x"], [[0.3343]]), {});
  assert.equal(r.ok, false);
  assert.equal(r.why, "values");
  assert.equal(sameTable(T(["x"], [[3]]), T(["x"], [[3.0]]), {}).ok, true);
});

test("null equals only null", () => {
  assert.equal(sameTable(T(["x"], [[null]]), T(["x"], [[null]]), {}).ok, true);
  assert.equal(sameTable(T(["x"], [[null]]), T(["x"], [[0]]), {}).ok, false);
  assert.equal(sameTable(T(["x"], [[null]]), T(["x"], [[""]]), {}).ok, false);
  assert.equal(sameTable(T(["x"], [["0"]]), T(["x"], [[0]]), {}).ok, false);
});

test("unordered compare with NULLs and duplicates", () => {
  const exp = T(["a", "b"], [[1, null], [1, null], ["a", 2]]);
  assert.deepEqual(sameTable(exp, T(["a", "b"], [["a", 2], [1, null], [1, null]]), { ordered: false }), { ok: true, why: null });
  assert.equal(sameTable(exp, T(["a", "b"], [[1, null], ["a", 2]]), { ordered: false }).why, "rowcount");
  assert.equal(sameTable(exp, T(["a", "b"], [[1, null], ["a", 2], ["a", 2]]), { ordered: false }).why, "values");
});

test("empty tables with same columns are equal", () => {
  assert.equal(sameTable(T(["a"], []), T(["a"], []), { ordered: true }).ok, true);
});

test("ordered only with ORDER BY", () => {
  const exp = T(["a"], [[1], [2]]), got = T(["a"], [[2], [1]]);
  assert.equal(sameTable(exp, got, { ordered: true }).why, "values");
  assert.equal(sameTable(exp, got, { ordered: false }).ok, true);
});

test("hasOrderBy ignores window", () => {
  assert.equal(hasOrderBy("SELECT RANK() OVER (ORDER BY price) FROM items"), false);
  assert.equal(hasOrderBy("SELECT RANK() OVER (ORDER BY price) FROM items ORDER BY name"), true);
  assert.equal(hasOrderBy("SELECT name FROM items ORDER   BY price DESC"), true);
  assert.equal(hasOrderBy("select name from items order by price"), true);
});

test("hasOrderBy ignores subqueries, strings, comments", () => {
  assert.equal(hasOrderBy("SELECT * FROM (SELECT name FROM items ORDER BY price LIMIT 3)"), false);
  assert.equal(hasOrderBy("SELECT 'ORDER BY x' FROM items"), false);
  assert.equal(hasOrderBy("SELECT 1 -- ORDER BY x\nFROM items"), false);
  assert.equal(hasOrderBy("SELECT 1 /* ORDER BY x */ FROM items"), false);
  assert.equal(hasOrderBy("WITH t AS (SELECT 1 AS a ORDER BY a) SELECT a FROM t ORDER BY a"), true);
  assert.equal(hasOrderBy("WITH t AS (SELECT 1 AS a ORDER BY a) SELECT a FROM t"), false);
  assert.equal(hasOrderBy(""), false);
});

const item = { type: "build", cards: ["SELECT", "name", "FROM", "items", "ORDER BY", "price"], extra: [], need: ["JOIN", "ORDER BY"], tables: ["items"], hints: ["a", "b"] };

test("need: same result but missing card", () => {
  const exp = T(["name"], [["a"], ["b"]]);
  const r = judgeBuild(item, T(["name"], [["a"], ["b"]]), exp, ["SELECT", "name", "ORDER BY"]);
  assert.deepEqual(r, { ok: false, reason: "need", missingNeed: ["JOIN"] });
  assert.deepEqual(judgeBuild(item, exp, exp, ["JOIN", "ORDER BY"]), { ok: true, reason: null });
  assert.deepEqual(judgeBuild({ ...item, need: undefined }, exp, exp, []), { ok: true, reason: null });
});

test("error first", () => {
  const exp = T(["name"], [["a"]]);
  const r = judgeBuild(item, T([], [], { error: "no such column: nme" }), exp, []);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "error");
});

test("judgeBuild precedence: columns > rows > need", () => {
  const exp = T(["name"], [["a"], ["b"]]);
  assert.equal(judgeBuild(item, T(["x"], [["a"], ["b"]]), exp, []).reason, "columns");
  assert.equal(judgeBuild(item, T(["name"], [["a"]]), exp, []).reason, "rows");
  assert.equal(judgeBuild(item, T(["name"], [["b"], ["a"]]), exp, []).reason, "rows"); // ORDER BY가 있으니 순서도 본다
  assert.equal(judgeBuild(item, T(["name"], [["a"], ["b"]]), exp, []).reason, "need");
});

test("truncated vs not truncated is a rows mismatch", () => {
  const exp = T(["a"], [[1]]);
  const r = judgeBuild({ ...item, need: [] }, T(["a"], [[1]], { truncated: true }), exp, []);
  assert.deepEqual(r, { ok: false, reason: "rows" });
});

test("explain: no such column", () => {
  const a = explain("no such column: nme", "default");
  const d = explain("no such column: nme", "detective");
  assert.match(a, /nme/);
  assert.match(d, /nme/);
  assert.notEqual(a, d);
  assert.doesNotMatch(a, /\{name\}/);
});

test("explain: every listed error has both voices and a name when it has one", () => {
  const samples = [
    ["no such table: itemz", "itemz"], ["misuse of aggregate: SUM()", null],
    ['near "FORM": syntax error', "FORM"], ["ambiguous column name: name", "name"],
    ["incomplete input", null], ["no such function: cnt", "cnt"],
    ["1st GROUP BY term does not match any column in the result set", null],
    ["read-only", null], ["timeout", null], ["worker", null], ["load", null],
  ];
  for (const [msg, name] of samples) {
    const a = explain(msg, "default"), d = explain(msg, "detective");
    assert.notEqual(a, FALLBACK, msg);
    assert.notEqual(a, d, msg);
    assert.doesNotMatch(a + d, /\{name\}/, msg);
    if (name) { assert.match(a, new RegExp(name)); assert.match(d, new RegExp(name)); }
  }
  for (const [k, v] of Object.entries(ERRORS)) assert.ok(v.body && v.detective && v.match, k);
});

test("explain: unknown outfit uses default; unknown error uses fallback", () => {
  assert.equal(explain("no such column: a", "gardener"), explain("no such column: a", "default"));
  assert.equal(explain("something weird", "default"), FALLBACK);
  assert.equal(explain("", "detective"), FALLBACK);
  assert.equal(explain(null, "detective"), FALLBACK);
});
