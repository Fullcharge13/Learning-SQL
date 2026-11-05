// 시험용 레슨(tests/flow.py 「build」 장면 전용). 실제 레슨이 아니다 — 실제 1장은 작업 12에서 data/lessons/ch1.js에 쓴다.
// flow.py가 이 파일을 tests/out/flow/lessons-fixture/ch1.js로 복사해 `build.py --lessons-dir`로 빌드한다(앱 코드는 그대로).
// 장터 표(data/market.sql) 기준: items에서 price >= 200은 5행, price < 200은 35행(그래서 「<」는 틀린 결과).
export const CHAPTER = { id: 1, title: "시험용 장터" };
export const LESSONS = [
  {
    id: "1-1", chapter: 1, title: "시험용 조립", goal: "카드로 조건 있는 조회 만들기",
    summary: ["WHERE로 조건에 맞는 행만 본다"],
    cards: [{ say: "시험용 설명 카드예요. 다음으로 넘겨 주세요." }],
    items: [
      {
        type: "choice", concept: "where", q: "조건에 맞는 행만 고르는 낱말은?",
        options: ["WHERE", "FROM", "SELECT"], answer: 0, explain: "WHERE 뒤에 조건을 써요.",
      },
      {
        id: "fx-build-1", type: "build", concept: "where",
        q: "값이 200엽전 이상인 물건의 이름과 값을 보여 줘",
        cards: ["SELECT", "name", ",", "price", "FROM", "items", "WHERE", "price", ">=", "200"],
        extra: ["customers", "<"],
        tables: ["items"],
        hints: ["값 조건은 WHERE 뒤에 써요.", "SELECT, FROM, WHERE, >= 카드가 필요해요."],
        explain: "WHERE price >= 200 은 값이 200 이상인 행만 남겨요.",
      },
    ],
  },
];
