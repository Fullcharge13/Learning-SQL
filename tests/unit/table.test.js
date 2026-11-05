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
