// 8장 「묶어서 세기」 (설계 §6: GROUP BY·HAVING / 장터 예: 가게별 매출, 1만 엽전 넘는 가게).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 8
// 8장 낱말은 7장까지에 GROUP·HAVING을 더한 것이다(BY는 5장). ROUND·CASE는 9장이라 쓰지 않는다.
// - 장터 예 「가게별 매출, 1만 엽전 넘는 가게」(판정 R31로 「냥」 대신 「엽전」): 진짜 가게별 매출은 수량(order_items.qty) × 값(items.price)을
//   완료된 주문(orders.status)만 더하고 물건을 가게(items.shop_id)에 이어야 해서 표 셋이 필요하다(조인은 10장).
//   8장은 7장처럼 표 하나로 정직하게 셀 수 있는 것으로 대신한다.
//   ① 가게별 「재고 값어치」 = items를 shop_id로 묶은 SUM(price * stock)(엽전, 7장 7-4의 stock_value를 가게마다). 8-2-b1.
//   ② 1만 엽전 넘는 가게 = HAVING SUM(price * stock) > 10000 → 6·7·8번(10525·36890·15620, 그다음은 4번 3748). 8-4-b1·8-5-b1.
//   ③ 물건별 주문 수량 = order_items를 item_id로 묶은 SUM(qty)(38행, 취소된 주문 포함). 8-3 객관식·8-4.
//   카드·해설·평가 객관식에서 「재고 값어치는 남은 물건의 값이지 매출(팔린 엽전)이 아니고, 매출은 10장에서 표를 이어 구한다」고 밝힌다.
//   (참고로 조인으로 확인한 완료 주문 가게별 매출: 1번 4436, 2번 1778, 3번 7706, 4번 6289, 5번 4070, 6번 8738, 7번 13440, 8번 11030엽전.
//    1만 엽전 넘는 가게는 7·8번이다. 레슨에는 쓰지 않음. 10장 작가가 「재고 값어치로는 6·7·8번, 매출로는 7·8번」으로 갚을 수 있다.)
// - 확인한 값(data/market.sql, openEngine):
//   shops 8행, category 4가지 각 2곳. items 가게마다 물건 5가지.
//   items를 shop_id로 묶음: SUM(price) 1번 64·2번 35·3번 209·4번 116·5번 95·6번 232·7번 1330·8번 1100,
//     AVG(price) 12.8·7·41.8·23.2·19·46.4·266·220, MIN(price) 8·5·12·15·6·16·150·130, MAX(price) 25·9·120·35·40·110·400·350,
//     SUM(price * stock) 1464·890·1600·3748·1900·10525·36890·15620(1·5·8번은 재고 빈칸 하나씩 건너뜀).
//     WHERE price > 100으로 거른 뒤 묶으면 3번 1·6번 1·7번 5·8번 5.
//   customers를 kind로 묶음: COUNT(*) 도깨비 24·사람 24·여우 12, COUNT(age) 23·20·12, AVG(age) 44.3043·43.5·38.3333,
//     MIN(age) 8·9·13, MAX(age) 73·75·59. 나이 모르는 5명: 사람 4·도깨비 1.
//   customers를 village로 묶음(8곳): 큰바위마을 11, 솔바위골 9, 은행나무마을 9, 개울마을 8, 느티나무골 8, 달빛마을 6, 버드나무고개 6, 여우고개 3.
//     동점(9·9, 8·8, 6·6)이 있어 줄 세울 때 village를 둘째 기준으로 단다. COUNT(*) >= 9는 3곳, < 7은 3곳.
//     도깨비만: 큰바위마을 5, 솔바위골 5, 느티나무골 4, … / 사람만 4명 이상: 버드나무고개 4, 은행나무마을 4.
//   WHERE age > 70 OR age IS NULL을 age로 묶음: NULL 5, 72 3, 73 4, 75 1(빈칸끼리 한 묶음).
//   orders를 status로 묶음: 완료 542·취소 49, COUNT(DISTINCT customer_id) 57·28, MIN(ordered_on) 2026-01-14·2026-01-22.
//   order_items를 item_id로 묶음: 38행(10번 꿀떡, 30번 보따리는 주문된 적 없음), SUM(qty) 100 넘는 것 12번 115·6번 108·16번 107(그다음 1번 91).
// - 엔진마다 다른 것(판정 R36): SELECT에 묶지 않은 열을 놓는 것(SELECT name, COUNT(*) … GROUP BY shop_id)은 이 장터(SQLite)만 받아 주고
//   표준 SQL·PostgreSQL은 오류라 「이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않는다」로만 쓰고 카드 SQL에 넣지 않는다.
//   HAVING에서 SELECT의 별칭을 부르는 것(HAVING n >= 9)도 SQLite·MySQL은 받지만 PostgreSQL은 오류라, HAVING에는 언제나 COUNT(*)처럼 셈을 다시 적는다.
//   NULL끼리 한 묶음, WHERE 안 모아 세기 오류, HAVING이 GROUP BY 뒤라는 것은 어디서나 같아 붙이지 않는다.
// - 조립 카드(판정 R38·R40): SELECT·FROM·WHERE·HAVING은 한 장씩, GROUP BY·ORDER BY는 두 낱말이지만 한 장(R40).
//   함수 부르기(SUM(price * stock))는 한 장, 별칭(AS n) 한 장, HAVING 조건(SUM(price * stock) > 10000)은 한 장.
//   WHERE나 ORDER BY까지 넣는 조립은 셈과 별칭을 한 장(COUNT(*) AS n, SUM(price) AS total)으로 붙여 더미 12장 안에 넣는다:
//   8-3-b1(GROUP BY + ORDER BY, 가게마다 값 합이 모두 달라 shop_id 둘째 기준 없이도 차례가 하나), 8-3-b2(WHERE + GROUP BY),
//   8-5-b2(WHERE + GROUP BY + HAVING). 셈이 SELECT에 없는 HAVING 조립은 짧은 모양(SELECT shop_id … HAVING …)으로 쓴다.
// - 헷갈림 카드에 열 이름(kind, name 등)을 쓰지 않았다: 한 자리만 바꾸면 SQLite가 묶지 않은 열로 받아 「돌아가는」 모양이 생기기 때문이다.
//   표 이름 카드는 끼우면 표 별칭이 될 뿐이라 쓰지 않고, 다른 셈·다른 조건(결과가 다름), WHERE(HAVING 자리 → 단서)로 만든다.
//   8-3-b1의 total은 열 이름이 아니라 별칭이고 total DESC 자리에 놓으면 차례가 뒤집힌다.
// - 결과 표 보기(choice {sql})의 셈 열에는 함수 이름이 머리에 보이지 않게 별칭(AS n, AS age_value)을 붙인다(쓰기 안내 3절에 한 줄 더함).
export const CHAPTER = { id: 8, title: "묶어서 세기" };

export const LESSONS = [
  {
    id: "8-1", chapter: 8, title: "GROUP BY로 묶기",
    goal: "GROUP BY로 같은 값끼리 묶어 묶음마다 셀 수 있다",
    summary: [
      "GROUP BY 열 = 같은 값끼리 한 묶음",
      "묶음마다 결과가 한 행씩 나와요",
      "묶은 열도 SELECT에 놓아 이름표로",
    ],
    cards: [
      {
        say: "7장에서는 손님 60명을 모아 숫자 하나를 냈죠. GROUP BY(그룹 바이)는 같은 값끼리 묶어서 묶음마다 세요. 아래는 손님 종류(kind)로 묶은 결과예요. 묶음이 도깨비·사람·여우 3개라 결과도 3행!",
        sql: "SELECT kind, COUNT(*) AS n\nFROM customers\nGROUP BY kind",
      },
      {
        say: "묶은 열을 SELECT에도 놓아야 어느 묶음의 수인지 보여요. 이번엔 사는 마을(village)로 묶었더니 8곳이라 8행이에요. GROUP BY는 FROM 뒤에 놓아요.",
        sql: "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village",
      },
    ],
    items: [
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY kind는 무슨 일을 할까요?",
        options: ["kind 값이 같은 행끼리 한 묶음으로 모은다", "kind 열을 작은 값부터 줄 세운다", "kind가 빈칸인 행을 뺀다"],
        answer: 0,
        explain: "GROUP BY는 같은 값끼리 묶어요. 줄 세우기는 5장의 ORDER BY, 빈칸 거르기는 6장의 IS NULL이에요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT kind, COUNT(*) AS n\nFROM customers\nGROUP BY kind",
        options: ["3행", "60행", "1행"],
        answer: 0,
        explain: "kind 값은 도깨비·사람·여우 세 가지라 묶음도 3개, 결과도 3행이에요. 60은 손님 수, 1행은 GROUP BY 없이 모았을 때예요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY를 쓴 결과의 행 수와 같은 것은?",
        options: ["묶은 열에 나오는 서로 다른 값의 수", "표 전체의 행 수", "SELECT에 놓은 열의 수"],
        answer: 0,
        explain: "묶음 하나가 결과 한 행이 돼요. 마을이 8곳이면 8행, 종류가 3가지면 3행이에요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "주문을 상태로 묶어 셌어요. 이 SQL 결과에서 취소 묶음의 n은?",
        code: "SELECT status, COUNT(*) AS n\nFROM orders\nGROUP BY status",
        options: ["49", "542", "591"],
        answer: 0,
        explain: "취소된 주문은 49건이에요. 542는 완료 묶음의 n, 591은 묶지 않고 센 주문 전체예요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "7장의 COUNT(*)와 GROUP BY를 붙인 COUNT(*)는 무엇이 다를까요?",
        options: [
          "7장은 표 전체를 하나로 세고, GROUP BY는 묶음마다 센다",
          "GROUP BY를 붙이면 빈칸까지 센다",
          "다른 점이 없다",
        ],
        answer: 0,
        explain: "GROUP BY가 없으면 표 전체가 한 묶음이라 결과가 1행이에요. GROUP BY가 있으면 묶음마다 한 행씩 나와요.",
      },
      {
        type: "blank", concept: "groupby",
        q: "가게 분류(category)마다 가게 수가 나오게 빈자리를 채워 보세요.",
        code: "SELECT category, COUNT(*) AS n\nFROM shops\nGROUP BY ___",
        chips: ["category", "n", "COUNT(*)"],
        answer: 0,
        explain: "분류로 묶으니 먹거리·약재·잡화·공방이 2곳씩이에요. 셈한 값(n, COUNT(*))으로는 묶을 수 없어 단서가 나와요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY는 SQL의 어디에 놓을까요?",
        options: ["FROM 뒤", "SELECT 바로 뒤", "SELECT 앞"],
        answer: 0,
        explain: "어느 표에서 가져올지(FROM)를 말한 다음에 무엇으로 묶을지(GROUP BY)를 말해요.",
      },
      {
        type: "order", concept: "groupby",
        q: "주문을 상태(status)마다 세는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT status, COUNT(*) AS n", "FROM orders", "GROUP BY status"],
        explain: "SELECT, FROM 다음에 GROUP BY예요. 완료 542건, 취소 49건, 두 묶음이 나와요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "가게(shop_id)마다 물건이 몇 가지인지 센 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT shop_id, COUNT(*) AS n\nFROM items\nGROUP BY shop_id" },
          { sql: "SELECT COUNT(*) AS n\nFROM items" },
          { sql: "SELECT COUNT(DISTINCT shop_id) AS n\nFROM items" },
        ],
        answer: 0, tables: ["items"],
        explain: "가게 8곳이 한 행씩, 저마다 물건 5가지인 표가 정답이에요. 묶지 않으면 물건 전체 40, 가게 번호를 세면 8이 한 행으로 나와요.",
      },
      {
        id: "8-1-b1", type: "build", concept: "groupby",
        q: "마을마다 손님이 몇 명인지 n이라는 이름으로 세어 줘",
        cards: ["SELECT", "village", ",", "COUNT(*)", "AS n", "FROM", "customers", "GROUP BY", "village"],
        extra: ["COUNT(age)", "SUM(age)"],
        tables: ["customers"],
        hints: [
          "손님 표를 마을로 묶고, 묶음마다 행을 세요. 어느 마을인지도 함께 보여요.",
          "SELECT 다음에 village, 쉼표, COUNT(*) AS n을, 맨 끝에 GROUP BY village를 놓아요.",
        ],
        explain: "마을 8곳이 한 행씩 나왔어요. 큰바위마을이 11명으로 가장 많아요. COUNT(age)면 나이 모르는 손님이 빠져요. 묶은 열 village를 SELECT에도 놓아 이름표가 됐어요!",
      },
      {
        id: "8-1-b2", type: "build", concept: "groupby",
        q: "주문을 상태마다 몇 건인지 n이라는 이름으로 세어 줘",
        cards: ["SELECT", "status", ",", "COUNT(*)", "AS n", "FROM", "orders", "GROUP BY", "status"],
        extra: ["COUNT(DISTINCT customer_id)", "MIN(ordered_on)"],
        tables: ["orders"],
        hints: [
          "주문 표를 상태로 묶고, 묶음마다 행을 세어 이름을 붙여요.",
          "SELECT 다음에 status, 쉼표, COUNT(*)와 AS n을, 끝에 GROUP BY status를 놓아요.",
        ],
        explain: "완료 542건, 취소 49건이에요. 7장에서는 WHERE로 하나씩 셌는데 GROUP BY는 한 번에 묶음마다 세요. COUNT(DISTINCT customer_id)면 주문한 손님 수(57·28)가 나와요.",
      },
      {
        type: "check", concept: "groupby",
        q: "GROUP BY에 대해 맞는 말은?",
        options: [
          "같은 값끼리 묶어 묶음마다 결과 한 행을 낸다",
          "결과는 언제나 1행이다",
          "표의 행을 값 차례로 줄 세운다",
        ],
        answer: 0,
        explain: "묶음 수만큼 행이 나와요. 묶은 열을 SELECT에 함께 놓으면 어느 묶음인지 이름표가 돼요.",
      },
    ],
  },
  {
    id: "8-2", chapter: 8, title: "묶음마다 셈하기",
    goal: "묶음마다 SUM·AVG·MIN·MAX를 내고 SELECT 규칙을 안다",
    summary: [
      "묶음마다 SUM·AVG·MIN·MAX도 돼요",
      "SELECT엔 묶은 열과 모아 세기만",
      "가게별 매출은 10장, 오늘은 재고 값어치",
    ],
    cards: [
      {
        say: "묶음마다 SUM·AVG·MIN·MAX도 돼요. 8장 대표 문제 「가게별 매출」과 같은 모양으로, 오늘은 재고 값어치를 구해요. 가게마다 값 × 재고를 더한 엽전이에요. 진짜 매출은 팔린 수량 × 값이라 10장에서 표를 이어 구해요.",
        sql: "SELECT shop_id,\n  SUM(price * stock) AS stock_value\nFROM items\nGROUP BY shop_id",
      },
      {
        say: "SELECT에는 묶은 열과 모아 세기만 놓아요. 손님 이름(name)은 한 종류에 여러 명이라 하나를 고를 수 없거든요. 이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않아요. 아래는 묶음마다 셈 셋!",
        sql: "SELECT kind, COUNT(*) AS n,\n  MIN(age) AS youngest,\n  MAX(age) AS oldest\nFROM customers\nGROUP BY kind",
      },
    ],
    items: [
      {
        type: "choice", concept: "groupby",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT shop_id, SUM(price) AS total\nFROM items\nGROUP BY shop_id",
        options: ["8행", "40행", "1행"],
        answer: 0,
        explain: "가게 8곳이 묶음이라 8행이에요. 물건 40가지가 가게마다 하나로 모였어요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "구름 잡화점(5번 가게)의 한지는 재고 칸이 빈칸이에요. 이 SQL 결과에서 5번 가게의 stock_value는?",
        code: "SELECT shop_id,\n  SUM(price * stock) AS stock_value\nFROM items\nGROUP BY shop_id",
        options: ["1900", "95", "NULL"],
        answer: 0,
        explain: "7장처럼 SUM은 한지의 빈칸을 건너뛰고 나머지 넷을 더해 1900엽전이에요. 95는 5번 가게의 값 합이에요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "가게마다 낸 재고 값어치(값 × 재고 합)가 가게별 매출과 다른 까닭은?",
        options: [
          "팔린 수량이 아니라 남은 재고에 값을 곱해서",
          "SUM이 빈칸을 0으로 쳐서",
          "가게마다 물건 수가 달라서",
        ],
        answer: 0,
        explain: "매출은 팔린 수량 × 값이에요. 팔린 수량은 주문 내역 표에 있어서 표를 이어야 해요. 그건 10장에서 해요!",
      },
      {
        type: "choice", concept: "groupby",
        q: "SELECT name, COUNT(*) FROM items GROUP BY shop_id 처럼 묶지 않은 열을 놓으면?",
        options: [
          "이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않는다",
          "어느 데이터베이스에서나 물건 이름 40개가 모두 나온다",
          "가게마다 가장 비싼 물건 이름이 나온다",
        ],
        answer: 0,
        explain: "가게 묶음 하나에 이름이 다섯 개라 어느 이름을 놓을지 정해지지 않아요. 표준 SQL에서는 오류예요. SELECT엔 묶은 열과 모아 세기만!",
      },
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY shop_id를 쓴 SQL의 SELECT에 놓아도 되는 것끼리 고르면?",
        options: ["shop_id, COUNT(*), AVG(price)", "name, price", "shop_id, name"],
        answer: 0,
        explain: "묶은 열 shop_id와 모아 세기는 묶음마다 값이 하나라 놓을 수 있어요. name·price는 묶음 안에 값이 여럿이에요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "손님 종류마다 평균 나이를 냈어요. 이 SQL 결과에서 사람 묶음의 avg_age는?",
        code: "SELECT kind, AVG(age) AS avg_age\nFROM customers\nGROUP BY kind",
        options: ["43.5", "36.25", "24"],
        answer: 0,
        explain: "묶음 안에서도 AVG는 빈칸을 빼요. 나이를 아는 사람 손님 20명으로 나눠 43.5예요. 24로 나누면 36.25가 돼요.",
      },
      {
        type: "blank", concept: "groupby",
        q: "가게마다 가장 비싼 물건 값이 나오게 빈자리를 채워 보세요.",
        code: "SELECT shop_id,\n  ___(price) AS top_price\nFROM items\nGROUP BY shop_id",
        chips: ["MAX", "MIN", "COUNT"],
        answer: 0,
        explain: "가장 큰 값은 MAX예요. 7번 방망이 대장간은 400, 2번 여우골 떡방은 9엽전이에요. MIN이면 가장 싼 값, COUNT면 모두 5가 나와요.",
      },
      {
        type: "order", concept: "groupby",
        q: "가게마다 물건 값의 평균을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT shop_id,", "AVG(price) AS avg_price", "FROM items", "GROUP BY shop_id"],
        explain: "묶은 열과 셈을 SELECT에 놓고, FROM 다음에 GROUP BY예요. 1번 가게는 12.8, 7번 가게는 266엽전이에요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "손님 종류마다 가장 어린 나이를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT kind, MIN(age) AS age_value\nFROM customers\nGROUP BY kind" },
          { sql: "SELECT kind, MAX(age) AS age_value\nFROM customers\nGROUP BY kind" },
          { sql: "SELECT MIN(age) AS age_value\nFROM customers" },
        ],
        answer: 0, tables: ["customers"],
        explain: "도깨비 8, 사람 9, 여우 13살인 표가 정답이에요. MAX면 가장 나이 많은 손님, 묶지 않으면 전체에서 가장 어린 8 하나예요.",
      },
      {
        id: "8-2-b1", type: "build", concept: "groupby",
        q: "가게별 매출과 같은 모양으로, 오늘은 재고 값어치를 가게마다 stock_value라는 이름으로 보여 줘",
        cards: ["SELECT", "shop_id", ",", "SUM(price * stock)", "AS stock_value", "FROM", "items", "GROUP BY", "shop_id"],
        extra: ["SUM(price)", "AVG(price * stock)"],
        tables: ["items"],
        hints: [
          "물건 표를 가게 번호로 묶고, 묶음마다 값과 재고를 곱한 것을 더해 이름을 붙여요.",
          "SELECT 다음에 shop_id, 쉼표, SUM(price * stock)과 AS stock_value를, 끝에 GROUP BY shop_id를 놓아요.",
        ],
        explain: "8장 대표 문제와 같은 모양이에요! 가게 8곳의 재고 값어치가 나왔어요. 7번 방망이 대장간이 36890엽전으로 가장 커요. AVG면 평균이에요. 팔린 엽전(매출)은 10장에서 표를 이어 구해요.",
      },
      {
        id: "8-2-b2", type: "build", concept: "groupby",
        q: "손님 종류마다 평균 나이를 avg_age라는 이름으로 보여 줘",
        cards: ["SELECT", "kind", ",", "AVG(age)", "AS avg_age", "FROM", "customers", "GROUP BY", "kind"],
        extra: ["SUM(age)", "MAX(age)"],
        tables: ["customers"],
        hints: [
          "손님 표를 종류로 묶고, 묶음마다 나이의 평균을 구해 이름을 붙여요.",
          "SELECT 다음에 kind, 쉼표, AVG(age)와 AS avg_age를, 끝에 GROUP BY kind를 놓아요.",
        ],
        explain: "도깨비 약 44.3, 사람 43.5, 여우 약 38.3살이에요. 7장에서는 WHERE로 종류마다 한 번씩 냈던 평균이 한 번에 나왔어요! MAX면 가장 나이 많은 손님이에요.",
      },
      {
        type: "check", concept: "groupby",
        q: "GROUP BY와 함께 SELECT에 놓는 것으로 맞는 말은?",
        options: [
          "묶은 열과 모아 세기(COUNT·SUM·AVG·MIN·MAX)를 놓는다",
          "아무 열이나 놓으면 묶음마다 알아서 하나를 고른다",
          "모아 세기는 하나만 놓을 수 있다",
        ],
        answer: 0,
        explain: "묶음마다 값이 하나로 정해지는 것만 놓아요. 모아 세기는 여럿 놓아도 되고, 결과는 묶음마다 한 행이에요.",
      },
    ],
  },
  {
    id: "8-3", chapter: 8, title: "거르고 묶고 줄 세우기",
    goal: "WHERE 뒤에 묶고, 빈칸 묶음과 묶음 줄 세우기를 안다",
    summary: [
      "WHERE가 거른 뒤에 GROUP BY가 묶어요",
      "빈칸(NULL)끼리는 한 묶음이 돼요",
      "묶음 줄 세우기도 둘째 기준까지",
    ],
    cards: [
      {
        say: "WHERE는 묶기 전에 행을 걸러요. 아래는 나이가 70 넘거나 모르는 손님만 남긴 뒤 나이로 묶었어요. 6장의 나이 모르는 다섯 명은 NULL 한 묶음(5명)이 됐죠? 빈칸끼리는 한 묶음이에요.",
        sql: "SELECT age, COUNT(*) AS n\nFROM customers\nWHERE age > 70 OR age IS NULL\nGROUP BY age",
      },
      {
        say: "묶음도 ORDER BY로 줄 세워요. 차례는 WHERE, GROUP BY, ORDER BY예요. 손님 수가 같은 마을이 있어서(9명 둘, 8명 둘, 6명 둘) 마을 이름을 둘째 기준으로 붙였어요.",
        sql: "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village\nORDER BY n DESC, village",
      },
    ],
    items: [
      {
        type: "choice", concept: "groupby",
        q: "WHERE와 GROUP BY가 함께 있으면 무엇이 먼저 일할까요?",
        options: ["WHERE가 행을 거른 뒤, 남은 행을 묶는다", "묶은 뒤에 WHERE가 묶음을 거른다", "둘이 따로 일해 결과가 두 개 나온다"],
        answer: 0,
        explain: "WHERE가 먼저 행을 하나씩 걸러요. 묶음은 남은 행으로만 만들어져요. 묶음을 거르는 건 다음 레슨에서!",
      },
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY age로 묶을 때 나이 모르는 손님 5명은 어떻게 될까요?",
        options: ["NULL 한 묶음으로 모인다", "한 명씩 다섯 묶음으로 나뉜다", "결과에서 빠진다"],
        answer: 0,
        explain: "NULL = NULL은 참이 아니지만(6장), GROUP BY는 빈칸끼리를 한 묶음으로 모아요. 결과에 NULL 행 하나로 나와요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "70살 이상 손님을 종류로 묶어 셌어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT kind, COUNT(*) AS n\nFROM customers\nWHERE age >= 70\nGROUP BY kind",
        options: ["2행", "3행", "8행"],
        answer: 0,
        explain: "70살 이상은 도깨비 5명, 사람 3명이에요. 여우는 남은 행이 없어 묶음도 없어요. 그래서 2행이에요. 8은 남은 손님 수예요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "이 SQL 결과에서 사람 묶음의 n은?",
        code: "SELECT kind, COUNT(age) AS n\nFROM customers\nGROUP BY kind",
        options: ["20", "24", "4"],
        answer: 0,
        explain: "묶음 안에서도 COUNT(age)는 빈칸을 세지 않아요. 사람 24명 중 나이 모르는 4명을 뺀 20이에요.",
      },
      {
        type: "blank", concept: "groupby",
        q: "여우 손님만 남겨 마을마다 세게 빈자리를 채워 보세요.",
        code: "SELECT village, COUNT(*) AS n\nFROM customers\nWHERE kind = '여우'\nGROUP BY ___",
        chips: ["village", "n", "COUNT(*)"],
        answer: 0,
        explain: "WHERE가 여우 손님 12명만 남기고, GROUP BY village가 마을로 묶어요. 큰바위마을이 3명으로 가장 많아요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "도깨비 손님만 남겨 마을마다 센 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT village, COUNT(*) AS n\nFROM customers\nWHERE kind = '도깨비'\nGROUP BY village" },
          { sql: "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village" },
          { sql: "SELECT kind, COUNT(*) AS n\nFROM customers\nWHERE kind = '도깨비'\nGROUP BY kind" },
        ],
        answer: 0, tables: ["customers"],
        explain: "마을 8곳에 도깨비 수가 나온 표가 정답이에요(솔바위골·큰바위마을 5). WHERE가 없으면 모든 손님을, kind로 묶으면 도깨비 24 한 행이에요.",
      },
      {
        type: "order", concept: "groupby",
        q: "손님 종류마다 세어 많은 차례로, 같으면 이름 차례로 줄을 놓아 보세요.",
        lines: ["SELECT kind, COUNT(*) AS n", "FROM customers", "GROUP BY kind", "ORDER BY n DESC, kind"],
        expect: "kind | n\n도깨비 | 24\n사람 | 24\n여우 | 12",
        explain: "GROUP BY 다음에 ORDER BY예요. 도깨비와 사람이 24명으로 같아서 kind를 둘째 기준으로 붙여 차례를 정했어요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "마을마다 센 결과를 줄 세울 때 n DESC 뒤에 village를 더 붙이는 까닭은?",
        options: [
          "손님 수가 같은 마을(9명 둘 등)의 차례를 하나로 정하려고",
          "village 열이 결과에 나오게 하려고",
          "손님 수를 마을마다 다시 세려고",
        ],
        answer: 0,
        explain: "솔바위골과 은행나무마을은 둘 다 9명이에요. 둘째 기준이 없으면 둘의 차례가 정해지지 않아요(5장). 묶음을 세울 때도 같아요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "WHERE, GROUP BY, ORDER BY를 함께 쓸 때 놓는 차례는?",
        options: ["WHERE → GROUP BY → ORDER BY", "GROUP BY → WHERE → ORDER BY", "ORDER BY → WHERE → GROUP BY"],
        answer: 0,
        explain: "행을 거르고(WHERE), 묶고(GROUP BY), 묶음을 줄 세워요(ORDER BY). 모두 FROM 뒤에 와요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "물건마다 주문된 수량을 더했어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT item_id, SUM(qty) AS sold\nFROM order_items\nGROUP BY item_id",
        options: ["38행", "40행", "1241행"],
        answer: 0,
        explain: "주문된 적 있는 물건 38가지만 묶음이 돼요. 꿀떡·보따리는 주문 내역에 없어서 묶음도 없어요. 12번 인삼차가 115개 주문으로 가장 많아요(취소 포함).",
      },
      {
        id: "8-3-b1", type: "build", concept: "groupby",
        q: "가게마다 물건 값의 합을 total이라는 이름으로 내서, 합이 큰 가게부터 보여 줘",
        cards: ["SELECT", "shop_id", ",", "SUM(price) AS total", "FROM", "items", "GROUP BY", "shop_id", "ORDER BY", "total DESC"],
        extra: ["total", "SUM(price) AS n"],
        tables: ["items"],
        hints: [
          "물건 표를 가게로 묶어 묶음마다 값을 더하고, 묶음을 그 합이 큰 차례로 줄 세워요.",
          "SELECT 다음에 shop_id, 쉼표, SUM(price) AS total을, GROUP BY shop_id 뒤에 ORDER BY total DESC를 놓아요.",
        ],
        explain: "7번 1330, 8번 1100엽전 … 2번 35엽전 차례예요. 가게마다 합이 모두 달라 동점이 없어요. 같은 합이 있을 수 있으면 shop_id를 둘째 기준으로 붙여요. DESC가 없으면 작은 합부터예요.",
      },
      {
        id: "8-3-b2", type: "build", concept: "groupby",
        q: "나이 모르는 손님만 남겨 종류마다 몇 명인지 n이라는 이름으로 세어 줘",
        cards: ["SELECT", "kind", ",", "COUNT(*) AS n", "FROM", "customers", "WHERE", "age IS NULL", "GROUP BY", "kind"],
        extra: ["age IS NOT NULL", "kind = '여우'"],
        tables: ["customers"],
        hints: [
          "먼저 나이 칸이 빈 손님만 걸러 내고, 남은 손님을 종류로 묶어 세어요.",
          "WHERE 다음에 age IS NULL을, 그 뒤에 GROUP BY kind를 놓아요.",
        ],
        explain: "사람 4명, 도깨비 1명이에요. 여우는 남은 행이 없어 묶음도 없어요. WHERE가 먼저 거르고 GROUP BY가 묶어요. IS NOT NULL이면 나이를 아는 55명이 묶여요.",
      },
      {
        type: "check", concept: "groupby",
        q: "8-3에서 배운 것으로 맞는 말은?",
        options: [
          "WHERE가 먼저 거르고, 빈칸끼리는 한 묶음이 되며, 묶음도 둘째 기준까지 줄 세운다",
          "GROUP BY는 빈칸인 행을 결과에서 뺀다",
          "WHERE는 GROUP BY 뒤에 놓아 묶음을 거른다",
        ],
        answer: 0,
        explain: "WHERE는 묶기 전에 행을 걸러요. 묶음을 거르는 방법은 따로 있어요. 다음 레슨의 HAVING이에요!",
      },
    ],
  },
  {
    id: "8-4", chapter: 8, title: "HAVING으로 거르기",
    goal: "HAVING으로 묶음을 거르고, WHERE와의 차이를 안다",
    summary: [
      "HAVING = 묶은 뒤 묶음을 거르기",
      "WHERE는 묶기 전 행, HAVING은 묶음",
      "HAVING에는 모아 세기를 쓸 수 있어요",
    ],
    cards: [
      {
        say: "묶음을 거를 때는 HAVING(해빙)이에요. WHERE는 묶기 전의 행을, HAVING은 묶은 뒤의 묶음을 걸러요. 7장에서 WHERE 안의 모아 세기는 오류였죠? HAVING에서는 돼요. 손님 9명 이상인 마을!",
        sql: "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= 9",
      },
      {
        say: "8장 대표 문제 「1만 엽전 넘는 가게」예요. 재고 값어치가 1만 엽전 넘는 가게는 6·7·8번! HAVING에는 별칭 대신 셈을 다시 적어요. 별칭을 못 알아듣는 데이터베이스도 있거든요.",
        sql: "SELECT shop_id,\n  SUM(price * stock) AS stock_value\nFROM items\nGROUP BY shop_id\nHAVING SUM(price * stock) > 10000",
      },
    ],
    items: [
      {
        type: "choice", concept: "having",
        q: "HAVING은 무엇을 거를까요?",
        options: ["묶은 뒤의 묶음", "묶기 전의 행", "SELECT에 놓은 열"],
        answer: 0,
        explain: "HAVING은 GROUP BY가 만든 묶음을 걸러요. 묶기 전의 행을 거르는 건 WHERE예요.",
      },
      {
        type: "choice", concept: "having",
        q: "손님 9명 이상인 마을을 찾으려는 이 SQL은 어떻게 될까요?",
        code: "SELECT village\nFROM customers\nWHERE COUNT(*) >= 9\nGROUP BY village",
        options: ["오류가 난다", "9명 이상인 마을 3곳이 나온다", "마을 8곳이 모두 나온다"],
        answer: 0,
        explain: "WHERE 안에는 모아 세기를 쓸 수 없어 오류예요(7장). 묶음의 수로 거르려면 GROUP BY 뒤에 HAVING COUNT(*) >= 9를 놓아요.",
      },
      {
        type: "choice", concept: "having",
        q: "WHERE에는 COUNT(*)를 못 쓰는데 HAVING에는 쓸 수 있는 까닭은?",
        options: [
          "WHERE는 묶기 전에 일해 셀 묶음이 아직 없고, HAVING은 묶은 뒤에 일해서",
          "HAVING이 WHERE보다 앞에 놓여서",
          "COUNT(*)는 HAVING 안에서만 행을 세서",
        ],
        answer: 0,
        explain: "WHERE → GROUP BY → HAVING 차례로 일해요. HAVING 때는 묶음이 이미 만들어져 있어 묶음마다 셀 수 있어요.",
      },
      {
        type: "choice", concept: "having",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village\nHAVING COUNT(*) < 7",
        options: ["3행", "5행", "8행"],
        answer: 0,
        explain: "달빛마을 6, 버드나무고개 6, 여우고개 3명, 이렇게 7명보다 적은 마을이 3곳이에요. 나머지 5곳은 HAVING이 걸러요.",
      },
      {
        type: "choice", concept: "having",
        q: "WHERE와 HAVING을 함께 썼어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT village, COUNT(*) AS n\nFROM customers\nWHERE kind = '사람'\nGROUP BY village\nHAVING COUNT(*) >= 4",
        options: ["2행", "8행", "3행"],
        answer: 0,
        explain: "WHERE가 사람 손님만 남기고, 마을로 묶은 뒤, HAVING이 4명 이상인 묶음만 남겨요. 버드나무고개와 은행나무마을, 2행이에요.",
      },
      {
        type: "blank", concept: "having",
        q: "재고 값어치가 1만 엽전 넘는 가게만 남게 빈자리를 채워 보세요.",
        code: "SELECT shop_id\nFROM items\nGROUP BY shop_id\n___ SUM(price * stock) > 10000",
        chips: ["HAVING", "WHERE", "AND"],
        answer: 0,
        explain: "묶은 뒤 묶음을 거르니 HAVING이에요. GROUP BY 뒤에는 WHERE를 놓을 수 없고, AND만 놓아도 단서가 나와요.",
      },
      {
        type: "order", concept: "having",
        q: "손님 9명 이상인 마을 이름을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT village", "FROM customers", "GROUP BY village", "HAVING COUNT(*) >= 9"],
        explain: "HAVING은 GROUP BY 바로 뒤예요. 큰바위마을, 솔바위골, 은행나무마을 3곳이 나와요. 셈을 SELECT에 놓지 않아도 HAVING에 쓸 수 있어요.",
      },
      {
        type: "choice", concept: "having",
        q: "100개 넘게 주문된 물건(item_id)만 고른 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT item_id, SUM(qty) AS sold\nFROM order_items\nGROUP BY item_id\nHAVING SUM(qty) > 100" },
          { sql: "SELECT item_id, SUM(qty) AS sold\nFROM order_items\nGROUP BY item_id\nHAVING SUM(qty) < 100" },
          { sql: "SELECT item_id, SUM(qty) AS sold\nFROM order_items\nGROUP BY item_id" },
        ],
        answer: 0, tables: ["order_items"],
        explain: "12번 115, 6번 108, 16번 107개, 3행인 표가 정답이에요. < 100이면 나머지 35가지, HAVING이 없으면 38가지가 다 나와요.",
      },
      {
        type: "choice", concept: "having",
        q: "재고 값어치로 고른 「1만 엽전 넘는 가게」 6·7·8번에 대해 맞는 말은?",
        options: [
          "남은 재고의 값어치로 고른 것이라, 매출로 고르면 다를 수 있다",
          "이것이 가게별 매출로 고른 결과다",
          "6·7·8번 가게는 물건이 더 많아서 뽑혔다",
        ],
        answer: 0,
        explain: "매출은 팔린 수량 × 값이라 표를 이어야 구할 수 있어요. 10장에서 매출로 다시 골라 견줘 봐요. 가게마다 물건은 5가지로 같아요.",
      },
      {
        id: "8-4-b1", type: "build", concept: "having",
        q: "재고 값어치(값 × 재고 합)가 1만 엽전 넘는 가게 번호를 보여 줘",
        cards: ["SELECT", "shop_id", "FROM", "items", "GROUP BY", "shop_id", "HAVING", "SUM(price * stock) > 10000"],
        extra: ["WHERE", "SUM(price) > 10000"],
        tables: ["items"],
        hints: [
          "물건 표를 가게로 묶은 뒤, 묶음의 값 × 재고 합이 1만 넘는 묶음만 남겨요.",
          "GROUP BY shop_id 다음에 HAVING과 SUM(price * stock) > 10000을 놓아요.",
        ],
        explain: "8장의 대표 문제예요! 6번 바람 보따리, 7번 방망이 대장간, 8번 뚝딱 공방이에요. 값만 더하면(SUM(price)) 1만 넘는 가게가 없어요.",
      },
      {
        id: "8-4-b2", type: "build", concept: "having",
        q: "100개 넘게 주문된 물건 번호를 보여 줘",
        cards: ["SELECT", "item_id", "FROM", "order_items", "GROUP BY", "item_id", "HAVING", "SUM(qty) > 100"],
        extra: ["WHERE", "COUNT(*) > 100"],
        tables: ["order_items"],
        hints: [
          "주문 내역을 물건 번호로 묶은 뒤, 수량 합이 100 넘는 묶음만 남겨요.",
          "GROUP BY item_id 다음에 HAVING과 SUM(qty) > 100을 놓아요.",
        ],
        explain: "12번 인삼차, 6번 인절미, 16번 도라지예요. COUNT(*)는 주문 내역 행 수라 100이 넘는 물건이 없어요. 수량은 SUM(qty)로 더해요!",
      },
      {
        type: "check", concept: "having",
        q: "WHERE와 HAVING에 대해 맞는 말은?",
        options: [
          "WHERE는 묶기 전 행을, HAVING은 묶은 뒤 묶음을 거른다",
          "둘은 이름만 다르고 하는 일은 같다",
          "HAVING은 GROUP BY 앞에 놓는다",
        ],
        answer: 0,
        explain: "WHERE → GROUP BY → HAVING 차례예요. 모아 세기로 거를 때는 HAVING, 행 하나의 값으로 거를 때는 WHERE예요.",
      },
    ],
  },
  {
    id: "8-5", chapter: 8, title: "8장 평가", isExam: true,
    goal: "GROUP BY로 묶어 세고 HAVING으로 묶음을 거를 수 있다",
    summary: [
      "GROUP BY로 묶고 묶음마다 셈해요",
      "WHERE는 행을, HAVING은 묶음을 걸러요",
      "빈칸 한 묶음, 줄 세우기는 둘째 기준까지",
    ],
    cards: [
      {
        say: "8장 정리! 가게로 묶어 가장 비싼 값을 내고, HAVING으로 그 값이 100엽전 넘는 묶음만 남겨 줄 세웠어요. 같이 풀어 봐요!",
        sql: "SELECT shop_id, MAX(price) AS top\nFROM items\nGROUP BY shop_id\nHAVING MAX(price) > 100\nORDER BY top DESC, shop_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "groupby",
        q: "가게 분류마다 센 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT category, COUNT(*) AS n\nFROM shops\nGROUP BY category",
        options: ["4행", "8행", "2행"],
        answer: 0,
        explain: "분류가 먹거리·약재·잡화·공방 4가지라 4행이에요. 8은 가게 수, 2는 분류마다 가게 수(n)예요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "손님 종류마다 나이를 아는 손님 수를 센 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT kind, COUNT(age) AS n\nFROM customers\nGROUP BY kind" },
          { sql: "SELECT kind, COUNT(*) AS n\nFROM customers\nGROUP BY kind" },
          { sql: "SELECT COUNT(age) AS n\nFROM customers" },
        ],
        answer: 0,
        explain: "도깨비 23, 사람 20, 여우 12인 표가 정답이에요. COUNT(*)면 빈칸까지 24·24·12, 묶지 않으면 전체 55 하나예요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY shop_id를 쓴 SQL의 SELECT에 price를 그냥 놓으면?",
        options: [
          "이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않는다",
          "가게마다 모든 값이 나온다",
          "가게마다 값의 합이 나온다",
        ],
        answer: 0,
        explain: "한 가게 묶음에 값이 다섯 개라 하나로 정해지지 않아요. 합이 필요하면 SUM(price)처럼 모아 세기로 써요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "GROUP BY stock으로 묶으면 재고 칸이 빈 물건 3가지는?",
        options: ["NULL 한 묶음(3가지)으로 모인다", "세 묶음으로 나뉜다", "결과에서 빠진다"],
        answer: 0,
        explain: "GROUP BY는 빈칸끼리 한 묶음으로 모아요. 결과에 stock이 NULL인 행 하나가 생기고, 그 묶음의 COUNT(*)는 3이에요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "이 SQL 결과에서 취소 묶음의 first_day는?",
        code: "SELECT status,\n  MIN(ordered_on) AS first_day\nFROM orders\nGROUP BY status",
        options: ["2026-01-22", "2026-01-14", "49"],
        answer: 0,
        explain: "취소된 주문 중 가장 이른 날이에요. 2026-01-14는 완료 묶음의 first_day, 49는 취소 건수예요.",
      },
      {
        type: "choice", concept: "having",
        q: "가게마다 물건 값을 더한 뒤 합이 200엽전 넘는 가게만 남기려면?",
        options: ["HAVING SUM(price) > 200", "WHERE SUM(price) > 200", "WHERE price > 200"],
        answer: 0,
        explain: "묶음의 합으로 거르니 HAVING이에요. WHERE 안 SUM은 오류, WHERE price > 200은 비싼 물건 행을 고르는 거라 뜻이 달라요.",
      },
      {
        type: "choice", concept: "having",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT shop_id\nFROM items\nWHERE SUM(price) > 200\nGROUP BY shop_id",
        options: ["오류가 난다", "3·6·7·8번 가게가 나온다", "가게 8곳이 모두 나온다"],
        answer: 0,
        explain: "WHERE는 묶기 전 단계라 SUM을 쓸 수 없어 오류예요. HAVING SUM(price) > 200으로 쓰면 3·6·7·8번이 나와요.",
      },
      {
        type: "blank", concept: "groupby",
        q: "나이 모르는 손님만 남긴 뒤 종류로 묶게 빈자리를 채워 보세요.",
        code: "SELECT kind, COUNT(*) AS n\nFROM customers\n___ age IS NULL\nGROUP BY kind",
        chips: ["WHERE", "HAVING", "ORDER BY"],
        answer: 0,
        explain: "묶기 전 행을 거르니 WHERE예요. 사람 4, 도깨비 1이 나와요. HAVING은 GROUP BY 뒤에 놓아요.",
      },
      {
        type: "order", concept: "having",
        q: "값 합이 200엽전 넘는 가게를 합이 큰 차례로 보게 줄을 놓아 보세요.",
        lines: ["SELECT shop_id,", "SUM(price) AS total", "FROM items", "GROUP BY shop_id", "HAVING SUM(price) > 200", "ORDER BY total DESC, shop_id"],
        expect: "shop_id | total\n7 | 1330\n8 | 1100\n6 | 232\n3 | 209",
        explain: "묶고(GROUP BY), 묶음을 거르고(HAVING), 줄 세워요(ORDER BY). 둘째 기준 shop_id까지 붙여 차례를 하나로 정했어요.",
      },
      {
        type: "choice", concept: "groupby",
        q: "마을마다 손님 수를 많은 차례로 세울 때 ORDER BY n DESC만 쓰면?",
        options: [
          "손님 수가 같은 마을끼리의 차례가 정해지지 않는다",
          "오류가 난다",
          "손님 수가 같은 마을은 하나만 나온다",
        ],
        answer: 0,
        explain: "솔바위골·은행나무마을(9명)처럼 같은 수가 있어요. ORDER BY n DESC, village로 둘째 기준을 붙여요.",
      },
      {
        type: "choice", concept: "having",
        q: "8장 대표 문제에서 재고 값어치로 고른 6·7·8번이 매출로 고른 가게와 다를 수 있는 까닭은?",
        options: [
          "재고 값어치는 남은 물건의 값이고, 매출은 팔린 수량 × 값이라서",
          "HAVING이 빈칸을 세서",
          "1만 엽전이 매출에서는 다른 단위라서",
        ],
        answer: 0,
        explain: "팔린 수량은 주문 내역 표에, 값은 물건 표에 있어요. 두 표를 이어야 매출이 나와요. 10장에서 함께 구해 봐요!",
      },
      {
        id: "8-5-b1", type: "build", concept: "having",
        q: "재고 값어치(값 × 재고 합)가 1만 엽전 넘는 가게 번호를 보여 줘",
        cards: ["SELECT", "shop_id", "FROM", "items", "GROUP BY", "shop_id", "HAVING", "SUM(price * stock) > 10000"],
        extra: ["WHERE", "AVG(price * stock) > 10000", "SUM(price * stock) > 1000"],
        tables: ["items"],
        hints: [
          "가게로 묶은 뒤, 묶음의 값 × 재고 합으로 묶음을 걸러요.",
          "GROUP BY shop_id 다음에 HAVING과 SUM(price * stock) > 10000을 놓아요.",
        ],
        explain: "8장의 대표 문제, 6·7·8번 가게를 다시 찾았어요! AVG였다면 1만 넘는 가게가 없고, 1000으로 낮추면 8곳이 다 나와요. 매출로 고르는 건 10장에서 해요.",
      },
      {
        id: "8-5-b2", type: "build", concept: "having",
        q: "도깨비 손님이 4명 이상 사는 마을 이름을 보여 줘",
        cards: ["SELECT", "village", "FROM", "customers", "WHERE", "kind = '도깨비'", "GROUP BY", "village", "HAVING", "COUNT(*) >= 4"],
        extra: ["kind = '사람'", "COUNT(*) > 4"],
        tables: ["customers"],
        hints: [
          "도깨비 손님만 먼저 걸러 마을로 묶고, 묶음의 손님 수로 다시 걸러요.",
          "WHERE 다음에 kind = '도깨비', GROUP BY village 다음에 HAVING과 COUNT(*) >= 4를 놓아요.",
        ],
        explain: "느티나무골·솔바위골·큰바위마을, 3곳이에요. WHERE는 행을, HAVING은 묶음을 걸러요. > 4면 딱 4명인 느티나무골이 빠지고, 사람 손님이면 2곳이에요.",
      },
      {
        id: "8-5-b3", type: "build", concept: "having",
        q: "나이 모르는 손님이 있는 손님 종류를 보여 줘",
        cards: ["SELECT", "kind", "FROM", "customers", "GROUP BY", "kind", "HAVING", "COUNT(age) < COUNT(*)"],
        extra: ["WHERE", "COUNT(age) = COUNT(*)"],
        tables: ["customers"],
        hints: [
          "종류로 묶은 뒤, 나이를 아는 손님 수가 전체 손님 수보다 적은 묶음만 남겨요.",
          "GROUP BY kind 다음에 HAVING과 COUNT(age) < COUNT(*)를 놓아요.",
        ],
        explain: "도깨비와 사람이에요. COUNT(age)는 빈칸을 세지 않으니 전체보다 적으면 빈칸이 있다는 뜻이죠. 여우는 12 = 12라 빠졌어요.",
      },
      {
        type: "check", concept: "having",
        q: "8장에서 배운 것으로 맞는 말은?",
        options: [
          "GROUP BY로 묶어 묶음마다 셈하고, HAVING으로 묶음을 거른다",
          "WHERE에 COUNT(*)를 넣어 묶음을 거른다",
          "GROUP BY를 쓰면 SELECT에 아무 열이나 놓을 수 있다",
        ],
        answer: 0,
        explain: "묶고, 셈하고, 묶음을 걸렀어요. 실무에서는 쇼핑몰의 상품·주문 표를 판매자별로 묶어 「판매자별 매출」, 「매출 1만 원 넘는 판매자」 같은 보고서를 만들어요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 8장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - K: 손님 종류 3가지. 종류마다 마을별 수(8행)는 손님 전체의 마을별 수와 늘 다르고, 종류 전체 수(1행)와도 다르다.
// - P: 값 기준. WHERE price > P로 거른 뒤 가게로 묶음(P=400이면 0행이라 목록에서 뺌).
// - N: 마을 손님 수 기준 4~11. 마을별 11·9·9·8·8·6·6·3명이라 >= N과 < N은 늘 둘 다 1행 이상이고,
//   >= N은 마을 8곳 전부(N이 3 이하일 때)와 겹치지 않는다.
export const TEMPLATES = [
  {
    id: "8-T1", concept: "groupby", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT village, COUNT(*) AS n\nFROM customers\nWHERE kind = '{K}'\nGROUP BY village",
    wrong: [
      "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village",
      "SELECT COUNT(*) AS n\nFROM customers\nWHERE kind = '{K}'",
    ],
    vars: { K: ["도깨비", "사람", "여우"] },
    explain: "WHERE가 {K} 손님만 남긴 뒤 GROUP BY가 마을로 묶어 마을마다 세요. 묶지 않으면 숫자 하나만 나와요.",
  },
  {
    id: "8-T2", concept: "groupby", type: "blank",
    q: "값이 {P}엽전 넘는 물건만 가게마다 세게 빈자리를 채워 보세요.",
    sql: "SELECT shop_id, COUNT(*) AS n\nFROM items\nWHERE price > {P}\nGROUP BY ___",
    chips: ["shop_id", "n", "COUNT(*)"],
    answer: 0,
    vars: { P: [10, 20, 30, 50, 100, 200] },
    explain: "WHERE가 먼저 행을 거르고 GROUP BY shop_id가 가게로 묶어요. 셈한 값(n, COUNT(*))으로는 묶을 수 없어요.",
  },
  {
    id: "8-T3", concept: "having", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT village\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= {N}",
    wrong: [
      "SELECT village\nFROM customers\nGROUP BY village\nHAVING COUNT(*) < {N}",
      "SELECT village\nFROM customers\nGROUP BY village",
    ],
    vars: { N: { min: 4, max: 11 } },
    explain: "마을로 묶은 뒤 HAVING이 손님이 {N}명 이상인 마을 묶음만 남겨요. HAVING이 없으면 마을 8곳이 모두 나와요.",
  },
];

// ---- 8장 심화 (v0.4, 쓰기 안내 13절 · 디딤돌 docs/specs/2026-11-18-심화-7-12장-디딤돌.md §2 8장) ----
// - 쓸 수 있는 것: 1~8장 낱말(8장 심화 전용 낱말 없음). 조립은 본 과정 8장과 같다(R38·R40: GROUP BY·ORDER BY 한 장,
//   SELECT·FROM·WHERE·HAVING 한 장씩). 둘째 열·둘째 기준의 쉼표는 앞 카드에 붙인다(빼면 오류가 나게). 레슨마다 build 2개.
// - 8-A1 두 열로 묶기: 손님 마을 × 종류 24짝이 모두 있다(GROUP BY village, kind 24행). 큰바위마을 도깨비 5·사람 3·여우 3,
//   솔바위골 5·3·1. 60살 이상은 8짝, 70살 이상은 6짝(도깨비 느티나무골 1·솔바위골 1·은행나무마을 1·큰바위마을 2, 사람 버드나무고개 2·큰바위마을 1).
//   나이 모르는 손님: 사람 느티나무골 2·솔바위골 1·은행나무마을 1, 도깨비 은행나무마을 1. 손님 1~4번 주문: 1번 완료 29·취소 3, 2번 완료 3,
//   3번 완료 39·취소 5, 4번 완료 37·취소 2. 두 열을 바꿔 적어도 묶음은 같다(ORDER BY가 없으니 차례는 말하지 않음).
// - 8-A2 HAVING에 조건 둘(주제 바꿈, 디딤돌 §4: 묶음을 셈 결과로 줄 세우기는 8-3이 별칭으로 이미 가르침):
//   마을 손님 수 개울 8·느티 8·달빛 6·버드 6·솔 9·여우고개 3·은행 9·큰 11, 평균 나이 39.625·42.6667·32.5·52·37.125·33.3333·43.5714·51.5455,
//   가장 어린 13·9·13·27·12·18·8·11, 가장 많은 68·73·52·75·72·48·73·73.
//   COUNT(*) >= 8 AND AVG(age) > 40 → 느티·은행·큰(3), OR → 6(달빛·여우고개 빠짐). COUNT(*) > 8 AND … → 은행·큰.
//   COUNT(*) >= 8 AND MIN(age) < 10 → 느티·은행. MIN(age) < 10 OR MAX(age) >= 70 → 5(느티·버드·솔·은행·큰), AND → 느티·은행.
//   사람 손님만(WHERE) COUNT(*) >= 4 OR MAX(age) >= 70 → 버드나무고개 4·은행나무마을 4·큰바위마을 3(72살).
//   가게: MAX(price) > 100 AND MIN(price) < 20 → 3·6번, OR → 8곳 모두. MIN(price) >= 100 OR MAX(price) < 10 → 2·7·8번.
// - 8-A3 의뢰: 방망이 대장간(shops 7번) 쇠돌. 사연은 꾸민 이야기. 가게마다 물건 5가지.
//   평균 값 7번 266·8번 220·6번 46.4·3번 41.8·4번 23.2·5번 19·1번 12.8·2번 7(모두 다름), MIN·MAX 1번 8·25, 2번 5·9, 3번 12·120,
//   4번 15·35, 5번 6·40, 6번 16·110, 7번 150·400, 8번 130·350. 값의 폭 17·4·108·20·34·94·250·220.
//   폭 > 50 → 3·6·7·8번, > 100 → 3·7·8번, > 200 → 7·8번. AVG(price) > 40 → 3·6·7·8번, < 20 → 1·2·5번.
//   A3는 A1·A2를 했다고 기대하지 않는다. 셈끼리 셈(7-A2 모양)은 카드 2에서 다시 보인다.
export const ADVANCED = [
  {
    id: "8-A1", chapter: 8, isAdvanced: true, title: "두 열로 묶기",
    goal: "GROUP BY에 열 둘을 놓아 두 값의 짝마다 묶어 센다",
    summary: [
      "GROUP BY 열1, 열2 = 두 값의 짝마다",
      "있는 짝만 묶음이 되어 행이 돼요",
      "묶은 두 열을 SELECT에도 놓아요",
    ],
    cards: [
      {
        say: "8장에서 한 열로 묶었죠? 오늘은 한 걸음 더, 두 열로 묶어요. GROUP BY village, kind는 마을과 종류가 둘 다 같은 행끼리 한 묶음이에요. 두 마을 × 세 종류, 6묶음! 묶은 두 열을 SELECT에도 놓아 이름표로 써요.",
        sql: "SELECT village, kind,\n  COUNT(*) AS n\nFROM customers\nWHERE village IN ('큰바위마을',\n  '솔바위골')\nGROUP BY village, kind",
      },
      {
        say: "묶음은 실제로 있는 짝만 생겨요. 60살 이상만 남기면 여우 손님이 없어 여우 짝은 하나도 없어요. 그래서 8행! 두 열의 차례를 바꿔 적어도 묶음은 같아요.",
        sql: "SELECT kind, village,\n  COUNT(*) AS n\nFROM customers\nWHERE age >= 60\nGROUP BY kind, village",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_group_two",
        q: "GROUP BY village, kind는 어떤 행끼리 한 묶음으로 모을까요?",
        options: [
          "마을과 종류가 둘 다 같은 행끼리",
          "마을이나 종류 중 하나라도 같은 행끼리",
          "마을로 한 번, 종류로 한 번 따로따로",
        ],
        answer: 0,
        explain: "두 값의 짝이 같아야 한 묶음이에요. 큰바위마을 도깨비와 큰바위마을 사람은 다른 묶음이에요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "큰바위마을 손님을 마을과 종류로 묶었어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT village, kind,\n  COUNT(*) AS n\nFROM customers\nWHERE village = '큰바위마을'\nGROUP BY village, kind",
        options: ["3행", "1행", "11행"],
        answer: 0,
        explain: "마을은 하나뿐이고 종류가 도깨비·사람·여우라 짝이 3개, 3행이에요. 11은 큰바위마을 손님 수예요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "손님 전체를 마을과 종류로 묶었어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT village, kind,\n  COUNT(*) AS n\nFROM customers\nGROUP BY village, kind",
        options: ["24행", "11행", "60행"],
        answer: 0,
        explain: "마을 8곳 × 종류 3가지 = 24짝이 이 장터에는 모두 있어서 24행이에요. 8 + 3 = 11이 아니에요. 60은 손님 수예요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "70살 이상 손님만 종류와 마을로 묶었어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT kind, village,\n  COUNT(*) AS n\nFROM customers\nWHERE age >= 70\nGROUP BY kind, village",
        options: ["6행", "16행", "2행"],
        answer: 0,
        explain: "남은 손님이 이룬 짝만 묶음이 돼요. 도깨비 4곳, 사람 2곳이라 6행이에요. 짝이 없는 마을은 행이 생기지 않아요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "GROUP BY village, kind를 GROUP BY kind, village로 바꾸면?",
        options: [
          "묶음은 같다(ORDER BY가 없으니 행의 차례는 정해지지 않는다)",
          "묶음 수가 절반으로 준다",
          "오류가 난다",
        ],
        answer: 0,
        explain: "짝이 같으면 한 묶음이라 어느 열을 먼저 적든 묶음은 같아요. 차례가 필요하면 ORDER BY를 붙여요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "이 SQL 결과에서 사람 묶음의 n은?",
        code: "SELECT village, kind,\n  COUNT(*) AS n\nFROM customers\nWHERE village = '솔바위골'\nGROUP BY village, kind",
        options: ["3", "9", "5"],
        answer: 0,
        explain: "솔바위골 사람 손님은 3명이에요. 9는 솔바위골 손님 전체, 5는 솔바위골 도깨비 묶음의 n이에요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "GROUP BY village, kind를 쓴 SQL의 SELECT에 놓아도 되는 것끼리 고르면?",
        options: ["village, kind, COUNT(*)", "village, name, COUNT(*)", "kind, age"],
        answer: 0,
        explain: "묶은 두 열과 모아 세기는 묶음마다 값이 하나예요. name·age는 한 묶음에 여럿이라 8장 규칙대로 놓지 않아요.",
      },
      {
        type: "blank", concept: "adv_group_two",
        q: "나이 모르는 손님을 종류와 마을의 짝마다 세게 빈자리를 채워 보세요.",
        code: "SELECT kind, village,\n  COUNT(*) AS n\nFROM customers\nWHERE age IS NULL\nGROUP BY kind, ___",
        chips: ["village", "n", "age"],
        answer: 0,
        explain: "SELECT에 놓은 두 열로 묶어야 해요. 사람 느티나무골 2명 같은 4묶음이 나와요. n은 셈이라 묶을 수 없고, age면 마을이 섞여요.",
      },
      {
        type: "order", concept: "adv_group_two",
        q: "70살 이상 손님을 종류와 마을의 짝마다 세게 줄을 놓아 보세요.",
        lines: ["SELECT kind, village,", "COUNT(*) AS n", "FROM customers", "WHERE age >= 70", "GROUP BY kind, village"],
        explain: "WHERE가 먼저 거르고 두 열로 묶어요. 큰바위마을 도깨비 2명, 버드나무고개 사람 2명 같은 6묶음이에요.",
      },
      {
        type: "choice", concept: "adv_group_two",
        q: "60살 이상 손님을 종류와 마을의 짝마다 센 결과는?",
        options: [
          { sql: "SELECT kind, village,\n  COUNT(*) AS n\nFROM customers\nWHERE age >= 60\nGROUP BY kind, village" },
          { sql: "SELECT kind, COUNT(*) AS n\nFROM customers\nWHERE age >= 60\nGROUP BY kind" },
          { sql: "SELECT village, COUNT(*) AS n\nFROM customers\nWHERE age >= 60\nGROUP BY village" },
        ],
        answer: 0, tables: ["customers"],
        explain: "종류와 마을이 함께 보이는 8행 표가 정답이에요. 종류로만 묶으면 도깨비·사람 2행, 마을로만 묶으면 종류가 섞여요.",
      },
      {
        id: "8-A1-b1", type: "build", concept: "adv_group_two",
        q: "마을마다, 손님 종류마다 몇 명인지 n이라는 이름으로 세어 줘",
        cards: ["SELECT", "village, kind,", "COUNT(*) AS n", "FROM", "customers", "GROUP BY", "village,", "kind"],
        extra: ["COUNT(age) AS n", "kind,"],
        tables: ["customers"],
        hints: [
          "마을과 종류의 짝마다 한 묶음이 되게 두 열로 묶어요.",
          "GROUP BY 뒤에 village, 와 kind 카드를 놓아요.",
        ],
        explain: "24묶음이에요. 큰바위마을 도깨비 5명처럼 짝마다 나왔어요. COUNT(age)면 나이 모르는 손님이 빠지고, kind 하나로 묶으면 3행이에요.",
      },
      {
        id: "8-A1-b2", type: "build", concept: "adv_group_two",
        q: "손님 1~4번의 주문을 손님마다, 상태마다 몇 건인지 n이라는 이름으로 세어 줘",
        cards: ["SELECT", "customer_id, status,", "COUNT(*) AS n", "FROM", "orders", "WHERE", "customer_id <= 4", "GROUP BY", "customer_id,", "status"],
        extra: ["customer_id < 4", "status,"],
        tables: ["orders"],
        hints: [
          "손님 1~4번만 남긴 뒤 손님 번호와 상태의 짝마다 세요.",
          "WHERE customer_id <= 4 다음에 GROUP BY customer_id, status예요.",
        ],
        explain: "7행이에요. 2번 손지우는 취소가 없어 완료 한 행뿐이에요. < 4면 4번 손님이 빠지고, status로만 묶으면 2행이에요.",
      },
      {
        type: "check", concept: "adv_group_two",
        q: "두 열로 묶기에 대해 맞는 말은?",
        options: [
          "두 값의 짝마다 한 묶음이고, 실제로 있는 짝만 행이 된다",
          "결과는 늘 첫 열의 값 수 × 둘째 열의 값 수만큼 나온다",
          "두 열을 적은 차례에 따라 묶음이 달라진다",
        ],
        answer: 0,
        explain: "짝이 없으면 묶음도 없어요. 그래서 70살 이상은 6행뿐이었죠. 두 열을 SELECT에도 놓아 어느 짝인지 보여요.",
      },
    ],
  },
  {
    id: "8-A2", chapter: 8, isAdvanced: true, title: "HAVING에 조건 둘",
    goal: "HAVING에 셈 조건 둘을 AND·OR로 이어 묶음을 거른다",
    summary: [
      "HAVING 조건1 AND 조건2로 묶음 거르기",
      "OR면 하나만 맞아도, 섞으면 괄호",
      "행 조건은 WHERE, 묶음 조건은 HAVING",
    ],
    cards: [
      {
        say: "8장에서 HAVING으로 묶음을 걸렀죠? 오늘은 한 걸음 더, 조건 둘이에요. WHERE처럼 AND로 이어요. 손님이 8명 이상이고 평균 나이가 40살 넘는 마을, 셋이에요. AVG(age)는 SELECT에 없어도 HAVING에 써요.",
        sql: "SELECT village, COUNT(*) AS n\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= 8\n  AND AVG(age) > 40",
      },
      {
        say: "OR면 둘 중 하나만 맞아도 남아요. AND·OR를 섞으면 4장처럼 AND가 먼저라 괄호로 묶어요. 아래는 사람 손님만 남겨(WHERE) 마을로 묶고, 4명 이상이거나 70살 이상 손님이 있는 마을이에요.",
        sql: "SELECT village, COUNT(*) AS n\nFROM customers\nWHERE kind = '사람'\nGROUP BY village\nHAVING COUNT(*) >= 4\n  OR MAX(age) >= 70",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_having_two",
        q: "HAVING COUNT(*) >= 8 AND AVG(age) > 40은 어떤 묶음을 남길까요?",
        options: [
          "두 조건에 모두 맞는 묶음",
          "둘 중 하나라도 맞는 묶음",
          "두 조건에 모두 안 맞는 묶음",
        ],
        answer: 0,
        explain: "AND는 WHERE에서처럼 둘 다 참이어야 해요. 손님 9명이어도 평균 37살인 솔바위골은 빠져요.",
      },
      {
        type: "choice", concept: "adv_having_two",
        q: "AND를 OR로 바꾼 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT village\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= 8\n  OR AVG(age) > 40",
        options: ["6행", "3행", "8행"],
        answer: 0,
        explain: "8명 이상인 5곳에 평균 52살인 버드나무고개가 더해져 6행이에요. 둘 다 아닌 달빛마을·여우고개만 빠져요.",
      },
      {
        type: "choice", concept: "adv_having_two",
        q: "HAVING에서 AND 대신 OR를 쓰면 남는 묶음은?",
        options: ["같거나 늘어난다", "같거나 줄어든다", "늘 똑같다"],
        answer: 0,
        explain: "OR는 하나만 맞아도 남기니까 AND로 남던 묶음은 그대로 남고 더 붙을 수 있어요. WHERE의 AND·OR와 같아요.",
      },
      {
        type: "choice", concept: "adv_having_two",
        q: "가게 중 가장 싼 물건이 100엽전 이상이거나, 가장 비싼 물건이 10엽전 밑인 곳은 몇 곳?",
        code: "SELECT shop_id\nFROM items\nGROUP BY shop_id\nHAVING MIN(price) >= 100\n  OR MAX(price) < 10",
        options: ["3행", "2행", "8행"],
        answer: 0,
        explain: "공방 7·8번(가장 싼 것도 130엽전 이상)과 여우골 떡방 2번(가장 비싼 약과 9엽전), 3행이에요.",
      },
      {
        type: "choice", concept: "adv_having_two",
        q: "HAVING COUNT(*) >= 9 OR COUNT(*) <= 3 AND AVG(age) > 40에서 먼저 묶이는 것은?",
        options: [
          "COUNT(*) <= 3 AND AVG(age) > 40",
          "COUNT(*) >= 9 OR COUNT(*) <= 3",
          "왼쪽부터 차례로 묶인다",
        ],
        answer: 0,
        explain: "4장처럼 AND가 OR보다 먼저 묶여요. 뜻이 다르면 괄호로 먼저 묶을 것을 감싸요. HAVING도 WHERE와 같은 규칙이에요.",
      },
      {
        type: "choice", concept: "adv_having_two",
        q: "사람 손님만 세면서 4명 이상인 마을을 고를 때, kind = '사람'은 어디에 둘까요?",
        options: [
          "WHERE, 묶기 전에 행을 거르는 조건이라서",
          "HAVING, 묶음을 거르는 조건이라서",
          "GROUP BY 바로 뒤에 AND로",
        ],
        answer: 0,
        explain: "한 행의 값으로 거르는 건 WHERE, 셈으로 거르는 건 HAVING이에요. 조건이 둘이어도 성질에 따라 나눠 둬요.",
      },
      {
        type: "blank", concept: "adv_having_two",
        q: "가장 어린 손님이 10살 밑이거나, 가장 나이 많은 손님이 70살 이상인 마을이 나오게 빈자리를 채워 보세요.",
        code: "SELECT village\nFROM customers\nGROUP BY village\nHAVING MIN(age) < 10\n  ___ MAX(age) >= 70",
        chips: ["OR", "AND", "WHERE"],
        answer: 0,
        explain: "「이거나」는 OR예요. 느티나무골·버드나무고개·솔바위골·은행나무마을·큰바위마을, 5곳이에요. AND면 느티나무골·은행나무마을 2곳뿐이에요.",
      },
      {
        type: "order", concept: "adv_having_two",
        q: "가장 싼 물건이 100엽전 이상이거나 가장 비싼 물건이 10엽전 밑인 가게를 보게 줄을 놓아 보세요.",
        lines: ["SELECT shop_id", "FROM items", "GROUP BY shop_id", "HAVING MIN(price) >= 100", "OR MAX(price) < 10"],
        explain: "HAVING 뒤에 첫 조건, OR 뒤에 둘째 조건이에요. 2·7·8번 가게가 나와요.",
      },
      {
        type: "choice", concept: "adv_having_two",
        q: "손님이 8명 이상이고, 가장 어린 손님이 10살 밑인 마을을 고른 결과는?",
        options: [
          { sql: "SELECT village\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= 8\n  AND MIN(age) < 10" },
          { sql: "SELECT village\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= 8\n  OR MIN(age) < 10" },
          { sql: "SELECT village\nFROM customers\nGROUP BY village\nHAVING COUNT(*) >= 9\n  AND MIN(age) < 10" },
        ],
        answer: 0, tables: ["customers"],
        explain: "느티나무골(9살)·은행나무마을(8살) 2행이 정답이에요. OR면 8명 이상인 5곳이 다 들어오고, 9명 이상이면 딱 8명인 느티나무골이 빠져요.",
      },
      {
        id: "8-A2-b1", type: "build", concept: "adv_having_two",
        q: "손님이 8명 이상이고, 평균 나이가 40살 넘는 마을을 보여 줘",
        cards: ["SELECT", "village", "FROM", "customers", "GROUP BY", "village", "HAVING", "COUNT(*) >= 8", "AND", "AVG(age) > 40"],
        extra: ["OR", "COUNT(*) > 8"],
        tables: ["customers"],
        hints: [
          "마을로 묶은 뒤, 손님 수와 평균 나이 두 조건에 모두 맞는 묶음만 남겨요.",
          "HAVING 뒤에 COUNT(*) >= 8, AND, AVG(age) > 40을 놓아요.",
        ],
        explain: "느티나무골·은행나무마을·큰바위마을이에요. OR면 6곳, > 8이면 딱 8명인 느티나무골이 빠져요.",
      },
      {
        id: "8-A2-b2", type: "build", concept: "adv_having_two",
        q: "가장 비싼 물건이 100엽전 넘고, 가장 싼 물건은 20엽전 밑인 가게 번호를 보여 줘",
        cards: ["SELECT", "shop_id", "FROM", "items", "GROUP BY", "shop_id", "HAVING", "MAX(price) > 100", "AND", "MIN(price) < 20"],
        extra: ["OR", "MIN(price) > 20"],
        tables: ["items"],
        hints: [
          "가게로 묶은 뒤, 가장 비싼 값과 가장 싼 값 두 조건에 모두 맞는 가게를 남겨요.",
          "HAVING 뒤에 MAX(price) > 100, AND, MIN(price) < 20을 놓아요.",
        ],
        explain: "산삼 약방(3번)과 바람 보따리(6번)예요. 비싼 물건과 싼 물건을 함께 파네요. OR면 8곳이 모두 나와요.",
      },
      {
        type: "check", concept: "adv_having_two",
        q: "HAVING에 조건 둘을 쓰는 것에 대해 맞는 말은?",
        options: [
          "AND·OR로 셈 조건을 잇고, 섞을 때는 괄호로 묶으며, 행 조건은 WHERE에 둔다",
          "HAVING에는 조건을 하나만 쓸 수 있다",
          "HAVING에 쓴 셈은 반드시 SELECT에도 있어야 한다",
        ],
        answer: 0,
        explain: "HAVING도 WHERE처럼 AND·OR·괄호를 써요. 다만 묶음을 거르니 셈으로 거르고, 행 하나의 값은 묶기 전 WHERE에서 걸러요.",
      },
    ],
  },
  {
    id: "8-A3", chapter: 8, isAdvanced: true, title: "가게별 성적표",
    goal: "묶음마다 셈 여럿을 내고 줄 세우고 걸러 성적표를 만든다",
    summary: [
      "의뢰: 가게마다 성적표",
      "묶음마다 셈 여럿, 줄 세우기는 둘째 기준까지",
      "값의 폭 = MAX - MIN, HAVING엔 다시 적기",
    ],
    cards: [
      {
        say: "8장에서 묶음마다 셈하고 줄 세웠죠? 오늘은 의뢰예요! 방망이 대장간 쇠돌 님이 「가게마다 성적표를 만들어 주게. 물건 값이 비싼 가게부터」래요. 가게마다 물건 수, 평균 값, 가장 싼 값과 비싼 값이에요.",
        sql: "SELECT shop_id, COUNT(*) AS n,\n  AVG(price) AS avg_price,\n  MIN(price) AS low,\n  MAX(price) AS high\nFROM items\nGROUP BY shop_id\nORDER BY avg_price DESC, shop_id",
      },
      {
        say: "「값의 폭」 칸도 원하셨어요. 모은 값끼리 빼면 돼요: 가장 비싼 값 − 가장 싼 값. 폭이 50엽전 넘는 가게만 남기려면 HAVING에 그 셈을 다시 적어요. 별칭 gap은 HAVING에 쓰지 않아요(8-4).",
        sql: "SELECT shop_id,\n  MAX(price) - MIN(price) AS gap\nFROM items\nGROUP BY shop_id\nHAVING MAX(price) - MIN(price) > 50",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_apply_8",
        q: "성적표 SQL 결과에서 방망이 대장간(7번)의 avg_price는?",
        code: "SELECT shop_id, COUNT(*) AS n,\n  AVG(price) AS avg_price\nFROM items\nGROUP BY shop_id",
        options: ["266", "1330", "400"],
        answer: 0,
        explain: "7번 가게 물건 값 합 1330을 5가지로 나눠 266엽전이에요. 1330은 합, 400은 가장 비싼 금방망이예요.",
      },
      {
        type: "choice", concept: "adv_apply_8",
        q: "성적표를 ORDER BY avg_price DESC 하나로만 세우면?",
        options: [
          "지금은 평균이 모두 달라 괜찮지만, 같은 평균이 생기면 그 가게들의 차례가 정해지지 않는다",
          "오류가 난다",
          "평균이 같은 가게는 하나만 나온다",
        ],
        answer: 0,
        explain: "묶음을 세울 때도 둘째 기준이 있어야 차례가 늘 같아요(8-3). 그래서 shop_id를 붙였어요.",
      },
      {
        type: "choice", concept: "adv_apply_8",
        q: "뚝딱 공방(8번 가게)의 값의 폭, 이 SQL의 결과 값은?",
        code: "SELECT MAX(price) - MIN(price)\n  AS gap\nFROM items\nWHERE shop_id = 8",
        options: ["220", "350", "130"],
        answer: 0,
        explain: "가장 비싼 장승 350에서 가장 싼 빨래방망이 130을 빼 220엽전이에요.",
      },
      {
        type: "choice", concept: "adv_apply_8",
        q: "HAVING gap > 50이라고 별칭으로 쓰지 않고 셈을 다시 적는 까닭은?",
        options: [
          "HAVING에서 별칭을 못 알아듣는 데이터베이스도 있어서",
          "별칭은 ORDER BY에서만 만들 수 있어서",
          "셈을 다시 적으면 결과가 더 정확해져서",
        ],
        answer: 0,
        explain: "8-4와 같아요. 이 장터는 받아 주지만 오류를 내는 데이터베이스가 있어 셈을 다시 적어요. ORDER BY에서는 별칭을 써도 돼요.",
      },
      {
        type: "choice", concept: "adv_apply_8",
        q: "평균 값이 40엽전 넘는 가게만 남긴 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT shop_id,\n  AVG(price) AS avg_price\nFROM items\nGROUP BY shop_id\nHAVING AVG(price) > 40",
        options: ["4행", "2행", "8행"],
        answer: 0,
        explain: "3번 41.8, 6번 46.4, 7번 266, 8번 220엽전, 4행이에요. 공방 둘만이 아니라 산삼·갓이 있는 가게도 넘었어요.",
      },
      {
        type: "choice", concept: "adv_apply_8",
        q: "성적표에서 값의 폭이 가장 작은 가게는?",
        options: ["여우골 떡방(2번)", "도깨비 국밥집(1번)", "방망이 대장간(7번)"],
        answer: 0,
        explain: "여우골 떡방은 5엽전부터 9엽전까지라 폭이 4엽전이에요. 국밥집은 17, 대장간은 250엽전이에요.",
      },
      {
        type: "blank", concept: "adv_apply_8",
        q: "성적표가 평균 값 비싼 가게부터 나오게 빈자리를 채워 보세요.",
        code: "SELECT shop_id,\n  AVG(price) AS avg_price\nFROM items\nGROUP BY shop_id\nORDER BY avg_price ___,\n  shop_id",
        chips: ["DESC", "ASC", "MAX"],
        answer: 0,
        explain: "큰 값부터는 DESC예요. 7번 266이 맨 위, 2번 7이 맨 아래예요. ASC면 거꾸로, MAX는 그 자리에 올 수 없어 단서가 나와요.",
      },
      {
        type: "order", concept: "adv_apply_8",
        q: "가게마다 값의 폭을 큰 차례로 보게 줄을 놓아 보세요.",
        lines: ["SELECT shop_id,", "MAX(price) - MIN(price) AS gap", "FROM items", "GROUP BY shop_id", "ORDER BY gap DESC, shop_id"],
        explain: "셈한 열에 이름을 붙이고, 그 이름으로 큰 차례로 세워요. 7번 250, 8번 220, 3번 108 … 2번 4예요.",
      },
      {
        type: "choice", concept: "adv_apply_8",
        q: "평균 값이 20엽전 밑인 가게를 고른 결과는?",
        options: [
          { sql: "SELECT shop_id,\n  AVG(price) AS avg_price\nFROM items\nGROUP BY shop_id\nHAVING AVG(price) < 20" },
          { sql: "SELECT shop_id,\n  AVG(price) AS avg_price\nFROM items\nGROUP BY shop_id\nHAVING MAX(price) < 20" },
          { sql: "SELECT shop_id,\n  AVG(price) AS avg_price\nFROM items\nWHERE price < 20\nGROUP BY shop_id" },
        ],
        answer: 0, tables: ["items"],
        explain: "1번 12.8, 2번 7, 5번 19인 3행이 정답이에요. MAX로 거르면 2번만, WHERE로 거르면 싼 물건만 남긴 평균이라 뜻이 달라요.",
      },
      {
        id: "8-A3-b1", type: "build", concept: "adv_apply_8",
        q: "가게마다 평균 값을 avg_price라는 이름으로 내서, 비싼 가게부터 보여 줘",
        cards: ["SELECT", "shop_id,", "AVG(price) AS avg_price", "FROM", "items", "GROUP BY", "shop_id", "ORDER BY", "avg_price DESC,", "shop_id"],
        extra: ["avg_price,", "SUM(price) AS avg_price"],
        tables: ["items"],
        hints: [
          "가게로 묶어 평균을 낸 다음, 그 평균이 큰 차례로 세우고 가게 번호를 둘째 기준으로 붙여요.",
          "ORDER BY 뒤에 avg_price DESC, 와 shop_id를 놓아요.",
        ],
        explain: "7번 266, 8번 220, 6번 46.4 … 2번 7엽전이에요. DESC가 없으면 거꾸로, SUM이면 평균이 아니라 합이에요.",
      },
      {
        id: "8-A3-b2", type: "build", concept: "adv_apply_8",
        q: "가게마다 값의 폭을 gap이라는 이름으로 내서, 폭이 100엽전 넘는 가게만 보여 줘",
        cards: ["SELECT", "shop_id,", "MAX(price) - MIN(price) AS gap", "FROM", "items", "GROUP BY", "shop_id", "HAVING", "MAX(price) - MIN(price) > 100"],
        extra: ["MAX(price) - MIN(price) > 200", "WHERE"],
        tables: ["items"],
        hints: [
          "가게로 묶어 가장 비싼 값에서 가장 싼 값을 빼고, 그 폭으로 묶음을 걸러요.",
          "HAVING 뒤에 같은 셈을 다시 적은 카드를 놓아요.",
        ],
        explain: "3번 108, 7번 250, 8번 220엽전이에요. 200을 넘는 건 공방 둘뿐이고, WHERE로는 셈을 거를 수 없어요.",
      },
      {
        type: "check", concept: "adv_apply_8",
        q: "쇠돌 님의 성적표 SQL에 대해 맞는 말은?",
        options: [
          "묶음마다 셈을 여럿 내고, 셈한 값으로 줄 세우고, HAVING에는 셈을 다시 적어 거른다",
          "묶음마다 셈은 하나만 낼 수 있다",
          "HAVING에는 SELECT의 별칭을 쓰는 것이 모든 데이터베이스에서 안전하다",
        ],
        answer: 0,
        explain: "물건 수·평균·가장 싼 값·비싼 값·폭까지 한 행에 냈어요. 줄 세울 때는 둘째 기준, 거를 때는 셈을 다시 적기!",
      },
    ],
  },
];
