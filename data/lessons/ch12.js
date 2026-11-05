// 12장 「질문 속 질문」 (설계 §6: 서브쿼리 IN (SELECT …), 값 하나 서브쿼리 / 장터 예: 평균보다 비싼 물건).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 12
// 12장 낱말은 11장까지에 서브쿼리 모양 「(SELECT」와 EXISTS(판정 R23)를 더한 것이다. EXISTS는 12-4 둘째 카드에서 보여 준다.
// NOT IN은 4장 NOT과 IN이라 새 낱말이 아니다. ALL(> ALL …)은 13장 낱말이라 쓰지 않는다.
// 면접 문제 유형(설계 §6 참고 줄) 「N번째로 비싼 것」(12-2)과 「중복 찾기」(12-3)는 장터 데이터로 새로 썼다.
// - 장터 예 「평균보다 비싼 물건」(12-1-b1·12-5-b1): SELECT * FROM items WHERE price > (SELECT AVG(price) FROM items)
//   → 평균 79.525엽전(합 3181 ÷ 40)보다 비싼 12가지: 금방망이 400·장승 350·도깨비방망이 320·은방망이 280·쇠솥 260·놋그릇 190·
//   작은 방망이 180·다듬이방망이 170·방망이 손잡이 150·빨래방망이 130·산삼 120·갓 110. 싼 쪽(<)은 28가지.
//   평균이 어느 값과도 같지 않아 > 와 >= 결과가 같다(그래서 >=는 헷갈림 카드로 쓰지 않음).
//   7장 7-5(「평균과 견주는 법은 12장에서」)의 약속을 12-1에서 갚는다: 나이 평균 42.7091(나이 아는 55명) → 더 많은 손님 26명.
// - 확인한 값(data/market.sql, openEngine):
//   가장 비싼 값 400(금방망이), 둘째 350(장승). 가장 싼 값 5(식혜), 둘째 6(인절미·한지 동점), 셋째 7(송편).
//   ORDER BY price, item_id LIMIT 1 OFFSET 2 → 한지 6(행으로 셋째). DISTINCT price … LIMIT 1 OFFSET 2 → 7(값으로 셋째).
//   값이 같은 물건이 또 있는 값 6가지(6·8·9·12·25·28엽전, 각 2개) → 그 물건 12가지. 세 개 이상 겹친 값은 없다.
//   공방 가게 7·8번 → 물건 10가지(공방 아닌 30가지). 주문한 적 있는 손님 57명(JOIN이면 591행, DISTINCT면 57).
//   NOT IN (SELECT customer_id FROM orders) → 임바다·표다솜·돌쇠 3명(11장 LEFT JOIN과 같은 답).
//   취소한 적 있는 손님 28명(IN·EXISTS 둘 다), 취소 없는 손님 32명. 은행나무마을 9명 중 주문 있는 7명.
//   안 팔린 물건(NOT EXISTS order_items) 꿀떡·보따리.
//   가게별 평균 값: 1번 12.8·2번 7·3번 41.8·4번 23.2·5번 19·6번 46.4·7번 266·8번 220(틀 12-T1).
// - NOT IN 빈칸 함정: 번호 열(orders.customer_id, order_items.item_id·order_id, items.shop_id)에는 빈칸이 없어 함정이 안 나온다.
//   빈칸이 있는 열은 items.stock(3개)·customers.age(5개: 사람 4·도깨비 1, 여우 0). 그래서 함정은 나이로 보인다:
//   age NOT IN (SELECT age FROM customers WHERE kind = '사람') → 0행(사람 나이 목록에 빈칸 4개).
//   괄호 안에 AND age IS NOT NULL을 붙이면 31명(도깨비·여우만, 사람은 자기 나이가 목록에 있어 빠짐). IN 쪽은 빈칸이 있어도 24명.
// - 엔진마다 다른 것(판정 R36): 값 자리 서브쿼리가 여러 행을 내면 PostgreSQL·MySQL은 오류, 이 장터(SQLite)는 오류 없이 그중
//   한 행의 값만 쓴다 → 「이 장터에서는」을 붙여 말하고 그런 SQL은 화면에 보이지 않는다. 열이 여럿이면 어디서나 오류다
//   (값 자리: row value misused, IN 자리: sub-select returns 2 columns — data/errors.js에 두억이 말이 있음).
// - 실행기 검사: 문장이 「(」로 시작하면 막히므로(작업 3 R5 메모) 모든 SQL은 SELECT로 시작한다. 서브쿼리는 늘 WHERE 뒤에 있다.
// - 조립 카드(판정 R38·R40): 바깥 SELECT·FROM·WHERE는 한 장씩. 서브쿼리는 여는 카드 「(SELECT AVG(price)」와 닫는 카드
//   「FROM items)」처럼 괄호를 카드 안에 붙인다(괄호 낱장은 두지 않음). 괄호 안 WHERE는 바깥처럼 한 장, 조건 끝에 「)」를 붙인다.
//   12-1-b1만 여는 괄호와 SELECT·셈·FROM·표를 모두 낱장으로 두어 서브쿼리도 SELECT … FROM 문장임을 한 번 직접 놓게 했다.
//   EXISTS 괄호 안은 「(SELECT * FROM orders o」 한 장(무엇을 고르든 상관없는 부분)과 짝 조건 한 장.
//   서브쿼리 전체 「(SELECT AVG(price) FROM items)」(30칸)를 한 장으로 둘 수도 있지만 괄호 자리를 놓는 연습이 빠져 쓰지 않았다.
// - 헷갈림 카드 주의: 괄호 안 표에 없는 열 이름은 오류가 아니라 바깥 표의 열로 읽힌다(모르는 사이 EXISTS 같은 「바깥 부르기」가 됨).
//   예: (SELECT item_id FROM shops WHERE category = '공방')은 바깥 items.item_id를 써서 국밥 1행이 나온다. 그래서 「열이 없어 단서」라고
//   쓰지 않고, 헷갈림 카드는 괄호 안 표에 실제로 있는 열(가게 name → 0행)로 골랐다.
export const CHAPTER = { id: 12, title: "질문 속 질문" };

export const LESSONS = [
  {
    id: "12-1", chapter: 12, title: "값 하나 서브쿼리",
    goal: "괄호 안 SELECT로 값 하나를 구해 WHERE에서 견준다",
    summary: [
      "괄호 안 SELECT = 서브쿼리",
      "평균보다 비싼 = price > (평균)",
      "값 자리 서브쿼리는 1행 1열",
    ],
    cards: [
      {
        say: "7장에서 WHERE에 AVG를 바로 쓰면 오류였죠? 평균을 구하는 SELECT를 괄호에 넣어 값 자리에 두면 돼요. 괄호 안 SELECT를 서브쿼리(질문 속 질문)라 해요. 12장 대표 문제 「평균보다 비싼 물건」!",
        sql: "SELECT name, price\nFROM items\nWHERE price >\n  (SELECT AVG(price) FROM items)",
      },
      {
        say: "아래는 괄호 안만 따로 돌린 결과예요. 값 하나, 79.525엽전! 바깥 WHERE는 이 값과 견줘요. 그래서 값 자리의 서브쿼리는 1행 1열, 값 하나를 돌려줘야 해요.",
        sql: "SELECT AVG(price) AS avg_price\nFROM items",
      },
    ],
    items: [
      {
        type: "choice", concept: "subvalue",
        q: "WHERE 뒤 괄호 안에 넣은 SELECT를 무엇이라 부를까요?",
        options: ["서브쿼리", "별칭", "조인"],
        answer: 0,
        explain: "질문 안에 든 또 하나의 질문, 서브쿼리예요. 별칭은 AS로 붙인 이름, 조인은 표 잇기예요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL에서 괄호 안 SELECT가 하는 일은?",
        code: "SELECT name, price\nFROM items\nWHERE price >\n  (SELECT AVG(price) FROM items)",
        options: ["물건 값의 평균 하나를 구해 견줄 값으로 준다", "물건마다 평균을 하나씩 구한다", "평균보다 비싼 물건을 고른다"],
        answer: 0,
        explain: "괄호 안은 평균 79.525 하나를 내요. 비싼 물건을 고르는 건 바깥 WHERE가 그 값과 견주어 하는 일이에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE price >\n  (SELECT AVG(price) FROM items)",
        options: ["12행", "28행", "40행"],
        answer: 0,
        explain: "79.525엽전보다 비싼 물건은 방망이들과 장승·쇠솥·놋그릇·산삼·갓, 12가지예요. 28은 평균보다 싼 물건 수예요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "괄호 안만 따로 돌린 이 SQL의 결과 값은?",
        code: "SELECT AVG(price) AS avg_price\nFROM items",
        options: ["79.525", "3181", "40"],
        answer: 0,
        explain: "값 합 3181을 물건 수 40으로 나눈 79.525예요. 3181은 SUM, 40은 COUNT예요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "7장에서 오류였던 WHERE age > AVG(age)를 고치려면?",
        options: ["AVG(age)를 (SELECT AVG(age) FROM customers)로 바꾼다", "AVG(age)를 SUM(age)로 바꾼다", "WHERE 뒤에 GROUP BY를 붙인다"],
        answer: 0,
        explain: "WHERE는 모으기 전 단계라 셈 함수를 바로 못 써요. 서브쿼리로 평균을 먼저 구해 값 하나로 건네면 돼요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "평균 나이보다 나이 많은 손님을 센 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM customers\nWHERE age >\n  (SELECT AVG(age) FROM customers)",
        options: ["26", "55", "60"],
        answer: 0,
        explain: "평균은 나이를 아는 55명으로 낸 42.7091살이고, 그보다 많은 손님은 26명이에요. 나이가 빈칸인 손님은 견줄 수 없어 빠져요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT name\nFROM items\nWHERE price > (SELECT AVG(price),\n  MAX(price) FROM items)",
        options: ["오류가 난다", "평균보다 비싼 물건이 나온다", "가장 비싼 물건이 나온다"],
        answer: 0,
        explain: "괄호 안이 열 두 개를 내서 값 하나와 견줄 수 없어 단서가 나와요. 값 자리 서브쿼리는 열 하나만 골라요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "값 자리(> 뒤) 서브쿼리가 여러 행을 내면 어떻게 될까요?",
        options: ["많은 데이터베이스는 오류, 이 장터에서는 그중 한 값만 써서 엉뚱한 답", "모든 행과 한 번씩 견주어 다 남긴다", "늘 0행이 나온다"],
        answer: 0,
        explain: "PostgreSQL·MySQL은 오류로 알려 주지만 이 장터에서는 오류 없이 한 값만 골라 써요. 그래서 값 자리에는 AVG·MAX처럼 값 하나를 내는 SELECT를 둬요.",
      },
      {
        type: "blank", concept: "subvalue",
        q: "평균보다 비싼 물건이 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price >\n  (___ AVG(price) FROM items)",
        chips: ["SELECT", "WHERE", "AVG"],
        answer: 0,
        explain: "괄호 안도 SELECT로 시작하는 문장 하나예요. WHERE나 AVG를 넣으면 문장이 되지 않아 단서가 나와요.",
      },
      {
        type: "order", concept: "subvalue",
        q: "평균보다 싼 물건의 이름과 값을 보게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE price <", "(SELECT AVG(price) FROM items)"],
        explain: "서브쿼리는 견줄 값 자리, WHERE price < 바로 뒤에 와요. 식혜·인절미 같은 28가지가 나와요.",
      },
      {
        id: "12-1-b1", type: "build", concept: "subvalue",
        q: "평균보다 비싼 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "price >", "(SELECT", "AVG(price)", "FROM", "items)"],
        extra: ["price <", "MAX(price)"],
        tables: ["items"],
        hints: [
          "물건 값의 평균을 괄호 안 SELECT로 먼저 구하고, 그 값보다 큰 물건을 골라요.",
          "WHERE price > 다음에 (SELECT, AVG(price), FROM, items) 차례예요.",
        ],
        explain: "12장의 대표 문제예요! 79.525엽전보다 비싼 12가지가 나왔어요. MAX면 400보다 비싼 물건이 없어 0행, <면 싼 28가지예요.",
      },
      {
        id: "12-1-b2", type: "build", concept: "subvalue",
        q: "평균 나이보다 나이 많은 손님의 이름을 보여 줘",
        cards: ["SELECT", "name", "FROM", "customers", "WHERE", "age >", "(SELECT AVG(age)", "FROM customers)"],
        extra: ["age <", "(SELECT MAX(age)"],
        tables: ["customers"],
        hints: [
          "손님 나이의 평균을 서브쿼리로 구하고, 그보다 나이 많은 손님을 골라요.",
          "WHERE age > 다음에 (SELECT AVG(age)와 FROM customers)예요.",
        ],
        explain: "26명이에요. 7장에서 미룬 「평균과 견주기」를 풀었어요! MAX면 가장 많은 나이보다 많은 손님이 없어 0행이에요.",
      },
      {
        type: "check", concept: "subvalue",
        q: "12-1에서 배운 것으로 맞는 말은?",
        options: [
          "값 자리에 서브쿼리를 두면 그 값 하나와 견줄 수 있다",
          "서브쿼리는 열을 여러 개 내도 값 자리에 둘 수 있다",
          "WHERE에는 AVG를 바로 써도 된다",
        ],
        answer: 0,
        explain: "괄호 안 SELECT가 평균 같은 값 하나를 내면 WHERE가 그 값과 견줘요. 열이 둘이면 단서가 나와요.",
      },
    ],
  },
  {
    id: "12-2", chapter: 12, title: "N번째로 비싼 것",
    goal: "MAX 서브쿼리로 가장·두 번째 값을 찾고 같은 값을 다룬다",
    summary: [
      "가장 비싼 물건 = price = (MAX)",
      "둘째 값 = MAX보다 작은 것의 MAX",
      "값으로 N번째는 DISTINCT 뒤 OFFSET",
    ],
    cards: [
      {
        say: "가장 비싼 물건의 이름은? 7장 MAX는 값만 알려 줘요. 그 값을 서브쿼리로 구해 = 로 견주면 이름까지! 두 번째로 비싼 값은 가장 비싼 값보다 작은 것 중 MAX예요.",
        sql: "SELECT name, price\nFROM items\nWHERE price =\n  (SELECT MAX(price) FROM items)",
      },
      {
        say: "조심! 5장 OFFSET은 행을 세서, 6엽전 인절미·한지처럼 값이 같은 물건이 있으면 같은 값을 두 번 세요. 값으로 세려면 DISTINCT로 겹침을 없애요. 아래는 두 번째로 싼 값 6엽전의 물건 둘이에요.",
        sql: "SELECT name, price\nFROM items\nWHERE price = (\n  SELECT DISTINCT price\n  FROM items\n  ORDER BY price\n  LIMIT 1 OFFSET 1)",
      },
    ],
    items: [
      {
        type: "choice", concept: "subvalue",
        q: "가장 비싼 물건의 이름을 구할 때 WHERE price = 뒤에 놓을 것은?",
        options: ["(SELECT MAX(price) FROM items)", "MAX(price)", "(SELECT price FROM items)"],
        answer: 0,
        explain: "값 하나 400을 내는 서브쿼리가 와야 해요. MAX(price)를 바로 쓰면 단서가 나고, price만 고르면 여러 행이라 값 하나가 아니에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL 결과에 나오는 물건은?",
        code: "SELECT name, price\nFROM items\nWHERE price =\n  (SELECT MAX(price) FROM items)",
        options: ["금방망이", "장승", "산삼"],
        answer: 0,
        explain: "가장 비싼 값 400엽전인 금방망이예요. 장승은 두 번째로 비싼 350엽전이에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL의 결과 값은?",
        code: "SELECT MAX(price) AS second_price\nFROM items\nWHERE price <\n  (SELECT MAX(price) FROM items)",
        options: ["350", "400", "320"],
        answer: 0,
        explain: "400보다 싼 물건 중 가장 비싼 값, 장승의 350이에요. 400은 가장 비싼 값, 320은 세 번째예요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "그 SQL에서 < 대신 <= 를 쓰면 결과 값은?",
        options: ["400", "350", "오류가 난다"],
        answer: 0,
        explain: "<= 면 400인 금방망이도 들어가서 MAX가 다시 400이에요. 「가장 큰 값보다 작은」이라 < 를 써요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "세 번째로 싼 값을 찾으려던 이 SQL이 내놓는 물건은?",
        code: "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT 1 OFFSET 2",
        options: ["한지", "송편", "인절미"],
        answer: 0,
        explain: "식혜 5, 인절미 6, 한지 6 차례라 행으로 셋째는 한지예요. 6엽전을 두 번 세서, 값으로 셋째인 7엽전 송편이 아니에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "겹침을 없앤 이 SQL의 결과 값은?",
        code: "SELECT DISTINCT price\nFROM items\nORDER BY price\nLIMIT 1 OFFSET 2",
        options: ["7", "6", "8"],
        answer: 0,
        explain: "DISTINCT로 5·6·7 … 값마다 한 행이 돼요. 두 행을 건너뛰면 셋째 값 7엽전이에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "두 번째로 싼 값의 물건을 같은 값끼리 모두 보인 결과는?",
        options: [
          { sql: "SELECT name, price\nFROM items\nWHERE price = (\n  SELECT DISTINCT price\n  FROM items\n  ORDER BY price\n  LIMIT 1 OFFSET 1)" },
          { sql: "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT 1 OFFSET 1" },
          { sql: "SELECT name, price\nFROM items\nWHERE price = (\n  SELECT DISTINCT price\n  FROM items\n  ORDER BY price\n  LIMIT 1 OFFSET 2)" },
        ],
        answer: 0, tables: ["items"],
        explain: "6엽전 인절미·한지 2행이 정답이에요. 행으로 세면 인절미 하나만 나오고, OFFSET 2면 셋째 값 7엽전 송편이에요.",
      },
      {
        type: "blank", concept: "subvalue",
        q: "두 번째로 비싼 값이 나오게 빈자리를 채워 보세요.",
        code: "SELECT MAX(price) AS second_price\nFROM items\nWHERE price ___\n  (SELECT MAX(price) FROM items)",
        chips: ["<", "<=", "="],
        answer: 0,
        explain: "가장 비싼 400보다 작은 값만 남겨 그중 MAX, 350이에요. <= 나 = 면 400이 남아 400이 나와요.",
      },
      {
        type: "order", concept: "subvalue",
        q: "가장 싼 물건의 이름과 값을 보게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE price =", "(SELECT MIN(price) FROM items)"],
        expect: "name | price\n식혜 | 5",
        explain: "MIN으로 가장 싼 값 5를 구해 = 로 견줬어요. 같은 값이 또 있었다면 함께 나왔을 거예요.",
      },
      {
        id: "12-2-b1", type: "build", concept: "subvalue",
        q: "가장 비싼 물건의 이름을 보여 줘",
        cards: ["SELECT", "name", "FROM", "items", "WHERE", "price =", "(SELECT MAX(price)", "FROM items)"],
        extra: ["(SELECT MIN(price)", "price >"],
        tables: ["items"],
        hints: [
          "가장 비싼 값을 서브쿼리로 구하고, 값이 그와 같은 물건을 골라요.",
          "WHERE price = 다음에 (SELECT MAX(price)와 FROM items)예요.",
        ],
        explain: "금방망이예요! MIN이면 가장 싼 식혜, > 면 400보다 비싼 물건이 없어 0행이에요. 같은 값이 둘이면 둘 다 나와요.",
      },
      {
        id: "12-2-b2", type: "build", concept: "subvalue",
        q: "두 번째로 비싼 값을 second_price라는 이름으로 보여 줘",
        cards: ["SELECT", "MAX(price) AS second_price", "FROM", "items", "WHERE", "price <", "(SELECT MAX(price)", "FROM items)"],
        extra: ["price <=", "MIN(price) AS second_price"],
        tables: ["items"],
        hints: [
          "가장 비싼 값보다 작은 물건만 남기고, 그중 가장 큰 값을 구해요.",
          "SELECT 뒤 MAX(price) AS second_price, WHERE price < 다음에 서브쿼리예요.",
        ],
        explain: "350엽전이에요. <= 면 400이 다시 들어오고, MIN이면 가장 싼 5가 나와요. 면접에서도 자주 나오는 모양이에요.",
      },
      {
        type: "check", concept: "subvalue",
        q: "12-2에서 배운 것으로 맞는 말은?",
        options: [
          "같은 값이 있을 때 값으로 N번째를 세려면 DISTINCT 뒤 OFFSET을 쓴다",
          "LIMIT 1 OFFSET 2는 언제나 값으로 세 번째를 낸다",
          "가장 비싼 물건의 이름은 WHERE price = MAX(price)로 구한다",
        ],
        answer: 0,
        explain: "OFFSET은 행을 세서 같은 값을 두 번 셀 수 있어요. 값으로 세려면 DISTINCT, 이름까지 보려면 서브쿼리로 견줘요.",
      },
    ],
  },
  {
    id: "12-3", chapter: 12, title: "IN으로 목록 받기",
    goal: "IN (SELECT …)로 다른 표에서 고른 목록과 견주고 중복을 찾는다",
    summary: [
      "IN (SELECT 열 …) = 그 목록 안에",
      "JOIN으로도 같은 답, 겹침은 DISTINCT",
      "중복 찾기 = HAVING COUNT(*) > 1",
    ],
    cards: [
      {
        say: "4장 IN (7, 8)은 목록을 손으로 적었죠? 서브쿼리가 목록을 만들어 줘요. 아래 괄호 안은 공방 가게 번호 7·8을 내고, 바깥은 그 가게 물건을 골라요. 이 자리는 여러 행이어도 되지만 열은 하나!",
        sql: "SELECT name, shop_id\nFROM items\nWHERE shop_id IN\n  (SELECT shop_id FROM shops\n   WHERE category = '공방')",
      },
      {
        say: "「중복 찾기」예요. 괄호 안에서 8장 GROUP BY·HAVING으로 두 번 넘게 나온 값만 목록을 만들고, 바깥은 그 값의 물건을 모두 보여요. 값이 같은 짝 6쌍, 12가지가 나와요!",
        sql: "SELECT name, price\nFROM items\nWHERE price IN\n  (SELECT price FROM items\n   GROUP BY price\n   HAVING COUNT(*) > 1)\nORDER BY price, item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "subin",
        q: "서브쿼리 부분만 돌린 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT shop_id FROM shops\nWHERE category = '공방'",
        options: ["2행", "10행", "8행"],
        answer: 0,
        explain: "공방은 방망이 대장간(7)과 뚝딱 공방(8), 2행이에요. 이 두 번호가 IN의 목록이 돼요. 10은 두 가게의 물건 수예요.",
      },
      {
        type: "choice", concept: "subin",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, shop_id\nFROM items\nWHERE shop_id IN\n  (SELECT shop_id FROM shops\n   WHERE category = '공방')",
        options: ["10행", "2행", "40행"],
        answer: 0,
        explain: "7·8번 가게의 물건 10가지예요. 2는 괄호 안 목록의 행 수, 40은 물건 전체예요.",
      },
      {
        type: "choice", concept: "subin",
        q: "IN 뒤에 오는 서브쿼리에 대해 맞는 말은?",
        options: ["여러 행이어도 되지만 열은 하나여야 한다", "행도 열도 하나여야 한다", "열이 여러 개여도 된다"],
        answer: 0,
        explain: "IN은 목록을 받으니 행은 여럿이어도 돼요. 다만 견줄 값은 열 하나에서 나와야 해요.",
      },
      {
        type: "choice", concept: "subin",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT name\nFROM items\nWHERE shop_id IN\n  (SELECT shop_id, name FROM shops)",
        options: ["오류가 난다", "물건 40가지가 나온다", "가게 이름이 나온다"],
        answer: 0,
        explain: "괄호 안이 열 두 개를 내서 단서가 나와요. IN 목록에는 shop_id 하나만 골라요.",
      },
      {
        type: "choice", concept: "subin",
        q: "손님 표에 주문 표를 JOIN으로 이어 센 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id",
        options: ["591", "57", "60"],
        answer: 0,
        explain: "주문 하나마다 한 행이라 591이에요. 주문이 여러 건인 손님은 여러 번 세어졌어요.",
      },
      {
        type: "choice", concept: "subin",
        q: "IN (SELECT …)으로 주문한 적 있는 손님을 센 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM customers\nWHERE customer_id IN\n  (SELECT customer_id FROM orders)",
        options: ["57", "591", "60"],
        answer: 0,
        explain: "손님 표의 행을 거르기만 하니 손님마다 한 번, 57명이에요. 60명 중 주문 없는 3명이 빠졌어요.",
      },
      {
        type: "choice", concept: "subin",
        q: "주문한 적 있는 손님 이름을 한 번씩 볼 때 IN과 JOIN의 차이는?",
        options: ["IN은 손님마다 한 번, JOIN은 주문마다 한 행이라 DISTINCT가 필요하다", "IN은 손님 이름을 보여 줄 수 없다", "JOIN은 주문 없는 손님도 남긴다"],
        answer: 0,
        explain: "같은 답을 두 길로 낼 수 있어요. JOIN은 주문 열도 함께 볼 때, IN은 「목록 안에 있나」만 물을 때 편해요.",
      },
      {
        type: "choice", concept: "subin",
        q: "값이 같은 짝이 있는 물건의 이름을 모두 보인 결과는?",
        options: [
          { sql: "SELECT name\nFROM items\nWHERE price IN\n  (SELECT price FROM items\n   GROUP BY price\n   HAVING COUNT(*) > 1)" },
          { sql: "SELECT name\nFROM items\nWHERE price IN\n  (SELECT price FROM items\n   GROUP BY price\n   HAVING COUNT(*) = 1)" },
          { sql: "SELECT price, COUNT(*) AS n\nFROM items\nGROUP BY price\nHAVING COUNT(*) > 1" },
        ],
        answer: 0, tables: ["items"],
        explain: "물건 이름 12가지가 정답이에요. = 1이면 값이 하나뿐인 28가지, 서브쿼리 없이 묶으면 이름 없이 값 6가지만 보여요.",
      },
      {
        type: "blank", concept: "subin",
        q: "값이 같은 물건이 또 있는 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price IN\n  (SELECT price FROM items\n   GROUP BY price\n   HAVING COUNT(*) ___ 1)",
        chips: [">", "=", "<"],
        answer: 0,
        explain: "두 번 이상 나온 값은 COUNT(*) > 1이에요. = 1이면 값이 하나뿐인 물건, < 1이면 그런 묶음이 없어 0행이에요.",
      },
      {
        type: "order", concept: "subin",
        q: "약재 가게에서 파는 물건의 이름을 보게 줄을 놓아 보세요.",
        lines: ["SELECT name", "FROM items", "WHERE shop_id IN", "(SELECT shop_id FROM shops", "WHERE category = '약재')"],
        explain: "괄호 안에서 약재 가게 번호 3·4를 고르고, 바깥은 그 번호의 물건을 골라요. 산삼·감초 같은 10가지예요.",
      },
      {
        id: "12-3-b1", type: "build", concept: "subin",
        q: "공방 가게에서 파는 물건의 이름을 보여 줘",
        cards: ["SELECT", "name", "FROM", "items", "WHERE", "shop_id IN", "(SELECT shop_id", "FROM shops", "WHERE", "category = '공방')"],
        extra: ["category = '약재')", "(SELECT name"],
        tables: ["items", "shops"],
        hints: [
          "가게 표에서 공방 가게 번호 목록을 먼저 고르고, 그 번호의 물건을 골라요.",
          "WHERE shop_id IN 다음에 (SELECT shop_id, FROM shops, WHERE, 공방 조건이에요.",
        ],
        explain: "방망이와 놋그릇·쇠솥·장승, 10가지예요. 가게 이름(name)을 고르면 번호와 이름을 견줘 0행, 약재면 약방 물건이 나와요.",
      },
      {
        id: "12-3-b2", type: "build", concept: "subin",
        q: "값이 같은 물건이 또 있는 물건의 이름을 보여 줘",
        cards: ["SELECT", "name", "FROM", "items", "WHERE", "price IN", "(SELECT price", "FROM items", "GROUP BY price", "HAVING COUNT(*) > 1)"],
        extra: ["HAVING COUNT(*) = 1)", "(SELECT name"],
        tables: ["items"],
        hints: [
          "괄호 안에서 값마다 묶어 두 번 넘게 나온 값만 고르고, 그 값의 물건을 보여요.",
          "WHERE price IN 다음에 (SELECT price, FROM items), GROUP BY price, HAVING 조건이에요.",
        ],
        explain: "인절미·한지, 도토리묵·꿀떡 같은 12가지예요. 면접에 자주 나오는 「중복 찾기」예요! = 1이면 값이 하나뿐인 물건, name을 고르면 0행이에요.",
      },
      {
        type: "check", concept: "subin",
        q: "12-3에서 배운 것으로 맞는 말은?",
        options: [
          "IN (SELECT …)는 열 하나짜리 목록을 받고, 같은 답을 JOIN으로도 낼 수 있다",
          "IN 뒤 서브쿼리는 값 하나(1행)만 내야 한다",
          "IN (SELECT …)은 JOIN과 달리 다른 표를 볼 수 없다",
        ],
        answer: 0,
        explain: "IN 서브쿼리는 행이 여럿인 목록을 받아요. 다른 표에서 목록을 만들 수 있어 JOIN과 같은 답도 나와요.",
      },
    ],
  },
  {
    id: "12-4", chapter: 12, title: "NOT IN과 EXISTS",
    goal: "NOT IN의 빈칸 함정을 알고 EXISTS로 짝이 있는지 묻는다",
    summary: [
      "목록에 빈칸이 있으면 NOT IN은 0행",
      "괄호 안 IS NOT NULL로 빈칸 빼기",
      "EXISTS = 한 행이라도 있나요?",
    ],
    cards: [
      {
        say: "함정 하나! NOT IN 목록에 빈칸(NULL)이 하나라도 있으면 결과는 0행이에요. 6장에서 빈칸과 견주면 참도 거짓도 아니었죠? 사람 손님 나이에 빈칸이 4개라 아래는 0행! 괄호 안에 IS NOT NULL을 붙이면 31명이 나와요.",
        sql: "SELECT name, age\nFROM customers\nWHERE age NOT IN\n  (SELECT age FROM customers\n   WHERE kind = '사람')",
      },
      {
        say: "EXISTS(이그지스츠)는 괄호 안이 한 행이라도 내면 참이에요. 괄호 안이 바깥 손님 c를 불러, 손님마다 다시 물어요. NOT EXISTS는 빈칸 함정이 없어 「한 번도 안 산 손님」 찾기에 안전해요.",
        sql: "SELECT c.name\nFROM customers c\nWHERE NOT EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
      },
    ],
    items: [
      {
        type: "choice", concept: "subin",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM customers\nWHERE customer_id NOT IN\n  (SELECT customer_id FROM orders)",
        options: ["3행", "57행", "0행"],
        answer: 0,
        explain: "임바다·표다솜·돌쇠, 11장 LEFT JOIN과 같은 답이에요. 주문 표의 손님 번호에는 빈칸이 없어 함정이 없어요.",
      },
      {
        type: "choice", concept: "subin",
        q: "사람 손님 나이 목록에 NOT IN을 쓴 SQL이 0행인 까닭은?",
        options: ["목록의 빈칸 때문에 「목록에 없다」가 참이 되지 않아서", "사람 손님 나이가 모든 나이를 다 가져서", "NOT IN은 서브쿼리와 함께 쓸 수 없어서"],
        answer: 0,
        explain: "NOT IN은 목록의 모든 값과 「같지 않다」를 확인해요. 빈칸과는 참도 거짓도 아니라 어느 손님도 끝내 참이 되지 못해요.",
      },
      {
        type: "choice", concept: "subin",
        q: "괄호 안에서 빈칸을 뺀 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM customers\nWHERE age NOT IN\n  (SELECT age FROM customers\n   WHERE kind = '사람'\n     AND age IS NOT NULL)",
        options: ["31", "0", "60"],
        answer: 0,
        explain: "빈칸을 빼니 사람 손님과 나이가 겹치지 않는 31명이 나와요. 나이가 빈칸인 손님은 견줄 수 없어 여기에 없어요.",
      },
      {
        type: "choice", concept: "subin",
        q: "NOT IN의 빈칸 함정을 피하는 방법으로 맞는 것은?",
        options: ["서브쿼리에 열 IS NOT NULL 조건을 붙인다", "NOT IN 뒤 서브쿼리에 열을 하나 더 고른다", "바깥 WHERE에 = NULL을 붙인다"],
        answer: 0,
        explain: "목록에서 빈칸을 미리 빼면 돼요. 열을 더 고르면 단서가 나고, = NULL은 6장에서 봤듯 늘 0행이에요.",
      },
      {
        type: "choice", concept: "subin",
        q: "IN (SELECT …) 쪽은 목록에 빈칸이 있어도 괜찮은 까닭은?",
        options: ["목록의 다른 값과 같기만 하면 참이라 맞는 행은 남아서", "IN은 빈칸을 0으로 바꿔서", "IN도 0행이 되어서"],
        answer: 0,
        explain: "IN은 「하나라도 같으면」 참이에요. 빈칸이 섞여도 같은 값을 찾은 행은 남아요. 사람 손님 나이 목록으로 IN을 쓰면 24명이에요.",
      },
      {
        type: "choice", concept: "exists",
        q: "EXISTS (SELECT …)가 참이 되는 때는?",
        options: ["괄호 안 SELECT가 한 행이라도 낼 때", "괄호 안 값이 0이 아닐 때", "괄호 안 SELECT가 열 하나를 낼 때"],
        answer: 0,
        explain: "EXISTS는 「있나요?」만 물어요. 무슨 값인지는 보지 않고, 한 행이라도 나오면 참이에요. 그래서 괄호 안은 *로 고르곤 해요.",
      },
      {
        type: "choice", concept: "exists",
        q: "괄호 안의 o.customer_id = c.customer_id에서 c는 무엇일까요?",
        code: "SELECT c.name\nFROM customers c\nWHERE NOT EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
        options: ["바깥 FROM의 손님 표, 지금 살펴보는 손님", "괄호 안의 주문 표", "아무 손님이나 한 명"],
        answer: 0,
        explain: "바깥 손님 한 명씩 c에 놓고, 그 손님 번호의 주문이 있는지 괄호 안이 다시 찾아요. 그래서 손님마다 답이 달라요.",
      },
      {
        type: "choice", concept: "exists",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT c.name\nFROM customers c\nWHERE c.village = '은행나무마을'\n  AND EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
        options: ["7행", "9행", "2행"],
        answer: 0,
        explain: "은행나무마을 9명 중 주문이 있는 7명이에요. 주문이 없는 표다솜·돌쇠 2명이 빠졌어요.",
      },
      {
        type: "blank", concept: "exists",
        q: "한 번도 주문하지 않은 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT c.name\nFROM customers c\nWHERE NOT EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = ___)",
        chips: ["c.customer_id", "o.order_id", "c.age"],
        answer: 0,
        explain: "주문의 손님 번호를 바깥 손님의 번호와 맞대야 손님마다 짝을 찾아요. 주문 번호나 나이와 맞대면 엉뚱한 짝을 찾아요.",
      },
      {
        type: "order", concept: "exists",
        q: "한 번도 안 산 손님의 이름을 NOT EXISTS로 보게 줄을 놓아 보세요.",
        lines: ["SELECT c.name", "FROM customers c", "WHERE NOT EXISTS", "(SELECT * FROM orders o WHERE", "o.customer_id = c.customer_id)"],
        expect: "name\n임바다\n표다솜\n돌쇠",
        explain: "괄호 안은 바깥 c를 부르는 짝 조건으로 끝나요. 임바다·표다솜·돌쇠, NOT IN과 11장 LEFT JOIN과 같은 3명이에요.",
      },
      {
        id: "12-4-b1", type: "build", concept: "exists",
        q: "한 번도 주문하지 않은 손님의 이름을 NOT EXISTS로 보여 줘",
        cards: ["SELECT", "c.name", "FROM", "customers c", "WHERE", "NOT", "EXISTS", "(SELECT * FROM orders o", "WHERE", "o.customer_id = c.customer_id)"],
        extra: ["IN", "o.order_id = c.customer_id)"],
        tables: ["customers", "orders"],
        hints: [
          "손님마다 그 손님 번호의 주문이 하나도 없는지 괄호 안에서 물어요.",
          "WHERE, NOT, EXISTS, (SELECT * FROM orders o, WHERE, 짝 조건 차례예요.",
        ],
        need: ["EXISTS"],
        explain: "임바다·표다솜·돌쇠예요. 주문 번호와 맞대면 1~60번 주문이 모두 있어 0행이 돼요. NOT을 빼면 산 적 있는 57명이에요.",
      },
      {
        id: "12-4-b2", type: "build", concept: "subin",
        q: "사람 손님 누구와도 나이가 같지 않은 손님의 이름을 보여 줘. 나이 빈칸은 목록에서 빼고",
        cards: ["SELECT", "name", "FROM", "customers", "WHERE", "age NOT IN", "(SELECT age FROM customers", "WHERE", "kind = '사람'", "AND age IS NOT NULL)"],
        extra: ["AND age IS NULL)", "kind = '여우'"],
        tables: ["customers"],
        hints: [
          "사람 손님의 나이 목록을 만들되 빈칸은 빼고, 그 목록에 없는 나이의 손님을 골라요.",
          "괄호 안 WHERE kind = '사람' 다음에 AND age IS NOT NULL)로 빈칸을 빼요.",
        ],
        explain: "도깨비·여우 손님 31명이에요. 빈칸을 빼지 않으면 0행이라는 NOT IN 함정을 피했어요! 사람 손님은 자기 나이가 목록에 있어 빠져요.",
      },
      {
        type: "check", concept: "exists",
        q: "12-4에서 배운 것으로 맞는 말은?",
        options: [
          "NOT IN 목록에 빈칸이 있으면 0행이라, 빈칸을 빼거나 NOT EXISTS를 쓴다",
          "NOT IN은 목록에 빈칸이 있으면 빈칸만 건너뛴다",
          "EXISTS는 괄호 안 값이 0보다 크면 참이다",
        ],
        answer: 0,
        explain: "빈칸이 섞인 목록에는 NOT IN이 참이 되지 않아요. IS NOT NULL로 빼거나, 「있나요?」만 묻는 NOT EXISTS를 써요.",
      },
    ],
  },
  {
    id: "12-5", chapter: 12, title: "12장 평가", isExam: true,
    goal: "서브쿼리로 값 하나·목록과 견주고 EXISTS로 짝을 묻는다",
    summary: [
      "값 자리 서브쿼리는 1행 1열",
      "IN (SELECT …)은 열 하나짜리 목록",
      "NOT IN은 빈칸 조심, EXISTS는 있나?",
    ],
    cards: [
      {
        say: "12장 정리! 값 하나 서브쿼리로 평균이나 MAX와 견주고, IN (SELECT …)으로 목록을 받고, NOT IN 빈칸 함정을 피해 EXISTS로 짝을 물었어요. 아래는 대표 문제 「평균보다 비싼 물건」이에요. 같이 풀어 봐요!",
        sql: "SELECT name, price\nFROM items\nWHERE price >\n  (SELECT AVG(price) FROM items)\nORDER BY price DESC, item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "subvalue",
        q: "값 자리(= · > 뒤)에 오는 서브쿼리는 무엇을 돌려줘야 할까요?",
        options: ["값 하나(1행 1열)", "열 하나, 행은 여럿", "표 전체"],
        answer: 0,
        explain: "값 하나와 견주니 1행 1열이어야 해요. 행이 여럿이어도 되는 건 IN 뒤 목록이에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "평균보다 싼 물건을 센 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM items\nWHERE price <\n  (SELECT AVG(price) FROM items)",
        options: ["28", "12", "40"],
        answer: 0,
        explain: "79.525엽전보다 싼 물건은 28가지예요. 12는 비싼 쪽, 40은 물건 전체예요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT name\nFROM items\nWHERE price =\n  (SELECT MAX(price), name FROM items)",
        options: ["오류가 난다", "금방망이가 나온다", "0행이 나온다"],
        answer: 0,
        explain: "괄호 안이 열 두 개를 내서 값 하나와 견줄 수 없어요. 이름은 바깥 SELECT에서 골라요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "이 SQL의 결과 값은?",
        code: "SELECT MIN(price) AS second_low\nFROM items\nWHERE price >\n  (SELECT MIN(price) FROM items)",
        options: ["6", "5", "7"],
        answer: 0,
        explain: "가장 싼 5보다 비싼 것 중 MIN, 두 번째로 싼 값 6이에요. 6엽전 물건은 인절미·한지 둘이에요.",
      },
      {
        type: "choice", concept: "subvalue",
        q: "값이 같은 물건이 있을 때 「N번째로 싼 값」을 바르게 세는 방법은?",
        options: ["DISTINCT로 겹침을 없앤 뒤 OFFSET으로 건너뛴다", "ORDER BY 없이 OFFSET만 쓴다", "LIMIT 뒤의 수를 N으로 한다"],
        answer: 0,
        explain: "OFFSET은 행을 세서 같은 값을 두 번 세요. DISTINCT로 값마다 한 행을 만든 뒤 줄 세워 건너뛰어요.",
      },
      {
        type: "choice", concept: "subin",
        q: "공방이 아닌 가게의 물건 수를 n으로 보인 결과는?",
        options: [
          { sql: "SELECT COUNT(*) AS n\nFROM items\nWHERE shop_id NOT IN\n  (SELECT shop_id FROM shops\n   WHERE category = '공방')" },
          { sql: "SELECT COUNT(*) AS n\nFROM items\nWHERE shop_id IN\n  (SELECT shop_id FROM shops\n   WHERE category = '공방')" },
          { sql: "SELECT COUNT(*) AS n\nFROM items\nWHERE shop_id NOT IN\n  (SELECT shop_id FROM shops)" },
        ],
        answer: 0,
        explain: "30이 정답이에요. IN이면 공방 물건 10, 가게 번호 전체를 빼면 남는 물건이 없어 0이에요.",
      },
      {
        type: "choice", concept: "subin",
        q: "주문한 손님 이름을 JOIN으로 볼 때 손님마다 한 번만 나오게 하려면?",
        options: ["SELECT DISTINCT를 쓴다", "LEFT JOIN으로 바꾼다", "ON을 뺀다"],
        answer: 0,
        explain: "JOIN은 주문마다 한 행이라 겹침을 DISTINCT로 없애요. IN (SELECT …)이면 처음부터 손님마다 한 번이에요.",
      },
      {
        type: "choice", concept: "subin",
        q: "이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM items\nWHERE price IN\n  (SELECT price FROM items\n   GROUP BY price\n   HAVING COUNT(*) > 1)",
        options: ["12", "6", "2"],
        answer: 0,
        explain: "겹친 값은 6가지이고 값마다 물건이 둘이라 12가지예요. 6은 괄호 안 목록의 행 수예요.",
      },
      {
        type: "choice", concept: "subin",
        q: "NOT IN (SELECT …) 목록에 빈칸(NULL)이 하나 섞이면?",
        options: ["결과가 0행이 된다", "빈칸만 빼고 견준다", "오류가 난다"],
        answer: 0,
        explain: "빈칸과의 「같지 않다」는 참이 아니라서 어떤 행도 남지 못해요. 괄호 안에 IS NOT NULL을 붙여 빼요.",
      },
      {
        type: "choice", concept: "exists",
        q: "취소한 주문이 있는 손님을 센 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM customers c\nWHERE EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id\n   AND o.status = '취소')",
        options: ["28", "49", "32"],
        answer: 0,
        explain: "취소 주문이 하나라도 있는 손님 28명이에요. 49는 취소 주문 수, 32는 취소한 적 없는 손님 수예요.",
      },
      {
        type: "blank", concept: "exists",
        q: "한 번도 주문하지 않은 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT c.name\nFROM customers c\nWHERE ___\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
        chips: ["NOT EXISTS", "EXISTS", "NOT IN"],
        answer: 0,
        explain: "짝 주문이 없는 손님은 NOT EXISTS예요. EXISTS면 산 적 있는 57명, NOT IN은 앞에 견줄 열이 없어 단서가 나와요.",
      },
      {
        id: "12-5-b1", type: "build", concept: "subvalue",
        q: "평균보다 비싼 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "price >", "(SELECT AVG(price)", "FROM items)"],
        extra: ["price <", "(SELECT MIN(price)"],
        tables: ["items"],
        hints: [
          "물건 값의 평균을 서브쿼리로 구하고, 그보다 비싼 물건을 골라요.",
          "WHERE price > 다음에 (SELECT AVG(price)와 FROM items)예요.",
        ],
        explain: "12장의 대표 문제를 다시 풀었어요! 12가지예요. MIN이면 가장 싼 식혜만 빠진 39가지, <면 싼 28가지예요.",
      },
      {
        id: "12-5-b2", type: "build", concept: "subin",
        q: "주문을 취소한 적이 있는 손님의 이름을 보여 줘",
        cards: ["SELECT", "name", "FROM", "customers", "WHERE", "customer_id IN", "(SELECT customer_id", "FROM orders", "WHERE", "status = '취소')"],
        extra: ["status = '완료')", "customer_id NOT IN"],
        tables: ["customers", "orders"],
        hints: [
          "주문 표에서 취소 주문의 손님 번호 목록을 만들고, 그 번호의 손님을 골라요.",
          "WHERE customer_id IN 다음에 (SELECT customer_id, FROM orders, WHERE, 취소 조건이에요.",
        ],
        explain: "28명이에요. 손님마다 한 번씩 나와요. NOT IN이면 취소한 적 없는 32명, '완료'면 완료 주문이 있는 57명이에요.",
      },
      {
        id: "12-5-b3", type: "build", concept: "exists",
        q: "한 번도 팔린 적 없는 물건의 이름을 NOT EXISTS로 보여 줘",
        cards: ["SELECT", "i.name", "FROM", "items i", "WHERE", "NOT", "EXISTS", "(SELECT * FROM order_items oi", "WHERE", "oi.item_id = i.item_id)"],
        extra: ["IN", "oi.order_id = i.item_id)"],
        tables: ["items", "order_items"],
        hints: [
          "물건마다 그 물건 번호의 주문 내역이 하나도 없는지 괄호 안에서 물어요.",
          "WHERE, NOT, EXISTS, (SELECT * FROM order_items oi, WHERE, 짝 조건 차례예요.",
        ],
        need: ["EXISTS"],
        explain: "꿀떡과 보따리, 11장 LEFT JOIN으로 찾은 것과 같아요. 주문 번호와 맞대면 1~40번 주문이 모두 있어 0행이에요.",
      },
      {
        type: "check", concept: "exists",
        q: "12장에서 배운 것으로 맞는 말은?",
        options: [
          "서브쿼리로 평균·목록을 먼저 구해 견주고, 짝이 있는지는 EXISTS로 묻는다",
          "서브쿼리는 늘 1행 1열이어야 한다",
          "NOT IN은 목록에 빈칸이 있어도 늘 안전하다",
        ],
        answer: 0,
        explain: "값 자리는 값 하나, IN은 목록, EXISTS는 「있나?」였어요. 실무에서는 쇼핑몰의 상품 표에서 평균가보다 비싼 상품이나, 한 번도 안 팔린 상품을 이렇게 골라요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 12장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - 12-T1 S: 가게 번호 1·2·4·5·7·8. 가게 평균보다 비싼 그 가게 물건(정답) / 싼 물건 / 장터 전체 평균보다 비싼 그 가게 물건.
//   3·6번은 뺐다: 가게 평균(41.8·46.4)으로 거르든 장터 평균으로 거르든 산삼·갓 하나뿐이라 정답과 셋째 보기가 겹친다.
//   가게 평균 12.8·7·41.8·23.2·19·46.4·266·220(어느 물건 값과도 같지 않거나, 2번 가게의 송편 7처럼 같아도 >·< 둘 다에서 빠짐).
//   장터 평균 79.525로 거르면 1·2·4·5번 가게는 0행, 7·8번은 다섯 가지 모두라 정답(2·3가지)과 다르다.
// - 12-T2 C: 가게 종류 넷. shop_id 칩만 정답, name은 번호와 이름을 견줘 0행, *는 열이 다섯이라 오류.
// - 12-T3 V: 마을 8곳. EXISTS(정답) / NOT EXISTS(주문 없는 손님, 대부분 0행) / 마을 조건을 <>로 뒤집음.
export const TEMPLATES = [
  {
    id: "12-T1", concept: "subvalue", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price\nFROM items\nWHERE shop_id = {S}\n  AND price > (SELECT AVG(price)\n  FROM items WHERE shop_id = {S})",
    wrong: [
      "SELECT name, price\nFROM items\nWHERE shop_id = {S}\n  AND price < (SELECT AVG(price)\n  FROM items WHERE shop_id = {S})",
      "SELECT name, price\nFROM items\nWHERE shop_id = {S}\n  AND price > (SELECT AVG(price)\n  FROM items)",
    ],
    vars: { S: [1, 2, 4, 5, 7, 8] },
    explain: "괄호 안이 {S}번 가게 물건 값의 평균 하나를 내고, 바깥은 그 가게 물건 중 평균보다 비싼 것을 골라요. 괄호 안에 가게 조건이 없으면 장터 전체 평균이에요.",
  },
  {
    id: "12-T2", concept: "subin", type: "blank",
    q: "{C} 가게에서 파는 물건이 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name\nFROM items\nWHERE shop_id IN\n  (SELECT ___ FROM shops\n   WHERE category = '{C}')",
    chips: ["shop_id", "name", "*"],
    answer: 0,
    vars: { C: ["먹거리", "약재", "잡화", "공방"] },
    explain: "IN 목록은 물건의 shop_id와 견줄 가게 번호여야 해요. name이면 번호와 이름을 견줘 0행, *는 열이 여럿이라 단서가 나와요.",
  },
  {
    id: "12-T3", concept: "exists", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT c.name\nFROM customers c\nWHERE c.village = '{V}'\n  AND EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
    wrong: [
      "SELECT c.name\nFROM customers c\nWHERE c.village = '{V}'\n  AND NOT EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
      "SELECT c.name\nFROM customers c\nWHERE c.village <> '{V}'\n  AND EXISTS\n  (SELECT * FROM orders o WHERE\n   o.customer_id = c.customer_id)",
    ],
    vars: { V: ["개울마을", "느티나무골", "달빛마을", "버드나무고개", "솔바위골", "여우고개", "은행나무마을", "큰바위마을"] },
    explain: "EXISTS는 괄호 안에 그 손님의 주문이 한 행이라도 있으면 참이라, {V} 손님 중 주문한 적 있는 손님이 나와요. NOT EXISTS면 주문 없는 손님이에요.",
  },
];
