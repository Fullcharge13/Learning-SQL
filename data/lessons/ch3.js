// 3장 「조건으로 거르기」 (설계 §6: WHERE, 비교 연산, 글자 값 / 장터 예: 100엽전 넘는 물건 — 판정 R31로 「냥」 대신 「엽전」).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 3
// 3장 낱말은 2장까지(SELECT·FROM·*·AS·+ - * /)에 WHERE와 비교 기호 = <> != < > <= >= 를 더한 것이다.
// 여러 조건(AND·OR, 4장)·줄 세우기(ORDER BY, 5장)·빈칸(NULL, 6장)은 쓰지 않는다.
// - 경계값: > 와 >= 가 데이터에서 같은 결과가 되지 않게, 실제로 있는 값(산삼 120, 수육·오미자청 25, 막걸리 10)을 기준으로 쓴다.
//   장터 예 「price > 100」은 딱 100엽전인 물건이 없어 >= 100과 결과가 같다. 그래서 그 조립에는 >= 헷갈림 카드를 넣지 않는다.
// - 글자 값은 작은따옴표. 따옴표 없는 한글(약재)은 「그런 열이 없다」 오류다. 다만 조립 카드로는 쓸 수 없다
//   (점검기가 따옴표 없는 한글을 글자마다 다른 낱말로 잘라 「카드 하나에 낱말 하나」에 걸림). 빈자리 칩·객관식으로만 다룬다.
// - 날짜도 글자 값이다. 따옴표 없는 2026-01-03은 빼기 셈(2022)으로 읽혀 이 장터(SQLite)에서는 오류 없이 0행이 된다(3-3).
//   PostgreSQL은 날짜 열과 숫자를 견주면 오류라서 「이 장터에서는」을 붙였다(판정 R36).
// - 값 비교의 대소문자: 이 장터(SQLite)의 = 는 영어 대문자·소문자를 가린다. 데이터 값이 모두 한글이라 말로만 짚는다.
// - stock(재고 NULL 3개)·age(나이 NULL 5개)를 비교하면 빈칸인 행은 어느 비교에도 걸리지 않고 빠진다.
//   3-4에서 「빈칸은 6장에서」라고 짚고, 그 밖의 조건은 빈칸 없는 열(price, shop_id, category, kind, village, status)로 쓴다.
export const CHAPTER = { id: 3, title: "조건으로 거르기" };

export const LESSONS = [
  {
    id: "3-1", chapter: 3, title: "WHERE로 거르기",
    goal: "WHERE로 조건에 맞는 행만 골라 볼 수 있다",
    summary: [
      "WHERE 조건 = 조건에 맞는 행만 남기기",
      "WHERE는 FROM 표 이름 뒤에 써요",
      "행만 걸러지고 열은 SELECT가 정해요",
    ],
    cards: [
      {
        say: "물건이 40가지라 찾기 힘들죠? FROM 뒤에 WHERE와 조건을 쓰면 조건에 맞는 행만 남아요. 아래는 shop_id(가게 번호)가 3인 물건, 곧 산삼 약방 물건만 고른 거예요.",
        sql: "SELECT *\nFROM items\nWHERE shop_id = 3",
      },
      {
        say: "WHERE는 꼭 FROM 표 이름 뒤에 와요. 「어느 표에서 → 어떤 행만」 차례예요. 열은 여전히 SELECT가 골라요. item_id는 물건마다 다른 번호라서 아래처럼 딱 한 행만 남아요.",
        sql: "SELECT name, price\nFROM items\nWHERE item_id = 26",
      },
    ],
    items: [
      {
        type: "choice", concept: "where",
        q: "WHERE는 무슨 일을 할까요?",
        options: ["조건에 맞는 행만 남긴다", "보여 줄 열을 고른다", "어느 표인지 정한다"],
        answer: 0,
        explain: "WHERE는 행을 거르는 낱말이에요. 열은 SELECT가, 표는 FROM이 정해요.",
      },
      {
        type: "choice", concept: "where",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT *\nFROM items\nWHERE shop_id = 3",
        options: ["5행", "40행", "3행"],
        answer: 0,
        explain: "가게 번호가 3인 물건은 산삼·인삼차·쌍화탕·감초·오미자청, 5가지예요. 40은 물건 전체, 3은 조건에 쓴 가게 번호예요.",
      },
      {
        type: "blank", concept: "where",
        q: "조건을 거는 낱말을 채워 보세요.",
        code: "SELECT *\nFROM items\n___ shop_id = 3",
        chips: ["WHERE", "FROM", "SELECT"],
        answer: 0,
        explain: "조건 앞에는 WHERE가 와요. FROM이나 SELECT를 넣으면 차례가 어긋나 오류가 나요.",
      },
      {
        type: "choice", concept: "where",
        q: "WHERE는 SQL의 어디에 쓸까요?",
        options: ["FROM 표 이름 뒤", "SELECT 바로 앞", "SELECT와 FROM 사이"],
        answer: 0,
        explain: "SELECT 무엇을 → FROM 어느 표에서 → WHERE 어떤 행만, 이 차례예요.",
      },
      {
        type: "choice", concept: "where",
        q: "다음 중 오류가 나는 SQL은 무엇일까요?",
        options: [
          "SELECT * WHERE shop_id = 3\nFROM items",
          "SELECT * FROM items\nWHERE shop_id = 3",
          "SELECT name FROM items\nWHERE shop_id = 3",
        ],
        answer: 0,
        explain: "WHERE가 FROM보다 앞에 와서 오류예요. 조건은 표 이름을 말한 다음에 붙여요.",
      },
      {
        type: "choice", concept: "where",
        q: "item_id가 26인 행만 고르면 어떤 물건이 나올까요?",
        code: "SELECT name\nFROM items\nWHERE item_id = 26",
        options: ["갓", "산삼", "담뱃대"],
        answer: 0,
        explain: "item_id가 26인 물건은 갓 하나예요. 물건 번호는 물건마다 달라서 한 행만 나와요.",
      },
      {
        type: "choice", concept: "where",
        q: "이 SQL의 결과에는 열이 몇 개 있을까요?",
        code: "SELECT *\nFROM items\nWHERE shop_id = 3",
        options: ["5개", "1개", "40개"],
        answer: 0,
        explain: "WHERE는 행만 걸러요. SELECT * 라서 물건 표의 다섯 열이 그대로 나와요.",
      },
      {
        type: "order", concept: "where",
        q: "가게 번호가 3인 물건의 이름과 값을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE shop_id = 3"],
        explain: "SELECT 열 → FROM 표 → WHERE 조건 차례예요. WHERE 줄이 앞으로 가면 오류가 나요.",
      },
      {
        type: "choice", concept: "where",
        q: "가게 번호(shop_id)가 7인 물건만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT *\nFROM items\nWHERE shop_id = 7" },
          { sql: "SELECT *\nFROM shops\nWHERE shop_id = 7" },
          { sql: "SELECT *\nFROM items\nWHERE item_id = 7" },
        ],
        answer: 0, tables: ["items"],
        explain: "물건 표의 shop_id 열이 모두 7인 표가 정답이에요. item_id가 7인 물건은 송편 하나, shops 표에서 고르면 가게 한 곳이 나와요.",
      },
      {
        type: "blank", concept: "where",
        q: "가게 번호가 1인 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE ___ = 1",
        chips: ["shop_id", "item_id", "price"],
        answer: 0,
        explain: "가게 번호 열은 shop_id예요. item_id = 1이면 국밥 하나만, price = 1이면 1엽전짜리가 없어 아무것도 안 나와요.",
      },
      {
        id: "3-1-b1", type: "build", concept: "where",
        q: "산삼 약방(가게 번호 3)의 물건만 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "shop_id", "=", "3"],
        extra: ["item_id", "shops", "4"],
        tables: ["items"],
        hints: [
          "물건 표에서 가게 번호 열이 3인 행만 남겨요. 조건은 표 이름 다음에 와요.",
          "SELECT * FROM items 뒤에 WHERE, shop_id, =, 3을 놓아요.",
        ],
        explain: "산삼 약방 물건 5가지만 남았어요! 열은 다섯 개 그대로, 행만 걸러졌죠.",
      },
      {
        type: "check", concept: "where",
        q: "WHERE를 바르게 설명한 것은?",
        options: [
          "FROM 표 이름 뒤에 써서 조건에 맞는 행만 남긴다",
          "SELECT 앞에 써서 보여 줄 열을 고른다",
          "조건에 안 맞는 행을 장부에서 없앤다",
        ],
        answer: 0,
        explain: "WHERE는 FROM 뒤에서 행을 걸러요. 결과 표에서만 걸러질 뿐 장부는 그대로예요.",
      },
    ],
  },
  {
    id: "3-2", chapter: 3, title: "크다, 작다",
    goal: "> < >= <= 로 값을 견줘 행을 고를 수 있다",
    summary: [
      "> 넘는, < 미만, >= 이상, <= 이하",
      "= 가 붙으면 그 값도 들어가요",
      "WHERE의 열은 SELECT에 없어도 돼요",
    ],
    cards: [
      {
        say: "값이 100엽전 넘는 물건만 볼까요? 「넘는다」는 > 예요. 아래 결과를 봐요. 산삼 120, 갓 110, 그리고 공방 물건들이 모두 100엽전보다 비싸요.",
        sql: "SELECT name, price\nFROM items\nWHERE price > 100",
      },
      {
        say: "> 는 그 값을 빼고, >= 는 그 값도 넣어요. 아래처럼 price >= 120이면 딱 120엽전인 산삼도 나와요. > 120이면 산삼은 빠지죠. 「미만」은 <, 「이하」는 <= 예요.",
        sql: "SELECT name, price\nFROM items\nWHERE price >= 120",
      },
    ],
    items: [
      {
        type: "choice", concept: "compare",
        q: "「값이 100엽전 넘는」을 조건으로 바르게 쓴 것은?",
        options: ["price > 100", "price < 100", "price = 100"],
        answer: 0,
        explain: "넘는다는 「보다 크다」, > 예요. < 는 더 싼 것, = 는 딱 100엽전인 것이에요.",
      },
      {
        type: "choice", concept: "compare",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE price > 300",
        options: ["3행", "2행", "40행"],
        answer: 0,
        explain: "300엽전보다 비싼 물건은 도깨비방망이(320)·금방망이(400)·장승(350), 3가지예요.",
      },
      {
        type: "choice", concept: "compare",
        q: "값이 120엽전인 산삼이 결과에 나오는 조건은?",
        options: ["price >= 120", "price > 120", "price < 120"],
        answer: 0,
        explain: "= 가 붙은 >= 는 120 자체도 넣어요. > 120은 120보다 큰 것만이라 산삼이 빠지고, < 120도 산삼을 빼요.",
      },
      {
        type: "blank", concept: "compare",
        q: "값이 10엽전 미만인 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price ___ 10",
        chips: ["<", ">", "<="],
        answer: 0,
        explain: "미만은 그 값보다 작은 것, < 예요. <= 를 쓰면 딱 10엽전인 막걸리까지 들어가요.",
      },
      {
        type: "choice", concept: "compare",
        q: "price <= 8 은 무슨 뜻일까요?",
        options: ["값이 8엽전 이하(8엽전도 넣음)", "값이 8엽전 미만(8엽전은 뺌)", "값이 8엽전 넘음"],
        answer: 0,
        explain: "<= 는 「작거나 같다」예요. 그래서 8엽전인 도토리묵·꿀떡도 나와요.",
      },
      {
        type: "choice", concept: "compare",
        q: "값이 25엽전 이상인 물건만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, price\nFROM items\nWHERE price >= 25" },
          { sql: "SELECT name, price\nFROM items\nWHERE price > 25" },
          { sql: "SELECT name, price\nFROM items\nWHERE price <= 25" },
        ],
        answer: 0, tables: ["items"],
        explain: "이상은 25엽전과 그보다 비싼 것이에요. 수육(25)과 산삼(120)이 함께 든 표가 정답이에요. 25가 없으면 > 25, 25 이하만 있으면 <= 25예요.",
      },
      {
        type: "choice", concept: "compare",
        q: "결과 표에 price 열이 없는데, 이 SQL은 돌까요?",
        code: "SELECT name\nFROM items\nWHERE price > 300",
        options: [
          "돈다. WHERE에 쓴 열은 SELECT에 없어도 된다",
          "price 열을 찾지 못해 멈춘다",
          "돌지만 행이 하나도 안 나온다",
        ],
        answer: 0,
        explain: "WHERE는 장부의 모든 열을 보고 걸러요. 값으로 거르고 이름만 보여 줄 수 있어요.",
      },
      {
        type: "order", concept: "compare",
        q: "값이 30엽전 넘는 물건의 이름과 값을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE price > 30"],
        explain: "SELECT 열 → FROM 표 → WHERE 조건 차례예요. 비교 기호는 WHERE 줄 안에 들어가요.",
      },
      {
        type: "blank", concept: "compare",
        q: "값이 딱 25엽전인 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price ___ 25",
        chips: ["=", ">=", "<="],
        answer: 0,
        explain: "딱 그 값은 = 예요. 수육과 오미자청이 나와요. >= 는 더 비싼 것, <= 는 더 싼 것까지 넣어요.",
      },
      {
        type: "choice", concept: "compare",
        q: "「작거나 같다(이하)」를 뜻하는 기호는?",
        options: ["<=", "=<", "<"],
        answer: 0,
        explain: "<= 처럼 < 를 먼저, = 를 뒤에 써요. =< 처럼 순서를 바꾸면 오류가 나요. < 는 「작다」뿐이에요.",
      },
      {
        id: "3-2-b1", type: "build", concept: "compare",
        q: "100엽전 넘는 물건의 이름과 값을 보여 줘",
        cards: ["SELECT", "name", ",", "price", "FROM", "items", "WHERE", "price", ">", "100"],
        extra: ["<", "stock"],
        tables: ["items"],
        hints: [
          "물건 표에서 값 열이 100보다 큰 행만 남겨요. 「넘는」은 100 자체를 빼요.",
          "SELECT name, price FROM items 뒤에 WHERE price > 100을 놓아요.",
        ],
        explain: "3장의 대표 문제, 100엽전 넘는 물건 완성! 산삼·갓과 공방 물건까지 12가지예요.",
      },
      {
        type: "check", concept: "compare",
        q: "비교 기호를 바르게 짝지은 것은?",
        options: ["price >= 50 : 50엽전 이상", "price > 50 : 50엽전 이상", "price <= 50 : 50엽전 넘는"],
        answer: 0,
        explain: "= 가 붙으면 그 값도 넣어요. >= 는 이상, > 는 넘는, <= 는 이하, < 는 미만이에요.",
      },
    ],
  },
  {
    id: "3-3", chapter: 3, title: "글자 값으로 거르기",
    goal: "글자 값을 작은따옴표로 감싸 같은 값인 행을 고를 수 있다",
    summary: [
      "글자 값은 작은따옴표로: '약재'",
      "따옴표가 없으면 열 이름으로 읽어요",
      "띄어쓰기 한 칸까지 같아야 같아요",
    ],
    cards: [
      {
        say: "글자 값은 '약재'처럼 작은따옴표로 감싸요. 따옴표가 없으면 약재를 열 이름으로 읽어 「그런 열이 없다」 오류가 나요. 이 장터의 날짜도 글자 값이라 감싸요. 안 감싸면 날짜 속 줄표를 빼기 셈으로 읽어요. 아래는 약재 가게만!",
        sql: "SELECT *\nFROM shops\nWHERE category = '약재'",
      },
      {
        say: "글자 값은 띄어쓰기 한 칸까지 똑같아야 같다고 봐요. 장부에는 「도깨비 국밥집」이라 띄어 있어서, 아래처럼 붙여 쓰면 0행이에요. 이 장터에서는 영어 값의 대문자·소문자도 가려요.",
        sql: "SELECT *\nFROM shops\nWHERE name = '도깨비국밥집'",
      },
    ],
    items: [
      {
        type: "choice", concept: "textval",
        q: "글자 값 「약재」를 조건에 바르게 쓴 것은?",
        options: ["category = '약재'", "category = 약재", "category = (약재)"],
        answer: 0,
        explain: "글자 값은 작은따옴표로 감싸요. 따옴표가 없으면 약재라는 열을 찾다가 오류가 나요.",
      },
      {
        type: "choice", concept: "textval",
        q: "이 SQL을 돌리면 어떻게 될까요?",
        code: "SELECT *\nFROM shops\nWHERE category = 약재",
        options: ["약재라는 열이 없다는 오류가 난다", "약재 가게 2곳이 나온다", "가게 8곳이 모두 나온다"],
        answer: 0,
        explain: "따옴표가 없으면 약재를 열 이름으로 읽어요. 가게 표에 그런 열이 없으니 오류예요. '약재'로 감싸면 돼요.",
      },
      {
        type: "blank", concept: "textval",
        q: "종류(kind)가 여우인 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, kind\nFROM customers\nWHERE kind = ___",
        chips: ["'여우'", "여우", "kind"],
        answer: 0,
        explain: "글자 값은 '여우'처럼 감싸요. 따옴표 없는 여우는 오류가 나고, kind = kind는 모든 손님이 나와요.",
      },
      {
        type: "choice", concept: "textval",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, kind\nFROM customers\nWHERE kind = '여우'",
        options: ["12행", "24행", "60행"],
        answer: 0,
        explain: "여우 손님은 12명이에요. 24는 도깨비 손님이나 사람 손님의 수, 60은 손님 전체예요.",
      },
      {
        type: "choice", concept: "textval",
        q: "이 SQL의 결과는 어떨까요?",
        code: "SELECT *\nFROM shops\nWHERE name = '산삼약방'",
        options: ["행이 하나도 없는 표", "산삼 약방 한 행", "그런 가게가 없다는 오류"],
        answer: 0,
        explain: "장부에는 띄어 쓴 「산삼 약방」이 있어요. 한 칸이라도 다르면 다른 글자라 고를 행이 없어요. 오류는 나지 않아요.",
      },
      {
        type: "choice", concept: "textval",
        q: "개울마을에 사는 손님만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, village\nFROM customers\nWHERE village = '개울마을'" },
          { sql: "SELECT name, village\nFROM customers\nWHERE village = '달빛마을'" },
          { sql: "SELECT name, kind\nFROM customers\nWHERE kind = '여우'" },
        ],
        answer: 0, tables: ["customers"],
        explain: "village(사는 마을) 열이 모두 개울마을인 표가 정답이에요. 개울마을 손님은 8명이에요.",
      },
      {
        type: "choice", concept: "textval",
        q: "날짜를 따옴표 없이 쓰면 어떻게 될까요?",
        code: "SELECT *\nFROM shops\nWHERE opened_on = 2026-01-03",
        options: [
          "이 장터에서는 아무 행도 안 나온다. 빼기 셈으로 읽는다",
          "1월 3일에 연 가게 2곳이 나온다",
          "가게 8곳이 모두 나온다",
        ],
        answer: 0,
        explain: "따옴표가 없으면 2026 빼기 1 빼기 3, 곧 2022라는 숫자로 읽어요. 이 장터에서는 0행, 데이터베이스에 따라 오류도 나요. 이 장터의 날짜는 글자 값이라 '2026-01-03'으로 감싸요.",
      },
      {
        type: "blank", concept: "textval",
        q: "주문 상태(status)가 취소인 주문만 나오게 빈자리를 채워 보세요.",
        code: "SELECT *\nFROM orders\nWHERE status = ___",
        chips: ["'취소'", "'완료'", "취소"],
        answer: 0,
        explain: "취소는 '취소'로 감싸요. '완료'는 다른 주문이 나오고, 따옴표 없는 취소는 오류가 나요.",
      },
      {
        type: "order", concept: "textval",
        q: "공방 가게의 이름과 주인을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, owner", "FROM shops", "WHERE category = '공방'"],
        expect: "name | owner\n방망이 대장간 | 쇠돌\n뚝딱 공방 | 나무쇠",
        explain: "SELECT 열 → FROM 표 → WHERE 조건이에요. 공방은 글자 값이라 '공방'으로 감쌌어요.",
      },
      {
        type: "choice", concept: "textval",
        q: "SQL 낱말과 글자 값의 대문자·소문자에 대해 맞는 말은?",
        options: [
          "낱말은 where로 써도 되지만, 이 장터에서 글자 값은 똑같이 써야 한다",
          "글자 값은 따옴표 없이 써도 된다",
          "낱말은 꼭 대문자로만 써야 돈다",
        ],
        answer: 0,
        explain: "1장에서 본 것처럼 낱말은 대소문자를 가리지 않아요. 이 장터에서는 따옴표 안 글자 값을 다르게 쓰면 다른 값이에요.",
      },
      {
        id: "3-3-b1", type: "build", concept: "textval",
        q: "약재 가게만 보여 줘",
        cards: ["SELECT", "*", "FROM", "shops", "WHERE", "category", "=", "'약재'"],
        extra: ["<>", "items", "name"],
        tables: ["shops"],
        hints: [
          "가게 표에서 종류(category) 열이 약재인 행만 남겨요. 글자 값은 감싸야 해요.",
          "WHERE category = 다음에 따옴표로 감싼 '약재' 카드를 놓아요.",
        ],
        explain: "산삼 약방·달빛 약초방, 약재 가게 두 곳이 나왔어요. 작은따옴표 덕분에 글자 값으로 읽혔어요!",
      },
      {
        type: "check", concept: "textval",
        q: "글자 값 비교에 대해 맞는 말은?",
        options: [
          "작은따옴표로 감싸고, 띄어쓰기까지 같아야 같다",
          "따옴표 없이 써도 글자 값으로 읽는다",
          "비슷하게만 써도 맞는 행을 찾아 준다",
        ],
        answer: 0,
        explain: "글자 값은 '약재'처럼 감싸고, 한 칸이라도 다르면 다른 값이에요.",
      },
    ],
  },
  {
    id: "3-4", chapter: 3, title: "같지 않다",
    goal: "<> 와 != 로 그 값이 아닌 행을 고를 수 있다",
    summary: [
      "<> 와 != 는 「같지 않다」, 뜻이 같아요",
      "숫자에도 글자 값에도 써요",
      "빈칸은 어느 비교에도 걸리지 않아요",
    ],
    cards: [
      {
        say: "「도깨비가 아닌 손님」처럼 그 값이 아닌 행을 고를 때는 <> 를 써요. != 도 뜻이 똑같아요. 아래는 kind(종류)가 도깨비가 아닌 손님, 곧 사람과 여우 손님이에요.",
        sql: "SELECT name, kind\nFROM customers\nWHERE kind <> '도깨비'",
      },
      {
        say: "조심! 메밀전·한지·장승은 재고 칸이 비어 있어요. 빈칸은 크기를 견줄 수 없어서 어느 비교에도 걸리지 않아요. 아래 「10개 미만」에도, 「10개 이상」에도 안 나와요. 빈칸은 6장에서!",
        sql: "SELECT name, stock\nFROM items\nWHERE stock < 10",
      },
    ],
    items: [
      {
        type: "choice", concept: "compare",
        q: "「같지 않다」를 뜻하는 기호를 모두 고른 것은?",
        options: ["<> 와 !=", "<> 하나뿐", "=! 와 ><"],
        answer: 0,
        explain: "<> 와 != 는 뜻이 같아요. 둘 다 「같지 않다」예요. =! 처럼 순서를 바꾸면 이 장터에서는 오류가 나요.",
      },
      {
        type: "choice", concept: "compare",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, kind\nFROM customers\nWHERE kind <> '도깨비'",
        options: ["36행", "24행", "60행"],
        answer: 0,
        explain: "손님 60명 중 도깨비 24명을 뺀 36명이에요(사람 24명 + 여우 12명). 24는 도깨비 손님 수예요.",
      },
      {
        type: "blank", concept: "compare",
        q: "가게 번호가 1이 아닌 가게만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name\nFROM shops\nWHERE shop_id ___ 1",
        chips: ["<>", "=", "<"],
        answer: 0,
        explain: "같지 않다는 <> 예요. = 는 국밥집 하나만, < 1은 그런 가게가 없어 아무것도 안 나와요.",
      },
      {
        type: "choice", concept: "compare",
        q: "WHERE kind != '사람' 과 결과가 똑같은 조건은?",
        options: ["kind <> '사람'", "kind = '사람'", "kind <> '여우'"],
        answer: 0,
        explain: "!= 와 <> 는 같은 뜻이라 결과도 같아요. = '사람'은 반대로 사람 손님만 남겨요.",
      },
      {
        type: "choice", concept: "compare",
        q: "재고 칸이 빈 메밀전은 이 SQL의 결과에 나올까요?",
        code: "SELECT name, stock\nFROM items\nWHERE stock < 10",
        options: [
          "나오지 않는다. 빈칸은 비교에 걸리지 않는다",
          "나온다. 빈칸은 0으로 친다",
          "메밀전 행에서 멈춘다",
        ],
        answer: 0,
        explain: "빈칸은 0이 아니라 「모르는 값」이라 10보다 작은지 알 수 없어요. 그래서 빠져요. 빈칸 찾는 법은 6장에서!",
      },
      {
        type: "choice", concept: "compare",
        q: "손님 60명 중 age >= 60은 10명, age < 60은 45명이에요. 더하면 55명인 까닭은?",
        options: [
          "나이 칸이 빈 손님 5명은 어느 비교에도 걸리지 않아서",
          "60살 손님이 두 번 세어져서",
          "손님 표가 55행이라서",
        ],
        answer: 0,
        explain: "나이를 모르는 손님 5명은 「60 이상」에도 「60 미만」에도 안 들어요. 손님 표는 60행 그대로예요.",
      },
      {
        type: "choice", concept: "compare",
        q: "여우가 아닌 손님만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, kind\nFROM customers\nWHERE kind <> '여우'" },
          { sql: "SELECT name, kind\nFROM customers\nWHERE kind = '여우'" },
          { sql: "SELECT name, kind\nFROM customers\nWHERE kind <> '사람'" },
        ],
        answer: 0, tables: ["customers"],
        explain: "kind 열에 여우가 하나도 없고 도깨비와 사람이 섞인 표가 정답이에요. 여우가 아닌 손님은 48명이에요.",
      },
      {
        type: "order", concept: "compare",
        q: "큰바위마을에 살지 않는 손님을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, village", "FROM customers", "WHERE village != '큰바위마을'"],
        explain: "!= 도 <> 와 같은 「같지 않다」예요. 조건 줄은 언제나 FROM 줄 다음이에요.",
      },
      {
        type: "blank", concept: "compare",
        q: "값이 12엽전이 아닌 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price ___ 12",
        chips: ["!=", "=", ">"],
        answer: 0,
        explain: "같지 않다는 != (또는 <>)예요. = 12는 국밥·감초만 남기고, > 12는 12엽전 이하를 모두 빼요.",
      },
      {
        type: "choice", concept: "compare",
        q: "다음 중 오류가 나는 SQL은 무엇일까요?",
        options: [
          "SELECT * FROM shops\nWHERE category =! '공방'",
          "SELECT * FROM shops\nWHERE category != '공방'",
          "SELECT * FROM shops\nWHERE category <> '공방'",
        ],
        answer: 0,
        explain: "이 장터에서 =! 는 없는 기호라 오류예요. 느낌표가 앞에 오는 != 로 써요. <> 도 같은 뜻이에요.",
      },
      {
        id: "3-4-b1", type: "build", concept: "compare",
        q: "먹거리 가게가 아닌 가게를 보여 줘",
        cards: ["SELECT", "*", "FROM", "shops", "WHERE", "category", "<>", "'먹거리'"],
        extra: ["=", "items", "name"],
        tables: ["shops"],
        hints: [
          "가게 표에서 종류(category)가 먹거리와 같지 않은 행만 남겨요.",
          "WHERE category 다음에 「같지 않다」 기호 <> 와 '먹거리'를 놓아요.",
        ],
        explain: "약재·잡화·공방 가게 6곳이 나왔어요. <> 대신 != 를 써도 결과는 같아요.",
      },
      {
        type: "check", concept: "compare",
        q: "「같지 않다」 비교에 대해 맞는 말은?",
        options: [
          "<> 와 != 는 뜻이 같고, 빈칸인 행은 비교에서 빠진다",
          "<> 는 숫자에만, != 는 글자 값에만 쓴다",
          "빈칸인 행은 <> 비교에서 언제나 나온다",
        ],
        answer: 0,
        explain: "<> 와 != 는 숫자와 글자 값 모두에 써요. 빈칸은 어느 비교에도 걸리지 않아요.",
      },
    ],
  },
  {
    id: "3-5", chapter: 3, title: "3장 평가", isExam: true,
    goal: "WHERE와 비교 기호로 원하는 행만 고를 수 있다",
    summary: [
      "WHERE는 FROM 뒤, 조건에 맞는 행만",
      "> 넘는, >= 이상, <> 와 != 같지 않다",
      "글자 값은 작은따옴표로 감싸요",
    ],
    cards: [
      {
        say: "3장 정리 시간이에요! WHERE는 FROM 뒤에서 행을 거르고, 비교 기호로 값을 견주고, 글자 값은 작은따옴표로 감싸요. 아래가 3장의 대표 모양이에요. 두근두근, 같이 풀어 봐요!",
        sql: "SELECT name, price\nFROM items\nWHERE price > 100",
      },
    ],
    items: [
      {
        type: "choice", concept: "where",
        q: "WHERE 조건은 SQL의 어디에 쓸까요?",
        options: ["FROM 표 이름 뒤", "SELECT 바로 뒤", "SQL의 맨 앞"],
        answer: 0,
        explain: "SELECT 무엇을 → FROM 어느 표에서 → WHERE 어떤 행만, 이 차례예요.",
      },
      {
        type: "choice", concept: "where",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT *\nFROM items\nWHERE shop_id = 8",
        options: ["5행", "8행", "40행"],
        answer: 0,
        explain: "뚝딱 공방(가게 번호 8)의 물건은 다듬이방망이·빨래방망이·놋그릇·쇠솥·장승, 5가지예요. 8은 조건의 가게 번호예요.",
      },
      {
        type: "choice", concept: "compare",
        q: "「값이 30엽전 이하」를 조건으로 바르게 쓴 것은?",
        options: ["price <= 30", "price < 30", "price >= 30"],
        answer: 0,
        explain: "이하는 30도 넣는 <= 예요. < 30이면 딱 30엽전인 인삼차가 빠지고, >= 30은 더 비싼 쪽이에요.",
      },
      {
        type: "blank", concept: "compare",
        q: "값이 25엽전 넘는 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price ___ 25",
        chips: [">", ">=", "<"],
        answer: 0,
        explain: "「넘는」은 25를 빼는 > 예요. >= 를 쓰면 딱 25엽전인 수육·오미자청까지 들어가요.",
      },
      {
        type: "choice", concept: "compare",
        q: "이 SQL의 결과에 나오지 않는 물건은?",
        code: "SELECT name\nFROM items\nWHERE price >= 300",
        options: ["은방망이", "금방망이", "장승"],
        answer: 0,
        explain: "은방망이는 280엽전이라 300보다 싸요. 금방망이(400)·장승(350)·도깨비방망이(320)가 나와요.",
      },
      {
        type: "choice", concept: "textval",
        q: "이 SQL을 돌리면 어떻게 될까요?",
        code: "SELECT *\nFROM customers\nWHERE village = 달빛마을",
        options: ["달빛마을이라는 열이 없다는 오류가 난다", "달빛마을 손님 6명이 나온다", "손님 60명이 모두 나온다"],
        answer: 0,
        explain: "따옴표가 없어서 달빛마을을 열 이름으로 읽었어요. '달빛마을'로 감싸면 손님 6명이 나와요.",
      },
      {
        type: "blank", concept: "textval",
        q: "사람 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, age\nFROM customers\nWHERE kind = ___",
        chips: ["'사람'", "사람", "'도깨비'"],
        answer: 0,
        explain: "글자 값은 '사람'처럼 감싸요. 따옴표 없는 사람은 오류, '도깨비'는 도깨비 손님이 나와요.",
      },
      {
        type: "choice", concept: "textval",
        q: "쇠돌이 주인인 가게를 찾으려는데, 이 SQL로 찾아질까요?",
        code: "SELECT name\nFROM shops\nWHERE owner = '쇠 돌'",
        options: [
          "안 찾아진다. 띄어쓰기까지 같아야 한다",
          "찾아진다. 비슷하면 고른다",
          "그런 열이 없다는 오류가 난다",
        ],
        answer: 0,
        explain: "장부의 주인 이름은 붙여 쓴 「쇠돌」이에요. '쇠 돌'은 다른 글자라 0행이에요. 오류는 나지 않아요.",
      },
      {
        type: "choice", concept: "compare",
        q: "주문 상태는 완료·취소 둘뿐이에요. WHERE status <> '완료' 와 결과가 같은 조건은?",
        options: ["status = '취소'", "status = '완료'", "status != '취소'"],
        answer: 0,
        explain: "완료가 아닌 주문은 모두 취소 주문이에요. 그래서 = '취소'와 같아요. != '취소'는 완료 주문이에요.",
      },
      {
        type: "choice", concept: "compare",
        q: "재고 칸이 빈 물건 3가지(메밀전·한지·장승)는 WHERE stock >= 0 결과에 나올까요?",
        options: [
          "나오지 않는다. 빈칸은 비교에 걸리지 않는다",
          "나온다. 빈칸은 0으로 친다",
          "빈칸이 있어 아무 행도 안 나온다",
        ],
        answer: 0,
        explain: "빈칸은 「모르는 값」이라 0 이상인지 알 수 없어요. 그래서 40가지 중 37가지만 나와요.",
      },
      {
        type: "choice", concept: "textval",
        q: "가게 종류가 잡화인 가게만 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, category\nFROM shops\nWHERE category = '잡화'" },
          { sql: "SELECT name, category\nFROM shops\nWHERE category = '공방'" },
          { sql: "SELECT name, category\nFROM shops\nWHERE category <> '잡화'" },
        ],
        answer: 0,
        explain: "category 열이 모두 잡화인 표, 구름 잡화점·바람 보따리가 정답이에요. <> '잡화'는 잡화가 아닌 6곳이에요.",
      },
      {
        type: "order", concept: "where",
        q: "여우고개에 사는 손님의 이름과 나이를 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, age", "FROM customers", "WHERE village = '여우고개'"],
        expect: "name | age\n신아람 | 34\n해랑 | 18\n방실이 | 48",
        explain: "SELECT 열 → FROM 표 → WHERE 조건. 여우고개에는 손님 3명이 살아요.",
      },
      {
        id: "3-5-b1", type: "build", concept: "compare",
        q: "100엽전 넘는 물건의 이름과 값을 보여 줘",
        cards: ["SELECT", "name", ",", "price", "FROM", "items", "WHERE", "price", ">", "100"],
        extra: ["=", "item_id"],
        tables: ["items"],
        hints: [
          "값 열을 100과 견줘요. 「넘는」이니 100 자체는 빼요.",
          "WHERE price 다음에 > 와 100을 놓아요.",
        ],
        explain: "3장의 대표 문제, 100엽전 넘는 물건 12가지를 다시 골랐어요. WHERE와 비교 기호 완벽해요!",
      },
      {
        id: "3-5-b2", type: "build", concept: "textval",
        q: "여우 손님의 이름과 사는 마을을 보여 줘",
        cards: ["SELECT", "name", ",", "village", "FROM", "customers", "WHERE", "kind", "=", "'여우'"],
        extra: ["<>", "age"],
        tables: ["customers"],
        hints: [
          "손님 표에서 종류(kind)가 여우인 행만 남기고, 이름과 마을 열을 골라요.",
          "WHERE kind = 다음에 작은따옴표로 감싼 '여우'를 놓아요.",
        ],
        explain: "여우 손님 12명과 사는 마을이 나왔어요. 열 고르기와 글자 값 거르기를 한 번에!",
      },
      {
        type: "check", concept: "where",
        q: "3장에서 배운 것으로 맞는 말은?",
        options: [
          "FROM 뒤 WHERE에 조건을 쓰고, 글자 값은 작은따옴표로 감싼다",
          "WHERE는 SELECT 바로 뒤에 쓴다",
          "글자 값은 따옴표 없이 그냥 쓴다",
        ],
        answer: 0,
        explain: "WHERE로 원하는 행만 고르는 것이 3장의 전부예요. 실무에서는 쇼핑몰 상품 표에서 「10만 원 넘는 상품」, 「품절이 아닌 상품」을 골라낼 때 이렇게 써요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 3장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// N은 실제로 있는 값(그 값인 물건이 있음)만 뽑는다: > 와 >= 의 결과가 늘 달라지고, = {N}도 0행이 되지 않는다.
const PRICES = [9, 12, 25, 28, 110, 120, 150, 180, 260, 280];
export const TEMPLATES = [
  {
    id: "3-T1", concept: "compare", type: "blank",
    q: "값이 {N}엽전 넘는 물건만 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name, price\nFROM items\nWHERE price ___ {N}",
    chips: [">", ">=", "<"],
    answer: 0,
    vars: { N: PRICES },
    explain: "「넘는」은 {N}엽전 자체를 빼는 > 예요. >= 는 딱 {N}엽전인 물건까지 넣고, < 는 더 싼 물건을 골라요.",
  },
  {
    id: "3-T2", concept: "textval", type: "blank",
    q: "{C} 가게만 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name, category\nFROM shops\nWHERE category = ___",
    chips: ["'{C}'", "{C}", "category"],
    answer: 0,
    vars: { C: ["먹거리", "약재", "잡화", "공방"] },
    explain: "글자 값은 작은따옴표로 감싸요. 따옴표가 없으면 열 이름으로 읽어 오류가 나고, category = category는 모든 가게가 나와요.",
  },
  {
    id: "3-T3", concept: "textval", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, kind\nFROM customers\nWHERE kind = '{K}'",
    wrong: [
      "SELECT name, kind\nFROM customers\nWHERE kind <> '{K}'",
      "SELECT name, village\nFROM customers\nWHERE kind = '{K}'",
    ],
    vars: { K: ["도깨비", "사람", "여우"] },
    explain: "= '{K}' 조건은 kind 열이 모두 그 값인 행만 남겨요. <> 는 그 반대이고, 열 이름이 village인 표는 SELECT가 달라요.",
  },
  {
    id: "3-T4", concept: "compare", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price\nFROM items\nWHERE price > {N}",
    wrong: [
      "SELECT name, price\nFROM items\nWHERE price < {N}",
      "SELECT name, price\nFROM items\nWHERE price = {N}",
    ],
    vars: { N: PRICES },
    explain: "> {N} 은 {N}엽전보다 비싼 물건만 남겨요. price 열이 모두 {N}엽전보다 큰 표를 골라요.",
  },
];

// ---- 3장 심화 (v0.2, 쓰기 안내 13절 · 디딤돌 docs/specs/2026-11-06-심화-1-6장-디딤돌.md §2 3장) ----
// - 쓸 수 있는 것: 1~3장 낱말뿐(ADVANCED_GRAMMAR[3]은 비어 있음). 앞 장 심화 낱말(--, %)은 쓰지 않는다(R53).
//   여러 조건(AND·OR·BETWEEN, 4장), 줄 세우기(ORDER BY, 5장), IS NULL(6장)은 쓰지 않는다. 그래서 범위는 한쪽 끝만 건다.
// - 3-A1 열끼리 비교: stock < price 19행, stock > price 17행, stock = price 1행(보따리 16/16), 빈칸 재고 3가지(메밀전·한지·장승)는
//   어느 쪽에도 없음(19 + 17 + 1 = 37). price * stock > 5000 은 7행(쇠솥 5200 … 은방망이 11200), < 5000 은 30행.
//   국밥은 재고 27 > 값 12. 열끼리 비교는 모든 데이터베이스에서 같아 「이 장터에서는」을 붙이지 않는다.
// - 3-A2 글자·날짜: opened_on < '2026-01-03' 3행(1월 1·2일), <= 5행, > 3행(1월 4·5일). first_visit >= '2026-12-01' 4행
//   (> '2026-12-01'도 4행이라 조립 헷갈림은 <= — 56행). '2026-11-01'부터는 7행. 따옴표 없는 2026-12-01 은 빼기 셈(2013) — first_visit >= 2013 은 60행(sql.js·sqlite3 확인).
//   글자는 앞 글자부터 견줘 '10'이 '9'보다 앞(모든 데이터베이스 같음). 한글 가나다 차례는 정렬 규칙에 달려 「이 장터에서는」(R36):
//   name < '다' (items) = 감초·갓·구기자·국밥·금방망이·꿀떡·노리개·놋그릇 8행, 도토리묵은 「도」가 「다」보다 뒤라 빠짐.
//   이 장터의 날짜는 글자 값(3-3)이라 「이 장터에서는」으로 감싼다.
// - 3-A3 의뢰: 구름 잡화점(shops 5번) 주인 최보부. stock < 10 은 7행(인절미 9·산삼 2·인삼차 4·오미자청 6·짚신 0·빨래방망이 4·
//   놋그릇 2), 10 - stock 은 1·8·6·4·10·6·8. 가게별로 3번 3가지, 8번 2가지, 2번·5번 1가지. 도라지는 재고 딱 10이라
//   < 10 에서 빠지고 <= 10 이면 shortage 0으로 들어옴(8행). 숫자 − 열 모양은 이 레슨 카드에서 처음 보여 준다(디딤돌 「심화 안」).
// - 조립은 R51(1~3토큰 구절 카드 가능). 3-A1·3-A2는 비교 기호를 낱장으로 둬 열·값 자리를 놓게 했다.
//   헷갈림 카드에 따옴표 글자 값은 두지 않는다(R33).
export const ADVANCED = [
  {
    id: "3-A1", chapter: 3, isAdvanced: true, title: "열과 열 견주기",
    goal: "한 행 안의 두 열을 견줘 조건에 맞는 행을 고를 수 있다",
    summary: [
      "비교 기호 양쪽에 열을 둘 다 놓아도 돼요",
      "행마다 자기 칸끼리 견줘요",
      "빈칸 재고는 여기서도 빠져요",
    ],
    cards: [
      {
        say: "3장에서 값 열을 100 같은 값과 견줬죠? 오늘은 한 걸음 더! 비교 기호 양쪽에 열을 놓아도 돼요. 아래는 재고 수가 값보다 작은 물건, 행마다 자기 두 칸을 견줘요. SQL은 숫자끼리면 견줘 주지만, 뜻이 있는 비교인지는 사람이 생각해요.",
        sql: "SELECT name, price, stock\nFROM items\nWHERE stock < price",
      },
      {
        say: "열끼리 셈한 값도 견줄 수 있어요. 값에 재고를 곱하면 쌓인 물건의 값어치예요. 아래는 그 값어치가 5000엽전 넘는 물건! 재고 칸이 빈 장승은 값이 350엽전이어도 빠져요. 빈칸은 6장에서!",
        sql: "SELECT name, price, stock\nFROM items\nWHERE price * stock > 5000",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_col_compare",
        q: "WHERE stock < price 는 무엇과 무엇을 견줄까요?",
        options: ["같은 행의 재고 칸과 값 칸", "재고 열 전체와 값 열 전체", "stock과 price라는 글자"],
        answer: 0,
        explain: "행마다 그 행의 재고 칸과 값 칸을 견줘요. 조건이 참인 행만 남아요. stock과 price는 열 이름이라 따옴표 없이 써요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM items\nWHERE stock < price",
        options: ["19행", "17행", "40행"],
        answer: 0,
        explain: "재고가 값보다 작은 물건은 19가지예요. 17은 재고가 값보다 큰 물건의 수, 40은 물건 전체예요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "국밥(값 12엽전, 재고 27개)은 이 SQL의 결과에 나올까요?",
        code: "SELECT name\nFROM items\nWHERE stock < price",
        options: ["나오지 않는다. 재고 27이 값 12보다 크다", "나온다. 값이 12엽전이라서", "오류가 난다. 열끼리는 못 견준다"],
        answer: 0,
        explain: "국밥 행에서는 27 < 12 를 견주는 셈이라 거짓이에요. 열끼리 견주는 것은 오류가 아니에요.",
      },
      {
        type: "blank", concept: "adv_col_compare",
        q: "재고 수가 값보다 큰 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price, stock\nFROM items\nWHERE stock ___ price",
        chips: [">", "<", "="],
        answer: 0,
        explain: "재고가 더 크니 stock > price 예요. < 는 반대쪽 19가지, = 는 재고와 값이 같은 보따리 하나만 나와요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "보따리는 값 16엽전, 재고 16개예요. 어느 조건의 결과에 나올까요?",
        options: ["stock = price 에만 나온다", "stock < price 에 나온다", "stock > price 에 나온다"],
        answer: 0,
        explain: "16과 16은 같아서 작지도 크지도 않아요. 그래서 < 와 > 에는 빠지고 = 에만 나와요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "WHERE stock < price 와 결과가 똑같은 조건은?",
        options: ["price > stock", "price < stock", "stock > price"],
        answer: 0,
        explain: "양쪽 열을 맞바꾸면 기호의 입도 같이 돌려요. 「재고가 값보다 작다」는 「값이 재고보다 크다」와 같은 말이에요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "stock < price 는 19행, > 는 17행, = 는 1행이에요. 더해도 40행이 안 되는 까닭은?",
        options: [
          "재고 칸이 빈 물건 3가지는 어느 비교에도 걸리지 않아서",
          "보따리가 두 번 세어져서",
          "물건 표가 37행이라서",
        ],
        answer: 0,
        explain: "19 + 17 + 1 = 37이에요. 메밀전·한지·장승은 재고를 몰라 값과 견줄 수 없으니 셋 다에서 빠져요. 물건 표는 40행 그대로예요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "price * stock 은 무엇을 셈할까요?",
        options: ["쌓인 재고를 값으로 친 값어치(엽전)", "모든 물건 값을 더한 합", "재고 수의 두 배"],
        answer: 0,
        explain: "한 개 값에 개수를 곱했으니 그 물건 재고를 다 판다면 받을 엽전이에요. 은방망이는 280 × 40 = 11200엽전이에요.",
      },
      {
        type: "blank", concept: "adv_col_compare",
        q: "재고의 값어치가 5000엽전 넘는 물건만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price, stock\nFROM items\nWHERE price ___ stock > 5000",
        chips: ["*", "+", "-"],
        answer: 0,
        explain: "값어치는 값 곱하기 재고라 * 예요. + 나 - 를 넣으면 5000을 넘는 물건이 하나도 없어요.",
      },
      {
        type: "choice", concept: "adv_col_compare",
        q: "재고의 값어치(값 × 재고)가 5000엽전 넘는 물건을 보여 준 결과는?",
        options: [
          { sql: "SELECT name, price, stock\nFROM items\nWHERE price * stock > 5000" },
          { sql: "SELECT name, price, stock\nFROM items\nWHERE price * stock < 5000" },
          { sql: "SELECT name, price, stock\nFROM items\nWHERE price > stock" },
        ],
        answer: 0, tables: ["items"],
        explain: "쇠솥·갓·금방망이처럼 비싸고 재고도 넉넉한 7가지가 든 표가 정답이에요. 국밥이 든 30행은 5000 미만, 19행은 값이 재고보다 큰 물건이에요.",
      },
      {
        type: "order", concept: "adv_col_compare",
        q: "값이 재고보다 큰 물건을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price, stock", "FROM items", "WHERE price > stock"],
        explain: "SELECT 열 → FROM 표 → WHERE 조건 차례는 그대로예요. 조건 안에서 열을 값과 견주든 열과 견주든 같아요.",
      },
      {
        id: "3-A1-b1", type: "build", concept: "adv_col_compare",
        q: "재고 수가 값보다 작은 물건을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "stock", "<", "price"],
        extra: [">", "10"],
        tables: ["items"],
        hints: [
          "물건 표에서 행마다 재고 칸과 값 칸을 견줘요. 비교 기호 양쪽에 열이 하나씩 와요.",
          "WHERE 다음에 stock, 작다 기호 <, price를 놓아요.",
        ],
        explain: "산삼·인삼차·공방 방망이들처럼 19가지가 나왔어요! 기호 양쪽을 열로 채웠을 뿐, WHERE 모양은 3장 그대로예요.",
      },
      {
        type: "check", concept: "adv_col_compare",
        q: "열끼리 비교에 대해 맞는 말은?",
        options: [
          "행마다 두 열의 칸을 견주고, 빈칸인 행은 빠진다",
          "열은 값하고만 견줄 수 있다",
          "한 열의 모든 칸을 다른 열의 모든 칸과 견준다",
        ],
        answer: 0,
        explain: "비교는 언제나 한 행 안에서 해요. 열과 값, 열과 열, 셈한 값까지 견줄 수 있고, 빈칸이 끼면 그 행은 빠져요.",
      },
    ],
  },
  {
    id: "3-A2", chapter: 3, isAdvanced: true, title: "날짜·글자 견주기",
    goal: "< > 로 날짜와 글자 값의 앞뒤를 견줘 행을 고를 수 있다",
    summary: [
      "날짜 글자도 < > 로 앞뒤를 견줘요",
      "글자는 앞 글자부터 하나씩 견줘요",
      "이 장터에서는 한글이 가나다 차례",
    ],
    cards: [
      {
        say: "3장에서 날짜를 작은따옴표로 감쌌죠? 오늘은 한 걸음 더! 날짜도 < 와 > 로 앞뒤를 견줘요. 아래는 1월 3일보다 먼저 연 가게 3곳이에요. 이 장터의 날짜는 01·03처럼 두 자리로 맞춰 적어서 글자 차례가 곧 날짜 차례예요.",
        sql: "SELECT name, opened_on\nFROM shops\nWHERE opened_on < '2026-01-03'",
      },
      {
        say: "글자 값은 앞 글자부터 하나씩 견줘요. 이 장터에서는 한글을 가나다 차례로 견주지만, 데이터베이스나 설정에 따라 차례가 다를 수 있어요. 아래는 이름이 「다」보다 앞인 물건이에요.",
        sql: "SELECT name, price\nFROM items\nWHERE name < '다'",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_text_range",
        q: "WHERE opened_on < '2026-01-03' 은 어떤 가게를 고를까요?",
        options: ["1월 3일보다 먼저 연 가게", "1월 3일보다 나중에 연 가게", "1월 3일에 연 가게만"],
        answer: 0,
        explain: "< 는 「앞」이에요. 날짜로 치면 더 이른 날이죠. 1월 3일 당일은 = 가 없으니 빠져요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, opened_on\nFROM shops\nWHERE opened_on <= '2026-01-03'",
        options: ["5행", "3행", "8행"],
        answer: 0,
        explain: "<= 는 1월 3일 당일도 넣어요. 1월 1·2일의 3곳에 1월 3일에 연 약재 가게 두 곳을 더해 5행이에요.",
      },
      {
        type: "blank", concept: "adv_text_range",
        q: "1월 3일보다 나중에 연 가게만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, opened_on\nFROM shops\nWHERE opened_on ___ '2026-01-03'",
        chips: [">", ">=", "<"],
        answer: 0,
        explain: "나중은 > 예요. 구름 잡화점·바람 보따리·뚝딱 공방이 나와요. >= 는 1월 3일에 연 약재 가게 두 곳까지 넣어요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, first_visit\nFROM customers\nWHERE first_visit >= '2026-12-01'",
        options: ["4행", "7행", "60행"],
        answer: 0,
        explain: "12월 1일부터 처음 온 손님은 하연·은호·쿵쾅이·산돌이, 4명이에요. 7은 11월 1일부터 센 수예요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "글자 값 '10' 과 '9' 를 견주면 어느 쪽이 앞일까요?",
        options: ["'10'이 앞이다. 첫 글자 1이 9보다 앞이다", "'9'가 앞이다. 9가 10보다 작은 수다", "글자 값끼리는 견줄 수 없다"],
        answer: 0,
        explain: "글자 값은 수의 크기가 아니라 앞 글자부터 하나씩 견줘요. 1이 9보다 앞이니 '10'이 먼저예요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "이 장터에서 날짜 글자를 < 로 견줘도 날짜 차례가 되는 까닭은?",
        options: [
          "연-월-일이 늘 같은 자리 수라 글자 차례가 곧 날짜 차례여서",
          "작은따옴표로 감싸면 숫자로 바뀌어서",
          "< 는 날짜에만 쓰는 기호라서",
        ],
        answer: 0,
        explain: "1월은 01, 3일은 03처럼 두 자리로 맞춰 적어서, 앞 글자부터 견줘도 날짜 차례와 같아요. 1월을 01 대신 1로 적었다면 '10'과 '9'처럼 어긋나요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "이 장터에서 이 SQL의 결과에 나오는 물건은?",
        code: "SELECT name\nFROM items\nWHERE name < '다'",
        options: ["놋그릇", "도토리묵", "산삼"],
        answer: 0,
        explain: "「놋」은 ㄴ이라 「다」보다 앞이에요. 도토리묵은 첫 글자 「도」가 「다」보다 뒤라 빠지고, 산삼은 ㅅ이라 훨씬 뒤예요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "1월 3일보다 먼저 문을 연 가게를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, opened_on\nFROM shops\nWHERE opened_on < '2026-01-03'" },
          { sql: "SELECT name, opened_on\nFROM shops\nWHERE opened_on <= '2026-01-03'" },
          { sql: "SELECT name, opened_on\nFROM shops\nWHERE opened_on > '2026-01-03'" },
        ],
        answer: 0, tables: ["shops"],
        explain: "opened_on이 1월 1일·2일뿐인 3곳의 표가 정답이에요. 1월 3일이 섞이면 <=, 1월 4·5일뿐이면 > 예요.",
      },
      {
        type: "choice", concept: "adv_text_range",
        q: "한글 글자 값을 < > 로 견주는 것에 대해 맞는 말은?",
        options: [
          "이 장터에서는 가나다 차례지만, 데이터베이스·설정마다 다를 수 있다",
          "어느 데이터베이스에서나 언제나 똑같다",
          "한글은 < > 로 견줄 수 없다",
        ],
        answer: 0,
        explain: "글자를 어떤 차례로 견줄지는 데이터베이스와 그 설정이 정해요. 한글 이름을 견줄 때는 그 장터의 차례를 먼저 확인해요.",
      },
      {
        type: "blank", concept: "adv_text_range",
        q: "12월 1일부터 처음 온 손님만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, first_visit\nFROM customers\nWHERE first_visit >= ___",
        chips: ["'2026-12-01'", "'2026-11-01'", "2026-12-01"],
        answer: 0,
        explain: "날짜는 작은따옴표로 감싸요. '2026-11-01'은 11월 손님까지 7명, 따옴표 없는 2026-12-01은 빼기 셈 2013으로 읽혀, 이 장터에서는 손님 60명이 모두 나와요(오류를 내는 데이터베이스도 있어요).",
      },
      {
        type: "order", concept: "adv_text_range",
        q: "1월 3일보다 나중에 연 가게의 이름과 연 날을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, opened_on", "FROM shops", "WHERE opened_on > '2026-01-03'"],
        expect: "name | opened_on\n구름 잡화점 | 2026-01-04\n바람 보따리 | 2026-01-04\n뚝딱 공방 | 2026-01-05",
        explain: "SELECT 열 → FROM 표 → WHERE 조건이에요. 날짜 글자는 감싸고, 「나중」이니 > 를 썼어요.",
      },
      {
        id: "3-A2-b1", type: "build", concept: "adv_text_range",
        q: "12월 1일부터 장터에 처음 온 손님을 보여 줘",
        cards: ["SELECT", "*", "FROM", "customers", "WHERE", "first_visit", ">=", "'2026-12-01'"],
        extra: ["<=", "opened_on"],
        tables: ["customers"],
        hints: [
          "손님 표의 처음 온 날(first_visit) 열을 12월 1일과 견줘요. 그날도 넣어요.",
          "WHERE first_visit 다음에 >= 와 작은따옴표로 감싼 '2026-12-01'을 놓아요.",
        ],
        explain: "하연·은호·쿵쾅이·산돌이, 12월 손님 4명이 나왔어요! 날짜 글자도 숫자처럼 크다·작다로 견줄 수 있어요.",
      },
      {
        type: "check", concept: "adv_text_range",
        q: "글자·날짜 비교에 대해 맞는 말은?",
        options: [
          "글자는 앞 글자부터 견주고, 이 장터의 날짜는 그 차례가 곧 날짜 차례다",
          "글자 값은 < > 로 견줄 수 없다",
          "글자 값 '10'은 '9'보다 언제나 뒤에 온다",
        ],
        answer: 0,
        explain: "글자는 앞 글자부터 견줘요. 날짜를 두 자리씩 맞춰 적으면 날짜 차례와 같아요. 시작과 끝을 함께 거는 법은 4장에서 배워요.",
      },
    ],
  },
  {
    id: "3-A3", chapter: 3, isAdvanced: true, title: "재고 점검표",
    goal: "조건과 계산 열로 모자란 재고를 셈한 점검표를 만들 수 있다",
    summary: [
      "재고 10개 미만인 물건만 골라요",
      "10 - stock = 10개까지 모자란 수",
      "빈칸 재고는 점검표에서 빠져요",
    ],
    cards: [
      {
        say: "3장에서 재고가 10개 미만인 물건을 골랐죠? 오늘은 의뢰예요! 구름 잡화점 최보부 님이 「재고가 10개 밑인 물건과, 10개를 채우려면 몇 개 모자란지 적어 주게」래요. 아래 shortage 열이 모자란 수예요.",
        sql: "SELECT name, stock,\n  10 - stock AS shortage\nFROM items\nWHERE stock < 10",
      },
      {
        say: "빼기는 앞뒤를 바꾸면 값이 달라져요. 10에서 재고를 빼야 모자란 수! 거꾸로 빼면 아래 reversed 열처럼 음수가 돼요. 재고 칸이 빈 메밀전, 한지, 장승은 10개 밑인지 알 수 없어 빠져요. 빈칸은 6장에서!",
        sql: "SELECT name, stock,\n  10 - stock AS shortage,\n  stock - 10 AS reversed\nFROM items\nWHERE stock < 10",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_apply_3",
        q: "인절미(재고 9개) 행의 shortage는 얼마일까요?",
        code: "SELECT name, stock,\n  10 - stock AS shortage\nFROM items\nWHERE stock < 10",
        options: ["1", "9", "-1"],
        answer: 0,
        explain: "10 - 9 = 1, 한 개만 더 들여오면 10개예요. 9는 재고 그대로, -1은 거꾸로 뺀 값이에요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name\nFROM items\nWHERE stock < 10",
        options: ["7행", "8행", "40행"],
        answer: 0,
        explain: "재고가 10개 밑인 물건은 7가지예요. 8은 딱 10개인 도라지까지 넣은 수예요.",
      },
      {
        type: "blank", concept: "adv_apply_3",
        q: "10에서 재고를 빼 모자란 수가 나오게 빈자리를 채워 보세요.",
        code: "SELECT name,\n  10 ___ stock AS shortage\nFROM items\nWHERE stock < 10",
        chips: ["-", "+", "*"],
        answer: 0,
        explain: "모자란 수는 10에서 재고를 뺀 값이에요. + 는 10을 더하고, * 는 열 배를 해요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "산삼(재고 2개) 행의 stock - 10 은 얼마일까요?",
        code: "SELECT name,\n  stock - 10 AS reversed\nFROM items\nWHERE stock < 10",
        options: ["-8", "8", "12"],
        answer: 0,
        explain: "2 - 10 = -8이에요. 빼기는 앞뒤를 바꾸면 부호가 뒤집혀요. 모자란 수 8을 보려면 10 - stock 으로 써요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "짚신은 재고가 0개예요. 점검표의 shortage는 얼마일까요?",
        code: "SELECT name, stock,\n  10 - stock AS shortage\nFROM items\nWHERE stock < 10",
        options: ["10", "0", "-10"],
        answer: 0,
        explain: "10 - 0 = 10, 열 개를 다 들여와야 해요. 재고 0은 빈칸이 아니라 「하나도 없음」이라 점검표에 나와요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "재고 칸이 빈 메밀전은 점검표에 나올까요?",
        options: [
          "나오지 않는다. 10개 밑인지 알 수 없다",
          "나온다. shortage가 10이다",
          "나온다. shortage가 0이다",
        ],
        answer: 0,
        explain: "빈칸은 0이 아니라 모르는 값이라 10보다 작은지 알 수 없어 빠져요. 최보부 님께 「재고를 모르는 물건 3가지는 따로 세어 봐야 해요」라고 알려 드려요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "재고가 딱 10개인 도라지는 WHERE stock < 10 점검표에 나올까요?",
        options: [
          "나오지 않는다. < 는 10을 빼니까",
          "나온다. 10개면 모자라니까",
          "나온다. shortage가 10이니까",
        ],
        answer: 0,
        explain: "< 10 은 10 미만이라 도라지는 빠져요. <= 10 으로 쓰면 들어오지만 shortage가 0이라 채울 것이 없어요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "재고가 10개 밑인 물건과 모자란 수를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name,\n  10 - stock AS shortage\nFROM items\nWHERE stock < 10" },
          { sql: "SELECT name,\n  stock - 10 AS shortage\nFROM items\nWHERE stock < 10" },
          { sql: "SELECT name,\n  10 - stock AS shortage\nFROM items\nWHERE stock <= 10" },
        ],
        answer: 0, tables: ["items"],
        explain: "7행이고 shortage가 모두 1 이상인 표가 정답이에요. 음수가 보이면 거꾸로 뺀 것, 도라지가 0으로 끼면 <= 예요.",
      },
      {
        type: "choice", concept: "adv_apply_3",
        q: "이 점검표에서 모자란 물건이 가장 많은 가게의 번호는?",
        code: "SELECT shop_id, name, stock\nFROM items\nWHERE stock < 10",
        options: ["3번 산삼 약방", "8번 뚝딱 공방", "2번 여우골 떡방"],
        answer: 0,
        explain: "shop_id 칸을 세어 봐요. 3번은 산삼·인삼차·오미자청 3가지, 8번은 2가지, 2번과 5번은 1가지씩이에요.",
      },
      {
        type: "order", concept: "adv_apply_3",
        q: "최보부 님의 재고 점검표 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, stock,", "10 - stock AS shortage", "FROM items", "WHERE stock < 10"],
        explain: "보여 줄 열 → 모자란 수 식과 별칭 → FROM 표 → WHERE 조건 차례예요. 계산 열과 조건을 한 SQL에 함께 썼어요.",
      },
      {
        id: "3-A3-b1", type: "build", concept: "adv_apply_3",
        q: "최보부 님 의뢰: 재고 10개 밑인 물건 이름과 모자란 수를 보여 줘. 그 열은 shortage로 붙여",
        cards: ["SELECT", "name", ",", "10 - stock", "AS shortage", "FROM", "items", "WHERE", "stock < 10"],
        extra: ["stock - 10", "stock <= 10"],
        tables: ["items"],
        hints: [
          "10개까지 모자란 수는 10에서 재고를 빼요. 재고가 10개 미만인 행만 남겨요.",
          "SELECT name, 다음에 10 - stock 과 AS shortage, 끝에 WHERE stock < 10 을 놓아요.",
        ],
        explain: "의뢰 해결! 짚신 10개, 산삼·놋그릇 8개씩 … 7가지 점검표가 나왔어요. 재고를 모르는 3가지는 6장에서 따로 찾아요.",
      },
      {
        type: "check", concept: "adv_apply_3",
        q: "재고 점검표를 만들며 알게 된 것으로 맞는 말은?",
        options: [
          "10 - stock 과 stock - 10 은 값이 다르고, 빈칸 재고는 빠진다",
          "빼기는 앞뒤를 바꿔도 값이 같다",
          "재고 칸이 빈 물건은 shortage가 10으로 나온다",
        ],
        answer: 0,
        explain: "빼기는 앞뒤가 중요해요. 조건으로 고르고 계산 열로 셈하면 점검표 한 장이 SQL 하나로 나와요.",
      },
    ],
  },
];
