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
        chips: ["NULL", "0", "NOT"],
        answer: 0,
        explain: "IS 다음에 NULL이 와야 「빈칸이다」예요. 0을 넣으면 0살 손님을 찾아 아무도 안 나오고, NOT만 넣으면 오류가 나요.",
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
        lines: ["SELECT name,", "COALESCE(stock, 0) AS stock_or_zero", "FROM items", "WHERE shop_id = 5"],
        expect: "name | stock_or_zero\n짚신 | 0\n부채 | 12\n비단 주머니 | 16\n한지 | 0\n등불 | 47",
        explain: "COALESCE는 SELECT 줄의 열 자리에 와요. 한지의 빈칸이 0으로 채워졌어요. 짚신의 0은 원래 적힌 값이에요.",
      },
      {
        type: "choice", concept: "coalesce",
        q: "도깨비 국밥집(1번 가게) 물건의 재고를, 모르면 0으로 채워 보여 준 결과는?",
        options: [
          { sql: "SELECT name,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id = 1" },
          { sql: "SELECT name, stock\nFROM items\nWHERE shop_id = 1" },
          { sql: "SELECT name,\n  COALESCE(stock, 0) AS stock_or_zero\nFROM items\nWHERE shop_id = 1\n  AND stock IS NOT NULL" },
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
        q: "나이 모르는 손님을 보여 줘",
        cards: ["SELECT", "*", "FROM", "customers", "WHERE", "age", "IS", "NULL"],
        extra: ["=", "NOT", "items"],
        tables: ["customers"],
        hints: [
          "나이 칸이 빈 손님만 남겨요. 빈칸은 = 로 못 찾아요.",
          "WHERE age 다음에 IS와 NULL을 놓아요.",
        ],
        explain: "6장의 대표 문제, 나이 모르는 손님 5명을 다시 찾았어요. = NULL이 아니라 IS NULL, 완벽해요!",
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
      "SELECT name, stock\nFROM items\nWHERE shop_id = {S}",
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
