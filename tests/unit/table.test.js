import { test } from "node:test";
import assert from "node:assert/strict";
import { tableHTML } from "../../src/ui/table.js";
import { SCHEMA } from "../../data/schema.js";

const bodyRows = (html) => {
  const body = html.split("<tbody>")[1].split("</tbody>")[0];
  return (body.match(/<tr[\s>]/g) || []).length;
};

test("table caps at 50 rows", () => {
  const rows = Array.from({ length: 72 }, (_, i) => [i, "x" + i]);
  const h = tableHTML({ columns: ["a", "b"], rows, truncated: false });
  assert.equal(bodyRows(h), 50);
  assert.ok(h.includes("… 외 22행"), h.slice(-200));
  assert.ok(h.includes(">49<") && !h.includes(">50<"), "앞 50행만");
});

test("table max option and no note under the cap", () => {
  const rows = Array.from({ length: 7 }, (_, i) => [i]);
  assert.equal(bodyRows(tableHTML({ columns: ["n"], rows }, { max: 5 })), 5);
  const all = tableHTML({ columns: ["n"], rows });
  assert.equal(bodyRows(all), 7);
  assert.ok(!all.includes("… 외"));
});

test("table truncated by the engine says 이상", () => {
  const rows = Array.from({ length: 5000 }, (_, i) => [i]);
  const h = tableHTML({ columns: ["n"], rows, truncated: true });
  assert.equal(bodyRows(h), 50);
  assert.ok(h.includes("… 외 4950행 이상"));
});

test("table shows ko under column", () => {
  const r = { columns: ["name", "price", "count(*)"], rows: [["국밥", 12, 1]] };
  const h = tableHTML(r, { ko: SCHEMA, tables: ["items"] });
  assert.match(h, /<span class="col-en">name<\/span><span class="col-ko">이름<\/span>/);
  assert.match(h, /<span class="col-en">price<\/span><span class="col-ko">값\(엽전\)<\/span>/);
  assert.match(h, /<span class="col-en">count\(\*\)<\/span><\/th>/, "모르는 열은 영어만");
  // 표를 안 주면 모든 표에서 찾는다
  assert.ok(tableHTML({ columns: ["village"], rows: [] }, { ko: SCHEMA }).includes("사는 마을"));
  // ko가 없으면 한글 줄 없음
  assert.ok(!tableHTML(r).includes("col-ko"));
});

test("table escapes values", () => {
  const h = tableHTML({ columns: ["<i>c</i>"], rows: [["<b>x</b>"], ["a&b"]] });
  assert.ok(h.includes("&lt;b&gt;x&lt;/b&gt;"));
  assert.ok(h.includes("&lt;i&gt;c&lt;/i&gt;"));
  assert.ok(h.includes("a&amp;b"));
  assert.ok(!h.includes("<b>x"));
  assert.ok(!h.includes("<i>c"));
});

test("table shows NULL dim and numbers as numbers", () => {
  const h = tableHTML({ columns: ["a", "b"], rows: [[null, 79.52500001], [undefined, 3]] });
  assert.equal((h.match(/<td class="null">NULL<\/td>/g) || []).length, 2);
  assert.ok(h.includes('<td class="num">79.525</td>'));
  assert.ok(h.includes('<td class="num">3</td>'));
});

test("table with no rows keeps the header and says 0행", () => {
  const h = tableHTML({ columns: ["name"], rows: [] });
  assert.ok(h.includes("col-en\">name"));
  assert.equal(bodyRows(h), 0);
  assert.ok(h.includes("0행"));
});

// ---- 작업 10 (작업 12b 이월): 별칭이 진짜 열 이름을 가리면 한글 뜻을 달지 않음 ----
test("table: alias shadowing a real column shows no ko (SELECT name price FROM items)", async () => {
  const { shadowedNames } = await import("../../src/ui/table.js");
  const r = { columns: ["price"], rows: [["국밥"]] };
  const bad = tableHTML(r, { ko: SCHEMA, tables: ["items"], sql: "SELECT name price FROM items" });
  assert.doesNotMatch(bad, /col-ko/, "이름 위에 「값(엽전)」이 붙으면 안 됨");
  assert.match(bad, /<span class="col-en">price<\/span><\/th>/);
  const as = tableHTML(r, { ko: SCHEMA, tables: ["items"], sql: "SELECT name AS price FROM items" });
  assert.doesNotMatch(as, /col-ko/);
  // 진짜 열이면 그대로 한글 뜻
  for (const sql of ["SELECT price FROM items", "SELECT items.price FROM items", "SELECT * FROM items",
    "SELECT price AS price FROM items", "SELECT DISTINCT price FROM items", "SELECT i.price FROM items AS i"]) {
    assert.match(tableHTML({ columns: ["price"], rows: [[3]] }, { ko: SCHEMA, tables: ["items"], sql }), /col-ko">값\(엽전\)</, sql);
  }
  // 이름이 같아도 다른 계산이면 가림
  assert.deepEqual([...shadowedNames("SELECT price * 2 AS price, name FROM items")], ["price"]);
  assert.deepEqual([...shadowedNames("SELECT COUNT(*) AS name FROM items")], ["name"]);
  assert.deepEqual([...shadowedNames("SELECT CASE WHEN price > 10 THEN '비쌈' ELSE '쌈' END price FROM items")], ["price"]);
  assert.deepEqual([...shadowedNames("SELECT price - 1 FROM items")], [], "별칭 없는 계산(열 이름이 식 그대로)");
  assert.deepEqual([...shadowedNames("SELECT name, \"price\" FROM items")], []);
  assert.deepEqual([...shadowedNames("SELECT name 'price' FROM items")], ["price"]);
  // WITH·서브쿼리 안의 별칭도 센다: 바깥 price가 실제로는 안쪽에서 이름을 바꾼 name일 수 있으므로(뜻을 틀리게 다느니 안 단다)
  assert.deepEqual([...shadowedNames("WITH t AS (SELECT name AS price FROM items) SELECT price FROM t")], ["price"]);
  assert.deepEqual([...shadowedNames("WITH t AS (SELECT price FROM items) SELECT price FROM t")], []);
  assert.deepEqual([...shadowedNames("SELECT (SELECT MAX(price) FROM items) AS price FROM shops")], ["price"]);
  assert.deepEqual([...shadowedNames("")], []);
  assert.deepEqual([...shadowedNames(null)], []);
  // 대소문자 섞임: 결과 열 이름은 별칭 그대로라 대소문자를 가리지 않고 비교
  assert.doesNotMatch(tableHTML({ columns: ["Price"], rows: [["국밥"]] }, { ko: SCHEMA, sql: "SELECT name Price FROM items" }), /col-ko/);
});
