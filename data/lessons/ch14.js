// 14장 「줄마다 순위」 (설계 §6: ROW_NUMBER·RANK·DENSE_RANK, PARTITION BY / 장터 예: 가게마다 가장 잘 팔린 물건).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 14
// 14장 낱말은 13장까지에 OVER·PARTITION·ROW_NUMBER·RANK·DENSE_RANK를 더한 것이다. 분석 도깨비 묶음(14~17장)의 첫 장.
// - 창 함수는 SQLite 3.25부터 있다. 이 장터 실행기(sql.js 1.15.2)는 SQLite 3.54.0이다. MySQL은 8.0 전에는 창 함수가 없었다(말로만).
//   ROW_NUMBER·RANK·DENSE_RANK·PARTITION BY·OVER 안 ORDER BY의 뜻은 SQLite·MySQL 8·PostgreSQL에서 같아 「이 장터에서는」을 붙이지 않는다.
//   엔진마다 다른 것(판정 R36): ORDER BY … DESC에서 빈칸(NULL)의 자리. 이 장터(SQLite)는 빈칸을 가장 작은 값으로 쳐서 DESC면 맨 뒤,
//   PostgreSQL은 DESC면 맨 앞이다. 그래서 나이로 줄 세우는 순위는 빈칸이 없는 무리(여우, age >= 57 등)만 쓰거나
//   「WHERE age IS NOT NULL)」로 빈칸을 빼 둔다(14-4-b2·14-5-b2). 이 카드는 닫는 괄호가 붙어 빼면 오류라 drop-one에 걸리지 않는다.
// - 순위로 거르기: 같은 SELECT의 WHERE에서 창 함수 별칭(rk)을 부르면 「misuse of aliased window function rk」, 창 함수를 바로 쓰면
//   「misuse of window function RANK()」. 앞 문장은 data/errors.js의 창 함수 설명에 맞지 않아 대체 문장이 나왔다 → 이 작업(15a)에서
//   match를 「misuse of (aliased )?window function」으로 넓혔다(tests/unit/grade.test.js에 시험 추가). OVER 없는 ROW_NUMBER()도 같은 오류.
// - OVER 안 ORDER BY는 번호 매길 차례만 정하고 결과 행의 차례는 정하지 않는다(14-1 둘째 카드: 바깥 ORDER BY name).
//   차례를 말하는 정답은 바깥 ORDER BY를 고유하게 둔다(R13). ROW_NUMBER를 쓰는 조립은 OVER 안 ORDER BY에도 둘째 기준(item_id·customer_id)을
//   달았다 — 동점에서 누가 앞 번호인지 정해지지 않기 때문(저장 순서를 거꾸로 한 데이터베이스에서 인절미·한지 번호가 바뀌는 것을 확인).
// - 확인한 값(data/market.sql, openEngine, SQLite 3.54.0):
//   같은 값 물건(5장): 6엽전 인절미(6)·한지(24), 8엽전 도토리묵(3)·꿀떡(10), 9엽전 메밀전(5)·약과(8), 12엽전 국밥(1)·감초(14),
//     25엽전 수육(2)·오미자청(15), 28엽전 구기자(19)·복주머니(28). 한 가게 안에서는 값이 같은 물건이 없다.
//   6~8엽전(인절미·한지 6, 송편 7, 도토리묵·꿀떡 8): ROW_NUMBER(값, item_id) 1·2·3·4·5 / RANK 1·1·3·4·4 / DENSE_RANK 1·1·2·3·3.
//   25~30엽전 비싼 차례(인삼차 30, 구기자·복주머니 28, 수육·오미자청 25): RANK 1·2·2·4·4 / DENSE_RANK 1·2·2·3·3.
//   8번 가게 값 차례: 장승 350·쇠솥 260·놋그릇 190·다듬이방망이 170·빨래방망이 130. 3번: 감초 12·쌍화탕 22·오미자청 25·인삼차 30·산삼 120.
//   1번 비싼 차례: 수육 25·국밥 12·막걸리 10·메밀전 9·도토리묵 8. 7번: 금방망이 400·도깨비방망이 320·은방망이 280·작은 방망이 180·방망이 손잡이 150.
//   가게마다 가장 비싼 물건: 수육·약과·산삼·약초 주머니·비단 주머니·갓·금방망이·장승(8행). 가장 싼: 도토리묵·식혜·감초·도라지·한지·보따리·방망이 손잡이·빨래방망이.
//   나이: 도깨비 73살 넷(쇠뭉치 3·소란이 17·둥실이 32·꾀돌이 33), 72 어슬렁, 59 깨비동, 58 번쩍이, 57 굴렁이, 빈칸 돌쇠.
//     사람 75 배누리(37), 72 손지우(2)·이도윤(47), 68 임바다, 64 오이든, 빈칸 4명. 여우 59 보람(36)·연화(52), 42 여름이·초롱 … 빈칸 없음(12명).
//     59살 이상 13명. 종류마다 가장 나이 많은 손님: RANK 7명(도깨비 넷, 배누리, 보람·연화) / ROW_NUMBER(customer_id) 3명(쇠뭉치·배누리·보람).
// - 장터 예 「가게마다 가장 잘 팔린 물건」(14-4 첫 카드·14-5 카드, 객관식·빈자리): 완료 주문의 수량을 물건마다 더해(10장 매출 정의의 「완료」)
//   가게마다 RANK, 중간 표 ranked에서 rk = 1. → 수육 86·인절미 99·인삼차 102·도라지 99·짚신 76·복주머니 69·도깨비방망이 17·다듬이방망이 19(8행, 동점 없음).
//   취소까지 세면 국밥 91·인절미 108·인삼차 115·도라지 107·부채 82·짚신 82·복주머니 72·방망이 손잡이 21·다듬이방망이 19 → 구름 잡화점이 동점이라 9행.
//   RANK를 고른 까닭: 「가장 잘 팔린」이 둘이면 둘 다 보여 주는 것이 맞는 답이다. 한 개만 고르려면 ROW_NUMBER에 둘째 기준을 단다(14-4 객관식에서 설명).
//   금액(수량 × 값)으로 세면 6번 가게 1위가 갓 3080(수량은 28개)이라 「잘 팔린」은 수량으로 정했다.
//   이 SQL은 세 표 JOIN + WHERE + GROUP BY + 창 함수 + 바깥 거르기라 카드 30칸·더미 12장(정답 10장) 안에 들어가지 않는다(가장 짧게 나눠도
//   취소까지 센 꼴이 13장, 완료만 세면 15장 이상). 13장이 진짜 매출을 설명 카드·객관식에 두고 조립은 items 합계로 한 것처럼,
//   대표 조립(14-4-b1·14-5-b1)은 같은 「그룹마다 1등」 모양을 items로 놓는다: 가게마다 가장 비싼 물건.
// - 덩어리 카드(쓰기 안내 7절, 14장부터): 창 함수는 「RANK() OVER」, 「(PARTITION BY shop_id」, 「ORDER BY price DESC) AS rk」처럼 뜻 덩어리로 나눈다(30칸 안).
//   중간 표는 13장처럼 「WITH ranked AS」, 여는 카드 「(SELECT shop_id, name, price,」, 닫는 카드 「FROM items)」. 본문은 「SELECT * FROM ranked」·「WHERE rk = 1」
//   두 덩어리로 둔다(본문 뼈대 낱말을 낱장으로 두면 12장을 넘는다). 창 함수 없는 레슨 조립(14-1~14-3)은 SELECT·FROM·WHERE를 지금처럼 한 장씩.
export const CHAPTER = { id: 14, title: "줄마다 순위" };

export const LESSONS = [
  {
    id: "14-1", chapter: 14, title: "줄마다 번호",
    goal: "ROW_NUMBER() OVER로 행을 그대로 둔 채 번호 열을 붙인다",
    summary: [
      "ROW_NUMBER() OVER (ORDER BY …)",
      "행 수는 그대로, 번호 열이 붙어요",
      "OVER 안 차례 ≠ 바깥 ORDER BY 차례",
    ],
    cards: [
      {
        say: "뚝딱 공방(8번 가게) 물건에 비싼 차례로 번호를 붙여요. ROW_NUMBER(로우 넘버)는 1, 2, 3… 번호를 주고, OVER(오버) 괄호 안 ORDER BY가 그 차례를 정해요. GROUP BY와 달리 행 5개가 그대로 남아요!",
        sql: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items\nWHERE shop_id = 8\nORDER BY rn",
      },
      {
        say: "바깥 ORDER BY만 name으로 바꿨어요. 행은 이름 가나다 차례로 서는데 rn은 그대로 값 차례 번호예요. OVER 안 ORDER BY는 번호 매길 차례, 바깥 ORDER BY는 보여 줄 차례! item_id는 값이 같을 때 쓸 둘째 기준이에요.",
        sql: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items\nWHERE shop_id = 8\nORDER BY name",
      },
    ],
    items: [
      {
        type: "choice", concept: "rownumber",
        q: "SELECT에 ROW_NUMBER() OVER (…)를 붙이면 결과 행 수는?",
        options: ["원래 행 수 그대로이고 번호 열이 하나 붙는다", "번호마다 한 행으로 줄어든다", "1행이 된다"],
        answer: 0,
        explain: "창 함수는 행을 묶어 줄이지 않아요. 행마다 번호 하나를 옆에 붙일 뿐이에요. 묶어 줄이는 건 GROUP BY예요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name,\n  ROW_NUMBER() OVER (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items",
        options: ["40행", "8행", "1행"],
        answer: 0,
        explain: "물건 40가지가 모두 남고 rn이 1부터 40까지 붙어요. 8은 가게 수예요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "첫 카드의 SQL 결과에서 쇠솥의 rn 값은?",
        code: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items\nWHERE shop_id = 8\nORDER BY rn",
        options: ["2", "1", "39"],
        answer: 0,
        explain: "장승 350엽전이 1, 쇠솥 260엽전이 2예요. 39는 쇠솥의 item_id예요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "OVER 괄호 안 ORDER BY가 정하는 것은?",
        options: ["번호를 매기는 차례", "결과 행을 보여 주는 차례", "결과에 남길 행"],
        answer: 0,
        explain: "OVER 안 ORDER BY는 누구에게 1번을 줄지만 정해요. 행을 보여 주는 차례는 바깥 ORDER BY, 남길 행은 WHERE가 정해요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "둘째 카드처럼 바깥을 ORDER BY name으로 둔 이 SQL에서 맨 위 행의 rn은?",
        code: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items\nWHERE shop_id = 8\nORDER BY name",
        options: ["3", "1", "5"],
        answer: 0,
        explain: "가나다 차례로 놋그릇이 맨 위인데, 놋그릇은 190엽전으로 셋째로 비싸 rn이 3이에요. 줄 선 차례와 번호는 따로예요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "OVER 안 ORDER BY에 item_id를 둘째 기준으로 붙인 까닭은?",
        options: ["값이 같은 물건끼리도 누가 앞 번호인지 하나로 정하려고", "item_id가 큰 물건에 1번을 주려고", "결과에 item_id 열을 보이려고"],
        answer: 0,
        explain: "ROW_NUMBER는 같은 값에도 번호를 하나씩 따로 줘요. 둘째 기준이 없으면 동점끼리 누가 앞 번호일지 실행할 때마다 달라질 수 있어요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "OVER를 빼먹은 이 SQL은 어떻게 될까요?",
        code: "SELECT name,\n  ROW_NUMBER() AS rn\nFROM items",
        options: ["오류가 난다", "물건마다 1부터 번호가 붙는다", "rn이 모두 1이다"],
        answer: 0,
        explain: "ROW_NUMBER는 OVER (…)와 짝으로만 써요. 무엇을 기준으로 번호를 매길지 몰라 단서가 나와요.",
      },
      {
        type: "blank", concept: "rownumber",
        q: "8번 가게 물건에 비싼 차례로 번호가 붙게 빈자리를 채워 보세요.",
        code: "SELECT name, price,\n  ROW_NUMBER() ___ (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items\nWHERE shop_id = 8\nORDER BY rn",
        chips: ["OVER", "AS", "BY"],
        answer: 0,
        explain: "ROW_NUMBER() 바로 뒤에 OVER, 그 괄호 안에 번호 차례를 적어요. AS나 BY는 그 자리에 올 수 없어 단서가 나와요.",
      },
      {
        type: "order", concept: "rownumber",
        q: "7번 가게 물건에 비싼 차례로 번호를 붙여 번호 차례로 보게 줄을 놓아 보세요.",
        lines: ["SELECT name, price,", "ROW_NUMBER() OVER (", "ORDER BY price DESC, item_id", ") AS rn", "FROM items WHERE shop_id = 7", "ORDER BY rn"],
        expect: "name | price | rn\n금방망이 | 400 | 1\n도깨비방망이 | 320 | 2\n은방망이 | 280 | 3\n작은 방망이 | 180 | 4\n방망이 손잡이 | 150 | 5",
        explain: "괄호 안 ORDER BY로 번호를 매기고, 맨 끝 ORDER BY rn으로 번호 차례로 세워요. 금방망이 400엽전이 1번이에요.",
      },
      {
        id: "14-1-b1", type: "build", concept: "rownumber",
        q: "산삼 약방(3번 가게) 물건에 싼 차례로 번호를 붙이되, 행은 물건 번호(item_id) 차례로 보여 줘",
        cards: ["SELECT", "name, price,", "ROW_NUMBER() OVER", "(ORDER BY price, item_id)", "AS rn", "FROM", "items", "WHERE", "shop_id = 3", "ORDER BY item_id"],
        extra: ["(ORDER BY price DESC, item_id)", "ORDER BY rn"],
        tables: ["items"],
        hints: [
          "번호는 값이 싼 차례로 매기고, 결과 행은 물건 번호 차례로 세워요. 두 차례는 따로 적어요.",
          "ROW_NUMBER() OVER 뒤 괄호에는 값 오름차순, 맨 끝 바깥 ORDER BY에는 item_id예요.",
        ],
        explain: "산삼(11번)이 맨 위인데 rn은 5, 감초(14번)가 rn 1이에요. 번호 차례와 줄 선 차례가 따로죠? 바깥을 ORDER BY rn으로 두면 감초부터 서고, DESC면 산삼이 1번이에요.",
      },
      {
        id: "14-1-b2", type: "build", concept: "rownumber",
        q: "여우 손님에게 나이 많은 차례로 번호를 붙여 줘. 나이가 같으면 손님 번호가 작은 쪽이 먼저야",
        cards: ["SELECT", "name, age,", "ROW_NUMBER() OVER", "(ORDER BY age DESC,", "customer_id) AS rn", "FROM", "customers", "WHERE", "kind = '여우'"],
        extra: ["customer_id DESC) AS rn", "(ORDER BY age,"],
        tables: ["customers"],
        hints: [
          "여우 손님만 고르고 나이가 많은 쪽부터 번호를 줘요. 동점을 가를 둘째 기준도 괄호 안에 넣어요.",
          "OVER 괄호는 「(ORDER BY age DESC,」로 열고 「customer_id) AS rn」으로 닫아요. 그 뒤 FROM과 WHERE예요.",
        ],
        explain: "보람과 연화가 둘 다 59살인데, 번호가 작은 보람(36번)이 1번, 연화가 2번이에요. customer_id DESC면 연화가 1번이 되고, age 오름차순이면 막내 은호가 1번이에요.",
      },
      {
        type: "check", concept: "rownumber",
        q: "14-1에서 배운 것으로 맞는 말은?",
        options: [
          "ROW_NUMBER() OVER (ORDER BY …)는 행을 그대로 두고 그 차례로 번호 열을 붙인다",
          "OVER 안 ORDER BY가 결과 행의 차례도 정한다",
          "ROW_NUMBER는 GROUP BY처럼 행을 묶어 줄인다",
        ],
        answer: 0,
        explain: "번호 차례는 OVER 안 ORDER BY, 보여 주는 차례는 바깥 ORDER BY예요. 동점이 있으면 OVER 안에 둘째 기준을 달아요.",
      },
    ],
  },
  {
    id: "14-2", chapter: 14, title: "같은 값, 같은 순위",
    goal: "동점일 때 세 순위 함수가 어떻게 다른지 안다",
    summary: [
      "ROW_NUMBER 1, 2, 3 (동점도 따로)",
      "RANK 1, 1, 3 (같은 순위, 건너뜀)",
      "DENSE_RANK 1, 1, 2 (건너뛰지 않음)",
    ],
    cards: [
      {
        say: "6~8엽전 물건 다섯에 순위 세 가지를 붙였어요. 인절미와 한지는 둘 다 6엽전! ROW_NUMBER는 1, 2, 3, RANK(랭크)는 같은 값에 같은 순위를 주고 건너뛰어 1, 1, 3, DENSE_RANK(덴스 랭크)는 1, 1, 2예요.",
        sql: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price, item_id) AS rn,\n  RANK() OVER (ORDER BY price) AS rk,\n  DENSE_RANK() OVER (\n    ORDER BY price) AS drk\nFROM items\nWHERE price BETWEEN 6 AND 8\nORDER BY price, item_id",
      },
      {
        say: "73살 도깨비 손님이 넷이에요. RANK는 넷 다 1위, 다음 72살 어슬렁은 5위! DENSE_RANK는 어슬렁이 2위예요. 내 앞에 몇 명이 있는지는 RANK, 몇 번째로 많은 나이인지는 DENSE_RANK로 봐요.",
        sql: "SELECT name, age,\n  RANK() OVER (\n    ORDER BY age DESC) AS rk,\n  DENSE_RANK() OVER (\n    ORDER BY age DESC) AS drk\nFROM customers\nWHERE kind = '도깨비' AND age >= 57\nORDER BY age DESC, customer_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "rank",
        q: "RANK가 같은 값을 만나면 어떻게 할까요?",
        options: ["같은 순위를 주고, 다음 순위는 그 수만큼 건너뛴다", "같은 순위를 주고, 다음 순위는 바로 이어진다", "같은 값에도 번호를 하나씩 따로 준다"],
        answer: 0,
        explain: "RANK는 1, 1, 3처럼 건너뛰어요. 바로 이어지는 1, 1, 2는 DENSE_RANK, 하나씩 따로인 1, 2, 3은 ROW_NUMBER예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "첫 카드의 SQL 결과에서 송편(7엽전)의 rk 값은?",
        code: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price, item_id) AS rn,\n  RANK() OVER (ORDER BY price) AS rk,\n  DENSE_RANK() OVER (\n    ORDER BY price) AS drk\nFROM items\nWHERE price BETWEEN 6 AND 8\nORDER BY price, item_id",
        options: ["3", "2", "1"],
        answer: 0,
        explain: "6엽전 둘이 함께 1위라서 송편 앞에 두 개가 있어요. 그래서 RANK는 3이에요. 2는 송편의 drk예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "같은 결과에서 꿀떡(8엽전)의 drk 값은?",
        options: ["3", "4", "5"],
        answer: 0,
        explain: "DENSE_RANK는 값 6, 7, 8에 1, 2, 3을 줘요. 4는 꿀떡의 rk, 5는 꿀떡의 rn이에요.",
      },
      {
        type: "choice", concept: "rank",
        q: "둘째 카드의 SQL 결과에서 어슬렁(72살)의 rk 값은?",
        code: "SELECT name, age,\n  RANK() OVER (\n    ORDER BY age DESC) AS rk,\n  DENSE_RANK() OVER (\n    ORDER BY age DESC) AS drk\nFROM customers\nWHERE kind = '도깨비' AND age >= 57\nORDER BY age DESC, customer_id",
        options: ["5", "2", "1"],
        answer: 0,
        explain: "앞에 73살 넷이 있어 RANK는 5예요. 2는 어슬렁의 drk예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "값이 같은 물건에 ROW_NUMBER를 매길 때 OVER 안에 둘째 기준을 다는 까닭은?",
        options: ["같은 값끼리 누가 앞 번호일지 정해지지 않아서", "ROW_NUMBER는 같은 값에 같은 번호를 줘서", "둘째 기준이 없으면 오류가 나서"],
        answer: 0,
        explain: "ROW_NUMBER는 동점에도 다른 번호를 줘야 하니 누가 먼저인지 정해 둬요. 둘째 기준이 없어도 오류는 아니지만 번호가 그때그때 바뀔 수 있어요.",
      },
      {
        type: "choice", concept: "rank",
        q: "값이 6~8엽전인 물건에 같은 값은 같은 순위로, 다음 순위는 건너뛰지 않게 매긴 결과는?",
        options: [
          { sql: "SELECT name, price,\n  DENSE_RANK() OVER (\n    ORDER BY price) AS rk\nFROM items\nWHERE price BETWEEN 6 AND 8\nORDER BY price, item_id" },
          { sql: "SELECT name, price,\n  RANK() OVER (\n    ORDER BY price) AS rk\nFROM items\nWHERE price BETWEEN 6 AND 8\nORDER BY price, item_id" },
          { sql: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price, item_id) AS rk\nFROM items\nWHERE price BETWEEN 6 AND 8\nORDER BY price, item_id" },
        ],
        answer: 0, tables: ["items"],
        explain: "1, 1, 2, 3, 3이 정답이에요. 1, 1, 3, 4, 4는 건너뛰는 RANK, 1부터 5까지는 동점도 따로 세는 ROW_NUMBER예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "RANK로 1위가 넷이면 그다음 손님의 순위는?",
        options: ["5위", "2위", "4위"],
        answer: 0,
        explain: "1위 넷이 1~4 자리를 함께 써서 다음은 5위예요. DENSE_RANK라면 2위예요.",
      },
      {
        type: "blank", concept: "rank",
        q: "같은 값은 같은 순위로, 다음 순위는 건너뛰게 빈자리를 채워 보세요.",
        code: "SELECT name, price,\n  ___() OVER (\n    ORDER BY price) AS rk\nFROM items\nWHERE price BETWEEN 6 AND 8",
        chips: ["RANK", "DENSE_RANK", "ROW_NUMBER"],
        answer: 0,
        explain: "RANK면 1, 1, 3, 4, 4예요. DENSE_RANK는 건너뛰지 않아 1, 1, 2, 3, 3, ROW_NUMBER는 동점도 따로 번호를 줘요.",
      },
      {
        type: "order", concept: "rank",
        q: "여우 손님의 나이 순위를 건너뛰지 않게 매기도록 줄을 놓아 보세요.",
        lines: ["SELECT name, age,", "DENSE_RANK() OVER (", "ORDER BY age DESC", ") AS drk", "FROM customers", "WHERE kind = '여우'"],
        explain: "보람·연화 59살이 1, 하연 43살이 2, 여름이·초롱 42살이 3이에요. 여우 손님은 나이 빈칸이 없어요.",
      },
      {
        id: "14-2-b1", type: "build", concept: "rank",
        q: "값이 6~8엽전인 물건에 싼 차례로 순위를 매겨 줘. 같은 값은 같은 순위, 다음 순위는 건너뛰어",
        cards: ["SELECT", "name, price,", "RANK() OVER", "(ORDER BY price)", "AS rk", "FROM", "items", "WHERE", "price BETWEEN 6 AND 8"],
        extra: ["DENSE_RANK() OVER", "ROW_NUMBER() OVER"],
        tables: ["items"],
        hints: [
          "6~8엽전 물건만 고르고, 값이 같으면 같은 순위를 주되 다음 순위는 그 수만큼 건너뛰어요.",
          "건너뛰는 순위 함수 RANK() OVER 뒤에 값 오름차순 괄호, 그리고 AS rk예요.",
        ],
        explain: "인절미·한지 1, 송편 3, 도토리묵·꿀떡 4예요. DENSE_RANK면 송편이 2, ROW_NUMBER면 동점에도 번호가 따로 붙어요.",
      },
      {
        id: "14-2-b2", type: "build", concept: "rank",
        q: "57살 이상 도깨비 손님의 나이 순위를 빈 번호 없이 매겨 줘",
        cards: ["SELECT", "name, age,", "DENSE_RANK() OVER", "(ORDER BY age DESC)", "AS drk", "FROM", "customers", "WHERE", "kind = '도깨비'", "AND age >= 57"],
        extra: ["RANK() OVER", "(ORDER BY age)"],
        tables: ["customers"],
        hints: [
          "도깨비이면서 57살 이상인 손님만 고르고, 나이 많은 쪽부터 순위를 빈 번호 없이 이어 매겨요.",
          "DENSE_RANK() OVER 뒤에 나이 내림차순 괄호, AS drk, 조건 둘은 AND로 이어요.",
        ],
        explain: "73살 넷이 1, 어슬렁 2, 깨비동 3, 번쩍이 4, 굴렁이 5예요. RANK면 어슬렁이 5위, 오름차순이면 굴렁이가 1위예요.",
      },
      {
        type: "check", concept: "rank",
        q: "14-2에서 배운 것으로 맞는 말은?",
        options: [
          "동점에서 RANK는 1, 1, 3, DENSE_RANK는 1, 1, 2, ROW_NUMBER는 1, 2, 3이다",
          "RANK와 DENSE_RANK는 동점이 있어도 늘 같다",
          "ROW_NUMBER는 같은 값에 같은 번호를 준다",
        ],
        answer: 0,
        explain: "세 함수는 동점이 있을 때만 갈려요. 동점이 없으면 셋이 같은 번호를 줘요.",
      },
    ],
  },
  {
    id: "14-3", chapter: 14, title: "가게마다 따로 순위",
    goal: "PARTITION BY로 무리를 나눠 무리마다 1위부터 순위를 매긴다",
    summary: [
      "PARTITION BY 무리, 그다음 ORDER BY",
      "무리가 바뀌면 순위가 1부터 다시",
      "GROUP BY와 달리 행은 그대로",
    ],
    cards: [
      {
        say: "PARTITION BY(파티션 바이)는 순위를 매길 무리를 나눠요. 가게마다 따로 1위부터 다시 세요! 1번 가게는 수육, 7번 가게는 금방망이가 1위예요. GROUP BY처럼 줄이지 않아서 행은 그대로 10개예요.",
        sql: "SELECT shop_id, name, price,\n  RANK() OVER (\n    PARTITION BY shop_id\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE shop_id IN (1, 7)\nORDER BY shop_id, rk",
      },
      {
        say: "이번엔 손님 종류가 무리예요. 도깨비 무리는 73살 넷이 모두 1위, 사람 무리는 배누리 75살이 1위, 여우 무리는 59살 둘이 1위! 무리가 바뀌면 순위가 1부터 다시 시작해요.",
        sql: "SELECT kind, name, age,\n  RANK() OVER (\n    PARTITION BY kind\n    ORDER BY age DESC) AS rk\nFROM customers\nWHERE age >= 59\nORDER BY kind, rk, customer_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "partition",
        q: "OVER 안 PARTITION BY shop_id가 하는 일은?",
        options: ["가게마다 따로 순위를 매기게 무리를 나눈다", "가게마다 한 행으로 묶어 줄인다", "가게 번호 차례로 결과 행을 세운다"],
        answer: 0,
        explain: "PARTITION BY는 순위를 셀 무리만 나눠요. 행은 줄지 않고, 보여 주는 차례는 여전히 바깥 ORDER BY가 정해요.",
      },
      {
        type: "choice", concept: "partition",
        q: "첫 카드의 이 SQL 결과는 몇 행일까요?",
        code: "SELECT shop_id, name, price,\n  RANK() OVER (\n    PARTITION BY shop_id\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE shop_id IN (1, 7)\nORDER BY shop_id, rk",
        options: ["10행", "2행", "40행"],
        answer: 0,
        explain: "두 가게의 물건 5가지씩, 10행이 그대로예요. 2는 가게 수, 40은 물건 전체예요.",
      },
      {
        type: "choice", concept: "partition",
        q: "같은 결과에서 7번 가게의 rk가 3인 물건은?",
        options: ["은방망이", "막걸리", "작은 방망이"],
        answer: 0,
        explain: "7번 가게는 금방망이·도깨비방망이·은방망이 차례예요. 막걸리는 1번 가게의 3위, 작은 방망이는 7번 가게의 4위예요.",
      },
      {
        type: "choice", concept: "partition",
        q: "GROUP BY shop_id와 OVER (PARTITION BY shop_id …)의 차이로 맞는 것은?",
        options: ["GROUP BY는 가게마다 한 행으로 줄이고, PARTITION BY는 행을 그대로 둔다", "GROUP BY는 행을 그대로 두고, PARTITION BY는 가게마다 한 행으로 줄인다", "둘은 같은 결과를 낸다"],
        answer: 0,
        explain: "둘 다 가게로 무리를 짓지만, GROUP BY는 무리마다 한 행을 남기고 PARTITION BY는 행마다 무리 안 순위를 붙여요.",
      },
      {
        type: "choice", concept: "partition",
        q: "둘째 카드의 SQL 결과에서 사람 무리의 오이든(64살) rk 값은?",
        code: "SELECT kind, name, age,\n  RANK() OVER (\n    PARTITION BY kind\n    ORDER BY age DESC) AS rk\nFROM customers\nWHERE age >= 59\nORDER BY kind, rk, customer_id",
        options: ["5", "4", "10"],
        answer: 0,
        explain: "사람 무리에서 배누리 75, 손지우·이도윤 72, 임바다 68 다음이라 5위예요. 4는 DENSE_RANK였을 때, 10은 무리를 나누지 않고 13명 전체에서 셌을 때예요.",
      },
      {
        type: "choice", concept: "partition",
        q: "그 SQL에서 PARTITION BY kind를 빼면 순위는 어떻게 될까요?",
        options: ["종류와 상관없이 59살 이상 13명 전체에서 한 번에 매긴다", "종류마다 한 행만 남는다", "오류가 난다"],
        answer: 0,
        explain: "무리를 나누지 않으면 13명 전체가 한 무리예요. 75살 배누리 혼자 1위, 73살 넷이 2위가 돼요.",
      },
      {
        type: "choice", concept: "partition",
        q: "1·2번 가게에서 가게마다 가장 싼 물건이 1위가 되게 순위를 매긴 결과는?",
        options: [
          { sql: "SELECT shop_id, name, price,\n  RANK() OVER (\n    PARTITION BY shop_id\n    ORDER BY price) AS rk\nFROM items\nWHERE shop_id IN (1, 2)\nORDER BY shop_id, rk" },
          { sql: "SELECT shop_id, name, price,\n  RANK() OVER (\n    ORDER BY price) AS rk\nFROM items\nWHERE shop_id IN (1, 2)\nORDER BY shop_id, rk" },
          { sql: "SELECT shop_id, name, price,\n  RANK() OVER (\n    PARTITION BY shop_id\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE shop_id IN (1, 2)\nORDER BY shop_id, rk" },
        ],
        answer: 0, tables: ["items"],
        explain: "1번 가게에서 도토리묵 8엽전이 1위인 표가 정답이에요. 무리를 안 나누면 2번 가게 식혜가 전체 1위라 순위가 섞이고, DESC면 수육이 1위예요.",
      },
      {
        type: "blank", concept: "partition",
        q: "가게마다 따로 순위가 매겨지게 빈자리를 채워 보세요.",
        code: "SELECT shop_id, name, price,\n  RANK() OVER (\n    ___ BY shop_id\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE shop_id IN (1, 7)",
        chips: ["PARTITION", "GROUP", "ORDER"],
        answer: 0,
        explain: "OVER 안에서 무리를 나누는 말은 PARTITION BY예요. GROUP BY는 OVER 안에 올 수 없고, ORDER BY를 두 번 쓰면 단서가 나와요.",
      },
      {
        type: "order", concept: "partition",
        q: "59살 이상 손님에게 종류마다 나이 순위를 매기게 줄을 놓아 보세요.",
        lines: ["SELECT kind, name, age,", "RANK() OVER (", "PARTITION BY kind", "ORDER BY age DESC) AS rk", "FROM customers", "WHERE age >= 59"],
        explain: "OVER 괄호 안에서는 PARTITION BY가 먼저, ORDER BY가 다음이에요. 무리를 나눈 뒤 무리 안 차례를 정해요.",
      },
      {
        id: "14-3-b1", type: "build", concept: "partition",
        q: "가게마다 물건 값 순위를 비싼 차례로 매겨 줘",
        cards: ["SELECT", "shop_id, name, price,", "RANK() OVER", "(PARTITION BY shop_id", "ORDER BY price DESC) AS rk", "FROM", "items"],
        extra: ["(PARTITION BY item_id", "ORDER BY price) AS rk"],
        tables: ["items"],
        hints: [
          "가게를 무리로 나누고, 무리 안에서 값이 비싼 쪽부터 순위를 매겨요. 물건 40가지가 모두 남아요.",
          "RANK() OVER 다음 괄호는 PARTITION BY shop_id로 열고 ORDER BY price DESC) AS rk로 닫아요.",
        ],
        explain: "가게마다 1위부터 5위까지 붙어요. item_id로 나누면 물건마다 무리가 따로라 모두 1위, 오름차순이면 가장 싼 물건이 1위예요.",
      },
      {
        id: "14-3-b2", type: "build", concept: "partition",
        q: "59살 이상 손님에게 손님 종류마다 나이 많은 차례로 순위를 매겨 줘",
        cards: ["SELECT", "kind, name, age,", "RANK() OVER", "(PARTITION BY kind", "ORDER BY age DESC) AS rk", "FROM", "customers", "WHERE", "age >= 59"],
        extra: ["(PARTITION BY village", "DENSE_RANK() OVER"],
        tables: ["customers"],
        hints: [
          "59살 이상만 고르고, 손님 종류를 무리로 나눠 무리 안에서 나이 많은 쪽부터 순위를 매겨요.",
          "RANK() OVER 다음 괄호는 PARTITION BY kind로 열고 나이 내림차순과 AS rk로 닫아요.",
        ],
        explain: "13명이 종류마다 1위부터 다시 세져요. village로 나누면 마을마다 순위가 되고, DENSE_RANK면 도깨비 어슬렁이 5위가 아니라 2위예요.",
      },
      {
        type: "check", concept: "partition",
        q: "14-3에서 배운 것으로 맞는 말은?",
        options: [
          "PARTITION BY로 무리를 나누면 무리마다 순위가 1부터 다시 매겨지고 행은 그대로다",
          "PARTITION BY는 GROUP BY처럼 무리마다 한 행만 남긴다",
          "OVER 안에서 ORDER BY를 PARTITION BY보다 먼저 쓴다",
        ],
        answer: 0,
        explain: "OVER (PARTITION BY 무리 ORDER BY 차례) 꼴이에요. 행은 그대로, 무리 안 순위만 붙어요.",
      },
    ],
  },
  {
    id: "14-4", chapter: 14, title: "그룹마다 1등",
    goal: "순위 표를 WITH로 먼저 만들고 바깥 WHERE로 1등만 고른다",
    summary: [
      "순위는 WHERE가 거른 뒤에 매겨져요",
      "WITH 순위 표 → 바깥 WHERE rk = 1",
      "동점 1등을 다 보려면 RANK",
    ],
    cards: [
      {
        say: "14장 대표 문제 「가게마다 가장 잘 팔린 물건」! 완료 주문의 수량을 물건마다 더해 가게마다 RANK로 순위를 매긴 중간 표 ranked를 만들고, 본문에서 rk = 1만 남겨요. 가게 8곳의 1등이에요.",
        sql: "WITH ranked AS (\n  SELECT i.shop_id, i.name,\n    SUM(oi.qty) AS qty,\n    RANK() OVER (\n      PARTITION BY i.shop_id\n      ORDER BY SUM(oi.qty) DESC) AS rk\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  JOIN orders o\n    ON o.order_id = oi.order_id\n  WHERE o.status = '완료'\n  GROUP BY i.shop_id, i.item_id,\n    i.name)\nSELECT shop_id, name, qty\nFROM ranked\nWHERE rk = 1\nORDER BY shop_id, name",
      },
      {
        say: "순위는 WHERE가 행을 거른 다음에 매겨져요. 그래서 같은 SELECT의 WHERE에서 rk를 부르면 단서가 나와요. 13장 WITH로 순위 표를 먼저 만들고 바깥 WHERE에서 rk = 1! 가게마다 가장 비싼 물건이에요.",
        sql: "WITH ranked AS (\n  SELECT shop_id, name, price,\n    RANK() OVER (\n      PARTITION BY shop_id\n      ORDER BY price DESC) AS rk\n  FROM items)\nSELECT *\nFROM ranked\nWHERE rk = 1\nORDER BY shop_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "partition",
        q: "같은 SELECT의 WHERE에서 순위를 거른 이 SQL은 어떻게 될까요?",
        code: "SELECT shop_id, name,\n  RANK() OVER (\n    PARTITION BY shop_id\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE rk = 1",
        options: ["오류가 난다", "가게마다 가장 비싼 물건 8행이 나온다", "금방망이 1행만 나온다"],
        answer: 0,
        explain: "WHERE가 행을 거를 때는 아직 rk가 없어서 단서가 나와요. 순위 표를 먼저 만든 뒤 바깥에서 걸러야 해요.",
      },
      {
        type: "choice", concept: "partition",
        q: "순위(rk)로 1등만 고르는 바른 방법은?",
        options: ["WITH나 FROM 안 서브쿼리로 순위 표를 만들고 바깥 WHERE에서 거른다", "OVER 괄호 안에 WHERE rk = 1을 넣는다", "같은 SELECT의 WHERE에 RANK() OVER (…) = 1을 쓴다"],
        answer: 0,
        explain: "순위 표를 중간 표로 두면 바깥에게 rk는 그냥 열이라 WHERE로 걸러져요. 창 함수를 같은 SELECT의 WHERE에 바로 써도 단서가 나와요.",
      },
      {
        type: "choice", concept: "partition",
        q: "첫 카드의 결과에서 1번 가게(도깨비 국밥집)의 1등 물건은?",
        options: ["수육", "국밥", "도토리묵"],
        answer: 0,
        explain: "완료 주문에서 수육이 86개로 1등, 국밥이 83개로 2등이에요. 취소 주문까지 세면 국밥이 91개로 앞서니 「완료」 조건이 중요해요.",
      },
      {
        type: "choice", concept: "partition",
        q: "가게마다 1등을 센 이 SQL의 결과 값은?",
        code: "WITH ranked AS (\n  SELECT i.shop_id, i.name,\n    SUM(oi.qty) AS qty,\n    RANK() OVER (\n      PARTITION BY i.shop_id\n      ORDER BY SUM(oi.qty) DESC) AS rk\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  JOIN orders o\n    ON o.order_id = oi.order_id\n  WHERE o.status = '완료'\n  GROUP BY i.shop_id, i.item_id,\n    i.name)\nSELECT COUNT(*) AS n\nFROM ranked\nWHERE rk = 1",
        options: ["8", "9", "38"],
        answer: 0,
        explain: "가게 8곳에 1등이 하나씩, 동점이 없어 8이에요. 38은 팔린 적 있는 물건 수예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "취소 주문까지 세어 가게마다 1등을 센 이 SQL의 결과 값은?",
        code: "WITH ranked AS (\n  SELECT i.shop_id, i.name,\n    SUM(oi.qty) AS qty,\n    RANK() OVER (\n      PARTITION BY i.shop_id\n      ORDER BY SUM(oi.qty) DESC) AS rk\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  GROUP BY i.shop_id, i.item_id,\n    i.name)\nSELECT COUNT(*) AS n\nFROM ranked\nWHERE rk = 1",
        options: ["9", "8", "5"],
        answer: 0,
        explain: "구름 잡화점의 짚신과 부채가 둘 다 82개라 RANK는 둘 다 1위예요. 그래서 가게는 8곳인데 1등은 9개예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "가게마다 1등을 고를 때 ROW_NUMBER 대신 RANK를 쓴 까닭은?",
        options: ["1등이 동점이면 둘 다 보여 주려고", "RANK만 PARTITION BY와 함께 쓸 수 있어서", "ROW_NUMBER는 1부터 세지 않아서"],
        answer: 0,
        explain: "가장 잘 팔린 물건이 둘이면 둘 다가 답이에요. 한 개만 고르려면 ROW_NUMBER의 OVER 안에 둘째 기준(item_id)을 달아 누가 1번인지 정해요.",
      },
      {
        type: "choice", concept: "partition",
        q: "둘째 카드의 결과에 rk 열이 있는 까닭은?",
        options: ["본문이 SELECT *로 순위 표의 열을 모두 골라서", "WHERE rk = 1이 열을 하나 더 만들어서", "PARTITION BY가 열을 하나 더 붙여서"],
        answer: 0,
        explain: "중간 표 ranked에 rk 열이 있고, 본문이 *로 모두 골랐어요. 모두 1인 rk를 빼고 싶으면 SELECT shop_id, name, price처럼 열을 골라요.",
      },
      {
        type: "blank", concept: "partition",
        q: "가게마다 가장 잘 팔린 물건이 나오게 빈자리를 채워 보세요.",
        code: "WITH ranked AS (\n  SELECT i.shop_id, i.name,\n    SUM(oi.qty) AS qty,\n    RANK() OVER (\n      PARTITION BY ___\n      ORDER BY SUM(oi.qty) DESC) AS rk\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  JOIN orders o\n    ON o.order_id = oi.order_id\n  WHERE o.status = '완료'\n  GROUP BY i.shop_id, i.item_id,\n    i.name)\nSELECT shop_id, name, qty\nFROM ranked\nWHERE rk = 1",
        chips: ["i.shop_id", "i.item_id", "i.name"],
        answer: 0,
        explain: "가게마다 1등이니 가게 번호로 무리를 나눠요. item_id나 name으로 나누면 물건마다 무리가 따로라 팔린 물건 38가지가 모두 1등이에요.",
      },
      {
        type: "order", concept: "partition",
        q: "가게마다 가장 싼 물건을 보게 줄을 놓아 보세요.",
        lines: ["WITH ranked AS (", "SELECT shop_id, name, price,", "RANK() OVER (PARTITION BY shop_id", "ORDER BY price) AS rk FROM items)", "SELECT * FROM ranked", "WHERE rk = 1"],
        explain: "중간 표에서 가게마다 값 오름차순 순위를 매기고, 본문이 rk = 1만 남겨요. 도토리묵·식혜·감초·도라지·한지·보따리·방망이 손잡이·빨래방망이예요.",
      },
      {
        id: "14-4-b1", type: "build", concept: "partition",
        q: "가게마다 가장 비싼 물건을 보여 줘",
        cards: ["WITH ranked AS", "(SELECT shop_id, name, price,", "RANK() OVER", "(PARTITION BY shop_id", "ORDER BY price DESC) AS rk", "FROM items)", "SELECT * FROM ranked", "WHERE rk = 1"],
        extra: ["ORDER BY price) AS rk", "(PARTITION BY item_id", "WHERE rk > 1"],
        tables: ["items"],
        hints: [
          "가게마다 값 순위를 매긴 중간 표를 먼저 만들고, 본문에서 순위가 1인 행만 남겨요.",
          "「WITH ranked AS」 다음에 순위 표 카드들을 놓고 「FROM items)」로 닫은 뒤, 본문에서 rk = 1로 걸러요.",
        ],
        explain: "「그룹마다 1등」 모양이에요! 수육·약과·산삼·약초 주머니·비단 주머니·갓·금방망이·장승, 8행이에요. 대표 문제의 판매 수량도 같은 뼈대로 셌어요. 오름차순이면 가장 싼 물건이에요.",
      },
      {
        id: "14-4-b2", type: "build", concept: "rank",
        q: "손님 종류마다 가장 나이 많은 손님을 보여 줘. 나이가 같으면 모두 보여 줘",
        cards: ["WITH ranked AS", "(SELECT kind, name, age,", "RANK() OVER", "(PARTITION BY kind", "ORDER BY age DESC) AS rk", "FROM customers", "WHERE age IS NOT NULL)", "SELECT * FROM ranked", "WHERE rk = 1"],
        extra: ["ROW_NUMBER() OVER", "(PARTITION BY village"],
        tables: ["customers"],
        hints: [
          "나이를 아는 손님만 두고 종류마다 나이 순위를 매긴 뒤, 1위인 손님을 모두 남겨요.",
          "동점 1위를 모두 남기는 순위 함수는 RANK예요. 중간 표는 「WHERE age IS NOT NULL)」로 닫아요.",
        ],
        explain: "도깨비 73살 넷, 사람 배누리, 여우 보람·연화, 7명이에요. ROW_NUMBER면 종류마다 한 명씩 3명만 남아요. 빈칸을 빼 두면 빈칸을 맨 앞에 세우는 데이터베이스에서도 답이 같아요.",
      },
      {
        type: "check", concept: "partition",
        q: "14-4에서 배운 것으로 맞는 말은?",
        options: [
          "순위로 거르려면 순위 표를 WITH로 먼저 만들고 바깥 WHERE에서 rk = 1로 고른다",
          "같은 SELECT의 WHERE에서 rk = 1로 바로 거를 수 있다",
          "그룹마다 1등은 GROUP BY만으로 이름까지 고를 수 있다",
        ],
        answer: 0,
        explain: "순위는 WHERE 다음에 매겨져서 한 번 감싸야 해요. 동점 1등을 모두 보려면 RANK, 꼭 하나만이면 둘째 기준을 단 ROW_NUMBER예요.",
      },
    ],
  },
  {
    id: "14-5", chapter: 14, title: "14장 평가", isExam: true,
    goal: "무리마다 순위를 매기고 동점과 1등을 다룬다",
    summary: [
      "RANK 1,1,3 · DENSE_RANK 1,1,2",
      "PARTITION BY = 무리마다 순위",
      "순위로 거르기는 WITH 뒤 바깥 WHERE",
    ],
    cards: [
      {
        say: "14장 정리! ROW_NUMBER로 번호, RANK·DENSE_RANK로 동점 순위, PARTITION BY로 무리마다 순위, WITH로 감싸 1등만 골랐어요. 아래는 대표 문제 「가게마다 가장 잘 팔린 물건」이에요!",
        sql: "WITH ranked AS (\n  SELECT i.shop_id, i.name,\n    SUM(oi.qty) AS qty,\n    RANK() OVER (\n      PARTITION BY i.shop_id\n      ORDER BY SUM(oi.qty) DESC) AS rk\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  JOIN orders o\n    ON o.order_id = oi.order_id\n  WHERE o.status = '완료'\n  GROUP BY i.shop_id, i.item_id,\n    i.name)\nSELECT shop_id, name, qty\nFROM ranked\nWHERE rk = 1\nORDER BY shop_id, name",
      },
    ],
    items: [
      {
        type: "choice", concept: "rownumber",
        q: "창 함수 ROW_NUMBER() OVER (…)를 붙인 결과에 대해 맞는 말은?",
        options: ["행 수는 그대로이고 행마다 번호가 붙는다", "번호가 같은 행끼리 하나로 묶인다", "OVER 안 차례대로 결과 행이 늘 줄 선다"],
        answer: 0,
        explain: "창 함수는 행을 줄이지 않아요. 결과 행을 줄 세우는 건 바깥 ORDER BY예요.",
      },
      {
        type: "choice", concept: "rownumber",
        q: "OVER 안 ORDER BY와 바깥 ORDER BY에 대해 맞는 말은?",
        options: ["OVER 안은 번호 매길 차례, 바깥은 결과를 보여 줄 차례를 정한다", "둘 중 하나만 쓸 수 있다", "OVER 안 ORDER BY가 있으면 바깥 ORDER BY는 무시된다"],
        answer: 0,
        explain: "둘은 따로 일해요. 번호 차례로 보고 싶으면 바깥에도 ORDER BY rn을 적어요.",
      },
      {
        type: "choice", concept: "rank",
        q: "25~30엽전 물건에 비싼 차례로 순위를 매긴 이 SQL에서 오미자청의 rk 값은?",
        code: "SELECT name, price,\n  RANK() OVER (\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE price BETWEEN 25 AND 30\nORDER BY rk, item_id",
        options: ["4", "3", "5"],
        answer: 0,
        explain: "인삼차 30이 1위, 구기자·복주머니 28이 함께 2위, 수육·오미자청 25가 함께 4위예요. 3은 DENSE_RANK였을 때예요.",
      },
      {
        type: "choice", concept: "rank",
        q: "같은 물건들에 DENSE_RANK로 순위를 매긴 이 SQL에서 오미자청의 drk 값은?",
        code: "SELECT name, price,\n  DENSE_RANK() OVER (\n    ORDER BY price DESC) AS drk\nFROM items\nWHERE price BETWEEN 25 AND 30\nORDER BY drk, item_id",
        options: ["3", "4", "5"],
        answer: 0,
        explain: "값 30, 28, 25에 1, 2, 3을 건너뛰지 않고 줘요. 4는 RANK였을 때예요.",
      },
      {
        type: "choice", concept: "partition",
        q: "PARTITION BY kind를 넣은 순위에 대해 맞는 말은?",
        options: ["손님 종류마다 순위가 1부터 다시 매겨진다", "손님 종류마다 한 행만 남는다", "종류 이름 차례로 결과가 줄 선다"],
        answer: 0,
        explain: "PARTITION BY는 순위를 셀 무리만 나눠요. 행은 그대로이고 줄 서는 차례는 바깥 ORDER BY가 정해요.",
      },
      {
        type: "choice", concept: "partition",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT kind, name,\n  ROW_NUMBER() OVER (\n    PARTITION BY kind\n    ORDER BY age DESC,\n      customer_id) AS rn\nFROM customers\nWHERE rn = 1",
        options: ["오류가 난다", "종류마다 한 명씩 3행이 나온다", "60행이 나온다"],
        answer: 0,
        explain: "rn은 WHERE가 거른 뒤에 매겨져서 같은 SELECT의 WHERE에서는 못 써요. WITH로 감싸고 바깥에서 걸러요.",
      },
      {
        type: "choice", concept: "partition",
        q: "대표 문제의 결과에서 7번 가게(방망이 대장간)의 1등 물건은?",
        options: ["도깨비방망이", "방망이 손잡이", "금방망이"],
        answer: 0,
        explain: "완료 주문에서 도깨비방망이가 17개로 1등이에요. 취소까지 세면 방망이 손잡이 21개가 앞서고, 금방망이는 가장 비싼 물건이에요.",
      },
      {
        type: "choice", concept: "partition",
        q: "가게마다 가장 비싼 물건만 보인 결과는?",
        options: [
          { sql: "WITH ranked AS (\n  SELECT shop_id, name, price,\n    RANK() OVER (\n      PARTITION BY shop_id\n      ORDER BY price DESC) AS rk\n  FROM items)\nSELECT * FROM ranked\nWHERE rk = 1\nORDER BY shop_id" },
          { sql: "WITH ranked AS (\n  SELECT shop_id, name, price,\n    RANK() OVER (\n      ORDER BY price DESC) AS rk\n  FROM items)\nSELECT * FROM ranked\nWHERE rk = 1\nORDER BY shop_id" },
          { sql: "WITH ranked AS (\n  SELECT shop_id, name, price,\n    RANK() OVER (\n      PARTITION BY shop_id\n      ORDER BY price) AS rk\n  FROM items)\nSELECT * FROM ranked\nWHERE rk = 1\nORDER BY shop_id" },
        ],
        answer: 0,
        explain: "8행이 정답이에요. 무리를 안 나누면 장터 전체 1위 금방망이 하나, 오름차순이면 가게마다 가장 싼 물건이에요.",
      },
      {
        type: "blank", concept: "rownumber",
        q: "3번 가게 물건이 번호(rn) 차례로 서게 빈자리를 채워 보세요.",
        code: "SELECT name, price,\n  ROW_NUMBER() OVER (\n    ORDER BY price DESC, item_id\n  ) AS rn\nFROM items\nWHERE shop_id = 3\nORDER BY ___",
        chips: ["rn", "name", "price"],
        answer: 0,
        explain: "OVER 안 ORDER BY는 번호만 매기고, 행이 서는 차례는 바깥 ORDER BY가 정해요. rn이면 산삼이 맨 위, name이면 감초가, price면 가장 싼 감초가 맨 위예요.",
      },
      {
        type: "order", concept: "partition",
        q: "59살 이상 손님에게 종류마다 나이 순위를 건너뛰지 않게 매기도록 줄을 놓아 보세요.",
        lines: ["SELECT kind, name, age,", "DENSE_RANK() OVER (", "PARTITION BY kind", "ORDER BY age DESC) AS drk", "FROM customers", "WHERE age >= 59"],
        explain: "OVER 안에서 PARTITION BY 다음 ORDER BY예요. 도깨비 어슬렁이 RANK로는 5위인데 DENSE_RANK로는 2위예요.",
      },
      {
        id: "14-5-b1", type: "build", concept: "partition",
        q: "가게마다 가장 비싼 물건을 보여 줘",
        cards: ["WITH ranked AS", "(SELECT shop_id, name, price,", "RANK() OVER", "(PARTITION BY shop_id", "ORDER BY price DESC) AS rk", "FROM items)", "SELECT * FROM ranked", "WHERE rk = 1"],
        extra: ["(ORDER BY price DESC) AS rk", "WHERE rk = 2"],
        tables: ["items"],
        hints: [
          "가게마다 값 순위를 매긴 중간 표를 먼저 만들고, 본문에서 순위가 1인 행만 남겨요.",
          "「WITH ranked AS」 다음에 순위 표 카드들을 놓고 「FROM items)」로 닫은 뒤, 본문에서 rk = 1로 걸러요.",
        ],
        explain: "「그룹마다 1등」을 다시 풀었어요! 가게 8곳의 가장 비싼 물건 8행이에요. 대표 문제도 같은 뼈대예요. rk = 2면 가게마다 둘째로 비싼 물건이에요.",
      },
      {
        id: "14-5-b2", type: "build", concept: "rownumber",
        q: "손님 종류마다 가장 나이 많은 손님을 한 명씩만 보여 줘. 나이가 같으면 손님 번호가 작은 쪽이야",
        cards: ["WITH ranked AS", "(SELECT kind, name, age,", "ROW_NUMBER() OVER", "(PARTITION BY kind", "ORDER BY age DESC,", "customer_id) AS rn", "FROM customers", "WHERE age IS NOT NULL)", "SELECT * FROM ranked", "WHERE rn = 1"],
        extra: ["(PARTITION BY village", "customer_id DESC) AS rn"],
        tables: ["customers"],
        hints: [
          "종류마다 나이 많은 차례로 번호를 하나씩 주고, 동점은 손님 번호로 갈라요. 그리고 1번만 남겨요.",
          "ROW_NUMBER() OVER 괄호 안은 PARTITION BY kind, ORDER BY age DESC, customer_id 차례예요.",
        ],
        explain: "쇠뭉치(3번)·배누리·보람, 3명이에요. 둘째 기준 덕에 동점에서도 한 명씩 정해져요. customer_id DESC면 꾀돌이와 연화가 뽑히고, village로 나누면 마을마다 한 명씩이에요.",
      },
      {
        id: "14-5-b3", type: "build", concept: "rank",
        q: "값이 6~8엽전인 물건에 싼 차례로 순위를 매겨 줘. 같은 값은 같은 순위, 빈 번호는 없이",
        cards: ["SELECT", "name, price,", "DENSE_RANK() OVER", "(ORDER BY price)", "AS rk", "FROM", "items", "WHERE", "price BETWEEN 6 AND 8"],
        extra: ["RANK() OVER", "ROW_NUMBER() OVER"],
        tables: ["items"],
        hints: [
          "6~8엽전 물건만 고르고, 같은 값은 같은 순위로 두되 다음 순위를 건너뛰지 않아요.",
          "건너뛰지 않는 순위 함수는 DENSE_RANK예요. OVER 뒤에 값 오름차순 괄호와 AS rk예요.",
        ],
        explain: "인절미·한지 1, 송편 2, 도토리묵·꿀떡 3이에요. RANK면 송편이 3, 도토리묵·꿀떡이 4, ROW_NUMBER면 동점에도 번호가 따로예요.",
      },
      {
        type: "check", concept: "partition",
        q: "14장에서 배운 것으로 맞는 말은?",
        options: [
          "OVER (PARTITION BY … ORDER BY …)로 무리마다 순위를 매기고, 1등만 보려면 WITH로 감싸 바깥에서 거른다",
          "창 함수는 같은 SELECT의 WHERE에서 바로 거를 수 있다",
          "RANK·DENSE_RANK·ROW_NUMBER는 동점이 있어도 늘 같은 번호를 준다",
        ],
        answer: 0,
        explain: "분석 도깨비의 첫걸음 끝! 실무에서는 이 「그룹마다 1등」 꼴로 쇼핑몰의 주문 표에서 카테고리마다 가장 잘 팔린 상품이나 지역마다 가장 많이 산 고객을 뽑아요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 14장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - 14-T1 S: 가게 1~8. RANK() OVER (ORDER BY price DESC)(정답) / 오름차순 / 다른 가게 전체(shop_id <> S, 35행).
//   한 가게 안에서는 값이 같은 물건이 없어 순위가 1~5(2·6번은 1~4)로 정해지고, 오름차순과는 같은 물건의 순위가 뒤집혀 다르다.
// - 14-T2 A: 나이 50~72. PARTITION(정답) / GROUP·ORDER는 OVER 안에서 오류. 75살 배누리가 있어 늘 1행 이상.
// - 14-T3 K: 도깨비·사람·여우. 종류마다 나이 맨 위에 동점이 있다(도깨비 73 넷, 사람 72 둘, 여우 59 둘).
//   RANK(정답)와 DENSE_RANK·ROW_NUMBER는 동점 뒤 순위가 달라 결과가 다르다. 빈칸은 「age IS NOT NULL」로 뺀다(R36, DESC의 빈칸 자리).
export const TEMPLATES = [
  {
    id: "14-T1", concept: "rank", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price,\n  RANK() OVER (\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE shop_id = {S}",
    wrong: [
      "SELECT name, price,\n  RANK() OVER (\n    ORDER BY price) AS rk\nFROM items\nWHERE shop_id = {S}",
      "SELECT name, price,\n  RANK() OVER (\n    ORDER BY price DESC) AS rk\nFROM items\nWHERE shop_id <> {S}",
    ],
    vars: { S: [1, 2, 3, 4, 5, 6, 7, 8] },
    explain: "{S}번 가게 물건만 남기고, 값이 비싼 물건부터 1위를 줘요. 오름차순이면 가장 싼 물건이 1위예요.",
  },
  {
    id: "14-T2", concept: "partition", type: "blank",
    q: "나이 {A}살 이상 손님에게 종류마다 따로 나이 순위가 매겨지게 빈자리를 채워 보세요.",
    sql: "SELECT kind, name, age,\n  RANK() OVER (\n    ___ BY kind\n    ORDER BY age DESC) AS rk\nFROM customers\nWHERE age >= {A}",
    chips: ["PARTITION", "GROUP", "ORDER"],
    answer: 0,
    vars: { A: { min: 50, max: 72 } },
    explain: "OVER 안에서 무리를 나누는 말은 PARTITION BY예요. GROUP BY는 그 자리에 올 수 없고, ORDER BY를 두 번 쓰면 단서가 나와요.",
  },
  {
    id: "14-T3", concept: "rank", type: "blank",
    q: "{K} 손님의 나이 순위를 같은 나이는 같은 순위, 다음은 건너뛰게 빈자리를 채워 보세요.",
    sql: "SELECT name, age,\n  ___() OVER (\n    ORDER BY age DESC) AS rk\nFROM customers\nWHERE kind = '{K}'\n  AND age IS NOT NULL",
    chips: ["RANK", "DENSE_RANK", "ROW_NUMBER"],
    answer: 0,
    vars: { K: ["도깨비", "사람", "여우"] },
    explain: "RANK는 같은 나이에 같은 순위를 주고 그 수만큼 건너뛰어요. DENSE_RANK는 건너뛰지 않고, ROW_NUMBER는 동점에도 번호를 따로 줘요.",
  },
];
