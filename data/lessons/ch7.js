// 7장 「모아 세기」 (설계 §6: COUNT·SUM·AVG·MIN·MAX / 장터 예: 장터 전체 매출).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 7
// 7장 낱말은 6장까지에 COUNT·SUM·AVG·MIN·MAX를 더한 것이다. COUNT(DISTINCT 열)의 DISTINCT는 5장 낱말이다.
// ROUND는 9장이라 쓰지 않는다. 그래서 AVG는 소수가 짧게 끝나는 값으로 고른다(사람 손님 43.5, 1번 가게 12.8, 2번 가게 7).
// - 장터 예 「장터 전체 매출」: 진짜 매출은 수량(order_items.qty) × 값(items.price)을 완료된 주문(orders.status)만 더한 것이라
//   표 셋을 이어야 한다(조인은 10장). 7장에서는 표 하나로 정직하게 셀 수 있는 첫걸음, 「주문된 수량 합」
//   SELECT SUM(qty) AS total_qty FROM order_items = 1882를 대표 build로 쓴다(7-2-b1·7-5-b1). 이 수에는 취소된 주문의
//   물건도 들어 있고 엽전이 아니라 개수라는 것을 카드·해설·7-5 객관식에서 밝힌다. 매출 엽전은 10장에서 완성한다고만 하고 값은 말하지 않는다.
//   (참고로 확인한 값: 조인으로 구한 완료 주문 매출 57487엽전, 완료 주문 수량 1712개. 레슨에는 쓰지 않음.)
// - 확인한 값(data/market.sql, openEngine):
//   customers 60행: COUNT(age) 55, SUM(age) 2349, AVG(age) 42.7091(= 2349 ÷ 55, ÷ 60이면 39.15), MIN 8, MAX 75,
//     COUNT(DISTINCT village) 8, COUNT(DISTINCT kind) 3. 사람 24명·나이 아는 20명·합 870·AVG 43.5(÷ 24면 36.25)·MIN 9·MAX 75,
//     도깨비 24명·나이 아는 23명·AVG 44.3043·MAX 73, 여우 12명(나이 모두 앎)·MIN 13·MAX 59.
//   items 40행: COUNT(stock) 37, SUM(price) 3181, AVG(price) 79.525, MIN(price) 5(식혜), MAX(price) 400(금방망이, 유일),
//     MIN(stock) 0(짚신), MAX(stock) 58, price > 100은 12가지. 가게별 SUM(price)/AVG: 1번 64/12.8, 2번 35/7, 3번 MIN 12·MAX 120,
//     4번 116/23.2, 5번 95, 8번 MIN 130·MAX 350. SUM(stock) 1번 122(메밀전 빈칸 건너뜀), 8번 82.
//     SUM(price * stock): 1번 1464, 5번 1900(한지 빈칸 건너뜀), 8번 15620(장승 빈칸 건너뜀), AVG(price * stock) 8번 3905.
//   orders 591행: 완료 542·취소 49, COUNT(DISTINCT customer_id) 57(손님 60명 중 3명은 주문이 없음), 취소한 적 있는 손님 28명.
//     MIN(ordered_on) 2026-01-14, MAX 2026-12-28. 취소 주문 MIN 2026-01-22(MAX는 완료와 같은 2026-12-28이라 조립에 쓰지 않음).
//   order_items 1241행: SUM(qty) 1882, MIN(qty) 1, MAX(qty) 3, AVG(qty) 1.5165.
// - 엔진마다 다른 것(판정 R36): AVG가 정수끼리도 소수까지 나오는 것(어떤 데이터베이스는 정수로 냄), SUM/COUNT의 정수 나누기,
//   별칭 없는 열 이름, SELECT name, MAX(price)처럼 보통 열과 모아 세기를 섞는 것(SQLite만 받아 줌, 표준 SQL·PostgreSQL은 오류)에는
//   「이 장터에서는」을 붙이거나 「많은 데이터베이스에서 오류」로 쓰고 바른 모양으로 가르치지 않는다. 섞는 모양은 카드 SQL에 넣지 않는다.
//   COUNT(*)와 COUNT(열)의 차이, SUM·AVG·MIN·MAX가 빈칸을 건너뛰는 것, WHERE 안의 모아 세기가 오류인 것은 어디서나 같아 붙이지 않는다.
// - 조립 카드(판정 R38): 함수 부르기(COUNT(age), SUM(price * stock), COUNT(DISTINCT customer_id))는 괄호까지 한 장,
//   별칭은 AS total_qty 한 장, 조건은 kind = '사람' 한 장. 모든 조립에 영어 별칭을 붙이고 과제 문장에 그 이름을 적는다
//   (채점이 열 이름까지 보므로 별칭 카드를 빼면 오답 → drop-one도 지킴).
// - 헷갈림 구절은 결과가 실제로 달라지게 골랐다: COUNT(*) ↔ COUNT(age)는 빈칸이 있는 사람·도깨비 손님에서만(여우는 같아서 안 씀),
//   SUM ↔ COUNT ↔ AVG ↔ MAX(qty 1882·1241·1.5165·3), MIN ↔ MAX, 상태 '완료' ↔ '취소'(MIN 날짜가 다를 때만).
export const CHAPTER = { id: 7, title: "모아 세기" };

export const LESSONS = [
  {
    id: "7-1", chapter: 7, title: "COUNT로 세기",
    goal: "COUNT로 행 수를 세고, 빈칸은 세지 않는 것을 안다",
    summary: [
      "COUNT(*) = 행이 몇 개인지 세기",
      "COUNT(열)은 빈칸(NULL)을 빼고 세요",
      "COUNT(DISTINCT 열)은 겹침 없이 세요",
    ],
    cards: [
      {
        say: "이제 행을 모아서 세어 봐요! COUNT(*)(카운트 별표)는 「행이 몇 개인가」예요. 아래는 여우 손님 행만 남겨 센 결과, 12예요. 행 12개가 숫자 하나로 모여 결과는 1행이에요. WHERE가 없으면 손님 60명을 다 세요.",
        sql: "SELECT COUNT(*)\nFROM customers\nWHERE kind = '여우'",
      },
      {
        say: "괄호 안에 열 이름을 쓰면 그 열에 값이 적힌 행만 세요. 6장의 나이 모르는 5명이 빠져 55예요. DISTINCT를 붙이면 겹친 값은 한 번만 세요. 손님이 사는 마을은 8곳이에요.",
        sql: "SELECT COUNT(*) AS all_rows,\n  COUNT(age) AS with_age,\n  COUNT(DISTINCT village)\n    AS villages\nFROM customers",
      },
    ],
    items: [
      {
        type: "choice", concept: "count",
        q: "COUNT(*)는 무엇을 셀까요?",
        options: ["행이 몇 개인지", "열이 몇 개인지", "값을 모두 더한 수"],
        answer: 0,
        explain: "COUNT(*)는 행을 하나씩 세요. 열의 수를 세거나 값을 더하지 않아요. 값을 더하는 건 다음 레슨의 SUM이에요.",
      },
      {
        type: "choice", concept: "count",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT COUNT(*)\nFROM customers\nWHERE kind = '도깨비'",
        options: ["24", "60", "12"],
        answer: 0,
        explain: "도깨비 손님 행만 남겨 세니 24예요. 60은 WHERE 없이 손님 전부를 센 수, 12는 여우 손님 수예요.",
      },
      {
        type: "choice", concept: "count",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT COUNT(*)\nFROM orders",
        options: ["1행", "591행", "0행"],
        answer: 0,
        explain: "주문 591건을 세어 숫자 591 하나가 나와요. 행 591개가 모여 결과는 1행이에요.",
      },
      {
        type: "choice", concept: "count",
        q: "COUNT(*)에 WHERE를 붙이면 무엇을 셀까요?",
        options: ["WHERE로 걸러 남은 행만 센다", "걸러지기 전 모든 행을 센다", "오류가 난다"],
        answer: 0,
        explain: "WHERE가 먼저 행을 거르고, COUNT는 남은 행을 세요. 그래서 여우 손님만 남기면 12예요.",
      },
      {
        type: "choice", concept: "count",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT COUNT(age)\nFROM customers",
        options: ["55", "60", "5"],
        answer: 0,
        explain: "COUNT(age)는 나이 칸에 값이 적힌 손님만 세요. 60명 중 나이 모르는 5명을 뺀 55예요.",
      },
      {
        type: "choice", concept: "count",
        q: "손님 표에서 COUNT(*)는 60인데 COUNT(age)는 55인 까닭은?",
        options: [
          "COUNT(열)은 그 열이 빈칸(NULL)인 행을 세지 않아서",
          "COUNT(age)는 나이가 60 넘는 손님을 빼서",
          "COUNT(*)가 행을 두 번 세서",
        ],
        answer: 0,
        explain: "나이 모르는 5명은 age 칸이 빈칸이라 COUNT(age)에서 빠져요. COUNT(*)는 칸을 보지 않고 행을 세요.",
      },
      {
        type: "choice", concept: "count",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT COUNT(stock)\nFROM items\nWHERE stock IS NULL",
        options: ["0", "3", "NULL"],
        answer: 0,
        explain: "남은 3행은 모두 stock이 빈칸이라 COUNT(stock)은 하나도 안 세요. 그래서 0이에요. 3행을 세려면 COUNT(*)예요.",
      },
      {
        type: "blank", concept: "count",
        q: "나이를 아는 손님만 세어지게 빈자리를 채워 보세요.",
        code: "SELECT COUNT(___)\nFROM customers",
        chips: ["age", "*", "kind"],
        answer: 0,
        explain: "COUNT(age)는 나이 칸에 값이 있는 55명만 세요. *나 kind를 넣으면 손님 60명이 다 세어져요.",
      },
      {
        type: "choice", concept: "count",
        q: "손님이 사는 마을이 몇 곳인지 센 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT COUNT(DISTINCT village)\nFROM customers" },
          { sql: "SELECT COUNT(village)\nFROM customers" },
          { sql: "SELECT DISTINCT village\nFROM customers" },
        ],
        answer: 0, tables: ["customers"],
        explain: "겹친 마을을 한 번씩만 센 8이 정답이에요. DISTINCT가 없으면 손님마다 세어 60, COUNT가 없으면 마을 이름 8행이 나와요.",
      },
      {
        type: "order", concept: "count",
        q: "취소된 주문이 몇 건인지 세는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT COUNT(*)", "FROM orders", "WHERE status = '취소'"],
        expect: "COUNT(*)\n49",
        explain: "주문 591건 중 status가 취소인 49건이에요. WHERE가 거르고 COUNT가 세요. 차례는 3장과 같아요.",
      },
      {
        id: "7-1-b1", type: "build", concept: "count",
        q: "완료된 주문이 몇 건인지 done_orders라는 이름으로 세어 줘",
        cards: ["SELECT", "COUNT(*)", "AS done_orders", "FROM", "orders", "WHERE", "status = '완료'"],
        extra: ["status = '취소'", "order_items"],
        tables: ["orders"],
        hints: [
          "주문 표에서 상태가 완료인 행만 남기고, 남은 행의 수를 세어 이름을 붙여요.",
          "SELECT 다음에 COUNT(*)와 AS done_orders를, WHERE 다음에 status = '완료'를 놓아요.",
        ],
        explain: "완료된 주문은 542건이에요. 취소 49건과 더하면 591건이죠. 표 이름을 order_items로 바꾸면 status 열이 없어 단서가 나와요.",
      },
      {
        id: "7-1-b2", type: "build", concept: "count",
        q: "사람 손님 중 나이를 아는 손님 수를 known_age라는 이름으로 세어 줘",
        cards: ["SELECT", "COUNT(age)", "AS known_age", "FROM", "customers", "WHERE", "kind = '사람'"],
        extra: ["COUNT(*)", "kind = '여우'"],
        tables: ["customers"],
        hints: [
          "사람 손님만 남기고, 나이 칸에 값이 적힌 행만 세어요. 빈칸은 세지 않는 방법이 있어요.",
          "SELECT 다음에 COUNT(age)와 AS known_age를, WHERE 다음에 kind = '사람'을 놓아요.",
        ],
        explain: "사람 손님 24명 중 나이 모르는 4명이 빠져 20명이에요. COUNT(*)였다면 24예요. 빈칸 빼고 세기, 딱 맞았어요!",
      },
      {
        type: "check", concept: "count",
        q: "COUNT에 대해 맞는 말은?",
        options: [
          "COUNT(*)는 행 수를, COUNT(열)은 그 열에 값이 있는 행 수를 센다",
          "COUNT(열)도 빈칸인 행까지 센다",
          "COUNT의 결과는 센 행 수만큼 여러 행이다",
        ],
        answer: 0,
        explain: "COUNT(*)는 행을, COUNT(열)은 빈칸이 아닌 칸을 세요. 몇 행을 세든 결과는 숫자 하나, 1행이에요.",
      },
    ],
  },
  {
    id: "7-2", chapter: 7, title: "SUM과 AVG",
    goal: "SUM으로 더하고 AVG로 평균을 내며, 빈칸이 빠지는 것을 안다",
    summary: [
      "SUM(열) = 값을 모두 더하기",
      "AVG(열) = 평균, 빈칸은 빼고 나눠요",
      "매출(수량 × 값)은 10장에서 완성",
    ],
    cards: [
      {
        say: "SUM(섬)은 열의 값을 모두 더해요. 7장의 대표 문제 「장터 전체 매출」의 첫걸음으로 주문된 수량을 다 더해 봐요. 1882개! 매출(엽전)은 완료된 주문의 수량 × 값이라 다른 표가 더 필요해요. 10장에서 표를 이어 완성해요.",
        sql: "SELECT SUM(qty) AS total_qty\nFROM order_items",
      },
      {
        say: "AVG(애버리지)는 평균이에요. 빈칸은 더하지도 세지도 않아요. 사람 손님 24명 중 나이를 아는 20명으로 나이 합 870을 나눠 43.5예요! 이 장터에서는 정수끼리도 AVG가 소수까지 나와요.",
        sql: "SELECT COUNT(age) AS known,\n  SUM(age) AS age_sum,\n  AVG(age) AS avg_age\nFROM customers\nWHERE kind = '사람'",
      },
    ],
    items: [
      {
        type: "choice", concept: "sumavg",
        q: "SUM(qty)는 무슨 일을 할까요?",
        options: ["qty 열의 값을 모두 더한다", "qty 칸이 있는 행을 센다", "qty 중 가장 큰 값을 고른다"],
        answer: 0,
        explain: "SUM은 값을 더해요. 행을 세는 건 COUNT, 가장 큰 값은 다음 레슨의 MAX예요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "여우골 떡방(2번 가게) 물건 값의 합, 이 SQL의 결과 값은?",
        code: "SELECT SUM(price)\nFROM items\nWHERE shop_id = 2",
        options: ["35", "7", "5"],
        answer: 0,
        explain: "인절미 6, 송편 7, 약과 9, 식혜 5, 꿀떡 8을 더하면 35엽전이에요. 5는 물건 수, 7은 평균이에요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT AVG(price)\nFROM items\nWHERE shop_id = 2",
        options: ["7", "35", "5"],
        answer: 0,
        explain: "값 합 35를 물건 5가지로 나눈 7엽전이에요. AVG는 SUM ÷ (값이 있는 칸 수)예요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "도깨비 국밥집(1번 가게) 물건 값은 모두 정수예요. 이 SQL의 결과 값은?",
        code: "SELECT AVG(price)\nFROM items\nWHERE shop_id = 1",
        options: ["12.8", "12", "64"],
        answer: 0,
        explain: "64 ÷ 5 = 12.8이에요. 2장의 정수 나누기는 소수를 버렸지만, 이 장터에서는 AVG가 소수까지 내놓아요. 64는 합이에요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "1번 가게의 메밀전은 재고 칸이 빈칸이에요. 이 SQL의 결과 값은?",
        code: "SELECT SUM(stock)\nFROM items\nWHERE shop_id = 1",
        options: ["122", "NULL", "0"],
        answer: 0,
        explain: "SUM은 빈칸을 건너뛰고 27 + 18 + 40 + 37 = 122를 내요. 6장의 stock + 10처럼 한 행 안의 셈과 달리, 모아 셈은 NULL이 되지 않아요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "사람 손님 24명 중 나이를 아는 손님은 20명, 나이 합은 870이에요. AVG(age)는?",
        options: ["43.5 (870 ÷ 20)", "36.25 (870 ÷ 24)", "NULL"],
        answer: 0,
        explain: "AVG는 빈칸을 세지도 않아서 나이를 아는 20명으로 나눠요. 빈칸을 0살로 쳤다면 24로 나눠 36.25가 됐을 거예요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "손님 60명의 나이 합은 2349예요. AVG(age)는 2349를 몇으로 나눈 값일까요?",
        options: ["55", "60", "5"],
        answer: 0,
        explain: "나이를 아는 55명으로 나눠 약 42.7이에요. 60으로 나누면 39.15라 빈칸 5명을 0살로 친 셈이 돼요.",
      },
      {
        type: "blank", concept: "sumavg",
        q: "주문된 수량을 모두 더하게 빈자리를 채워 보세요.",
        code: "SELECT ___(qty) AS total_qty\nFROM order_items",
        chips: ["SUM", "COUNT", "MAX"],
        answer: 0,
        explain: "더하기는 SUM이에요. COUNT면 주문 내역 행 수 1241, MAX면 가장 큰 수량 3이 나와요.",
      },
      {
        type: "order", concept: "sumavg",
        q: "구름 잡화점(5번 가게) 물건 값의 합을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT SUM(price) AS total_price", "FROM items", "WHERE shop_id = 5"],
        expect: "total_price\n95",
        explain: "짚신 14, 부채 11, 비단 주머니 40, 한지 6, 등불 24를 더해 95엽전이에요. 한지는 재고만 빈칸이고 값은 있어요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "도깨비 국밥집(1번 가게) 물건 값의 평균을 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT AVG(price)\nFROM items\nWHERE shop_id = 1" },
          { sql: "SELECT SUM(price)\nFROM items\nWHERE shop_id = 1" },
          { sql: "SELECT AVG(price)\nFROM items" },
        ],
        answer: 0, tables: ["items"],
        explain: "12.8인 표가 정답이에요. SUM이면 합 64, WHERE가 없으면 물건 40가지의 평균 79.525예요.",
      },
      {
        id: "7-2-b1", type: "build", concept: "sumavg",
        q: "장터 전체 매출의 첫걸음, 주문된 수량을 total_qty라는 이름으로 모두 더해 줘",
        cards: ["SELECT", "SUM(qty)", "AS total_qty", "FROM", "order_items"],
        extra: ["COUNT(qty)", "AVG(qty)", "orders"],
        tables: ["order_items"],
        hints: [
          "주문 내역 표의 수량 열을 모두 더하고, 그 열에 이름을 붙여요.",
          "SELECT 다음에 SUM(qty)와 AS total_qty를, FROM 다음에 order_items를 놓아요.",
        ],
        explain: "7장의 대표 문제예요! 1882개, 취소된 주문의 물건까지 더한 수예요. 매출(엽전)은 수량 × 값을 완료된 주문만 더하는 거라 10장에서 표를 이어 마저 구해요.",
      },
      {
        id: "7-2-b2", type: "build", concept: "sumavg",
        q: "사람 손님의 평균 나이를 avg_age라는 이름으로 보여 줘",
        cards: ["SELECT", "AVG(age)", "AS avg_age", "FROM", "customers", "WHERE", "kind = '사람'"],
        extra: ["SUM(age)", "kind = '도깨비'"],
        tables: ["customers"],
        hints: [
          "사람 손님만 남기고, 나이 열의 평균을 구해 이름을 붙여요.",
          "SELECT 다음에 AVG(age)와 AS avg_age를, WHERE 다음에 kind = '사람'을 놓아요.",
        ],
        explain: "43.5살이에요. 나이 모르는 4명은 빼고 20명으로 나눴어요. SUM(age)였다면 합 870이 나와요.",
      },
      {
        type: "check", concept: "sumavg",
        q: "SUM과 AVG에 대해 맞는 말은?",
        options: [
          "둘 다 빈칸을 건너뛰고 셈하며, 결과는 1행이다",
          "AVG는 빈칸을 0으로 쳐서 나눈다",
          "SUM은 값이 있는 행의 수를 센다",
        ],
        answer: 0,
        explain: "SUM은 값이 있는 칸만 더하고, AVG는 그 합을 값이 있는 칸 수로 나눠요. 그래서 빈칸이 있으면 평균이 달라져요.",
      },
    ],
  },
  {
    id: "7-3", chapter: 7, title: "MIN과 MAX",
    goal: "MIN·MAX로 가장 작은 값과 가장 큰 값을 찾을 수 있다",
    summary: [
      "MIN(열) = 가장 작은 값",
      "MAX(열) = 가장 큰 값",
      "날짜 글자에도 쓰고, 빈칸은 건너뛰어요",
    ],
    cards: [
      {
        say: "MIN(민)은 가장 작은 값, MAX(맥스)는 가장 큰 값이에요. 아래처럼 물건 40가지 중 가장 싼 값 5엽전과 가장 비싼 값 400엽전이 한 행에 나와요. 둘을 쉼표로 나란히 놓았어요.",
        sql: "SELECT MIN(price) AS lowest,\n  MAX(price) AS highest\nFROM items",
      },
      {
        say: "이 장터의 날짜는 연-월-일 차례로 적은 글자라, MIN이 가장 이른 날, MAX가 가장 늦은 날이에요. 아래는 주문 장부의 처음과 끝 날짜예요. MIN·MAX도 빈칸은 건너뛰어요.",
        sql: "SELECT MIN(ordered_on) AS first_day,\n  MAX(ordered_on) AS last_day\nFROM orders",
      },
    ],
    items: [
      {
        type: "choice", concept: "minmax",
        q: "MIN(price)는 무엇을 보여 줄까요?",
        options: ["가장 싼 값", "가장 싼 물건의 이름", "값이 적힌 물건의 수"],
        answer: 0,
        explain: "MIN은 그 열에서 가장 작은 값 하나를 보여 줘요. 값 5엽전이 나오고, 그 물건의 이름은 나오지 않아요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "뚝딱 공방(8번 가게)에서, 이 SQL의 결과 값은?",
        code: "SELECT MAX(price)\nFROM items\nWHERE shop_id = 8",
        options: ["350", "130", "1100"],
        answer: 0,
        explain: "8번 가게에서 가장 비싼 장승이 350엽전이에요. 130은 가장 싼 빨래방망이, 1100은 값 합이에요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "재고 칸이 빈 물건도 있어요. 이 SQL의 결과 값은?",
        code: "SELECT MIN(stock)\nFROM items",
        options: ["0", "NULL", "2"],
        answer: 0,
        explain: "MIN은 빈칸 3가지를 건너뛰고 적힌 값 중 가장 작은 짚신의 0을 내요. 0은 아는 값이라 빠지지 않아요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT MIN(age)\nFROM customers",
        options: ["8", "NULL", "75"],
        answer: 0,
        explain: "나이를 아는 55명 중 가장 어린 산돌이의 8이에요. 나이 모르는 5명은 건너뛰어요. 75는 MAX예요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT MIN(ordered_on)\nFROM orders",
        options: ["2026-01-14", "2026-12-28", "591"],
        answer: 0,
        explain: "장부에서 가장 이른 주문 날짜예요. 2026-12-28은 MAX, 591은 주문 건수예요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "이 장터에서 날짜 열에 MIN을 쓰면 가장 이른 날이 나오는 까닭은?",
        options: [
          "날짜가 연-월-일 차례로 적은 글자라, 글자 차례가 날짜 차례와 같아서",
          "MIN은 날짜만 따로 알아보는 함수라서",
          "주문이 날짜 차례로 저장되어 있어서",
        ],
        answer: 0,
        explain: "글자는 앞에서부터 견줘요. 2026-01이 2026-12보다 앞이라 이른 날이 작은 값이에요. 행이 저장된 차례와는 상관없어요.",
      },
      {
        type: "blank", concept: "minmax",
        q: "가장 나이 많은 도깨비 손님의 나이가 나오게 빈자리를 채워 보세요.",
        code: "SELECT ___(age) AS oldest\nFROM customers\nWHERE kind = '도깨비'",
        chips: ["MAX", "MIN", "COUNT"],
        answer: 0,
        explain: "가장 큰 값은 MAX, 73살이에요. MIN이면 가장 어린 8살, COUNT면 나이를 아는 도깨비 23명이에요.",
      },
      {
        type: "order", concept: "minmax",
        q: "산삼 약방(3번 가게)의 가장 싼 값과 비싼 값을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT MIN(price) AS lowest,", "MAX(price) AS highest", "FROM items", "WHERE shop_id = 3"],
        expect: "lowest | highest\n12 | 120",
        explain: "MIN과 MAX를 쉼표로 이어 한 SELECT에 놓았어요. 3번 가게 물건은 12엽전부터 120엽전까지예요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "산삼 약방(3번 가게)에서 가장 비싼 물건 값을 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT MAX(price)\nFROM items\nWHERE shop_id = 3" },
          { sql: "SELECT MIN(price)\nFROM items\nWHERE shop_id = 3" },
          { sql: "SELECT MAX(price)\nFROM items" },
        ],
        answer: 0, tables: ["items"],
        explain: "120인 표가 정답이에요. MIN이면 가장 싼 12, WHERE가 없으면 장터 전체에서 가장 비싼 400이에요.",
      },
      {
        id: "7-3-b1", type: "build", concept: "minmax",
        q: "가장 싼 물건 값과 가장 비싼 물건 값을 lowest, highest라는 이름으로 보여 줘",
        cards: ["SELECT", "MIN(price)", "AS lowest", ",", "MAX(price)", "AS highest", "FROM", "items"],
        extra: ["MIN(stock)", "AVG(price)"],
        tables: ["items"],
        hints: [
          "값 열에서 가장 작은 값과 가장 큰 값을 쉼표로 나란히 놓고, 저마다 이름을 붙여요.",
          "MIN(price) AS lowest, 쉼표, MAX(price) AS highest 차례로 놓아요.",
        ],
        explain: "5엽전과 400엽전이 한 행에 나왔어요. MIN(stock)이면 재고 중 가장 작은 0이 나와요. 무엇의 가장 작은 값인지 괄호 안을 잘 봤네요!",
      },
      {
        id: "7-3-b2", type: "build", concept: "minmax",
        q: "취소된 주문 중 가장 이른 주문 날짜를 first_cancel이라는 이름으로 보여 줘",
        cards: ["SELECT", "MIN(ordered_on)", "AS first_cancel", "FROM", "orders", "WHERE", "status = '취소'"],
        extra: ["MAX(ordered_on)", "status = '완료'"],
        tables: ["orders"],
        hints: [
          "취소된 주문만 남기고, 주문 날짜 중 가장 이른 날을 골라 이름을 붙여요.",
          "SELECT 다음에 MIN(ordered_on)과 AS first_cancel을, WHERE 다음에 status = '취소'를 놓아요.",
        ],
        explain: "2026-01-22예요. 완료된 주문까지 보면 가장 이른 날은 2026-01-14라, WHERE가 먼저 걸러야 해요.",
      },
      {
        type: "check", concept: "minmax",
        q: "MIN과 MAX에 대해 맞는 말은?",
        options: [
          "가장 작은 값과 큰 값을 보여 주고, 빈칸은 건너뛴다",
          "빈칸을 가장 작은 값으로 친다",
          "숫자 열에만 쓸 수 있다",
        ],
        answer: 0,
        explain: "MIN·MAX는 값이 적힌 칸만 견줘요. 이 장터의 날짜 글자에도 쓸 수 있어서 처음과 끝 날을 찾았어요.",
      },
    ],
  },
  {
    id: "7-4", chapter: 7, title: "모아 세기의 규칙",
    goal: "모아 세기에 계산을 넣고, 쓸 수 없는 자리를 안다",
    summary: [
      "SUM(price * stock)처럼 계산도 모아요",
      "WHERE 안에는 모아 세기를 못 써요",
      "이름과 함께 보려면 줄 세워 하나만",
    ],
    cards: [
      {
        say: "모아 세기 괄호 안에 2장의 계산도 넣을 수 있어요. 구름 잡화점 물건의 값 × 재고를 다 더하면 1900엽전! 재고 칸이 빈 한지는 건너뛰었어요. 함수를 여럿 놓아도 결과는 1행이에요.",
        sql: "SELECT COUNT(*) AS item_count,\n  SUM(price * stock)\n    AS stock_value\nFROM items\nWHERE shop_id = 5",
      },
      {
        say: "가장 비싼 물건 이름은? WHERE 안에 MAX를 넣으면 오류예요. WHERE는 모으기 전에 행을 하나씩 거르니까요. 이름 열 옆에 MAX를 놓는 것도 많은 데이터베이스에서 오류라, 5장처럼 줄 세워 찾아요.",
        sql: "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT 1",
      },
    ],
    items: [
      {
        type: "choice", concept: "count",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT COUNT(*),\n  MIN(price), MAX(price)\nFROM items",
        options: ["1행", "3행", "40행"],
        answer: 0,
        explain: "모아 세는 함수를 셋 놓아도 열이 3개일 뿐, 결과는 1행이에요. 40, 5, 400이 한 행에 나와요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "여우골 떡방(2번 가게)에서, 이 SQL의 결과 값은?",
        code: "SELECT SUM(price * stock)\nFROM items\nWHERE shop_id = 2",
        options: ["890", "35", "128"],
        answer: 0,
        explain: "물건마다 값 × 재고를 셈한 뒤 다 더해 890엽전이에요. 35는 값 합, 128은 재고 합이에요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "구름 잡화점의 SUM(price * stock)이 NULL이 아니라 1900인 까닭은?",
        options: [
          "한지 행의 셈은 NULL이지만, SUM이 그 칸을 건너뛰어서",
          "SUM이 한지의 재고를 0으로 바꿔 장부에 적어서",
          "한지는 값(price)도 빈칸이라 처음부터 빠져서",
        ],
        answer: 0,
        explain: "한지 행의 6 × NULL은 NULL이에요. SUM은 그 칸을 건너뛰고 나머지 넷을 더해요. 장부의 빈칸은 그대로예요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "가장 비싼 물건 이름을 찾으려는 이 SQL은 어떻게 될까요?",
        code: "SELECT name\nFROM items\nWHERE price = MAX(price)",
        options: ["오류가 난다", "금방망이 하나가 나온다", "물건 40가지가 모두 나온다"],
        answer: 0,
        explain: "WHERE 안에는 모아 세는 함수를 쓸 수 없어 오류가 나요. 금방망이는 줄 세우기로 찾아요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "WHERE 안에 MAX 같은 모아 세기를 쓸 수 없는 까닭은?",
        options: [
          "WHERE는 모으기 전에 행을 하나씩 거르는 단계라서",
          "MAX는 숫자 열에만 쓸 수 있어서",
          "WHERE 안에는 = 를 쓸 수 없어서",
        ],
        answer: 0,
        explain: "WHERE가 행을 거른 다음에 모아 세요. 거르는 동안은 아직 모은 값이 없어요. 모은 뒤에 거르는 HAVING은 8장에서 배워요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "SELECT name, MAX(price) FROM items 처럼 이름 열 옆에 MAX를 놓으면?",
        options: [
          "이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않는다",
          "어느 데이터베이스에서나 가장 비싼 물건 이름이 나온다",
          "물건 40가지의 이름이 모두 나온다",
        ],
        answer: 0,
        explain: "모아 세기는 행을 하나로 모으는데, 이름은 40개라 어느 이름을 붙일지 정해지지 않아요. 표준 SQL에서는 오류예요. 이름은 줄 세워 찾아요.",
      },
      {
        type: "blank", concept: "minmax",
        q: "가장 비싼 물건의 이름과 값이 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nORDER BY price ___, item_id\nLIMIT 1",
        chips: ["DESC", "ASC", "MAX"],
        answer: 0,
        explain: "비싼 것부터 세우고 하나만 남기면 금방망이 400엽전이에요. ASC면 가장 싼 식혜가, MAX를 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "count",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT COUNT(DISTINCT customer_id)\nFROM orders",
        options: ["57", "591", "60"],
        answer: 0,
        explain: "주문은 591건이지만 한 손님이 여러 번 주문했어요. 겹친 손님을 한 번씩만 세면 57명이에요.",
      },
      {
        type: "choice", concept: "count",
        q: "손님은 60명인데 주문한 손님은 57명이에요. 나머지 3명은?",
        options: ["아직 한 번도 주문하지 않았다", "나이를 모르는 손님이다", "주문이 모두 취소됐다"],
        answer: 0,
        explain: "주문 표에 한 번도 나오지 않는 손님이에요. 취소된 주문도 주문 표에 남아서 세어져요. 이런 손님은 11장에서 찾아요.",
      },
      {
        type: "order", concept: "sumavg",
        q: "도깨비 국밥집(1번 가게)의 물건 수와 재고 값어치 합을 보게 줄을 놓아 보세요.",
        lines: ["SELECT COUNT(*) AS item_count,", "SUM(price * stock) AS stock_value", "FROM items", "WHERE shop_id = 1"],
        expect: "item_count | stock_value\n5 | 1464",
        explain: "물건은 5가지, 값어치 합은 1464엽전이에요. 재고 칸이 빈 메밀전은 SUM에서 건너뛰고, COUNT(*)에는 세어져요.",
      },
      {
        id: "7-4-b1", type: "build", concept: "count",
        q: "주문을 취소한 적 있는 손님 수를 겹치지 않게 cancel_customers라는 이름으로 세어 줘",
        cards: ["SELECT", "COUNT(DISTINCT customer_id)", "AS cancel_customers", "FROM", "orders", "WHERE", "status = '취소'"],
        extra: ["COUNT(customer_id)", "status = '완료'"],
        tables: ["orders"],
        hints: [
          "취소된 주문만 남기고, 손님 번호를 겹치지 않게 세어 이름을 붙여요.",
          "SELECT 다음에 COUNT(DISTINCT customer_id)와 AS cancel_customers를 놓아요.",
        ],
        explain: "28명이에요. 취소는 49건이지만 두 번 이상 취소한 손님이 있어서 DISTINCT가 겹침을 뺐어요. COUNT(customer_id)였다면 49예요.",
      },
      {
        id: "7-4-b2", type: "build", concept: "sumavg",
        q: "뚝딱 공방(8번 가게) 물건의 값 × 재고를 모두 더해 stock_value라는 이름으로 보여 줘",
        cards: ["SELECT", "SUM(price * stock)", "AS stock_value", "FROM", "items", "WHERE", "shop_id = 8"],
        extra: ["AVG(price * stock)", "SUM(price)"],
        tables: ["items"],
        hints: [
          "8번 가게 물건만 남기고, 물건마다 값과 재고를 곱한 것을 모두 더해 이름을 붙여요.",
          "SELECT 다음에 SUM(price * stock)과 AS stock_value를, WHERE 다음에 shop_id = 8을 놓아요.",
        ],
        explain: "15620엽전이에요. 재고 칸이 빈 장승은 건너뛰었어요. AVG였다면 남은 넷의 평균 3905, SUM(price)였다면 값 합 1100이에요.",
      },
      {
        type: "check", concept: "minmax",
        q: "모아 세기의 규칙으로 맞는 말은?",
        options: [
          "괄호 안에 계산을 넣을 수 있고, WHERE 안에는 쓸 수 없다",
          "WHERE 안에 MAX를 넣어 가장 비싼 물건을 고를 수 있다",
          "함수를 여럿 놓으면 결과가 여러 행이 된다",
        ],
        answer: 0,
        explain: "SUM(price * stock)처럼 계산을 모을 수 있어요. 하지만 WHERE는 모으기 전 단계라 쓸 수 없고, 결과는 늘 1행이에요.",
      },
    ],
  },
  {
    id: "7-5", chapter: 7, title: "7장 평가", isExam: true,
    goal: "COUNT·SUM·AVG·MIN·MAX로 표를 모아 셀 수 있다",
    summary: [
      "COUNT 세기, SUM 더하기, AVG 평균",
      "MIN·MAX 가장 작은·큰 값, 결과는 1행",
      "COUNT(*) 말고는 빈칸을 건너뛰어요",
    ],
    cards: [
      {
        say: "7장 정리! COUNT로 세고, SUM으로 더하고, AVG로 평균, MIN·MAX로 가장 작고 큰 값을 봤어요. COUNT(*) 말고는 빈칸을 건너뛰고 결과는 1행이에요. 같이 풀어 봐요!",
        sql: "SELECT COUNT(*) AS line_count,\n  SUM(qty) AS total_qty,\n  MIN(qty) AS min_qty,\n  MAX(qty) AS max_qty\nFROM order_items",
      },
    ],
    items: [
      {
        type: "choice", concept: "count",
        q: "물건 표에서 COUNT(*)는 40, COUNT(stock)은 37이에요. 맞는 말은?",
        options: [
          "재고 칸이 빈 물건 3가지가 COUNT(stock)에서 빠졌다",
          "재고가 0인 물건 3가지가 빠졌다",
          "COUNT(*)가 빈칸을 두 번 셌다",
        ],
        answer: 0,
        explain: "COUNT(열)은 빈칸을 세지 않아요. 재고 0인 짚신은 아는 값이라 COUNT(stock)에도 세어져요.",
      },
      {
        type: "choice", concept: "count",
        q: "100엽전 넘는 물건 수, 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*)\nFROM items\nWHERE price > 100",
        options: ["12", "40", "1"],
        answer: 0,
        explain: "WHERE가 100엽전 넘는 물건 12가지를 남기고 COUNT가 세요. 40은 물건 전부예요. 1은 결과의 행 수라 값과 달라요.",
      },
      {
        type: "choice", concept: "count",
        q: "손님이 사는 마을이 몇 곳인지 센 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT COUNT(DISTINCT village)\nFROM customers" },
          { sql: "SELECT COUNT(village)\nFROM customers" },
          { sql: "SELECT COUNT(DISTINCT kind)\nFROM customers" },
        ],
        answer: 0,
        explain: "겹친 마을을 한 번씩 센 8이 정답이에요. DISTINCT가 없으면 60, kind를 세면 손님 종류 3이에요.",
      },
      {
        type: "blank", concept: "sumavg",
        q: "달빛 약초방(4번 가게) 물건 값의 평균이 나오게 빈자리를 채워 보세요.",
        code: "SELECT ___(price) AS avg_price\nFROM items\nWHERE shop_id = 4",
        chips: ["AVG", "SUM", "MAX"],
        answer: 0,
        explain: "평균은 AVG, 23.2엽전이에요. SUM이면 합 116, MAX면 가장 비싼 35예요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "뚝딱 공방(8번 가게)의 장승은 재고 칸이 빈칸이에요. 이 SQL의 결과 값은?",
        code: "SELECT SUM(stock)\nFROM items\nWHERE shop_id = 8",
        options: ["82", "NULL", "5"],
        answer: 0,
        explain: "SUM은 장승의 빈칸을 건너뛰고 나머지 넷을 더해 82예요. 5는 물건 수예요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "AVG(age)가 나이 합을 60이 아니라 55로 나누는 까닭은?",
        options: [
          "AVG는 빈칸을 빼고, 나이가 적힌 55명으로 나눠서",
          "손님이 원래 55명이라서",
          "나이가 60 넘는 손님을 빼서",
        ],
        answer: 0,
        explain: "손님은 60명이지만 나이 모르는 5명은 AVG가 세지 않아요. 그래서 2349 ÷ 55, 약 42.7이에요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "주문된 수량 합 SUM(qty) 1882가 장터 매출(엽전)과 다른 까닭은?",
        options: [
          "값(price)을 곱하지 않았고, 취소된 주문까지 들어 있어서",
          "SUM이 빈칸을 세서",
          "qty가 엽전 단위라서",
        ],
        answer: 0,
        explain: "1882는 물건 개수예요. 매출은 수량 × 값을 완료된 주문만 더해야 해서 items·orders 표를 이어야 해요. 10장에서 완성해요!",
      },
      {
        type: "choice", concept: "minmax",
        q: "이 SQL의 결과 값은 무엇일까요?",
        code: "SELECT MAX(ordered_on)\nFROM orders",
        options: ["2026-12-28", "2026-01-14", "591"],
        answer: 0,
        explain: "가장 늦은 주문 날짜예요. 이 장터의 날짜는 연-월-일 글자라 MAX가 가장 늦은 날이에요. 2026-01-14는 MIN이에요.",
      },
      {
        type: "choice", concept: "minmax",
        q: "재고 칸이 빈 물건도 있어요. 이 SQL의 결과 값은?",
        code: "SELECT MIN(stock)\nFROM items",
        options: ["0", "NULL", "58"],
        answer: 0,
        explain: "빈칸은 건너뛰고, 적힌 값 중 가장 작은 짚신의 0이에요. 58은 가장 많은 재고, MAX예요.",
      },
      {
        type: "choice", concept: "sumavg",
        q: "평균보다 나이 많은 손님을 세려는 이 SQL은 어떻게 될까요?",
        code: "SELECT COUNT(*)\nFROM customers\nWHERE age > AVG(age)",
        options: ["오류가 난다", "평균보다 나이 많은 손님 수가 나온다", "0이 나온다"],
        answer: 0,
        explain: "WHERE는 모으기 전 단계라 AVG를 쓸 수 없어 오류예요. 평균과 견주는 법은 12장 「질문 속 질문」에서 배워요.",
      },
      {
        type: "order", concept: "minmax",
        q: "사람 손님 중 가장 어린 나이와 많은 나이를 보게 줄을 놓아 보세요.",
        lines: ["SELECT MIN(age) AS youngest,", "MAX(age) AS oldest", "FROM customers", "WHERE kind = '사람'"],
        expect: "youngest | oldest\n9 | 75",
        explain: "사람 손님은 9살부터 75살까지예요. 나이 모르는 4명은 MIN·MAX가 건너뛰어요.",
      },
      {
        id: "7-5-b1", type: "build", concept: "sumavg",
        q: "장터 전체 매출의 첫걸음, 주문된 수량을 total_qty라는 이름으로 모두 더해 줘",
        cards: ["SELECT", "SUM(qty)", "AS total_qty", "FROM", "order_items"],
        extra: ["COUNT(*)", "MAX(qty)", "orders"],
        tables: ["order_items"],
        hints: [
          "주문 내역 표의 수량 열을 모두 더하고, 그 열에 이름을 붙여요.",
          "SELECT 다음에 SUM(qty)와 AS total_qty를 놓아요.",
        ],
        explain: "7장의 대표 문제, 1882개를 다시 구했어요! COUNT(*)면 내역 행 수 1241이에요. 엽전 매출은 10장에서 표를 이어 완성해요.",
      },
      {
        id: "7-5-b2", type: "build", concept: "count",
        q: "도깨비 손님 중 나이를 아는 손님 수를 known_age라는 이름으로 세어 줘",
        cards: ["SELECT", "COUNT(age)", "AS known_age", "FROM", "customers", "WHERE", "kind = '도깨비'"],
        extra: ["COUNT(*)", "kind = '사람'"],
        tables: ["customers"],
        hints: [
          "도깨비 손님만 남기고, 나이 칸에 값이 있는 행만 세어요.",
          "SELECT 다음에 COUNT(age)와 AS known_age를, WHERE 다음에 kind = '도깨비'를 놓아요.",
        ],
        explain: "도깨비 손님 24명 중 나이 모르는 돌쇠가 빠져 23명이에요. COUNT(*)였다면 24예요!",
      },
      {
        id: "7-5-b3", type: "build", concept: "minmax",
        q: "여우 손님 중 가장 나이 많은 손님의 나이를 oldest라는 이름으로 보여 줘",
        cards: ["SELECT", "MAX(age)", "AS oldest", "FROM", "customers", "WHERE", "kind = '여우'"],
        extra: ["MIN(age)", "kind = '사람'"],
        tables: ["customers"],
        hints: [
          "여우 손님만 남기고, 나이 중 가장 큰 값을 골라 이름을 붙여요.",
          "SELECT 다음에 MAX(age)와 AS oldest를, WHERE 다음에 kind = '여우'를 놓아요.",
        ],
        explain: "59살이에요. MIN이면 가장 어린 13살, 사람 손님이면 75살이에요. WHERE가 먼저 거르고 MAX가 골라요.",
      },
      {
        type: "check", concept: "count",
        q: "7장에서 배운 것으로 맞는 말은?",
        options: [
          "모아 세기는 결과가 1행이고, COUNT(*) 말고는 빈칸을 건너뛴다",
          "AVG는 빈칸을 0으로 쳐서 평균을 낸다",
          "WHERE 안에 SUM을 넣어 행을 거를 수 있다",
        ],
        answer: 0,
        explain: "세고, 더하고, 평균 내고, 가장 작고 큰 값을 봤어요. 실무에서는 쇼핑몰의 주문 내역 표를 이렇게 모아 「오늘 몇 건, 몇 개 팔렸나」 같은 판매 요약을 만들어요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 7장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - K: 손님 종류 3가지(도깨비 24·사람 24·여우 12명). 손님 전체 60명, 이름 목록(여러 행)과 늘 다르다.
// - S: 가게 1~8. 가게마다 물건 5가지라 SUM은 AVG의 5배이고 MAX와도 다르다(값이 0인 물건 없음).
//   가게마다 MIN·MAX(price)와 MIN·MAX(stock)이 다르고, 장터 전체 5·400과도 다르다(확인함).
// - 7-T4: 나이를 아는 손님 수와 평균. 종류를 걸러낸 것과 손님 전체(55명, 42.7091)는 늘 다르다.
export const TEMPLATES = [
  {
    id: "7-T1", concept: "count", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT COUNT(*)\nFROM customers\nWHERE kind = '{K}'",
    wrong: [
      "SELECT COUNT(*)\nFROM customers",
      "SELECT name\nFROM customers\nWHERE kind = '{K}'",
    ],
    vars: { K: ["도깨비", "사람", "여우"] },
    explain: "WHERE가 {K} 손님만 남기고 COUNT(*)가 그 행을 세어 숫자 하나가 나와요. COUNT가 없으면 이름이 여러 행으로 나와요.",
  },
  {
    id: "7-T2", concept: "sumavg", type: "blank",
    q: "{S}번 가게 물건 값의 합이 나오게 빈자리를 채워 보세요.",
    sql: "SELECT ___(price) AS total_price\nFROM items\nWHERE shop_id = {S}",
    chips: ["SUM", "AVG", "MAX"],
    answer: 0,
    vars: { S: { min: 1, max: 8 } },
    explain: "값을 모두 더하는 건 SUM이에요. AVG는 평균, MAX는 가장 비싼 값이에요.",
  },
  {
    id: "7-T3", concept: "minmax", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT MIN(price), MAX(price)\nFROM items\nWHERE shop_id = {S}",
    wrong: [
      "SELECT MIN(price), MAX(price)\nFROM items",
      "SELECT MIN(stock), MAX(stock)\nFROM items\nWHERE shop_id = {S}",
    ],
    vars: { S: { min: 1, max: 8 } },
    explain: "WHERE가 {S}번 가게 물건만 남기고, MIN·MAX가 그중 가장 싼 값과 비싼 값을 한 행에 보여 줘요.",
  },
  {
    id: "7-T4", concept: "sumavg", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT COUNT(age), AVG(age)\nFROM customers\nWHERE kind = '{K}'",
    wrong: [
      "SELECT COUNT(age), SUM(age)\nFROM customers\nWHERE kind = '{K}'",
      "SELECT COUNT(age), AVG(age)\nFROM customers",
    ],
    vars: { K: ["도깨비", "사람", "여우"] },
    explain: "COUNT(age)는 나이를 아는 {K} 손님 수, AVG(age)는 그 손님들만으로 낸 평균이에요. 빈칸은 둘 다 건너뛰어요.",
  },
];
