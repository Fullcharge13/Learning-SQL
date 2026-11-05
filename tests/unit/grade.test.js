import { test } from "node:test";
import assert from "node:assert/strict";
import { hasOrderBy, sameTable, judgeBuild, explain, cardsToSql } from "../../src/grade.js";
import { ERRORS, FALLBACK } from "../../data/errors.js";

const T = (columns, rows, extra = {}) => ({ columns, rows, error: null, truncated: false, ...extra });

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
    ["1st GROUP BY term out of range - should be between 1 and 2", null],
    ["aggregate functions are not allowed in the GROUP BY clause", null],
    ["misuse of window function ROW_NUMBER()", "ROW_NUMBER"],
    ["misuse of aliased window function rk", "rk"],
    ["wrong number of arguments to function SUBSTR()", "SUBSTR"],
    ["1st ORDER BY term out of range - should be between 1 and 1", null],
    ["sub-select returns 2 columns - expected 1", null],
    ["SELECTs to the left and right of UNION do not have the same number of result columns", null],
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

// ---- 작업 10 (작업 4 이월): 실제 SQLite 문장으로 본 오류 설명 ----
const SPECIFIC = [
  // [실제 sql.js 오류 문장(작업 10에서 sql.js 1.15.2로 뽑음), 표 키]
  ["aggregate functions are not allowed in the GROUP BY clause", "aggregate in GROUP BY"],
  ["misuse of window function ROW_NUMBER()", "misuse of window function"],
  // 14장: 같은 SELECT의 창 함수 별칭을 WHERE에서 부름(WHERE rk = 1) — 작업 15a에서 sql.js 1.15.2로 뽑음
  // 15장(작업 15b): 별칭 쪽은 따로 「창 함수 결과(rk)」 설명으로 감(GROUP BY·HAVING에서 불러도 같은 문장)
  ["misuse of aliased window function rk", "aliased window function"],
  ["misuse of aliased window function running", "aliased window function"],
  ["misuse of window function LAG()", "misuse of window function"],
  ["wrong number of arguments to function ROUND()", "wrong number of arguments"],
  ["1st ORDER BY term out of range - should be between 1 and 1", "ORDER BY term"],
  ["1st ORDER BY term does not match any column in the result set", "ORDER BY term"],
  ["sub-select returns 2 columns - expected 1", "sub-select columns"],
  ["1st GROUP BY term out of range - should be between 1 and 1", "GROUP BY term"],
  ["misuse of aggregate function SUM()", "misuse of aggregate"],
  // 13장 UNION 양쪽 열 개수가 다름(작업 14d에서 sql.js 1.15.2로 뽑음)
  ["SELECTs to the left and right of UNION do not have the same number of result columns", "UNION columns"],
  ["SELECTs to the left and right of UNION ALL do not have the same number of result columns", "UNION columns"],
];

test("explain: 실제 SQLite 오류 문장이 자기 설명으로 감 (대체 문장 아님)", () => {
  for (const [msg, key] of SPECIFIC) {
    assert.ok(ERRORS[key], `표에 ${key} 없음`);
    assert.equal(explain(msg, "basic"), ERRORS[key].body.replace(/\{name\}/g, (ERRORS[key].match.exec(msg) || [])[1] || "그 이름"), msg);
    assert.notEqual(explain(msg, "basic"), FALLBACK, msg);
  }
});

test("explain: 창 함수 별칭 오류는 별칭을 함수처럼 부르지 않음(「'rk' 같은 창 함수」 ✗ → 「창 함수 결과(rk)」)", () => {
  for (const alias of ["rk", "running", "gap"]) {
    for (const outfit of ["basic", "detective"]) {
      const a = explain(`misuse of aliased window function ${alias}`, outfit);
      assert.match(a, new RegExp(`창 함수 결과\\(${alias}\\)`), a);
      assert.doesNotMatch(a, /같은 창 함수/, a);
      assert.match(a, /WITH/, a);
    }
  }
  // 함수 이름 쪽(OVER를 빠뜨림·WHERE에 바로 씀)은 함수 이름과 OVER를 함께 말한다
  const f = explain("misuse of window function LAG()", "basic");
  assert.match(f, /LAG/);
  assert.match(f, /OVER/);
});

test("explain: misuse of aggregate 기본 말투는 자리를 단정하지 않음(WHERE 대신 HAVING만 권하지 않음)", () => {
  const a = explain("misuse of aggregate function COUNT()", "basic");
  assert.doesNotMatch(a, /WHERE 대신 HAVING/);
  assert.match(a, /HAVING/);
});

test("explain: 「이거 봐요」로 여는 설명은 셋 이하(여는 말이 고루 다름)", () => {
  const bodies = Object.values(ERRORS).map((e) => e.body);
  const n = bodies.filter((b) => b.startsWith("이거 봐요")).length;
  assert.ok(n <= 3, `「이거 봐요」 ${n}번`);
  const openers = new Set(bodies.map((b) => b.split(/[,.!?]/)[0]));
  assert.ok(openers.size >= 6, `여는 말 ${openers.size}가지`);
});

test("explain: (이)라는 조사가 이름 받침에 맞음", () => {
  // 영어 이름은 읽은 소리로: name(네임) → 이라는, price(프라이스) → 라는, 숫자 3 → 이라는, 한글 값 → 받침대로
  assert.match(explain("no such column: name", "basic"), /'name'이라는/);
  assert.match(explain("no such column: price", "basic"), /'price'라는/);
  assert.match(explain("no such column: item_id", "basic"), /'item_id'라는/);
  assert.match(explain("no such column: shop", "basic"), /'shop'이라는/);
  assert.match(explain("no such table: orders", "basic"), /'orders'라는/);
  assert.match(explain("no such table: 장부", "basic"), /'장부'라는/);
  assert.match(explain("no such table: 가게", "basic"), /'가게'라는/);
  assert.match(explain("no such column: 손님", "detective"), /'손님'이라는/);
  assert.match(explain("ambiguous column name: id", "basic"), /'id'는/);
  assert.match(explain("ambiguous column name: name", "basic"), /'name'은/);
  for (const e of Object.values(ERRORS)) {
    assert.doesNotMatch(e.body + e.detective, /\}'라는|\}'이라는/, "고정 조사 대신 {i}·{eun} 자리를 씀");
  }
});

test("explain: read-only 안내는 「만들어 볼까」", () => {
  assert.match(explain("read-only", "basic"), /만들어 볼까/);
  assert.doesNotMatch(explain("read-only", "basic"), /써 볼까/);
});

// ---- 작업 10 (작업 6 이월): need 안내의 조사 ----
test("needLine: 빠진 카드 안내는 받침에 맞는 을/를 (고정 「를」 아님)", async () => {
  const { needLine } = await import("../../src/grade.js");
  assert.equal(needLine(["JOIN"]), "결과는 맞았는데 이번엔 JOIN을 써 보자");
  assert.equal(needLine(["AS"]), "결과는 맞았는데 이번엔 AS를 써 보자");
  assert.equal(needLine(["HAVING"]), "결과는 맞았는데 이번엔 HAVING을 써 보자");
  assert.equal(needLine(["WHERE"]), "결과는 맞았는데 이번엔 WHERE를 써 보자");
  assert.equal(needLine(["COUNT(*)"]), "결과는 맞았는데 이번엔 COUNT(*)를 써 보자");
  assert.equal(needLine(["GROUP BY", "LIMIT"]), "결과는 맞았는데 이번엔 GROUP BY, LIMIT을 써 보자");
  assert.equal(needLine(["값"]), "결과는 맞았는데 이번엔 값을 써 보자");
  assert.equal(needLine(["가게"]), "결과는 맞았는데 이번엔 가게를 써 보자");
});

test("explain: misuse of aggregate는 두 말투 모두 자리를 단정하지 않음(ON 안·셈 함수 안에서도 같은 오류)", () => {
  for (const outfit of ["basic", "detective"]) {
    const t = explain("misuse of aggregate function COUNT()", outfit);
    assert.doesNotMatch(t, /WHERE/, outfit);
    assert.match(t, /다른 셈 함수 안/, outfit);
  }
});
