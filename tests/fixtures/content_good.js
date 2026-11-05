// 레슨 점검기 시험용 「좋은 장」 (tests/unit/content.test.js, tests/content.js --lessons-dir tests/fixtures/content_good).
// 실제 레슨이 아니다 — 5장(줄 세우기) 모양으로 모든 점검 규칙을 통과하도록 쓴 고정 파일. 점검기는 문제점 0개를 내야 한다.
// 개념 목록도 여기에 둔다(data/concepts.js는 작업 12에서 바뀌므로 기대지 않음).
export const CONCEPTS = [
  { id: "select", name: "열 고르기", chapter: 1 },
  { id: "where", name: "조건으로 거르기", chapter: 3 },
  { id: "orderby", name: "줄 세우기", chapter: 5 },
  { id: "limit", name: "앞에서 몇 개만", chapter: 5 },
  { id: "distinct", name: "겹치지 않게", chapter: 5 },
];

export const CHAPTER = { id: 5, title: "줄 세우기" };

const choice = (concept, q, options, answer, explain, more = {}) => ({ type: "choice", concept, q, options, answer, explain, ...more });
const check = (concept, q, options, answer, explain) => ({ type: "check", concept, q, options, answer, explain });

// ---- 터치 문제 모음 (레슨마다 8개씩 골라 씀) ----
const T = {
  kwOrder: choice("orderby", "행을 줄 세우는 낱말은?", ["ORDER BY", "WHERE", "FROM"], 0, "ORDER BY 뒤에 기준이 되는 열을 써요."),
  kwDesc: choice("orderby", "큰 값부터 줄 세우려면 무엇을 붙일까요?", ["DESC", "ASC", "LIMIT"], 0, "DESC는 내림차순, 큰 값이 먼저 나와요."),
  kwLimit: choice("limit", "앞에서 몇 행만 보고 싶을 때 쓰는 낱말은?", ["LIMIT", "DISTINCT", "ORDER BY"], 0, "LIMIT 3은 앞의 3행만 보여 줘요."),
  kwDistinct: choice("distinct", "겹치는 행을 한 번만 보이게 하는 낱말은?", ["DISTINCT", "LIMIT", "DESC"], 0, "DISTINCT는 같은 행을 하나로 줄여요."),
  rows: choice("distinct", "이 SQL의 결과는 몇 행일까요?", ["3행", "8행", "60행"], 0, "손님 종류는 도깨비·사람·여우 세 가지예요.",
    { code: "SELECT DISTINCT kind\nFROM customers" }),
  table: choice("limit", "이 SQL의 결과로 알맞은 표는?", [
    { sql: "SELECT name FROM shops\nORDER BY shop_id LIMIT 3" },
    { sql: "SELECT name FROM items\nORDER BY item_id LIMIT 3" },
    { sql: "SELECT name FROM shops\nORDER BY shop_id DESC LIMIT 3" },
  ], 0, "가게 번호가 작은 가게부터 3곳의 이름이에요.", { code: "SELECT name FROM shops\nORDER BY shop_id LIMIT 3", tables: ["shops"] }),
  broken: choice("orderby", "오류가 나는 SQL은?", [
    "SELECT name FROM shops ORDER BY name",
    "SELECT name FROM shops BY name ORDER",
    "SELECT name FROM shops LIMIT 2",
  ], 1, "ORDER와 BY는 붙어서 ORDER BY로 써요."),
  blankDesc: {
    type: "blank", concept: "orderby", q: "비싼 물건부터 보이게 빈칸을 채워 보세요",
    code: "SELECT name FROM items\nORDER BY price ___\nLIMIT 3", chips: ["DESC", "ASC", "LIMIT"], answer: 0,
    explain: "DESC를 붙이면 값이 큰 물건이 먼저 나와요.",
  },
  blankDistinct: {
    type: "blank", concept: "distinct", q: "사는 마을을 한 번씩만 보이게 채워 보세요",
    code: "SELECT ___ village\nFROM customers", chips: ["DISTINCT", "ORDER", "LIMIT"], answer: 0,
    explain: "DISTINCT는 SELECT 바로 뒤에 써요.",
  },
  orderTop: {
    type: "order", concept: "limit", q: "비싼 물건 3개를 보는 SQL을 차례대로 놓아 보세요",
    lines: ["SELECT name", "FROM items", "ORDER BY price DESC", "LIMIT 3"],
    explain: "SELECT → FROM → ORDER BY → LIMIT 차례예요.",
  },
  orderShop3: {
    type: "order", concept: "where", q: "3번 가게의 이름과 주인을 보는 SQL을 놓아 보세요",
    lines: ["SELECT name, owner", "FROM shops", "WHERE shop_id = 3"],
    expect: "name | owner\n산삼 약방 | 한약수",
    explain: "SELECT → FROM → WHERE 차례예요.",
  },
  proseForms: choice("select", "물건 값이 반으로 줄었어요. 알맞은 말은?", ["50% 할인", "100% 할인", "3-4할 할인"], 0,
    "반값은 50% 할인이에요.", { id: "g5-prose-forms" }),
  orderKinds: {
    type: "order", concept: "distinct", q: "손님 종류를 가나다순으로 한 번씩 보이게 놓아 보세요",
    lines: ["SELECT DISTINCT kind", "FROM customers", "ORDER BY kind"],
    explain: "DISTINCT로 줄이고 ORDER BY로 줄 세워요.",
  },
};

const checkOrder = check("orderby", "ORDER BY price DESC는 무엇을 할까요?", ["값이 큰 행부터 줄 세운다", "값이 작은 행부터 줄 세운다", "값이 큰 행만 남긴다"], 0, "DESC는 큰 값부터예요.");
const checkLimit = check("limit", "LIMIT 2는 무엇을 할까요?", ["앞의 2행만 보여 준다", "2행을 건너뛴다", "값이 2인 행만 보여 준다"], 0, "LIMIT는 보여 줄 행 수를 정해요.");
const checkDistinct = check("distinct", "DISTINCT는 무엇을 할까요?", ["같은 행을 한 번만 보인다", "행을 줄 세운다", "빈칸을 채운다"], 0, "DISTINCT는 겹치는 행을 하나로 줄여요.");

// ---- 조립 문제 ----
const B = {
  top5: {
    type: "build", id: "g5-top5", concept: "orderby", q: "값이 가장 비싼 물건 5개의 이름을 비싼 순서로 보여 줘",
    cards: ["SELECT", "name", "FROM", "items", "ORDER", "BY", "price", "DESC", "LIMIT", "5"], extra: ["ASC", "3"],
    tables: ["items"], hints: ["값이 큰 것부터 줄 세운 뒤 앞의 5개만 남겨요.", "ORDER BY, DESC, LIMIT 카드가 필요해요."],
    explain: "ORDER BY price DESC로 비싼 순서로 세우고 LIMIT 5로 다섯 개만 봐요.",
  },
  villages: {
    type: "build", id: "g5-villages", concept: "distinct", q: "손님이 사는 마을 이름을 겹치지 않게 보여 줘",
    cards: ["SELECT", "DISTINCT", "village", "FROM", "customers"], extra: ["kind", "ORDER"],
    tables: ["customers"], hints: ["같은 마을이 여러 번 나오지 않게 해요.", "SELECT 뒤에 DISTINCT 카드를 놓아요."],
    explain: "DISTINCT village는 마을 이름을 한 번씩만 보여 줘요.",
  },
  shopNames: {
    type: "build", id: "g5-shopnames", concept: "orderby", q: "가게 이름을 가나다순으로 보여 줘",
    cards: ["SELECT", "name", "FROM", "shops", "ORDER", "BY", "name"], extra: ["DESC", "owner"],
    tables: ["shops"], hints: ["이름 열로 줄 세워요.", "ORDER BY 뒤에 name 카드를 놓아요."],
    explain: "ORDER BY name은 이름을 가나다순으로 줄 세워요.",
  },
  first3: {
    type: "build", id: "g5-first3", concept: "limit", q: "가게 번호가 작은 가게 3곳의 이름을 보여 줘",
    cards: ["SELECT", "name", "FROM", "shops", "ORDER", "BY", "shop_id", "LIMIT", "3"], extra: ["DESC", "5"],
    tables: ["shops"], hints: ["번호 순서로 세운 뒤 앞의 3개만 봐요.", "ORDER BY와 LIMIT 카드가 필요해요."],
    explain: "ORDER BY shop_id로 세우고 LIMIT 3으로 세 곳만 봐요.",
  },
  categories: {
    type: "build", id: "g5-categories", concept: "distinct", q: "가게 종류를 겹치지 않게 가나다순으로 보여 줘",
    cards: ["SELECT", "DISTINCT", "category", "FROM", "shops", "ORDER", "BY", "category"], extra: ["DESC", "name"],
    tables: ["shops"], hints: ["겹치지 않게 줄인 뒤 줄 세워요.", "DISTINCT와 ORDER BY 카드가 필요해요."],
    explain: "DISTINCT category로 종류를 한 번씩 보이고 ORDER BY로 줄 세워요.",
  },
};

const lesson = (k, title, goal, summary, cards, items, more = {}) => ({ id: `5-${k}`, chapter: 5, title, goal, summary, ...more, cards, items });

export const LESSONS = [
  lesson(1, "비싼 순서로", "ORDER BY와 DESC로 줄 세우기",
    ["ORDER BY 뒤에 기준 열을 쓴다", "DESC는 큰 값부터", "LIMIT로 앞의 몇 행만 본다"],
    [{ say: "ORDER BY price DESC는 값이 큰 물건부터 줄 세워요.", sql: "SELECT name, price FROM items\nORDER BY price DESC\nLIMIT 5" }],
    [T.proseForms, T.kwOrder, T.kwDesc, T.blankDesc, T.orderTop, T.orderShop3, T.table, T.broken, T.kwLimit, T.rows, B.top5, checkOrder]),
  lesson(2, "겹치지 않게", "DISTINCT로 같은 값 줄이기",
    ["DISTINCT는 SELECT 바로 뒤", "같은 행은 한 번만 보인다", "종류·마을 목록에 쓴다"],
    [{ say: "DISTINCT를 쓰면 같은 마을이 한 번씩만 나와요.", sql: "SELECT DISTINCT village\nFROM customers" }],
    [T.kwDistinct, T.blankDistinct, T.rows, T.orderKinds, T.kwOrder, T.kwLimit, T.broken, T.table, B.villages, checkDistinct]),
  lesson(3, "가나다순", "글자 열로 줄 세우기",
    ["글자도 ORDER BY로 줄 세운다", "ASC는 작은 값부터(기본)", "DESC는 거꾸로"],
    [
      { say: "글자 열로 줄 세우면 가나다순이 돼요." },
      { say: "가게 이름을 가나다순으로 보면 이래요.", sql: "SELECT name FROM shops\nORDER BY name" },
    ],
    [T.kwOrder, T.kwDesc, T.orderKinds, T.blankDesc, T.broken, T.kwDistinct, T.rows, T.table, B.shopNames, checkOrder]),
  lesson(4, "앞에서 몇 개", "LIMIT로 앞의 몇 행만 보기",
    ["LIMIT 뒤에 행 수를 쓴다", "ORDER BY 다음에 LIMIT", "줄 세운 뒤 자른다"],
    [{ say: "LIMIT 3은 줄 세운 결과에서 앞의 3행만 남겨요.", sql: "SELECT name FROM shops\nORDER BY shop_id\nLIMIT 3" }],
    [T.kwLimit, T.table, T.orderTop, T.blankDesc, T.kwOrder, T.kwDesc, T.blankDistinct, T.broken, B.first3, checkLimit]),
  lesson(5, "5장 평가", "줄 세우기를 모두 써 보기",
    ["ORDER BY로 줄 세운다", "LIMIT로 자른다", "DISTINCT로 겹침을 없앤다"],
    [{ say: "5장에서 배운 것을 모두 써 볼 시간이에요." }],
    [T.kwOrder, T.kwLimit, T.kwDistinct, T.table, T.orderTop, T.blankDistinct, T.rows, B.categories, { ...B.top5, id: "g5-exam-top5" }, checkDistinct],
    { isExam: true }),
];
