// 13장 「중간 표 만들기」 (설계 §6: WITH, FROM 안 서브쿼리, UNION / 장터 예: 가게별 합계로 다시 순위).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 13
// 13장 낱말은 12장까지에 WITH·UNION과 ALL(판정 R23, UNION ALL)을 더한 것이다. FROM 안 서브쿼리는 낱말이 아니라 모양(FORMS 「FROM (SELECT」).
// ALL은 13-4 둘째 카드에서 보여 준다. 창 함수(순위 함수)는 14장이라, 「순위」는 중간 표를 ORDER BY로 줄 세우고 LIMIT으로 자른다.
// - 1~12장이 「SELECT가 FROM보다 먼저」라고만 해 온 것(쓰기 안내 12절 「13장 WITH」)을 13-1 둘째 카드에서 갚는다: WITH가 붙으면 WITH가 맨 앞.
// - 장터 예 「가게별 합계로 다시 순위」(13-1-b1·13-5-b1):
//   WITH shop_total AS (SELECT shop_id, SUM(price) AS total FROM items GROUP BY shop_id)
//   SELECT * FROM shop_total ORDER BY total DESC, shop_id LIMIT 3 → 7번 1330·8번 1100·6번 232.
//   가게별 합계(8장 8-3-b1의 물건 값 합): 7번 1330·8번 1100·6번 232·3번 209·4번 116·5번 95·1번 64·2번 35(모두 달라 동점 없음, 그래도
//   R13대로 둘째 기준 shop_id를 단다 — R43 예외를 선례로 쓰지 않음). 같은 답을 FROM 안 서브쿼리로 13-2-b2에서 다시 놓는다.
//   진짜 매출(10장 정의: 완료 주문의 수량 × 값)은 조립 카드 12장에 들어가지 않아(JOIN 둘 + WHERE + GROUP BY + 순위) 13-3 설명 카드·객관식에서 쓴다.
// - 확인한 값(data/market.sql, openEngine, SQLite 3.54.0):
//   가게별 완료 매출: 7번 방망이 대장간 13440·8번 뚝딱 공방 11030·6번 바람 보따리 8738·3번 산삼 약방 7706·4번 달빛 약초방 6289·
//   1번 도깨비 국밥집 4436·5번 구름 잡화점 4070·2번 여우골 떡방 1778(합 57487 = 10장 10-4-b1). 1만 엽전 넘는 가게는 7·8번 둘.
//   가게 매출 평균 7185.875 → 넘는 가게 7·8·6·3번 넷. 가게별 물건 값 합 평균 397.625 → 넘는 가게 7·8번 둘.
//   마을별 손님 수: 큰바위마을 11·솔바위골 9·은행나무마을 9·개울마을 8·느티나무골 8·달빛마을 6·버드나무고개 6·여우고개 3.
//     9명 이상 3곳, 9명 넘음은 큰바위마을 하나, 5명 아래는 여우고개 하나. 가장 많은 수 11.
//   손님별 주문 수(주문 있는 57명): 평균 10.3684(591 ÷ 57), 가장 많은 44(쇠뭉치, 3번), 가장 적은 1. 60명으로 나누면 9.85.
//     20번 이상 12명, 20번 넘음 11명(딱 20번인 손님 한 명). 취소 주문만 세면 가장 많은 손님 6건.
//   AVG(COUNT(*))는 「misuse of aggregate function COUNT()」 오류. 중간 표 바깥 HAVING은 「HAVING clause on a non-aggregate query」 오류(쓰지 않음).
//   UNION: kind(도깨비·사람·여우) + category(먹거리·약재·잡화·공방) → UNION 7행, UNION ALL 68행(60 + 8). 열 이름은 첫 SELECT의 kind.
//     가게 이름 8 + 물건 이름 40 = 48, 겹치는 이름이 없어 UNION·UNION ALL 둘 다 48행(그래서 둘을 헷갈림 짝으로 쓰지 않음).
//     값 300엽전 이상(금방망이 400·장승 350·도깨비방망이 320)과 7번 가게 물건 5가지(금방망이·도깨비방망이 겹침) → UNION 6행, UNION ALL 8행.
//     가장 비싼 셋(400·350·320)과 가장 싼 셋(인절미 6·한지 6·식혜 5) — 물건 이름 40개는 모두 달라 ORDER BY price DESC, name이 하나로 정해짐.
//     '가게' 8·'물건' 40(표마다 행 수를 UNION ALL로 쌓기).
//   열 개수가 다른 UNION: 「SELECTs to the left and right of UNION do not have the same number of result columns」(UNION ALL도 같은 꼴) →
//     이 작업에서 data/errors.js에 「UNION columns」 설명을 더했다(전에는 대체 문장이 나왔음).
//   UNION 앞 SELECT에 ORDER BY: 「ORDER BY clause should come after UNION not before」(MySQL·PostgreSQL도 괄호 없이는 오류).
// - 엔진마다 다른 것(판정 R36): FROM 안 서브쿼리의 별칭. 이 장터(SQLite)는 별칭이 없어도 돌지만 MySQL은 「derived table must have
//   its own alias」 오류이고 PostgreSQL도 16판 전에는 오류였다 → 「이 장터에서는 없어도 돌지만 많은 데이터베이스는 꼭 있어야 해서 늘 붙인다」.
//   WITH·UNION·UNION ALL·열 개수 규칙·열 이름이 첫 SELECT에서 오는 것·ORDER BY가 합친 결과 전체에 걸리는 것은 어디서나 같아 붙이지 않는다.
// - 조립 카드(판정 R38·R40·R44): 바깥 SELECT·FROM·WHERE는 한 장씩. 중간 표는 「WITH shop_total AS」 한 장, 괄호는 여는 카드
//   「(SELECT shop_id,」·「(SELECT village, COUNT(*) AS n」와 닫는 카드 「GROUP BY village)」에 붙인다(R44, 낱장 괄호 없음).
//   FROM 안 서브쿼리는 닫는 카드에 별칭을 붙인다(「GROUP BY customer_id) t」): 별칭만 낱장으로 두면 SQLite에서 빼도 돌아 drop-one에 걸린다.
//   카드 12장에 넣으려고 두 곳을 한 장으로 붙였다: ORDER BY 구절 「ORDER BY total DESC, shop_id」(ch12 「GROUP BY price」와 같은 절 카드),
//   그리고 13-1-b1·13-3-b1·13-5-b1의 닫는 카드 「FROM items GROUP BY shop_id)」(R44 닫는 절 카드). 13-2-b2(FROM 안 서브쿼리)는
//   WITH 카드가 없어 「FROM items」·「GROUP BY shop_id) t」·「ORDER BY」를 모두 따로 놓는다.
//   UNION 조립은 양쪽이 SELECT … FROM … 한 벌씩이라 WHERE를 넣으면 12장을 넘는다. 그래서 WHERE 없는 두 표(손님 종류·가게 종류,
//   가게 이름·물건 이름, 가게 수·물건 수)로 쌓고, WHERE가 든 UNION은 설명 카드·객관식·줄 놓기로 보인다.
// - 헷갈림 카드: 낱말 하나뿐인 표 이름(items·customers)은 표 이름 뒤에 끼우면 별칭이 되어 R26 예외(아무 이름이나 통과)로 넘어간다.
//   UNION과 UNION ALL은 결과가 같아지는 곳(가게 수·물건 수, 가게 이름·물건 이름)에서 짝으로 쓰지 않는다.
export const CHAPTER = { id: 13, title: "중간 표 만들기" };

export const LESSONS = [
  {
    id: "13-1", chapter: 13, title: "WITH로 중간 표",
    goal: "WITH로 결과에 이름을 붙여 중간 표로 두고 다시 고른다",
    summary: [
      "WITH 이름 AS (SELECT …) = 중간 표",
      "본문은 중간 표를 표처럼 FROM에",
      "WITH가 붙으면 WITH가 맨 앞",
    ],
    cards: [
      {
        say: "8장에서 가게별 합계를 냈죠? 그 결과에 shop_total이라는 이름을 붙여 중간 표로 두고, 다시 줄 세워 위 3곳만 봐요. WITH(위드)로 만들어요. 13장 대표 문제 「가게별 합계로 다시 순위」!",
        sql: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)\nSELECT *\nFROM shop_total\nORDER BY total DESC, shop_id\nLIMIT 3",
      },
      {
        say: "그동안 「SELECT가 FROM보다 먼저」라고 했죠? WITH가 붙으면 WITH가 맨 앞이에요. 괄호 안이 중간 표 만들기, 그 뒤 SELECT가 본문! 중간 표의 n은 보통 열이라 WHERE로 바로 걸러요.",
        sql: "WITH village_n AS (\n  SELECT village, COUNT(*) AS n\n  FROM customers\n  GROUP BY village)\nSELECT *\nFROM village_n\nWHERE n >= 9",
      },
    ],
    items: [
      {
        type: "choice", concept: "with",
        q: "WITH 뒤 괄호 안 SELECT가 하는 일은?",
        options: ["본문 SELECT가 읽을 중간 표를 만든다", "결과를 장터 장부에 새 표로 남긴다", "본문 SELECT의 결과를 거른다"],
        answer: 0,
        explain: "괄호 안 결과에 이름을 붙여 중간 표로 둬요. 중간 표는 그 SQL 문장 안에서만 쓰고 끝나면 사라져서 장부는 그대로예요.",
      },
      {
        type: "choice", concept: "with",
        q: "WITH를 쓴 SQL의 차례로 맞는 것은?",
        options: ["WITH 이름 AS (SELECT …) 다음에 본문 SELECT", "본문 SELECT 다음에 WITH 이름 AS (SELECT …)", "SELECT 다음에 WITH, 그다음 FROM"],
        answer: 0,
        explain: "중간 표를 먼저 만들어야 본문이 읽을 수 있어요. 그래서 WITH가 문장 맨 앞이에요. 「SELECT가 FROM보다 먼저」는 본문 안에서 그대로예요.",
      },
      {
        type: "choice", concept: "with",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)\nSELECT *\nFROM shop_total\nORDER BY total DESC, shop_id\nLIMIT 3",
        options: ["3행", "8행", "40행"],
        answer: 0,
        explain: "중간 표는 가게마다 한 행, 8행이에요. 본문이 그중 위 3행만 잘랐어요. 40은 물건 수예요.",
      },
      {
        type: "choice", concept: "with",
        q: "그 SQL 결과에서 합계(total)가 가장 큰 가게의 번호는?",
        options: ["7번", "8번", "6번"],
        answer: 0,
        explain: "방망이 대장간(7번)이 1330엽전으로 가장 커요. 8번은 1100엽전으로 둘째, 6번은 232엽전으로 셋째예요.",
      },
      {
        type: "choice", concept: "with",
        q: "중간 표 village_n에서 n >= 9를 HAVING이 아니라 WHERE로 거를 수 있는 까닭은?",
        options: ["n이 중간 표의 보통 열이라서", "WHERE에는 COUNT를 바로 써도 되어서", "WITH 안에서는 HAVING을 못 써서"],
        answer: 0,
        explain: "묶어 세는 일은 괄호 안에서 끝났어요. 본문에게 n은 그냥 열 하나라 WHERE로 걸러요. WHERE COUNT(*) >= 9처럼 셈을 바로 쓰면 여전히 단서예요.",
      },
      {
        type: "choice", concept: "with",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "WITH village_n AS (\n  SELECT village, COUNT(*) AS n\n  FROM customers\n  GROUP BY village)\nSELECT *\nFROM village_n\nWHERE n >= 9",
        options: ["3행", "8행", "1행"],
        answer: 0,
        explain: "큰바위마을 11명, 솔바위골·은행나무마을 9명, 3곳이에요. 8은 마을 수, 9명 넘는 곳만이면 큰바위마을 1곳이에요.",
      },
      {
        type: "choice", concept: "with",
        q: "WITH로 만든 중간 표는 언제까지 쓸 수 있을까요?",
        options: ["그 SQL 문장 하나가 끝날 때까지", "앱을 닫을 때까지", "장터 장부에 늘 남는다"],
        answer: 0,
        explain: "중간 표는 그 문장 안에서만 있는 이름이에요. 다음 SQL에서 쓰려면 WITH를 다시 적어요.",
      },
      {
        type: "blank", concept: "with",
        q: "가게별 합계에서 위 3곳이 나오게 빈자리를 채워 보세요.",
        code: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)\nSELECT *\nFROM ___\nORDER BY total DESC, shop_id\nLIMIT 3",
        chips: ["shop_total", "items", "total"],
        answer: 0,
        explain: "본문은 중간 표 이름을 FROM 뒤에 놓아요. items에는 total 열이 없고, total은 표가 아니라 열 이름이라 단서가 나와요.",
      },
      {
        type: "order", concept: "with",
        q: "손님이 5명보다 적은 마을을 WITH로 보게 줄을 놓아 보세요.",
        lines: ["WITH village_n AS (", "SELECT village, COUNT(*) AS n", "FROM customers", "GROUP BY village)", "SELECT * FROM village_n", "WHERE n < 5"],
        expect: "village | n\n여우고개 | 3",
        explain: "중간 표를 먼저 만들고, 본문이 그 표에서 n < 5를 골라요. 손님 3명인 여우고개 하나예요.",
      },
      {
        id: "13-1-b1", type: "build", concept: "with",
        q: "가게별 합계로 다시 순위를 매겨 위 3곳을 보여 줘",
        cards: ["WITH shop_total AS", "(SELECT shop_id,", "SUM(price) AS total", "FROM items GROUP BY shop_id)", "SELECT", "*", "FROM", "shop_total", "ORDER BY total DESC, shop_id", "LIMIT 3"],
        extra: ["items", "ORDER BY total, shop_id"],
        tables: ["items"],
        hints: [
          "가게별 합계를 중간 표로 먼저 만들고, 본문에서 합계가 큰 차례로 줄 세워 3곳만 남겨요.",
          "WITH shop_total AS로 시작해 괄호를 닫고, SELECT * FROM shop_total 뒤에 ORDER BY와 LIMIT이에요.",
        ],
        explain: "13장의 대표 문제예요! 7번 1330·8번 1100·6번 232엽전이에요. DESC를 빼면 가장 작은 3곳, 본문 FROM에 items를 두면 total 열이 없어 단서가 나요.",
      },
      {
        id: "13-1-b2", type: "build", concept: "with",
        q: "손님이 9명 이상인 마을을 WITH로 보여 줘",
        cards: ["WITH village_n AS", "(SELECT village, COUNT(*) AS n", "FROM customers", "GROUP BY village)", "SELECT", "*", "FROM", "village_n", "WHERE", "n >= 9"],
        extra: ["n > 9", "COUNT(*) >= 9"],
        tables: ["customers"],
        hints: [
          "마을마다 손님 수를 센 중간 표를 만들고, 본문에서 그 수가 9 이상인 마을만 골라요.",
          "WITH village_n AS 다음에 중간 표 카드 셋, 그 뒤 SELECT * FROM village_n WHERE n >= 9예요.",
        ],
        explain: "큰바위마을·솔바위골·은행나무마을이에요. 8장의 HAVING 대신 중간 표의 열을 WHERE로 걸렀어요. > 9면 큰바위마을만, 본문 WHERE에 COUNT를 쓰면 단서예요.",
      },
      {
        type: "check", concept: "with",
        q: "13-1에서 배운 것으로 맞는 말은?",
        options: [
          "WITH로 결과에 이름을 붙이면 본문이 그 이름을 표처럼 FROM에 쓴다",
          "WITH로 만든 표는 장부에 늘 남는다",
          "WITH는 본문 SELECT 뒤에 놓는다",
        ],
        answer: 0,
        explain: "WITH 이름 AS (SELECT …)로 중간 표를 먼저 만들고, 본문이 그 이름을 읽어요. 문장이 끝나면 중간 표는 사라져요.",
      },
    ],
  },
  {
    id: "13-2", chapter: 13, title: "FROM 안 서브쿼리",
    goal: "FROM 뒤 괄호 안 SELECT를 표처럼 쓰고 별칭을 붙인다",
    summary: [
      "FROM (SELECT …) t = FROM 안 중간 표",
      "WITH와 같은 일, 놓는 자리만 달라요",
      "셈의 셈(평균의 평균)은 두 단계로",
    ],
    cards: [
      {
        say: "WITH의 괄호를 FROM 뒤에 바로 넣어도 돼요. 괄호 뒤 t가 이 중간 표의 별칭! 이 장터에서는 없어도 돌지만, MySQL처럼 꼭 있어야 하는 데이터베이스가 많아 늘 붙여요. 13-1과 같은 답이에요.",
        sql: "SELECT *\nFROM (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id) t\nORDER BY total DESC, shop_id\nLIMIT 3",
      },
      {
        say: "손님 한 명이 주문을 평균 몇 번 할까요? AVG(COUNT(*))는 셈 안에 셈이라 단서가 나요. 손님별 주문 수 표를 먼저 만들고 그 n을 AVG로! 주문 없는 3명은 중간 표에 없어 57명의 평균이에요.",
        sql: "SELECT AVG(n) AS avg_n\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  GROUP BY customer_id) t",
      },
    ],
    items: [
      {
        type: "choice", concept: "fromsub",
        q: "FROM (SELECT …) t에서 t는 무엇일까요?",
        options: ["괄호 안 SELECT가 만든 중간 표의 별칭", "items 표의 새 이름", "합계 열의 이름"],
        answer: 0,
        explain: "FROM 뒤 괄호가 만든 표에 붙인 이름이에요. 10장에서 표 이름 뒤에 별칭을 붙인 것과 같은 자리예요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "FROM 안 서브쿼리에 별칭을 늘 붙이는 까닭은?",
        options: ["많은 데이터베이스에서 별칭이 없으면 오류라서", "별칭이 없으면 결과가 늘 0행이라서", "별칭이 있어야 ORDER BY를 쓸 수 있어서"],
        answer: 0,
        explain: "이 장터에서는 별칭 없이도 돌지만, MySQL은 단서를 내요. 어디서나 통하게 늘 붙여요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "WITH와 FROM 안 서브쿼리에 대해 맞는 말은?",
        options: ["같은 중간 표를 만들고, 맨 앞에 이름을 두느냐 FROM 안에 두느냐가 다르다", "FROM 안 서브쿼리에서는 GROUP BY를 쓸 수 없다", "WITH의 결과는 늘 1행이다"],
        answer: 0,
        explain: "카드의 두 SQL이 같은 3행을 냈어요. 중간 표에 이름을 붙여 앞에 두면 WITH, 그 자리에 바로 넣으면 FROM 안 서브쿼리예요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "셈 함수 안에 셈 함수를 넣은 이 SQL은 어떻게 될까요?",
        code: "SELECT AVG(COUNT(*)) AS avg_n\nFROM orders\nGROUP BY customer_id",
        options: ["오류가 난다", "손님별 주문 수의 평균이 나온다", "591이 나온다"],
        answer: 0,
        explain: "AVG 안에 COUNT를 넣으면 단서가 나요. 손님별로 센 표를 먼저 만들고, 그 표에서 AVG를 내야 해요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "손님별 주문 수의 평균을 낸 이 SQL의 결과 값은?",
        code: "SELECT AVG(n) AS avg_n\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  GROUP BY customer_id) t",
        options: ["10.3684", "9.85", "591"],
        answer: 0,
        explain: "주문 591건을 주문한 손님 57명으로 나눈 값이에요. 9.85는 60명 모두로 나눈 값인데, 주문 없는 3명은 중간 표에 행이 없어요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "그 중간 표에 주문 없는 손님 3명이 없는 까닭은?",
        options: ["orders 표에 그 손님 번호가 없어 묶음이 생기지 않아서", "COUNT가 0인 행을 지워서", "별칭 t가 그 행을 걸러서"],
        answer: 0,
        explain: "GROUP BY는 orders에 있는 손님 번호로만 묶어요. 0건인 손님까지 넣으려면 11장 LEFT JOIN이 필요해요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "주문을 20번 이상 한 손님을 센 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS cnt\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  GROUP BY customer_id) t\nWHERE n >= 20",
        options: ["12", "11", "57"],
        answer: 0,
        explain: "중간 표 57행 중 n이 20 이상인 손님 12명이에요. 딱 20번인 손님이 한 명 있어 > 20이면 11명이에요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "손님 한 명이 한 가장 많은 주문 수를 max_n으로 보인 결과는?",
        options: [
          { sql: "SELECT MAX(n) AS max_n\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  GROUP BY customer_id) t" },
          { sql: "SELECT MAX(n) AS max_n\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  WHERE status = '취소'\n  GROUP BY customer_id) t" },
          { sql: "SELECT MAX(n) AS max_n\nFROM (\n  SELECT shop_id, COUNT(*) AS n\n  FROM items\n  GROUP BY shop_id) t" },
        ],
        answer: 0, tables: ["orders"],
        explain: "44건(쇠뭉치)이 정답이에요. 취소 주문만 세면 6건, 가게별 물건 수로 세면 모두 5가지라 5예요.",
      },
      {
        type: "blank", concept: "fromsub",
        q: "손님별 주문 수의 평균이 나오게 빈자리를 채워 보세요.",
        code: "SELECT ___(n) AS avg_n\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  GROUP BY customer_id) t",
        chips: ["AVG", "SUM", "COUNT"],
        answer: 0,
        explain: "중간 표의 n을 AVG로 평균 내요. SUM이면 주문 전체 591, COUNT면 중간 표 행 수인 손님 57이에요.",
      },
      {
        type: "order", concept: "fromsub",
        q: "가게별 합계 중 가장 큰 값을 FROM 안 서브쿼리로 보게 줄을 놓아 보세요.",
        lines: ["SELECT MAX(total) AS max_total", "FROM (SELECT shop_id,", "SUM(price) AS total", "FROM items", "GROUP BY shop_id) t"],
        expect: "max_total\n1330",
        explain: "바깥 FROM 뒤에 괄호를 열어 가게별 합계 표를 만들고, 바깥 MAX가 그 표에서 가장 큰 1330을 골라요.",
      },
      {
        id: "13-2-b1", type: "build", concept: "fromsub",
        q: "손님 한 명당 주문 수의 평균을 avg_n으로 보여 줘",
        cards: ["SELECT", "AVG(n) AS avg_n", "FROM", "(SELECT customer_id,", "COUNT(*) AS n", "FROM orders", "GROUP BY customer_id) t"],
        extra: ["FROM customers", "MAX(n) AS max_n"],
        tables: ["orders"],
        hints: [
          "손님마다 주문 수를 센 표를 FROM 안에서 먼저 만들고, 바깥에서 그 수의 평균을 내요.",
          "SELECT AVG(n) AS avg_n FROM 다음에 괄호를 열어 손님별로 세고, 별칭 t가 붙은 카드로 닫아요.",
        ],
        explain: "10.3684번이에요. AVG(COUNT(*))로는 못 내는 「셈의 셈」을 두 단계로 풀었어요! customers로 세면 손님마다 1이라 1, MAX면 44예요.",
      },
      {
        id: "13-2-b2", type: "build", concept: "fromsub",
        q: "가게별 합계로 다시 순위를 매겨 위 3곳을 FROM 안 서브쿼리로 보여 줘",
        cards: ["SELECT", "*", "FROM", "(SELECT shop_id,", "SUM(price) AS total", "FROM items", "GROUP BY shop_id) t", "ORDER BY", "total DESC, shop_id", "LIMIT 3"],
        extra: ["total, shop_id", "MAX(price) AS total"],
        tables: ["items"],
        hints: [
          "가게별 합계 표를 FROM 안에 바로 만들고, 바깥에서 합계가 큰 차례로 3곳만 남겨요.",
          "SELECT * FROM 다음에 괄호를 열어 가게별로 합하고 ) t로 닫은 뒤, ORDER BY와 LIMIT이에요.",
        ],
        explain: "13-1-b1과 같은 7·8·6번이에요. 이름 대신 자리로 쓴 같은 중간 표예요! MAX면 가장 비싼 물건 값끼리 견주고, DESC를 빼면 아래 3곳이에요.",
      },
      {
        type: "check", concept: "fromsub",
        q: "13-2에서 배운 것으로 맞는 말은?",
        options: [
          "FROM 안 서브쿼리는 WITH처럼 중간 표를 만들고, 별칭을 붙여 쓴다",
          "AVG(COUNT(*))로 손님별 주문 수의 평균을 바로 낼 수 있다",
          "FROM 안 서브쿼리는 값 하나만 돌려줘야 한다",
        ],
        answer: 0,
        explain: "FROM 뒤 괄호는 행·열이 여럿인 표여도 돼요. 셈의 셈은 중간 표를 만든 뒤 바깥에서 한 번 더 세요.",
      },
    ],
  },
  {
    id: "13-3", chapter: 13, title: "중간 표 잇기",
    goal: "중간 표를 다른 표와 잇고, 중간 표를 여럿 만든다",
    summary: [
      "중간 표도 별칭을 붙여 JOIN해요",
      "WITH a AS (…), b AS (…) 쉼표로",
      "뒤 중간 표는 앞 중간 표를 읽어요",
    ],
    cards: [
      {
        say: "10장의 진짜 매출(완료 주문의 수량 × 값)을 가게별 중간 표 shop_sales로 두고, 가게 표와 이어 이름을 붙여 다시 순위! 1만 엽전 넘게 판 곳은 방망이 대장간과 뚝딱 공방이에요.",
        sql: "WITH shop_sales AS (\n  SELECT i.shop_id,\n    SUM(oi.qty * i.price) AS sales\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  JOIN orders o\n    ON o.order_id = oi.order_id\n  WHERE o.status = '완료'\n  GROUP BY i.shop_id)\nSELECT s.name, t.sales\nFROM shop_sales t\nJOIN shops s ON s.shop_id = t.shop_id\nORDER BY t.sales DESC, t.shop_id",
      },
      {
        say: "중간 표가 둘이면 WITH는 한 번만 쓰고 쉼표로 이어요. 뒤의 avg_total은 앞의 shop_total을 읽어 평균 397.625를 내고, 본문은 그보다 합계가 큰 가게를 골라요. 12장 서브쿼리도 섞었어요!",
        sql: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id),\navg_total AS (\n  SELECT AVG(total) AS avg_t\n  FROM shop_total)\nSELECT *\nFROM shop_total\nWHERE total >\n  (SELECT avg_t FROM avg_total)",
      },
    ],
    items: [
      {
        type: "choice", concept: "with",
        q: "가게별 매출 중간 표에서 1만 엽전 넘는 가게를 센 이 SQL의 결과 값은?",
        code: "WITH shop_sales AS (\n  SELECT i.shop_id,\n    SUM(oi.qty * i.price) AS sales\n  FROM order_items oi\n  JOIN items i\n    ON oi.item_id = i.item_id\n  JOIN orders o\n    ON o.order_id = oi.order_id\n  WHERE o.status = '완료'\n  GROUP BY i.shop_id)\nSELECT COUNT(*) AS n\nFROM shop_sales\nWHERE sales > 10000",
        options: ["2", "4", "8"],
        answer: 0,
        explain: "방망이 대장간 13440, 뚝딱 공방 11030엽전, 2곳이에요. 8은 가게 수, 4는 매출 평균 7185.875엽전을 넘는 가게 수예요.",
      },
      {
        type: "choice", concept: "with",
        q: "첫 카드의 결과에서 매출이 셋째로 큰 가게는?",
        options: ["바람 보따리(8738엽전)", "산삼 약방(7706엽전)", "뚝딱 공방(11030엽전)"],
        answer: 0,
        explain: "방망이 대장간 13440, 뚝딱 공방 11030 다음이 바람 보따리 8738엽전이에요. 산삼 약방은 넷째예요.",
      },
      {
        type: "choice", concept: "with",
        q: "중간 표 shop_sales를 가게 표와 이을 때 맞는 말은?",
        options: ["중간 표도 별칭을 붙여 JOIN … ON으로 이을 수 있다", "중간 표는 WHERE에서만 쓸 수 있다", "중간 표를 이으려면 WITH를 한 번 더 써야 한다"],
        answer: 0,
        explain: "중간 표는 본문에게 그냥 표예요. FROM shop_sales t JOIN shops s ON …처럼 10장 그대로 이어요.",
      },
      {
        type: "choice", concept: "with",
        q: "중간 표를 두 개 만들 때 쓰는 모양은?",
        options: ["WITH a AS (…), b AS (…) SELECT …", "WITH a AS (…) WITH b AS (…) SELECT …", "WITH a, b AS (…) SELECT …"],
        answer: 0,
        explain: "WITH는 맨 앞에 한 번, 중간 표끼리는 쉼표로 이어요. 이름마다 AS (SELECT …)가 하나씩 붙어요.",
      },
      {
        type: "choice", concept: "with",
        q: "이 SQL은 어떻게 될까요?",
        code: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)\nWITH avg_total AS (\n  SELECT AVG(total) AS avg_t\n  FROM shop_total)\nSELECT * FROM avg_total",
        options: ["오류가 난다", "397.625가 나온다", "8행이 나온다"],
        answer: 0,
        explain: "WITH를 두 번 써서 단서가 나와요. 둘째 중간 표 앞에는 WITH 대신 쉼표를 놓아요.",
      },
      {
        type: "choice", concept: "with",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id),\navg_total AS (\n  SELECT AVG(total) AS avg_t\n  FROM shop_total)\nSELECT *\nFROM shop_total\nWHERE total >\n  (SELECT avg_t FROM avg_total)",
        options: ["2행", "4행", "8행"],
        answer: 0,
        explain: "가게 합계 평균 397.625엽전보다 큰 곳은 7번 1330, 8번 1100, 2곳이에요. 나머지 여섯 가게는 232엽전 이하예요.",
      },
      {
        type: "choice", concept: "with",
        q: "그 SQL에서 avg_total이 shop_total을 읽을 수 있는 까닭은?",
        options: ["앞에 만든 중간 표는 뒤 중간 표와 본문이 모두 쓸 수 있어서", "WITH 안의 표는 장부에 늘 남아서", "AVG가 알아서 표를 찾아 주어서"],
        answer: 0,
        explain: "중간 표는 적은 차례대로 생겨요. 그래서 뒤에 적은 avg_total과 본문 둘 다 shop_total을 읽어요. 거꾸로 앞 표가 뒤 표를 읽을 수는 없어요.",
      },
      {
        type: "blank", concept: "with",
        q: "중간 표 두 개를 잇게 빈자리를 채워 보세요.",
        code: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)___\navg_total AS (\n  SELECT AVG(total) AS avg_t\n  FROM shop_total)\nSELECT * FROM avg_total",
        chips: [",", "WITH", "AND"],
        answer: 0,
        explain: "중간 표끼리는 쉼표로 이어요. WITH를 또 쓰거나 AND로 이으면 문장이 되지 않아 단서가 나와요.",
      },
      {
        type: "order", concept: "with",
        q: "가게 이름 옆에 물건 값 합계를 붙여 보게 줄을 놓아 보세요.",
        lines: ["WITH shop_total AS (SELECT shop_id,", "SUM(price) AS total FROM items", "GROUP BY shop_id)", "SELECT s.name, t.total", "FROM shop_total t", "JOIN shops s ON s.shop_id = t.shop_id"],
        explain: "중간 표를 먼저 만들고, 본문이 그 표를 t로 불러 가게 표와 번호로 이어요. 가게 8곳 모두 이름과 합계가 나와요.",
      },
      {
        id: "13-3-b1", type: "build", concept: "with",
        q: "가게 이름 옆에 그 가게 물건 값 합계를 붙여 보여 줘",
        cards: ["WITH shop_total AS", "(SELECT shop_id,", "SUM(price) AS total", "FROM items GROUP BY shop_id)", "SELECT", "s.name, t.total", "FROM", "shop_total t", "JOIN shops s", "ON s.shop_id = t.shop_id"],
        extra: ["ON s.shop_id = t.total", "shops t"],
        tables: ["items", "shops"],
        hints: [
          "가게별 합계를 중간 표로 만들고, 본문에서 그 표를 가게 표와 가게 번호로 이어요.",
          "본문은 SELECT s.name, t.total FROM shop_total t JOIN shops s ON 짝 조건이에요.",
        ],
        explain: "가게 8곳의 이름과 합계예요. 중간 표도 JOIN할 수 있어요! 번호를 합계와 맞대면 짝이 없어 0행, 가게 표를 t로 부르면 total 열이 없어 단서예요.",
      },
      {
        id: "13-3-b2", type: "build", concept: "with",
        q: "손님이 가장 많은 마을의 손님 수를 max_n으로 보여 줘",
        cards: ["WITH village_n AS", "(SELECT village, COUNT(*) AS n", "FROM customers", "GROUP BY village)", "SELECT", "MAX(n) AS max_n", "FROM", "village_n"],
        extra: ["village", "customers"],
        tables: ["customers"],
        hints: [
          "마을마다 손님 수를 센 중간 표를 만들고, 본문에서 그 수 중 가장 큰 값을 골라요.",
          "WITH village_n AS 다음에 중간 표 카드 셋, 그 뒤 SELECT MAX(n) AS max_n FROM village_n이에요.",
        ],
        explain: "큰바위마을의 11명이에요. 13-2의 「셈의 셈」을 WITH로 풀었어요. MAX 자리에 village를 놓으면 마을 이름 8개만 나와요.",
      },
      {
        type: "check", concept: "with",
        q: "13-3에서 배운 것으로 맞는 말은?",
        options: [
          "중간 표는 쉼표로 여럿 만들고, 뒤 중간 표와 본문이 앞 중간 표를 읽는다",
          "중간 표마다 WITH를 따로 붙인다",
          "중간 표는 다른 표와 JOIN할 수 없다",
        ],
        answer: 0,
        explain: "WITH는 한 번, 중간 표끼리는 쉼표예요. 중간 표도 표라서 다른 표와 이어 이름을 붙일 수 있어요.",
      },
    ],
  },
  {
    id: "13-4", chapter: 13, title: "UNION으로 합치기",
    goal: "UNION으로 두 SELECT의 행을 아래로 쌓고 겹침을 다룬다",
    summary: [
      "UNION = 두 결과의 행을 아래로 쌓기",
      "UNION은 겹침 지움, UNION ALL은 그대로",
      "열 개수는 같게, 열 이름은 첫 SELECT",
    ],
    cards: [
      {
        say: "JOIN은 열을 옆으로 붙였죠? UNION(유니언)은 두 SELECT의 결과 행을 아래로 쌓아요. 손님 종류 3가지와 가게 종류 4가지가 한 열로! 겹치는 행은 하나만 남기고, 열 이름은 첫 SELECT의 kind예요.",
        sql: "SELECT kind FROM customers\nUNION\nSELECT category FROM shops",
      },
      {
        say: "겹침을 지우지 않고 그대로 쌓으면 UNION ALL이에요. 두 SELECT의 열 개수는 같아야 하고, ORDER BY는 맨 끝에 한 번만 써서 합친 결과 전체를 줄 세워요. 가장 비싼 셋과 가장 싼 셋이에요.",
        sql: "SELECT name, price FROM items\nWHERE price >= 300\nUNION ALL\nSELECT name, price FROM items\nWHERE price <= 6\nORDER BY price DESC, name",
      },
    ],
    items: [
      {
        type: "choice", concept: "union",
        q: "JOIN과 UNION의 차이로 맞는 것은?",
        options: ["JOIN은 열을 옆으로, UNION은 행을 아래로 붙인다", "JOIN은 행을 아래로, UNION은 열을 옆으로 붙인다", "둘은 같은 일을 한다"],
        answer: 0,
        explain: "JOIN은 짝을 맞춰 열을 늘리고, UNION은 두 결과를 위아래로 쌓아 행을 늘려요.",
      },
      {
        type: "choice", concept: "union",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT kind FROM customers\nUNION\nSELECT category FROM shops",
        options: ["7행", "68행", "3행"],
        answer: 0,
        explain: "손님 60명의 종류는 겹침이 지워져 3가지, 가게 종류 4가지, 합해 7행이에요. UNION은 한쪽 안의 겹침도 지워요.",
      },
      {
        type: "choice", concept: "union",
        q: "그 SQL 결과 표의 열 이름은?",
        options: ["kind", "category", "kind와 category 두 열"],
        answer: 0,
        explain: "열 이름은 첫 SELECT에서 와요. 둘째 SELECT의 category 값은 kind 열 아래에 쌓여요.",
      },
      {
        type: "choice", concept: "union",
        q: "UNION ALL로 바꾼 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT kind FROM customers\nUNION ALL\nSELECT category FROM shops",
        options: ["68행", "7행", "60행"],
        answer: 0,
        explain: "UNION ALL은 겹침을 지우지 않아 손님 60행과 가게 8행이 그대로, 68행이에요.",
      },
      {
        type: "choice", concept: "union",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT name, price FROM items\nUNION\nSELECT name FROM shops",
        options: ["오류가 난다", "물건과 가게 이름 48행이 나온다", "가게 행의 price가 빈칸으로 나온다"],
        answer: 0,
        explain: "위는 열 둘, 아래는 열 하나라 쌓을 수 없어 단서가 나와요. UNION 양쪽의 열 개수는 같아야 해요.",
      },
      {
        type: "choice", concept: "union",
        q: "UNION 뒤 맨 끝의 ORDER BY가 줄 세우는 것은?",
        options: ["합친 결과 전체", "둘째 SELECT의 결과만", "첫 SELECT의 결과만"],
        answer: 0,
        explain: "맨 끝 ORDER BY는 쌓은 뒤의 결과 전체에 걸려요. 카드에서 400엽전부터 5엽전까지 한 줄로 섰죠?",
      },
      {
        type: "choice", concept: "union",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT name FROM items\nWHERE price >= 300\nORDER BY name\nUNION\nSELECT name FROM shops",
        options: ["오류가 난다", "물건 셋이 이름 차례로 서고 가게 이름이 뒤에 붙는다", "가게 이름만 나온다"],
        answer: 0,
        explain: "ORDER BY는 UNION 앞 SELECT에 둘 수 없어 단서가 나와요. 맨 끝에 한 번만 써요.",
      },
      {
        type: "choice", concept: "union",
        q: "300엽전 이상인 물건과 7번 가게 물건의 이름을 겹침 없이 모은 결과는?",
        options: [
          { sql: "SELECT name FROM items\nWHERE price >= 300\nUNION\nSELECT name FROM items\nWHERE shop_id = 7" },
          { sql: "SELECT name FROM items\nWHERE price >= 300\nUNION ALL\nSELECT name FROM items\nWHERE shop_id = 7" },
          { sql: "SELECT name FROM items\nWHERE shop_id = 7" },
        ],
        answer: 0, tables: ["items"],
        explain: "6행이 정답이에요. 금방망이·도깨비방망이는 양쪽에 다 있어 UNION ALL이면 두 번씩 8행, 7번 가게만이면 장승이 빠진 5행이에요.",
      },
      {
        type: "blank", concept: "union",
        q: "겹치는 행도 모두 남게 빈자리를 채워 보세요.",
        code: "SELECT kind FROM customers\n___\nSELECT category FROM shops",
        chips: ["UNION ALL", "UNION", "JOIN"],
        answer: 0,
        explain: "UNION ALL이면 68행이 그대로 남아요. UNION은 겹침을 지워 7행, JOIN은 이 자리에 올 수 없어 단서예요.",
      },
      {
        type: "order", concept: "union",
        q: "사람을 뺀 손님 종류와 가게 종류를 한 열로 줄 세워 보게 줄을 놓아 보세요.",
        lines: ["SELECT kind FROM customers", "WHERE kind <> '사람'", "UNION", "SELECT category FROM shops", "ORDER BY kind"],
        expect: "kind\n공방\n도깨비\n먹거리\n약재\n여우\n잡화",
        explain: "WHERE는 자기 SELECT 바로 뒤, ORDER BY는 맨 끝에 한 번이에요. 여섯 종류가 가나다 차례로 섰어요.",
      },
      {
        id: "13-4-b1", type: "build", concept: "union",
        q: "손님 종류와 가게 종류를 겹침 없이 한 열로 모아 줘",
        cards: ["SELECT", "kind", "FROM", "customers", "UNION", "SELECT", "category", "FROM", "shops"],
        extra: ["UNION ALL", "kind, name"],
        tables: ["customers", "shops"],
        hints: [
          "손님 표의 종류 열과 가게 표의 종류 열을 위아래로 쌓고, 겹친 행은 하나만 남겨요.",
          "SELECT kind FROM customers 다음에 UNION, 그 뒤 SELECT category FROM shops예요.",
        ],
        explain: "도깨비·사람·여우와 먹거리·약재·잡화·공방, 7행이에요. UNION ALL이면 겹침이 남아 68행, kind, name이면 열 개수가 달라 단서가 나요.",
      },
      {
        id: "13-4-b2", type: "build", concept: "union",
        q: "가게 수와 물건 수를 label과 n 두 열로 한 표에 쌓아 줘",
        cards: ["SELECT", "'가게' AS label,", "COUNT(*) AS n", "FROM", "shops", "UNION ALL", "SELECT", "'물건', COUNT(*)", "FROM", "items"],
        extra: ["COUNT(*)", "customers"],
        tables: ["shops", "items"],
        hints: [
          "가게 표를 센 한 행과 물건 표를 센 한 행을 아래로 쌓아요. 열 이름은 첫 SELECT에서만 붙여요.",
          "SELECT '가게' AS label, COUNT(*) AS n FROM shops 다음에 UNION ALL과 둘째 SELECT예요.",
        ],
        explain: "가게 8, 물건 40, 두 행이에요. 둘째 SELECT는 별칭이 없어도 첫 SELECT의 label·n 아래에 쌓여요. COUNT(*)만 놓으면 열이 하나라 단서예요.",
      },
      {
        type: "check", concept: "union",
        q: "13-4에서 배운 것으로 맞는 말은?",
        options: [
          "UNION은 행을 쌓으며 겹침을 지우고, 양쪽 열 개수가 같아야 한다",
          "UNION ALL은 겹치는 행을 하나만 남긴다",
          "UNION 결과의 열 이름은 마지막 SELECT에서 온다",
        ],
        answer: 0,
        explain: "UNION은 겹침을 지우고 UNION ALL은 그대로 쌓아요. 열 개수는 같게, 열 이름은 첫 SELECT, ORDER BY는 맨 끝이에요.",
      },
    ],
  },
  {
    id: "13-5", chapter: 13, title: "13장 평가", isExam: true,
    goal: "WITH·FROM 안 서브쿼리로 중간 표를 만들고 UNION으로 쌓는다",
    summary: [
      "WITH 이름 AS (…) 다음 본문 SELECT",
      "FROM (SELECT …) t도 같은 중간 표",
      "UNION은 겹침 지움, UNION ALL은 그대로",
    ],
    cards: [
      {
        say: "13장 정리! WITH로 중간 표에 이름을 붙이고, FROM 안 서브쿼리로 같은 일을 하고, 중간 표를 잇거나 여럿 만들고, UNION으로 행을 쌓았어요. 아래는 대표 문제 「가게별 합계로 다시 순위」예요!",
        sql: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)\nSELECT *\nFROM shop_total\nORDER BY total DESC, shop_id\nLIMIT 3",
      },
    ],
    items: [
      {
        type: "choice", concept: "with",
        q: "WITH가 든 SQL에서 맨 앞에 오는 낱말은?",
        options: ["WITH", "SELECT", "FROM"],
        answer: 0,
        explain: "중간 표를 먼저 만들어야 하니 WITH가 맨 앞이에요. 본문 안에서는 여전히 SELECT가 FROM보다 먼저예요.",
      },
      {
        type: "choice", concept: "with",
        q: "가게별 합계 중간 표에서 합계가 200엽전 넘는 가게를 센 이 SQL의 결과 값은?",
        code: "WITH shop_total AS (\n  SELECT shop_id, SUM(price) AS total\n  FROM items\n  GROUP BY shop_id)\nSELECT COUNT(*) AS n\nFROM shop_total\nWHERE total > 200",
        options: ["4", "2", "8"],
        answer: 0,
        explain: "7번 1330·8번 1100·6번 232·3번 209엽전, 4곳이에요. 1000엽전 넘는 곳만이면 2곳이에요.",
      },
      {
        type: "choice", concept: "with",
        q: "중간 표를 둘 만들 때 둘째 중간 표 앞에 놓는 것은?",
        options: ["쉼표", "WITH 한 번 더", "AND"],
        answer: 0,
        explain: "WITH는 맨 앞에 한 번만 써요. 중간 표끼리는 쉼표로 이어요.",
      },
      {
        type: "choice", concept: "with",
        q: "가게별 완료 매출 중간 표를 가게 표와 이어 매출 1위 가게의 이름을 보면?",
        options: ["방망이 대장간", "뚝딱 공방", "바람 보따리"],
        answer: 0,
        explain: "방망이 대장간이 13440엽전으로 1위, 뚝딱 공방이 11030엽전으로 2위예요. 1만 엽전을 넘는 곳은 이 둘뿐이에요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "FROM 뒤 괄호 안 SELECT가 만든 표에 대해 맞는 말은?",
        options: ["행과 열이 여럿인 표여도 되고, 별칭을 붙여 쓴다", "값 하나(1행 1열)만 돌려줘야 한다", "GROUP BY를 쓸 수 없다"],
        answer: 0,
        explain: "FROM 뒤에는 표가 오니 행·열이 여럿이어도 돼요. 값 하나여야 하는 건 12장의 값 자리 서브쿼리예요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "이 SQL의 결과 값은?",
        code: "SELECT AVG(n) AS avg_n\nFROM (\n  SELECT village, COUNT(*) AS n\n  FROM customers\n  GROUP BY village) t",
        options: ["7.5", "60", "8"],
        answer: 0,
        explain: "손님 60명을 마을 8곳으로 나눈 7.5명이에요. 60은 손님 수, 8은 중간 표의 행 수예요.",
      },
      {
        type: "choice", concept: "fromsub",
        q: "손님별 주문 수의 평균을 내려면?",
        options: ["손님별 주문 수 표를 FROM 안에서 만들고 바깥에서 AVG", "AVG(COUNT(*))를 쓴다", "WHERE에 AVG를 쓴다"],
        answer: 0,
        explain: "셈 안에 셈은 단서가 나요. 먼저 센 표를 만들고 한 번 더 세요. 결과는 10.3684번이에요.",
      },
      {
        type: "choice", concept: "union",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name FROM items\nWHERE price >= 300\nUNION ALL\nSELECT name FROM items\nWHERE shop_id = 7",
        options: ["8행", "6행", "5행"],
        answer: 0,
        explain: "300엽전 이상 3행과 7번 가게 5행이 그대로 쌓여 8행이에요. 금방망이·도깨비방망이가 두 번씩 나와요. UNION이면 6행이에요.",
      },
      {
        type: "choice", concept: "union",
        q: "UNION 결과 표의 열 이름은 어디서 올까요?",
        options: ["첫 SELECT", "마지막 SELECT", "두 SELECT 중 더 긴 이름"],
        answer: 0,
        explain: "첫 SELECT가 열 이름을 정해요. 그래서 별칭도 첫 SELECT에만 붙이면 돼요.",
      },
      {
        type: "choice", concept: "union",
        q: "가장 비싼 셋과 가장 싼 셋을 값 차례로 한 표에 보인 결과는?",
        options: [
          { sql: "SELECT name, price FROM items\nWHERE price >= 300\nUNION ALL\nSELECT name, price FROM items\nWHERE price <= 6\nORDER BY price DESC, name" },
          { sql: "SELECT name, price FROM items\nWHERE price >= 300\nUNION ALL\nSELECT name, price FROM items\nWHERE price <= 6\nORDER BY price, name" },
          { sql: "SELECT name, price FROM items\nWHERE price >= 300\nORDER BY price DESC, name" },
        ],
        answer: 0,
        explain: "금방망이 400부터 식혜 5까지 6행이 정답이에요. DESC가 없으면 식혜부터 서고, 한쪽만 고르면 비싼 셋뿐이에요.",
      },
      {
        type: "blank", concept: "union",
        q: "손님 종류와 가게 종류가 겹침 없이 나오게 빈자리를 채워 보세요.",
        code: "SELECT kind FROM customers\n___\nSELECT category FROM shops",
        chips: ["UNION", "UNION ALL", "JOIN"],
        answer: 0,
        explain: "UNION은 겹침을 지워 7행이에요. UNION ALL은 68행이 그대로, JOIN은 이 자리에 올 수 없어 단서예요.",
      },
      {
        id: "13-5-b1", type: "build", concept: "with",
        q: "가게별 합계로 다시 순위를 매겨 위 3곳을 보여 줘",
        cards: ["WITH shop_total AS", "(SELECT shop_id,", "SUM(price) AS total", "FROM items GROUP BY shop_id)", "SELECT", "*", "FROM", "shop_total", "ORDER BY total DESC, shop_id", "LIMIT 3"],
        extra: ["LIMIT 5", "AVG(price) AS total"],
        tables: ["items"],
        hints: [
          "가게별 합계를 중간 표로 먼저 만들고, 본문에서 합계가 큰 차례로 줄 세워 3곳만 남겨요.",
          "WITH shop_total AS로 시작해 괄호를 닫고, SELECT * FROM shop_total 뒤에 ORDER BY와 LIMIT이에요.",
        ],
        explain: "13장의 대표 문제를 다시 풀었어요! 7·8·6번이에요. AVG면 가게 평균 값끼리 견주고, LIMIT 5면 3번·4번 가게까지 나와요.",
      },
      {
        id: "13-5-b2", type: "build", concept: "fromsub",
        q: "주문을 20번 이상 한 손님 수를 cnt로 보여 줘",
        cards: ["SELECT", "COUNT(*) AS cnt", "FROM", "(SELECT customer_id,", "COUNT(*) AS n", "FROM orders", "GROUP BY customer_id) t", "WHERE", "n >= 20"],
        extra: ["n > 20", "COUNT(*) >= 20"],
        tables: ["orders"],
        hints: [
          "손님마다 주문 수를 센 표를 FROM 안에 만들고, 바깥에서 그 수가 20 이상인 행을 세요.",
          "SELECT COUNT(*) AS cnt FROM 다음에 FROM 안 서브쿼리, 그 뒤 WHERE n >= 20이에요.",
        ],
        explain: "12명이에요. 딱 20번인 손님이 있어 > 20이면 11명, 바깥 WHERE에 COUNT를 쓰면 단서가 나요.",
      },
      {
        id: "13-5-b3", type: "build", concept: "union",
        q: "가게 이름과 물건 이름을 한 열로 모아 줘",
        cards: ["SELECT", "name", "FROM", "shops", "UNION", "SELECT", "name", "FROM", "items"],
        extra: ["name, price", "customers"],
        tables: ["shops", "items"],
        hints: [
          "가게 표의 이름 열과 물건 표의 이름 열을 위아래로 쌓아요.",
          "SELECT name FROM shops 다음에 UNION, 그 뒤 SELECT name FROM items예요.",
        ],
        explain: "가게 8곳과 물건 40가지, 48행이에요. 겹치는 이름이 없어 UNION ALL이어도 같아요. name, price를 놓으면 열 개수가 달라 단서예요.",
      },
      {
        type: "check", concept: "union",
        q: "13장에서 배운 것으로 맞는 말은?",
        options: [
          "중간 표를 WITH나 FROM 안 서브쿼리로 만들어 다시 고르고, UNION으로 결과를 쌓는다",
          "WITH로 만든 표는 장부에 새로 남는다",
          "UNION은 양쪽 열 개수가 달라도 된다",
        ],
        answer: 0,
        explain: "10~13장의 조인 장인 끝! 실무에서는 주문·상품 표를 JOIN해 가게별 매출 중간 표를 만들고, 다시 순위를 매기거나 여러 보고서를 UNION으로 쌓아요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 13장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - 13-T1 N: 4~10. 마을별 손님 수 중간 표에서 n >= N(정답) / n < N / n = N. 손님 수 11·9·9·8·8·6·6·3이라
//   N = 4~10은 >= 쪽이 1~7행, < 쪽이 1~7행, = 쪽이 0~2행이다. 셋 다 행 수나 앞 5행이 다르다(= 쪽 0행이면 「0행」 표).
// - 13-T2 S: 완료·취소. 손님별 그 상태 주문 수 중 가장 큰 값(MAX) / SUM은 그 상태 주문 전체, COUNT는 그 상태로 주문한 손님 수.
//   완료: MAX 39 · SUM 542 · COUNT 57, 취소: MAX 6 · SUM 49 · COUNT 28 — 칩끼리 같은 값이 없다(점검기가 칩마다 돌려 확인).
// - 13-T3 K, A: 종류 셋, 나이 50~70. UNION(정답, 겹침 없는 마을) / UNION ALL(겹침 남음) / 첫 SELECT만(종류 마을의 겹침 남음).
export const TEMPLATES = [
  {
    id: "13-T1", concept: "with", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "WITH village_n AS (\n  SELECT village, COUNT(*) AS n\n  FROM customers\n  GROUP BY village)\nSELECT *\nFROM village_n\nWHERE n >= {N}",
    wrong: [
      "WITH village_n AS (\n  SELECT village, COUNT(*) AS n\n  FROM customers\n  GROUP BY village)\nSELECT *\nFROM village_n\nWHERE n < {N}",
      "WITH village_n AS (\n  SELECT village, COUNT(*) AS n\n  FROM customers\n  GROUP BY village)\nSELECT *\nFROM village_n\nWHERE n = {N}",
    ],
    vars: { N: [4, 5, 6, 7, 8, 9, 10] },
    explain: "중간 표 village_n은 마을마다 손님 수 n을 한 행씩 가져요. 본문은 그중 n이 {N} 이상인 마을만 골라요.",
  },
  {
    id: "13-T2", concept: "fromsub", type: "blank",
    q: "손님 한 명의 {S} 주문 수 중 가장 큰 값이 나오게 빈자리를 채워 보세요.",
    sql: "SELECT ___(n) AS v\nFROM (\n  SELECT customer_id, COUNT(*) AS n\n  FROM orders\n  WHERE status = '{S}'\n  GROUP BY customer_id) t",
    chips: ["MAX", "SUM", "COUNT"],
    answer: 0,
    vars: { S: ["완료", "취소"] },
    explain: "FROM 안 중간 표가 손님마다 {S} 주문 수 n을 내고, 바깥 MAX가 그중 가장 큰 값을 골라요. SUM은 주문 전체, COUNT는 손님 수예요.",
  },
  {
    id: "13-T3", concept: "union", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT village FROM customers\nWHERE kind = '{K}'\nUNION\nSELECT village FROM customers\nWHERE age >= {A}",
    wrong: [
      "SELECT village FROM customers\nWHERE kind = '{K}'\nUNION ALL\nSELECT village FROM customers\nWHERE age >= {A}",
      "SELECT village FROM customers\nWHERE kind = '{K}'",
    ],
    vars: { K: ["도깨비", "사람", "여우"], A: { min: 50, max: 70 } },
    explain: "UNION은 두 결과를 쌓으며 겹치는 마을을 하나만 남겨요. UNION ALL이면 같은 마을이 여러 번 나와요.",
  },
];
