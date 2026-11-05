// 8장 「묶어서 세기」 (설계 §6: GROUP BY·HAVING / 장터 예: 가게별 매출, 1만 엽전 넘는 가게).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 8
// 8장 낱말은 7장까지에 GROUP·HAVING을 더한 것이다(BY는 5장). ROUND·CASE는 9장이라 쓰지 않는다.
// - 장터 예 「가게별 매출, 1만 엽전 넘는 가게」(판정 R31로 「냥」 대신 「엽전」): 진짜 가게별 매출은 수량(order_items.qty) × 값(items.price)을
//   완료된 주문(orders.status)만 더하고 물건을 가게(items.shop_id)에 이어야 해서 표 셋이 필요하다(조인은 10장).
//   8장은 7장처럼 표 하나로 정직하게 셀 수 있는 것으로 대신한다.
//   ① 가게별 「재고 값어치」 = items를 shop_id로 묶은 SUM(price * stock)(엽전, 7장 7-4의 stock_value를 가게마다). 8-2-b1.
//   ② 1만 엽전 넘는 가게 = HAVING SUM(price * stock) > 10000 → 6·7·8번(10525·36890·15620, 그다음은 4번 3748). 8-4-b1·8-5-b1.
//   ③ 매출로 가는 걸음 = order_items를 item_id로 묶은 SUM(qty)(물건별 주문 수량, 38행). 8-3-b1.
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
//   order_items를 item_id로 묶음: 38행(10번 꿀떡, 30번 보따리는 팔린 적 없음), SUM(qty) 100 넘는 것 12번 115·6번 108·16번 107(그다음 1번 91).
// - 엔진마다 다른 것(판정 R36): SELECT에 묶지 않은 열을 놓는 것(SELECT name, COUNT(*) … GROUP BY shop_id)은 이 장터(SQLite)만 받아 주고
//   표준 SQL·PostgreSQL은 오류라 「이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않는다」로만 쓰고 카드 SQL에 넣지 않는다.
//   HAVING에서 SELECT의 별칭을 부르는 것(HAVING n >= 9)도 SQLite·MySQL은 받지만 PostgreSQL은 오류라, HAVING에는 언제나 COUNT(*)처럼 셈을 다시 적는다.
//   NULL끼리 한 묶음, WHERE 안 모아 세기 오류, HAVING이 GROUP BY 뒤라는 것은 어디서나 같아 붙이지 않는다.
// - 조립 카드(판정 R38): GROUP·BY는 SELECT·FROM처럼 한 장씩. 함수 부르기(SUM(price * stock))는 한 장, 별칭(AS n) 한 장,
//   HAVING 조건(SUM(price * stock) > 10000)은 한 장. 「SELECT 열 , 셈 AS 이름 FROM 표 GROUP BY 열」이 이미 10장이라
//   WHERE와 GROUP BY를 함께 쓰거나 묶음을 ORDER BY로 줄 세우는 조립은 더미 12장 안에 들어가지 않는다. 그런 것은 터치 문제(줄 놓기·빈자리·객관식)로 가르치고,
//   HAVING 조립은 셈을 SELECT에 보이지 않는 짧은 모양(SELECT shop_id … HAVING …)으로 쓴다.
// - 헷갈림 카드에 열 이름(kind, name 등)을 쓰지 않았다: 한 자리만 바꾸면 SQLite가 묶지 않은 열로 받아 「돌아가는」 모양이 생기기 때문이다.
//   표 이름(없는 열 → 단서), 다른 셈(결과가 다름), WHERE(HAVING 자리 → 단서)로 만든다.
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
        cards: ["SELECT", "village", ",", "COUNT(*)", "AS n", "FROM", "customers", "GROUP", "BY", "village"],
        extra: ["orders", "SUM(age)"],
        tables: ["customers"],
        hints: [
          "손님 표를 마을로 묶고, 묶음마다 행을 세요. 어느 마을인지도 함께 보여요.",
          "SELECT 다음에 village, 쉼표, COUNT(*) AS n을, 맨 끝에 GROUP BY village를 놓아요.",
        ],
        explain: "마을 8곳이 한 행씩 나왔어요. 큰바위마을이 11명으로 가장 많아요. 묶은 열 village를 SELECT에도 놓아 이름표가 됐어요!",
      },
      {
        id: "8-1-b2", type: "build", concept: "groupby",
        q: "주문을 상태마다 몇 건인지 n이라는 이름으로 세어 줘",
        cards: ["SELECT", "status", ",", "COUNT(*)", "AS n", "FROM", "orders", "GROUP", "BY", "status"],
        extra: ["order_items", "MIN(ordered_on)"],
        tables: ["orders"],
        hints: [
          "주문 표를 상태로 묶고, 묶음마다 행을 세어 이름을 붙여요.",
          "SELECT 다음에 status, 쉼표, COUNT(*)와 AS n을, 끝에 GROUP BY status를 놓아요.",
        ],
        explain: "완료 542건, 취소 49건이에요. 7장에서는 WHERE로 하나씩 셌는데 GROUP BY는 한 번에 묶음마다 세요. order_items에는 status 열이 없어요.",
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
        say: "묶음마다 SUM·AVG·MIN·MAX도 돼요. 8장 대표 문제 「가게별 매출」의 첫걸음! 가게마다 값 × 재고를 더한 재고 값어치(엽전)예요. 진짜 매출은 팔린 수량 × 값이라 표를 이어야 해서 10장에서 구해요.",
        sql: "SELECT shop_id,\n  SUM(price * stock) AS stock_value\nFROM items\nGROUP BY shop_id",
      },
      {
        say: "SELECT에는 묶은 열과 모아 세기만 놓아요. 물건 이름(name)은 한 묶음에 다섯 개라 하나를 고를 수 없거든요. 이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않아요. 아래는 묶음마다 셈 셋!",
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
        q: "가게별 매출의 첫걸음, 가게마다 값 × 재고를 더해 stock_value라는 이름으로 보여 줘",
        cards: ["SELECT", "shop_id", ",", "SUM(price * stock)", "AS stock_value", "FROM", "items", "GROUP", "BY", "shop_id"],
        extra: ["SUM(price)", "shops"],
        tables: ["items"],
        hints: [
          "물건 표를 가게 번호로 묶고, 묶음마다 값과 재고를 곱한 것을 더해 이름을 붙여요.",
          "SELECT 다음에 shop_id, 쉼표, SUM(price * stock)과 AS stock_value를, 끝에 GROUP BY shop_id를 놓아요.",
        ],
        explain: "8장의 대표 문제 첫걸음이에요! 가게 8곳의 재고 값어치가 나왔어요. 7번 방망이 대장간이 36890엽전으로 가장 커요. 팔린 엽전(매출)은 10장에서 표를 이어 구해요.",
      },
      {
        id: "8-2-b2", type: "build", concept: "groupby",
        q: "손님 종류마다 평균 나이를 avg_age라는 이름으로 보여 줘",
        cards: ["SELECT", "kind", ",", "AVG(age)", "AS avg_age", "FROM", "customers", "GROUP", "BY", "kind"],
        extra: ["SUM(age)", "items"],
        tables: ["customers"],
        hints: [
          "손님 표를 종류로 묶고, 묶음마다 나이의 평균을 구해 이름을 붙여요.",
          "SELECT 다음에 kind, 쉼표, AVG(age)와 AS avg_age를, 끝에 GROUP BY kind를 놓아요.",
        ],
        explain: "도깨비 약 44.3, 사람 43.5, 여우 약 38.3살이에요. 7장에서는 WHERE로 종류마다 한 번씩 냈던 평균이 한 번에 나왔어요!",
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
        q: "나이 모르는 손님을 종류로 묶어 셌어요. 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT kind, COUNT(*) AS n\nFROM customers\nWHERE age IS NULL\nGROUP BY kind",
        options: ["2행", "3행", "5행"],
        answer: 0,
        explain: "나이 모르는 5명은 사람 4명, 도깨비 1명이에요. 여우는 남은 행이 없어 묶음도 없어요. 그래서 2행이에요.",
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
        id: "8-3-b1", type: "build", concept: "groupby",
        q: "가게별 매출로 가는 걸음, 물건마다 주문된 수량을 더해 sold라는 이름으로 보여 줘",
        cards: ["SELECT", "item_id", ",", "SUM(qty)", "AS sold", "FROM", "order_items", "GROUP", "BY", "item_id"],
        extra: ["COUNT(*)", "orders"],
        tables: ["order_items"],
        hints: [
          "주문 내역 표를 물건 번호로 묶고, 묶음마다 수량을 더해 이름을 붙여요.",
          "SELECT 다음에 item_id, 쉼표, SUM(qty)와 AS sold를, 끝에 GROUP BY item_id를 놓아요.",
        ],
        explain: "팔린 적 있는 물건 38가지가 나왔어요. 12번 인삼차가 115개로 가장 많아요. 값을 곱하고 가게로 모으는 건 10장에서 표를 이어서 해요!",
      },
      {
        id: "8-3-b2", type: "build", concept: "groupby",
        q: "손님 종류마다 나이를 아는 손님 수를 known_age라는 이름으로 세어 줘",
        cards: ["SELECT", "kind", ",", "COUNT(age)", "AS known_age", "FROM", "customers", "GROUP", "BY", "kind"],
        extra: ["COUNT(*)", "items"],
        tables: ["customers"],
        hints: [
          "손님 표를 종류로 묶고, 묶음마다 나이 칸에 값이 있는 행만 세어요.",
          "SELECT 다음에 kind, 쉼표, COUNT(age)와 AS known_age를, 끝에 GROUP BY kind를 놓아요.",
        ],
        explain: "도깨비 23, 사람 20, 여우 12명이에요. COUNT(*)였다면 24, 24, 12예요. 빈칸 빼고 세기를 묶음마다 했어요!",
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
        cards: ["SELECT", "shop_id", "FROM", "items", "GROUP", "BY", "shop_id", "HAVING", "SUM(price * stock) > 10000"],
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
        cards: ["SELECT", "item_id", "FROM", "order_items", "GROUP", "BY", "item_id", "HAVING", "SUM(qty) > 100"],
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
        lines: ["SELECT shop_id, SUM(price) AS total", "FROM items", "GROUP BY shop_id", "HAVING SUM(price) > 200", "ORDER BY total DESC, shop_id"],
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
        cards: ["SELECT", "shop_id", "FROM", "items", "GROUP", "BY", "shop_id", "HAVING", "SUM(price * stock) > 10000"],
        extra: ["WHERE", "AVG(price * stock) > 10000", "shops"],
        tables: ["items"],
        hints: [
          "가게로 묶은 뒤, 묶음의 값 × 재고 합으로 묶음을 걸러요.",
          "GROUP BY shop_id 다음에 HAVING과 SUM(price * stock) > 10000을 놓아요.",
        ],
        explain: "8장의 대표 문제, 6·7·8번 가게를 다시 찾았어요! AVG였다면 1만 넘는 가게가 없어요. 매출로 고르는 건 10장에서 해요.",
      },
      {
        id: "8-5-b2", type: "build", concept: "groupby",
        q: "주문 상태마다 주문한 손님 수를 겹치지 않게 buyers라는 이름으로 세어 줘",
        cards: ["SELECT", "status", ",", "COUNT(DISTINCT customer_id)", "AS buyers", "FROM", "orders", "GROUP", "BY", "status"],
        extra: ["COUNT(customer_id)", "order_items"],
        tables: ["orders"],
        hints: [
          "주문 표를 상태로 묶고, 묶음마다 손님 번호를 겹치지 않게 세어 이름을 붙여요.",
          "SELECT 다음에 status, 쉼표, COUNT(DISTINCT customer_id)와 AS buyers를 놓아요.",
        ],
        explain: "완료 57명, 취소 28명이에요. 겹침을 빼지 않으면 주문 건수 542·49가 나와요. 7장의 DISTINCT 세기를 묶음마다 했어요!",
      },
      {
        id: "8-5-b3", type: "build", concept: "having",
        q: "나이 모르는 손님이 있는 손님 종류를 보여 줘",
        cards: ["SELECT", "kind", "FROM", "customers", "GROUP", "BY", "kind", "HAVING", "COUNT(age) < COUNT(*)"],
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
