// 레슨 점검기 시험용 「나쁜 장」 (tests/unit/content.test.js). 실제 레슨이 아니다.
// content_good.js(문제점 0개)를 복사한 뒤 규칙마다 일부러 어긴 곳을 하나 이상 심는다. 심은 곳은 BAD에 적어 두고,
// 시험은 그 자리(where에 든 글자)에서 그 규칙이 나오는지 본다. 한 곳이 다른 규칙도 함께 어길 수 있다(시험은 「포함」만 봄).
import { CONCEPTS as GOOD_CONCEPTS, CHAPTER as GOOD_CHAPTER, LESSONS as GOOD_LESSONS, TEMPLATES as GOOD_TEMPLATES } from "./content_good.js";

export const CONCEPTS = structuredClone(GOOD_CONCEPTS);
export const CHAPTER = structuredClone(GOOD_CHAPTER);
export const LESSONS = structuredClone(GOOD_LESSONS);
export const TEMPLATES = structuredClone(GOOD_TEMPLATES);

const L = (k) => LESSONS[k - 1];
const hints = ["무엇을 볼지 먼저 생각해요.", "필요한 카드를 골라요."];
const build = (id, cards, extra, more = {}) => ({
  type: "build", id, concept: "orderby", q: "물건 이름을 보여 줘", cards, extra, tables: ["items"], hints,
  explain: "시험용 조립 문제예요.", ...more,
});

// 심은 곳: [규칙, where에 들어 있어야 할 글자]
export const BAD = [];
const plant = (rule, where) => BAD.push([rule, where]);

// answer-runs: 정답이 오류(없는 표 item) / 정답이 0행인데 allowEmpty 표시 없음
L(1).items.splice(8, 0,
  build("bad-answer-error", ["SELECT", "name", "FROM", "item"], ["price", "DESC"]),
  build("bad-answer-empty", ["SELECT", "name", "FROM", "items", "WHERE", "price", ">", "1000"], ["<", "stock"]));
plant("answer-runs", "bad-answer-error");
plant("answer-runs", "bad-answer-empty");

// drop-one: ASC 카드를 빼도 같은 결과(ASC는 기본값)
L(2).items.splice(8, 0, build("bad-drop", ["SELECT", "name", "FROM", "items", "ORDER", "BY", "item_id", "ASC"], ["DESC", "price"]));
plant("drop-one", "bad-drop");

// swap-extra: 300엽전인 물건이 없어서 >= 를 > 로 바꿔 끼워도 같은 결과
L(2).items.splice(8, 0, build("bad-swap", ["SELECT", "name", "FROM", "items", "WHERE", "price", ">=", "300"], [">", "<"]));
plant("swap-extra", "bad-swap");

// bank-size: 헷갈림 카드 1장뿐 / 카드 더미 13장 / 헷갈림 카드가 정답 카드와 같은 글자
L(3).items.splice(8, 0,
  build("bad-bank-few", ["SELECT", "name", "FROM", "items", "ORDER", "BY", "price", "DESC", "LIMIT", "2"], ["ASC"]),
  build("bad-bank-many", ["SELECT", "name", ",", "price", ",", "stock", "FROM", "items", "ORDER", "BY", "item_id"], ["DESC", "shops"]),
  build("bad-bank-dup", ["SELECT", "name", "FROM", "shops", "ORDER", "BY", "shop_id"], ["shop_id", "DESC"], { tables: ["shops"] }));
plant("bank-size", "bad-bank-few");
plant("bank-size", "bad-bank-many");
plant("bank-size", "bad-bank-dup");
// bank-size: 이 id(x3)로 섞으면 정답 카드 4장이 정답 순서 그대로 보임
L(3).items.splice(8, 0, build("x3", ["SELECT", "*", "FROM", "shops"], ["items", "name"], { tables: ["shops"] }));
plant("bank-size", "build x3 섞은");

// table-truth: 결과 표 보기 둘이 같은 표 / 문제 SQL의 결과가 정답 보기와 다름 / 「몇 행」 정답이 실제 행 수와 다름 / 설명 카드 SQL 오류
L(3).items.splice(0, 0,
  {
    type: "choice", id: "bad-same-tables", concept: "orderby", q: "1번 가게를 보여 주는 표는?",
    options: [
      { sql: "SELECT name FROM shops WHERE shop_id = 1" },
      { sql: "SELECT name FROM shops WHERE name = '도깨비 국밥집'" },
      { sql: "SELECT name FROM shops WHERE shop_id = 2" },
    ],
    answer: 0, explain: "두 보기가 같은 표라 고를 수 없어요.",
  },
  {
    type: "choice", id: "bad-code-mismatch", concept: "orderby", q: "이 SQL의 결과로 알맞은 표는?",
    code: "SELECT name FROM shops\nORDER BY shop_id DESC LIMIT 2",
    options: [
      { sql: "SELECT name FROM shops\nORDER BY shop_id LIMIT 2" },
      { sql: "SELECT name FROM items\nORDER BY item_id LIMIT 2" },
      { sql: "SELECT owner FROM shops\nORDER BY shop_id LIMIT 2" },
    ],
    answer: 0, explain: "정답 보기가 문제 SQL과 다른 표예요.",
  },
  {
    type: "choice", id: "bad-row-count", concept: "distinct", q: "이 SQL의 결과는 몇 행일까요?",
    code: "SELECT DISTINCT village\nFROM customers", options: ["3행", "8행", "60행"], answer: 0, explain: "실제로는 8행이에요.",
  });
L(3).cards[1].sql = "SELECT name FROM shop\nORDER BY name";
plant("table-truth", "bad-same-tables");
plant("table-truth", "bad-code-mismatch");
plant("table-truth", "bad-row-count");
plant("table-truth", "5-3 cards[1]");

// grammar: 5장에서 아직 배우지 않은 COUNT·GROUP BY(7·8장)·SUM(7장)·date(16장), 가르치지 않는 GLOB, 날마다 바뀌는 'now'
L(4).cards[0].sql = "SELECT shop_id, COUNT(*)\nFROM items GROUP BY shop_id";
L(4).items.splice(0, 0, {
  type: "blank", id: "bad-grammar-chip", concept: "orderby", q: "빈칸을 채워 보세요",
  code: "SELECT name FROM items\nORDER BY ___ DESC LIMIT 3", chips: ["price", "stock", "SUM(price)"], answer: 0,
  explain: "SUM은 7장에서 배워요.",
});
L(4).items.splice(1, 0, build("bad-grammar-glob", ["SELECT", "name", "FROM", "items", "WHERE", "name", "GLOB", "'*방망이'"], ["LIKE", "price"]));
L(4).items.splice(2, 0, {
  type: "choice", id: "bad-grammar-now", concept: "orderby", q: "이 SQL의 결과로 알맞은 표는?",
  code: "SELECT name FROM shops\nWHERE opened_on < date('now')\nORDER BY shop_id LIMIT 2",
  options: [
    { sql: "SELECT name FROM shops\nWHERE opened_on < date('now')\nORDER BY shop_id LIMIT 2" },
    { sql: "SELECT name FROM items\nORDER BY item_id LIMIT 2" },
    { sql: "SELECT owner FROM shops\nORDER BY shop_id LIMIT 2" },
  ],
  answer: 0, explain: "now는 날마다 바뀌어요.",
});
plant("grammar", "5-4 cards[0]");
plant("grammar", "bad-grammar-chip");
plant("grammar", "bad-grammar-glob");
plant("grammar", "bad-grammar-now");
// grammar(기호 모양): 9장에서 배우는 ||, 12장에서 배우는 서브쿼리
L(4).items.splice(3, 0, {
  type: "order", id: "bad-grammar-forms", concept: "orderby", q: "차례대로 놓아 보세요",
  lines: ["SELECT name || owner FROM shops", "WHERE shop_id IN (SELECT shop_id FROM items)", "ORDER BY shop_id"],
  explain: "||와 서브쿼리는 뒤 장에서 배워요.",
});
plant("grammar", "bad-grammar-forms");

// readonly: 데이터를 바꾸는 SQL이 보기에, INSERT가 해설 글에
L(5).items.splice(0, 0, {
  type: "choice", id: "bad-readonly", concept: "orderby", q: "데이터를 바꾸지 않는 SQL은?",
  options: ["SELECT name FROM items", "DELETE FROM items", "UPDATE items SET price = 0"], answer: 0,
  explain: "INSERT·UPDATE·DELETE는 데이터를 바꿔요.",
});
plant("readonly", "bad-readonly options");
plant("readonly", "bad-readonly.explain");

// table-truth: 값 하나가 나오는 SQL인데 그 값(산삼 약방)과 같은 보기가 정답이 아님
L(5).items.splice(1, 0, {
  type: "choice", id: "bad-cell", concept: "orderby", q: "이 SQL의 결과로 나오는 이름은?",
  code: "SELECT name FROM shops\nWHERE shop_id = 3", options: ["산삼 약방", "달빛 약초방", "도깨비 국밥집"], answer: 1,
  explain: "3번 가게는 산삼 약방이에요.",
});
plant("table-truth", "bad-cell");

// shape: 요약 2줄, 모르는 칸, 개념 목록에 없는 개념, 장 평가가 아닌데 isExam, build의 hints 1개(validateLesson),
//        정답이 쓰는 표가 tables에 없음, 한 줄이 너무 넓은 SQL
L(1).summary = ["요약이", "두 줄뿐"];
L(1).color = "red";
L(2).items[0] = { ...L(2).items[0], concept: "no_such_concept" };
L(2).isExam = true;
L(1).items.splice(0, 0, build("bad-shape-hints", ["SELECT", "name", "FROM", "items", "ORDER", "BY", "item_id"], ["DESC", "price"], { hints: ["하나뿐"] }));
L(1).items.splice(1, 0, build("bad-shape-tables", ["SELECT", "name", "FROM", "shops", "ORDER", "BY", "shop_id"], ["DESC", "owner"]));
L(1).cards[0].sql = "SELECT name, price, stock, shop_id, item_id FROM items";
plant("shape", "5-1 summary");
plant("shape", "5-1 color");
plant("shape", "no_such_concept");
plant("shape", "5-2 isExam");
plant("shape", "bad-shape-hints");
plant("shape", "bad-shape-tables");
plant("shape", "5-1 cards[0]");

// stable-order: 값 6엽전인 물건이 둘(인절미·한지)이라 ORDER BY price LIMIT 3의 동점 순서가 정해지지 않음 / ORDER BY 없는 LIMIT
L(3).items.splice(5, 0,
  build("bad-stable-tie", ["SELECT", "name", "FROM", "items", "ORDER", "BY", "price", "LIMIT", "3"], ["DESC", "2"]),
  build("bad-stable-limit", ["SELECT", "name", "FROM", "items", "LIMIT", "3"], ["2", "shops"]));
plant("stable-order", "bad-stable-tie");
plant("stable-order", "bad-stable-limit");

// engine-guard: 문장 두 개 / 괄호로 시작하는 SQL (실행기가 「조회 전용 아님」으로 막음)
L(5).cards[0].sql = "SELECT name FROM shops; SELECT name FROM items";
L(5).items.splice(1, 0, {
  type: "order", id: "bad-guard-paren", concept: "orderby", q: "차례대로 놓아 보세요",
  lines: ["(SELECT name", "FROM shops", "ORDER BY name)"], explain: "괄호로 시작하면 실행기가 막아요.",
});
plant("engine-guard", "5-5 cards[0]");
plant("engine-guard", "bad-guard-paren");

// blank-unique: LIMIT 03 은 LIMIT 3 과 같은 결과(정답이 둘)
L(5).items.splice(2, 0, {
  type: "blank", id: "bad-blank-twin", concept: "limit", q: "비싼 물건 3개만 보이게 채워 보세요",
  code: "SELECT name FROM items\nORDER BY price DESC\nLIMIT ___", chips: ["3", "03", "5"], answer: 0,
  explain: "LIMIT 3은 앞의 3행만 보여 줘요.",
});
plant("blank-unique", "bad-blank-twin");

// order-unique: 두 조건 줄을 바꿔 놓아도 같은 결과인데 화면은 저장된 순서만 정답으로 침
L(5).items.splice(3, 0, {
  type: "order", id: "bad-order-twin", concept: "orderby", q: "비싸고 재고가 많은 물건을 보는 SQL을 놓아 보세요",
  lines: ["SELECT name FROM items WHERE", "price > 100", "AND", "stock > 10"], explain: "두 조건은 어느 쪽이 먼저여도 같아요.",
});
plant("order-unique", "bad-order-twin");

// exam-coverage: 5-4의 조립 문제 개념을 where로 바꿈 → 장 평가(5-5)에 where 문제가 없음
L(4).items.find((it) => it.id === "g5-first3").concept = "where";
plant("exam-coverage", "5-5");

// ---- 고침 1회차(fix round 1) ----
// stable-order: 가게마다 물건이 5개씩이라 묶음끼리 동점 — 저장 순서를 바꿔도 묶음은 늘 같은 차례로 나와 앞의 두 검사로는 안 잡힘
L(1).items.splice(9, 0, build("bad-stable-group",
  ["SELECT shop_id, COUNT(*) AS n", "FROM items", "GROUP BY shop_id", "ORDER BY n DESC", "LIMIT 3"], ["ASC", "2"]));
plant("stable-order", "bad-stable-group");

// swap-extra(끼워 넣기): ORDER BY name 뒤에 헷갈림 카드 ASC를 더 놓아도 같은 결과
L(2).items.splice(9, 0, build("bad-insert-asc", ["SELECT", "name", "FROM", "shops", "ORDER", "BY", "name"], ["ASC", "<"], { tables: ["shops"] }));
plant("swap-extra", "bad-insert-asc");

// shape(R22): order의 expect가 정답 순서 실행 결과와 다름
L(5).items.splice(4, 0, {
  type: "order", id: "bad-expect", concept: "orderby", q: "3번 가게의 이름을 보는 SQL을 놓아 보세요",
  lines: ["SELECT name", "FROM shops", "WHERE shop_id = 3"], expect: "name\n달빛 약초방", explain: "3번 가게는 산삼 약방이에요.",
});
plant("shape", "bad-expect");

// ---- 작업 11: 매일 도전 틀 ----
// templates: 오답 SQL이 모두 정답과 같은 표(쓰는 모양만 다름) → 어느 씨앗도 다섯 번 안에 보기를 못 만듦
TEMPLATES.push({
  id: "5-T7", concept: "where", type: "choice", q: "번호가 {N} 이하인 가게를 보는 SQL이에요. 결과로 알맞은 표는?",
  sql: "SELECT name FROM shops\nWHERE shop_id <= {N}\nORDER BY shop_id",
  wrong: ["SELECT name FROM shops\nWHERE shop_id < {N} + 1\nORDER BY shop_id", "SELECT name FROM shops\nWHERE NOT shop_id > {N}\nORDER BY shop_id"],
  vars: { N: { min: 2, max: 6 } }, explain: "세 SQL은 모두 같은 가게를 골라요.",
});
plant("templates", "5-T7");

// grammar: 5장 틀에 7장 낱말 COUNT
TEMPLATES.push({
  id: "5-T8", concept: "limit", type: "blank", q: "물건 수를 세는 SQL의 빈칸을 채워 보세요({N}은 쓰이지 않는 값)",
  sql: "SELECT COUNT(*) FROM items\nWHERE price > {N}\n___ 1",
  chips: ["LIMIT", "OFFSET", "DESC"], answer: 0,
  vars: { N: { min: 10, max: 90 } }, explain: "LIMIT 1은 한 행만 남겨요.",
});
plant("grammar", "5-T8");

// ---- 작업 12a 고침 1회차 ----
// shape: build 힌트가 3개(손으로 쓰는 힌트는 정확히 2개, 3·4단계는 앱이 함)
L(4).items.splice(0, 0, build("bad-shape-hints3", ["SELECT", "name", "FROM", "shops", "ORDER", "BY", "shop_id"], ["DESC", "owner"],
  { tables: ["shops"], hints: ["하나", "둘", "셋"] }));
plant("shape", "bad-shape-hints3");

// shape: 매일 도전 틀이 6개(장마다 2~5개). 여섯째 틀 자체는 문제없는 틀
TEMPLATES.push({ ...structuredClone(GOOD_TEMPLATES[0]), id: "5-T9" });
plant("shape", "ch5 TEMPLATES");

// shape: 장 평가의 결과 표 객관식에 tables(「쓸 표 보기」가 정답 보기와 같은 표를 보여 줘 짝 맞추기가 됨)
L(5).items.splice(0, 0, {
  type: "choice", id: "bad-exam-tables", concept: "orderby", q: "가게 이름을 번호 차례로 본 결과는 어느 것일까요?",
  options: [{ sql: "SELECT name FROM shops\nORDER BY shop_id" }, { sql: "SELECT name FROM items\nORDER BY item_id" },
    { sql: "SELECT owner FROM shops\nORDER BY shop_id" }],
  answer: 0, tables: ["shops"], explain: "가게 표의 이름 열이에요.",
});
plant("shape", "bad-exam-tables 장 평가의 결과 표 객관식");
