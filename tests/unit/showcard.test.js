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
