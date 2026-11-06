// 이어진 밑줄 (4~6장 심화 고침): LIKE '__%'·'___' 의 밑줄은 고정폭 글꼴에서 한 줄로 붙어 휴대폰에서 셀 수 없었다.
// escCode는 2개 이상 이어진 밑줄을 글자마다 span.us로 감싸고(CSS가 좁혀 그려 틈을 냄), 글자 자체는 바꾸지 않는다.
import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { escCode, esc, codeBlock, cardExample } from "../../src/ui/dom.js";

const US = '<span class="us">_</span>';
const strip = (h) => h.replace(/<[^>]+>/g, "");

test("runs of two or more underscores are wrapped one span per underscore", () => {
  assert.equal(escCode("LIKE '__%'"), `LIKE &#39;<span class="us-run">${US}${US}</span>%&#39;`);
  assert.equal(escCode("'___'"), `&#39;<span class="us-run">${US.repeat(3)}</span>&#39;`);
  assert.equal((escCode("a__b___c").match(/class="us"/g) || []).length, 5);
});

test("a single underscore (item_id) and text without underscores stay plain esc", () => {
  for (const s of ["item_id", "stock_or_zero", "'_방%'", "SELECT * FROM shops", ""]) assert.equal(escCode(s), esc(s), s);
});

test("the visible text is unchanged and still escaped", () => {
  for (const s of ["WHERE name LIKE '___%'", "<b>__</b> & '__'", "'% %'"]) assert.equal(strip(escCode(s)).replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"), s);
  assert.match(escCode("<b>__"), /^&lt;b&gt;/);
});

test("code blocks and card SQL use it; data-sql attributes keep the raw underscores", () => {
  assert.ok(codeBlock("WHERE name LIKE '__'").includes(`${US}${US}`));
  const h = cardExample({ say: "x", sql: "SELECT name\nFROM items\nWHERE name LIKE '__'" });
  assert.ok(h.includes(`<span class="us-run">${US}${US}</span>`), h);
  assert.match(h, /data-sql="SELECT name\nFROM items\nWHERE name LIKE &#39;__&#39;"/);
});

test("build screen shows hints and the missing-card line with escCode (consistent with every SQL display site)", () => {
  const src = readFileSync(new URL("../../src/ui/build.js", import.meta.url), "utf8");
  assert.match(src, /escCode\(needLine\(/);
  assert.match(src, /<p>\$\{escCode\(text\)\}<\/p>/);
  assert.doesNotMatch(src, /[^e]esc\(needLine\(/);
  assert.match(src, /import \{[^}]*\bescCode\b[^}]*\} from "\.\/dom\.js"/);
});
