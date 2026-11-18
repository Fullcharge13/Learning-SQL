// 10장 「표 잇기 ①」 (설계 §6: INNER JOIN / 장터 예: 주문에 손님 이름 붙이기).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 10
// 10장 낱말은 9장까지에 JOIN·INNER·ON을 더한 것이다. 표.열(items.shop_id)과 표 별칭(FROM orders o)은 낱말이 아니라 이름이라
// 점검기 grammar가 보지 않는다. 10-1에서 표.열, 10-2에서 표 별칭을 카드로 먼저 보여 주고 쓴다. 표 별칭에 AS는 붙이지 않는다
// (AS를 받지 않는 데이터베이스도 있어서, 가장 널리 통하는 「표 이름 뒤에 한 칸 띄고 별칭」만 쓴다).
// - 장터 예 「주문에 손님 이름 붙이기」(10-2-b2·10-5-b1): SELECT o.order_id, c.name FROM orders o JOIN customers c
//   ON o.customer_id = c.customer_id WHERE o.order_id <= 10 → 10행(박서연·손지우·쇠뭉치·여름이).
//   두 열은 구절 카드 한 장 「o.order_id, c.name」으로 둔다(10~13장 검토 I-5: 예전 *는 열 10개라 이름 붙이기가 흐려졌다).
//   ON 조건 「ON o.customer_id = c.customer_id」가 32칸이라 ON과 조건을 두 장으로 둔다. 헷갈림 「o.order_id, c.village」는 이름 대신 마을.
// - 7장·8장에서 미룬 「진짜 매출」을 10-4에서 갚는다(7장 머리 주석의 약속).
//   매출 = 완료 주문(orders.status = '완료')의 수량(order_items.qty) × 값(items.price)의 합 → 57487엽전(10-4-b1).
//   취소까지 더하면 64024, 취소된 주문만 6537(10-5-b3). 7장의 1882개는 취소까지 센 수량이고 완료만 세면 1712개, 취소는 170개(10-4-b2).
//   가게별 완료 매출: 1번 4436·2번 1778·3번 7706·4번 6289·5번 4070·6번 8738·7번 13440·8번 11030 → 1만 엽전 넘는 가게는 7·8번.
//   8장의 재고 값어치(SUM(price * stock))로는 6·7·8번(10525·36890·15620)이었다. 6번은 재고 값어치 10525지만 판 엽전은 8738.
//   매출 별칭은 sales: 「SUM(oi.qty * i.price) AS sales」가 딱 30칸이라 한 장에 들어간다(AS revenue면 32칸).
// - 확인한 값(data/market.sql, openEngine):
//   shops 3번 산삼 약방 주인 한약수, 4번 달빛 약초방 송약초, 7번 쇠돌, 8번 나무쇠. 공방 = 7·8번(물건 10가지). 약재 = 3·4번.
//   items JOIN shops ON shop_id = 40행. ON 없이 JOIN = 8 × 40 = 320행. 짝을 item_id = shop_id로 잘못 맞추면 8행(물건 1~8번만).
//   주문 1~10번 손님: 1 박서연, 2·3·4 손지우, 5 쇠뭉치, 6·7 박서연, 8·9 여름이, 10 쇠뭉치(모두 완료).
//   주문 내역: 1번 주문 인절미 1×6, 노리개 1×45, 등불 2×24(=48). 3번 주문 송편 3×7(=21), 담뱃대 1×33.
//   주문된 적 있는 물건 38가지(꿀떡 10번·보따리 30번은 한 번도 안 팔림). 2번 가게 중 팔린 것: 인절미·송편·약과·식혜(꿀떡 빠짐).
//   6번 가게 중 팔린 것: 갓·담뱃대·복주머니·노리개(보따리 빠짐).
//   주문한 적 있는 손님 57명(60명 중 임바다·표다솜·돌쇠 3명은 주문이 없음). ON 없이 JOIN한 COUNT(DISTINCT c.customer_id)는 60.
//   ON 없이: customers × orders = 35460행, orders × order_items = 733431행(약 73만, 말로만 쓰고 실행하지 않음).
//   완료 주문의 주문 내역 행 1133개(COUNT(*)), 수량 합 1712.
// - ON을 빠뜨린 모양(모든 짝 붙이기)은 설명 카드와 객관식에서 COUNT로만 보이고, 조립 정답으로 쓰지 않는다(계획 검토 초점 1).
//   조립의 ON 조건 카드를 빼면 모든 짝이 붙어 결과가 달라지거나 시간이 걸린다(drop-one은 시간 초과를 오답으로 침, R24).
// - 엔진마다 다른 것(판정 R36): ON 없는 JOIN이 돌아가는 것(이 장터 SQLite·MySQL은 받고, PostgreSQL 등은 오류) → 「이 장터에서는」.
//   두 표에 다 있는 열을 표 없이 부르면 오류(ambiguous)인 것, INNER JOIN이 짝 없는 행을 빼는 것, JOIN = INNER JOIN은 어디서나 같아 붙이지 않는다.
//   별칭을 붙인 뒤 원래 표 이름으로 부르면 오류인 것도 SQLite·MySQL·PostgreSQL 모두 같다.
// - 조립 카드(판정 R38·R40): SELECT·FROM·WHERE는 한 장씩. 10-1은 JOIN·표 이름·ON을 낱장으로 두어 문장 차례를 연습하고
//   (ON items.shop_id = shops.shop_id가 32칸이라 ON과 조건을 나눔), 10-2부터 「items i」·「JOIN shops s」처럼 표와 별칭을 한 장으로 둔다.
//   10-2는 ON을 한 장으로 따로 둔다(장터 예의 ON 조건이 32칸). 10-3부터는 ON 조건이 30칸 안이면 「ON oi.item_id = i.item_id」 한 장.
//   세 표 매출 조립(10-4-b1)은 SELECT, 셈+별칭, FROM, 표, JOIN 표, ON 조건, JOIN 표, ON 조건, WHERE, 조건 = 10장 + 헷갈림 2장.
// - 별칭과 swap-extra(R26·R33): 표 별칭을 정답에 쓰면, 표 이름 뒤에 끼운 낱말은 「별칭이 둘」이라 오류가 나거나, 원래 표 이름(items.shop_id)으로
//   부르는 곳이 오류가 나서 점검기의 별칭 예외가 거의 쓰이지 않는다. 헷갈림 카드는 점이 든 이름(shops.name, oi.item_id)이나 연산자가 든 조건이라
//   어느 자리에 끼워도 별칭으로 읽히지 않는다. 낱말 하나뿐인 열 이름 카드(name)는 SELECT 열 뒤에 끼우면 열 별칭이 되어 쓰지 않는다.
// - 결과 표 보기(choice {sql})의 셈 열에는 같은 별칭(sales)을 붙인다.
export const CHAPTER = { id: 10, title: "표 잇기 ①" };

export const LESSONS = [
  {
    id: "10-1", chapter: 10, title: "JOIN으로 표 잇기",
    goal: "JOIN … ON으로 두 표를 짝 맞춰 잇고 표.열로 열을 가리킨다",
    summary: [
      "JOIN 표 ON 조건으로 두 표를 이어요",
      "ON에는 두 표가 함께 가진 열을 맞대요",
      "items.shop_id = items 표의 shop_id",
    ],
    cards: [
      {
        say: "물건(items) 표에는 가게 번호 shop_id만 있죠? JOIN(조인)으로 가게(shops) 표를 옆에 붙이면 주인(owner)도 보여요. ON 뒤에는 어느 행끼리 짝인지 쓰는 조건! 아래는 shop_id가 같은 가게를 물건 옆에 붙였어요.",
        sql: "SELECT items.name, price, owner\nFROM items\nJOIN shops\n  ON items.shop_id = shops.shop_id\nWHERE items.shop_id = 3",
      },
      {
        say: "items.shop_id는 「items 표의 shop_id」예요. shop_id와 name은 두 표에 다 있어서 표 이름을 붙여 가려요. 아래는 이은 표 그대로예요. 물건 열 5개 옆에 가게 열 5개가 붙었고, 두 shop_id 값이 늘 같죠?",
        sql: "SELECT *\nFROM items\nJOIN shops\n  ON items.shop_id = shops.shop_id\nWHERE items.shop_id = 7",
      },
    ],
    items: [
      {
        type: "choice", concept: "join",
        q: "JOIN은 무슨 일을 할까요?",
        options: ["두 표의 행을 짝 맞춰 옆으로 이어 붙인다", "두 표의 행을 위아래로 쌓는다", "두 표 중 행이 많은 표만 보여 준다"],
        answer: 0,
        explain: "JOIN은 짝이 맞는 행끼리 옆으로 붙여 열이 늘어난 표를 만들어요. 물건 행 옆에 그 가게 행이 붙었죠?",
      },
      {
        type: "choice", concept: "joinkey",
        q: "JOIN 뒤 ON에는 무엇을 쓸까요?",
        options: ["어느 행끼리 짝인지 정하는 조건", "보여 줄 열 이름", "줄 세울 기준 열"],
        answer: 0,
        explain: "ON 뒤에는 짝 조건을 써요. items.shop_id = shops.shop_id면 가게 번호가 같은 행끼리 붙어요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "items 표와 shops 표를 이을 때 짝을 맞출 열은?",
        options: ["shop_id", "name", "item_id"],
        answer: 0, tables: ["items", "shops"],
        explain: "두 표가 같은 뜻으로 함께 가진 열은 가게 번호 shop_id예요. name도 두 표에 있지만 물건 이름과 가게 이름이라 뜻이 달라요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "items.shop_id는 무슨 뜻일까요?",
        options: ["items 표의 shop_id 열", "items 표와 shop_id 열을 곱한 값", "shop_id가 items인 행"],
        answer: 0,
        explain: "점 앞은 표 이름, 점 뒤는 열 이름이에요. 두 표에 같은 이름의 열이 있을 때 어느 표의 것인지 밝혀요.",
      },
      {
        type: "choice", concept: "join",
        q: "이 SQL 결과에서 감초의 owner는?",
        code: "SELECT items.name, price, owner\nFROM items\nJOIN shops\n  ON items.shop_id = shops.shop_id\nWHERE items.shop_id = 3",
        options: ["한약수", "송약초", "산삼 약방"],
        answer: 0,
        explain: "감초는 3번 가게 물건이라 3번 가게 산삼 약방의 주인 한약수가 붙어요. 송약초는 4번 가게 주인, 산삼 약방은 가게 이름이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "물건마다 가게를 이은 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT items.name, owner\nFROM items\nJOIN shops\n  ON items.shop_id = shops.shop_id",
        options: ["40행", "8행", "320행"],
        answer: 0,
        explain: "물건 40가지가 저마다 제 가게 하나와 짝이 되어 40행이에요. 가게 수 8과 헷갈리지 않았죠?",
      },
      {
        type: "blank", concept: "join",
        q: "물건 표에 가게 표를 이어 붙이게 빈자리를 채워 보세요.",
        code: "SELECT items.name, owner\nFROM items\n___ shops\n  ON items.shop_id = shops.shop_id",
        chips: ["JOIN", "WHERE", "AND"],
        answer: 0,
        explain: "이을 표 앞에는 JOIN을 놓아요. WHERE나 AND 뒤에는 표 이름이 아니라 조건이 와서 단서가 나와요.",
      },
      {
        type: "blank", concept: "joinkey",
        q: "물건 옆에 그 물건의 가게가 붙게 빈자리를 채워 보세요.",
        code: "SELECT items.name, owner\nFROM items\nJOIN shops\n  ON items.shop_id = ___",
        chips: ["shops.shop_id", "items.shop_id", "shops.owner"],
        answer: 0,
        explain: "items의 가게 번호와 shops의 가게 번호를 맞대요. items.shop_id끼리 맞대면 늘 참이라 모든 가게가 붙고, owner와 맞대면 짝이 없어요.",
      },
      {
        type: "order", concept: "join",
        q: "물건 이름 옆에 가게 주인을 붙이는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT items.name, owner", "FROM items", "JOIN shops", "ON items.shop_id = shops.shop_id"],
        explain: "FROM 뒤에 처음 표, JOIN 뒤에 이을 표, 그다음 ON 짝 조건이에요. ON은 JOIN 바로 뒤에 붙어 다녀요.",
      },
      {
        id: "10-1-b1", type: "build", concept: "joinkey",
        q: "물건마다 이름과, 그 물건을 파는 가게의 주인을 보여 줘",
        cards: ["SELECT", "items.name", ",", "owner", "FROM", "items", "JOIN", "shops", "ON", "items.shop_id = shops.shop_id"],
        extra: ["items.item_id = shops.shop_id", "shops.name"],
        tables: ["items", "shops"],
        hints: [
          "물건 표에 가게 표를 잇고, 가게 번호가 같은 행끼리 짝을 지어요.",
          "FROM items, JOIN shops, ON 다음에 items.shop_id = shops.shop_id를 놓아요.",
        ],
        explain: "물건 40가지 옆에 주인이 붙었어요. item_id와 shop_id를 맞대면 1~8번 물건만 엉뚱한 가게와 짝이 돼요. 짝은 같은 뜻의 열끼리!",
      },
      {
        id: "10-1-b2", type: "build", concept: "join",
        q: "공방 가게에서 파는 물건의 이름을 보여 줘",
        cards: ["SELECT", "items.name", "FROM", "items", "JOIN", "shops", "ON", "items.shop_id = shops.shop_id", "WHERE", "category = '공방'"],
        extra: ["category = '약재'", "shops.name"],
        tables: ["items", "shops"],
        hints: [
          "물건 표에는 가게 종류가 없어요. 가게 표를 이어 종류로 걸러요.",
          "JOIN shops, ON 짝 조건 다음에 WHERE category = '공방'을 놓아요.",
        ],
        explain: "도깨비방망이·장승 같은 공방 물건 10가지예요. category는 가게 표에만 있어서, 이어야 물건을 가게 종류로 거를 수 있어요.",
      },
      {
        type: "check", concept: "join",
        q: "10-1에서 배운 것으로 맞는 말은?",
        options: [
          "JOIN 뒤에 이을 표, ON 뒤에 짝 조건을 쓴다",
          "JOIN을 쓰면 짝 조건 없이도 알맞은 행끼리 붙는다",
          "items.shop_id는 두 열을 곱하라는 뜻이다",
        ],
        answer: 0,
        explain: "어느 행끼리 짝인지는 ON 조건이 정해요. 점은 「그 표의」라는 뜻이에요.",
      },
    ],
  },
  {
    id: "10-2", chapter: 10, title: "표 별칭과 겹친 열",
    goal: "두 표에 다 있는 열을 가려 부르고, 표에 짧은 별칭을 붙인다",
    summary: [
      "두 표에 다 있는 열은 표를 밝혀요",
      "FROM orders o처럼 표에 짧은 별칭",
      "별칭을 붙이면 o.customer_id로 불러요",
    ],
    cards: [
      {
        say: "10장 대표 문제 「주문에 손님 이름 붙이기」예요! 주문(orders) 표엔 손님 번호뿐이라 손님(customers) 표를 이어요. orders 뒤의 o, customers 뒤의 c는 표에 붙인 짧은 별칭! 그래서 o.customer_id처럼 불러요.",
        sql: "SELECT o.order_id, c.name\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 5",
      },
      {
        say: "customer_id는 두 표에 다 있어서 표를 밝히지 않으면 어느 쪽인지 몰라 단서(ambiguous)가 나와요. order_id·name처럼 이은 표 중 한 표에만 있는 열은 그냥 써도 돼요. 아래처럼요!",
        sql: "SELECT order_id, name, ordered_on\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 5",
      },
    ],
    items: [
      {
        type: "choice", concept: "join",
        q: "FROM orders o에서 o는 무엇일까요?",
        options: ["orders 표에 붙인 짧은 별칭", "orders 표의 o라는 열", "주문 상태가 o인 행만 고르라는 뜻"],
        answer: 0,
        explain: "표 이름 뒤에 한 칸 띄고 쓴 이름이 표 별칭이에요. 긴 표 이름 대신 o.order_id처럼 짧게 불러요.",
      },
      {
        type: "choice", concept: "join",
        q: "물건 표와 가게 표를 이은 이 SQL은 어떻게 될까요?",
        code: "SELECT name, price, owner\nFROM items\nJOIN shops\n  ON items.shop_id = shops.shop_id",
        options: ["오류가 난다", "물건 이름이 나온다", "가게 이름이 나온다"],
        answer: 0,
        explain: "name이 items와 shops 두 표에 다 있어서 어느 쪽인지 몰라 단서가 나와요. items.name처럼 표를 밝혀요.",
      },
      {
        type: "choice", concept: "join",
        q: "그 SQL에서 price와 owner는 표를 밝히지 않아도 괜찮은 까닭은?",
        options: ["price는 items에만, owner는 shops에만 있어서", "숫자 열과 사람 이름 열이라서", "SELECT의 첫 열만 표를 밝히면 돼서"],
        answer: 0,
        explain: "이은 표 중 한 표에만 있는 열은 어느 쪽인지 분명해서 그냥 써도 돼요. 두 표에 다 있는 열만 표를 밝혀요.",
      },
      {
        type: "choice", concept: "join",
        q: "이 SQL 결과에서 주문 4번의 name은?",
        code: "SELECT o.order_id, c.name\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 5",
        options: ["손지우", "박서연", "쇠뭉치"],
        answer: 0,
        explain: "주문 4번의 손님 번호는 2라서 2번 손님 손지우가 붙어요. 손지우는 주문 2·3·4번을 했어요.",
      },
      {
        type: "choice", concept: "join",
        q: "FROM orders o로 별칭을 붙였어요. 주문 상태 열은 어떻게 부를까요?",
        options: ["o.status", "orders.o.status", "status.o"],
        answer: 0,
        explain: "별칭.열 차례로 불러요. 별칭을 붙인 뒤에는 그 표를 별칭으로 불러야 해요(orders.status는 단서가 나와요).",
      },
      {
        type: "blank", concept: "joinkey",
        q: "customer_id가 어느 표의 것인지 밝히게 빈자리를 채워 보세요.",
        code: "SELECT o.order_id, c.name\nFROM orders o\nJOIN customers c\n  ON ___ = c.customer_id\nWHERE o.order_id <= 5",
        chips: ["o.customer_id", "customer_id", "o.order_id"],
        answer: 0,
        explain: "주문 쪽 손님 번호 o.customer_id와 맞대요. 표 없이 customer_id만 쓰면 두 표에 다 있어 단서가 나오고, o.order_id는 엉뚱한 짝이에요.",
      },
      {
        type: "blank", concept: "join",
        q: "주문 표에 별칭 o를 붙이게 빈자리를 채워 보세요.",
        code: "SELECT o.order_id, c.name\nFROM orders ___\nJOIN customers c\n  ON o.customer_id = c.customer_id",
        chips: ["o", "c", "orders"],
        answer: 0,
        explain: "o.order_id처럼 부르려면 orders 뒤에 o를 붙여요. c는 이미 손님 표의 별칭이라 겹쳐서 단서가 나와요.",
      },
      {
        type: "order", concept: "join",
        q: "주문 3번까지 손님 이름을 붙이는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT o.order_id, c.name", "FROM orders o", "JOIN customers c", "ON o.customer_id = c.customer_id", "WHERE o.order_id <= 3"],
        explain: "JOIN … ON 덩어리는 FROM 바로 뒤, WHERE는 그 뒤예요. 주문 1번 박서연, 2·3번 손지우가 나와요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "주문 3번까지의 주문에 손님 이름을 붙인 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT o.order_id, c.name\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 3" },
          { sql: "SELECT o.order_id, c.name\nFROM orders o\nJOIN customers c\n  ON o.order_id = c.customer_id\nWHERE o.order_id <= 3" },
          { sql: "SELECT o.order_id, c.village\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 3" },
        ],
        answer: 0, tables: ["orders", "customers"],
        explain: "1번 박서연, 2·3번 손지우인 표예요. 주문 번호와 손님 번호를 맞대면 3번 주문에 쇠뭉치가 붙고, village는 사는 마을이에요.",
      },
      {
        id: "10-2-b1", type: "build", concept: "join",
        q: "물건마다 이름과, 그 물건을 파는 가게 이름을 shop_name이라는 이름으로 보여 줘",
        cards: ["SELECT", "i.name", ",", "s.name", "AS shop_name", "FROM", "items i", "JOIN shops s", "ON", "i.shop_id = s.shop_id"],
        extra: ["i.item_id = s.shop_id", "s.owner"],
        tables: ["items", "shops"],
        hints: [
          "물건 표에 i, 가게 표에 s라는 별칭을 붙여 잇고, 두 name을 별칭으로 가려요.",
          "SELECT 다음에 i.name, 쉼표, s.name, AS shop_name을 놓고, ON 다음에 i.shop_id = s.shop_id예요.",
        ],
        explain: "국밥 옆에 도깨비 국밥집처럼 붙었어요. 두 열이 다 name이라 가게 쪽에 shop_name이란 이름을 붙였어요. 별칭 덕에 SQL이 짧아졌죠?",
      },
      {
        id: "10-2-b2", type: "build", concept: "joinkey",
        q: "주문 번호 10번까지의 주문에 손님 이름을 붙여 줘(주문 번호와 이름)",
        cards: ["SELECT", "o.order_id, c.name", "FROM", "orders o", "JOIN customers c", "ON", "o.customer_id = c.customer_id", "WHERE", "o.order_id <= 10"],
        extra: ["o.order_id = c.customer_id", "o.order_id < 10", "o.order_id, c.village"],
        tables: ["orders", "customers"],
        hints: [
          "주문 표에 손님 표를 잇고 손님 번호로 짝을 지은 뒤, 주문 번호로 걸러요.",
          "SELECT o.order_id, c.name, FROM orders o, JOIN customers c, ON 손님 번호 짝, WHERE o.order_id <= 10이에요.",
        ],
        explain: "10장의 대표 문제예요! 주문 번호 옆에 박서연·손지우 같은 손님 이름이 붙었어요. 손님 번호로 짝을 맞춰 제 손님이 붙었죠? c.village면 이름 대신 마을이 나와요.",
      },
      {
        type: "check", concept: "join",
        q: "10-2에서 배운 것으로 맞는 말은?",
        options: [
          "두 표에 다 있는 열은 표 이름이나 별칭을 붙여 가린다",
          "별칭을 붙이면 장부의 표 이름이 영영 바뀐다",
          "한 표에만 있는 열도 늘 표를 밝혀야 오류가 안 난다",
        ],
        answer: 0,
        explain: "별칭은 그 SQL 안에서만 쓰는 짧은 이름이에요. 겹치는 열만 꼭 표를 밝히고, 한 표에만 있는 열은 그냥 써도 돼요.",
      },
    ],
  },
  {
    id: "10-3", chapter: 10, title: "짝 없는 행, 빠진 ON",
    goal: "짝 없는 행이 빠지는 INNER JOIN과 ON의 쓸모를 안다",
    summary: [
      "JOIN은 INNER JOIN과 같아요",
      "짝 없는 행은 빠져요(남기기는 11장)",
      "ON이 빠지면 모든 짝이 붙어 행이 불어요",
    ],
    cards: [
      {
        say: "JOIN은 INNER JOIN(이너 조인)을 줄인 말로, 짝이 있는 행만 남겨요. 아래는 2번 가게 물건 중 주문 내역과 짝이 맞는 것만 겹침 없이 봤어요. 꿀떡은 한 번도 안 팔려 짝이 없어서 빠졌어요. 짝 없는 행도 남기는 법은 11장에서!",
        sql: "SELECT DISTINCT i.name\nFROM items i\nINNER JOIN order_items oi\n  ON i.item_id = oi.item_id\nWHERE i.shop_id = 2",
      },
      {
        say: "ON이 빠지면? 이 장터에서는 그래도 돌아서, 한 행이 다른 표의 모든 행과 붙어요. 가게 8 × 물건 40 = 320행! 주문 591행과 내역 1,241행이면 73만 행이 넘어요. 어떤 데이터베이스는 ON이 없으면 오류로 알려 줘요.",
        sql: "SELECT COUNT(*) AS n\nFROM shops\nJOIN items",
      },
    ],
    items: [
      {
        type: "choice", concept: "join",
        q: "JOIN과 INNER JOIN의 관계는?",
        options: ["같은 뜻이다(INNER를 빼고 써도 된다)", "INNER JOIN만 짝 없는 행도 남긴다", "INNER JOIN에는 ON을 쓰지 않는다"],
        answer: 0,
        explain: "JOIN이라고만 쓰면 INNER JOIN이에요. 둘 다 짝이 있는 행만 남기고, 둘 다 ON으로 짝을 정해요.",
      },
      {
        type: "choice", concept: "join",
        q: "INNER JOIN에서 짝이 없는 행은 어떻게 될까요?",
        options: ["결과에서 빠진다", "빈칸(NULL)으로 채워져 남는다", "오류가 난다"],
        answer: 0,
        explain: "짝이 없으면 붙일 행이 없어 결과에서 빠져요. 빈칸으로 채워 남기는 건 11장 LEFT JOIN이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "물건과 주문 내역을 이어 겹침 없이 본 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT DISTINCT i.name\nFROM items i\nJOIN order_items oi\n  ON i.item_id = oi.item_id",
        options: ["38행", "40행", "1241행"],
        answer: 0,
        explain: "물건 40가지 중 꿀떡과 보따리는 한 번도 안 팔려 짝이 없어요. 그래서 38행이에요. DISTINCT가 없으면 내역 행 수만큼 나와요.",
      },
      {
        type: "choice", concept: "join",
        q: "손님 표와 주문 표를 JOIN으로 이으면, 주문이 하나도 없는 손님 3명은?",
        options: ["결과에 나오지 않는다", "주문 칸이 빈칸(NULL)으로 나온다", "주문 1건으로 센다"],
        answer: 0, tables: ["customers", "orders"],
        explain: "임바다·표다솜·돌쇠는 주문 표에 짝이 없어 INNER JOIN 결과에서 빠져요. 이런 손님을 찾는 건 11장 대표 문제예요!",
      },
      {
        type: "choice", concept: "join",
        q: "주문 표와 이어서 센 손님 수는?",
        code: "SELECT\n  COUNT(DISTINCT c.customer_id) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id",
        options: ["57", "60", "591"],
        answer: 0,
        explain: "짝이 있는 손님만 남아 57명이에요. 손님은 60명이지만 3명은 주문이 없어요. 591은 주문 행 수예요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "ON 없이 이은 이 SQL이 센 수는?",
        code: "SELECT COUNT(*) AS n\nFROM customers\nJOIN orders",
        options: ["35460", "591", "60"],
        answer: 0,
        explain: "짝 조건이 없어 손님 60명이 주문 591행 모두와 붙었어요. 60 × 591 = 35460행! 이 장터에서는 돌지만 쓸모없는 짝이에요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "ON을 빠뜨리면 왜 행이 불어날까요?",
        options: ["짝 조건이 없어 한 행이 다른 표의 모든 행과 붙어서", "같은 행이 두 번씩 저장돼 있어서", "JOIN이 열을 행으로 바꿔서"],
        answer: 0,
        explain: "어느 행끼리 짝인지 모르면 가능한 짝을 다 붙여요. 그래서 행 수가 두 표 행 수의 곱이 돼요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "ON 없는 JOIN에 대해 맞는 말은?",
        options: [
          "이 장터에서는 돌지만 모든 짝이 붙고, 어떤 데이터베이스는 오류로 막는다",
          "어느 데이터베이스에서나 오류가 난다",
          "어느 데이터베이스에서나 같은 이름의 열로 알아서 짝을 맞춘다",
        ],
        answer: 0,
        explain: "데이터베이스마다 달라요. 이 장터(SQLite)는 받아 주지만 결과가 엄청 커져요. JOIN을 쓰면 늘 ON을 함께 써요.",
      },
      {
        type: "blank", concept: "joinkey",
        q: "가게 번호가 같은 행끼리만 붙게 빈자리를 채워 보세요.",
        code: "SELECT COUNT(*) AS n\nFROM shops s\nJOIN items i\n  ___ s.shop_id = i.shop_id",
        chips: ["ON", "AND", "BY"],
        answer: 0,
        explain: "짝 조건 앞에는 ON을 놓아요. 그러면 320이 아니라 40이 나와요. AND나 BY는 JOIN 뒤 그 자리에 올 수 없어 단서가 나와요.",
      },
      {
        type: "order", concept: "join",
        q: "6번 가게 물건 중 팔린 적 있는 것의 이름을 겹침 없이 보게 줄을 놓아 보세요.",
        lines: ["SELECT DISTINCT i.name", "FROM items i", "INNER JOIN order_items oi", "ON i.item_id = oi.item_id", "WHERE i.shop_id = 6"],
        explain: "갓·담뱃대·복주머니·노리개가 나와요. 보따리는 한 번도 안 팔려 짝이 없어서 빠져요.",
      },
      {
        id: "10-3-b1", type: "build", concept: "join",
        q: "INNER JOIN으로, 팔린 적 있는 물건의 이름을 겹침 없이 보여 줘",
        cards: ["SELECT", "DISTINCT", "i.name", "FROM", "items i", "INNER", "JOIN order_items oi", "ON i.item_id = oi.item_id"],
        extra: ["ON i.item_id = oi.order_id", "i.shop_id"],
        need: ["INNER"],
        tables: ["items", "order_items"],
        hints: [
          "물건 표에 주문 내역 표를 이어 짝이 있는 물건만 남기고, 겹친 이름은 하나로 모아요.",
          "SELECT DISTINCT i.name, FROM items i, INNER, JOIN order_items oi, ON i.item_id = oi.item_id예요.",
        ],
        explain: "38가지예요. 꿀떡과 보따리는 짝이 없어 빠졌어요. 주문 번호와 물건 번호를 맞대면 엉뚱한 물건이 남아요.",
      },
      {
        id: "10-3-b2", type: "build", concept: "joinkey",
        q: "1번 주문에 담긴 물건마다 이름과 수량을 보여 줘",
        cards: ["SELECT", "i.name", ",", "oi.qty", "FROM", "order_items oi", "JOIN items i", "ON oi.item_id = i.item_id", "WHERE", "oi.order_id = 1"],
        extra: ["ON oi.order_id = i.item_id", "oi.item_id"],
        tables: ["order_items", "items"],
        hints: [
          "주문 내역에는 물건 번호만 있어요. 물건 표를 이어 이름을 붙이고, 1번 주문만 남겨요.",
          "FROM order_items oi, JOIN items i, ON oi.item_id = i.item_id, WHERE oi.order_id = 1이에요.",
        ],
        explain: "인절미 1, 노리개 1, 등불 2개예요. 영수증 같죠? ON 카드를 빼면 내역 3행이 물건 40가지와 모두 붙어 120행이 돼요.",
      },
      {
        type: "check", concept: "joinkey",
        q: "10-3에서 배운 것으로 맞는 말은?",
        options: [
          "INNER JOIN은 짝 있는 행만 남기고, ON이 빠지면 모든 짝이 붙는다",
          "INNER JOIN은 짝 없는 행을 빈칸으로 채워 남긴다",
          "ON이 빠지면 결과가 0행이 된다",
        ],
        answer: 0,
        explain: "ON은 짝을 고르는 조건이라, 없으면 고르지 않고 다 붙여요. 행 수가 갑자기 커지면 ON부터 살펴봐요.",
      },
    ],
  },
  {
    id: "10-4", chapter: 10, title: "세 표 잇기와 매출",
    goal: "JOIN을 두 번 이어 세 표로 완료 주문의 매출을 구한다",
    summary: [
      "JOIN … ON을 한 번 더 이으면 세 표!",
      "매출 = 완료 주문의 수량 × 값의 합",
      "장터 전체 매출은 57487엽전",
    ],
    cards: [
      {
        say: "드디어 7장 「장터 전체 매출」을 완성해요! 수량은 주문 내역, 값은 물건, 상태는 주문 표에 있어요. JOIN을 두 번 이어 세 표를 붙이고 완료만 더하면 57487엽전! sales는 매출이라는 뜻이에요. 7장의 1882개는 취소까지 센 개수였어요.",
        sql: "SELECT SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nJOIN orders o\n  ON oi.order_id = o.order_id\nWHERE o.status = '완료'",
      },
      {
        say: "8장 「가게별 매출」도 마저 해요. 가게마다 묶으면 1만 엽전 넘는 곳은 7·8번뿐! 8장의 재고 값어치로는 6·7·8번이었죠? 6번은 재고 값어치가 10525엽전이지만 실제로 판 엽전은 8738이에요.",
        sql: "SELECT i.shop_id,\n  SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nJOIN orders o\n  ON oi.order_id = o.order_id\nWHERE o.status = '완료'\nGROUP BY i.shop_id\nORDER BY sales DESC, i.shop_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "join",
        q: "매출(엽전)을 구하려면 어느 표들이 필요할까요?",
        options: ["order_items(수량), items(값), orders(상태)", "order_items 하나", "items와 shops"],
        answer: 0,
        explain: "수량은 주문 내역에, 값은 물건 표에, 완료·취소는 주문 표에 있어요. 셋을 이어야 완료 주문의 수량 × 값을 더할 수 있어요.",
      },
      {
        type: "choice", concept: "join",
        q: "세 표를 이으려면 JOIN … ON을 몇 번 쓸까요?",
        options: ["두 번", "세 번", "한 번"],
        answer: 0,
        explain: "FROM에 첫 표를 두고, JOIN … ON으로 둘째 표, 또 JOIN … ON으로 셋째 표를 이어요. 표가 하나 늘 때마다 JOIN … ON 하나!",
      },
      {
        type: "order", concept: "join",
        q: "1번 주문의 물건마다 수량 × 값을 보게 줄을 놓아 보세요.",
        lines: ["SELECT i.name,", "qty * price AS amount", "FROM order_items oi", "JOIN items i", "ON oi.item_id = i.item_id", "WHERE oi.order_id = 1"],
        expect: "name | amount\n인절미 | 6\n노리개 | 45\n등불 | 48",
        explain: "등불은 2개 × 24엽전이라 48이에요. qty와 price는 한 표에만 있어 표를 안 밝혀도 돼요. 이 값들을 모두 더한 게 매출이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "장터 전체 매출(완료 주문)은?",
        code: "SELECT SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nJOIN orders o\n  ON oi.order_id = o.order_id\nWHERE o.status = '완료'",
        options: ["57487", "64024", "1882"],
        answer: 0,
        explain: "완료 주문의 수량 × 값을 모두 더해 57487엽전이에요. 64024는 취소까지 더한 값, 1882는 7장에서 센 수량이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "그 SQL에서 WHERE o.status = '완료'를 빼면 어떻게 될까요?",
        options: ["취소된 주문까지 더해져 64024엽전이 된다", "57487엽전 그대로다", "orders 표를 못 써서 오류가 난다"],
        answer: 0,
        explain: "취소된 주문 49건의 물건 값 6537엽전이 더해져 64024가 돼요. 팔리지 않은 엽전이니 매출에서 빼야 해요.",
      },
      {
        type: "choice", concept: "join",
        q: "7장의 1882개(주문된 수량 합)를 완료 주문만으로 세면?",
        options: ["1712개", "1882개", "170개"],
        answer: 0,
        explain: "주문 표를 이어 완료만 남기면 1712개예요. 1882는 취소까지 센 수, 170은 취소된 주문의 수량이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "8장에선 재고 값어치로 1만 엽전 넘는 가게가 6·7·8번이었어요. 매출로 고르면?",
        options: ["7·8번", "6·7·8번", "6번만"],
        answer: 0,
        explain: "매출은 7번 13440, 8번 11030엽전이고 6번은 8738이에요. 남은 물건 값과 판 엽전은 달라요.",
      },
      {
        type: "choice", concept: "join",
        q: "가게마다 완료 주문의 매출을 구한 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT i.shop_id,\n  SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nJOIN orders o\n  ON oi.order_id = o.order_id\nWHERE o.status = '완료'\nGROUP BY i.shop_id" },
          { sql: "SELECT i.shop_id,\n  SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nGROUP BY i.shop_id" },
          { sql: "SELECT shop_id,\n  SUM(price * stock) AS sales\nFROM items\nGROUP BY shop_id" },
        ],
        answer: 0, tables: ["order_items", "items", "orders"],
        explain: "1번 4436, 7번 13440엽전인 표가 정답이에요. 주문 표를 안 이으면 취소까지 더해지고, 값 × 재고는 8장의 재고 값어치예요.",
      },
      {
        type: "blank", concept: "joinkey",
        q: "주문 내역에 물건 값이 짝 맞게 붙도록 빈자리를 채워 보세요.",
        code: "SELECT SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = ___\nJOIN orders o\n  ON oi.order_id = o.order_id\nWHERE o.status = '완료'",
        chips: ["i.item_id", "i.shop_id", "oi.item_id"],
        answer: 0,
        explain: "주문 내역의 물건 번호와 물건 표의 물건 번호를 맞대요. shop_id와 맞대면 엉뚱한 물건이, oi.item_id끼리면 모든 물건이 붙어요.",
      },
      {
        type: "choice", concept: "join",
        q: "가게별 매출에서 1만 엽전 넘는 가게만 남기려면 GROUP BY i.shop_id 뒤에?",
        options: ["HAVING SUM(qty * price) > 10000", "WHERE SUM(qty * price) > 10000", "ORDER BY sales DESC"],
        answer: 0,
        explain: "묶은 뒤의 셈으로 거르는 건 8장의 HAVING이에요. WHERE에는 모아 세기를 못 쓰고, ORDER BY는 줄만 세워요.",
      },
      {
        id: "10-4-b1", type: "build", concept: "join",
        q: "장터 전체 매출(완료 주문의 수량 × 값의 합)을 sales라는 이름으로 보여 줘",
        cards: ["SELECT", "SUM(oi.qty * i.price) AS sales", "FROM", "order_items oi", "JOIN items i", "ON oi.item_id = i.item_id", "JOIN orders o", "ON oi.order_id = o.order_id", "WHERE", "o.status = '완료'"],
        extra: ["o.status = '취소'", "SUM(oi.qty) AS sales"],
        tables: ["order_items", "items", "orders"],
        hints: [
          "수량·값·상태가 세 표에 나뉘어 있어요. 주문 내역에 물건 표와 주문 표를 차례로 이어요.",
          "JOIN items i와 ON 조건, JOIN orders o와 ON 조건을 잇고 WHERE o.status = '완료'로 걸러요.",
        ],
        explain: "7장의 대표 문제 「장터 전체 매출」을 드디어 완성했어요! 57487엽전! '취소'면 6537엽전, SUM(oi.qty)면 개수 1712예요.",
      },
      {
        id: "10-4-b2", type: "build", concept: "joinkey",
        q: "완료된 주문에서 팔린 물건 수량의 합을 total_qty라는 이름으로 보여 줘",
        cards: ["SELECT", "SUM(oi.qty) AS total_qty", "FROM", "order_items oi", "JOIN orders o", "ON oi.order_id = o.order_id", "WHERE", "o.status = '완료'"],
        extra: ["o.status = '취소'", "COUNT(*) AS total_qty", "ON oi.order_id = o.customer_id"],
        tables: ["order_items", "orders"],
        hints: [
          "수량은 주문 내역에, 완료·취소는 주문 표에 있어요. 주문 번호로 짝을 지어요.",
          "FROM order_items oi, JOIN orders o, ON oi.order_id = o.order_id, WHERE o.status = '완료'예요.",
        ],
        explain: "1712개예요. 7장의 1882개에서 취소된 170개가 빠졌어요. COUNT(*)면 내역 행 수 1133이에요.",
      },
      {
        type: "check", concept: "join",
        q: "10-4에서 배운 것으로 맞는 말은?",
        options: [
          "JOIN … ON을 이어 붙여 세 표 이상도 이을 수 있다",
          "JOIN은 한 SQL에 한 번만 쓸 수 있다",
          "매출은 items 표 하나로 구할 수 있다",
        ],
        answer: 0,
        explain: "표가 늘 때마다 JOIN … ON을 하나씩 더해요. 나뉘어 있던 수량·값·상태를 이어서 진짜 매출이 나왔어요.",
      },
    ],
  },
  {
    id: "10-5", chapter: 10, title: "10장 평가", isExam: true,
    goal: "JOIN … ON으로 표를 잇고 별칭으로 가려 매출까지 구할 수 있다",
    summary: [
      "JOIN 표 ON 짝 조건, 짝 없는 행은 빠져요",
      "겹치는 열은 표.열이나 별칭.열로",
      "ON이 빠지면 모든 짝이 붙어요",
    ],
    cards: [
      {
        say: "10장 정리! JOIN … ON으로 짝 맞춰 잇고, 겹치는 열은 별칭으로 가리고, 세 표를 이어 매출 57487엽전까지 구했어요. 아래는 대표 문제 「주문에 손님 이름 붙이기」예요. 같이 풀어 봐요!",
        sql: "SELECT o.order_id, c.name, o.status\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 5",
      },
    ],
    items: [
      {
        type: "choice", concept: "joinkey",
        q: "JOIN … ON에서 ON이 하는 일은?",
        options: ["어느 행끼리 짝인지 정한다", "결과를 줄 세운다", "이을 표의 이름을 정한다"],
        answer: 0,
        explain: "ON 뒤의 조건이 짝을 정해요. 이을 표는 JOIN 뒤에, 줄 세우기는 ORDER BY예요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "orders와 customers를 이을 때 짝 맞출 열은?",
        options: ["customer_id", "order_id", "name"],
        answer: 0, tables: ["orders", "customers"],
        explain: "두 표가 함께 가진 손님 번호 customer_id예요. order_id는 주문 표에만, name은 손님 표에만 있어요.",
      },
      {
        type: "choice", concept: "join",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT customer_id, name\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id",
        options: ["오류가 난다", "손님 번호와 이름이 나온다", "주문 번호와 이름이 나온다"],
        answer: 0,
        explain: "SELECT의 customer_id가 두 표에 다 있어 어느 쪽인지 몰라 단서가 나와요. o.customer_id나 c.customer_id로 밝혀요.",
      },
      {
        type: "choice", concept: "join",
        q: "FROM items i JOIN shops s …에서 s.owner는?",
        options: ["shops 표의 owner 열", "items 표의 owner 열", "s라는 새 표의 owner 열"],
        answer: 0,
        explain: "s는 shops 표에 붙인 별칭이에요. 별칭은 그 SQL 안에서만 쓰는 짧은 이름이라 새 표가 생기지 않아요.",
      },
      {
        type: "choice", concept: "join",
        q: "이 SQL 결과에서 주문 5번의 name은?",
        code: "SELECT o.order_id, c.name, o.status\nFROM orders o\nJOIN customers c\n  ON o.customer_id = c.customer_id\nWHERE o.order_id <= 5",
        options: ["쇠뭉치", "손지우", "완료"],
        answer: 0,
        explain: "주문 5번은 3번 손님 쇠뭉치의 주문이에요. 손지우는 2~4번 주문의 손님, 완료는 status 열 값이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "items와 order_items를 INNER JOIN으로 이으면, 한 번도 안 팔린 꿀떡은?",
        options: ["결과에서 빠진다", "qty가 0으로 나온다", "qty가 빈칸(NULL)으로 나온다"],
        answer: 0,
        explain: "INNER JOIN은 짝 있는 행만 남겨요. 꿀떡은 주문 내역에 짝이 없어 빠져요. 빈칸으로 남기는 건 11장이에요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "ON 없이 이은 이 SQL이 센 수는?",
        code: "SELECT COUNT(*) AS n\nFROM shops\nJOIN items",
        options: ["320", "40", "8"],
        answer: 0,
        explain: "이 장터에서는 ON이 없어도 돌아서 가게 8곳이 물건 40가지 모두와 붙어요. 8 × 40 = 320! ON이 있으면 40이에요.",
      },
      {
        type: "choice", concept: "joinkey",
        q: "1번 주문에 담긴 물건 이름과 수량을 보인 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT i.name, oi.qty\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nWHERE oi.order_id = 1" },
          { sql: "SELECT i.name, oi.qty\nFROM order_items oi\nJOIN items i\n  ON oi.order_id = i.item_id\nWHERE oi.order_id = 1" },
          { sql: "SELECT i.name, oi.qty\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nWHERE oi.order_id = 2" },
        ],
        answer: 0,
        explain: "인절미 1, 노리개 1, 등불 2인 표예요. 주문 번호와 물건 번호를 맞대면 국밥만 세 번, 2번 주문이면 송편·오미자청이에요.",
      },
      {
        type: "choice", concept: "join",
        q: "장터 전체 매출(완료 주문의 수량 × 값의 합)은?",
        options: ["57487엽전", "64024엽전", "1882엽전"],
        answer: 0,
        explain: "세 표를 이어 완료만 더하면 57487엽전이에요. 64024는 취소까지 더한 값, 1882는 엽전이 아니라 수량이에요.",
      },
      {
        type: "blank", concept: "join",
        q: "셋째 표 orders를 잇게 빈자리를 채워 보세요.",
        code: "SELECT SUM(oi.qty * i.price) AS sales\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\n___ orders o\n  ON oi.order_id = o.order_id\nWHERE o.status = '완료'",
        chips: ["JOIN", "ON", "WHERE"],
        answer: 0,
        explain: "표가 하나 늘 때마다 JOIN … ON을 하나 더해요. ON이나 WHERE 뒤에는 표가 아니라 조건이 와서 단서가 나와요.",
      },
      {
        type: "order", concept: "join",
        q: "약재 가게 물건마다 이름과 가게 주인을 보게 줄을 놓아 보세요.",
        lines: ["SELECT i.name, s.owner", "FROM items i", "JOIN shops s", "ON i.shop_id = s.shop_id", "WHERE s.category = '약재'"],
        explain: "산삼 같은 3번 가게 물건엔 한약수, 도라지 같은 4번 가게 물건엔 송약초가 붙어요. JOIN … ON 다음에 WHERE예요.",
      },
      {
        id: "10-5-b1", type: "build", concept: "joinkey",
        q: "주문 번호 10번까지의 주문에 손님 이름을 붙여 줘(주문 번호와 이름)",
        cards: ["SELECT", "o.order_id, c.name", "FROM", "orders o", "JOIN customers c", "ON", "o.customer_id = c.customer_id", "WHERE", "o.order_id <= 10"],
        extra: ["c.customer_id = o.order_id", "o.order_id >= 10", "o.order_id, c.village"],
        tables: ["orders", "customers"],
        hints: [
          "주문 표에 손님 표를 잇고, 두 표가 함께 가진 손님 번호로 짝을 지어요.",
          "SELECT o.order_id, c.name, FROM orders o, JOIN customers c, ON 손님 번호 짝, WHERE o.order_id <= 10이에요.",
        ],
        explain: "10장의 대표 문제를 다시 풀었어요! 주문 10건 옆에 박서연·손지우·쇠뭉치·여름이가 붙었어요. 손님 번호끼리 맞대야 제 손님이 붙어요.",
      },
      {
        id: "10-5-b2", type: "build", concept: "join",
        q: "3번 주문에 담긴 물건마다 이름과, 수량 × 값을 amount라는 이름으로 보여 줘",
        cards: ["SELECT", "i.name", ",", "oi.qty * i.price AS amount", "FROM", "order_items oi", "JOIN items i", "ON oi.item_id = i.item_id", "WHERE", "oi.order_id = 3"],
        extra: ["oi.qty + i.price AS amount", "oi.order_id = 2"],
        tables: ["order_items", "items"],
        hints: [
          "주문 내역에 물건 표를 이어 값을 붙이고, 3번 주문만 남겨 수량과 값을 곱해요.",
          "i.name 쉼표 다음에 oi.qty * i.price AS amount, JOIN items i와 ON 조건, WHERE oi.order_id = 3이에요.",
        ],
        explain: "송편 3개 × 7엽전 = 21, 담뱃대 1개 × 33엽전 = 33이에요. 이런 줄을 완료 주문 모두에서 더한 게 매출이에요.",
      },
      {
        id: "10-5-b3", type: "build", concept: "join",
        q: "취소된 주문에 담겼던 물건의 수량 × 값 합을 sales라는 이름으로 보여 줘",
        cards: ["SELECT", "SUM(oi.qty * i.price) AS sales", "FROM", "order_items oi", "JOIN items i", "ON oi.item_id = i.item_id", "JOIN orders o", "ON oi.order_id = o.order_id", "WHERE", "o.status = '취소'"],
        extra: ["o.status = '완료'", "ON oi.order_id = o.customer_id"],
        tables: ["order_items", "items", "orders"],
        hints: [
          "매출과 같은 세 표 잇기예요. 다른 것은 어느 상태의 주문만 남기는지예요.",
          "JOIN items i와 ON 조건, JOIN orders o와 ON 조건 다음에 WHERE o.status = '취소'예요.",
        ],
        explain: "6537엽전이에요. 완료 매출 57487과 더하면 64024! 주문 번호와 손님 번호를 맞대면 엉뚱한 주문이 붙어요.",
      },
      {
        type: "check", concept: "join",
        q: "10장에서 배운 것으로 맞는 말은?",
        options: [
          "JOIN … ON으로 나뉜 표를 짝 맞춰 이어, 한 표로는 못 구하던 값을 구한다",
          "JOIN은 짝이 없는 행도 모두 남긴다",
          "두 표에 다 있는 열은 표를 밝히지 않아도 앞 표의 것으로 정해진다",
        ],
        answer: 0,
        explain: "표를 이어 손님 이름도 붙이고 진짜 매출도 구했어요. 실무에서는 쇼핑몰의 주문 표·회원 표·상품 표를 이렇게 이어 회원별·상품별 매출 보고서를 만들어요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 10장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - S: 가게 1~8(가게마다 물건 5가지). 오답 칩 WHERE·AND는 JOIN 뒤 그 자리에서 오류.
// - C: 가게 종류 4가지(각 2곳, 물건 10가지). 짝을 item_id = shop_id로 잘못 맞추면 1~8번 물건 중 2가지만 남고,
//   ON이 빠지면 2곳 × 40가지 = 80행이라 늘 다르다.
// - 10-T3: 가게 S 물건이 팔린 수량 합(취소 포함)·내역 행 수·S번 물건 하나의 수량은 가게마다 모두 다르다
//   (수량 336·291·321·339·256·210·68·61, 행 수 209·186·203·221·175·134·60·53, 물건 1~8번 91·90·84·45·26·108·67·70).
export const TEMPLATES = [
  {
    id: "10-T1", concept: "joinkey", type: "blank",
    q: "{S}번 가게 물건 옆에 가게 주인이 붙게 빈자리를 채워 보세요.",
    sql: "SELECT i.name, s.owner\nFROM items i\nJOIN shops s\n  ___ i.shop_id = s.shop_id\nWHERE i.shop_id = {S}",
    chips: ["ON", "WHERE", "AND"],
    answer: 0,
    vars: { S: { min: 1, max: 8 } },
    explain: "JOIN 뒤 짝 조건 앞에는 ON을 놓아요. 가게 번호가 같은 행끼리 붙어요.",
  },
  {
    id: "10-T2", concept: "join", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT i.name, s.owner\nFROM items i\nJOIN shops s\n  ON i.shop_id = s.shop_id\nWHERE s.category = '{C}'",
    wrong: [
      "SELECT i.name, s.owner\nFROM items i\nJOIN shops s\n  ON i.item_id = s.shop_id\nWHERE s.category = '{C}'",
      "SELECT i.name, s.owner\nFROM items i\nJOIN shops s\nWHERE s.category = '{C}'",
    ],
    vars: { C: ["먹거리", "약재", "잡화", "공방"] },
    explain: "가게 번호로 짝을 맞춰 {C} 가게의 물건 10가지와 주인이 나와요. 짝 열이 틀리거나 ON이 빠지면 엉뚱한 짝이 붙어요.",
  },
  {
    id: "10-T3", concept: "join", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT SUM(oi.qty) AS total_qty\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nWHERE i.shop_id = {S}",
    wrong: [
      "SELECT COUNT(*) AS total_qty\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nWHERE i.shop_id = {S}",
      "SELECT SUM(oi.qty) AS total_qty\nFROM order_items oi\nJOIN items i\n  ON oi.item_id = i.item_id\nWHERE i.item_id = {S}",
    ],
    vars: { S: { min: 1, max: 8 } },
    explain: "물건 표를 이어 {S}번 가게 물건의 주문 내역만 남기고 수량을 더해요(취소된 주문 포함). COUNT(*)면 내역 행 수예요.",
  },
];

// ---- 10장 심화 (v0.4, 쓰기 안내 13절 · 디딤돌 docs/specs/2026-11-18-심화-7-12장-디딤돌.md §2 10장) ----
// - 쓸 수 있는 것: 1~10장 낱말(10장 심화 전용 낱말 없음). 조립은 본 과정 10장과 같다(R45: 표와 별칭 한 장, ON 조건 한 장, 30칸을 넘으면
//   "ON"과 조건 둘). "ON c.customer_id = o.customer_id"는 32칸이라 늘 둘로 나눈다. 레슨마다 build 2개.
// - 10-A1 셀프 조인: items a·b, a.shop_id = b.shop_id는 가게마다 5 × 5 = 25짝, 모두 200행(자기 자신 포함).
//   국밥보다 싼 같은 가게 물건 도토리묵·막걸리·메밀전, 수육보다 싼 것 국밥·도토리묵·막걸리·메밀전(<=면 수육까지 5), 갓보다 싼 것 노리개·담뱃대·보따리·복주머니,
//   산삼보다 싼 것 4(> 0행, = 산삼 하나). 같은 날 처음 온 손님 짝 8(<> 16, 조건 없으면 76). 나이가 같은 손님 짝 23(나이 모르는 손님은 짝이 되지 않음).
//   ON에 AND로 짝 조건을 더하는 것은 본 과정 11-4가 뒷장이라 카드 2에서 처음부터 가르친다(통제자 판정: 새 낱말 없는 JOIN 주제의 심화).
// - 10-A2 이은 표의 열로 묶기(주제 바꿈, 디딤돌 §4: 10-4가 JOIN + GROUP BY i.shop_id를 이미 보임):
//   손님 종류마다 주문 도깨비 293·사람 203·여우 95, 마을마다 큰바위마을 123·은행나무마을 103·솔바위골 90·개울마을 86·느티나무골 62·
//   버드나무고개 49·여우고개 40·달빛마을 38. 취소 주문 마을 은행나무마을 11·느티나무골 10·큰바위마을 9·솔바위골 7·개울마을 5·여우고개 4·
//   버드나무고개 2·달빛마을 1(>= 9 → 3곳). 가게 분류 평균 값 공방 243·먹거리 9.9·약재 32.5·잡화 32.7, MAX 400·25·120·110, MIN 130·5·12·6.
// - 10-A3 의뢰: 달빛마을 도래미(customers 38번) 손님. 사연은 꾸민 이야기. 주문 22건 모두 완료(취소 0), 내역 41줄, 수량 59, 수량 × 값 1625엽전.
//   264번 주문: 감초 1 × 12, 수육 1 × 25, 인삼차 2 × 30.
// - 헷갈림 카드는 모두 레슨이 설명한 까닭으로 틀린다(짝 조건이 다름, 다른 표의 번호와 맞댐, 셈이 다름). 묶지 않은 열이 묶음 안 아무 행을 보이는 것에
//   기대는 헷갈림은 쓰지 않는다(통제자 판정).
export const ADVANCED = [
  {
    id: "10-A1", chapter: 10, isAdvanced: true, title: "같은 표 두 번 잇기",
    goal: "한 표에 별칭 둘을 붙여 이어 같은 표의 행끼리 견준다",
    summary: [
      "items a JOIN items b = 같은 표 두 벌",
      "별칭으로 어느 쪽 열인지 가려요",
      "짝 조건 둘은 ON 뒤에 AND로 이어요",
    ],
    cards: [
      {
        say: "10장에서 두 표를 별칭으로 이었죠? 오늘은 한 걸음 더, 같은 표를 두 번 이어요. items에 별칭 a와 b를 붙이면 장부 두 벌처럼 써요. a는 국밥 행, b는 같은 가게 물건이에요. 국밥보다 싼 같은 가게 물건 셋!",
        sql: "SELECT b.name, b.price\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id\nWHERE a.name = '국밥'\n  AND b.price < a.price",
      },
      {
        say: "짝 조건이 둘이면 ON 뒤에 AND로 이어요. WHERE에서 AND를 쓰듯이요. 같은 날 처음 온 손님 짝을 찾는데, a.customer_id < b.customer_id를 더해 자기 자신과의 짝과 앞뒤만 바뀐 짝을 뺐어요. 8짝!",
        sql: "SELECT a.name, b.name AS partner,\n  a.first_visit\nFROM customers a\nJOIN customers b\n  ON a.first_visit = b.first_visit\n  AND a.customer_id < b.customer_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_self_join",
        q: "FROM items a JOIN items b에서 a와 b는 무엇일까요?",
        options: ["같은 물건 표에 붙인 별칭 둘(장부 두 벌처럼 씀)", "서로 다른 두 표", "items 표의 a 열과 b 열"],
        answer: 0,
        explain: "표는 하나지만 별칭이 둘이라 두 벌처럼 이어요. a.price는 a 쪽 행의 값, b.price는 b 쪽 행의 값이에요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "같은 표를 두 번 이을 때 별칭이 꼭 있어야 하는 까닭은?",
        options: [
          "열이 어느 쪽 행의 것인지 가려야 해서",
          "별칭이 없으면 표가 두 개로 늘어나서",
          "별칭이 있어야 ON을 쓸 수 있어서",
        ],
        answer: 0,
        explain: "두 벌이 열 이름이 모두 같아요. 10-2에서 겹치는 열은 표를 밝혔듯, 여기서는 a.·b.로 어느 쪽인지 밝혀요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "갓보다 싼, 갓과 같은 가게 물건을 찾은 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT b.name\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id\nWHERE a.name = '갓'\n  AND b.price < a.price",
        options: ["4행", "5행", "1행"],
        answer: 0,
        explain: "바람 보따리 물건 5가지 중 갓(110엽전)보다 싼 노리개·담뱃대·보따리·복주머니, 4행이에요. 갓 자신은 같은 값이라 빠져요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "같은 가게끼리만 이은 이 SQL이 센 수는?",
        code: "SELECT COUNT(*) AS n\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id",
        options: ["200", "40", "1600"],
        answer: 0,
        explain: "가게마다 물건 5 × 5 = 25짝, 가게 8곳이라 200행이에요. 자기 자신과의 짝도 들어 있어요. ON이 없으면 40 × 40 = 1600이에요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "b.price < a.price 조건이 없으면 국밥 행(a)에 붙는 b는?",
        options: ["국밥 자신을 포함한 1번 가게 물건 5가지", "국밥보다 싼 물건만", "아무것도 붙지 않는다"],
        answer: 0,
        explain: "짝 조건은 같은 가게뿐이라 같은 가게 물건이 모두 붙어요. 자기 자신도 같은 가게라서 붙어요. 값 견주기 조건이 있어야 걸러져요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "손님 짝을 찾을 때 ON에 AND a.customer_id < b.customer_id를 더하는 까닭은?",
        options: [
          "자기 자신과의 짝과, 앞뒤만 바뀌어 두 번 나오는 짝을 빼려고",
          "번호가 작은 손님만 결과에 남기려고",
          "ON에는 조건이 둘 있어야 해서",
        ],
        answer: 0,
        explain: "무쇠·바람돌이와 바람돌이·무쇠는 같은 짝이에요. 번호가 작은 쪽을 a로 정하면 한 번씩만, 자기 자신과는 짝이 안 돼요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "< 대신 <>로 이은 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT a.name, b.name AS partner\nFROM customers a\nJOIN customers b\n  ON a.first_visit = b.first_visit\n  AND a.customer_id <> b.customer_id",
        options: ["16행", "8행", "76행"],
        answer: 0,
        explain: "자기 자신과의 짝은 빠졌지만 짝마다 앞뒤를 바꾼 것이 한 번 더 나와 8 × 2 = 16행이에요. AND 조건이 없으면 자기 자신까지 붙어 76행이에요.",
      },
      {
        type: "blank", concept: "adv_self_join",
        q: "산삼보다 싼, 산삼과 같은 가게 물건이 나오게 빈자리를 채워 보세요.",
        code: "SELECT b.name\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id\nWHERE a.name = '산삼'\n  AND b.price ___ a.price",
        chips: ["<", ">", "="],
        answer: 0,
        explain: "b가 a(산삼)보다 싸야 하니 <예요. 산삼 약방 나머지 4가지가 나와요. >면 산삼보다 비싼 게 없어 0행, =면 산삼 자신이에요.",
      },
      {
        type: "order", concept: "adv_self_join",
        q: "나이가 같은 손님 짝을 한 번씩 보게 줄을 놓아 보세요.",
        lines: ["SELECT a.name, b.name AS partner", "FROM customers a", "JOIN customers b", "ON a.age = b.age", "AND a.customer_id < b.customer_id"],
        explain: "나이가 같은 짝 23쌍이에요. 짝 조건 둘은 ON 뒤에 AND로 이어요. 나이 모르는 손님은 = 비교에 걸리지 않아 짝이 되지 않아요.",
      },
      {
        type: "choice", concept: "adv_self_join",
        q: "수육보다 싼, 수육과 같은 가게 물건의 이름을 보인 결과는?",
        options: [
          { sql: "SELECT b.name\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id\nWHERE a.name = '수육'\n  AND b.price < a.price" },
          { sql: "SELECT b.name\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id\nWHERE a.name = '수육'\n  AND b.price <= a.price" },
          { sql: "SELECT a.name\nFROM items a\nJOIN items b\n  ON a.shop_id = b.shop_id\nWHERE a.name = '수육'\n  AND b.price < a.price" },
        ],
        answer: 0, tables: ["items"],
        explain: "국밥·도토리묵·막걸리·메밀전 4행이 정답이에요. <=면 수육 자신까지 5행, a.name을 보이면 수육만 네 번 나와요.",
      },
      {
        id: "10-A1-b1", type: "build", concept: "adv_self_join",
        q: "갓보다 싼, 갓과 같은 가게 물건의 이름을 보여 줘",
        cards: ["SELECT", "b.name", "FROM", "items a", "JOIN items b", "ON a.shop_id = b.shop_id", "WHERE", "a.name = '갓'", "AND", "b.price < a.price"],
        extra: ["b.price > a.price", "a.name"],
        tables: ["items"],
        hints: [
          "물건 표를 a·b 두 벌로 같은 가게끼리 잇고, a를 갓으로 정한 뒤 b가 더 싼 것만 남겨요.",
          "JOIN items b, ON a.shop_id = b.shop_id, WHERE a.name = '갓' AND b.price < a.price예요.",
        ],
        explain: "노리개·담뱃대·보따리·복주머니예요. >면 갓보다 비싼 게 없어 0행, a.name을 보이면 갓만 네 번 나와요.",
      },
      {
        id: "10-A1-b2", type: "build", concept: "adv_self_join",
        q: "같은 날 처음 온 손님 짝을 한 번씩만 보여 줘(이름과 짝 partner)",
        cards: ["SELECT", "a.name, b.name AS partner", "FROM", "customers a", "JOIN customers b", "ON", "a.first_visit = b.first_visit", "AND", "a.customer_id < b.customer_id"],
        extra: ["a.customer_id <> b.customer_id", "a.village = b.village"],
        tables: ["customers"],
        hints: [
          "손님 표를 두 벌로 처음 온 날이 같은 행끼리 잇고, 번호가 작은 쪽을 a로 정해요.",
          "ON 뒤에 날짜 조건, AND 뒤에 a.customer_id < b.customer_id를 놓아요.",
        ],
        explain: "8짝이에요. <>면 앞뒤를 바꾼 짝이 또 나와 16행, 마을로 맞대면 같은 날이 아니라 같은 마을 짝이에요.",
      },
      {
        type: "check", concept: "adv_self_join",
        q: "같은 표 두 번 잇기에 대해 맞는 말은?",
        options: [
          "별칭 둘로 같은 표를 잇고, 짝 조건이 둘이면 ON 뒤에 AND로 잇는다",
          "같은 표는 한 SQL에서 두 번 쓸 수 없다",
          "같은 표를 이으면 자기 자신과의 짝은 저절로 빠진다",
        ],
        answer: 0,
        explain: "a·b 두 벌을 같은 가게·같은 날로 이어 행끼리 견줬어요. 자기 자신과의 짝은 저절로 빠지지 않으니 조건으로 빼요.",
      },
    ],
  },
  {
    id: "10-A2", chapter: 10, isAdvanced: true, title: "이은 표의 열로 묶기",
    goal: "이어 온 표에만 있는 열로 묶고 HAVING으로 거른다",
    summary: [
      "묶을 열이 다른 표에 있으면 먼저 이어요",
      "JOIN 뒤 GROUP BY 이은 표.열",
      "묶은 뒤 거르기는 HAVING",
    ],
    cards: [
      {
        say: "10-4에서 가게별 매출을 묶었죠? 그때 묶은 i.shop_id는 물건 표에 있었어요. 오늘은 한 걸음 더, 이어 온 표에만 있는 열로 묶어요. 주문 표엔 손님 종류가 없지만, 손님 표를 이으면 c.kind로 주문을 묶어요.",
        sql: "SELECT c.kind, COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nGROUP BY c.kind",
      },
      {
        say: "묶은 다음 8장 HAVING으로 걸러요. 차례는 그대로예요: 잇고, WHERE로 행을 거르고, 묶고, HAVING으로 묶음을 걸러요. 취소 주문이 9건 이상인 마을, 셋이에요.",
        sql: "SELECT c.village, COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nWHERE o.status = '취소'\nGROUP BY c.village\nHAVING COUNT(*) >= 9",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_join_group",
        q: "주문을 손님 마을로 묶으려면 손님 표를 이어야 하는 까닭은?",
        options: ["마을(village)은 손님 표에만 있어서", "주문 표가 너무 커서", "GROUP BY는 JOIN이 있을 때만 쓸 수 있어서"],
        answer: 0,
        explain: "주문 표에는 손님 번호뿐이에요. 번호로 손님 표를 이어야 c.village가 생기고, 그 열로 묶을 수 있어요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "카드 1의 SQL 결과에서 도깨비 묶음의 n은?",
        code: "SELECT c.kind, COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nGROUP BY c.kind",
        options: ["293", "24", "591"],
        answer: 0,
        explain: "도깨비 손님들이 한 주문 293건이에요. 24는 도깨비 손님 수, 591은 주문 전체예요. 이어서 주문마다 한 행이라 주문을 세요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "주문을 손님 마을로 묶은 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT c.village, COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nGROUP BY c.village",
        options: ["8행", "591행", "60행"],
        answer: 0,
        explain: "마을이 8곳이라 8행이에요. 주문 591건이 마을마다 하나로 모였어요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "큰바위마을 손님들의 주문 수, 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nWHERE c.village = '큰바위마을'",
        options: ["123", "11", "591"],
        answer: 0,
        explain: "큰바위마을 손님 11명의 주문이 123건이에요. 마을마다 묶은 결과의 큰바위마을 n과 같아요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "카드 2의 SQL은 몇 행일까요?",
        code: "SELECT c.village, COUNT(*) AS n\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nWHERE o.status = '취소'\nGROUP BY c.village\nHAVING COUNT(*) >= 9",
        options: ["3행", "8행", "1행"],
        answer: 0,
        explain: "취소가 은행나무마을 11, 느티나무골 10, 큰바위마을 9건이라 3행이에요. WHERE는 묶기 전 취소 주문만, HAVING은 묶은 뒤 9건 이상만 남겨요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "GROUP BY s.category를 쓴 SQL의 SELECT에 i.name을 그냥 놓으면?",
        options: [
          "이 장터에서는 돌지만 많은 데이터베이스에서 오류라 쓰지 않는다",
          "분류마다 물건 이름이 모두 나온다",
          "분류마다 가장 비싼 물건 이름이 나온다",
        ],
        answer: 0,
        explain: "표를 이어도 8장 규칙은 그대로예요. 한 분류에 물건이 10가지라 이름 하나로 정해지지 않아요. SELECT에는 묶은 열과 셈만!",
      },
      {
        type: "blank", concept: "adv_join_group",
        q: "가게 분류마다 가장 비싼 물건 값이 나오게 빈자리를 채워 보세요.",
        code: "SELECT s.category,\n  MAX(i.price) AS top\nFROM items i\nJOIN shops s\n  ON i.shop_id = s.shop_id\nGROUP BY ___",
        chips: ["s.category", "i.shop_id", "top"],
        answer: 0,
        explain: "SELECT에 놓은 분류로 묶어요. 공방 400, 먹거리 25, 약재 120, 잡화 110엽전이에요. i.shop_id면 가게 8곳으로 나뉘고, top은 셈이라 묶을 수 없어요.",
      },
      {
        type: "order", concept: "adv_join_group",
        q: "손님 종류마다 취소 주문 수를 보게 줄을 놓아 보세요.",
        lines: ["SELECT c.kind, COUNT(*) AS n", "FROM customers c", "JOIN orders o", "ON c.customer_id = o.customer_id", "WHERE o.status = '취소'", "GROUP BY c.kind"],
        explain: "잇고, 취소 주문만 남기고, 손님 종류로 묶어요. 도깨비 25, 사람 15, 여우 9건이에요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "가게 분류마다 가장 싼 물건 값을 보인 결과는?",
        options: [
          { sql: "SELECT s.category,\n  MIN(i.price) AS low\nFROM items i\nJOIN shops s\n  ON i.shop_id = s.shop_id\nGROUP BY s.category" },
          { sql: "SELECT i.shop_id,\n  MIN(i.price) AS low\nFROM items i\nJOIN shops s\n  ON i.shop_id = s.shop_id\nGROUP BY i.shop_id" },
          { sql: "SELECT s.category,\n  MAX(i.price) AS low\nFROM items i\nJOIN shops s\n  ON i.shop_id = s.shop_id\nGROUP BY s.category" },
        ],
        answer: 0, tables: ["items", "shops"],
        explain: "공방 130, 먹거리 5, 약재 12, 잡화 6엽전인 4행이 정답이에요. 가게 번호로 묶으면 8행, MAX면 가장 비싼 값이에요.",
      },
      {
        type: "choice", concept: "adv_join_group",
        q: "주문이 100건 넘는 마을만 남기려면 GROUP BY c.village 뒤에 무엇을 둘까요?",
        options: ["HAVING COUNT(*) > 100", "WHERE COUNT(*) > 100", "ORDER BY COUNT(*) > 100"],
        answer: 0,
        explain: "묶은 뒤 셈으로 거르니 HAVING이에요. 큰바위마을 123, 은행나무마을 103건이 남아요. WHERE에는 셈을 못 써요.",
      },
      {
        id: "10-A2-b1", type: "build", concept: "adv_join_group",
        q: "손님이 사는 마을마다 주문이 몇 건인지 n이라는 이름으로 보여 줘",
        cards: ["SELECT", "c.village,", "COUNT(*) AS n", "FROM", "customers c", "JOIN orders o", "ON", "c.customer_id = o.customer_id", "GROUP BY", "c.village"],
        extra: ["c.customer_id = o.order_id", "COUNT(DISTINCT o.customer_id)"],
        tables: ["customers", "orders"],
        hints: [
          "주문에 손님 표를 이어 마을을 붙인 뒤, 마을로 묶어 주문을 세요.",
          "ON 뒤에 손님 번호끼리 맞댄 카드, GROUP BY 뒤에 c.village예요.",
        ],
        explain: "큰바위마을 123건부터 달빛마을 38건까지 8행이에요. 주문 번호와 맞대면 엉뚱한 짝, COUNT(DISTINCT o.customer_id)면 주문이 아니라 주문한 손님 수예요.",
      },
      {
        id: "10-A2-b2", type: "build", concept: "adv_join_group",
        q: "물건 평균 값이 30엽전 넘는 가게 분류를 보여 줘",
        cards: ["SELECT", "s.category", "FROM", "items i", "JOIN shops s", "ON i.shop_id = s.shop_id", "GROUP BY", "s.category", "HAVING", "AVG(i.price) > 30"],
        extra: ["AVG(i.price) > 40", "WHERE"],
        tables: ["items", "shops"],
        hints: [
          "물건에 가게 표를 이어 분류로 묶고, 평균 값으로 묶음을 걸러요.",
          "GROUP BY s.category 다음에 HAVING AVG(i.price) > 30이에요.",
        ],
        explain: "공방 243, 약재 32.5, 잡화 32.7엽전이에요. 먹거리는 9.9라 빠졌어요. > 40이면 공방만, WHERE로는 셈을 거를 수 없어요.",
      },
      {
        type: "check", concept: "adv_join_group",
        q: "이은 표의 열로 묶기에 대해 맞는 말은?",
        options: [
          "다른 표에만 있는 열로 묶으려면 먼저 잇고, 묶은 뒤 셈으로는 HAVING으로 거른다",
          "GROUP BY에는 FROM 뒤 첫 표의 열만 쓸 수 있다",
          "표를 이으면 SELECT에 아무 열이나 놓아도 된다",
        ],
        answer: 0,
        explain: "잇기 → WHERE → GROUP BY → HAVING 차례예요. 어느 표의 열이든 이어 놓으면 묶을 수 있고, 8장 SELECT 규칙은 그대로예요.",
      },
    ],
  },
  {
    id: "10-A3", chapter: 10, isAdvanced: true, title: "단골 영수증",
    goal: "이름으로 손님을 찾고 세 표를 이어 쓴 엽전을 더한다",
    summary: [
      "의뢰: 단골 손님의 한 해 영수증",
      "이름으로 찾고, 번호로 다시 이어요",
      "세 표를 이어 수량 × 값을 더해요",
    ],
    cards: [
      {
        say: "10장에서 주문에 손님 이름을 붙였죠? 오늘은 의뢰예요! 달빛마을 도래미 손님이 「올해 장터에서 쓴 엽전을 영수증으로 뽑아 주게」래요. 먼저 이름으로 주문을 찾아요. 22건 모두 완료, 손님 번호는 38번!",
        sql: "SELECT c.customer_id, o.order_id,\n  o.ordered_on, o.status\nFROM customers c\nJOIN orders o\n  ON c.customer_id = o.customer_id\nWHERE c.name = '도래미'",
      },
      {
        say: "번호를 알았으니 세 표를 이어요. 주문 → 주문 내역 → 물건. 아래는 264번 주문 영수증이에요. 줄마다 수량 × 값을 모두 더하면 한 해 합계! 도래미 님 주문은 모두 완료라 취소를 거르지 않아도 돼요.",
        sql: "SELECT i.name, oi.qty, i.price,\n  oi.qty * i.price AS amount\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nJOIN items i\n  ON oi.item_id = i.item_id\nWHERE o.order_id = 264",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_apply_10",
        q: "이름으로 손님을 찾은 뒤, 영수증은 손님 번호(38)로 다시 잇는 까닭은?",
        options: [
          "주문 표에는 이름이 없고 번호만 있어서",
          "번호로 이으면 취소 주문이 저절로 빠져서",
          "이름은 SQL에 쓸 수 없어서",
        ],
        answer: 0,
        explain: "주문 표는 손님 번호로 손님을 가리켜요. 그래서 이름은 손님 표에서 찾고, 번호를 알면 그 번호로 주문을 이어요.",
      },
      {
        type: "choice", concept: "adv_apply_10",
        q: "도래미 님(38번)의 주문 수, 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM orders\nWHERE customer_id = 38",
        options: ["22", "41", "38"],
        answer: 0,
        explain: "주문 22건이에요. 41은 내역 줄 수, 38은 손님 번호예요.",
      },
      {
        type: "choice", concept: "adv_apply_10",
        q: "도래미 님의 취소 주문 수, 이 SQL의 결과 값은?",
        code: "SELECT COUNT(*) AS n\nFROM orders\nWHERE customer_id = 38\n  AND status = '취소'",
        options: ["0", "22", "1"],
        answer: 0,
        explain: "취소가 하나도 없어요. 그래서 이번 영수증은 상태를 거르지 않아도 돼요. 다른 손님이면 꼭 확인해요.",
      },
      {
        type: "choice", concept: "adv_apply_10",
        q: "도래미 님 주문에 내역을 이었어요. 이 SQL이 센 수는?",
        code: "SELECT COUNT(*) AS n\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nWHERE o.customer_id = 38",
        options: ["41", "22", "59"],
        answer: 0,
        explain: "주문 하나에 물건이 여럿이라 내역 줄마다 한 행, 41행이에요. 22는 주문 수, 59는 수량 합이에요.",
      },
      {
        type: "choice", concept: "adv_apply_10",
        q: "세 표를 이을 때 order_items를 가운데 잇는 까닭은?",
        options: [
          "주문 번호로 주문 표와, 물건 번호로 물건 표와 이어 주는 표라서",
          "가장 큰 표를 가운데 두어야 빨라서",
          "물건 표는 맨 뒤에만 이을 수 있어서",
        ],
        answer: 0,
        explain: "주문 표와 물건 표에는 서로 맞댈 열이 없어요. 둘 다와 맞댈 번호를 가진 주문 내역이 다리예요(10-4).",
      },
      {
        type: "choice", concept: "adv_apply_10",
        q: "영수증 합계에서 WHERE o.status = '완료'를 빼도 되는 까닭은?",
        options: [
          "도래미 님 주문에는 취소가 없어서(다른 손님이면 꼭 거른다)",
          "수량 × 값에는 상태가 상관없어서",
          "주문 표를 이으면 저절로 완료만 남아서",
        ],
        answer: 0,
        explain: "확인해 보니 취소 0건이라 결과가 같아요. 매출(10-4)처럼 취소가 섞일 수 있으면 완료만 남겨야 해요.",
      },
      {
        type: "blank", concept: "adv_apply_10",
        q: "주문 내역에 물건 값이 짝 맞게 붙도록 빈자리를 채워 보세요.",
        code: "SELECT SUM(oi.qty * i.price) AS spent\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nJOIN items i\n  ON oi.item_id = ___\nWHERE o.customer_id = 38",
        chips: ["i.item_id", "i.shop_id", "oi.order_id"],
        answer: 0,
        explain: "물건 번호끼리 맞대요. 그래야 1625엽전이 나와요. 가게 번호나 주문 번호와 맞대면 엉뚱한 물건 값이 붙어요.",
      },
      {
        type: "order", concept: "adv_apply_10",
        q: "도래미 님 주문의 내역 줄 수와 수량 합을 보게 줄을 놓아 보세요.",
        lines: ["SELECT COUNT(*) AS lines,", "SUM(oi.qty) AS qty", "FROM orders o", "JOIN order_items oi", "ON o.order_id = oi.order_id", "WHERE o.customer_id = 38"],
        expect: "lines | qty\n41 | 59",
        explain: "내역 41줄에 물건 59개예요. 값을 곱해 더하려면 물건 표를 한 번 더 이어요.",
      },
      {
        type: "choice", concept: "adv_apply_10",
        q: "도래미 님이 한 해 동안 산 물건 수량의 합을 보인 결과는?",
        options: [
          { sql: "SELECT SUM(oi.qty) AS qty\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nWHERE o.customer_id = 38" },
          { sql: "SELECT SUM(oi.qty) AS qty\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nWHERE o.order_id = 38" },
          { sql: "SELECT COUNT(*) AS qty\nFROM orders o\nJOIN order_items oi\n  ON o.order_id = oi.order_id\nWHERE o.customer_id = 38" },
        ],
        answer: 0, tables: ["orders", "order_items"],
        explain: "59개인 표가 정답이에요. 주문 번호 38은 다른 손님의 주문 한 건이고, COUNT(*)는 수량이 아니라 줄 수 41이에요.",
      },
      {
        id: "10-A3-b1", type: "build", concept: "adv_apply_10",
        q: "도래미 손님의 주문 번호와 주문 날짜를 이름으로 찾아 보여 줘",
        cards: ["SELECT", "o.order_id, o.ordered_on", "FROM", "customers c", "JOIN orders o", "ON", "c.customer_id = o.customer_id", "WHERE", "c.name = '도래미'"],
        extra: ["c.name = '초롱'", "c.customer_id = o.order_id"],
        tables: ["customers", "orders"],
        hints: [
          "주문 표에는 이름이 없으니 손님 표를 이어 이름으로 걸러요.",
          "ON 뒤에 손님 번호끼리 맞댄 카드, WHERE 뒤에 c.name = '도래미'예요.",
        ],
        explain: "22건이에요. 초롱이면 다른 손님의 18건, 주문 번호와 맞대면 엉뚱한 주문이 붙어요.",
      },
      {
        id: "10-A3-b2", type: "build", concept: "adv_apply_10",
        q: "38번 손님(도래미)이 쓴 엽전, 곧 수량 × 값의 합을 spent라는 이름으로 보여 줘",
        cards: ["SELECT", "SUM(oi.qty * i.price) AS spent", "FROM", "orders o", "JOIN order_items oi", "ON o.order_id = oi.order_id", "JOIN items i", "ON oi.item_id = i.item_id", "WHERE", "o.customer_id = 38"],
        extra: ["SUM(oi.qty) AS spent", "o.order_id = 38"],
        tables: ["orders", "order_items", "items"],
        hints: [
          "주문 → 주문 내역 → 물건 차례로 이어, 38번 손님 줄의 수량 × 값을 더해요.",
          "JOIN … ON을 두 번, WHERE o.customer_id = 38이에요.",
        ],
        explain: "1625엽전이에요! SUM(oi.qty)면 엽전이 아니라 개수 59, 주문 번호 38이면 다른 손님의 주문 한 건이에요.",
      },
      {
        type: "check", concept: "adv_apply_10",
        q: "도래미 님 영수증 SQL에 대해 맞는 말은?",
        options: [
          "이름은 손님 표에서 찾고, 주문·주문 내역·물건 세 표를 이어 수량 × 값을 더한다",
          "주문 표 하나만으로 쓴 엽전을 구할 수 있다",
          "취소된 주문은 이으면 늘 저절로 빠진다",
        ],
        answer: 0,
        explain: "이름 → 번호 → 주문 → 내역 → 값, 나뉜 장부를 이어 한 장의 영수증이 됐어요. 취소는 늘 직접 확인해요.",
      },
    ],
  },
];
