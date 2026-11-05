// 17장 「장터 분석 실전」 (설계 §6: 코호트 재방문율, 함께 산 물건, 종합 문제 / 장터 예: 3월 첫 손님의 재방문율). 과정의 마지막 장.
// 설계의 「함께 산 물건」은 레슨에서 「함께 담긴 물건」으로 쓴다: 짝 셈에 취소 주문도 들어가는데 15장이 「취소된 주문은 산 것이 아니라」고 가르쳤기 때문(검토 2026-11-05).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 17
// 17장은 새 낱말이 없다(data/grammar.js 17: []). 앞 장 낱말만으로 분석한다. 분석 도깨비 묶음(14~17장)의 마지막 장이고, 17-5가 과정 전체의 마지막 평가다.
// - 코호트(무리)의 정의: customers.first_visit(첫 방문일)의 연-월이 같은 손님끼리 한 무리. 주문 없는 손님(2월 임바다·6월 표다솜·9월 돌쇠)도
//   그 달 무리에 든다. 「첫 주문 달」로 나누면 이 셋이 빠진다(2월 무리 5명 → 4명, 재방문율 40 → 50%). 3월 무리는 어느 쪽이든 8명이다.
//   주문이 있는 손님은 first_visit = 첫 주문 날이다(tests/unit/market.test.js 「first_visit equals first order date」).
//   「다시 왔다」 = 첫 방문 달보다 나중 달에 주문이 하나라도 있다. 주문의 연-월 > 첫 방문 연-월(글자 비교, 'YYYY-MM' 꼴이라 차례가 맞음).
//   생성기(tools/gen_market.js)는 「나중 달의 완료 주문」으로 정의하지만, 이 데이터에서는 상태를 따지지 않아도 달마다 같은 수가 나온다
//   (다시 오지 않는 손님은 첫 달에만 주문하고, 다시 오는 손님은 나중 달 완료 주문이 반드시 있음 — 두 정의로 12달 모두 돌려 확인).
//   재방문율 = 다시 온 손님 수 × 100.0 ÷ 무리 크기(9장: 100을 곱하면 이 장터에서는 정수 나눗셈, R36).
// - 확인한 값(data/market.sql, openEngine, SQLite 3.54.0):
//   무리 크기(월 1~12) 6·5·8·5·5·5·5·5·5·4·3·4(합 60), 다시 온 손님 3·2·8·2·2·2·2·2·2·2·1·0
//   → 재방문율 50·40·100·40·40·40·40·40·40·50·33.3·0. 심어 둔 무늬 「3월 첫 손님은 모두 다시 온다」가 보인다(설계 §5-2).
//   12월 무리는 기록이 12월에서 끝나 나중 달이 없다(0%). 11월 무리는 3명뿐이라 한 명이 33.3%다.
//   3월 무리(12~19번): 털북이·덜렁이·남이슬·허허실실·초롱·소란이·황소담·푸짐이 — 8명 모두 4월부터 주문(4월 1일부터의 주문 139건).
//   1월 무리(1~6번): 박서연 28·손지우 0·쇠뭉치 37·여름이 31·어슬렁 0·한가람 0(2월 1일부터의 주문 수). 다시 온 손님 3명 → 50%.
//     2월부터 조건을 ON이 아니라 WHERE에 두면 안 온 셋이 빠져 무리 3명·100%. 손지우(3건)·어슬렁(3건)·한가람(4건)은 1월에만 주문.
//   2월 무리(7~11번): 무쇠·바람돌이·신아람·해랑·임바다(주문 없음) → 3월부터 다시 온 손님 바람돌이·신아람.
//   11월 무리 1/3: × 100.0이면 33.3, × 100이면 33(정수 나눗셈), × 1.0이면 0.3.
//   취소 주문 49/591: ROUND(× 100.0 / COUNT(*), 1) = 8.3, × 100이면 8.
//   가게 8곳 중 120엽전 이상 물건을 파는 가게: 산삼 약방(산삼 120)·방망이 대장간·뚝딱 공방 3곳 → 37.5(× 100이면 37). 100엽전 이상이면 갓(110)의 바람 보따리까지 4곳 → 50.
// - 함께 담긴 물건(장바구니 분석): order_items를 a·b 두 별칭으로 같은 order_id끼리 JOIN(셀프 조인). 취소 주문도 「한 주문에 담긴」 짝으로 센다.
//   a.item_id < b.item_id → 짝마다 한 번(943쌍). <>면 (6, 25)·(25, 6)으로 두 번(1886), 조건 없으면 자기 자신과의 짝 1241까지 3127.
//   주문마다 물건 수 1개 178·2개 232·3개 125·4개 56건. 1번 주문: 인절미(6)·등불(25)·노리개(29) → < 3행, <> 6행, 조건 없음 9행.
//   10번 주문: 수육(2)·비단 주머니(23)·복주머니(28). 12번: 도라지(16)·비단 주머니(23)·노리개(29).
//   많이 함께 담긴 짝: 인삼차(12)·복주머니(28) 9번(하나뿐인 1등), 8번 여섯 짝 인절미-송편·인절미-도라지·인절미-짚신·인삼차-도라지·인삼차-익모초·인삼차-부채,
//   그다음 7번(국밥-인삼차 …) → LIMIT 7이면 동점을 자르지 않는다. 완료 주문만 세면 9번 짝이 없고 인삼차-도라지·인삼차-익모초가 8번 동점이라 취소까지 셌다.
//   그래서 짝 셈·공방 줄 셈은 「산」이 아니라 「담긴」으로 쓰고, 17-3 둘째 카드·「가장 자주 함께 담긴 짝」·공방 객관식·17-4-b1 해설에 「취소된 주문도 셌다」를 밝힌다.
//   인삼차(12번)와 함께 담긴 물건 35가지(인삼차가 든 줄 72). 이때는 짝 상대가 12보다 작은 것(국밥·수육·인절미 …)도 있어 <> 12를 쓴다(< 12면 10가지만).
//   복주머니(28번)와 함께 담긴 물건: 인삼차 9·인절미 7 ….
// - 숨은 무늬(설계 §5-2) 넷: ① 3월 첫 손님 재방문율 100%(17-2) ② 약재 매출 비중이 6~8월에 높다 ③ 공방은 줄이 적고 한 줄 금액이 크다 ④ 12월에 주문이 몰린다.
//   ② 17-4 첫 카드는 완료 주문 내역의 「줄 수」 비중으로 본다(검토 2026-11-05에 금액 비중에서 바꿈).
//     달마다 줄 수(total) 58·41·50·86·74·85·115·79·77·93·122·253, 약재 줄(herb) 16·12·13·30·25·39·59·37·19·25·40·71
//     → 약재 줄 비중 27.6·29.3·26·34.9·33.8·45.9·51.3·46.8·24.7·26.9·32.8·28.1. 6~8월만 45%를 넘고 나머지 달은 모두 35% 아래, 1위 7월 51.3.
//     약재 줄 수 자체는 12월(71)이 가장 많다 — 12월은 모든 가게가 많이 팔리는 달이라 비중으로 견줘야 여름 무늬가 보인다.
//     금액 비중(완료 매출 3571·…·14036 중 약재 487·…·2417 → 13.6·16.2·22.5·27.9·34.5·34.7·34.9·44.1·15.5·19.7·22.9·17.2)은 5월(34.5)과 6월(34.7)이
//     거의 같고, 8월 1위(44.1)는 8월 전체 매출이 2833으로 줄어든 탓도 커서 「6~8월이 높다」고 말하기 어렵다. 그래서 줄 수 비중을 쓴다.
//     이 카드가 조건 세기 SUM(CASE WHEN … THEN 1 ELSE 0 END)를 처음 보여 준다 → 같은 모양의 취소율 조립(17-4-b3)은 이 카드 뒤에 둔다
//     (예전에는 17-2-b2였는데 카드보다 먼저 나와 쓰기 안내 §4에 어긋났다).
//   ③ 주문 내역(order_items, 취소 주문의 줄도 포함) 가게 종류마다 줄 수·한 줄 평균 금액: 공방 113줄 249.6, 약재 424줄 36.5, 잡화 309줄 44.3, 먹거리 395줄 16.9.
//     가게마다(i.shop_id): 1번 209줄 22.48, 2번 186줄 10.63, 3번 203줄 42.50, 4번 221줄 30.95, 5번 175줄 25.10, 6번 134줄 69.33, 7번 60줄 276.5, 8번 53줄 219.06.
//     완료 주문만이어도 공방 100줄 244.7, 먹거리 366줄 17.0로 같은 무늬.
//   ④ 달마다 주문 수 29·23·30·48·39·45·59·47·39·47·61·124(16장 머리 주석과 같음).
// - 중앙값(설계 §6 면접 유형): 줄 세운 번호(ROW_NUMBER) rn과 행 전체 수 cnt로 rn BETWEEN cnt / 2.0 AND cnt / 2.0 + 1 인 행의 AVG.
//   행 수가 짝수(12)면 6·7번째 두 행(6 ≤ rn ≤ 7), 홀수(5)면 3번째 한 행(2.5 ≤ rn ≤ 3.5). 2.0으로 나눠야 정수 나눗셈(이 장터에서는 버림)을 피한다.
//   cnt는 COUNT(*) OVER ()로 붙인다. OVER 괄호가 비면 남은 행 전체가 한 무리다(PARTITION BY가 없는 창). 17-4 둘째 카드에서 처음 보여 준다
//   (새 낱말은 없음: COUNT 7장, OVER 14장). WHERE로 거른 뒤의 행만 세어 서브쿼리에 같은 조건을 다시 적지 않아도 된다.
//   여우 12명 나이(나이 차례, 같으면 customer_id): 은호 13·해랑 18·단비 34·미르 35·백설 36·구미 38·솔아 41·여름이 42·초롱 42·하연 43·보람 59·연화 59
//     → 중앙값 (38 + 41) / 2 = 39.5, 평균 38.3333. rn = cnt / 2만 고르면 38. ORDER BY customer_id로 번호를 매기면 다른 값.
//   3번 가게 값 12·22·25·30·120 → 중앙값 25(평균 41.8). / 2(정수)면 2 ≤ rn ≤ 3.5 → (22 + 25) / 2 = 23.5, / 1.0이면 5 ≤ rn ≤ 3.5 → 빈칸.
//   먹거리 가게(1·2번) 값 5·6·7·8·8·9·9·10·12·25 → 중앙값 (8 + 9) / 2 = 8.5(평균 9.9). item_id 차례로 번호를 매기면 7.5.
//   나이 아는 손님 55명(홀수) 중앙값 42(28번째), 평균 42.7091.
// - 장터 예 「3월 첫 손님의 재방문율」(17-2 첫 카드·17-5 카드, 객관식·빈자리): customers c LEFT JOIN orders o ON 손님 짝 AND 4월 1일부터,
//   WHERE c.first_visit LIKE '2026-03%' → cohort 8, back 8, rate 100. 판정 R47: 정답 카드가 13장이라 더미 12장(정답 10장)에 들어가지 않는다
//   (「ON o.customer_id = c.customer_id」가 32칸이라 ON과 조건 두 장, 「AND o.ordered_on >= '2026-04-01'」도 32칸).
//   또 3월 무리는 모두 다시 와서 「4월부터」 카드를 빼도 100%라 조립 정답으로 쓸 수 없다(drop-one). 그래서
//   ⓐ 같은 뼈대(LEFT JOIN + ON의 AND 조건 + COUNT(DISTINCT) 두 개 × 100.0 ÷)의 조립을 작은 표로 둔다: 「가게 8곳 중 120엽전 이상 물건을 파는 가게 비율」(17-2-b1).
//   ⓑ 다시 온 손님 찾기(분자)는 다시 안 온 손님이 있는 1월·2월 무리로 조립한다(17-1-b2·17-5-b1). ON 안의 날짜는 o. 없이
//      「AND ordered_on >= '2026-02-01'」(30칸)로 적는다(ordered_on은 orders에만 있어 헷갈리지 않음).
// - 덩어리 카드(R47): 창 함수가 든 중앙값 조립은 「WITH r AS (SELECT age,」 … 「WHERE kind = '여우')」로 중간 표를 열고 닫고,
//   바깥은 「SELECT AVG(age) AS median」·「FROM r」·「WHERE rn BETWEEN cnt / 2.0」·「AND cnt / 2.0 + 1」 덩어리로 둔다(14장 「SELECT * FROM ranked」와 같은 꼴).
//   창 함수 없는 조립은 SELECT·FROM·WHERE를 한 장씩 둔다.
//   17-4-b2·17-5-b3의 「AS rn, COUNT(*) OVER () AS cnt」 카드는 중간 표의 SELECT 열 목록 가운데에서 나뉜다(앞 카드 「(ORDER BY age, customer_id)」의
//   창 함수 별칭과 다음 열이 한 장). 한 장 30칸·더미 12장(R47) 안에 넣으려고 받아들인 나눔이다(검토 2026-11-05).
// - 17-2-b2(검토 2026-11-05에 바꿈): 물건 40가지 중 한 번에 3개 이상 담긴 적 있는 물건 비율 = 28 × 100.0 ÷ 40 = 70(취소 주문의 줄도 셈).
//   17-2-b1과 같은 뼈대(LEFT JOIN + ON의 AND 조건 + COUNT(DISTINCT) 두 개). AND oi.qty < 3이나 조건 없이는 95, DISTINCT 없이 줄을 세면 357.5.
//   * 100 /은 28 × 100 / 40 = 70으로 나눠떨어져 정답과 같아지므로 헷갈림 카드로 쓰지 않는다.
export const CHAPTER = { id: 17, title: "장터 분석 실전" };

// 17-1 카드
const COHORT_SIZE = "SELECT strftime('%Y-%m', first_visit)\n    AS cohort,\n  COUNT(*) AS size\nFROM customers\nGROUP BY cohort\nORDER BY cohort";
const JAN_LATER = "SELECT c.customer_id, c.name,\n  COUNT(o.order_id) AS later\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id\n  AND o.ordered_on >= '2026-02-01'\nWHERE c.first_visit LIKE '2026-01%'\nGROUP BY c.customer_id, c.name\nORDER BY c.customer_id";
// 장터 예 「3월 첫 손님의 재방문율」 (17-2 첫 카드·17-5 카드)
const MARKET = "SELECT\n  COUNT(DISTINCT c.customer_id)\n    AS cohort,\n  COUNT(DISTINCT o.customer_id)\n    AS back,\n  ROUND(COUNT(DISTINCT o.customer_id)\n    * 100.0\n    / COUNT(DISTINCT c.customer_id),\n    1) AS rate\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id\n  AND o.ordered_on >= '2026-04-01'\nWHERE c.first_visit LIKE '2026-03%'";
// 17-2 둘째 카드: 무리마다 재방문율
const ALL_COHORTS = "SELECT\n  strftime('%Y-%m', c.first_visit)\n    AS cohort,\n  COUNT(DISTINCT c.customer_id)\n    AS size,\n  COUNT(DISTINCT o.customer_id)\n    AS back,\n  ROUND(COUNT(DISTINCT o.customer_id)\n    * 100.0\n    / COUNT(DISTINCT c.customer_id),\n    1) AS rate\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id\n  AND strftime('%Y-%m', o.ordered_on)\n    > strftime('%Y-%m', c.first_visit)\nGROUP BY cohort\nORDER BY cohort";
// 한 무리의 재방문율(빈자리 문제용): 1월·11월
const rateOf = (mm, next, join = "LEFT JOIN", mul = "100.0") =>
  `SELECT\n  ROUND(COUNT(DISTINCT o.customer_id)\n    * ${mul}\n    / COUNT(DISTINCT c.customer_id),\n    1) AS rate\nFROM customers c\n${join} orders o\n  ON o.customer_id = c.customer_id\n  AND o.ordered_on >= '2026-${next}-01'\nWHERE c.first_visit LIKE '2026-${mm}%'`;
// 17-3 카드
const PAIRS_ONE = "SELECT a.item_id AS a_id,\n  b.item_id AS b_id\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id < b.item_id\nWHERE a.order_id = 1\nORDER BY a_id, b_id";
const TOP_PAIRS = "WITH p AS (\n  SELECT a.item_id AS a_id,\n    b.item_id AS b_id,\n    COUNT(*) AS n\n  FROM order_items a\n  JOIN order_items b\n    ON b.order_id = a.order_id\n    AND a.item_id < b.item_id\n  GROUP BY a.item_id, b.item_id)\nSELECT x.name AS item_a,\n  y.name AS item_b, p.n\nFROM p\nJOIN items x ON x.item_id = p.a_id\nJOIN items y ON y.item_id = p.b_id\nORDER BY p.n DESC, p.a_id, p.b_id\nLIMIT 7";
const pairCount = (op) => `SELECT COUNT(*) AS pairs\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id ${op} b.item_id`;
// 17-4 카드
const HERB = "WITH m AS (\n  SELECT strftime('%m', o.ordered_on)\n      AS month,\n    COUNT(*) AS total,\n    SUM(CASE WHEN s.category = '약재'\n      THEN 1 ELSE 0 END) AS herb\n  FROM orders o\n  JOIN order_items oi\n    ON oi.order_id = o.order_id\n  JOIN items i\n    ON i.item_id = oi.item_id\n  JOIN shops s\n    ON s.shop_id = i.shop_id\n  WHERE o.status = '완료'\n  GROUP BY month)\nSELECT month, total, herb,\n  ROUND(herb * 100.0 / total, 1)\n    AS herb_pct\nFROM m\nORDER BY month";
const MEDIAN_ROWS = "WITH r AS (\n  SELECT name, age,\n    ROW_NUMBER() OVER (\n      ORDER BY age, customer_id)\n      AS rn,\n    COUNT(*) OVER () AS cnt\n  FROM customers\n  WHERE kind = '여우')\nSELECT name, age, rn, cnt\nFROM r\nWHERE rn BETWEEN cnt / 2.0\n  AND cnt / 2.0 + 1\nORDER BY rn";
const medianShop3 = (div) => `WITH r AS (\n  SELECT price,\n    ROW_NUMBER() OVER (\n      ORDER BY price, item_id)\n      AS rn,\n    COUNT(*) OVER () AS cnt\n  FROM items\n  WHERE shop_id = 3)\nSELECT AVG(price) AS median\nFROM r\nWHERE rn BETWEEN cnt / ${div}\n  AND cnt / 2.0 + 1`;

export const LESSONS = [
  {
    id: "17-1", chapter: 17, title: "첫 손님 무리(코호트)",
    goal: "처음 온 달로 손님을 무리 짓고, 나중 달에 다시 왔는지 본다",
    summary: [
      "코호트 = 같은 달에 처음 온 손님 무리",
      "first_visit의 연-월로 무리를 나눠요",
      "나중 달에 주문이 있으면 다시 온 손님",
    ],
    cards: [
      {
        say: "드디어 마지막 장이에요! 분석가들은 같은 달에 처음 온 손님을 한 무리로 묶고 「코호트」라 불러요. 손님 표의 first_visit(첫 방문일)에서 연-월을 뽑아 묶으면 돼요. 3월 무리가 8명으로 가장 크네요.",
        sql: COHORT_SIZE,
      },
      {
        say: "「다시 왔다」는 첫 방문 달보다 나중 달에 주문이 있다는 뜻으로 정해요. 1월 무리 6명에게 2월부터의 주문을 LEFT JOIN으로 붙였어요. 날짜 조건을 ON에 둬서 안 온 손님도 0으로 남아요. 셋은 다시 왔네요!",
        sql: JAN_LATER,
      },
    ],
    items: [
      {
        type: "choice", concept: "cohort",
        q: "이 장에서 말하는 「3월 첫 손님 무리(코호트)」는 누구일까요?",
        options: ["first_visit(첫 방문일)가 2026년 3월인 손님", "3월에 주문한 적이 있는 모든 손님", "주문을 3번 넘게 한 손님"],
        answer: 0,
        explain: "첫 방문일이 3월인 손님끼리 한 무리예요. 3월에 주문한 손님에는 1·2월에 처음 온 손님도 섞여 있어요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "첫 카드의 결과에서 2026-03 무리의 size 값은?",
        code: COHORT_SIZE,
        options: ["8", "5", "60"],
        answer: 0,
        explain: "3월에 처음 온 손님이 8명으로 가장 많아요. 5는 2월·4월 같은 여러 달의 무리 크기, 60은 손님 전체예요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "첫 카드의 SQL 결과는 몇 행일까요?",
        code: COHORT_SIZE,
        options: ["12행", "60행", "8행"],
        answer: 0,
        explain: "2026년 1월부터 12월까지 달마다 처음 온 손님이 있어 무리가 12개예요. 60은 손님 수, 8은 3월 무리의 크기예요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "first_visit가 2026년 3월인 손님만 고르는 조건으로 알맞은 것은?",
        options: ["first_visit LIKE '2026-03%'", "first_visit = '2026-03'", "first_visit LIKE '%03'"],
        answer: 0,
        explain: "'2026-03'으로 시작하는 날짜를 LIKE로 찾아요(4장). = '2026-03'은 날까지 붙은 날짜와 같지 않아 0명, '%03'은 3일로 끝나는 날짜예요.",
      },
      {
        type: "blank", concept: "cohort",
        q: "3월에 처음 온 손님이 몇 명인지 나오게 빈자리를 채워 보세요.",
        code: "SELECT COUNT(*) AS size\nFROM customers\nWHERE first_visit ___ '2026-03%'",
        chips: ["LIKE", "=", ">="],
        answer: 0,
        explain: "% 무늬는 LIKE와 함께 써야 「2026-03으로 시작」이 돼요. 8명이에요. =는 % 글자 그대로 견줘 0명이에요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드에서 「다시 왔다」를 가르는 조건은?",
        options: ["2월 1일부터의 주문이 있다(첫 방문 달보다 나중 달)", "주문이 두 건 넘게 있다", "첫 방문 날 주문했다"],
        answer: 0,
        explain: "1월 무리의 나중 달은 2월부터예요. 첫 달에 여러 번 주문한 것은 「다시 온」 것으로 치지 않아요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드의 결과에서 손지우의 later 값이 0인 까닭은?",
        options: ["1월에만 주문하고 2월부터는 주문이 없어서", "주문을 한 번도 하지 않아서", "LEFT JOIN이 손지우의 주문을 지워서"],
        answer: 0,
        explain: "손지우는 1월에 세 번 주문했지만 2월부터는 없어요. 짝이 없어도 LEFT JOIN이라 손님 행은 남고 COUNT(o.order_id)는 0이에요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드에서 LEFT JOIN을 JOIN으로 바꾸면?",
        options: ["다시 오지 않은 손지우·어슬렁·한가람이 결과에서 빠진다", "결과가 똑같다", "모든 손님의 later가 0이 된다"],
        answer: 0,
        explain: "JOIN은 짝이 있는 행만 남겨요(10장). 다시 안 온 손님이 사라지면 무리 크기를 셀 수 없어요. 그래서 LEFT JOIN이에요(11장).",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드에서 ON의 날짜 조건(2월 1일부터)을 빼면 어떻게 될까요?",
        options: ["1월 주문까지 세어져 손지우도 3이 되어 다시 온 것처럼 보인다", "결과가 똑같다", "오류가 난다"],
        answer: 0,
        explain: "첫 달 주문까지 세면 처음 온 것과 다시 온 것을 가를 수 없어요. 날짜 조건이 「나중 달」을 정해요.",
      },
      {
        type: "order", concept: "cohort",
        q: "3월에 처음 온 손님의 이름과 첫 방문일을 번호 차례로 보게 줄을 놓아 보세요.",
        lines: ["SELECT name, first_visit", "FROM customers", "WHERE first_visit", "LIKE '2026-03%'", "ORDER BY customer_id"],
        explain: "털북이(3월 2일)부터 푸짐이(3월 13일)까지 8명이에요. 이 8명이 3월 무리예요.",
      },
      {
        id: "17-1-b1", type: "build", concept: "cohort",
        q: "처음 온 달마다 손님이 몇 명인지 보여 줘",
        cards: ["SELECT", "strftime('%Y-%m', first_visit)", "AS cohort,", "COUNT(*) AS size", "FROM", "customers", "GROUP BY", "cohort"],
        extra: ["strftime('%m-%d', first_visit)", "COUNT(age) AS size"],
        tables: ["customers"],
        hints: [
          "첫 방문일에서 연-월 조각을 뽑아 이름을 붙이고, 그 이름으로 묶어 세요.",
          "strftime('%Y-%m', first_visit) 다음 AS cohort, COUNT(*) AS size, 그리고 GROUP BY cohort예요.",
        ],
        explain: "무리 12개, 3월이 8명으로 가장 커요. '%m-%d'면 날마다 묶이고, COUNT(age)는 나이가 빈칸인 손님을 빼고 세요.",
      },
      {
        id: "17-1-b2", type: "build", concept: "cohort",
        q: "1월에 처음 온 손님 중 2월부터 다시 주문한 손님을 보여 줘",
        cards: ["SELECT", "DISTINCT c.customer_id, c.name", "FROM", "customers c", "JOIN orders o", "ON", "o.customer_id = c.customer_id", "AND ordered_on >= '2026-02-01'", "WHERE", "c.first_visit LIKE '2026-01%'"],
        extra: ["AND ordered_on < '2026-02-01'", "LEFT JOIN orders o"],
        tables: ["customers", "orders"],
        hints: [
          "1월 무리 손님에게 2월부터의 주문만 짝지어 붙이고, 짝이 있는 손님을 한 번씩 보여요.",
          "JOIN orders o, ON 다음 손님 번호 짝, AND ordered_on >= '2026-02-01', WHERE에 1월 조건이에요.",
        ],
        explain: "박서연·쇠뭉치·여름이 3명이에요. 대표 문제 「3월 첫 손님의 재방문율」에서 다시 온 손님(분자)을 찾는 뼈대예요. 2월 전(< '2026-02-01')이면 첫 달 주문이라 6명, LEFT JOIN이어도 6명이 다 나와요.",
      },
      {
        type: "check", concept: "cohort",
        q: "17-1에서 배운 것으로 맞는 말은?",
        options: [
          "첫 방문 연-월로 손님을 무리 짓고, 나중 달에 주문이 있으면 다시 온 손님으로 센다",
          "3월에 주문한 손님이 모두 3월 무리다",
          "다시 온 손님을 볼 때는 첫 달 주문까지 함께 센다",
        ],
        answer: 0,
        explain: "무리는 처음 온 달로 정하고, 「다시 왔다」는 그보다 나중 달의 주문으로 봐요.",
      },
    ],
  },
  {
    id: "17-2", chapter: 17, title: "다시 온 비율(재방문율)",
    goal: "무리 크기와 다시 온 손님 수로 재방문율을 낸다",
    summary: [
      "재방문율 = 다시 온 수 × 100.0 ÷ 무리",
      "LEFT JOIN, 나중 달 조건은 ON에",
      "손님은 COUNT(DISTINCT)로 한 번씩",
    ],
    cards: [
      {
        say: "17장 대표 문제 「3월 첫 손님의 재방문율」! cohort는 무리 크기, back은 4월부터 짝이 있는 손님 수예요. 한 손님이 여러 번 주문하니 DISTINCT로 한 번씩 세요. 그리고 100.0을 곱해 나누면… 8명 모두 다시 왔어요!",
        sql: MARKET,
      },
      {
        say: "다른 달 무리와 견줘 봐요. 주문 연-월이 첫 방문 연-월보다 크면 나중 달! 12월을 빼면 다른 달은 33.3~50%인데 3월만 100%예요. 장터에 숨은 무늬를 찾았어요. 12월 무리는 다시 올 달이 아직 없어서 0이에요.",
        sql: ALL_COHORTS,
      },
    ],
    items: [
      {
        type: "choice", concept: "cohort",
        q: "재방문율을 내는 식으로 알맞은 것은?",
        options: ["다시 온 손님 수 × 100.0 ÷ 무리 크기", "무리 크기 × 100.0 ÷ 다시 온 손님 수", "다시 온 손님 수 − 무리 크기"],
        answer: 0,
        explain: "무리 가운데 다시 온 몫이라 무리 크기로 나눠요. 거꾸로 나누면 100%를 넘고, 빼기는 비율이 아니에요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "첫 카드의 결과에서 rate 값은?",
        code: MARKET,
        options: ["100", "8", "50"],
        answer: 0,
        explain: "3월 무리 8명이 모두 4월부터 다시 왔어요. 8 × 100.0 ÷ 8 = 100이에요. 8은 cohort·back 값, 50은 1월 무리의 재방문율이에요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "첫 카드에서 back을 COUNT(DISTINCT o.customer_id) 대신 COUNT(o.customer_id)로 세면?",
        options: ["다시 온 손님의 주문마다 세어져 139가 된다", "그대로 8이다", "빈칸만 세어져 0이 된다"],
        answer: 0,
        explain: "LEFT JOIN 결과는 주문마다 한 행이라 4월부터의 주문 139건이 다 세어져요. 손님 수는 DISTINCT로 한 번씩 세요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "1월 무리의 재방문율에서 「2월부터」 조건을 ON이 아니라 WHERE에 두면?",
        options: ["안 온 손님 셋이 빠져 무리가 3명, 재방문율이 100이 된다", "그대로 50이다", "오류가 난다"],
        answer: 0,
        explain: "WHERE는 JOIN한 뒤에 걸러서 짝 없는 행(빈칸)이 다 빠져요(11장). 무리 크기까지 줄어 엉뚱하게 100%가 돼요. 나중 달 조건은 ON에 둬요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드의 결과에서 재방문율이 가장 높은 무리는?",
        options: ["2026-03 (100)", "2026-01 (50)", "2026-11 (33.3)"],
        answer: 0,
        explain: "3월 무리만 8명 모두 다시 왔어요. 12월을 빼면 다른 달은 33.3~50%예요. 이렇게 무리끼리 견줘야 3월이 특별한 게 보여요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드에서 2026-12 무리의 rate가 0인 까닭으로 가장 알맞은 것은?",
        options: ["장터 기록이 12월에서 끝나 다시 올 나중 달이 없어서", "12월 손님은 주문을 한 번도 안 해서", "COUNT가 12월을 세지 못해서"],
        answer: 0,
        explain: "12월 무리 4명도 주문은 했어요. 그런데 2026년 기록 안에 12월보다 나중 달이 없어요. 갓 생긴 무리의 재방문율은 시간이 지나야 보여요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "둘째 카드에서 2026-11 무리의 33.3을 읽을 때 조심할 점은?",
        options: ["무리가 3명뿐이라 한 명만 달라져도 비율이 크게 바뀐다", "33.3은 셈이 틀린 값이다", "11월 손님은 모두 다시 왔다"],
        answer: 0,
        explain: "3명 중 1명이라 33.3%예요. 한 명이 더 왔으면 66.7%가 돼요. 작은 무리의 비율은 크기(size)와 함께 봐요.",
      },
      {
        type: "blank", concept: "cohort",
        q: "1월 무리의 재방문율(50)이 나오게 빈자리를 채워 보세요.",
        code: rateOf("01", "02", "___ JOIN"),
        chips: ["LEFT", "INNER", "UNION"],
        answer: 0,
        explain: "LEFT JOIN이라 다시 안 온 손님도 무리에 남아 6명 중 3명, 50이에요. INNER면 다시 온 3명만 남아 100이에요.",
      },
      {
        type: "blank", concept: "cohort",
        q: "11월 무리의 재방문율이 소수 첫째 자리까지 나오게 빈자리를 채워 보세요.",
        code: rateOf("11", "12", "LEFT JOIN", "___"),
        chips: ["100.0", "100", "1.0"],
        answer: 0,
        explain: "3명 중 1명이라 33.3이에요. 100을 곱하면 이 장터에서는 정수 나눗셈이 되어 33(9장), 1.0이면 백분율이 아닌 0.3이에요.",
      },
      {
        id: "17-2-b1", type: "build", concept: "cohort",
        q: "가게 8곳 중 120엽전 이상인 물건을 파는 가게가 몇 %인지 보여 줘",
        cards: ["SELECT", "COUNT(DISTINCT i.shop_id)", "* 100.0 /", "COUNT(DISTINCT s.shop_id)", "AS rate", "FROM", "shops s", "LEFT JOIN items i", "ON i.shop_id = s.shop_id", "AND i.price >= 120"],
        extra: ["* 100 /", "AND i.price < 120"],
        tables: ["shops", "items"],
        hints: [
          "가게마다 120엽전 이상 물건만 짝지어 붙이고, 짝 있는 가게 수를 전체 가게 수로 나눠요.",
          "LEFT JOIN items i, ON 다음 AND i.price >= 120, 위에는 COUNT(DISTINCT …) 두 개 사이에 * 100.0 /예요.",
        ],
        explain: "산삼 약방·방망이 대장간·뚝딱 공방, 8곳 중 3곳이라 37.5예요. 대표 문제 「3월 첫 손님의 재방문율」과 같은 뼈대예요! * 100이면 이 장터에서는 37, < 120이면 모든 가게라 100이에요.",
      },
      {
        id: "17-2-b2", type: "build", concept: "cohort",
        q: "물건 40가지 중 한 번에 3개 이상 담긴 적 있는 물건이 몇 %인지 보여 줘",
        cards: ["SELECT", "COUNT(DISTINCT oi.item_id)", "* 100.0 /", "COUNT(DISTINCT i.item_id)", "AS rate", "FROM", "items i", "LEFT JOIN order_items oi", "ON oi.item_id = i.item_id", "AND oi.qty >= 3"],
        extra: ["AND oi.qty < 3", "COUNT(oi.item_id)"],
        tables: ["items", "order_items"],
        hints: [
          "물건마다 3개 이상 담긴 줄만 짝지어 붙이고, 짝 있는 물건 수를 전체 물건 수로 나눠요.",
          "LEFT JOIN order_items oi, ON 다음 AND oi.qty >= 3, 위에는 COUNT(DISTINCT …) 두 개 사이에 * 100.0 /예요.",
        ],
        explain: "40가지 중 28가지라 70이에요. 대표 문제와 같은 뼈대예요. 취소된 주문의 줄도 담긴 것으로 셌어요. < 3이면 95, DISTINCT 없이 세면 한 물건의 줄이 여러 번 세어져 100을 넘어요.",
      },
      {
        type: "check", concept: "cohort",
        q: "17-2에서 배운 것으로 맞는 말은?",
        options: [
          "LEFT JOIN으로 무리를 모두 남기고, 다시 온 손님 수 × 100.0 ÷ 무리 크기로 재방문율을 낸다",
          "나중 달 조건은 WHERE에 두어야 무리 크기가 맞다",
          "한 손님의 주문이 여러 건이면 그 수만큼 다시 온 손님으로 센다",
        ],
        answer: 0,
        explain: "무리 크기를 지키려면 LEFT JOIN과 ON 조건, 손님을 한 번씩 세려면 DISTINCT예요.",
      },
    ],
  },
  {
    id: "17-3", chapter: 17, title: "함께 담긴 물건 찾기",
    goal: "주문 내역을 자기 자신과 이어 함께 담긴 물건 짝을 센다",
    summary: [
      "같은 표를 별칭 둘로 JOIN(셀프 조인)",
      "a.item_id < b.item_id로 짝을 한 번씩",
      "짝마다 묶어 COUNT, 많은 짝부터",
    ],
    cards: [
      {
        say: "1번 주문에는 인절미(6)·등불(25)·노리개(29)가 담겼어요. order_items를 a와 b 두 이름으로 불러 같은 주문끼리 이으면 물건 짝이 나와요. 작은 번호를 앞(a)에 두면 짝마다 한 번씩, 3쌍이에요!",
        sql: PAIRS_ONE,
      },
      {
        say: "모든 주문의 짝을 세면 인삼차와 복주머니가 9번으로 가장 자주 함께 담겼어요! 취소된 주문도 장바구니에 함께 담긴 것으로 셌어요. 8번 짝이 여섯이라 LIMIT 7, 이름은 items를 두 번 이었어요.",
        sql: TOP_PAIRS,
      },
    ],
    items: [
      {
        type: "choice", concept: "basket",
        q: "같은 표 order_items를 a와 b 두 별칭으로 JOIN하는 까닭은?",
        options: ["한 주문 안의 물건 두 개를 한 행에 나란히 놓으려고", "표를 두 배로 늘려 합을 크게 하려고", "주문을 날짜 차례로 놓으려고"],
        answer: 0,
        explain: "a 쪽 물건과 b 쪽 물건을 같은 order_id로 이으면 한 행이 물건 짝 하나가 돼요. 같은 표를 자기 자신과 잇는 것이에요.",
      },
      {
        type: "choice", concept: "basket",
        q: "첫 카드의 SQL 결과는 몇 행일까요?",
        code: PAIRS_ONE,
        options: ["3행", "6행", "9행"],
        answer: 0,
        explain: "물건 셋에서 나오는 짝은 (6, 25)·(6, 29)·(25, 29) 세 쌍이에요.",
      },
      {
        type: "choice", concept: "basket",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT a.item_id AS a_id,\n  b.item_id AS b_id\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id <> b.item_id\nWHERE a.order_id = 1",
        options: ["6행", "3행", "9행"],
        answer: 0,
        explain: "<>는 다르기만 하면 되니 (6, 25)와 (25, 6)이 둘 다 나와 짝마다 두 번, 6행이에요.",
      },
      {
        type: "choice", concept: "basket",
        q: "물건 짝을 셀 때 <>가 아니라 <를 쓰는 까닭은?",
        options: ["<>면 (6, 25)와 (25, 6)처럼 같은 짝이 두 번 세어져서", "<>는 이 장터에서 오류가 나서", "<가 번호 큰 물건을 빼 주어서"],
        answer: 0,
        explain: "<는 작은 번호를 늘 a에 두게 해서 짝마다 한 번만 남겨요. 자기 자신과의 짝(6, 6)도 함께 빠져요.",
      },
      {
        type: "choice", concept: "basket",
        q: "첫 카드에서 AND a.item_id < b.item_id 줄을 아예 빼면 1번 주문의 행 수는?",
        options: ["9행 (자기 자신과의 짝 3행 포함)", "3행", "6행"],
        answer: 0,
        explain: "물건 3개 × 3개 = 9행이에요. (6, 6)처럼 자기 자신과의 짝 3행과 두 번씩 나온 짝 6행이에요.",
      },
      {
        type: "choice", concept: "basket",
        q: "모든 주문의 물건 짝 수를 센 이 SQL의 결과는?",
        code: pairCount("<"),
        options: ["943", "1886", "1241"],
        answer: 0,
        explain: "짝마다 한 번씩 943쌍이에요. 1886은 <>로 두 번씩 센 수, 1241은 order_items의 행 수예요.",
      },
      {
        type: "choice", concept: "basket",
        q: "둘째 카드의 결과에서 가장 자주 함께 담긴 짝은?",
        options: ["인삼차와 복주머니 (9번)", "인절미와 송편 (8번)", "국밥과 인삼차 (7번)"],
        answer: 0,
        explain: "인삼차와 복주머니가 9번으로 하나뿐인 1등이에요. 인절미와 송편은 8번, 국밥과 인삼차는 7번이에요. 취소된 주문에 함께 담긴 것까지 센 수예요.",
      },
      {
        type: "choice", concept: "basket",
        q: "둘째 카드에서 ORDER BY 뒤에 p.a_id, p.b_id까지 붙인 까닭은?",
        options: ["8번 담긴 짝이 여럿이라 차례를 하나로 정하려고", "n이 큰 차례를 뒤집으려고", "이름 가나다순으로 놓으려고"],
        answer: 0,
        explain: "n이 같은 짝끼리의 차례가 정해지지 않으면 LIMIT가 그때그때 다른 짝을 자를 수 있어요(5장). 고유한 번호까지 줄 세워요.",
      },
      {
        type: "blank", concept: "basket",
        q: "1번 주문의 물건 짝이 한 번씩만 나오게 빈자리를 채워 보세요.",
        code: "SELECT a.item_id AS a_id,\n  b.item_id AS b_id\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id ___ b.item_id\nWHERE a.order_id = 1",
        chips: ["<", "<>", "="],
        answer: 0,
        explain: "<면 3쌍이 한 번씩 나와요. <>는 짝마다 두 번(6행), =는 자기 자신과의 짝 3행만 나와요.",
      },
      {
        type: "choice", concept: "basket",
        q: "인삼차(12번)와 함께 담긴 물건을 셀 때는 b.item_id <> 12를 쓰는 까닭은?",
        options: ["< 12면 인삼차보다 번호가 작은 물건만 남고 큰 물건을 놓쳐서", "<>가 같은 짝을 두 번 세게 해서", "= 12면 오류가 나서"],
        answer: 0,
        explain: "한쪽을 인삼차로 못 박으면 짝이 두 번 나올 일이 없어요. 남은 일은 인삼차 자신만 빼는 것이라 <> 12예요. 상대는 35가지예요.",
      },
      {
        id: "17-3-b1", type: "build", concept: "basket",
        q: "10번 주문에 함께 담긴 물건 짝을 한 번씩 보여 줘",
        cards: ["SELECT", "a.item_id AS a_id,", "b.item_id AS b_id", "FROM", "order_items a", "JOIN order_items b", "ON b.order_id = a.order_id", "AND a.item_id < b.item_id", "WHERE", "a.order_id = 10"],
        extra: ["AND a.item_id = b.item_id", "ON b.item_id = a.item_id"],
        tables: ["order_items"],
        hints: [
          "주문 내역을 a·b 두 이름으로 같은 주문끼리 잇고, 작은 번호를 a에 둬요. 10번 주문만 보세요.",
          "JOIN order_items b, ON b.order_id = a.order_id, AND a.item_id < b.item_id, WHERE a.order_id = 10이에요.",
        ],
        explain: "수육(2)·비단 주머니(23)·복주머니(28)에서 (2, 23)·(2, 28)·(23, 28) 세 쌍이에요. 물건 번호로 이으면 다른 주문의 같은 물건끼리 이어져요.",
      },
      {
        id: "17-3-b2", type: "build", concept: "basket",
        q: "인삼차(12번)와 한 주문에 담긴 물건마다 몇 번 함께 담겼는지 보여 줘",
        cards: ["SELECT", "b.item_id, COUNT(*) AS n", "FROM", "order_items a", "JOIN order_items b", "ON b.order_id = a.order_id", "AND a.item_id = 12", "AND b.item_id <> 12", "GROUP BY", "b.item_id"],
        extra: ["AND b.item_id < 12", "a.item_id"],
        tables: ["order_items", "items"],
        hints: [
          "a 쪽을 인삼차로 못 박고, b 쪽 물건마다 묶어 세요. 인삼차 자신은 빼요.",
          "ON 짝 다음 AND a.item_id = 12, AND b.item_id <> 12, 그리고 GROUP BY b.item_id예요.",
        ],
        explain: "35가지, 복주머니(28)가 9번으로 가장 많아요. < 12면 번호 큰 물건을 놓치고, a.item_id로 묶으면 한 행으로 뭉쳐요.",
      },
      {
        type: "check", concept: "basket",
        q: "17-3에서 배운 것으로 맞는 말은?",
        options: [
          "같은 표를 두 별칭으로 같은 주문끼리 잇고, a.item_id < b.item_id로 짝을 한 번씩 센다",
          "<>를 쓰면 짝마다 한 번씩 센다",
          "같은 표는 자기 자신과 JOIN할 수 없다",
        ],
        answer: 0,
        explain: "별칭 두 개면 같은 표도 두 표처럼 이어요. <로 짝마다 한 번, 자기 자신과의 짝은 빼요.",
      },
    ],
  },
  {
    id: "17-4", chapter: 17, title: "숨은 무늬와 중앙값",
    goal: "비중으로 숨은 무늬를 찾고, 가운데 값(중앙값)을 낸다",
    summary: [
      "다 많이 팔린 달은 비중(%)으로 견줘요",
      "중앙값 = 줄 세운 가운데 값",
      "행 수가 짝수면 가운데 둘의 평균",
    ],
    cards: [
      {
        say: "달마다 완료 주문 내역의 줄 수(total)와 약재 줄 수(herb)예요. 약재면 1, 아니면 0을 SUM으로 더하면 약재 줄만 세어져요! herb는 12월이 가장 많지만, 비중(herb_pct)은 6~8월만 45%를 넘어요.",
        sql: HERB,
      },
      {
        say: "중앙값은 값을 줄 세운 가운데 값이에요. COUNT(*) OVER ()처럼 괄호를 비우면 모든 행에 전체 수(cnt)가 붙어요. 여우 12명은 짝수라 가운데가 구미(38)와 솔아(41) 둘! 그 평균 39.5가 중앙값이에요.",
        sql: MEDIAN_ROWS,
      },
    ],
    items: [
      {
        type: "choice", concept: "analysis",
        q: "첫 카드의 결과에서 약재 비중(herb_pct)이 가장 높은 달은?",
        options: ["07 (51.3)", "12 (28.1)", "04 (34.9)"],
        answer: 0,
        explain: "7월이 51.3%로 가장 높고 8월 46.8, 6월 45.9가 뒤따라요. 다른 달은 모두 35% 아래예요. 12월은 약재 줄이 71줄로 가장 많지만 비중은 28.1%예요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "첫 카드에서 herb가 가장 큰 12월의 비중이 낮은 까닭은?",
        options: ["12월에는 모든 가게가 많이 팔려 전체 줄 수(total)가 훨씬 커서", "12월에는 약재가 하나도 안 팔려서", "12월 주문이 모두 취소라서"],
        answer: 0,
        explain: "12월 내역 253줄 중 약재는 71줄이에요. 전체가 함께 커진 달은 수보다 비중으로 견줘야 무늬가 보여요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "첫 카드에서 herb를 만든 SUM(CASE WHEN … THEN 1 ELSE 0 END)이 하는 일은?",
        options: ["약재 줄은 1, 다른 줄은 0으로 바꿔 더해 약재 줄 수를 센다", "약재 줄의 금액을 더한다", "약재가 아닌 줄의 수를 센다"],
        answer: 0,
        explain: "CASE(9장)가 약재 줄은 1, 나머지는 0으로 바꾸고 SUM이 더해요. 조건에 맞는 줄만 세는 모양이라, 한 번 묶은 표에서 전체와 일부를 함께 셀 수 있어요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "주문 내역을 가게 종류마다 세면 줄은 가장 적은데 한 줄 금액 평균은 가장 큰 종류는?",
        options: ["공방", "약재", "먹거리"],
        answer: 0,
        explain: "공방은 113줄뿐인데 한 줄 평균이 249.6엽전이에요. 방망이가 비싸 드물게 담겨도 금액이 커요. 먹거리는 395줄에 16.9엽전이에요. 취소된 주문의 줄도 셌어요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "달마다 주문 수를 많은 달부터 줄 세우면 가장 앞에 오는 달은?",
        options: ["2026-12 (124건)", "2026-11 (61건)", "2026-07 (59건)"],
        answer: 0,
        explain: "12월에 주문이 몰려 124건, 둘째인 11월의 두 배쯤이에요(16장). 약재 비중을 비율로 본 까닭도 이 12월이에요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "값 3, 8, 10, 20의 중앙값은?",
        options: ["9", "8", "10.25"],
        answer: 0,
        explain: "넷이라 가운데가 8과 10 둘이에요. 그 평균 9가 중앙값이에요. 10.25는 평균이에요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "둘째 카드의 SQL 결과는 몇 행일까요?",
        code: MEDIAN_ROWS,
        options: ["2행", "1행", "12행"],
        answer: 0,
        explain: "cnt가 12라 rn이 6~7인 구미·솔아 두 행이에요. 짝수면 가운데가 둘이에요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "행이 55개(홀수)일 때 rn BETWEEN cnt / 2.0 AND cnt / 2.0 + 1이 고르는 행은?",
        options: ["가운데 한 행 (28번째)", "가운데 두 행 (27·28번째)", "아무 행도 없다"],
        answer: 0,
        explain: "27.5부터 28.5 사이의 번호는 28 하나예요. 짝수 12면 6부터 7이라 둘이에요. 한 식이 짝수·홀수 모두 맞게 골라요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "여우 손님 나이의 중앙값은 39.5예요. 평균과 견주면?",
        options: ["평균은 38.3쯤으로, 어린 은호(13)·해랑(18)에게 끌려 내려간다", "평균도 39.5로 같다", "평균은 59다"],
        answer: 0,
        explain: "평균은 끝에 있는 값에 끌려가요. 중앙값은 가운데 자리만 봐서 덜 흔들려요. 그래서 둘을 함께 봐요.",
      },
      {
        type: "blank", concept: "analysis",
        q: "산삼 약방(3번 가게) 물건 값의 중앙값(25)이 나오게 빈자리를 채워 보세요.",
        code: medianShop3("___"),
        chips: ["2.0", "2", "1.0"],
        answer: 0,
        explain: "물건이 5개라 2.5~3.5 사이의 3번째, 오미자청 25예요. 2로 나누면 이 장터에서는 2가 되어 22와 25의 평균 23.5, 1.0이면 고를 행이 없어요.",
      },
      {
        id: "17-4-b1", type: "build", concept: "analysis",
        q: "가게마다 주문 내역이 몇 줄이고 한 줄 금액 평균이 얼마인지 보여 줘",
        cards: ["SELECT", "i.shop_id,", "COUNT(*) AS n,", "AVG(oi.qty * i.price) AS amt", "FROM", "order_items oi", "JOIN items i", "ON i.item_id = oi.item_id", "GROUP BY", "i.shop_id"],
        extra: ["SUM(oi.qty * i.price) AS amt", "oi.item_id"],
        tables: ["order_items", "items"],
        hints: [
          "주문 내역에 물건 값을 붙이고, 가게 번호로 묶어 줄 수와 금액 평균을 내요.",
          "AVG(oi.qty * i.price) AS amt, JOIN items i, ON 물건 번호 짝, GROUP BY i.shop_id예요.",
        ],
        explain: "공방인 7·8번은 60·53줄로 가장 적은데 한 줄 평균이 276.5·219.1엽전으로 가장 커요. 취소된 주문의 줄도 셌어요. SUM이면 합계, oi.item_id로 묶으면 물건마다예요.",
      },
      {
        id: "17-4-b2", type: "build", concept: "analysis",
        q: "여우 손님 나이의 중앙값을 보여 줘",
        cards: ["WITH r AS (SELECT age,", "ROW_NUMBER() OVER", "(ORDER BY age, customer_id)", "AS rn, COUNT(*) OVER () AS cnt", "FROM customers", "WHERE kind = '여우')", "SELECT AVG(age) AS median", "FROM r", "WHERE rn BETWEEN cnt / 2.0", "AND cnt / 2.0 + 1"],
        extra: ["WHERE rn = cnt / 2", "(ORDER BY customer_id)"],
        tables: ["customers"],
        hints: [
          "중간 표에서 여우 손님을 나이 차례로 번호 매기고 전체 수를 붙여요. 바깥에서 가운데 번호의 나이를 평균해요.",
          "ROW_NUMBER() OVER (ORDER BY age, customer_id) AS rn, COUNT(*) OVER () AS cnt, 바깥 WHERE rn BETWEEN …이에요.",
        ],
        explain: "39.5예요. 12명이라 6·7번째 38과 41의 평균이에요. rn = cnt / 2면 6번째 38만, 번호 차례로 매기면 나이 가운데가 아니에요.",
      },
      {
        id: "17-4-b3", type: "build", concept: "analysis",
        q: "주문 중 취소된 주문이 몇 %인지 소수 첫째 자리까지 보여 줘",
        cards: ["SELECT", "ROUND(SUM(CASE WHEN", "status = '취소'", "THEN 1 ELSE 0 END)", "* 100.0 / COUNT(*), 1)", "AS cancel_rate", "FROM", "orders"],
        extra: ["* 100 / COUNT(*), 1)", "status = '완료'"],
        tables: ["orders"],
        hints: [
          "취소면 1, 아니면 0으로 바꿔 더하면 취소 건수예요. 그것을 전체 주문 수로 나눠 100을 곱해요.",
          "ROUND(SUM(CASE WHEN, status = '취소', THEN 1 ELSE 0 END), * 100.0 / COUNT(*), 1), AS cancel_rate예요.",
        ],
        explain: "591건 중 49건이라 8.3이에요. 첫 카드의 약재 줄처럼 취소면 1을 더해 세고, 「부분 × 100.0 ÷ 전체」로 나눠요. * 100이면 이 장터에서는 소수점 아래가 버려져 8, 완료면 91.7이에요.",
      },
      {
        type: "check", concept: "analysis",
        q: "17-4에서 배운 것으로 맞는 말은?",
        options: [
          "모두 많이 팔린 달은 비중으로 견주고, 중앙값은 번호와 전체 수로 가운데 행을 골라 평균한다",
          "약재 줄이 가장 많은 달이 늘 약재 비중도 가장 높다",
          "중앙값은 언제나 평균과 같다",
        ],
        answer: 0,
        explain: "수만 보면 12월에 가려지는 무늬를 비중이 드러내요. 중앙값은 끝값에 덜 흔들리는 가운데 값이에요.",
      },
    ],
  },
  {
    id: "17-5", chapter: 17, title: "17장 평가", isExam: true,
    goal: "재방문율, 함께 담긴 물건, 중앙값과 앞 장을 모두 써 본다",
    summary: [
      "무리 → LEFT JOIN → × 100.0 ÷ 무리",
      "셀프 조인 + a.item_id < b.item_id",
      "중앙값 = 가운데 번호의 평균",
    ],
    cards: [
      {
        say: "마지막 평가예요! 처음엔 SELECT * FROM 한 줄에도 두근거렸는데, 이제 재방문율에 장바구니 분석까지 해요. 나도 같이 배우며 컸어요. 아래는 대표 문제 「3월 첫 손님의 재방문율」! 차근차근 가 봐요.",
        sql: MARKET,
      },
    ],
    items: [
      {
        type: "choice", concept: "cohort",
        q: "재방문율에서 「다시 온 손님」은 누구일까요?",
        options: ["첫 방문 달보다 나중 달에 주문이 있는 손님", "주문을 두 건 넘게 한 손님", "첫 방문 날 주문한 손님"],
        answer: 0,
        explain: "처음 온 달은 무리를 정할 때 쓰고, 그보다 나중 달의 주문이 「다시 온」 표시예요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "대표 문제의 결과에서 back 값은?",
        code: MARKET,
        options: ["8", "139", "100"],
        answer: 0,
        explain: "3월 무리 8명이 모두 4월부터 주문했어요. 139는 DISTINCT 없이 센 주문 수, 100은 rate예요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "재방문율을 낼 때 JOIN이 아니라 LEFT JOIN을 쓰는 까닭은?",
        options: ["다시 오지 않은 손님도 무리 크기에 남기려고", "LEFT JOIN이 더 빨라서", "주문이 없는 날을 빼려고"],
        answer: 0,
        explain: "JOIN이면 짝 없는 손님이 빠져 무리가 줄고, 재방문율이 늘 100%처럼 보여요.",
      },
      {
        type: "choice", concept: "cohort",
        q: "무리 6명 중 3명이 나중 달에 다시 왔다면 재방문율은?",
        options: ["50", "3", "200"],
        answer: 0,
        explain: "3 × 100.0 ÷ 6 = 50이에요. 1월 무리가 바로 이래요. 200은 거꾸로 나눈 값이에요.",
      },
      {
        type: "blank", concept: "cohort",
        q: "무리마다 재방문율이 나오게 「나중 달」 조건의 빈자리를 채워 보세요.",
        code: ALL_COHORTS.replace("\n    > strftime", "\n    ___ strftime"),
        chips: [">", ">=", "<"],
        answer: 0,
        explain: "주문 연-월이 첫 방문 연-월보다 커야 나중 달이에요. >=면 첫 달 주문도 들어가 모두 100, <면 앞 달이라 0이에요.",
      },
      {
        type: "choice", concept: "basket",
        q: "함께 담긴 물건 짝을 셀 때 a.item_id < b.item_id를 쓰는 까닭은?",
        options: ["짝마다 한 번씩만, 자기 자신과의 짝은 빼고 세려고", "번호가 작은 물건만 세려고", "주문 번호를 맞추려고"],
        answer: 0,
        explain: "주문 번호는 ON의 order_id 짝이 맞춰요. <는 (6, 25)와 (25, 6)을 하나로 줄이고 (6, 6)을 빼요.",
      },
      {
        type: "choice", concept: "basket",
        q: "이 SQL의 결과는?",
        code: pairCount("<>"),
        options: ["1886", "943", "3127"],
        answer: 0,
        explain: "<>는 짝마다 두 번 세서 943의 두 배예요. 3127은 조건 없이 자기 자신과의 짝까지 센 수예요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "물건 값 6, 7, 9, 30의 중앙값은?",
        options: ["8", "13", "7"],
        answer: 0,
        explain: "넷이라 가운데 7과 9의 평균 8이에요. 13은 평균이에요. 30 하나가 평균을 끌어올렸어요.",
      },
      {
        type: "choice", concept: "analysis",
        q: "17장에서 장터를 분석해 찾은 것으로 맞는 것은?",
        options: [
          "3월 첫 손님은 모두 다시 왔고, 약재는 6~8월에 주문 줄 비중이 높다",
          "공방은 주문 내역 줄이 가장 많다",
          "12월에는 주문이 가장 적다",
        ],
        answer: 0,
        explain: "공방은 줄이 가장 적고 한 줄 금액이 커요. 12월은 주문이 124건으로 가장 많아요. 3월 무리·여름 약재·공방·12월, 넷 다 숨은 무늬예요.",
      },
      {
        type: "choice", concept: "partition",
        q: "가게마다 가장 비싼 물건을 뽑을 때 RANK() OVER 괄호 안에 둘 것은?",
        options: ["PARTITION BY shop_id ORDER BY price DESC", "ORDER BY shop_id", "PARTITION BY price ORDER BY shop_id"],
        answer: 0,
        explain: "가게마다 따로 순위를 매기려면 PARTITION BY shop_id, 비싼 차례는 ORDER BY price DESC예요(14장).",
      },
      {
        type: "choice", concept: "change",
        q: "달마다 매출 옆에 지난달 매출을 붙이는 창 함수는?",
        options: ["LAG", "LEAD", "RANK"],
        answer: 0,
        explain: "바로 앞 행이 지난달이라 LAG예요(15·16장). LEAD는 다음 달, RANK는 순위예요.",
      },
      {
        type: "order", concept: "cohort",
        q: "3월에 처음 온 손님이 몇 명인지 보게 줄을 놓아 보세요.",
        lines: ["SELECT COUNT(*) AS size", "FROM customers", "WHERE first_visit", "LIKE '2026-03%'"],
        expect: "size\n8",
        explain: "3월 무리는 8명이에요. 재방문율의 나눗수(무리 크기)예요.",
      },
      {
        id: "17-5-b1", type: "build", concept: "cohort",
        q: "2월에 처음 온 손님 중 3월부터 다시 주문한 손님을 보여 줘",
        cards: ["SELECT", "DISTINCT c.customer_id, c.name", "FROM", "customers c", "JOIN orders o", "ON", "o.customer_id = c.customer_id", "AND ordered_on >= '2026-03-01'", "WHERE", "c.first_visit LIKE '2026-02%'"],
        extra: ["AND ordered_on < '2026-03-01'", "LEFT JOIN orders o"],
        tables: ["customers", "orders"],
        hints: [
          "2월 무리 손님에게 3월부터의 주문만 짝지어 붙이고, 짝 있는 손님을 한 번씩 보여요.",
          "JOIN orders o, ON 다음 손님 번호 짝, AND ordered_on >= '2026-03-01', WHERE에 2월 조건이에요.",
        ],
        explain: "바람돌이·신아람 2명, 5명 중 2명이라 재방문율 40이에요. 대표 문제와 같은 뼈대예요. 3월 전이면 첫 달에 주문한 4명, LEFT JOIN이면 5명 모두 나와요.",
      },
      {
        id: "17-5-b2", type: "build", concept: "basket",
        q: "복주머니(28번)와 한 주문에 담긴 물건마다 몇 번 함께 담겼는지 보여 줘",
        cards: ["SELECT", "b.item_id, COUNT(*) AS n", "FROM", "order_items a", "JOIN order_items b", "ON b.order_id = a.order_id", "AND a.item_id = 28", "AND b.item_id <> 28", "GROUP BY", "b.item_id"],
        extra: ["AND b.item_id < 28", "a.item_id"],
        tables: ["order_items", "items"],
        hints: [
          "a 쪽을 복주머니로 못 박고, b 쪽 물건마다 묶어 세요. 복주머니 자신은 빼요.",
          "ON 짝 다음 AND a.item_id = 28, AND b.item_id <> 28, 그리고 GROUP BY b.item_id예요.",
        ],
        explain: "인삼차(12)가 9번으로 가장 많아요. < 28이면 번호 큰 물건을 놓치고, a.item_id로 묶으면 한 행으로 뭉쳐요.",
      },
      {
        id: "17-5-b3", type: "build", concept: "analysis",
        q: "먹거리 가게(1·2번) 물건 값의 중앙값을 보여 줘",
        cards: ["WITH r AS (SELECT price,", "ROW_NUMBER() OVER", "(ORDER BY price, item_id)", "AS rn, COUNT(*) OVER () AS cnt", "FROM items", "WHERE shop_id IN (1, 2))", "SELECT AVG(price) AS median", "FROM r", "WHERE rn BETWEEN cnt / 2.0", "AND cnt / 2.0 + 1"],
        extra: ["WHERE rn = cnt / 2", "(ORDER BY item_id)"],
        tables: ["items"],
        hints: [
          "중간 표에서 두 가게 물건을 값 차례로 번호 매기고 전체 수를 붙여요. 바깥에서 가운데 번호의 값을 평균해요.",
          "ROW_NUMBER() OVER (ORDER BY price, item_id) AS rn, COUNT(*) OVER () AS cnt, 바깥 WHERE rn BETWEEN …이에요.",
        ],
        explain: "물건 10개라 5·6번째 8과 9의 평균 8.5예요. 평균 9.9보다 작아요(수육 25가 평균을 끌어올림). rn = cnt / 2면 8만 나와요.",
      },
      {
        type: "check", concept: "analysis",
        q: "17장에서 배운 것으로 맞는 말은?",
        options: [
          "무리마다 재방문율을 내고, 셀프 조인으로 함께 담긴 물건을 세고, 중앙값으로 가운데를 본다",
          "재방문율은 JOIN으로 다시 온 손님만 남겨 센다",
          "함께 담긴 물건은 <>로 짝마다 한 번씩 센다",
        ],
        answer: 0,
        explain: "분석 도깨비 끝, 17장 모두 해냈어요! 실무에서는 쇼핑몰 분석가가 이 SQL로 주문 표에서 가입 달별 재구매율, 함께 담긴 상품, 매출 중앙값을 뽑아 보고해요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 17장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - 17-T1 MM: 01~12(달마다 첫 손님이 있음). LIKE(정답) / =는 % 글자 그대로라 0명, <는 앞 달 무리(1월이면 0명).
// - 17-T2 O: 물건이 꼭 3개인 주문. <(정답 3행) / <>(6행) / =(자기 자신과의 짝 3행, 값이 달라 보기가 겹치지 않음).
// - 17-T3 MM: 01·02·04~11(다시 안 온 손님이 있고 다시 온 손님도 있는 달). LEFT(정답) / INNER면 100, UNION은 오류.
export const TEMPLATES = [
  {
    id: "17-T1", concept: "cohort", type: "blank",
    q: "2026-{MM}에 처음 온 손님이 몇 명인지 나오게 빈자리를 채워 보세요.",
    sql: "SELECT COUNT(*) AS size\nFROM customers\nWHERE first_visit ___ '2026-{MM}%'",
    chips: ["LIKE", "=", "<"],
    answer: 0,
    vars: { MM: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] },
    explain: "% 무늬로 그달로 시작하는 첫 방문일을 찾으려면 LIKE예요. =는 % 글자 그대로 견주고, <는 앞 달 손님을 세요.",
  },
  {
    id: "17-T2", concept: "basket", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT a.item_id AS a_id,\n  b.item_id AS b_id\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id < b.item_id\nWHERE a.order_id = {O}",
    wrong: [
      "SELECT a.item_id AS a_id,\n  b.item_id AS b_id\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id <> b.item_id\nWHERE a.order_id = {O}",
      "SELECT a.item_id AS a_id,\n  b.item_id AS b_id\nFROM order_items a\nJOIN order_items b\n  ON b.order_id = a.order_id\n  AND a.item_id = b.item_id\nWHERE a.order_id = {O}",
    ],
    vars: { O: [1, 10, 12, 16, 22, 25, 30, 34, 35, 53] },
    explain: "{O}번 주문의 물건 셋에서 짝이 한 번씩 세 쌍이에요. <>면 짝마다 두 번, =면 자기 자신과의 짝만 나와요.",
  },
  {
    id: "17-T3", concept: "cohort", type: "blank",
    q: "2026-{MM}에 처음 온 손님 무리의 재방문율이 나오게 빈자리를 채워 보세요.",
    sql: "SELECT\n  ROUND(COUNT(DISTINCT o.customer_id)\n    * 100.0\n    / COUNT(DISTINCT c.customer_id),\n    1) AS rate\nFROM customers c\n___ JOIN orders o\n  ON o.customer_id = c.customer_id\n  AND strftime('%Y-%m', o.ordered_on)\n    > '2026-{MM}'\nWHERE c.first_visit LIKE '2026-{MM}%'",
    chips: ["LEFT", "INNER", "UNION"],
    answer: 0,
    vars: { MM: ["01", "02", "04", "05", "06", "07", "08", "09", "10", "11"] },
    explain: "LEFT JOIN이라 다시 안 온 손님도 무리에 남아요. INNER면 다시 온 손님만 남아 100이 돼요.",
  },
];
