// 보기 전용 비교 카드 (판정 R30, 16장): 설명 카드 { say, show, dialect }는 다른 데이터베이스의 SQL을 코드 상자로만 보인다.
// 실행하지 않으므로 결과 표 자리(.sql-result[data-sql])가 없고, 「이 장터에서는 돌지 않아요」 안내와 데이터베이스 이름표가 붙는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardExample, SHOW_NOTE } from "../../src/ui/dom.js";

test("show card renders the code with a dialect label and a not-run note, no result table", () => {
  const h = cardExample({ say: "x", show: "SELECT TO_CHAR(d, 'YYYY-MM')\nFROM orders", dialect: "PostgreSQL" });
  assert.match(h, /class="example show-only"/);
  assert.match(h, /<pre class="code sql show"[^>]*><code>SELECT TO_CHAR\(d, &#39;YYYY-MM&#39;\)\nFROM orders<\/code><\/pre>/);
  assert.match(h, /class="dialect"[^>]*>PostgreSQL</);
  assert.ok(h.includes(SHOW_NOTE), h);
  assert.match(SHOW_NOTE, /장터/);
  assert.doesNotMatch(h, /sql-result|data-sql|실행 결과/);
});

test("show card escapes its text, and an sql card is unchanged", () => {
  const h = cardExample({ say: "x", show: "SELECT '<b>'", dialect: "MySQL" });
  assert.match(h, /&lt;b&gt;/);
  const s = cardExample({ say: "x", sql: "SELECT 1" });
  assert.match(s, /class="sql-result" data-sql="SELECT 1"/);
  assert.doesNotMatch(s, /show-only|dialect/);
  assert.equal(cardExample({ say: "x" }), "");
});

test("cards modal (개념 카드 다시 보기) renders a show card view-only, next to a normal sql card", async () => {
  const { cardsModalBody } = await import("../../src/ui/dom.js");
  const h = cardsModalBody([
    { say: "MySQL <카드>", show: "SELECT DATE_FORMAT(d, '%Y-%m')\nFROM orders", dialect: "MySQL" },
    { say: "장터 카드", sql: "SELECT 1" },
  ]);
  const [showPart, sqlPart] = h.split("<p>장터 카드</p>");
  assert.match(showPart, /^<p>MySQL &lt;카드&gt;<\/p>/);
  assert.match(showPart, /class="example show-only"/);
  assert.match(showPart, /class="dialect"[^>]*>MySQL</);
  assert.ok(showPart.includes(SHOW_NOTE));
  // 보기 전용: 실행 자리(fillResults가 찾는 data-sql)·결과 표·실행 단추가 없다
  assert.doesNotMatch(showPart, /sql-result|data-sql|실행 결과|<button/);
  assert.match(sqlPart, /class="sql-result" data-sql="SELECT 1"/);
  assert.equal(cardsModalBody([]), "");
  assert.equal(cardsModalBody(undefined), "");
});
