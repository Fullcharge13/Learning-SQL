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
          "WHERE price < 10 AND shop_id = 1",
          "WHERE price < 10, shop_id = 1",
          "WHERE price < 10 WHERE shop_id = 1",
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
        lines: ["SELECT name, price", "FROM items", "WHERE (shop_id = 1 OR shop_id = 2)", "AND price <= 8"],
        expect: "name | price\n도토리묵 | 8\n인절미 | 6\n송편 | 7\n식혜 | 5\n꿀떡 | 8",
        explain: "괄호로 두 가게를 먼저 묶고 AND로 값 조건을 걸어요. 먹거리 가게의 싼 물건 5가지가 나와요.",
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
          "kind = '여우' AND village = '개울마을'",
          "kind = '여우' OR village = '개울마을'",
          "kind = '여우', village = '개울마을'",
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
        lines: ["SELECT name, price", "FROM items", "WHERE price NOT BETWEEN 10 AND 300", "AND shop_id = 7"],
        expect: "name | price\n도깨비방망이 | 320\n금방망이 | 400",
        explain: "NOT BETWEEN으로 범위 바깥을 고르고 AND로 가게를 더 걸었어요. 도깨비방망이(320)·금방망이(400)가 나와요.",
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
