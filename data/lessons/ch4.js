// 4장 「여러 조건」 (설계 §6: AND·OR·NOT, IN, BETWEEN, LIKE / 장터 예: 이름에 「방망이」가 든 물건).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 4
// 4장 낱말은 3장까지(SELECT·FROM·*·AS·+ - * /·WHERE·비교 기호)에 AND·OR·NOT·IN·BETWEEN·LIKE를 더한 것이다.
// 괄호 ( )는 낱말이 아니라 검사하지 않으므로, AND가 OR보다 먼저 묶이는 것과 괄호를 4-4에서 가르친다.
// 줄 세우기(ORDER BY, 5장)·빈칸(NULL, 6장)은 쓰지 않는다.
// - 조립 카드 수: 1~5장은 카드 하나에 낱말 하나, 더미 12장 이하(헷갈림 2장 이상)라 정답 카드는 10장까지다.
//   SELECT * FROM 표 WHERE 가 이미 카드 5장이라 조건에는 카드 5장만 남는다. AND·OR로 비교 둘을 이으면(카드 7장) 넘치고,
//   IN (값, 값)도 카드 7장이라 넘친다. 그래서 조립은 BETWEEN(카드 5장)·LIKE(카드 3장)·NOT LIKE(카드 4장)로만 만들고,
//   AND·OR·IN·괄호는 터치 문제(객관식·빈자리·순서)로 가르친다. 4-2(OR와 IN)의 조립은 「목록이 아니라 범위면 BETWEEN」을
//   고르게 하는 BETWEEN 문제다(헷갈림 카드 IN·OR).
// - 「방망이」가 든 물건 이름(data/market.sql): 도깨비방망이·금방망이·은방망이·방망이 손잡이·작은 방망이(가게 7),
//   다듬이방망이·빨래방망이(가게 8), 모두 7가지. 가게 이름에는 「방망이 대장간」 하나.
//   '방망이%' → 방망이 손잡이 1, '%방망이' → 6, '_방망이' → 금방망이·은방망이 2, '__방망이' → 빨래방망이 1.
// - LIKE 무늬 같은 글자 값 카드는 헷갈림 카드로 쓰지 않는다(판정 R33): FROM items '%방망이' WHERE …처럼
//   표 이름 뒤에 끼우면 SQLite가 표 별칭으로 읽어 정답이 된다. 헷갈림 카드는 기호(=)·낱말(IN)·표/열 이름으로 쓴다.
// - BETWEEN은 양 끝을 넣는다: 10~20엽전에 막걸리(10)·익모초(20), 25~30엽전에 수육·오미자청(25)·인삼차(30)가 끝값이다.
// - NOT IN·NOT은 빈칸 없는 열(category, kind, village, shop_id, price, name)에만 쓴다. 재고(stock) 빈칸은 4-4 문제 하나에서
//   「빈칸은 뒤집어도 모르는 값, 6장에서」로만 짚는다(3-4와 같은 말).
export const CHAPTER = { id: 4, title: "여러 조건" };

export const LESSONS = [
  {
    id: "4-1", chapter: 4, title: "AND와 BETWEEN",
    goal: "AND로 두 조건을 함께 걸고, BETWEEN으로 범위를 고를 수 있다",
    summary: [
      "AND = 두 조건이 모두 맞는 행만",
      "BETWEEN 작은 값 AND 큰 값",
      "BETWEEN은 양 끝 값도 넣어요",
    ],
    cards: [
      {
        say: "조건이 둘이면 AND로 이어요. AND는 「그리고」라서 두 조건이 모두 맞는 행만 남아요. 아래는 뚝딱 공방(가게 번호 8) 물건 중 200엽전 넘는 것이에요. 쇠솥과 장승 둘뿐이죠!",
        sql: "SELECT name, price\nFROM items\nWHERE shop_id = 8 AND price > 200",
      },
      {
        say: "「10엽전부터 20엽전까지」 같은 범위는 BETWEEN 10 AND 20으로 줄여 써요. >= 10 과 <= 20 을 AND로 이은 것과 같아서 양 끝도 들어가요. 딱 10엽전인 막걸리, 20엽전인 익모초가 보이죠?",
        sql: "SELECT name, price\nFROM items\nWHERE price BETWEEN 10 AND 20",
      },
    ],
    items: [
      {
        type: "choice", concept: "andor",
        q: "AND로 이은 두 조건은 어떤 행을 남길까요?",
        options: ["두 조건이 모두 맞는 행", "둘 중 하나라도 맞는 행", "앞 조건만 맞는 행"],
        answer: 0,
        explain: "AND는 「그리고」예요. 두 조건이 다 맞아야 남아요. 하나만 맞아도 되는 낱말은 다음 레슨에서 배워요.",
      },
      {
        type: "choice", concept: "andor",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE shop_id = 8 AND price > 200",
        options: ["2행", "5행", "10행"],
        answer: 0,
        explain: "뚝딱 공방 물건도 5가지, 200엽전 넘는 물건도 5가지예요. 두 조건이 모두 맞는 건 쇠솥·장승 2가지뿐이에요.",
      },
      {
        type: "blank", concept: "andor",
        q: "20살 미만인 여우 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, age\nFROM customers\nWHERE kind = '여우' ___ age < 20",
        chips: ["AND", ",", "WHERE"],
        answer: 0,
        explain: "두 조건을 함께 걸 때는 AND로 이어요. 해랑(18)·은호(13), 2명이 나와요. 쉼표나 WHERE를 한 번 더 쓰면 오류가 나요.",
      },
      {
        type: "choice", concept: "andor",
        q: "두 조건을 WHERE 하나에 바르게 이은 것은?",
        options: [
          "WHERE price < 10\n  AND shop_id = 1",
          "WHERE price < 10,\n  shop_id = 1",
          "WHERE price < 10\nWHERE shop_id = 1",
        ],
        answer: 0,
        explain: "WHERE는 한 번만 쓰고, 조건과 조건 사이는 AND로 이어요. 쉼표로 잇거나 WHERE를 두 번 쓰면 오류가 나요.",
      },
      {
        type: "choice", concept: "between",
        q: "price BETWEEN 10 AND 20 과 결과가 같은 조건은?",
        options: [
          "price >= 10 AND price <= 20",
          "price > 10 AND price < 20",
          "price >= 10 AND price < 20",
        ],
        answer: 0,
        explain: "BETWEEN은 양 끝을 넣는 >= 와 <= 예요. > 와 < 로 쓰면 10엽전 막걸리와 20엽전 익모초가 빠져요.",
      },
      {
        type: "choice", concept: "between",
        q: "값이 20엽전인 익모초는 이 SQL의 결과에 나올까요?",
        code: "SELECT name, price\nFROM items\nWHERE price BETWEEN 10 AND 20",
        options: [
          "나온다. BETWEEN은 양 끝 값도 넣는다",
          "나오지 않는다. 범위 끝 값은 뺀다",
          "20엽전 물건은 오류가 난다",
        ],
        answer: 0,
        explain: "BETWEEN 10 AND 20은 10과 20을 모두 넣어요. 그래서 막걸리(10)와 익모초(20)가 함께 나와요.",
      },
      {
        type: "choice", concept: "between",
        q: "이 SQL의 결과는 어떨까요?",
        code: "SELECT name, price\nFROM items\nWHERE price BETWEEN 30 AND 25",
        options: ["행이 하나도 없는 표", "25~30엽전 물건 5가지", "범위가 거꾸로라 오류가 난다"],
        answer: 0,
        explain: "BETWEEN은 작은 값을 먼저, 큰 값을 뒤에 써요. 30 이상이면서 25 이하인 값은 없으니 0행이에요. 오류는 나지 않아요.",
      },
      {
        type: "blank", concept: "between",
        q: "값이 25엽전부터 30엽전까지인 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price BETWEEN 25 ___ 30",
        chips: ["AND", "~", ","],
        answer: 0,
        explain: "BETWEEN의 두 값은 AND로 이어요. 우리가 흔히 쓰는 ~ 나 쉼표를 넣으면 오류가 나요. 수육(25)부터 인삼차(30)까지 5가지예요.",
      },
      {
        type: "choice", concept: "andor",
        q: "20살 미만인 여우 손님만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, kind, age\nFROM customers\nWHERE kind = '여우' AND age < 20" },
          { sql: "SELECT name, kind, age\nFROM customers\nWHERE kind = '여우'" },
          { sql: "SELECT name, kind, age\nFROM customers\nWHERE age < 20" },
        ],
        answer: 0, tables: ["customers"],
        explain: "kind가 모두 여우이고 age가 모두 20보다 작은 표, 해랑·은호가 정답이에요. 조건을 하나만 걸면 여우 손님 12명이나 20살 미만 손님 9명이 나와요.",
      },
      {
        type: "order", concept: "andor",
        q: "값이 25엽전 이상 30엽전 이하인 물건을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE price >= 25", "AND price <= 30"],
        expect: "name | price\n수육 | 25\n인삼차 | 30\n오미자청 | 25\n구기자 | 28\n복주머니 | 28",
        explain: "WHERE 줄 다음에 AND 줄을 이어 써요. 이 SQL은 price BETWEEN 25 AND 30과 결과가 같아요.",
      },
      {
        id: "4-1-b1", type: "build", concept: "between",
        q: "값이 10엽전 이상 20엽전 이하인 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "price", "BETWEEN", "10", "AND", "20"],
        extra: [">", "stock"],
        tables: ["items"],
        hints: [
          "물건 표에서 값 열이 10과 20 사이인 행만 남겨요. 10과 20도 들어가요.",
          "WHERE price 다음에 BETWEEN, 10, AND, 20을 놓아요.",
        ],
        explain: "막걸리(10)부터 익모초(20)까지 9가지가 나왔어요. 양 끝 값도 BETWEEN이 챙겨 줬죠!",
      },
      {
        type: "check", concept: "between",
        q: "AND와 BETWEEN에 대해 맞는 말은?",
        options: [
          "AND는 두 조건이 모두 맞아야 하고, BETWEEN은 양 끝 값도 넣는다",
          "AND는 하나만 맞아도 되고, BETWEEN은 양 끝 값을 뺀다",
          "BETWEEN 뒤에는 큰 값을 먼저 쓴다",
        ],
        answer: 0,
        explain: "AND는 「그리고」, BETWEEN 작은 값 AND 큰 값은 그 두 값까지 넣는 범위예요.",
      },
    ],
  },
  {
    id: "4-2", chapter: 4, title: "OR와 IN",
    goal: "OR로 하나라도 맞는 행을, IN으로 여러 값 중 하나를 고를 수 있다",
    summary: [
      "OR = 하나라도 맞으면 남겨요",
      "IN (값, 값) = 그 값 중 하나와 같다",
      "IN은 딱 그 값만, 범위는 BETWEEN",
    ],
    cards: [
      {
        say: "약재 가게와 공방 가게를 함께 보려면 OR를 써요. OR는 「또는」, 두 조건 중 하나라도 맞으면 남아요. 한 가게가 약재이면서 공방일 수는 없으니 여기에 AND를 쓰면 0행이에요.",
        sql: "SELECT name, category\nFROM shops\nWHERE category = '약재'\nOR category = '공방'",
      },
      {
        say: "같은 열을 OR로 여러 번 이을 때는 IN이 편해요. IN 뒤 괄호 안에 값을 쉼표로 늘어놓으면 「이 값들 중 하나와 같다」예요. 아래는 앞 카드의 OR와 결과가 똑같아요.",
        sql: "SELECT name, category\nFROM shops\nWHERE category IN ('약재', '공방')",
      },
    ],
    items: [
      {
        type: "choice", concept: "andor",
        q: "OR로 이은 두 조건은 어떤 행을 남길까요?",
        options: ["둘 중 하나라도 맞는 행", "두 조건이 모두 맞는 행", "두 조건이 모두 틀린 행"],
        answer: 0,
        explain: "OR는 「또는」이에요. 하나만 맞아도 남고, 둘 다 맞아도 남아요. 둘 다 맞아야 하는 건 AND예요.",
      },
      {
        type: "choice", concept: "andor",
        q: "약재 가게와 공방 가게를 함께 보려고 이렇게 썼더니 0행이에요. 까닭은?",
        code: "SELECT name\nFROM shops\nWHERE category = '약재'\nAND category = '공방'",
        options: ["한 가게가 약재이면서 공방일 수는 없어서", "약재 가게가 장부에 없어서", "AND 뒤에는 글자 값을 못 써서"],
        answer: 0,
        explain: "AND는 한 행에서 두 조건이 모두 맞아야 해요. 종류 칸에는 값이 하나라 0행이에요. 「약재 또는 공방」이니 OR를 써요.",
      },
      {
        type: "blank", concept: "andor",
        q: "여우고개나 달빛마을에 사는 손님이 모두 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n___ village = '달빛마을'",
        chips: ["OR", "AND", "IN"],
        answer: 0,
        explain: "두 마을 중 어디든 사는 손님이니 OR예요. AND는 0행이고, IN은 이 자리에 오면 오류가 나요.",
      },
      {
        type: "choice", concept: "andor",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\nOR village = '달빛마을'",
        options: ["9행", "3행", "0행"],
        answer: 0,
        explain: "여우고개 손님 3명과 달빛마을 손님 6명, 모두 9명이에요. OR는 두 조건에 맞는 행을 함께 남겨요.",
      },
      {
        type: "choice", concept: "in",
        q: "category IN ('약재', '공방')은 무슨 뜻일까요?",
        options: ["괄호 속 값 중 하나와 같다", "괄호 속 값과 모두 같다", "괄호 속 두 값 사이의 범위"],
        answer: 0,
        explain: "IN은 OR를 줄여 쓴 거예요. category = '약재' OR category = '공방'과 같아요.",
      },
      {
        type: "choice", concept: "in",
        q: "shop_id IN (1, 3) 과 결과가 같은 조건은?",
        options: ["shop_id = 1 OR shop_id = 3", "shop_id = 1 AND shop_id = 3", "shop_id BETWEEN 1 AND 3"],
        answer: 0,
        explain: "IN은 목록 속 값마다 = 를 OR로 이은 것과 같아요. BETWEEN 1 AND 3은 2번 가게 물건까지 넣어서 달라요.",
      },
      {
        type: "choice", concept: "in",
        q: "값이 28엽전인 구기자는 이 SQL의 결과에 나올까요?",
        code: "SELECT name, price\nFROM items\nWHERE price IN (25, 30)",
        options: [
          "나오지 않는다. IN은 목록의 값과 딱 같은 것만 고른다",
          "나온다. 25와 30 사이 값이라서",
          "IN 안에 숫자를 쓰면 오류가 난다",
        ],
        answer: 0,
        explain: "IN (25, 30)은 25엽전과 30엽전, 딱 두 값이에요. 수육·오미자청·인삼차만 나와요. 사이 값까지 고르려면 BETWEEN 25 AND 30이에요.",
      },
      {
        type: "blank", concept: "in",
        q: "여우 손님과 사람 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, kind\nFROM customers\nWHERE kind ___ ('여우', '사람')",
        chips: ["IN", "=", "BETWEEN"],
        answer: 0,
        explain: "여러 값 중 하나와 같은지는 IN이에요. = 와 BETWEEN은 괄호 목록과 쓸 수 없어 오류가 나요. 손님 36명이 나와요.",
      },
      {
        type: "choice", concept: "in",
        q: "IN을 바르게 쓴 조건은?",
        options: ["shop_id IN (1, 2)", "shop_id IN 1, 2", "shop_id = (1, 2)"],
        answer: 0,
        explain: "IN 뒤의 값 목록은 둥근 괄호로 감싸요. 괄호가 없으면 오류예요. = 는 값 하나와만 견줄 수 있어 이것도 오류예요.",
      },
      {
        type: "choice", concept: "in",
        q: "먹거리 가게와 잡화 가게만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, category\nFROM shops\nWHERE category IN ('먹거리', '잡화')" },
          { sql: "SELECT name, category\nFROM shops\nWHERE category = '먹거리'" },
          { sql: "SELECT name, category\nFROM shops\nWHERE category IN ('약재', '공방')" },
        ],
        answer: 0, tables: ["shops"],
        explain: "category 열에 먹거리와 잡화가 섞인 4곳이 정답이에요. = '먹거리'는 먹거리 가게 2곳, 약재·공방 목록은 다른 4곳이에요.",
      },
      {
        type: "order", concept: "andor",
        q: "먹거리 가게와 공방 가게를 함께 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, category", "FROM shops", "WHERE category = '먹거리'", "OR category = '공방'"],
        expect: "name | category\n도깨비 국밥집 | 먹거리\n여우골 떡방 | 먹거리\n방망이 대장간 | 공방\n뚝딱 공방 | 공방",
        explain: "WHERE 줄 다음에 OR 줄을 이어요. category IN ('먹거리', '공방')으로 써도 결과가 같아요.",
      },
      {
        id: "4-2-b1", type: "build", concept: "between",
        q: "13살부터 19살까지인 손님을 보여 줘",
        cards: ["SELECT", "*", "FROM", "customers", "WHERE", "age", "BETWEEN", "13", "AND", "19"],
        extra: ["IN", "OR"],
        tables: ["customers"],
        hints: [
          "딱 정한 나이 몇 개가 아니라 이어진 범위예요. 13살과 19살도 들어가요.",
          "WHERE age 다음에 BETWEEN, 13, AND, 19를 놓아요.",
        ],
        explain: "바람돌이·해랑·정다온·은호·쿵쾅이, 5명이에요. 낱낱의 값은 IN, 이어진 범위는 BETWEEN이 딱이에요!",
      },
      {
        type: "check", concept: "in",
        q: "OR와 IN에 대해 맞는 말은?",
        options: [
          "OR는 하나라도 맞으면 남기고, IN은 목록 값 중 하나와 같은 행을 고른다",
          "OR는 두 조건이 모두 맞아야 남긴다",
          "IN (25, 30)은 25부터 30까지를 모두 고른다",
        ],
        answer: 0,
        explain: "IN은 = 를 OR로 이은 것과 같아요. 낱낱의 값 몇 개는 IN, 이어진 범위는 BETWEEN이에요.",
      },
    ],
  },
  {
    id: "4-3", chapter: 4, title: "LIKE로 글자 찾기",
    goal: "LIKE와 %·_ 로 글자 무늬에 맞는 행을 찾을 수 있다",
    summary: [
      "LIKE '%방망이%' = 방망이가 든 글자",
      "% 는 몇 글자든, _ 는 딱 한 글자",
      "= 는 % 를 그냥 글자로 봐요",
    ],
    cards: [
      {
        say: "이름에 「방망이」가 든 물건을 찾아요! LIKE는 글자 무늬로 찾는 낱말이에요. % 는 「아무 글자나 몇 개든(없어도 돼요)」이라서, 아래처럼 방망이 앞뒤에 붙이면 앞뒤가 무엇이든 방망이가 든 이름이에요.",
        sql: "SELECT name, price\nFROM items\nWHERE name LIKE '%방망이%'",
      },
      {
        say: "% 자리를 바꾸면 뜻이 달라져요. 방망이 뒤에만 붙이면 방망이로 시작, 앞에만 붙이면 방망이로 끝나는 이름이에요. _ 는 딱 한 글자라서, 아래처럼 앞에 _ 하나면 금방망이·은방망이만 골라요.",
        sql: "SELECT name\nFROM items\nWHERE name LIKE '_방망이'",
      },
    ],
    items: [
      {
        type: "choice", concept: "like",
        q: "LIKE 무늬에서 % 는 무슨 뜻일까요?",
        options: ["아무 글자나 몇 개든(0개도 됨)", "딱 한 글자", "백분율(퍼센트)"],
        answer: 0,
        explain: "따옴표 안 무늬의 % 는 「글자가 몇 개 와도 좋다」예요. 0개도 되니 '%방망이'는 이름이 그냥 방망이여도 찾아요. 딱 한 글자는 _ 예요.",
      },
      {
        type: "choice", concept: "like",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE name LIKE '%방망이%'",
        options: ["7행", "5행", "8행"],
        answer: 0,
        explain: "방망이 대장간 물건 5가지에 뚝딱 공방의 다듬이방망이·빨래방망이를 더해 7가지예요. 가게 이름은 items 표에 없어요.",
      },
      {
        type: "choice", concept: "like",
        q: "이 SQL의 결과에 나오는 물건은?",
        code: "SELECT name\nFROM items\nWHERE name LIKE '방망이%'",
        options: ["방망이 손잡이", "금방망이", "빨래방망이"],
        answer: 0,
        explain: "'방망이%'는 방망이로 시작하는 이름이에요. 방망이 손잡이 하나뿐이에요. 금방망이·빨래방망이는 방망이로 끝나요.",
      },
      {
        type: "blank", concept: "like",
        q: "이름이 「방망이」로 끝나는 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name\nFROM items\nWHERE name LIKE ___",
        chips: ["'%방망이'", "'방망이%'", "'%방망이%'"],
        answer: 0,
        explain: "끝나는 무늬는 % 를 앞에만 둔 '%방망이'예요. 6가지가 나와요. '%방망이%'는 방망이 손잡이까지 7가지예요.",
      },
      {
        type: "choice", concept: "like",
        q: "LIKE 무늬에서 _ (밑줄)은 무슨 뜻일까요?",
        options: ["딱 한 글자", "아무 글자나 몇 개든", "띄어쓰기 한 칸"],
        answer: 0,
        explain: "_ 하나가 글자 하나예요. '_방망이'는 앞에 한 글자만 붙은 금방망이·은방망이를 찾아요.",
      },
      {
        type: "choice", concept: "like",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM items\nWHERE name LIKE '__방망이'",
        options: ["1행", "2행", "7행"],
        answer: 0,
        explain: "_ 두 개는 딱 두 글자예요. 방망이 앞에 두 글자가 붙은 이름은 빨래방망이 하나예요. 도깨비방망이는 세 글자가 붙어요.",
      },
      {
        type: "choice", concept: "like",
        q: "LIKE 대신 = 를 쓰면 어떻게 될까요?",
        code: "SELECT name\nFROM items\nWHERE name = '%방망이%'",
        options: ["행이 하나도 없는 표", "방망이가 든 물건 7가지", "% 때문에 오류가 난다"],
        answer: 0,
        explain: "% 와 _ 는 LIKE와 함께일 때만 무늬예요. = 는 이름이 정말 「%방망이%」인 물건을 찾아서 하나도 없어요.",
      },
      {
        type: "blank", concept: "like",
        q: "이름에 「주머니」가 든 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name\nFROM items\nWHERE name ___ '%주머니%'",
        chips: ["LIKE", "=", "IN"],
        answer: 0,
        explain: "무늬로 찾을 때는 LIKE예요. 약초 주머니·비단 주머니·복주머니가 나와요. = 는 0행, IN은 오류가 나요.",
      },
      {
        type: "choice", concept: "like",
        q: "이름에 「주머니」가 든 물건을 모두 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '%주머니%'" },
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '_주머니'" },
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '주머니%'" },
        ],
        answer: 0, tables: ["items"],
        explain: "약초 주머니·비단 주머니·복주머니, 3가지가 든 표가 정답이에요. '_주머니'는 복주머니 하나, 주머니로 시작하는 이름은 없어요.",
      },
      {
        type: "choice", concept: "like",
        q: "가게 이름이 「방」으로 끝나는 가게는 몇 곳일까요?",
        code: "SELECT name\nFROM shops\nWHERE name LIKE '%방'",
        options: ["4곳", "2곳", "1곳"],
        answer: 0,
        explain: "여우골 떡방·산삼 약방·달빛 약초방·뚝딱 공방, 4곳이에요. 방망이 대장간은 방으로 시작하지만 방으로 끝나지 않아요.",
      },
      {
        type: "order", concept: "like",
        q: "이름에 방망이가 들고 200엽전 넘는 물건을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE name LIKE '%방망이%'", "AND price > 200"],
        expect: "name | price\n도깨비방망이 | 320\n금방망이 | 400\n은방망이 | 280",
        explain: "LIKE 조건도 AND로 다른 조건과 이어요. 방망이 7가지 중 200엽전 넘는 3가지가 나와요.",
      },
      {
        id: "4-3-b1", type: "build", concept: "like",
        q: "이름에 「방망이」가 든 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "name", "LIKE", "'%방망이%'"],
        extra: ["=", "shops", "IN"],
        tables: ["items"],
        hints: [
          "물건 표에서 이름 열의 어디든 「방망이」가 든 행을 찾아요. 앞뒤 글자는 몇 개든 좋아요.",
          "WHERE name 다음에 LIKE와 '%방망이%'를 놓아요.",
        ],
        explain: "4장의 대표 문제, 방망이가 든 물건 7가지 완성! 앞뒤 % 덕분에 금방망이도 방망이 손잡이도 찾았어요.",
      },
      {
        type: "check", concept: "like",
        q: "LIKE 무늬에 대해 맞는 말은?",
        options: [
          "% 는 몇 글자든, _ 는 딱 한 글자를 뜻한다",
          "% 와 _ 는 = 와 써도 무늬가 된다",
          "'방망이%'는 방망이로 끝나는 이름을 찾는다",
        ],
        answer: 0,
        explain: "% 는 0글자부터 몇 글자든, _ 는 한 글자예요. 무늬는 LIKE와 함께일 때만 통해요.",
      },
    ],
  },
  {
    id: "4-4", chapter: 4, title: "NOT과 괄호",
    goal: "NOT으로 조건을 뒤집고, 괄호로 AND·OR의 차례를 정할 수 있다",
    summary: [
      "NOT = 조건 뒤집기(NOT LIKE, NOT IN)",
      "AND가 OR보다 먼저 묶여요",
      "헷갈리면 괄호로 먼저 묶어요",
    ],
    cards: [
      {
        say: "NOT은 조건을 뒤집어요. 아래는 이름에 방망이가 들지 않은 물건이에요. NOT LIKE, NOT IN, NOT BETWEEN처럼 앞에 붙이고, NOT kind = '여우'처럼 조건 맨 앞에 써도 돼요.",
        sql: "SELECT name, price\nFROM items\nWHERE name NOT LIKE '%방망이%'",
      },
      {
        say: "AND와 OR가 섞이면 AND가 먼저 묶여요. 괄호가 없으면 「7번 가게 전부, 또는 8번 가게의 200엽전 넘는 것」으로 읽혀 7행이에요. 아래처럼 OR를 괄호로 묶으면 두 가게의 비싼 물건 5가지예요.",
        sql: "SELECT name, price\nFROM items\nWHERE (shop_id = 7 OR shop_id = 8)\nAND price > 200",
      },
    ],
    items: [
      {
        type: "choice", concept: "not",
        q: "NOT은 무슨 일을 할까요?",
        options: ["뒤에 오는 조건을 뒤집는다", "조건 두 개를 함께 건다", "빈칸인 행만 고른다"],
        answer: 0,
        explain: "NOT은 「아니다」예요. 맞던 행은 빠지고 안 맞던 행이 남아요. 조건 두 개를 함께 거는 건 AND예요.",
      },
      {
        type: "choice", concept: "not",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE name NOT LIKE '%방망이%'",
        options: ["33행", "7행", "40행"],
        answer: 0,
        explain: "물건 40가지 중 방망이가 든 7가지를 뺀 33가지예요. 7은 NOT 없는 LIKE의 결과예요.",
      },
      {
        type: "blank", concept: "not",
        q: "약재 가게도 공방도 아닌 가게만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, category\nFROM shops\nWHERE category ___ IN ('약재', '공방')",
        chips: ["NOT", "<>", "OR"],
        answer: 0,
        explain: "IN 앞에 NOT을 붙이면 「목록 속 어느 값과도 같지 않다」예요. 먹거리·잡화 가게 4곳이 나와요. <> 나 OR는 이 자리에서 오류가 나요.",
      },
      {
        type: "choice", concept: "not",
        q: "price NOT BETWEEN 10 AND 300 은 어떤 물건을 고를까요?",
        options: ["10엽전 미만이거나 300엽전 넘는 물건", "10엽전부터 300엽전까지인 물건", "딱 10엽전이나 300엽전인 물건"],
        answer: 0,
        explain: "범위를 뒤집으니 범위 바깥이에요. 도토리묵(8) 같은 싼 물건과 금방망이(400) 같은 비싼 물건, 11가지가 나와요.",
      },
      {
        type: "choice", concept: "not",
        q: "WHERE NOT kind = '도깨비' 와 결과가 같은 조건은?",
        options: ["kind <> '도깨비'", "kind = '도깨비'", "NOT kind <> '도깨비'"],
        answer: 0,
        explain: "= 를 뒤집으면 「같지 않다」, 3장의 <> 와 같아요. NOT kind <> '도깨비'는 두 번 뒤집어 도깨비 손님이 돼요.",
      },
      {
        type: "choice", concept: "not",
        q: "재고 칸이 빈 메밀전은 이 SQL의 결과에 나올까요?",
        code: "SELECT name, stock\nFROM items\nWHERE NOT stock < 10",
        options: [
          "나오지 않는다. 빈칸은 뒤집어도 모르는 값이다",
          "나온다. 10 미만이 아니니까",
          "메밀전 행에서 멈춘다",
        ],
        answer: 0,
        explain: "빈칸은 10보다 작은지 알 수 없고, 뒤집어도 여전히 알 수 없어요. 그래서 40가지 중 30가지만 나와요. 빈칸은 6장에서!",
      },
      {
        type: "choice", concept: "andor",
        q: "AND와 OR를 괄호 없이 섞어 쓰면 무엇이 먼저 묶일까요?",
        options: ["AND가 먼저 묶인다", "OR가 먼저 묶인다", "왼쪽부터 차례로 묶인다"],
        answer: 0,
        explain: "곱하기가 더하기보다 먼저인 것처럼 AND가 OR보다 먼저예요. 헷갈리면 먼저 묶을 쪽을 괄호로 감싸요.",
      },
      {
        type: "choice", concept: "andor",
        q: "괄호가 없는 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE shop_id = 7 OR shop_id = 8\nAND price > 200",
        options: ["7행", "5행", "2행"],
        answer: 0,
        explain: "AND가 먼저라 「7번 가게 물건 5가지」 또는 「8번 가게의 200엽전 넘는 2가지」, 모두 7행이에요.",
      },
      {
        type: "choice", concept: "andor",
        q: "200엽전이 안 되는 방망이 손잡이(150엽전)가 이 결과에 나오는 까닭은?",
        code: "SELECT name, price\nFROM items\nWHERE shop_id = 7 OR shop_id = 8\nAND price > 200",
        options: [
          "AND가 먼저 묶여, 7번 가게 물건은 값과 상관없이 나와서",
          "OR가 먼저 묶여서",
          "방망이 손잡이의 가게 번호가 8이라서",
        ],
        answer: 0,
        explain: "괄호가 없으면 shop_id = 8 AND price > 200이 한 덩어리예요. 7번 가게 물건은 OR 앞 조건만으로 남아요. 앞의 둘을 괄호로 묶으면 빠져요.",
      },
      {
        type: "order", concept: "andor",
        q: "1·2번 가게 물건 중 8엽전 이하인 것을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE price <= 8", "AND (shop_id = 1 OR shop_id = 2)"],
        expect: "name | price\n도토리묵 | 8\n인절미 | 6\n송편 | 7\n식혜 | 5\n꿀떡 | 8",
        explain: "값 조건 뒤에 AND로 두 가게를 괄호로 묶어 걸어요. 괄호가 없으면 2번 가게 물건은 값과 상관없이 나와요. 먹거리 가게의 싼 물건 5가지예요.",
      },
      {
        type: "choice", concept: "not",
        q: "이름에 「방망이」가 들지 않은 가게를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, category\nFROM shops\nWHERE name NOT LIKE '%방망이%'" },
          { sql: "SELECT name, category\nFROM shops\nWHERE name LIKE '%방망이%'" },
          { sql: "SELECT name, price\nFROM items\nWHERE name NOT LIKE '%방망이%'" },
        ],
        answer: 0, tables: ["shops"],
        explain: "가게 표에서 방망이 대장간만 빠진 7곳이 정답이에요. NOT이 없으면 대장간 한 곳, items 표에서 고르면 물건 33가지예요.",
      },
      {
        id: "4-4-b1", type: "build", concept: "not",
        q: "이름에 「방망이」가 들지 않은 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "name", "NOT", "LIKE", "'%방망이%'"],
        extra: ["=", "IN", "shops"],
        tables: ["items"],
        hints: [
          "방망이가 든 이름을 찾는 무늬를 뒤집어요.",
          "WHERE name 다음에 NOT, LIKE, '%방망이%'를 놓아요.",
        ],
        explain: "방망이가 아닌 물건 33가지가 나왔어요. LIKE 앞에 NOT 하나로 무늬를 뒤집었죠!",
      },
      {
        type: "check", concept: "andor",
        q: "NOT과 괄호에 대해 맞는 말은?",
        options: [
          "NOT은 조건을 뒤집고, AND·OR가 섞이면 괄호로 먼저 묶을 쪽을 정한다",
          "NOT을 붙이면 빈칸인 행도 나온다",
          "괄호가 없으면 OR가 AND보다 먼저 묶인다",
        ],
        answer: 0,
        explain: "NOT은 뒤집기, AND는 OR보다 먼저예요. 괄호로 묶어 두면 읽는 사람도 헷갈리지 않아요.",
      },
    ],
  },
  {
    id: "4-5", chapter: 4, title: "4장 평가", isExam: true,
    goal: "AND·OR·NOT·IN·BETWEEN·LIKE로 행을 고를 수 있다",
    summary: [
      "AND 모두, OR 하나라도, NOT 뒤집기",
      "IN 값 목록, BETWEEN 양 끝 넣는 범위",
      "LIKE: % 몇 글자든, _ 한 글자",
    ],
    cards: [
      {
        say: "4장 정리 시간이에요! AND·OR·NOT으로 조건을 잇고 뒤집고, IN·BETWEEN으로 값 목록과 범위를, LIKE로 글자 무늬를 찾았어요. 아래가 4장의 대표 모양이에요. 같이 풀어 봐요!",
        sql: "SELECT name, price\nFROM items\nWHERE name LIKE '%방망이%'",
      },
    ],
    items: [
      {
        type: "choice", concept: "andor",
        q: "「여우 손님이면서 개울마을에 사는 손님」을 고르는 조건은?",
        options: [
          "kind = '여우'\n  AND village = '개울마을'",
          "kind = '여우'\n  OR village = '개울마을'",
          "kind = '여우',\n  village = '개울마을'",
        ],
        answer: 0,
        explain: "두 조건이 모두 맞아야 하니 AND예요. 여름이·은호, 2명이에요. OR는 여우 손님과 개울마을 손님을 모두 합쳐요.",
      },
      {
        type: "blank", concept: "andor",
        q: "7·8번 가게 물건 중 200엽전 이하인 것만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE (shop_id = 7 ___ shop_id = 8)\nAND price <= 200",
        chips: ["OR", "AND", "NOT"],
        answer: 0,
        explain: "두 가게 중 어느 쪽이든 되니 괄호 안은 OR예요. AND는 한 물건이 두 가게일 수 없어 0행, NOT은 오류예요.",
      },
      {
        type: "choice", concept: "between",
        q: "price BETWEEN 25 AND 30 에 대해 맞는 말은?",
        options: ["25엽전과 30엽전인 물건도 나온다", "25엽전과 30엽전인 물건은 빠진다", "25엽전과 30엽전인 물건만 나온다"],
        answer: 0,
        explain: "BETWEEN은 양 끝을 넣어요. 수육·오미자청(25), 구기자·복주머니(28), 인삼차(30), 5가지예요. 두 값만 고르는 건 IN (25, 30)이에요.",
      },
      {
        type: "blank", concept: "between",
        q: "값이 100엽전부터 200엽전까지인 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price ___ 100 AND 200",
        chips: ["BETWEEN", "IN", ">="],
        answer: 0,
        explain: "범위는 BETWEEN 작은 값 AND 큰 값이에요. IN은 오류가 나요. >= 를 넣으면 「AND 200」이 조건 구실을 못 해 200엽전 넘는 물건까지 나와요.",
      },
      {
        type: "choice", concept: "in",
        q: "이 SQL의 결과에 나오지 않는 손님 종류는?",
        code: "SELECT name, kind\nFROM customers\nWHERE kind IN ('여우', '사람')",
        options: ["도깨비", "여우", "사람"],
        answer: 0,
        explain: "IN 목록에 없는 도깨비 손님만 빠져요. 여우 12명과 사람 24명, 36명이 나와요.",
      },
      {
        type: "choice", concept: "in",
        q: "IN (12, 25)와 BETWEEN 12 AND 25의 차이로 맞는 것은?",
        options: [
          "IN은 12와 25만, BETWEEN은 그 사이 값도 고른다",
          "둘은 언제나 결과가 같다",
          "IN은 사이 값도, BETWEEN은 12와 25만 고른다",
        ],
        answer: 0,
        explain: "IN은 낱낱의 값 목록, BETWEEN은 이어진 범위예요. 물건 값으로 IN (12, 25)는 4가지, BETWEEN 12 AND 25는 11가지예요.",
      },
      {
        type: "choice", concept: "like",
        q: "이름이 「방망이」로 시작하는 물건을 찾는 무늬는?",
        options: ["'방망이%'", "'%방망이'", "'_방망이'"],
        answer: 0,
        explain: "% 를 뒤에 두면 「방망이 + 아무 글자」, 곧 방망이로 시작해요. '%방망이'는 끝나는 이름, '_방망이'는 한 글자 + 방망이예요.",
      },
      {
        type: "choice", concept: "like",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM items\nWHERE name LIKE '%주머니'",
        options: ["3행", "1행", "0행"],
        answer: 0,
        explain: "약초 주머니·비단 주머니·복주머니 모두 주머니로 끝나요. % 는 띄어쓰기를 포함해 몇 글자든 받아요.",
      },
      {
        type: "choice", concept: "like",
        q: "이 SQL의 결과는 어떨까요?",
        code: "SELECT name\nFROM shops\nWHERE name = '%공방%'",
        options: ["행이 하나도 없는 표", "뚝딱 공방 한 행", "% 때문에 오류가 난다"],
        answer: 0,
        explain: "= 는 % 를 무늬로 보지 않아요. 이름이 정말 「%공방%」인 가게는 없어 0행이에요. LIKE '%공방%'로 쓰면 뚝딱 공방이 나와요.",
      },
      {
        type: "choice", concept: "not",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, kind\nFROM customers\nWHERE kind NOT IN ('여우', '사람')",
        options: ["24행", "36행", "60행"],
        answer: 0,
        explain: "여우도 사람도 아닌 손님, 곧 도깨비 손님 24명이에요. 36은 NOT 없는 IN의 결과예요.",
      },
      {
        type: "choice", concept: "andor",
        q: "7·8번 가게의 200엽전 넘는 물건만 보려 했는데 150엽전 물건도 나왔어요. 어떻게 고칠까요?",
        code: "SELECT name, price\nFROM items\nWHERE shop_id = 7 OR shop_id = 8\nAND price > 200",
        options: [
          "shop_id = 7 OR shop_id = 8을 괄호로 묶는다",
          "OR를 AND로 바꾼다",
          "price > 200을 WHERE 바로 뒤로 옮긴다",
        ],
        answer: 0,
        explain: "AND가 OR보다 먼저 묶여서 생긴 일이에요. 두 가게 조건을 괄호로 묶으면 200엽전 넘는 5가지만 나와요. OR를 AND로 바꾸면 0행이에요.",
      },
      {
        type: "choice", concept: "like",
        q: "이름에 「방망이」가 든 물건 중 200엽전 이하인 것을 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '%방망이%'\nAND price <= 200" },
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '%방망이%'\nAND price > 200" },
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '방망이%'\nAND price <= 200" },
        ],
        answer: 0,
        explain: "방망이 손잡이(150)·작은 방망이(180)·다듬이방망이(170)·빨래방망이(130), 4가지가 정답이에요.",
      },
      {
        type: "order", concept: "not",
        q: "7번 가게 물건 중 값이 10~300엽전 범위 밖인 것을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE shop_id = 7", "AND price NOT BETWEEN 10 AND 300"],
        expect: "name | price\n도깨비방망이 | 320\n금방망이 | 400",
        explain: "WHERE로 7번 가게를 고르고 AND 뒤 NOT BETWEEN으로 범위 바깥만 남겼어요. 도깨비방망이(320)·금방망이(400)가 나와요.",
      },
      {
        id: "4-5-b1", type: "build", concept: "like",
        q: "이름에 「방망이」가 든 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "name", "LIKE", "'%방망이%'"],
        extra: ["=", "shop_id", "shops"],
        tables: ["items"],
        hints: [
          "이름 열에서 「방망이」가 어디에 있든 찾는 무늬를 써요.",
          "WHERE name LIKE 다음에 앞뒤로 % 가 붙은 '%방망이%'를 놓아요.",
        ],
        explain: "4장의 대표 문제, 방망이가 든 물건 7가지를 다시 찾았어요. LIKE 무늬 완벽해요!",
      },
      {
        id: "4-5-b2", type: "build", concept: "like",
        q: "「방망이」 앞에 딱 한 글자만 붙은 이름의 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "name", "LIKE", "'_방망이'"],
        extra: ["=", "shop_id", "IN"],
        tables: ["items"],
        hints: [
          "글자 하나 자리와 「방망이」를 이은 무늬로 이름 열을 찾아요.",
          "WHERE name LIKE 다음에 밑줄 하나가 앞에 붙은 '_방망이'를 놓아요.",
        ],
        explain: "금방망이·은방망이 2가지예요. _ 는 딱 한 글자라 도깨비방망이·빨래방망이는 빠졌어요. 무늬도 = 가 아니라 LIKE와 써야 통해요!",
      },
      {
        type: "check", concept: "andor",
        q: "4장에서 배운 것으로 맞는 말은?",
        options: [
          "AND는 모두, OR는 하나라도 맞으면 남기고, 섞이면 AND가 먼저다",
          "BETWEEN은 양 끝 값을 뺀다",
          "LIKE의 _ 는 아무 글자나 몇 개든이다",
        ],
        answer: 0,
        explain: "조건을 잇고 뒤집고, 목록·범위·무늬로 고르는 것이 4장이에요. 실무에서는 쇼핑몰 검색창의 상품 이름 찾기가 LIKE, 가격대·카테고리 거르기가 BETWEEN·IN이에요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 4장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - W: 물건 이름에 실제로 든 글자(1가지 이상 나옴). = 는 0행, <> 는 40행이라 LIKE와 늘 다르다.
// - LOW·HIGH: 실제로 있는 값만(그 값인 물건이 있음). BETWEEN과 > … < 의 결과가 늘 달라지고(양 끝),
//   두 목록이 겹치지 않아 늘 LOW < HIGH다. HIGH_N은 320·350·400보다 작아 NOT BETWEEN과 < LOW가 늘 다르다.
// - C·D: 겹치지 않는 가게 종류 목록이라 둘이 같은 값이 되지 않는다.
const LOW = [8, 9, 10, 12, 15, 18, 20];
const HIGH = [25, 28, 30, 35, 40, 45, 110, 120];
export const TEMPLATES = [
  {
    id: "4-T1", concept: "like", type: "blank",
    q: "이름에 「{W}」 글자가 든 물건만 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name\nFROM items\nWHERE name ___ '%{W}%'",
    chips: ["LIKE", "=", "<>"],
    answer: 0,
    vars: { W: ["방망이", "주머니", "약", "삼", "떡", "묵", "초", "솥", "차", "국"] },
    explain: "무늬로 찾을 때는 LIKE예요. = 는 이름이 정말 '%{W}%'인 물건을 찾아 0행이고, <> 는 모든 물건이 나와요.",
  },
  {
    id: "4-T2", concept: "between", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price\nFROM items\nWHERE price BETWEEN {A} AND {B}",
    wrong: [
      "SELECT name, price\nFROM items\nWHERE price > {A} AND price < {B}",
      "SELECT name, price\nFROM items\nWHERE price IN ({A}, {B})",
    ],
    vars: { A: LOW, B: HIGH },
    explain: "BETWEEN {A} AND {B}는 {A}엽전과 {B}엽전도 넣는 범위예요. > 와 < 로 쓰면 양 끝이 빠지고, IN은 딱 두 값만 골라요.",
  },
  {
    id: "4-T3", concept: "andor", type: "blank",
    q: "{C} 가게와 {D} 가게가 모두 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name, category\nFROM shops\nWHERE category = '{C}'\n___ category = '{D}'",
    chips: ["OR", "AND", "NOT"],
    answer: 0,
    vars: { C: ["먹거리", "약재"], D: ["잡화", "공방"] },
    explain: "두 종류 중 하나라도 맞으면 남기니 OR예요. AND는 한 가게가 두 종류일 수 없어 0행이고, NOT은 이 자리에서 오류가 나요.",
  },
  {
    id: "4-T4", concept: "not", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price\nFROM items\nWHERE price NOT BETWEEN {A} AND {B}",
    wrong: [
      "SELECT name, price\nFROM items\nWHERE price BETWEEN {A} AND {B}",
      "SELECT name, price\nFROM items\nWHERE price < {A}",
    ],
    vars: { A: LOW, B: [110, 150, 180, 260, 280] },
    explain: "NOT BETWEEN은 범위를 뒤집어 {A}엽전보다 싸거나 {B}엽전보다 비싼 물건을 골라요. 싼 쪽만 고르는 < {A} 와 달라요.",
  },
];

// ---- 4장 심화 (v0.2, 쓰기 안내 13절 · 디딤돌 docs/specs/2026-11-06-심화-1-6장-디딤돌.md §2 4장) ----
// - 쓸 수 있는 것: 1~4장 낱말뿐(ADVANCED_GRAMMAR[4]는 비어 있음). 앞 장 심화 낱말(--, 나머지 %)은 쓰지 않는다(R53).
//   LIKE 무늬 안의 % 는 4장 본 과정 그대로다. 줄 세우기(ORDER BY, 5장)·IS NULL(6장)은 쓰지 않는다.
// - NOT·NOT IN은 빈칸 없는 열(category, kind, village, shop_id, price, name)에만 쓴다. 재고·나이(NULL 있음)는 쓰지 않는다.
// - 4-A1 NOT과 괄호(shops category 먹거리·약재·잡화·공방 각 2):
//   NOT category = '먹거리' OR category = '잡화' 6행(잡화는 이미 「먹거리 아님」이라 OR가 더하는 것 없음, 빼려던 잡화가 남음),
//   NOT (category = '먹거리' OR category = '잡화') 4행(약재·공방). NOT 먹거리 OR NOT 약재 8행(모두).
//   customers NOT (kind = '도깨비' OR kind = '사람') 12행(여우), NOT kind = '도깨비' OR kind = '사람' 36행(사람+여우).
//   (4-5가 kind NOT IN ('여우', '사람')를 물어 심화는 다른 짝을 쓴다.)
//   items NOT (shop_id = 1 OR shop_id = 2) 30행. NOT shop_id = 7 AND price > 200 2행(쇠솥 260·장승 350, NOT은 바로 뒤 조건에만),
//   NOT (shop_id = 7 AND price > 200) 37행. customers NOT (village = '여우고개' OR village = '달빛마을') 51행.
//   조립: NOT ( 먹거리 OR 공방 ) → 약재·잡화 4행(약재·공방은 4-4 빈자리와 같아 바꿈, fix round 1).
//   카드는 먹거리·잡화, 결과 표 보기는 잡화·공방(→ 먹거리·약재 4행)으로 보여 줘 조립이 베끼기가 되지 않게 했다.
// - 4-A2 LIKE 섞기(items 이름 글자 수: 1글자 갓 1, 2글자 15, 3글자 12, 4글자 이상 12, 띄어쓰기도 한 글자):
//   '_' 1행(갓), '__' 15행, '__%' 39행, '___' 12행, '___%' 24행(= '%___'), '____%' 12행, '____' 5행,
//   '__ %' 3행(약초 주머니·비단 주머니·작은 방망이), '% %' 4행(+ 방망이 손잡이), '_방%' 2행(금방망이·은방망이).
//   '____%' AND price < 30 → 도토리묵 8·오미자청 25·복주머니 28.
//   LIKE 무늬 글자 값은 헷갈림 카드로 낱장으로 두지 않는다(R33). 조립은 무늬를 LIKE와 붙인 구절 카드(R51)로 두어
//   표 이름 뒤에 끼워도 별칭이 될 수 없다. 이 장터 이름은 모두 한글이라 LIKE의 영어 대소문자 차이(데이터베이스마다 다름)는 다루지 않는다.
// - 4-A3 의뢰: 도깨비 국밥집(shops 1번) 주인 달래 할멈(앞 심화 의뢰인 오영감·금순·최보부와 겹치지 않음). 의뢰 사연은 꾸민 이야기이고
//   장부 사실(주문 등)을 주장하지 않는다(사연 「두고 간 보따리」는 장부에 없는 일이라 데이터와 어긋날 수 없음, fix round 1).
//   두 글자 이름 + (버드나무고개 OR 솔바위골) → 무쇠·초롱·솔아·뭉치 4행, 괄호 없으면 8행. 여우고개 손님 3명(신아람·해랑·방실이), 두 글자 이름 손님 14명,
//   AND → 해랑 1행, OR → 16행(3 + 14 − 해랑 1), 여우고개 AND '___' → 신아람·방실이 2행, 여우고개 AND '_' → 0행,
//   여우고개 AND '%이' → 방실이. 달빛마을(6명) 두 글자 이름은 단비. (여우고개 OR 달빛마을) AND '__' → 해랑·단비 2행,
//   괄호 없이 쓰면 여우고개 3명 + 단비 = 4행, 괄호 + '___' → 7행.
export const ADVANCED = [
  {
    id: "4-A1", chapter: 4, isAdvanced: true, title: "NOT과 괄호 위치",
    goal: "NOT이 뒤집는 범위를 괄호로 정해 「둘 다 아님」을 고를 수 있다",
    summary: [
      "NOT은 바로 뒤 조건 하나만 뒤집어요",
      "NOT ( … )은 괄호 안 전체를 뒤집어요",
      "둘 다 아님 = 조건마다 NOT + AND",
    ],
    cards: [
      {
        say: "4장에서 NOT으로 조건을 뒤집었죠? 오늘은 괄호째 뒤집어 봐요. 먼저 괄호 없이! NOT은 바로 뒤 조건 하나에만 붙어서, 아래는 「먹거리가 아님」 또는 「잡화」예요. 빼려던 잡화 가게 2곳이 그대로 남아 6곳이죠.",
        sql: "SELECT name, category\nFROM shops\nWHERE NOT category = '먹거리'\n  OR category = '잡화'",
      },
      {
        say: "조건 둘을 괄호로 묶고 그 앞에 NOT을 두면 괄호 안 전체가 뒤집혀요. 「먹거리도 잡화도 아님」, 약재·공방 4곳! 괄호 없이 쓰려면 조건마다 NOT을 붙이고 OR를 AND로 바꿔요. 「이것도 아니고 저것도 아니다」니까요.",
        sql: "SELECT name, category\nFROM shops\nWHERE NOT (category = '먹거리'\n  OR category = '잡화')",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_not_paren",
        q: "괄호가 없는 이 SQL에서 NOT이 뒤집는 것은?",
        code: "SELECT name, category\nFROM shops\nWHERE NOT category = '먹거리'\n  OR category = '잡화'",
        options: ["바로 뒤 조건 하나, 먹거리 조건만", "OR로 이은 두 조건 모두", "OR 뒤의 잡화 조건만"],
        answer: 0,
        explain: "괄호가 없으면 NOT은 바로 뒤 조건 하나에만 붙어요. 그래서 「먹거리가 아님」 또는 「잡화」로 읽혀요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "바람 보따리(잡화)가 이 결과에 남는 까닭은?",
        code: "SELECT name, category\nFROM shops\nWHERE NOT category = '먹거리'\n  OR category = '잡화'",
        options: [
          "잡화도 먹거리가 아니라 NOT 조건이 참이고, OR는 한쪽만 참이면 남겨서",
          "OR 뒤 조건이 먼저 계산돼서, NOT보다 앞서 잡화를 골라서",
          "NOT이 OR로 이은 두 조건을 모두 뒤집어서",
        ],
        answer: 0,
        explain: "잡화 가게는 먹거리가 아니니 NOT 조건 하나만으로 참이에요. OR는 한쪽만 참이어도 남겨요. 잡화까지 빼려면 두 조건을 괄호로 묶고 그 앞에 NOT을 둬요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, kind\nFROM customers\nWHERE NOT (kind = '도깨비'\n  OR kind = '사람')",
        options: ["12행", "36행", "60행"],
        answer: 0,
        explain: "괄호 안 「도깨비 또는 사람」 48명을 통째로 뒤집어, 도깨비도 사람도 아닌 여우 손님 12명이 남아요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "괄호를 뺀 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, kind\nFROM customers\nWHERE NOT kind = '도깨비'\n  OR kind = '사람'",
        options: ["36행", "12행", "48행"],
        answer: 0,
        explain: "NOT은 도깨비 조건만 뒤집어 사람 24명과 여우 12명이 남아요. 사람은 이미 「도깨비가 아님」에 들어 있어 OR가 더 늘리지 않아요.",
      },
      {
        type: "blank", concept: "adv_not_paren",
        q: "1번 가게 물건도 2번 가게 물건도 아닌 것만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, shop_id\nFROM items\nWHERE NOT ___ shop_id = 1\n  OR shop_id = 2)",
        chips: ["(", "IN", "AND"],
        answer: 0,
        explain: "NOT 뒤에 괄호를 열어 두 조건을 함께 뒤집어요. 먹거리 가게 두 곳의 10가지가 빠져 30가지예요. IN이나 AND를 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "「먹거리도 약재도 아닌 가게」를 괄호 없이 바르게 쓴 조건은?",
        options: [
          "NOT category = '먹거리'\n  AND NOT category = '약재'",
          "NOT category = '먹거리'\n  OR NOT category = '약재'",
          "NOT category = '먹거리'\n  AND category = '약재'",
        ],
        answer: 0,
        explain: "「이것도 아니고 저것도 아니다」는 조건마다 NOT을 붙여 AND로 이어요. NOT 하나를 빼먹으면 약재 가게만 남아요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, category\nFROM shops\nWHERE NOT category = '먹거리'\n  OR NOT category = '약재'",
        options: ["8행", "4행", "6행"],
        answer: 0,
        explain: "먹거리 가게는 약재가 아니고, 약재 가게는 먹거리가 아니에요. 어느 가게든 둘 중 하나는 참이라 8곳이 모두 나와요. 「둘 다 아님」은 AND예요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "이 SQL과 결과가 같은 조건은?",
        code: "SELECT name, category\nFROM shops\nWHERE NOT (category = '먹거리'\n  OR category = '잡화')",
        options: [
          "category NOT IN\n  ('먹거리', '잡화')",
          "category IN\n  ('먹거리', '잡화')",
          "NOT category = '먹거리'\n  OR category = '잡화'",
        ],
        answer: 0,
        explain: "IN 목록은 = 를 OR로 이은 것이니, NOT IN은 그 OR를 통째로 뒤집은 것과 같아요. 약재·공방 4곳이 나와요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "NOT 뒤가 AND일 때, 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE NOT shop_id = 7\n  AND price > 200",
        options: ["2행", "37행", "5행"],
        answer: 0,
        explain: "AND 앞이어도 NOT은 shop_id = 7 하나만 뒤집어요. 「7번 가게가 아니고 200엽전 넘는」 쇠솥·장승 2가지예요. 37은 괄호로 둘을 함께 뒤집은 결과예요.",
      },
      {
        type: "choice", concept: "adv_not_paren",
        q: "잡화 가게도 공방도 아닌 가게를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, category\nFROM shops\nWHERE NOT (category = '잡화'\n  OR category = '공방')" },
          { sql: "SELECT name, category\nFROM shops\nWHERE NOT category = '잡화'\n  OR category = '공방'" },
          { sql: "SELECT name, category\nFROM shops\nWHERE category = '잡화'\n  OR category = '공방'" },
        ],
        answer: 0, tables: ["shops"],
        explain: "category가 먹거리와 약재뿐인 4곳이 정답이에요. 공방이 섞인 6곳은 NOT이 잡화에만 붙은 것, 잡화와 공방 4곳은 NOT이 없는 것이에요.",
      },
      {
        type: "order", concept: "adv_not_paren",
        q: "여우고개에도 달빛마을에도 살지 않는 손님을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, village", "FROM customers", "WHERE NOT (village = '여우고개'", "OR village = '달빛마을')"],
        explain: "NOT과 여는 괄호를 WHERE 줄에, 닫는 괄호를 OR 줄 끝에 두어 두 마을을 함께 뒤집었어요. 9명이 빠져 51명이 나와요.",
      },
      {
        id: "4-A1-b1", type: "build", concept: "adv_not_paren",
        q: "먹거리 가게도 공방도 아닌 가게를 보여 줘",
        cards: ["SELECT", "*", "FROM", "shops", "WHERE", "NOT (", "category = '먹거리'", "OR", "category = '공방'", ")"],
        extra: ["AND", "category = '약재'"],
        tables: ["shops"],
        hints: [
          "「먹거리 또는 공방」을 먼저 한 덩어리로 묶고, 그 덩어리를 통째로 뒤집어요.",
          "WHERE 다음에 NOT (, 먹거리 조건, OR, 공방 조건, 닫는 괄호를 놓아요.",
        ],
        explain: "약재·잡화 가게 4곳이 나왔어요! 괄호 앞의 NOT 하나가 「먹거리 또는 공방」 전체를 뒤집었죠. AND로 묶으면 먹거리이면서 공방인 가게가 없어, 뒤집은 결과는 8곳 모두예요.",
      },
      {
        type: "check", concept: "adv_not_paren",
        q: "NOT과 괄호 위치에 대해 맞는 말은?",
        options: [
          "괄호가 없으면 NOT은 바로 뒤 조건 하나만 뒤집는다",
          "NOT은 언제나 WHERE 뒤의 조건 전체를 뒤집는다",
          "NOT (A OR B)는 NOT A OR NOT B와 같다",
        ],
        answer: 0,
        explain: "뒤집을 범위는 괄호가 정해요. 「둘 다 아님」은 NOT (A OR B), 괄호 없이 쓰면 NOT A AND NOT B예요.",
      },
    ],
  },
  {
    id: "4-A2", chapter: 4, isAdvanced: true, title: "LIKE 무늬 섞기",
    goal: "_ 와 % 를 섞은 무늬로 글자 수와 자리를 정해 찾을 수 있다",
    summary: [
      "'__%' = 두 글자 이상인 이름",
      "_ 개수 = 꼭 있어야 할 글자 수",
      "띄어쓰기도 한 글자로 쳐요",
    ],
    cards: [
      {
        say: "4장에서 % 는 몇 글자든, _ 는 딱 한 글자였죠? 오늘은 둘을 섞어 봐요. 먼저 _ 만 두 개면 딱 두 글자 이름이에요. 여기에 % 를 뒤에 붙이면 「두 글자 다음에 몇 글자든」, 곧 두 글자 이상이 돼요.",
        sql: "SELECT name, price\nFROM items\nWHERE name LIKE '__'",
      },
      {
        say: "띄어쓰기도 한 글자로 쳐요. 아래 무늬는 「두 글자, 띄어쓰기, 그 뒤 몇 글자든」이라 약초 주머니, 비단 주머니, 작은 방망이가 나와요. 방망이 손잡이는 앞이 세 글자라 빠져요.",
        sql: "SELECT name, price\nFROM items\nWHERE name LIKE '__ %'",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_like_mix",
        q: "LIKE '__%' 는 어떤 이름을 찾을까요?",
        options: ["두 글자 이상인 이름", "딱 두 글자인 이름", "두 글자 이하인 이름"],
        answer: 0,
        explain: "_ 두 개로 두 글자는 꼭 있어야 하고, 뒤의 % 는 0글자부터 몇 글자든 받아요. 그래서 두 글자 이상이에요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "한 글자 이름인 갓은 이 SQL의 결과에 나올까요?",
        code: "SELECT name\nFROM items\nWHERE name LIKE '__%'",
        options: ["나오지 않는다. 꼭 있어야 할 두 글자가 안 된다", "나온다. % 가 모자란 글자를 채운다", "갓 행에서 오류가 난다"],
        answer: 0,
        explain: "% 는 0글자도 되지만 _ 자리는 꼭 한 글자씩 있어야 해요. 갓은 한 글자라 _ 두 개를 채우지 못해요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM items\nWHERE name LIKE '_'",
        options: ["1행", "0행", "40행"],
        answer: 0,
        explain: "_ 하나는 딱 한 글자예요. 물건 중 한 글자 이름은 갓 하나예요. 40행은 '%' 하나로 모든 이름을 찾을 때예요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "이름이 딱 세 글자인 물건을 찾는 무늬는?",
        options: ["'___'", "'___%'", "'%___'"],
        answer: 0,
        explain: "% 없이 _ 세 개면 딱 세 글자예요. '___%'와 '%___'는 % 가 앞이냐 뒤냐만 다를 뿐, 둘 다 세 글자 이상을 찾아요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "LIKE '___%' 와 결과가 같은 무늬는?",
        options: ["'%___'", "'___'", "'__%'"],
        answer: 0,
        explain: "% 가 앞에 있든 뒤에 있든, 꼭 있어야 할 글자는 _ 세 개예요. 그래서 둘 다 세 글자 이상이에요. '__%'는 두 글자 이름도 넣어요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "LIKE '% %' 는 어떤 이름을 찾을까요?",
        options: ["띄어쓰기가 하나라도 든 이름", "% 가 둘이라 모든 이름", "두 낱말뿐인 이름은 빼고 찾는다"],
        answer: 0,
        explain: "가운데 띄어쓰기는 진짜 띄어쓰기 한 글자예요. 그 앞뒤로 몇 글자든 와도 되니, 띄어쓰기가 든 이름이에요.",
      },
      {
        type: "blank", concept: "adv_like_mix",
        q: "이름에 띄어쓰기가 든 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name\nFROM items\nWHERE name LIKE ___",
        chips: ["'% %'", "'%%'", "'_ _'"],
        answer: 0,
        explain: "카드에서 본 3가지에 방망이 손잡이까지 4가지예요. '%%'는 띄어쓰기가 없어 40가지 모두, '_ _'는 「한 글자, 띄어쓰기, 한 글자」뿐이라 0가지예요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "이 SQL의 결과에 나오는 물건은?",
        code: "SELECT name\nFROM items\nWHERE name LIKE '_방%'",
        options: ["금방망이", "도깨비방망이", "방망이 손잡이"],
        answer: 0,
        explain: "_ 하나 다음에 「방」이니 둘째 글자가 방인 이름이에요. 금방망이·은방망이가 나와요. 방망이 손잡이는 첫 글자가 방이에요.",
      },
      {
        type: "choice", concept: "adv_like_mix",
        q: "이름이 딱 세 글자인 물건을 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '___'" },
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '___%'" },
          { sql: "SELECT name, price\nFROM items\nWHERE name LIKE '__'" },
        ],
        answer: 0, tables: ["items"],
        explain: "막걸리·인절미처럼 세 글자 이름만 든 12행이 정답이에요. 24행은 세 글자 이상, 15행은 두 글자 이름이에요.",
      },
      {
        type: "order", concept: "adv_like_mix",
        q: "이름이 네 글자 이상이고 30엽전 미만인 물건을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE name LIKE '____%'", "AND price < 30"],
        expect: "name | price\n도토리묵 | 8\n오미자청 | 25\n복주머니 | 28",
        explain: "섞은 무늬도 LIKE 조건 하나라 AND로 다른 조건과 이어요. 네 글자 이상 12가지 중 30엽전 미만은 3가지예요.",
      },
      {
        id: "4-A2-b1", type: "build", concept: "adv_like_mix",
        q: "이름이 세 글자 이상인 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "name", "LIKE '___%'"],
        extra: ["LIKE '___'", "LIKE '__%'"],
        tables: ["items"],
        hints: [
          "꼭 있어야 할 글자 수만큼 _ 를 두고, 그 뒤는 몇 글자든 받아요.",
          "WHERE name 다음에 _ 세 개 뒤에 % 가 붙은 LIKE 카드를 놓아요.",
        ],
        explain: "세 글자 12가지와 네 글자 이상 12가지, 24가지가 나왔어요! 딱 세 글자는 '___', 두 글자 이상은 '__%'예요.",
      },
      {
        type: "check", concept: "adv_like_mix",
        q: "_ 와 % 를 섞은 무늬에 대해 맞는 말은?",
        options: [
          "_ 개수만큼 글자가 꼭 있어야 하고, % 는 그 밖을 몇 글자든 채운다",
          "% 가 있으면 _ 는 아무 뜻이 없다",
          "띄어쓰기는 글자로 세지 않는다",
        ],
        answer: 0,
        explain: "_ 는 자리 하나, % 는 0글자부터 몇 글자든이에요. 띄어쓰기도 한 글자라 _ 나 무늬 속 띄어쓰기로 찾을 수 있어요.",
      },
    ],
  },
  {
    id: "4-A3", chapter: 4, isAdvanced: true, title: "손님 찾기 의뢰",
    goal: "단서를 AND로 하나씩 더하며 행 수로 확인해 손님을 찾을 수 있다",
    summary: [
      "단서는 AND로 하나씩 더해요",
      "AND를 더하면 행이 같거나 줄어요",
      "AND·OR가 섞이면 괄호로 묶어요",
    ],
    cards: [
      {
        say: "4장에서 AND로 조건을 이었죠? 오늘은 의뢰예요! 도깨비 국밥집 달래 할멈이 「국밥집에 보따리를 두고 간 손님을 찾아 주게. 여우고개에 살고 이름이 두 글자였어」래요. 첫 단서만 걸면 3명이에요.",
        sql: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'",
      },
      {
        say: "둘째 단서, 딱 두 글자 이름은 _ 두 개라 14명이에요. 두 결과에 모두 나오는 손님은 AND로 이어 찾아요. OR는 오히려 늘려요. AND·OR가 섞이면 OR 쪽을 괄호로 묶어요. 안 그러면 AND가 먼저 묶여요.",
        sql: "SELECT name, village\nFROM customers\nWHERE name LIKE '__'",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_apply_4",
        q: "카드의 두 결과에 모두 나오는 손님, 곧 의뢰의 답은?",
        options: ["해랑", "신아람", "단비"],
        answer: 0,
        explain: "해랑은 여우고개에 살고 이름도 두 글자예요. 신아람은 세 글자, 단비는 달빛마을이라 한 단서만 맞아요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "여우고개라는 단서 하나로만 찾으면 어떻게 될까요?",
        options: ["3명이 나와 누구인지 정할 수 없다", "해랑 한 명만 나온다", "단서가 모자라 오류가 난다"],
        answer: 0,
        explain: "신아람·해랑·방실이가 모두 여우고개 손님이에요. 단서를 하나 더해야 한 명으로 좁혀져요.",
      },
      {
        type: "blank", concept: "adv_apply_4",
        q: "두 단서를 모두 만족하는 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n  ___ name LIKE '__'",
        chips: ["AND", "OR", ","],
        answer: 0,
        explain: "두 단서가 함께 맞아야 하니 AND예요. 해랑 한 명이 나와요. OR는 한 단서만 맞아도 남기고, 쉼표는 오류가 나요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "단서를 OR로 이은 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n  OR name LIKE '__'",
        options: ["16행", "17행", "1행"],
        answer: 0,
        explain: "여우고개 3명과 두 글자 이름 14명을 합치면 17이지만, 둘 다 맞는 해랑은 한 번만 나와 16행이에요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "AND로 단서를 하나 더할 때마다 결과 행 수는 어떻게 될까요?",
        options: ["같거나 줄어든다", "늘 늘어난다", "늘 1행이 된다"],
        answer: 0,
        explain: "AND는 이미 남은 행 가운데서 또 골라요. 그래서 늘어날 수 없어요. 행 수가 줄어드는 것을 보며 단서가 잘 걸렸는지 확인해요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "할멈이 이름을 세 글자로 잘못 말했다면, 이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n  AND name LIKE '___'",
        options: ["2행", "1행", "3행"],
        answer: 0,
        explain: "여우고개 손님 중 세 글자 이름은 신아람·방실이 2명이에요. 단서 하나가 틀리면 엉뚱한 손님이 나오니 할멈께 다시 여쭤봐요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "이름을 한 글자로 기억해 찾으면 결과는 어떨까요?",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n  AND name LIKE '_'",
        options: ["행이 하나도 없는 표", "해랑 한 행", "LIKE '_' 때문에 오류가 난다"],
        answer: 0,
        explain: "여우고개 손님 셋은 이름이 두세 글자라 한 글자인 사람이 없어요. 0행이 나오면 단서 중 하나가 틀렸다는 신호예요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "여우고개 손님 중 이름이 「이」로 끝나는 손님은?",
        code: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n  AND name LIKE '%이'",
        options: ["방실이", "신아람", "해랑"],
        answer: 0,
        explain: "'%이'는 몇 글자든 뒤에 「이」로 끝나는 이름이에요. 여우고개 손님 셋 중 방실이 하나예요.",
      },
      {
        type: "choice", concept: "adv_apply_4",
        q: "여우고개나 달빛마을에 살고 이름이 두 글자인 손님을 보여 준 결과는?",
        options: [
          { sql: "SELECT name, village\nFROM customers\nWHERE name LIKE '__'\n  AND (village = '여우고개'\n  OR village = '달빛마을')" },
          { sql: "SELECT name, village\nFROM customers\nWHERE village = '여우고개'\n  OR village = '달빛마을'\n  AND name LIKE '__'" },
          { sql: "SELECT name, village\nFROM customers\nWHERE name LIKE '___'\n  AND (village = '여우고개'\n  OR village = '달빛마을')" },
        ],
        answer: 0, tables: ["customers"],
        explain: "해랑·단비 2명이 정답이에요. 괄호가 없으면 AND가 먼저 묶여 신아람·방실이까지 4명, 세 글자 무늬는 7명이 나와요.",
      },
      {
        type: "order", concept: "adv_apply_4",
        q: "버드나무고개나 솔바위골에 살고 이름이 두 글자인 손님을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, village", "FROM customers", "WHERE (village = '버드나무고개'", "OR village = '솔바위골')", "AND name LIKE '__'"],
        expect: "name | village\n무쇠 | 솔바위골\n초롱 | 버드나무고개\n솔아 | 솔바위골\n뭉치 | 버드나무고개",
        explain: "괄호로 묶은 마을 단서가 앞에 와도 돼요. 그 덩어리를 이름 단서와 AND로 이어 4명이에요. 괄호가 없으면 AND가 먼저 묶여 8명이 나와요.",
      },
      {
        id: "4-A3-b1", type: "build", concept: "adv_apply_4",
        q: "달래 할멈 의뢰: 여우고개에 살고 이름이 두 글자인 손님을 찾아 줘",
        cards: ["SELECT", "*", "FROM", "customers", "WHERE", "village = '여우고개'", "AND", "name LIKE '__'"],
        extra: ["OR", "name LIKE '___'"],
        tables: ["customers"],
        hints: [
          "단서 둘이 모두 맞아야 해요. 이름 글자 수는 _ 개수로 정해요.",
          "WHERE 다음에 마을 조건, AND, _ 두 개인 이름 조건을 놓아요.",
        ],
        explain: "의뢰 해결! 여우고개의 해랑 님이에요. 3명에서 1명으로, AND로 단서를 더할 때마다 행이 줄었죠. 보따리를 돌려드릴 수 있겠어요!",
      },
      {
        type: "check", concept: "adv_apply_4",
        q: "손님 찾기 의뢰를 풀며 알게 된 것으로 맞는 말은?",
        options: [
          "AND로 단서를 더하면 행이 같거나 줄어, 행 수로 단서를 확인할 수 있다",
          "OR로 단서를 더하면 행이 줄어든다",
          "LIKE '__'는 두 글자 이상인 이름을 찾는다",
        ],
        answer: 0,
        explain: "AND는 좁히고 OR는 넓혀요. 행 수가 0이 되거나 너무 많으면 단서를 다시 봐요. 딱 두 글자는 '__', 두 글자 이상은 '__%'예요.",
      },
    ],
  },
];
