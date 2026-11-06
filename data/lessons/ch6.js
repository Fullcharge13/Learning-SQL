// 6장 「빈칸 다루기」 (설계 §6: NULL, IS NULL, COALESCE / 장터 예: 나이 모르는 손님).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 6
// 6장 낱말은 5장까지에 NULL·IS·COALESCE·IFNULL(판정 R23, COALESCE와 같은 일의 SQLite 이름)을 더한 것이다.
// IS NOT NULL의 NOT은 4장 낱말이다. COUNT(7장)는 쓰지 않는다(「빈칸 몇 개」는 행 수로만 묻는다).
// - 빈칸(NULL)은 두 열에만 있다(data/market.sql로 확인):
//   items.stock 3개: 메밀전(item_id 5, 1번 가게, 9엽전)·한지(24, 5번 가게, 6엽전)·장승(40, 8번 가게, 350엽전).
//   customers.age 5개: 황소담(18)·안여울(28)·조은솔(31)·표다솜(34)는 사람, 돌쇠(49)는 도깨비. 여우 손님은 나이를 모두 안다.
//   마을은 솔바위골 1·느티나무골 2·은행나무마을 2. 그 밖의 표(shops·orders·order_items)에는 빈칸이 없다. 빈 글자 ''도 없다.
// - 0과 빈칸: 짚신(item_id 21, 5번 가게, 14엽전)은 재고가 0이다. 「하나도 없다」를 아는 값이라 빈칸과 다르다.
//   1·5번 가게(WHERE shop_id IN (1, 5))를 보면 메밀전·한지(NULL)와 짚신(0)이 한 표에 나와 견주기 좋다(6-1, 6-3, 6-4 카드).
// - 앞 장 미리보기(「빈칸은 6장에서」)를 갚는다: 2-4 price * stock의 빈칸 → 6-3 카드 1, 3-4 stock < 10에도 >= 10에도 안 나옴
//   → 6-1 카드 1, 3-4 age >= 60(10명) + age < 60(45명) = 55명 → 6-2, 3-5 stock >= 0이 37가지 → 6-5, 4-4 NOT stock < 10이
//   30가지 → 6-3. 5장 머리 주석의 「빈칸이 있는 열로 줄 세우기」도 6-3에서 다룬다.
// - 엔진마다 다른 것(판정 R36): 빈칸의 줄 세우기 자리(SQLite·MySQL은 ASC에서 맨 위, PostgreSQL은 맨 아래)와 IFNULL
//   (PostgreSQL에는 없음)은 「이 장터에서는」을 붙인다. = NULL이 0행인 것, 빈칸과의 셈이 NULL인 것, COALESCE는 붙이지 않는다.
// - COALESCE의 둘째 값은 열과 같은 종류(숫자)만 쓴다. COALESCE(age, '모름')처럼 숫자와 글자를 섞으면 PostgreSQL은 오류다.
// - 조립 카드(판정 R38): 6~13장은 1~3토큰 구절 카드를 쓸 수 있고 SELECT·FROM·WHERE는 한 장씩 둔다. 그래서
//   IS NULL을 AND·OR로 잇는 조립이 더미 12장 안에 들어간다(6-1-b2·6-2-b1·6-3-b1·6-5-b2). 6-1-b1·6-2-b2·6-5-b1은
//   IS·NULL을 낱장으로 놓아 모양을 연습한다. COALESCE(stock, 0)은 괄호까지 한 장, 별칭은 AS stock_or_zero 한 장.
// - 헷갈림 구절은 정답과 닮고 결과가 다르게: stock <> NULL·stock = NULL(0행 또는 빈칸이 안 불림), OR ↔ AND,
//   COALESCE(stock, 1)(빈칸이 1), kind = '여우'(0행). 연산자가 든 구절이라 표 이름 뒤에 끼워도 별칭이 되지 않는다(R33).
// - 헷갈림 카드: = 0 조립에 IS를 두지 않는다. SQLite는 stock IS 0을 stock = 0처럼 읽어 결과가 같아진다. 대신
//   COALESCE(stock, 0)을 두어 stock 자리에 놓으면 빈칸까지 4가지가 걸리는 것을 보인다(6-4-b2).
// - IS·NOT·NULL을 낱장으로 둔 IS NOT NULL 조립은 SQLite가 IS 없는 stock NOT NULL도 받아 drop-one에 걸린다.
//   그래서 IS NOT NULL은 늘 구절 카드 stock IS NOT NULL 한 장으로 쓴다.
// - 6-3-b2(stock + 10 AS plus_ten)는 계산 열이라 별칭을 붙이고 need: ["AS"]를 둔다(쓰기 안내 7절).
// - 빈칸의 줄 세우기 자리는 엔진마다 달라 조립 정답으로 쓰지 않고 터치 문제·틀(6-T4)로만 다룬다.
export const CHAPTER = { id: 6, title: "빈칸 다루기" };

export const LESSONS = [
  {
    id: "6-1", chapter: 6, title: "빈칸 NULL과 IS NULL",
    goal: "빈칸(NULL)이 「모르는 값」임을 알고 IS NULL로 찾을 수 있다",
    summary: [
      "NULL(널) = 값을 모르는 빈칸",
      "NULL은 0도 아니고 빈 글자도 아니에요",
      "빈칸 찾기는 WHERE 열 IS NULL",
    ],
    cards: [
      {
        say: "3장에서 재고 칸이 빈 메밀전이 어느 비교에도 안 걸렸던 거 기억나요? 그 빈칸이 NULL(널), 「값을 모른다」는 표시예요. 결과 표에는 흐린 NULL로 보여요. 짚신의 0은 「하나도 없다」를 아는 값이라 빈칸과 달라요!",
        sql: "SELECT item_id, name, stock\nFROM items\nWHERE shop_id IN (1, 5)",
      },
      {
        say: "빈칸인 행은 WHERE 열 IS NULL로 찾아요. IS NULL은 「빈칸이다」라는 뜻이에요. 아래가 6장의 대표 문제, 나이 모르는 손님 5명이에요. age 칸이 모두 NULL이죠? 드디어 찾았다!",
        sql: "SELECT *\nFROM customers\nWHERE age IS NULL",
      },
    ],
    items: [
      {
        type: "choice", concept: "null",
        q: "NULL(빈칸)은 무슨 뜻일까요?",
        options: ["값을 모른다는 표시", "숫자 0", "아무 글자도 없는 빈 글자"],
        answer: 0,
        explain: "NULL은 장부에 값이 적혀 있지 않은 칸이에요. 0이나 빈 글자는 「아는 값」이고, NULL은 「모른다」는 표시예요.",
      },
      {
        type: "choice", concept: "null",
        q: "짚신의 재고 0과 메밀전의 재고 NULL은 어떻게 다를까요?",
        options: [
          "짚신은 하나도 없는 걸 알고, 메밀전은 몇 개인지 모른다",
          "둘 다 하나도 없다는 뜻이다",
          "짚신은 몇 개인지 모르고, 메밀전은 하나도 없다",
        ],
        answer: 0,
        explain: "0은 「다 팔려서 없다」를 아는 값이에요. NULL은 장부에 적히지 않아 몇 개인지 몰라요. 둘은 다른 칸이에요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 SQL의 결과에서 재고(stock) 칸이 NULL인 물건은?",
        code: "SELECT item_id, name, stock\nFROM items\nWHERE shop_id IN (1, 5)",
        options: ["메밀전과 한지", "짚신", "메밀전, 한지, 짚신"],
        answer: 0,
        explain: "흐린 NULL이 보이는 행은 메밀전(5번)과 한지(24번)예요. 짚신(21번)은 0이 적혀 있어서 빈칸이 아니에요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "나이(age) 칸이 빈 손님을 고르는 조건은?",
        options: ["age IS NULL", "age = 0", "age NULL"],
        answer: 0,
        explain: "빈칸은 IS NULL로 찾아요. age = 0은 0살 손님을 찾는 조건이고, IS 없이 NULL만 쓰면 오류가 나요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock IS NULL",
        options: ["3행", "4행", "40행"],
        answer: 0,
        explain: "재고 칸이 빈 메밀전·한지·장승, 3행이에요. 재고가 0인 짚신은 빈칸이 아니라서 안 나와요. 4행이면 짚신까지 센 거예요.",
      },
      {
        type: "blank", concept: "isnull",
        q: "나이 칸이 빈 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, age\nFROM customers\nWHERE age IS ___",
        chips: ["NULL", "=", "NOT"],
        answer: 0,
        explain: "IS 다음에 NULL이 와야 「빈칸이다」예요. IS 뒤에 = 를 넣거나 NOT만 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "나이 모르는 손님 중 도깨비 손님은 누구일까요?",
        code: "SELECT name, kind\nFROM customers\nWHERE age IS NULL\n  AND kind = '도깨비'",
        options: ["돌쇠", "황소담", "아무도 없다"],
        answer: 0,
        explain: "나이 모르는 5명 중 4명은 사람이고 도깨비는 은행나무마을 돌쇠 하나예요. IS NULL도 AND로 다른 조건과 묶을 수 있어요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "WHERE kind = '여우' AND age IS NULL 의 결과는?",
        options: ["아무도 안 나온다", "여우 손님 12명이 모두 나온다", "오류가 난다"],
        answer: 0,
        explain: "여우 손님 12명은 모두 나이가 적혀 있어요. 그래서 둘 다 맞는 손님이 없어 0행이에요. 오류는 아니에요.",
      },
      {
        type: "order", concept: "isnull",
        q: "재고를 모르는 물건의 이름과 값을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE stock IS NULL"],
        expect: "name | price\n메밀전 | 9\n한지 | 6\n장승 | 350",
        explain: "SELECT 열 → FROM 표 → WHERE 조건, 3장과 같은 차례예요. 조건 자리에 stock IS NULL이 들어갔을 뿐이에요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "나이를 모르는 손님만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, age\nFROM customers\nWHERE age IS NULL" },
          { sql: "SELECT name, age\nFROM customers\nWHERE age = 0" },
          { sql: "SELECT name, age\nFROM customers\nWHERE age < 10" },
        ],
        answer: 0, tables: ["customers"],
        explain: "age 칸이 모두 NULL인 5행이 정답이에요. age = 0은 0살 손님이 없어 0행, age < 10은 산돌이(8)·문새봄(9) 2행이에요.",
      },
      {
        id: "6-1-b1", type: "build", concept: "isnull",
        q: "나이 모르는 손님을 보여 줘",
        cards: ["SELECT", "*", "FROM", "customers", "WHERE", "age", "IS", "NULL"],
        extra: ["=", "0"],
        tables: ["customers"],
        hints: [
          "손님 표에서 나이(age) 칸이 비어 있는 행만 남겨요.",
          "WHERE age 다음에 IS와 NULL을 놓아요.",
        ],
        explain: "6장의 대표 문제, 나이 모르는 손님 5명을 찾았어요! 황소담·안여울·조은솔·표다솜·돌쇠예요. 빈칸은 IS NULL로 찾아요.",
      },
      {
        id: "6-1-b2", type: "build", concept: "isnull",
        q: "나이 모르는 손님 중 사람 손님만 보여 줘",
        cards: ["SELECT", "*", "FROM", "customers", "WHERE", "age IS NULL", "AND", "kind = '사람'"],
        extra: ["OR", "kind = '여우'"],
        tables: ["customers"],
        hints: [
          "나이 칸이 빈 것, 종류가 사람인 것. 두 조건을 모두 맞는 손님만 남겨요.",
          "WHERE 다음에 age IS NULL, AND, kind = '사람' 카드를 놓아요.",
        ],
        explain: "황소담·안여울·조은솔·표다솜, 4명이에요. IS NULL도 보통 조건처럼 AND로 묶여요. OR였다면 사람 손님 24명에 돌쇠까지 25명이에요.",
      },
      {
        type: "check", concept: "null",
        q: "빈칸(NULL)에 대해 맞는 말은?",
        options: [
          "NULL은 값을 모른다는 표시이고, IS NULL로 찾는다",
          "NULL은 숫자 0과 같다",
          "재고가 0인 짚신도 IS NULL로 찾아진다",
        ],
        answer: 0,
        explain: "NULL은 0도 빈 글자도 아닌 「모르는 값」이에요. 짚신의 0은 아는 값이라 IS NULL에 안 걸려요.",
      },
    ],
  },
  {
    id: "6-2", chapter: 6, title: "= NULL은 왜 안 될까",
    goal: "= NULL이 안 되는 까닭을 알고 IS NOT NULL을 쓸 수 있다",
    summary: [
      "= NULL은 언제나 0행, 빈칸은 IS NULL",
      "빈칸끼리도 같은지 알 수 없어요",
      "빈칸이 아닌 행은 IS NOT NULL",
    ],
    cards: [
      {
        say: "빈칸을 = NULL로 찾으면 어떨까요? 아래처럼 한 행도 안 나와요! NULL은 모르는 값이라 「같은가?」 물어도 답이 「모른다」예요. 빈칸끼리도 같은지 알 수 없어요. 그래서 빈칸은 꼭 IS NULL로 찾아요.",
        sql: "SELECT name, age\nFROM customers\nWHERE age = NULL",
      },
      {
        say: "반대로 값이 적힌 행만 고를 때는 IS NOT NULL이에요. NOT은 4장에서 배운 뒤집기예요. 아래는 재고를 아는 물건 37가지예요. 빈칸인 메밀전·한지·장승만 빠졌어요.",
        sql: "SELECT name, stock\nFROM items\nWHERE stock IS NOT NULL",
      },
    ],
    items: [
      {
        type: "choice", concept: "isnull",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock = NULL",
        options: ["0행", "3행", "40행"],
        answer: 0,
        explain: "= NULL은 어느 행에서도 답이 「모른다」라 0행이에요. 빈칸 3가지를 찾으려면 IS NULL이에요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "WHERE age = NULL 이 아무 행도 못 찾는 까닭은?",
        options: [
          "NULL과 같은지 물으면 답이 늘 「모른다」라서",
          "나이 칸에 빈칸이 하나도 없어서",
          "= 뒤에 NULL을 쓰면 오류가 나서",
        ],
        answer: 0,
        explain: "나이 모르는 손님은 5명이나 있어요. 하지만 = NULL은 그 손님에게도 「모른다」라서 걸리지 않아요. 오류 없이 0행이에요.",
      },
      {
        type: "choice", concept: "null",
        q: "빈칸끼리 견준 NULL = NULL 의 답은 무엇일까요?",
        options: ["모른다(NULL)", "같다(참)", "다르다(거짓)"],
        answer: 0,
        explain: "두 칸 모두 모르는 값이라 같은지도 알 수 없어요. 그래서 답도 NULL이에요. 빈칸이 같은지는 IS NULL로만 물어요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "WHERE age <> NULL 은 나이를 아는 손님 55명을 찾을까요?",
        options: [
          "아니다. <> NULL도 답이 「모른다」라 0행이다",
          "그렇다. 55명이 나온다",
          "나이 모르는 5명이 나온다",
        ],
        answer: 0,
        explain: "같은지도, 다른지도 모르는 게 빈칸이에요. 나이를 아는 손님은 age IS NOT NULL로 찾아요.",
      },
      {
        type: "blank", concept: "isnull",
        q: "재고를 아는 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, stock\nFROM items\nWHERE stock IS ___ NULL",
        chips: ["NOT", "=", "<>"],
        answer: 0,
        explain: "IS NOT NULL은 「빈칸이 아니다」예요. IS 뒤에 = 나 <> 를 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, age\nFROM customers\nWHERE age IS NOT NULL",
        options: ["55행", "60행", "5행"],
        answer: 0,
        explain: "손님 60명 중 나이 모르는 5명을 뺀 55명이에요. 5행은 IS NULL일 때예요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "WHERE stock IS NOT NULL 과 결과가 같은 조건은?",
        options: ["NOT stock IS NULL", "stock <> NULL", "stock IS NULL"],
        answer: 0,
        explain: "「빈칸이다」를 NOT으로 뒤집으면 「빈칸이 아니다」예요. <> NULL은 답이 늘 「모른다」라 0행이에요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "3장에서 age >= 60은 10명, age < 60은 45명이었어요. 빠진 5명을 찾는 조건은?",
        options: ["age IS NULL", "age = NULL", "age = 0"],
        answer: 0,
        explain: "3장에서 55명만 나왔던 까닭이 이 5명이에요. 나이 모르는 손님은 어느 비교에도 안 걸리니 IS NULL로 따로 찾아요.",
      },
      {
        type: "order", concept: "isnull",
        q: "뚝딱 공방(8번 가게) 물건 중 재고를 아는 것을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, stock", "FROM items", "WHERE shop_id = 8", "AND stock IS NOT NULL"],
        expect: "name | stock\n다듬이방망이 | 56\n빨래방망이 | 4\n놋그릇 | 2\n쇠솥 | 20",
        explain: "8번 가게 물건 5가지 중 재고 칸이 빈 장승만 빠졌어요. IS NOT NULL도 AND로 묶을 수 있어요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "먹거리 가게(1·2번) 물건 중 재고를 아는 것만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id <= 2\n  AND stock IS NOT NULL" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id <= 2\n  AND stock IS NULL" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id <= 2\n  AND stock = NULL" },
        ],
        answer: 0, tables: ["items"],
        explain: "먹거리 물건 10가지에서 메밀전만 빠진 9행이 정답이에요. IS NULL이면 메밀전 하나, = NULL이면 0행이에요.",
      },
      {
        id: "6-2-b1", type: "build", concept: "isnull",
        q: "도깨비 국밥집(1번 가게) 물건 중 재고를 아는 것만 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "shop_id = 1", "AND", "stock IS NOT NULL"],
        extra: ["stock <> NULL", "OR"],
        tables: ["items"],
        hints: [
          "1번 가게 물건이면서 재고 칸이 빈칸이 아닌 것만 남겨요. 빈칸인지는 IS로 물어요.",
          "WHERE 다음에 shop_id = 1, AND, stock IS NOT NULL 카드를 놓아요.",
        ],
        explain: "국밥·수육·도토리묵·막걸리, 4가지예요. 빈칸인 메밀전만 빠졌어요. stock <> NULL을 놓으면 답이 늘 「모른다」라 0행이에요.",
      },
      {
        id: "6-2-b2", type: "build", concept: "isnull",
        q: "나이 모르는 손님이 사는 마을을 겹치지 않게 보여 줘",
        cards: ["SELECT", "DISTINCT", "village", "FROM", "customers", "WHERE", "age", "IS", "NULL"],
        extra: ["NOT", "kind"],
        tables: ["customers"],
        hints: [
          "나이 칸이 빈 손님만 남기고, 마을 열을 겹침 없이 한 번씩 보여요.",
          "SELECT 바로 뒤에 DISTINCT를, WHERE age 다음에 IS와 NULL을 놓아요.",
        ],
        explain: "솔바위골·느티나무골·은행나무마을, 3곳이에요. 5명 중 느티나무골과 은행나무마을에 두 명씩 살아서 DISTINCT가 합쳤어요.",
      },
      {
        type: "check", concept: "isnull",
        q: "빈칸 찾기에 대해 맞는 말은?",
        options: [
          "빈칸은 IS NULL, 빈칸이 아닌 행은 IS NOT NULL로 찾는다",
          "= NULL로도 빈칸을 찾을 수 있다",
          "빈칸끼리는 언제나 같다",
        ],
        answer: 0,
        explain: "NULL은 모르는 값이라 = 나 <> 로 물으면 답이 늘 「모른다」예요. 빈칸을 물을 때는 꼭 IS를 써요.",
      },
    ],
  },
  {
    id: "6-3", chapter: 6, title: "빈칸이 섞인 셈과 비교",
    goal: "빈칸이 셈·비교·줄 세우기에서 어떻게 되는지 알 수 있다",
    summary: [
      "빈칸과 셈하면 결과도 빈칸(NULL)",
      "비교에선 빠져요, 넣으려면 OR IS NULL",
      "이 장터의 ASC 줄 세우기는 빈칸이 맨 위",
    ],
    cards: [
      {
        say: "2장에서 메밀전의 price * stock 칸이 비었던 거 기억나요? 모르는 값에 10을 더해도 모르니 결과도 NULL이에요. 비교에서 빠지는 빈칸은 아래처럼 OR 열 IS NULL을 붙여 함께 불러요. 10개 미만 7가지와 빈칸 3가지예요.",
        sql: "SELECT name, stock,\n  stock + 10 AS plus_ten\nFROM items\nWHERE stock < 10\n  OR stock IS NULL",
      },
      {
        say: "빈칸이 있는 열로 줄을 세우면 빈칸은 어디로 갈까요? 이 장터에서는 작은 값부터(ASC) 세우면 빈칸이 맨 위, DESC면 맨 아래예요. 반대인 데이터베이스도 있어요. 아래에서 빈칸 다음에 재고 0인 짚신이 와요.",
        sql: "SELECT name, stock\nFROM items\nWHERE shop_id IN (1, 5)\nORDER BY stock, item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "null",
        q: "이 SQL에서 메밀전 행의 plus_ten 칸은 어떻게 나올까요?",
        code: "SELECT name, stock + 10 AS plus_ten\nFROM items\nWHERE stock IS NULL",
        options: ["NULL", "10", "0"],
        answer: 0,
        explain: "몇 개인지 모르는 재고에 10을 더해도 몇 개인지 몰라요. 그래서 NULL이에요. 빈칸을 0으로 치지 않아요.",
      },
      {
        type: "choice", concept: "null",
        q: "재고가 0인 짚신의 stock + 10 은 얼마일까요?",
        options: ["10", "NULL", "0"],
        answer: 0,
        explain: "0은 아는 값이라 셈이 돼요. 0 + 10 = 10이에요. 결과가 NULL이 되는 건 모르는 값과 셈할 때뿐이에요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock < 10",
        options: ["7행", "10행", "3행"],
        answer: 0,
        explain: "인절미·산삼·인삼차·오미자청·짚신·빨래방망이·놋그릇, 7가지예요. 빈칸 3가지는 10보다 작은지 몰라서 빠져요.",
      },
      {
        type: "choice", concept: "null",
        q: "4장의 WHERE NOT stock < 10 은 30가지였어요. 7 + 30이 40이 안 되는 까닭은?",
        options: [
          "빈칸 3가지는 비교에도, 뒤집은 비교에도 안 걸려서",
          "NOT이 행 3개를 지워서",
          "재고가 0인 짚신이 빠져서",
        ],
        answer: 0,
        explain: "모르는 값은 뒤집어도 모르는 값이에요. 그래서 메밀전·한지·장승은 양쪽에서 모두 빠져 7 + 30 + 3 = 40이에요.",
      },
      {
        type: "blank", concept: "null",
        q: "재고가 10개 미만이거나 모르는 물건이 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, stock\nFROM items\nWHERE stock < 10\n  ___ stock IS NULL",
        chips: ["OR", "AND", "NOT"],
        answer: 0,
        explain: "둘 중 하나만 맞아도 되니 OR예요. AND면 10 미만이면서 빈칸인 물건이라 0행이고, NOT은 이 자리에서 오류가 나요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock < 10\n  AND stock IS NULL",
        options: ["0행", "3행", "10행"],
        answer: 0,
        explain: "빈칸인 물건은 10보다 작은지 모르니 두 조건을 함께 맞는 물건이 없어요. 빈칸도 넣으려면 AND가 아니라 OR예요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 장터에서 ORDER BY stock 으로 물건을 세우면 맨 위에 오는 것은?",
        options: ["재고 칸이 빈 물건", "재고가 0인 짚신", "재고가 가장 많은 갓"],
        answer: 0,
        explain: "이 장터에서는 작은 값부터 세우면 빈칸이 맨 위예요. 짚신(0)은 빈칸 3가지 바로 다음이에요. 데이터베이스마다 다를 수 있어요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 장터에서 ORDER BY stock DESC 로 세우면 빈칸인 물건은 어디에 올까요?",
        options: ["맨 아래", "맨 위", "결과에서 빠진다"],
        answer: 0,
        explain: "DESC는 차례를 뒤집으니 빈칸이 맨 아래로 가요. 줄 세우기는 행을 빼지 않아서 빈칸도 그대로 나와요.",
      },
      {
        type: "order", concept: "null",
        q: "재고가 3개 미만이거나 모르는 물건을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, stock", "FROM items", "WHERE stock < 3", "OR stock IS NULL"],
        expect: "name | stock\n메밀전 | NULL\n산삼 | 2\n짚신 | 0\n한지 | NULL\n놋그릇 | 2\n장승 | NULL",
        explain: "3개 미만 3가지(산삼·짚신·놋그릇)에 OR로 빈칸 3가지를 더해 6행이에요. OR가 없으면 빈칸은 빠져요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 장터에서 뚝딱 공방(8번 가게) 물건을 재고 작은 값부터(ASC) 세운 결과는?",
        options: [
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 8\nORDER BY stock, item_id" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 8\nORDER BY stock DESC, item_id" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 8\n  AND stock IS NOT NULL\nORDER BY stock, item_id" },
        ],
        answer: 0, tables: ["items"],
        explain: "장승(NULL)이 맨 위, 그다음 놋그릇(2)·빨래방망이(4)… 인 표가 정답이에요. DESC면 장승이 맨 아래, IS NOT NULL이면 장승이 빠져요.",
      },
      {
        id: "6-3-b1", type: "build", concept: "null",
        q: "재고가 5개 미만이거나 재고를 모르는 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "stock < 5", "OR", "stock IS NULL"],
        extra: ["AND", "stock = NULL"],
        tables: ["items"],
        hints: [
          "5개 미만 조건만으로는 빈칸 물건이 빠져요. 빈칸을 따로 불러, 둘 중 하나만 맞아도 남겨요.",
          "WHERE 다음에 stock < 5, OR, stock IS NULL 카드를 놓아요.",
        ],
        explain: "5개 미만 5가지(산삼·인삼차·짚신·빨래방망이·놋그릇)에 빈칸 3가지, 8가지예요. AND면 0행, stock = NULL이면 빈칸이 안 불려 5가지예요.",
      },
      {
        id: "6-3-b2", type: "build", concept: "null",
        q: "물건 이름과 재고에 10을 더한 수를 plus_ten이라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "stock", "+", "10", "AS", "plus_ten", "FROM", "items"],
        extra: ["*", "price"],
        need: ["AS"],
        tables: ["items"],
        hints: [
          "재고 열에 10을 더한 계산 열을 만들고, AS로 이름을 붙여요.",
          "name 쉼표 다음에 stock, +, 10, AS, plus_ten을 놓아요.",
        ],
        explain: "물건 40가지 중 메밀전·한지·장승의 plus_ten만 NULL이에요. 모르는 재고에 10을 더해도 모르니까요. 짚신은 0 + 10 = 10이에요.",
      },
      {
        type: "check", concept: "null",
        q: "빈칸이 섞인 셈과 비교에 대해 맞는 말은?",
        options: [
          "빈칸과 셈하면 NULL이고, 비교에서는 빠진다",
          "빈칸은 0으로 쳐서 셈한다",
          "NOT을 붙이면 빈칸도 비교에 걸린다",
        ],
        answer: 0,
        explain: "모르는 값과 셈하면 모르는 값, 견줘도 「모른다」라 빠져요. 빈칸까지 넣고 싶으면 OR 열 IS NULL을 붙여요.",
      },
    ],
  },
  {
    id: "6-4", chapter: 6, title: "COALESCE로 채우기",
    goal: "COALESCE로 빈칸 대신 보여 줄 값을 정할 수 있다",
    summary: [
      "COALESCE(열, 0) = 빈칸이면 0으로",
      "IFNULL도 같은 일, 이 장터에서 쓰는 이름",
      "채운 값은 진짜 값이 아니에요",
    ],
    cards: [
      {
        say: "빈칸 대신 보여 줄 값은 COALESCE(코얼레스)로 정해요. COALESCE(stock, 0)은 「재고 칸이 비었으면 0을, 아니면 재고를」이에요. 아래에서 메밀전·한지의 stock_or_zero 칸을 봐요. NULL 대신 0이죠?",
        sql: "SELECT name, stock,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id IN (1, 5)",
      },
      {
        say: "IFNULL도 같은 일을 해요. 이 장터에서 쓰는 다른 이름인데 없는 데이터베이스도 있어서 COALESCE를 먼저 익혀요. 그런데 조심! 아래처럼 채우고 나면 다 팔린 짚신과 재고를 모르는 메밀전이 똑같이 0이에요.",
        sql: "SELECT name, stock,\n  IFNULL(stock, 0) AS stock_or_zero\nFROM items\nWHERE stock IS NULL\n  OR stock = 0",
      },
    ],
    items: [
      {
        type: "choice", concept: "coalesce",
        q: "COALESCE(stock, 0) 은 무슨 일을 할까요?",
        options: [
          "재고 칸이 비었으면 0을, 아니면 재고를 보여 준다",
          "모든 재고를 0으로 바꿔 보여 준다",
          "재고가 0인 행을 뺀다",
        ],
        answer: 0,
        explain: "COALESCE는 빈칸일 때만 둘째 값으로 바꿔 보여 줘요. 값이 적힌 칸은 그대로예요. 행을 빼지도 않아요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "COALESCE(stock, 0) 에서 0은 무엇일까요?",
        options: ["재고 칸이 비었을 때 대신 보여 줄 값", "재고가 0인 행만 고르라는 뜻", "재고 열의 번호"],
        answer: 0,
        explain: "둘째 값은 빈칸 대신 쓸 값이에요. 0 대신 1을 쓰면 빈칸이 1로 보여요. 행을 고르는 건 WHERE예요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "앞뒤를 바꾼 COALESCE(0, stock) 은 무엇을 보여 줄까요?",
        options: [
          "언제나 0",
          "재고 칸이 비었으면 0, 아니면 재고",
          "언제나 재고(빈칸이면 NULL)",
        ],
        answer: 0,
        explain: "COALESCE는 앞에서부터 보고 처음 나온 빈칸 아닌 값을 내요. 맨 앞 0은 빈칸이 아니라서 늘 0이에요. 열을 앞에 써요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "이 SQL에서 한지의 stock_or_zero 칸은 얼마일까요?",
        code: "SELECT name,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id = 5",
        options: ["0", "NULL", "6"],
        answer: 0,
        explain: "한지는 재고 칸이 빈칸이라 0이 나와요. 6은 한지의 값(price)이에요. 부채처럼 재고가 적힌 물건은 그대로 12예요.",
      },
      {
        type: "blank", concept: "coalesce",
        q: "재고 칸이 비었으면 0이 나오게 빈자리를 채워 보세요.",
        code: "SELECT name,\n  ___(stock, 0) AS stock_or_zero\nFROM items",
        chips: ["COALESCE", "NULL", "IS"],
        answer: 0,
        explain: "빈칸을 다른 값으로 채우는 건 COALESCE예요. NULL이나 IS를 그 자리에 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "COALESCE(stock, 0) 과 같은 일을 하는 것은?",
        options: ["IFNULL(stock, 0)", "stock IS NULL", "stock = 0"],
        answer: 0,
        explain: "IFNULL은 이 장터에서 쓰는 같은 일의 다른 이름이에요. IS NULL과 = 0은 행을 고르는 조건이라 값을 채우지 않아요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "메밀전(9엽전, 재고 빈칸)의 price * COALESCE(stock, 0) 은 얼마일까요?",
        options: ["0", "NULL", "9"],
        answer: 0,
        explain: "재고가 0으로 채워져 9 × 0 = 0이에요. COALESCE가 없으면 2장에서 본 것처럼 NULL이에요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "재고 칸을 IFNULL(stock, 0)으로 채운 뒤 생기는 걱정은?",
        options: [
          "다 팔린 짚신과 재고를 모르는 메밀전이 똑같이 0으로 보인다",
          "짚신의 0이 NULL로 바뀐다",
          "빈칸인 행이 결과에서 빠진다",
        ],
        answer: 0,
        explain: "채운 0은 진짜로 센 값이 아니에요. 다 팔린 것과 모르는 것이 섞이니, 둘을 가려야 할 땐 채우기 전에 IS NULL로 먼저 봐요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "나이를 COALESCE(age, 0)으로 채운 뒤 작은 값부터 세우면 맨 위에 오는 손님은?",
        options: [
          "0살로 채워진 나이 모르는 손님",
          "가장 어린 8살 산돌이",
          "가장 나이 많은 손님",
        ],
        answer: 0,
        explain: "채운 0이 8살보다 작아서 나이 모르는 5명이 먼저 와요. 가장 어린 손님을 찾을 땐 채우지 말고 IS NOT NULL로 빼고 세워요.",
      },
      {
        type: "order", concept: "coalesce",
        q: "구름 잡화점(5번 가게) 물건의 재고를 빈칸 없이 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name,", "COALESCE(stock, 0)", "AS stock_or_zero", "FROM items", "WHERE shop_id = 5"],
        expect: "name | stock_or_zero\n짚신 | 0\n부채 | 12\n비단 주머니 | 16\n한지 | 0\n등불 | 47",
        explain: "COALESCE는 SELECT 줄의 열 자리에 와요. 한지의 빈칸이 0으로 채워졌어요. 짚신의 0은 원래 적힌 값이에요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "도깨비 국밥집(1번 가게) 물건의 재고를, 모르면 0으로 채워 보여 준 결과는?",
        options: [
          { sql: "SELECT name,\n  COALESCE(stock, 0) AS shown\nFROM items\nWHERE shop_id = 1" },
          { sql: "SELECT name, stock AS shown\nFROM items\nWHERE shop_id = 1" },
          { sql: "SELECT name,\n  COALESCE(stock, 0) AS shown\nFROM items\nWHERE shop_id = 1\n  AND stock IS NOT NULL" },
        ],
        answer: 0, tables: ["items"],
        explain: "5행이고 메밀전 칸이 0인 표가 정답이에요. 채우지 않으면 메밀전이 NULL이고, IS NOT NULL을 붙이면 메밀전이 빠져 4행이에요.",
      },
      {
        id: "6-4-b1", type: "build", concept: "coalesce",
        q: "물건 이름과 재고를 보여 주되, 모르는 재고는 0으로 채워 줘",
        cards: ["SELECT", "name", ",", "COALESCE(stock, 0)", "AS stock_or_zero", "FROM", "items"],
        extra: ["COALESCE(stock, 1)", "stock IS NULL"],
        tables: ["items"],
        hints: [
          "이름 열 옆에, 빈칸일 때 대신 보여 줄 값을 정한 재고 열을 놓고 이름을 붙여요.",
          "name 쉼표 다음에 COALESCE(stock, 0)과 AS stock_or_zero 카드를 놓아요.",
        ],
        explain: "메밀전·한지·장승이 0으로 채워졌어요. COALESCE(stock, 1)이면 1로 보여요. AS가 없으면 이 장터에서는 쓴 식 그대로가 열 이름이라 별칭을 붙였어요.",
      },
      {
        id: "6-4-b2", type: "build", concept: "null",
        q: "다 팔려서 재고가 0인 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "stock", "=", "0"],
        extra: ["COALESCE(stock, 0)", "NULL"],
        tables: ["items"],
        hints: [
          "재고 칸에 0이 적힌 행만 남겨요. 빈칸을 0으로 채운 것과는 달라요.",
          "WHERE 다음에 stock, =, 0을 놓아요.",
        ],
        explain: "짚신 하나만 나왔어요. stock 대신 COALESCE(stock, 0)을 놓으면 빈칸도 0이 되어 메밀전·한지·장승까지 4가지가 걸려요. 채운 0은 진짜 0이 아니에요!",
      },
      {
        type: "check", concept: "coalesce",
        q: "COALESCE에 대해 맞는 말은?",
        options: [
          "빈칸일 때만 정한 값으로 바꿔 보여 주고, 그 값은 진짜로 센 값이 아니다",
          "빈칸인 행을 결과에서 뺀다",
          "값이 적힌 칸도 모두 둘째 값으로 바꾼다",
        ],
        answer: 0,
        explain: "COALESCE(열, 값)은 보여 줄 때만 빈칸을 채워요. 장부의 빈칸은 그대로 남고, 채운 값이 무슨 뜻인지 늘 생각해요.",
      },
    ],
  },
  {
    id: "6-5", chapter: 6, title: "6장 평가", isExam: true,
    goal: "빈칸(NULL)을 IS NULL로 찾고 COALESCE로 채울 수 있다",
    summary: [
      "빈칸은 IS NULL, 아닌 행은 IS NOT NULL",
      "빈칸과 셈하면 NULL, 비교에선 빠져요",
      "COALESCE(열, 값)로 빈칸 대신 보여 주기",
    ],
    cards: [
      {
        say: "6장 정리 시간이에요! 빈칸 NULL은 모르는 값이라 = 로는 못 찾고 IS NULL로 찾았어요. 셈하면 NULL, 비교에선 빠지고, COALESCE로 대신 보여 줄 값을 정했어요. 아래가 대표 모양이에요. 같이 풀어 봐요!",
        sql: "SELECT name, village\nFROM customers\nWHERE age IS NULL",
      },
    ],
    items: [
      {
        type: "choice", concept: "null",
        q: "NULL(빈칸)에 대해 맞는 말은?",
        options: [
          "값을 모른다는 표시로, 0이나 빈 글자와 다르다",
          "숫자 0과 같다",
          "아무 글자도 없는 빈 글자와 같다",
        ],
        answer: 0,
        explain: "0과 빈 글자는 적혀 있는 값이에요. NULL은 적혀 있지 않아 모르는 칸이에요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM customers\nWHERE age = NULL",
        options: ["0행", "5행", "55행"],
        answer: 0,
        explain: "= NULL은 어느 손님에게도 답이 「모른다」라 0행이에요. 나이 모르는 5명은 IS NULL로 찾아요.",
      },
      {
        type: "blank", concept: "isnull",
        q: "나이 모르는 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, village\nFROM customers\nWHERE age ___ NULL",
        chips: ["IS", "=", "<>"],
        answer: 0,
        explain: "빈칸은 IS로 물어요. = 와 <> 는 답이 늘 「모른다」라 둘 다 0행이에요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock IS NOT NULL",
        options: ["37행", "40행", "3행"],
        answer: 0,
        explain: "물건 40가지 중 재고 칸이 빈 3가지를 뺀 37가지예요. 3행은 IS NULL일 때예요.",
      },
      {
        type: "choice", concept: "null",
        q: "재고가 0인 짚신은 WHERE stock IS NULL 의 결과에 나올까요?",
        options: [
          "나오지 않는다. 0은 아는 값이다",
          "나온다. 재고가 하나도 없으니까",
          "짚신만 나온다",
        ],
        answer: 0,
        explain: "짚신의 0은 「다 팔렸다」를 아는 값이라 빈칸이 아니에요. IS NULL에는 메밀전·한지·장승만 걸려요.",
      },
      {
        type: "choice", concept: "null",
        q: "재고 칸이 빈 장승(350엽전)의 stock + 10 은 무엇일까요?",
        options: ["NULL", "10", "360"],
        answer: 0,
        explain: "모르는 재고에 10을 더해도 몰라요. 360은 값 350에 10을 더한 셈이에요.",
      },
      {
        type: "choice", concept: "null",
        q: "3장의 WHERE stock >= 0 이 물건 40가지 중 37가지만 고른 까닭은?",
        options: [
          "빈칸 3가지는 비교에서 빠져서",
          "재고가 0인 짚신이 빠져서",
          "빈칸은 0보다 작은 수라서",
        ],
        answer: 0,
        explain: "짚신(0)은 0 이상이라 나와요. 빠진 건 0 이상인지 알 수 없는 빈칸 3가지예요.",
      },
      {
        type: "choice", concept: "null",
        q: "이 장터에서 ORDER BY age 로 손님을 세우면 맨 위에 오는 손님은?",
        options: ["나이 모르는 손님", "가장 어린 8살 산돌이", "가장 나이 많은 손님"],
        answer: 0,
        explain: "이 장터에서는 작은 값부터 세우면 빈칸이 맨 위예요. 산돌이는 빈칸 5명 다음이에요. 데이터베이스마다 다를 수 있어요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "이 SQL에서 장승의 stock_or_zero 칸은 얼마일까요?",
        code: "SELECT name,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id = 8",
        options: ["0", "NULL", "350"],
        answer: 0,
        explain: "장승은 재고 칸이 빈칸이라 COALESCE가 0으로 채워요. 350은 장승의 값이에요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "IFNULL(age, 0) 에 대해 맞는 말은?",
        options: [
          "COALESCE(age, 0)과 같은 일을 하는, 이 장터에서 쓰는 이름이다",
          "나이가 0인 손님만 고른다",
          "나이 칸을 모두 빈칸으로 만든다",
        ],
        answer: 0,
        explain: "IFNULL은 빈칸이면 둘째 값을 보여 줘요. 없는 데이터베이스도 있어서 어디서나 되는 COALESCE를 먼저 써요.",
      },
      {
        type: "choice", concept: "isnull",
        q: "나이 모르는 손님이 사는 마을을 겹치지 않게 보여 준 결과는?",
        options: [
          { sql: "SELECT DISTINCT village\nFROM customers\nWHERE age IS NULL" },
          { sql: "SELECT DISTINCT village\nFROM customers\nWHERE age IS NOT NULL" },
          { sql: "SELECT village\nFROM customers\nWHERE age IS NULL" },
        ],
        answer: 0,
        explain: "솔바위골·느티나무골·은행나무마을, 3행인 표가 정답이에요. IS NOT NULL이면 마을 8곳, DISTINCT가 없으면 5행이에요.",
      },
      {
        type: "order", concept: "coalesce",
        q: "구름 잡화점 물건의 값어치(값 × 재고)를, 모르는 재고는 0으로 쳐서 보게 줄을 놓아 보세요.",
        lines: ["SELECT name,", "price * COALESCE(stock, 0)", "AS stock_value", "FROM items", "WHERE shop_id = 5"],
        expect: "name | stock_value\n짚신 | 0\n부채 | 132\n비단 주머니 | 640\n한지 | 0\n등불 | 1128",
        explain: "2장의 price * stock에 COALESCE를 더했어요. 한지가 NULL 대신 0이에요. 짚신은 재고가 진짜 0이라 0이에요.",
      },
      {
        id: "6-5-b1", type: "build", concept: "isnull",
        q: "나이 모르는 손님의 이름과 종류를 보여 줘",
        cards: ["SELECT", "name", ",", "kind", "FROM", "customers", "WHERE", "age", "IS", "NULL"],
        extra: ["=", "NOT"],
        tables: ["customers"],
        hints: [
          "나이 칸이 빈 손님만 남기고, 이름과 종류 열을 보여요. 빈칸은 = 로 못 찾아요.",
          "SELECT 다음에 name, 쉼표, kind를, WHERE age 다음에 IS와 NULL을 놓아요.",
        ],
        explain: "6장의 대표 문제, 나이 모르는 손님 5명을 다시 찾았어요. 사람 4명에 도깨비 돌쇠 하나예요. = NULL이 아니라 IS NULL, 완벽해요!",
      },
      {
        id: "6-5-b2", type: "build", concept: "isnull",
        q: "구름 잡화점(5번 가게) 물건 중 재고를 아는 것의 이름만 보여 줘",
        cards: ["SELECT", "name", "FROM", "items", "WHERE", "shop_id = 5", "AND", "stock IS NOT NULL"],
        extra: ["stock <> NULL", "OR", "stock IS NULL"],
        tables: ["items"],
        hints: [
          "5번 가게 물건이면서 재고 칸에 값이 적힌 것만 남기고, 이름 열만 보여요.",
          "WHERE 다음에 shop_id = 5, AND, stock IS NOT NULL 카드를 놓아요.",
        ],
        explain: "짚신·부채·비단 주머니·등불, 4가지예요. 재고 0인 짚신은 아는 값이라 남고, 빈칸인 한지만 빠졌어요!",
      },
      {
        id: "6-5-b3", type: "build", concept: "coalesce",
        q: "뚝딱 공방(8번 가게) 물건 이름과 재고를, 모르는 재고는 0으로 채워 보여 줘",
        cards: ["SELECT", "name", ",", "COALESCE(stock, 0)", "AS stock_or_zero", "FROM", "items", "WHERE", "shop_id = 8"],
        extra: ["COALESCE(stock, 1)", "stock = NULL"],
        tables: ["items"],
        hints: [
          "8번 가게 물건만 남기고, 이름 옆에 빈칸을 0으로 채운 재고 열을 이름 붙여 놓아요.",
          "name 쉼표 다음에 COALESCE(stock, 0), AS stock_or_zero를, WHERE 다음에 shop_id = 8을 놓아요.",
        ],
        explain: "장승만 0으로 채워지고 나머지 4가지는 원래 재고 그대로예요. 채운 0은 진짜로 센 재고가 아니라는 것, 잊지 않았죠?",
      },
      {
        type: "check", concept: "coalesce",
        q: "6장에서 배운 것으로 맞는 말은?",
        options: [
          "빈칸은 IS NULL로 찾고, COALESCE로 대신 보여 줄 값을 정한다",
          "= NULL로 빈칸을 찾을 수 있다",
          "빈칸과 셈하면 빈칸을 0으로 친다",
        ],
        answer: 0,
        explain: "모르는 값은 IS로 묻고, 보여 줄 때만 채워요. 실무에서는 쇼핑몰 회원 표의 「생일 입력 안 함」 같은 칸이 NULL이라 IS NULL로 먼저 찾아보고 COALESCE로 채워요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 6장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - S: 재고 칸이 빈 물건이 하나씩 있는 가게 1·5·8(메밀전·한지·장승). 가게마다 물건 5가지라
//   IS NULL은 1행, IS NOT NULL은 4행, = NULL은 0행으로 보기 표가 늘 다르다.
// - KIND: 나이 모르는 손님이 있는 종류만(사람 4명, 도깨비 1명). 여우는 0행이라 넣지 않는다.
// - 6-T4는 이 장터(SQLite)에서 ASC 줄 세우기의 빈칸이 맨 위인 것에 기댄다. 설명에 「이 장터에서는」을 붙였다(R36).
export const TEMPLATES = [
  {
    id: "6-T1", concept: "isnull", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, stock\nFROM items\nWHERE shop_id = {S}\n  AND stock IS NULL",
    wrong: [
      "SELECT name, stock\nFROM items\nWHERE shop_id = {S}\n  AND stock IS NOT NULL",
      "SELECT name, stock\nFROM items\nWHERE shop_id = {S}\n  AND stock = NULL",
    ],
    vars: { S: [1, 5, 8] },
    explain: "IS NULL은 재고 칸이 빈 물건만 남겨요. IS NOT NULL은 그 반대이고, = NULL은 답이 늘 「모른다」라 0행이에요.",
  },
  {
    id: "6-T2", concept: "isnull", type: "blank",
    q: "나이 칸이 빈 {KIND} 손님만 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name, village\nFROM customers\nWHERE kind = '{KIND}'\n  AND age ___ NULL",
    chips: ["IS", "=", "<>"],
    answer: 0,
    vars: { KIND: ["사람", "도깨비"] },
    explain: "빈칸은 IS NULL로 찾아요. = NULL과 <> NULL은 답이 늘 「모른다」라 아무 행도 안 나와요.",
  },
  {
    id: "6-T3", concept: "coalesce", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id = {S}",
    wrong: [
      "SELECT name, stock AS stock_or_zero\nFROM items\nWHERE shop_id = {S}",
      "SELECT name,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id = {S}\n  AND stock IS NOT NULL",
    ],
    vars: { S: [1, 5, 8] },
    explain: "COALESCE(stock, 0)은 빈칸만 0으로 채워 보여 줘요. 행은 빼지 않아서 물건 5가지가 모두 나와요.",
  },
  {
    id: "6-T4", concept: "null", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, stock\nFROM items\nWHERE shop_id = {S}\nORDER BY stock, item_id",
    wrong: [
      "SELECT name, stock\nFROM items\nWHERE shop_id = {S}\nORDER BY stock DESC, item_id",
      "SELECT name, stock\nFROM items\nWHERE shop_id = {S}\n  AND stock IS NOT NULL\nORDER BY stock, item_id",
    ],
    vars: { S: [1, 5, 8] },
    explain: "이 장터에서는 작은 값부터 세우면 빈칸이 맨 위예요. DESC면 맨 아래로 가고, IS NOT NULL을 붙이면 빈칸 행이 빠져요.",
  },
];

// ---- 6장 심화 (v0.2, 쓰기 안내 13절 · 디딤돌 docs/specs/2026-11-06-심화-1-6장-디딤돌.md §2 6장) ----
// - 쓸 수 있는 것: 1~6장 낱말 + 6장 심화 전용 NULLIF(ADVANCED_GRAMMAR[6]). 앞 장 심화 낱말(--, 나머지 %)은 쓰지 않는다(R53).
//   조립은 본 과정 6장과 같다(R38 구절 카드, ORDER BY 한 장 R40, SELECT·FROM·WHERE 한 장씩). 레슨마다 build 2개.
// - 빈칸은 items.stock 3개(메밀전 5·한지 24·장승 40)와 customers.age 5개(황소담 18·안여울 28·조은솔 31·표다솜 34·돌쇠 49)뿐.
//   재고 0은 짚신(21) 하나. 가장 많은 재고 58, 손님 나이 8~75. 손님 장부의 name·kind·village·first_visit, 가게 owner에는 빈칸 0.
// - 6-A1 COALESCE로 거르고 세우기(주제 바꿈, 디딤돌 §4):
//   COALESCE(stock, 0) < 3 → 6행(메밀전·산삼·짚신·한지·놋그릇·장승), < 5 → 8행 = stock < 5 OR stock IS NULL(6-3-b1과 같은 행).
//   COALESCE(stock, 9) < 3 → 3행(산삼·짚신·놋그릇, 카드 1). COALESCE(stock, 9) < 5 → 5행(= stock < 5).
//   COALESCE(age, 100) < 20 은 age < 20 과 같은 9명(빈칸은 비교에서 빠짐). 6-4가 WHERE(6-4-b2 해설)·줄 세우기(6-4 문제)에서
//   COALESCE(…, 0)을 이미 한 번씩 보여 줘, 6-A1은 「채울 값(0·9·100·1000)에 따라 걸리고 빠지고 서는 자리가 바뀐다」를 중심에 둔다(fix round 1). COALESCE(age, 100) < 20 → 9명, COALESCE(age, 0) < 20 → 14명.
//   COALESCE(age, 0) < 10 번호 차례 → 황소담·안여울·조은솔·표다솜·문새봄 9·돌쇠·산돌이 8 (7행).
//   1·5번 가게 ORDER BY COALESCE(stock, 0), item_id → 메밀전·짚신·한지·부채 …(빈칸과 0이 번호 차례로 섞임).
//   ORDER BY COALESCE(stock, 1000), item_id → 1·5번은 … 등불 47 · 메밀전 · 한지, 1번은 수육 … 도토리묵 · 메밀전, 8번은 놋그릇 … 다듬이방망이 · 장승.
//   b2 ORDER BY COALESCE(stock, 0), item_id LIMIT 5 → 메밀전·짚신·한지·장승·산삼. stock, item_id면 메밀전·한지·장승·짚신·산삼.
//   빈칸의 줄 세우기 자리(SQLite·MySQL은 ASC 맨 위, PostgreSQL·Oracle은 맨 아래)만 「이 장터에서는」. COALESCE를 WHERE·ORDER BY에
//   쓰는 것은 표준 SQL이라 붙이지 않는다. 6-4가 이미 묻는 「COALESCE(age, 0)으로 세우면 맨 위」는 다시 묻지 않는다.
// - 6-A2 NULLIF(표준 SQL, 감싸지 않음): NULLIF(a, b)는 a = b이면 NULL, 아니면 a. NULLIF(NULL, 0)은 NULL.
//   stock <= 2 OR stock IS NULL → 짚신만 0 → NULL, 산삼·놋그릇 2 그대로. 5번 가게 NULLIF(stock, 12) → 부채(12)·한지가 NULL.
//   WHERE NULLIF(stock, 0) IS NULL → 4행(메밀전·짚신·한지·장승), 5번 가게만이면 짚신·한지.
//   0으로 나누기: 이 장터(SQLite)는 1 / 0이 NULL(실행 확인). PostgreSQL·SQL Server는 오류라 「이 장터에서는」(R36).
//   그래서 이 장터에서는 price / stock과 price / NULLIF(stock, 0)의 결과가 같아, 나누기는 조립·결과 표 보기로 내지 않고 말로만 묻는다.
//   stock < 5의 price / NULLIF(stock, 0): 산삼 60·인삼차 7(정수 나누기, 이 장터에서는)·짚신 NULL·빨래방망이 32·놋그릇 95.
// - 6-A3 의뢰: 산삼 약방(shops 3번) 주인 한약수(앞 심화 의뢰인 오영감·금순·최보부·달래 할멈·나무쇠와 겹치지 않음). 사연은 꾸민 이야기.
//   값(price)·주인(owner) IS NULL → 0행(점검 통과). stock = 0 → 짚신뿐. stock IS NULL OR stock = 0 → 4행.
//   stock > 0 → 36행(= 40 − 빈칸 3 − 짚신), 적은 것부터 산삼 2·놋그릇 2·인삼차 4·빨래방망이 4·오미자청 6.
//   재고 모르는 물건이 있는 가게 1·5·8. 나이 모르는 손님 마을 차례: 안여울·조은솔(느티나무골)·황소담(솔바위골)·표다솜·돌쇠(은행나무마을).
//   A3는 A1·A2를 했다고 기대하지 않아 NULLIF·WHERE 안 COALESCE를 쓰지 않는다.
//   6-1~6-4가 이미 묻는 것(0과 빈칸의 뜻, = NULL 0행, IFNULL로 채운 뒤의 걱정, OR IS NULL 빈자리)은 다시 묻지 않는다.
export const ADVANCED = [
  {
    id: "6-A1", chapter: 6, isAdvanced: true, title: "빈칸 채워 거르고 세우기",
    goal: "채울 값을 골라 WHERE·ORDER BY에서 빈칸을 넣고 뺄 수 있다",
    summary: [
      "COALESCE는 WHERE·ORDER BY에도 와요",
      "채울 값에 따라 빈칸이 걸리고 빠져요",
      "채울 값으로 빈칸이 설 자리를 정해요",
    ],
    cards: [
      {
        say: "6장에서 COALESCE로 빈칸 대신 보여 줄 값을 정했죠? 오늘은 그 값을 고르는 법이에요. 빈칸을 0으로 쳐서 3과 견주면 메밀전·한지·장승이 걸려 6행이에요. 9로 채우면 9가 3보다 커서 셋이 빠져요. 채울 값이 넣고 뺄 것을 정해요.",
        sql: "SELECT name, stock\nFROM items\nWHERE COALESCE(stock, 0) < 3",
      },
      {
        say: "ORDER BY에서도 써요. 이 장터에서는 빈칸이 작은 값부터 세울 때 맨 위지만, 맨 아래로 보내는 데이터베이스도 있어요. 채울 값을 정하면 어디서나 같은 자리예요. 0이면 아래처럼 짚신과 섞여 서고, 어느 재고보다 큰 1000이면 맨 아래로 가요.",
        sql: "SELECT item_id, name, stock\nFROM items\nWHERE shop_id IN (1, 5)\nORDER BY COALESCE(stock, 0), item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "WHERE COALESCE(stock, 0) < 3 에서 재고 칸이 빈 메밀전은 어떻게 될까요?",
        options: ["0으로 쳐서 견주니 결과에 나온다", "빈칸이라 비교에서 빠진다", "오류가 난다"],
        answer: 0,
        explain: "COALESCE가 먼저 빈칸을 0으로 바꾼 다음 3과 견줘요. 0 < 3이 참이라 메밀전이 남아요. COALESCE 없이 stock < 3이면 빠져요.",
      },
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "WHERE COALESCE(stock, 0) < 5 와 같은 물건을 고르는 조건은?",
        options: ["stock < 5 OR stock IS NULL", "stock < 5", "stock < 5 AND stock IS NULL"],
        answer: 0,
        explain: "빈칸을 0으로 치면 「5개 미만이거나 모르는 것」이 돼요. 6장에서 OR IS NULL로 했던 일을 조건 하나로 한 셈이에요. AND면 0행이에요.",
      },
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "빈칸을 9로 채워 견주면 몇 행이 남을까요?",
        code: "SELECT name, stock\nFROM items\nWHERE COALESCE(stock, 9) < 5",
        options: ["5행", "8행", "3행"],
        answer: 0,
        explain: "9는 5보다 커서 빈칸 3가지가 다시 빠져요. 산삼·인삼차·짚신·빨래방망이·놋그릇, stock < 5와 같은 5행이에요. 채울 값에 따라 빈칸이 걸리기도, 빠지기도 해요.",
      },
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "스무 살 밑 손님 목록에 나이 모르는 손님은 넣지 않으려 해요. 알맞은 조건은?",
        options: ["COALESCE(age, 100) < 20", "COALESCE(age, 0) < 20", "COALESCE(age, 19) < 20"],
        answer: 0,
        explain: "100은 20보다 커서 나이 모르는 5명이 빠져 9명이에요. 사실 age < 20만 써도 빈칸은 빠져요. 100은 그 뜻을 드러내 적은 것이에요. 0이나 19면 5명이 들어와 14명이에요.",
      },
      {
        type: "blank", concept: "adv_coalesce_where",
        q: "1번 가게 물건을 재고 적은 것부터, 모르는 재고는 맨 아래로 가게 빈자리를 채워 보세요.",
        code: "SELECT name, stock\nFROM items\nWHERE shop_id = 1\nORDER BY COALESCE(stock, ___),\n  item_id",
        chips: ["1000", "0", "NULL"],
        answer: 0,
        explain: "1000은 어느 재고(가장 많아도 58개)보다 커서 메밀전이 맨 아래로 가요. 0으로 채우면 맨 위, NULL로 채우면 빈칸 그대로라 이 장터에서는 맨 위예요.",
      },
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "1·5번 가게 물건을 이렇게 세우면 맨 아래에 오는 물건은?",
        code: "SELECT name, stock\nFROM items\nWHERE shop_id IN (1, 5)\nORDER BY COALESCE(stock, 1000),\n  item_id",
        options: ["한지", "메밀전", "등불"],
        answer: 0,
        explain: "빈칸인 메밀전(5번)과 한지(24번)가 둘 다 1000이 되어 맨 아래로 가요. 동점이니 번호 차례로 메밀전 다음 한지가 맨 끝이에요. 등불(47)은 빈칸 두 물건 바로 위예요.",
      },
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "ORDER BY COALESCE(stock, 0) 에서 짚신과 메밀전이 동점이 됐어요. 둘의 차례를 정하려면?",
        options: ["item_id 같은 고유한 둘째 기준을 붙인다", "COALESCE를 한 번 더 감싼다", "할 일이 없다. 둘의 차례는 늘 같다"],
        answer: 0,
        explain: "채운 0과 진짜 0이 같은 값이라 동점이에요. 카드 2처럼 item_id를 붙이면 메밀전(5번)·짚신(21번)·한지(24번) 차례로 늘 같아요.",
      },
      {
        type: "choice", concept: "adv_coalesce_where",
        q: "뚝딱 공방 물건을 재고 적은 것부터, 모르는 재고는 맨 아래로 보낸 결과는?",
        options: [
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 8\nORDER BY COALESCE(stock, 1000),\n  item_id" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 8\nORDER BY stock, item_id" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 8\nORDER BY COALESCE(stock, 1000) DESC,\n  item_id" },
        ],
        answer: 0, tables: ["items"],
        explain: "놋그릇(2)부터 다듬이방망이(56), 맨 아래 장승인 표가 정답이에요. stock 그대로면 이 장터에서는 장승이 맨 위예요. DESC면 장승 다음 많은 것부터예요.",
      },
      {
        type: "order", concept: "adv_coalesce_where",
        q: "열 살 밑이거나 나이를 모르는 손님을 번호 차례로 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, age", "FROM customers", "WHERE COALESCE(age, 0) < 10", "ORDER BY customer_id"],
        expect: "name | age\n황소담 | NULL\n안여울 | NULL\n조은솔 | NULL\n표다솜 | NULL\n문새봄 | 9\n돌쇠 | NULL\n산돌이 | 8",
        explain: "나이 모르는 5명이 0살로 쳐져 문새봄(9)·산돌이(8)와 함께 나왔어요. COALESCE가 든 조건도 WHERE 자리는 그대로예요.",
      },
      {
        id: "6-A1-b1", type: "build", concept: "adv_coalesce_where",
        q: "재고가 5개 미만인 물건을 보여 줘. 모르는 재고는 0으로 쳐서 넣어 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "COALESCE(stock, 0) < 5"],
        extra: ["stock < 5", "COALESCE(stock, 9) < 5"],
        tables: ["items"],
        hints: [
          "빈칸을 0으로 친 재고를 5와 견주면, 재고를 모르는 물건도 목록에 남아요.",
          "WHERE 다음에 COALESCE(stock, 0) < 5 카드를 놓아요.",
        ],
        explain: "8가지예요! 5개 미만 5가지에 재고 모르는 메밀전·한지·장승까지 들어왔어요. stock < 5면 빈칸이 빠지고, 9로 채우면 9가 5보다 커서 빠져요.",
      },
      {
        id: "6-A1-b2", type: "build", concept: "adv_coalesce_where",
        q: "재고가 적은 물건 5가지를 보여 줘. 모르는 재고는 0으로 쳐서 세워 줘",
        cards: ["SELECT", "name, stock", "FROM", "items", "ORDER BY", "COALESCE(stock, 0),", "item_id", "LIMIT 5"],
        extra: ["stock,", "DESC"],
        tables: ["items"],
        hints: [
          "빈칸을 0으로 채운 재고로 작은 것부터 세우고, 같은 값은 번호로 정한 뒤 5행만 남겨요.",
          "ORDER BY 다음에 COALESCE(stock, 0), 과 item_id, LIMIT 5를 놓아요.",
        ],
        explain: "메밀전·짚신·한지·장승·산삼이에요. 빈칸 셋이 짚신과 같은 0이 되어 번호 차례로 섞여 섰어요. stock으로 세우면 이 장터에서는 빈칸 셋이 먼저 와요.",
      },
      {
        type: "check", concept: "adv_coalesce_where",
        q: "WHERE·ORDER BY 안의 COALESCE에 대해 맞는 말은?",
        options: [
          "채운 값으로 견주고 세워서, 채울 값에 따라 빈칸이 걸리는지와 서는 자리가 달라진다",
          "WHERE 안에서는 COALESCE를 쓸 수 없다",
          "COALESCE로 세우면 빈칸은 언제나 맨 위에 온다",
        ],
        answer: 0,
        explain: "COALESCE는 SELECT 밖에서도 빈칸을 정한 값으로 바꿔요. 0이면 작은 쪽에, 1000이면 큰 쪽에 서요. 채운 값은 진짜 재고가 아니란 것도 잊지 말아요.",
      },
    ],
  },
  {
    id: "6-A2", chapter: 6, isAdvanced: true, title: "NULLIF로 빈칸 만들기",
    goal: "NULLIF로 정한 값을 빈칸으로 바꾸고 0으로 나누기를 막을 수 있다",
    summary: [
      "NULLIF(a, b): 같으면 빈칸, 다르면 a",
      "COALESCE와 반대로 값을 빈칸으로",
      "나누기 전에 NULLIF(열, 0)으로 0 막기",
    ],
    cards: [
      {
        say: "6장에서 COALESCE로 빈칸을 값으로 채웠죠? 오늘은 거꾸로 NULLIF(널이프)로 값을 빈칸으로 바꿔요. 두 값이 같으면 빈칸, 다르면 앞의 값이에요. 아래에서 짚신의 0만 NULL이 됐죠? 그래서 이제 짚신도 IS NULL로 찾아져요.",
        sql: "SELECT name, stock,\n  NULLIF(stock, 0) AS stock_or_null\nFROM items\nWHERE stock <= 2\n  OR stock IS NULL",
      },
      {
        say: "어디에 쓸까요? 0으로 나누기를 막아요. 이 장터에서는 0으로 나누면 빈칸이 나오지만, 오류를 내는 데이터베이스도 있어요. 나누는 재고를 NULLIF로 감싸 0을 먼저 빈칸으로 바꾸면, 어디서나 짚신 칸이 빈칸으로 나와요.",
        sql: "SELECT name, price, stock,\n  price / NULLIF(stock, 0) AS ratio\nFROM items\nWHERE stock < 5",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_nullif",
        q: "NULLIF(stock, 0) 은 무슨 일을 할까요?",
        options: ["재고가 0이면 빈칸을, 아니면 재고를 보여 준다", "재고가 빈칸이면 0을 보여 준다", "재고가 0인 행을 결과에서 뺀다"],
        answer: 0,
        explain: "NULLIF(a, b)는 a와 b가 같을 때만 빈칸을 내요. 빈칸을 0으로 채우는 건 COALESCE이고, 행을 빼는 건 WHERE예요.",
      },
      {
        type: "choice", concept: "adv_nullif",
        q: "COALESCE(stock, 0)과 NULLIF(stock, 0)을 견준 말로 맞는 것은?",
        options: [
          "COALESCE는 빈칸을 0으로, NULLIF는 0을 빈칸으로 바꾼다",
          "둘은 같은 일을 하는 다른 이름이다",
          "COALESCE는 0을 빈칸으로, NULLIF는 빈칸을 0으로 바꾼다",
        ],
        answer: 0,
        explain: "방향이 반대예요. 짚신(0)은 COALESCE로는 0 그대로, NULLIF로는 빈칸이에요. 같은 일의 다른 이름은 COALESCE와 IFNULL이에요.",
      },
      {
        type: "choice", concept: "adv_nullif",
        q: "둘째 값을 12로 바꿨어요. 이 SQL에서 빈칸으로 보이는 물건은?",
        code: "SELECT name,\n  NULLIF(stock, 12) AS stock_or_null\nFROM items\nWHERE shop_id = 5",
        options: ["부채와 한지", "부채만", "짚신과 한지"],
        answer: 0,
        explain: "재고가 12개인 부채가 12와 같아 빈칸이 돼요. 원래 빈칸인 한지는 그대로 빈칸이고, 짚신의 0은 12와 달라 0으로 남아요.",
      },
      {
        type: "blank", concept: "adv_nullif",
        q: "재고 5개 미만 물건 가운데 0만 빈칸으로 보이게 빈자리를 채워 보세요.",
        code: "SELECT name, stock,\n  ___(stock, 0) AS stock_or_null\nFROM items\nWHERE stock < 5",
        chips: ["NULLIF", "COALESCE", "IFNULL"],
        answer: 0,
        explain: "같으면 빈칸을 내는 건 NULLIF라 짚신 칸만 NULL이 돼요. COALESCE와 IFNULL은 빈칸을 채우는 쪽이라, 빈칸이 없는 이 다섯 행은 재고 그대로예요.",
      },
      {
        type: "choice", concept: "adv_nullif",
        q: "이 장터에서 14 / 0 처럼 0으로 나누면 어떻게 될까요?",
        options: ["빈칸(NULL)이 나온다", "0이 나온다", "14가 나온다"],
        answer: 0,
        explain: "이 장터에서는 0으로 나누면 오류 없이 빈칸이 나와요. 오류를 내고 멈추는 데이터베이스도 있어서, 0으로 나누지 않게 미리 막아 두면 좋아요.",
      },
      {
        type: "choice", concept: "adv_nullif",
        q: "이 장터는 0으로 나눠도 빈칸이 나와요. 그래도 나누는 재고를 NULLIF로 감싸는 까닭은?",
        options: [
          "0으로 나누면 오류를 내는 데이터베이스에서도 빈칸이 나오게",
          "나눈 값이 0이 나오게",
          "재고가 0인 행을 결과에서 빼려고",
        ],
        answer: 0,
        explain: "빈칸으로 나누면 어느 데이터베이스에서나 빈칸이에요. 0을 먼저 빈칸으로 바꿔 두면 오류 걱정 없이 짚신 칸만 빈칸이 되고, 행도 빠지지 않아요.",
      },
      {
        type: "choice", concept: "adv_nullif",
        q: "인삼차(30엽전, 재고 4개)의 ratio 칸은 얼마일까요?",
        code: "SELECT name,\n  price / NULLIF(stock, 0) AS ratio\nFROM items\nWHERE shop_id = 3\n  AND stock < 5",
        options: ["7", "7.5", "NULL"],
        answer: 0,
        explain: "재고 4는 0이 아니라 NULLIF가 그대로 둬요. 이 장터에서는 정수끼리 나누면 소수점 아래를 버려 30 / 4 = 7이에요. 빈칸이 되는 건 재고가 0일 때뿐이에요.",
      },
      {
        type: "choice", concept: "adv_nullif",
        q: "WHERE NULLIF(stock, 0) IS NULL 에 걸리는 물건은?",
        options: ["재고가 빈칸이거나 0인 물건", "재고가 빈칸인 물건만", "재고가 0인 물건만"],
        answer: 0,
        explain: "0은 NULLIF가 빈칸으로 바꾸고, 원래 빈칸은 그대로 빈칸이에요. 그래서 메밀전·짚신·한지·장승, 4가지가 IS NULL에 걸려요.",
      },
      {
        type: "order", concept: "adv_nullif",
        q: "구름 잡화점 물건 중 재고가 0이거나 모르는 것을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, stock", "FROM items", "WHERE shop_id = 5", "AND NULLIF(stock, 0) IS NULL"],
        expect: "name | stock\n짚신 | 0\n한지 | NULL",
        explain: "5번 가게 물건 5가지 중 0인 짚신과 빈칸인 한지가 나왔어요. NULLIF가 든 조건도 AND로 다른 조건과 묶여요.",
      },
      {
        id: "6-A2-b1", type: "build", concept: "adv_nullif",
        q: "구름 잡화점 물건 이름과 재고를 보여 줘. 재고 0은 빈칸으로 바꿔 줘",
        cards: ["SELECT", "name", ",", "NULLIF(stock, 0)", "AS stock_or_null", "FROM", "items", "WHERE", "shop_id = 5"],
        extra: ["COALESCE(stock, 0)", "NULLIF(stock, 1)"],
        tables: ["items"],
        hints: [
          "5번 가게 물건만 남기고, 이름 옆에 0과 같으면 빈칸이 되는 재고 열을 이름 붙여 놓아요.",
          "name 쉼표 다음에 NULLIF(stock, 0)과 AS stock_or_null을, WHERE 다음에 shop_id = 5를 놓아요.",
        ],
        explain: "짚신의 0이 빈칸이 되고 한지는 원래 빈칸 그대로예요. COALESCE(stock, 0)이면 거꾸로 한지가 0이 되고, NULLIF(stock, 1)이면 재고 1개인 물건이 없어 그대로예요.",
      },
      {
        id: "6-A2-b2", type: "build", concept: "adv_nullif",
        q: "재고를 모르거나 0인 물건을 NULLIF로 한 번에 찾아 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "NULLIF(stock, 0) IS NULL"],
        extra: ["stock IS NULL", "NULLIF(stock, 0) = NULL"],
        tables: ["items"],
        hints: [
          "0을 빈칸으로 바꾼 다음 빈칸인지 물으면, 원래 빈칸과 0이 함께 걸려요.",
          "WHERE 다음에 NULLIF(stock, 0) IS NULL 카드를 놓아요.",
        ],
        explain: "메밀전·짚신·한지·장승, 4가지예요! stock IS NULL이면 짚신이 빠진 3가지예요. 빈칸은 = NULL로 물으면 늘 0행이라 NULLIF 뒤에도 IS NULL이에요.",
      },
      {
        type: "check", concept: "adv_nullif",
        q: "NULLIF에 대해 맞는 말은?",
        options: [
          "두 값이 같으면 빈칸을, 다르면 앞의 값을 내서 0으로 나누기를 막는 데 쓴다",
          "빈칸을 정한 값으로 채워 보여 준다",
          "두 값이 다르면 빈칸을 낸다",
        ],
        answer: 0,
        explain: "NULLIF는 COALESCE와 반대 방향이에요. 0을 빈칸으로 바꿔 두면 나누기도 안전하고, IS NULL로 빈칸과 0을 함께 찾을 수도 있어요.",
      },
    ],
  },
  {
    id: "6-A3", chapter: 6, isAdvanced: true, title: "빈칸 점검: 데이터 품질 검사",
    goal: "빈칸과 0을 함께 찾아, 둘이 구별되는 점검표를 만들 수 있다",
    summary: [
      "열마다 IS NULL로 묻고, 0행이면 통과",
      "빈칸과 0은 OR로 함께 찾아요",
      "점검표엔 채우지 않은 칸 그대로",
    ],
    cards: [
      {
        say: "6장에서 빈칸을 IS NULL로 찾았죠? 오늘은 의뢰예요! 산삼 약방 한약수 님이 「장부에서 재고를 모르거나 0인 물건을 점검표로 뽑아 주게」래요. 먼저 열마다 빈칸을 물어요. 아래 값 칸은 0행, 빈칸이 없어 통과!",
        sql: "SELECT name, price\nFROM items\nWHERE price IS NULL",
      },
      {
        say: "재고 칸은 손볼 게 있어요. 빈칸은 세어 적어야 하고 0은 새로 들여와야 해서 둘 다 점검표에 넣어요. 아래처럼 0인지만 물으면 짚신 하나뿐이니, 빈칸은 IS NULL을 OR로 함께 물어요. 재고 칸은 채우지 말고 그대로 보여요.",
        sql: "SELECT name, stock\nFROM items\nWHERE stock = 0",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_apply_6",
        q: "한약수 님이 빈칸과 0을 함께 점검하라는 까닭은?",
        options: [
          "빈칸은 세어 적고 0은 새로 들여와야 해서, 둘 다 손볼 곳이라서",
          "빈칸과 0은 같은 뜻이라서",
          "0은 잘못 적은 값이라서",
        ],
        answer: 0,
        explain: "빈칸은 몇 개인지 모르는 것, 0은 다 팔린 것이라 뜻은 달라요. 그래도 둘 다 장부를 손봐야 해서 한 점검표에 모아요.",
      },
      {
        type: "choice", concept: "adv_apply_6",
        q: "가게 장부의 주인(owner) 칸을 점검했어요. 결과는 몇 행일까요?",
        code: "SELECT name, owner\nFROM shops\nWHERE owner IS NULL",
        options: ["0행", "8행", "1행"],
        answer: 0,
        explain: "가게 8곳 모두 주인 이름이 적혀 있어 0행이에요. 오류가 아니라 「이 열엔 빈칸이 없다」는 점검 통과 소식이에요.",
      },
      {
        type: "choice", concept: "adv_apply_6",
        q: "나이 칸을 WHERE age = NULL 로 점검했더니 0행이에요. 점검 통과일까요?",
        options: [
          "아니다. = NULL은 빈칸이 있어도 늘 0행이라 믿을 수 없다",
          "그렇다. 0행이니 빈칸이 없다",
          "아니다. 0행이면 SQL에 오류가 난 것이다",
        ],
        answer: 0,
        explain: "나이 칸엔 빈칸이 5개나 있어요. 0행이 「통과」가 되려면 IS NULL로 물어야 해요. 점검 SQL이 바르게 물었는지도 함께 봐요.",
      },
      {
        type: "choice", concept: "adv_apply_6",
        q: "WHERE stock = 0 만 쓰면 점검표에서 빠지는 물건은?",
        options: ["메밀전·한지·장승", "짚신", "아무것도 안 빠진다"],
        answer: 0,
        explain: "빈칸은 0과 같은지 몰라서 = 0에 안 걸려요. 재고를 모르는 메밀전·한지·장승은 stock IS NULL을 OR로 이어 함께 불러요.",
      },
      {
        type: "choice", concept: "adv_apply_6",
        q: "손님 장부를 열마다 IS NULL로 점검했더니 한 열에서만 행이 나왔어요. 어느 열일까요?",
        options: ["age(나이)", "village(마을)", "first_visit(첫 방문)"],
        answer: 0,
        explain: "손님 장부에서 빈칸이 있는 열은 나이뿐이에요. 나이 모르는 손님 5명이 점검표 둘째 장이에요. 다른 열은 0행으로 통과예요.",
      },
      {
        type: "choice", concept: "adv_apply_6",
        q: "나이 모르는 손님 점검표를 ORDER BY village 로만 세우면 무엇이 걱정일까요?",
        options: [
          "같은 마을 손님끼리는 차례가 정해지지 않는다",
          "나이 모르는 손님이 결과에서 빠진다",
          "마을 이름으로는 줄 세울 수 없다",
        ],
        answer: 0,
        explain: "느티나무골과 은행나무마을에 두 명씩 살아요. customer_id를 둘째 기준으로 붙이면 같은 마을 안에서도 늘 번호 차례예요.",
      },
      {
        type: "choice", concept: "adv_apply_6",
        q: "재고가 1개 이상이라 점검을 통과한 물건이에요. 결과는 몇 행일까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock > 0",
        options: ["36행", "37행", "40행"],
        answer: 0,
        explain: "빈칸 3가지는 0보다 큰지 몰라 빠지고, 짚신은 0이라 빠져요. 40 − 4 = 36이에요. 37행은 IS NOT NULL처럼 짚신까지 센 거예요.",
      },
      {
        type: "blank", concept: "adv_apply_6",
        q: "재고를 모르는 물건이 있는 가게 번호를 겹치지 않게 보이도록 빈자리를 채워 보세요.",
        code: "SELECT ___ shop_id\nFROM items\nWHERE stock IS NULL\nORDER BY shop_id",
        chips: ["DISTINCT", "*", "IS"],
        answer: 0,
        explain: "1·5·8번 가게예요. 빈칸 물건이 가게마다 하나씩이라, 그 가게에 재고를 세어 달라고 부탁하면 돼요. * 나 IS를 넣으면 오류가 나요.",
      },
      {
        type: "order", concept: "adv_apply_6",
        q: "점검을 통과한 물건 중 재고가 적은 5가지를 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, stock", "FROM items", "WHERE stock > 0", "ORDER BY stock, item_id", "LIMIT 5"],
        expect: "name | stock\n산삼 | 2\n놋그릇 | 2\n인삼차 | 4\n빨래방망이 | 4\n오미자청 | 6",
        explain: "빈칸과 0을 걸러 낸 뒤라 빈칸의 줄 세우기 자리를 걱정할 필요가 없어요. 곧 0이 될 산삼·놋그릇부터 보여요.",
      },
      {
        id: "6-A3-b1", type: "build", concept: "adv_apply_6",
        q: "한약수 님 의뢰: 재고를 모르거나 0인 물건의 이름과 재고를 보여 줘",
        cards: ["SELECT", "name, stock", "FROM", "items", "WHERE", "stock IS NULL", "OR", "stock = 0"],
        extra: ["AND", "stock = NULL"],
        tables: ["items"],
        hints: [
          "재고 칸이 빈 것과 0인 것, 둘 중 하나만 맞아도 남기고 재고 칸도 함께 보여요.",
          "WHERE 다음에 stock IS NULL, OR, stock = 0 카드를 놓아요.",
        ],
        explain: "점검표 첫 장 완성! 메밀전·한지·장승은 NULL, 짚신은 0이라 무엇을 세고 무엇을 들여올지 한눈에 보여요. AND면 0행, = NULL이면 빈칸이 빠져요.",
      },
      {
        id: "6-A3-b2", type: "build", concept: "adv_apply_6",
        q: "점검표 둘째 장: 나이 모르는 손님을 마을 차례로 보여 줘",
        cards: ["SELECT", "name, village", "FROM", "customers", "WHERE", "age IS NULL", "ORDER BY", "village,", "customer_id"],
        extra: ["customer_id DESC", "village DESC,"],
        tables: ["customers"],
        hints: [
          "나이 칸이 빈 손님만 남기고, 마을 차례로 세운 뒤 같은 마을은 번호로 정해요.",
          "ORDER BY 다음에 village, 와 customer_id를 놓아요.",
        ],
        explain: "안여울·조은솔(느티나무골), 황소담(솔바위골), 표다솜·돌쇠(은행나무마을)예요. 마을마다 찾아가 나이를 여쭤보면 점검 끝!",
      },
      {
        type: "check", concept: "adv_apply_6",
        q: "빈칸 점검에 대해 맞는 말은?",
        options: [
          "열마다 IS NULL로 묻고, 빈칸과 0은 OR로 함께 찾아 원래 칸 그대로 보여 준다",
          "재고가 0인 물건을 = 0으로 찾으면 빈칸까지 함께 나온다",
          "점검표에는 COALESCE로 빈칸을 0으로 채워 보여 준다",
        ],
        answer: 0,
        explain: "IS NULL로 물어 0행이면 통과예요. 빈칸과 0은 뜻이 달라 OR로 함께 찾되, 채우지 않아야 점검표에서 둘이 구별돼요.",
      },
    ],
  },
];
