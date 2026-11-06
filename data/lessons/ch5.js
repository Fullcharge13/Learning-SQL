// 5장 「줄 세우기」 (설계 §6: ORDER BY, LIMIT, DISTINCT / 장터 예: 가장 비싼 물건 5개).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 5
// 5장 낱말은 4장까지에 ORDER·BY·ASC·DESC·LIMIT·OFFSET(판정 R23, 「N번째로 비싼 것」)·DISTINCT를 더한 것이다.
// 행의 차례를 처음 가르치는 장이다. 5-1 카드 1에서 「ORDER BY가 없으면 차례가 정해지지 않는다」를 제대로 말한다.
// - 동점(data/market.sql): 물건 값이 같은 짝이 6쌍이다. 6엽전 인절미(6)·한지(24), 8엽전 도토리묵(3)·꿀떡(10),
//   9엽전 메밀전(5)·약과(8), 12엽전 국밥(1)·감초(14), 25엽전 수육(2)·오미자청(15), 28엽전 구기자(19)·복주머니(28).
//   (괄호는 item_id) 그래서 DISTINCT price는 40 − 6 = 34행이다. 5-2가 이 동점으로 둘째 기준(item_id)을 가르친다.
// - 장터 예 「가장 비싼 물건 5개」: 금방망이 400, 장승 350, 도깨비방망이 320, 은방망이 280, 쇠솥 260.
//   여섯째 놋그릇은 190이라 다섯째와 동점이 아니고, 위 12가지(110엽전 이상) 값은 모두 다르다. 그래서 정답
//   SELECT * FROM items ORDER BY price DESC LIMIT 5 는 둘째 기준 없이도 하나로 정해진다(점검기 stable-order 통과).
//   둘째 기준을 더하면 카드가 12장(정답 11 + 헷갈림 1)이 넘쳐 더미 12장 한도(R34)를 지킬 수 없기도 하다.
//   반대로 가장 싼 쪽은 식혜 5 다음에 6엽전이 둘이라 LIMIT 2에서 동점이 경계에 걸린다(5-3·5-5에서 씀).
// - 조립 카드 수: 정답 10장까지(헷갈림 2장 이상). ORDER와 BY는 낱말 하나씩이라 카드도 두 장이다.
//   5-2 「비싼 것부터, 같으면 번호」 = 10장, 5-3·5-5 장터 예 = 10장, 5-1 = 7장, 5-4 = 8장, 5-5 b2 = 8장.
// - 헷갈림 카드: ASC는 기본값이라 마지막 기준 뒤에 끼우면 결과가 같아진다. 그래서 둘째 기준이 있는 조립에는 쓰지 않는다.
//   shop_id는 동점 짝마다 item_id와 같은 차례라 둘째 기준의 헷갈림 카드가 되지 못한다(name은 꿀떡·도토리묵에서 갈림).
// - 빈칸이 있는 열(stock·age)로는 줄 세우지 않는다. SQLite는 오름차순에서 빈칸을 맨 앞에 두는데, 빈칸은 6장에서 배운다.
// - 글자 열은 가나다 차례로 선다(한글 글자 번호 차례 = 가나다). 가게 이름: 구름 잡화점 … 여우골 떡방.
export const CHAPTER = { id: 5, title: "줄 세우기" };

export const LESSONS = [
  {
    id: "5-1", chapter: 5, title: "ORDER BY로 줄 세우기",
    goal: "ORDER BY로 행 차례를 정하고, DESC로 큰 값부터 세울 수 있다",
    summary: [
      "ORDER BY가 없으면 행 차례는 정해지지 않아요",
      "ORDER BY 열 = 작은 값부터(ASC)",
      "DESC를 붙이면 큰 값부터",
    ],
    cards: [
      {
        say: "사실 지금까지 결과 표의 행 차례는 정해진 게 아니었어요. 데이터베이스는 그때그때 편한 차례로 행을 내놓거든요. 차례를 정하려면 맨 끝에 ORDER BY와 열 이름을 써요. 아래는 100엽전 넘는 물건을 싼 것부터 세웠어요.",
        sql: "SELECT name, price\nFROM items\nWHERE price > 100\nORDER BY price",
      },
      {
        say: "큰 값부터 세우려면 열 이름 뒤에 DESC를 붙여요. 아무것도 안 붙이면 작은 값부터인 ASC예요. 글자 열은 가나다 차례로 서요. 아래는 같은 물건을 비싼 것부터 세웠어요. 금방망이가 맨 위로 올라왔죠!",
        sql: "SELECT name, price\nFROM items\nWHERE price > 100\nORDER BY price DESC",
      },
    ],
    items: [
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY가 없는 SQL의 결과에서 행의 차례는 어떨까요?",
        options: [
          "정해져 있지 않다. 데이터베이스가 편한 차례로 내놓는다",
          "언제나 첫 열의 작은 값부터다",
          "언제나 장부에 적은 차례 그대로다",
        ],
        answer: 0,
        explain: "ORDER BY가 없으면 차례를 약속하지 않아요. 지금은 번호 차례로 보여도 데이터가 바뀌면 달라질 수 있어요. 차례가 필요하면 꼭 ORDER BY!",
      },
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY price 는 물건을 어떤 차례로 세울까요?",
        options: ["값이 싼 것부터", "값이 비싼 것부터", "이름 가나다 차례"],
        answer: 0,
        explain: "아무것도 안 붙이면 작은 값부터예요. 비싼 것부터는 ORDER BY price DESC, 이름 차례는 ORDER BY name이에요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY price 와 결과가 같은 것은?",
        options: ["ORDER BY price ASC", "ORDER BY price DESC", "ORDER BY DESC price"],
        answer: 0,
        explain: "ASC는 작은 값부터, 아무것도 안 붙였을 때와 같아요. DESC는 차례를 뒤집고, 열 이름보다 앞에 쓰면 오류가 나요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "WHERE와 ORDER BY를 함께 쓸 때 ORDER BY는 어디에 올까요?",
        options: ["WHERE 뒤, 맨 끝", "SELECT 바로 뒤", "FROM 바로 앞"],
        answer: 0,
        explain: "어느 표에서(FROM) → 어떤 행만(WHERE) → 어떤 차례로(ORDER BY)예요. 행을 다 고른 다음에 줄을 세워요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "이 SQL의 결과에서 맨 위에 오는 물건은?",
        code: "SELECT name, price\nFROM items\nWHERE price > 100\nORDER BY price",
        options: ["갓", "금방망이", "산삼"],
        answer: 0,
        explain: "싼 것부터라 110엽전 갓이 맨 위, 400엽전 금방망이는 맨 아래예요. 산삼(120)은 갓 바로 다음이에요.",
      },
      {
        type: "blank", concept: "orderby",
        q: "100엽전 넘는 물건이 비싼 것부터 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nWHERE price > 100\nORDER BY price ___",
        chips: ["DESC", "ASC", "LIMIT"],
        answer: 0,
        explain: "큰 값부터는 DESC예요. ASC는 싼 것부터라 갓이 맨 위에 오고, LIMIT은 이 자리에서 오류가 나요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT name, price\nFROM items\nWHERE price > 100\nORDER BY price DESC",
        options: ["12행", "40행", "1행"],
        answer: 0,
        explain: "ORDER BY는 차례만 바꿔요. 행을 고르는 건 WHERE라서 100엽전 넘는 12가지가 그대로 나와요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "가게 이름(name)으로 ORDER BY 하면 어떤 차례로 설까요?",
        options: ["가나다 차례", "가게 번호 차례", "이름 글자 수가 적은 차례"],
        answer: 0,
        explain: "글자 열은 가나다 차례로 서요. 가게 8곳이면 구름 잡화점이 맨 위, 여우골 떡방이 맨 아래예요.",
      },
      {
        type: "blank", concept: "orderby",
        q: "가게가 이름 가나다 차례로 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, owner\nFROM shops\n___ BY name",
        chips: ["ORDER", "WHERE", "SELECT"],
        answer: 0,
        explain: "줄 세우기는 ORDER와 BY가 한 짝이에요. WHERE나 SELECT를 BY 앞에 두면 오류가 나요.",
      },
      {
        type: "order", concept: "orderby",
        q: "뚝딱 공방(8번 가게) 물건을 비싼 것부터 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "WHERE shop_id = 8", "ORDER BY price DESC"],
        expect: "name | price\n장승 | 350\n쇠솥 | 260\n놋그릇 | 190\n다듬이방망이 | 170\n빨래방망이 | 130",
        explain: "WHERE로 8번 가게 물건을 고른 다음, 맨 끝 ORDER BY로 줄을 세워요. 장승(350)이 맨 위예요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "가게를 이름 가나다 차례로 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, category\nFROM shops\nORDER BY name" },
          { sql: "SELECT name, category\nFROM shops\nORDER BY name DESC" },
          { sql: "SELECT name, category\nFROM shops\nORDER BY shop_id" },
        ],
        answer: 0, tables: ["shops"],
        explain: "구름 잡화점·달빛 약초방·도깨비 국밥집… 차례인 표가 정답이에요. DESC면 여우골 떡방이 맨 위, shop_id 차례면 도깨비 국밥집이 맨 위예요.",
      },
      {
        id: "5-1-b1", type: "build", concept: "orderby",
        q: "가게 목록을 이름 가나다 차례로 보여 줘",
        cards: ["SELECT", "*", "FROM", "shops", "ORDER", "BY", "name"],
        extra: ["DESC", "owner"],
        tables: ["shops"],
        hints: [
          "가게 표를 통째로 펼치고, 맨 끝에서 이름 열로 줄을 세워요. 가나다 차례는 작은 값부터예요.",
          "FROM shops 다음에 ORDER, BY, name을 놓아요.",
        ],
        explain: "구름 잡화점부터 여우골 떡방까지 가나다 차례로 섰어요! 글자 열도 ORDER BY로 줄 세울 수 있어요.",
      },
      {
        type: "check", concept: "orderby",
        q: "ORDER BY에 대해 맞는 말은?",
        options: [
          "ORDER BY는 차례만 바꾸고, DESC를 붙이면 큰 값부터다",
          "ORDER BY를 쓰면 행 수가 줄어든다",
          "ORDER BY가 없어도 행은 언제나 번호 차례로 나온다",
        ],
        answer: 0,
        explain: "ORDER BY는 행을 빼지 않고 줄만 세워요. 차례가 필요하면 꼭 ORDER BY를 쓰고, 큰 값부터는 DESC예요.",
      },
    ],
  },
  {
    id: "5-2", chapter: 5, title: "동점과 둘째 기준",
    goal: "기준 값이 같은 행(동점)의 차례를 둘째 기준으로 정할 수 있다",
    summary: [
      "기준 값이 같은 행 = 동점",
      "동점끼리는 차례가 정해지지 않아요",
      "쉼표 뒤 둘째 기준(item_id)으로 정해요",
    ],
    cards: [
      {
        say: "국밥과 감초는 둘 다 12엽전이에요. 이렇게 줄 세우는 기준 값이 같은 행을 동점이라고 해요. 값으로만 세우면 동점끼리는 누가 먼저일지 정해지지 않아서 돌릴 때마다 바뀔 수도 있어요. 아래 표에서 값이 같은 짝을 찾아봐요.",
        sql: "SELECT item_id, name, price\nFROM items\nWHERE price < 13\nORDER BY price",
      },
      {
        say: "쉼표 뒤에 둘째 기준을 쓰면 동점끼리 그 열로 한 번 더 세워요. 물건 번호 item_id는 물건마다 달라 동점이 남지 않아요. DESC는 바로 앞 열에만 붙어서, 아래는 비싼 것부터 세우고 같은 값은 작은 번호부터예요.",
        sql: "SELECT item_id, name, price\nFROM items\nWHERE price < 13\nORDER BY price DESC, item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "orderby",
        q: "줄 세우기에서 「동점」은 무엇일까요?",
        options: ["줄 세우는 기준 값이 같은 행들", "값이 0인 행", "결과에 두 번 나온 열"],
        answer: 0,
        explain: "ORDER BY price에서는 값이 같은 행끼리 동점이에요. 국밥·감초(12엽전), 수육·오미자청(25엽전)처럼요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "이 SQL에서 8엽전인 도토리묵과 꿀떡 중 먼저 나오는 것은?",
        code: "SELECT item_id, name, price\nFROM items\nWHERE price < 13\nORDER BY price",
        options: ["정해지지 않는다", "도토리묵", "꿀떡"],
        answer: 0,
        explain: "둘은 값이 같은 동점이에요. 값으로만 세우면 동점끼리의 차례는 약속되지 않아요. 카드에서는 도토리묵이 먼저였지만, 그건 이번에 그렇게 나온 것뿐이에요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY price, item_id 에서 item_id는 언제 쓰일까요?",
        options: ["값이 같은 행끼리 차례를 정할 때", "모든 행을 번호 차례로 다시 세울 때", "값이 다른 행끼리 차례를 정할 때"],
        answer: 0,
        explain: "먼저 price로 세우고, price가 같은 동점끼리만 item_id로 한 번 더 세워요. 값이 다르면 item_id는 볼 일이 없어요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "이 SQL에서 8엽전인 도토리묵과 꿀떡 중 먼저 나오는 것은?",
        code: "SELECT item_id, name, price\nFROM items\nWHERE price < 13\nORDER BY price, item_id",
        options: ["도토리묵(3번)", "꿀떡(10번)", "정해지지 않는다"],
        answer: 0,
        explain: "둘 다 8엽전이라 둘째 기준 item_id를 봐요. 3번 도토리묵이 10번 꿀떡보다 늘 먼저예요.",
      },
      {
        type: "blank", concept: "orderby",
        q: "값이 싼 것부터, 값이 같으면 번호 차례로 나오게 빈자리를 채워 보세요.",
        code: "SELECT item_id, name, price\nFROM items\nORDER BY price ___ item_id",
        chips: [",", "DESC", "BY"],
        answer: 0,
        explain: "기준과 기준 사이는 쉼표로 이어요. DESC나 BY를 넣으면 쉼표가 없어 둘째 기준으로 이어지지 않아 오류가 나요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "둘째 기준으로 쓰기 좋은 열은?",
        options: ["item_id처럼 행마다 값이 다른 열", "shop_id처럼 같은 값이 많은 열", "아무 열이나 같다"],
        answer: 0,
        explain: "가게 번호로 세우면 같은 가게의 같은 값 물건끼리 또 동점이 남을 수 있어요. 행마다 다른 열이면 동점이 하나도 안 남아요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY price DESC, item_id 는 어떤 차례일까요?",
        options: [
          "값은 비싼 것부터, 같은 값끼리는 번호가 작은 것부터",
          "값도 번호도 큰 것부터",
          "번호가 작은 것부터, 같은 번호끼리는 비싼 것부터",
        ],
        answer: 0,
        explain: "DESC는 바로 앞 기준 price에만 붙어요. item_id 뒤에는 아무것도 없으니 작은 번호부터(ASC)예요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "이 SQL에서 12엽전인 국밥(1번)과 감초(14번) 중 먼저 나오는 것은?",
        code: "SELECT item_id, name, price\nFROM items\nWHERE price < 13\nORDER BY price DESC, item_id DESC",
        options: ["감초", "국밥", "정해지지 않는다"],
        answer: 0,
        explain: "이번엔 item_id에도 DESC가 붙어 같은 값끼리 큰 번호부터예요. 14번 감초가 1번 국밥보다 먼저 와요.",
      },
      {
        type: "order", concept: "orderby",
        q: "1·2번 가게 물건을 싼 것부터, 같은 값이면 번호 차례로 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT item_id, name, price", "FROM items", "WHERE shop_id <= 2", "ORDER BY price, item_id"],
        explain: "WHERE로 먹거리 가게 물건 10가지를 고르고, 값 다음 번호로 세워요. 8엽전 도토리묵(3번)이 꿀떡(10번)보다 먼저예요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "가게를 종류 가나다 차례로, 같은 종류끼리는 이름 가나다 차례로 보여 준 결과는?",
        options: [
          { sql: "SELECT category, name\nFROM shops\nORDER BY category, name" },
          { sql: "SELECT category, name\nFROM shops\nORDER BY category, name DESC" },
          { sql: "SELECT category, name\nFROM shops\nORDER BY name" },
        ],
        answer: 0, tables: ["shops"],
        explain: "공방 뚝딱 공방 → 공방 방망이 대장간 → 먹거리 도깨비 국밥집… 인 표가 정답이에요. name DESC면 같은 종류 안에서 차례가 뒤집혀요.",
      },
      {
        id: "5-2-b1", type: "build", concept: "orderby",
        q: "물건을 비싼 것부터, 값이 같으면 번호 차례로 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "ORDER", "BY", "price", "DESC", ",", "item_id"],
        extra: ["name", "LIMIT"],
        tables: ["items"],
        hints: [
          "값으로 먼저 줄 세우고, 값이 같은 행은 물건마다 다른 번호로 한 번 더 세워요.",
          "ORDER BY price DESC 다음에 쉼표와 item_id를 놓아요.",
        ],
        explain: "물건 40가지가 비싼 것부터 섰어요. 28엽전 구기자(19번)·복주머니(28번) 같은 동점도 번호로 차례가 딱 정해졌어요!",
      },
      {
        type: "check", concept: "orderby",
        q: "동점과 둘째 기준에 대해 맞는 말은?",
        options: [
          "동점끼리의 차례는 둘째 기준을 써야 하나로 정해진다",
          "값이 같은 행은 결과에서 하나만 남는다",
          "DESC는 ORDER BY 뒤의 모든 열에 붙는다",
        ],
        answer: 0,
        explain: "동점은 행이 사라지는 게 아니라 차례가 안 정해진 거예요. 행마다 다른 열을 둘째 기준으로 쓰면 늘 같은 차례가 돼요.",
      },
    ],
  },
  {
    id: "5-3", chapter: 5, title: "LIMIT으로 위에서 몇 개",
    goal: "LIMIT으로 위에서 몇 행만, OFFSET으로 건너뛰고 고를 수 있다",
    summary: [
      "LIMIT 5 = 위에서 5행만",
      "가장 ~한 N개 = ORDER BY 다음 LIMIT",
      "OFFSET 2 = 위에서 2행 건너뛰기",
    ],
    cards: [
      {
        say: "가장 비싼 물건 5개를 찾아요! ORDER BY price DESC로 비싼 것부터 세우고, 맨 끝 LIMIT 5로 위에서 5행만 남겨요. ORDER BY 없이 LIMIT만 쓰면 아무 5행이나 나와서 「가장 비싼」이 안 돼요.",
        sql: "SELECT name, price\nFROM items\nORDER BY price DESC\nLIMIT 5",
      },
      {
        say: "「세 번째로 비싼 물건」은 OFFSET을 써요. OFFSET 2는 위에서 2행을 건너뛰라는 뜻이에요. 아래처럼 LIMIT 1 OFFSET 2면 금방망이·장승을 건너뛰고 도깨비방망이 하나만 나와요.",
        sql: "SELECT name, price\nFROM items\nORDER BY price DESC\nLIMIT 1 OFFSET 2",
      },
    ],
    items: [
      {
        type: "choice", concept: "limit",
        q: "LIMIT 5는 무슨 일을 할까요?",
        options: ["결과에서 위에서부터 5행만 남긴다", "값이 5보다 작은 행만 남긴다", "다섯째 행 하나만 남긴다"],
        answer: 0,
        explain: "LIMIT 뒤의 수는 행 개수예요. 줄 세운 결과의 위에서 5행만 남아요. 값을 견주는 건 WHERE예요.",
      },
      {
        type: "choice", concept: "limit",
        q: "ORDER BY 없이 LIMIT 5만 쓰면 어떻게 될까요?",
        options: ["어느 5행이 나올지 정해지지 않는다", "언제나 가장 비싼 5행이 나온다", "오류가 난다"],
        answer: 0,
        explain: "차례가 없는 결과에서 5행을 자르면 아무 5행이에요. 「가장 ~한」을 고르려면 ORDER BY로 먼저 세워요.",
      },
      {
        type: "choice", concept: "limit",
        q: "이 SQL의 결과에 나오지 않는 물건은?",
        code: "SELECT name, price\nFROM items\nORDER BY price DESC\nLIMIT 5",
        options: ["놋그릇(190엽전)", "쇠솥(260엽전)", "장승(350엽전)"],
        answer: 0,
        explain: "비싼 차례로 금방망이·장승·도깨비방망이·은방망이·쇠솥까지 5가지예요. 놋그릇은 여섯째라 잘려요.",
      },
      {
        type: "blank", concept: "limit",
        q: "가장 싼 물건 3개만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nORDER BY price, item_id\n___ 3",
        chips: ["LIMIT", "WHERE", "OFFSET"],
        answer: 0,
        explain: "위에서 몇 행만은 LIMIT이에요. 식혜(5)·인절미(6)·한지(6)가 나와요. WHERE와 OFFSET은 이 자리에 혼자 오면 오류가 나요.",
      },
      {
        type: "blank", concept: "limit",
        q: "가장 싼 물건 하나만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nORDER BY price ___\nLIMIT 1",
        chips: ["ASC", "DESC", "BY"],
        answer: 0,
        explain: "싼 것부터 세우는 ASC를 넣으면 5엽전 식혜가 나와요. DESC는 비싼 것부터라 금방망이가 나오고, BY는 오류가 나요.",
      },
      {
        type: "choice", concept: "limit",
        q: "LIMIT 1 OFFSET 2 는 무슨 뜻일까요?",
        options: ["위에서 2행을 건너뛰고 1행만", "위에서 2행만", "둘째 행부터 끝까지"],
        answer: 0,
        explain: "OFFSET은 건너뛸 행 수, LIMIT은 남길 행 수예요. 2행 건너뛰고 1행이니 셋째 행 하나예요.",
      },
      {
        type: "choice", concept: "limit",
        q: "이 SQL이 보여 주는 물건은?",
        code: "SELECT name\nFROM items\nORDER BY price DESC\nLIMIT 1 OFFSET 1",
        options: ["장승", "금방망이", "도깨비방망이"],
        answer: 0,
        explain: "비싼 차례로 금방망이(400) 하나를 건너뛰고 1행이니 두 번째로 비싼 장승(350)이에요.",
      },
      {
        type: "choice", concept: "limit",
        q: "ORDER BY price DESC 뒤에 무엇을 쓰면 다섯 번째로 비싼 물건 하나가 나올까요?",
        options: ["LIMIT 1 OFFSET 4", "LIMIT 1 OFFSET 5", "LIMIT 5"],
        answer: 0,
        explain: "앞 4행을 건너뛰어야 다섯째가 맨 위에 와요. 쇠솥(260)이에요. OFFSET 5는 여섯째 놋그릇, LIMIT 5는 5행 전부예요.",
      },
      {
        type: "choice", concept: "limit",
        q: "이 SQL로 가장 싼 물건 2개를 고르면 무엇이 걱정일까요?",
        code: "SELECT name, price\nFROM items\nORDER BY price\nLIMIT 2",
        options: [
          "6엽전 인절미와 한지가 동점이라 둘 중 어느 쪽이 나올지 정해지지 않는다",
          "5엽전 식혜가 나오지 않는다",
          "LIMIT 2 때문에 오류가 난다",
        ],
        answer: 0,
        explain: "식혜(5) 다음 6엽전이 둘이라 둘째 자리가 동점이에요. ORDER BY price, item_id로 둘째 기준을 더하면 item_id 6번 인절미로 정해져요.",
      },
      {
        type: "order", concept: "limit",
        q: "가장 비싼 물건 3개를 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "ORDER BY price DESC", "LIMIT 3"],
        expect: "name | price\n금방망이 | 400\n장승 | 350\n도깨비방망이 | 320",
        explain: "ORDER BY로 먼저 세우고 LIMIT으로 잘라요. LIMIT이 ORDER BY보다 앞에 오면 오류가 나요.",
      },
      {
        type: "choice", concept: "limit",
        q: "약재 가게(3·4번) 물건 중 가장 싼 물건 2개를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, price\nFROM items\nWHERE shop_id IN (3, 4)\nORDER BY price, item_id\nLIMIT 2" },
          { sql: "SELECT name, price\nFROM items\nWHERE shop_id IN (3, 4)\nORDER BY price DESC\nLIMIT 2" },
          { sql: "SELECT name, price\nFROM items\nWHERE shop_id IN (3, 4)\nORDER BY price, item_id\nLIMIT 3" },
        ],
        answer: 0, tables: ["items"],
        explain: "감초(12)·도라지(15), 2행인 표가 정답이에요. DESC면 산삼·약초 주머니가 나오고, LIMIT 3이면 쑥뜸까지 3행이에요.",
      },
      {
        id: "5-3-b1", type: "build", concept: "limit",
        q: "가장 비싼 물건 5개를 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "ORDER", "BY", "price", "DESC", "LIMIT", "5"],
        extra: ["ASC", "stock"],
        tables: ["items"],
        hints: [
          "물건을 비싼 것부터 줄 세운 다음, 위에서 다섯 행만 남겨요.",
          "ORDER BY price DESC 다음에 LIMIT과 5를 놓아요.",
        ],
        explain: "5장의 대표 문제, 가장 비싼 물건 5개 완성! 다섯째 쇠솥(260)과 여섯째 놋그릇(190)은 값이 달라서 동점 걱정도 없어요.",
      },
      {
        type: "check", concept: "limit",
        q: "LIMIT과 OFFSET에 대해 맞는 말은?",
        options: [
          "「가장 ~한 N개」는 ORDER BY로 세운 뒤 LIMIT N으로 고른다",
          "LIMIT만 쓰면 언제나 가장 큰 값부터 나온다",
          "OFFSET 2는 위에서 2행만 남긴다",
        ],
        answer: 0,
        explain: "LIMIT은 줄 세운 결과를 위에서 자를 뿐이에요. 그래서 ORDER BY가 먼저고, 건너뛸 행은 OFFSET으로 정해요.",
      },
    ],
  },
  {
    id: "5-4", chapter: 5, title: "DISTINCT로 겹침 없애기",
    goal: "DISTINCT로 똑같은 행을 하나만 남길 수 있다",
    summary: [
      "SELECT DISTINCT 열 = 겹침 없이 한 번씩",
      "DISTINCT는 행 전체가 같아야 합쳐요",
      "차례가 필요하면 ORDER BY도 함께",
    ],
    cards: [
      {
        say: "손님 60명이 사는 마을을 보면 같은 마을이 여러 번 나와요. SELECT 바로 뒤에 DISTINCT를 붙이면 똑같은 행을 하나만 남겨요. 아래는 마을 8곳이 한 번씩, ORDER BY 덕분에 가나다 차례로 나왔어요.",
        sql: "SELECT DISTINCT village\nFROM customers\nORDER BY village",
      },
      {
        say: "DISTINCT는 열 하나가 아니라 행 전체를 봐요. 아래처럼 kind(종류)와 village를 함께 고르면 두 칸이 모두 같은 행만 합쳐요. 종류 3가지와 마을 8곳의 짝이 모두 있어서 24행이 나와요.",
        sql: "SELECT DISTINCT kind, village\nFROM customers\nORDER BY kind, village",
      },
    ],
    items: [
      {
        type: "choice", concept: "distinct",
        q: "DISTINCT는 무슨 일을 할까요?",
        options: ["결과에서 똑같은 행을 하나만 남긴다", "행을 가나다 차례로 세운다", "빈칸인 행을 뺀다"],
        answer: 0,
        explain: "DISTINCT는 겹침 없애기예요. 차례는 정하지 않으니 차례가 필요하면 ORDER BY를 함께 써요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT DISTINCT kind\nFROM customers",
        options: ["3행", "60행", "24행"],
        answer: 0,
        explain: "손님 60명의 종류는 도깨비·사람·여우 세 가지예요. 겹침을 없애면 3행이에요.",
      },
      {
        type: "blank", concept: "distinct",
        q: "가게 종류가 겹치지 않게 한 번씩만 나오게 빈자리를 채워 보세요.",
        code: "SELECT ___ category\nFROM shops",
        chips: ["DISTINCT", "ORDER", "LIMIT"],
        answer: 0,
        explain: "SELECT 바로 뒤 DISTINCT예요. 가게 8곳의 종류 먹거리·약재·잡화·공방, 4행이 나와요. ORDER·LIMIT은 이 자리에서 오류예요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "오류 없이 도는 SQL은?",
        options: [
          "SELECT DISTINCT village\nFROM customers",
          "SELECT village DISTINCT\nFROM customers",
          "SELECT village\nFROM customers DISTINCT",
        ],
        answer: 0,
        explain: "DISTINCT는 SELECT 바로 뒤, 열 이름 앞에 와요. 다른 자리에 두면 오류가 나요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "SELECT DISTINCT kind, village 는 두 행이 언제 하나로 합쳐질까요?",
        options: ["kind와 village가 모두 같을 때", "kind만 같을 때", "village만 같을 때"],
        answer: 0,
        explain: "DISTINCT는 고른 열 전체, 곧 행 전체를 견줘요. 종류가 같아도 마을이 다르면 다른 행이에요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT DISTINCT price\nFROM items",
        options: ["34행", "40행", "6행"],
        answer: 0,
        explain: "값이 같은 짝이 6쌍 있어요(6·8·9·12·25·28엽전). 짝마다 하나씩 줄어 40 − 6 = 34행이에요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT DISTINCT name, price\nFROM items",
        options: ["40행", "34행", "6행"],
        answer: 0,
        explain: "물건 이름이 모두 달라서 name과 price가 함께 같은 행은 없어요. DISTINCT는 행 전체를 보니 40행 그대로예요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "주문 591건의 상태(status)를 겹치지 않게 보면 몇 행일까요?",
        code: "SELECT DISTINCT status\nFROM orders",
        options: ["2행", "591행", "49행"],
        answer: 0, tables: ["orders"],
        explain: "주문 상태는 완료와 취소 두 가지뿐이에요. 591건이 2행으로 줄어요. 49는 취소된 주문 수예요.",
      },
      {
        type: "order", concept: "distinct",
        q: "손님 종류를 겹치지 않게, 가나다 차례로 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT DISTINCT kind", "FROM customers", "ORDER BY kind"],
        expect: "kind\n도깨비\n사람\n여우",
        explain: "DISTINCT는 SELECT 줄에, ORDER BY는 맨 끝 줄에 와요. 세 가지 종류가 가나다 차례로 나와요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "물건을 파는 가게 번호(shop_id)를 겹치지 않게 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT DISTINCT shop_id\nFROM items\nORDER BY shop_id" },
          { sql: "SELECT shop_id\nFROM items\nORDER BY shop_id" },
          { sql: "SELECT DISTINCT shop_id, name\nFROM items\nORDER BY shop_id, name" },
        ],
        answer: 0, tables: ["items"],
        explain: "1부터 8까지 한 번씩, 8행인 표가 정답이에요. DISTINCT가 없으면 40행, name을 함께 고르면 행 전체가 달라 40행이에요.",
      },
      {
        id: "5-4-b1", type: "build", concept: "distinct",
        q: "손님들이 사는 마을을 겹치지 않게 가나다 차례로 보여 줘",
        cards: ["SELECT", "DISTINCT", "village", "FROM", "customers", "ORDER", "BY", "village"],
        extra: ["kind", "DESC"],
        tables: ["customers"],
        hints: [
          "마을 열만 고르되 같은 마을은 한 번만 남기고, 마지막에 마을 이름으로 줄 세워요.",
          "SELECT 바로 뒤에 DISTINCT를, 맨 끝에 ORDER, BY, village를 놓아요.",
        ],
        explain: "개울마을부터 큰바위마을까지 8곳이 한 번씩 나왔어요. 손님 60명의 마을이 깔끔하게 정리됐죠!",
      },
      {
        type: "check", concept: "distinct",
        q: "DISTINCT에 대해 맞는 말은?",
        options: [
          "DISTINCT는 행 전체가 똑같은 행을 하나만 남긴다",
          "DISTINCT는 바로 뒤 열 하나만 보고 겹침을 없앤다",
          "DISTINCT를 쓰면 결과가 가나다 차례로 선다",
        ],
        answer: 0,
        explain: "DISTINCT는 고른 열을 모두 견줘서 똑같은 행만 합쳐요. 차례는 정하지 않으니 ORDER BY와 함께 써요.",
      },
    ],
  },
  {
    id: "5-5", chapter: 5, title: "5장 평가", isExam: true,
    goal: "ORDER BY·LIMIT·DISTINCT로 행을 세우고 고를 수 있다",
    summary: [
      "ORDER BY 열 DESC, 동점엔 둘째 기준",
      "LIMIT N 위에서 N행, OFFSET 건너뛰기",
      "DISTINCT는 행 전체의 겹침을 없애요",
    ],
    cards: [
      {
        say: "5장 정리 시간이에요! ORDER BY로 줄을 세우고, 동점은 둘째 기준으로 정하고, LIMIT·OFFSET으로 위에서 몇 행만, DISTINCT로 겹침 없이 골랐어요. 아래가 5장의 대표 모양이에요. 같이 풀어 봐요!",
        sql: "SELECT name, price\nFROM items\nORDER BY price DESC\nLIMIT 5",
      },
    ],
    items: [
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY가 없는 SQL의 행 차례에 대해 맞는 말은?",
        options: [
          "정해져 있지 않아서, 차례가 필요하면 ORDER BY를 쓴다",
          "언제나 장부에 적힌 차례 그대로다",
          "언제나 첫 열의 작은 값부터다",
        ],
        answer: 0,
        explain: "데이터베이스는 차례를 약속하지 않아요. 오늘 번호 차례로 보여도 내일은 다를 수 있어요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "물건을 값이 비싼 것부터 세우는 것은?",
        options: ["ORDER BY price DESC", "ORDER BY price", "ORDER BY DESC price"],
        answer: 0,
        explain: "큰 값부터는 열 이름 뒤에 DESC예요. 아무것도 안 붙이면 싼 것부터, DESC가 열 앞에 오면 오류예요.",
      },
      {
        type: "blank", concept: "orderby",
        q: "손님이 이름 가나다 차례로 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, village\nFROM customers\nORDER ___ name",
        chips: ["BY", "DESC", "WHERE"],
        answer: 0,
        explain: "ORDER 다음에는 늘 BY가 짝으로 와요. DESC나 WHERE를 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "ORDER BY price로만 세우면 25엽전인 수육과 오미자청의 차례는?",
        options: ["정해지지 않는다", "수육이 늘 먼저", "오미자청이 늘 먼저"],
        answer: 0,
        explain: "둘은 동점이라 값만으로는 차례가 안 정해져요. 둘째 기준 item_id를 더하면 2번 수육이 늘 먼저예요.",
      },
      {
        type: "choice", concept: "orderby",
        q: "비싼 것부터, 값이 같으면 물건 번호가 작은 것부터 세우는 것은?",
        options: ["ORDER BY price DESC, item_id", "ORDER BY price, item_id DESC", "ORDER BY item_id, price DESC"],
        answer: 0,
        explain: "첫 기준 price에 DESC, 둘째 기준 item_id는 그대로(작은 번호부터)예요. 기준을 적는 차례도 중요해요.",
      },
      {
        type: "choice", concept: "limit",
        q: "이 SQL이 보여 주는 물건은?",
        code: "SELECT name\nFROM items\nORDER BY price DESC\nLIMIT 1 OFFSET 3",
        options: ["은방망이", "도깨비방망이", "쇠솥"],
        answer: 0,
        explain: "비싼 차례로 금방망이·장승·도깨비방망이 3행을 건너뛰고 1행, 네 번째로 비싼 은방망이(280)예요.",
      },
      {
        type: "blank", concept: "limit",
        q: "가장 비싼 물건 3개만 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nORDER BY price DESC\nLIMIT ___",
        chips: ["3", "5", "OFFSET"],
        answer: 0,
        explain: "LIMIT 뒤의 수가 남길 행 수예요. 5를 넣으면 5행, OFFSET을 넣으면 오류가 나요.",
      },
      {
        type: "choice", concept: "limit",
        q: "ORDER BY 없이 LIMIT 3만 쓴 SQL에 대해 맞는 말은?",
        options: ["어느 3행이 나올지 정해지지 않는다", "가장 비싼 3행이 나온다", "셋째 행 하나가 나온다"],
        answer: 0,
        explain: "LIMIT은 자르기만 해요. 차례가 없는 결과를 자르면 아무 3행이에요. 「가장 ~한」은 ORDER BY가 먼저예요.",
      },
      {
        type: "choice", concept: "limit",
        q: "ORDER BY price LIMIT 2로 고른 가장 싼 물건 2개가 늘 같게 하려면?",
        options: [
          "ORDER BY price, item_id로 둘째 기준을 더한다",
          "LIMIT 2를 LIMIT 3으로 바꾼다",
          "ORDER BY price DESC로 바꾼다",
        ],
        answer: 0,
        explain: "식혜(5) 다음 인절미·한지가 6엽전 동점이라 둘째 자리가 흔들려요. item_id를 더하면 item_id 6번 인절미로 정해져요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "이 SQL의 결과는 몇 행일까요?",
        code: "SELECT DISTINCT category\nFROM shops",
        options: ["4행", "8행", "2행"],
        answer: 0,
        explain: "가게 8곳의 종류는 먹거리·약재·잡화·공방 네 가지(각 2곳)예요. 겹침을 없애면 4행이에요.",
      },
      {
        type: "choice", concept: "distinct",
        q: "SELECT DISTINCT kind, village FROM customers 에 대해 맞는 말은?",
        options: [
          "종류와 마을이 모두 같은 행만 하나로 합친다",
          "종류만 겹치지 않게 3행이 나온다",
          "마을만 겹치지 않게 8행이 나온다",
        ],
        answer: 0,
        explain: "DISTINCT는 행 전체를 봐요. 종류와 마을의 짝 24가지가 한 번씩 나와요.",
      },
      {
        type: "choice", concept: "limit",
        q: "값이 가장 싼 물건 3개를 보여 준 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT 3" },
          { sql: "SELECT name, price\nFROM items\nORDER BY price DESC\nLIMIT 3" },
          { sql: "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT 5" },
        ],
        answer: 0,
        explain: "식혜(5)·인절미(6)·한지(6), 3행인 표가 정답이에요. DESC면 가장 비싼 3개, LIMIT 5면 5행이에요.",
      },
      {
        type: "order", concept: "distinct",
        q: "물건 값을 겹치지 않게, 싼 값부터 3가지 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT DISTINCT price", "FROM items", "ORDER BY price", "LIMIT 3"],
        expect: "price\n5\n6\n7",
        explain: "DISTINCT가 없으면 6엽전(인절미·한지)이 두 번 나와 5·6·6이에요. 겹침을 없애니 5·6·7이에요.",
      },
      {
        id: "5-5-b1", type: "build", concept: "limit",
        q: "가장 비싼 물건 5개를 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "ORDER", "BY", "price", "DESC", "LIMIT", "5"],
        extra: ["ASC", "name"],
        tables: ["items"],
        hints: [
          "비싼 것부터 세운 결과의 위쪽 다섯 행이 필요해요.",
          "ORDER BY price DESC로 세우고 LIMIT과 5를 놓아요.",
        ],
        explain: "5장의 대표 문제, 가장 비싼 물건 5개를 다시 찾았어요. 금방망이부터 쇠솥까지, 줄 세우고 자르기 완벽해요!",
      },
      {
        id: "5-5-b2", type: "build", concept: "orderby",
        q: "물건을 싼 것부터, 값이 같으면 이름 가나다 차례로 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "ORDER", "BY", "price", ",", "name"],
        extra: ["DESC", "item_id"],
        tables: ["items"],
        hints: [
          "값으로 먼저 세우고, 동점끼리는 이름으로 한 번 더 세워요. 물건 이름은 모두 달라요.",
          "ORDER BY price 다음에 쉼표와 name을 놓아요.",
        ],
        explain: "8엽전 꿀떡이 도토리묵보다 먼저 섰어요. 이름도 물건마다 달라서 둘째 기준으로 딱 좋아요!",
      },
      {
        type: "check", concept: "orderby",
        q: "5장에서 배운 것으로 맞는 말은?",
        options: [
          "「가장 ~한 N개」는 ORDER BY로 세우고 동점은 둘째 기준으로 정한 뒤 LIMIT N으로 고른다",
          "ORDER BY가 없어도 행은 늘 같은 차례로 나온다",
          "DISTINCT는 바로 뒤 열 하나만 보고 겹침을 없앤다",
        ],
        answer: 0,
        explain: "세우고, 동점을 정하고, 자르고, 겹침을 없애는 것이 5장이에요. 실무에서는 쇼핑몰 상품 목록의 「높은 가격순」 정렬과 「인기 상품 10개」가 ORDER BY와 LIMIT이에요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 5장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - 순서가 있는 정답은 모두 item_id까지 세운다(stable-order).
// - N·M: 위 12가지(110엽전 이상)는 값이 모두 달라 비싼 쪽 LIMIT 결과가 하나로 정해진다. 두 목록이 겹치지 않아 행 수가 늘 다르다.
// - K: OFFSET 1~9. LIMIT {K}는 K행이라 정답 1행과 늘 다르고(K = 1이면 금방망이 ↔ 정답은 둘째 장승), 싼 쪽은 값이 전혀 다르다.
// - P: 그 값 이하 물건을 비싼 것부터 세웠을 때 위 5행 안에 동점이 있는 값만(8·9·10·11·12·25·28·30·33·35).
//   그래야 item_id DESC 오답이 화면의 앞 5행에서 정답과 달라 보인다.
export const TEMPLATES = [
  {
    id: "5-T1", concept: "limit", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT {N}",
    wrong: [
      "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT {N}",
      "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT {M}",
    ],
    vars: { N: [2, 3, 4, 5, 6], M: [7, 8, 9, 10] },
    explain: "DESC로 비싼 것부터 세운 뒤 위에서 {N}행만 남겨요. DESC가 없으면 싼 것부터이고, LIMIT 뒤 수가 다르면 행 수가 달라요.",
  },
  {
    id: "5-T2", concept: "distinct", type: "blank",
    q: "손님 표의 {COL} 열이 겹치지 않게 한 번씩만 나오게 빈자리를 채워 보세요.",
    sql: "SELECT ___ {COL}\nFROM customers",
    chips: ["DISTINCT", "ORDER", "LIMIT"],
    answer: 0,
    vars: { COL: ["kind", "village"] },
    explain: "겹침을 없애는 낱말은 SELECT 바로 뒤의 DISTINCT예요. ORDER·LIMIT은 이 자리에 오면 오류가 나요.",
  },
  {
    id: "5-T3", concept: "limit", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT 1 OFFSET {K}",
    wrong: [
      "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT 1 OFFSET {K}",
      "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT {K}",
    ],
    vars: { K: { min: 1, max: 9 } },
    explain: "OFFSET은 위에서 건너뛸 행 수예요. 비싼 차례로 {K}행을 건너뛴 다음 물건 하나가 나와요. LIMIT {K}는 위에서 {K}행을 그대로 남겨요.",
  },
  {
    id: "5-T4", concept: "orderby", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT item_id, name, price\nFROM items\nWHERE price <= {P}\nORDER BY price DESC, item_id",
    wrong: [
      "SELECT item_id, name, price\nFROM items\nWHERE price <= {P}\nORDER BY price, item_id",
      "SELECT item_id, name, price\nFROM items\nWHERE price <= {P}\nORDER BY price DESC, item_id DESC",
    ],
    vars: { P: [8, 9, 10, 11, 12, 25, 28, 30, 33, 35] },
    explain: "값은 비싼 것부터, 같은 값끼리는 번호가 작은 것부터예요. item_id에도 DESC를 붙이면 같은 값끼리 차례가 뒤집혀요.",
  },
];

// ---- 5장 심화 (v0.2, 쓰기 안내 13절 · 디딤돌 docs/specs/2026-11-06-심화-1-6장-디딤돌.md §2 5장) ----
// - 쓸 수 있는 것: 1~5장 낱말뿐(ADVANCED_GRAMMAR[5]는 비어 있음). 앞 장 심화 낱말(--, 나머지 %)은 쓰지 않는다(R53).
//   조립은 R51 구절 카드, ORDER BY는 한 장, 둘째 기준 쉼표는 앞 카드에 붙인다(쓰기 안내 13-3).
// - 빈칸 재고가 있는 가게는 1·5·8번(메밀전·한지·장승). stock으로 셈해 세우는 문제는 빈칸이 없는 2·3·4·6·7번 가게만 쓴다
//   (빈칸 자리는 데이터베이스마다 달라서, 6장 전에는 피함).
// - 5-A1 계산한 값으로 줄 세우기(price * stock = 재고를 다 팔면 받을 엽전, 「재고 값어치」):
//   3번 쌍화탕 814 · 감초 276 · 산삼 240 · 오미자청 150 · 인삼차 120 (가장 비싼 산삼이 셋째).
//   6번 갓 6380 · 담뱃대 1881 · 복주머니 1288 · 노리개 720 · 보따리 256.
//   2번 작은 것부터 인절미 54 · 송편 91 · 꿀떡 136 · 식혜 240 · 약과 369 (가장 싼 식혜가 넷째).
//   4번 구기자 1568 · 약초 주머니 1190 · 익모초 480 · 쑥뜸 360 · 도라지 150 (4번은 stock DESC 차례와 같아 stock은 헷갈림으로 안 씀).
//   7번(조립) 은방망이 11200 · 도깨비방망이 8000 · 방망이 손잡이 7650 · 금방망이 6800 · 작은 방망이 3240.
//   ORDER BY에 식·SELECT 별칭(그것 하나만)을 쓰는 것은 주요 데이터베이스가 모두 받아 「이 장터에서는」을 붙이지 않는다.
//   price / 100의 동점(장승 350·도깨비방망이 320 → 3)은 정수 나누기라 「이 장터에서는」(2-4와 같음).
// - 5-A2 쪽 나누기: n쪽 = LIMIT k OFFSET (n−1)×k. 비싼 것부터 5행씩 2쪽 = 놋그릇 190 … 빨래방망이 130.
//   싼 것부터 5행씩이면 1쪽 다섯째 도토리묵(3번)·2쪽 첫째 꿀떡(10번)이 둘 다 8엽전 — 경계에 걸친 동점(겹침·빠짐 설명).
//   싼 것부터 2쪽 = 꿀떡 8 · 메밀전 9 · 약과 9 · 막걸리 10 · 부채 11. 비싼 것부터 4행씩 3쪽 = 방망이 손잡이 … 갓.
//   6행씩 7쪽(OFFSET 36) = 4행(송편·인절미·한지·식혜), 5행씩 9쪽(OFFSET 40) = 0행. 손님 10명씩 3쪽 = 21~30번.
// - 5-A3 의뢰: 뚝딱 공방(shops 8번) 주인 나무쇠(앞 심화 의뢰인 오영감·금순·최보부·달래 할멈과 겹치지 않음). 사연은 꾸민 이야기.
//   값 차례 5·6·7·8·9·10·11·12 …(DISTINCT price 34행). 행으로 세면 5·6·6·7(인절미·한지 6엽전이 두 번).
//   DISTINCT … LIMIT 1 OFFSET 3 → 8, DISTINCT 없이 → 7(송편). OFFSET 4 → 9, OFFSET 6 → 11(부채), OFFSET 2 → 7.
//   8엽전 물건 = 도토리묵(3번)·꿀떡(10번), 7엽전 = 송편, 6엽전 = 인절미·한지. 비싼 쪽 위 12가지는 값이 모두 달라 OFFSET 1 → 350.
//   5-3·5-5가 이미 묻는 「둘째로 싼 자리의 동점(인절미·한지)」 차례는 다시 묻지 않는다.
export const ADVANCED = [
  {
    id: "5-A1", chapter: 5, isAdvanced: true, title: "계산한 값으로 세우기",
    goal: "ORDER BY 뒤에 계산식·별칭을 써서 줄 세울 수 있다",
    summary: [
      "ORDER BY 뒤에 계산식도 와요",
      "SELECT의 별칭으로도 세워요",
      "계산한 값의 동점도 둘째 기준으로",
    ],
    cards: [
      {
        say: "5장에서 ORDER BY 뒤에 열 이름을 썼죠? 오늘은 한 걸음 더, 계산한 값으로 세워요. 값 × 재고는 재고를 다 팔면 받을 엽전, 「재고 값어치」예요. 식을 ORDER BY 뒤에 그대로 쓰면 돼요. 가장 비싼 산삼은 재고가 2개뿐이라 셋째예요.",
        sql: "SELECT name, price, stock\nFROM items\nWHERE shop_id = 3\nORDER BY price * stock DESC, item_id",
      },
      {
        say: "SELECT에서 식에 별칭을 붙였다면 ORDER BY에서 그 별칭으로 불러도 돼요. 아래는 바람 보따리 물건을 재고 값어치가 큰 것부터 세웠어요. 계산한 값도 같을 수 있으니 둘째 기준 item_id는 그대로 붙여요.",
        sql: "SELECT name,\n  price * stock AS stock_value\nFROM items\nWHERE shop_id = 6\nORDER BY stock_value DESC, item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_sort_expr",
        q: "ORDER BY 뒤에 쓸 수 있는 것을 모두 고른 것은?",
        options: ["열 이름, 계산식, SELECT에서 붙인 별칭", "열 이름만", "SELECT에 적은 열 이름만"],
        answer: 0,
        explain: "ORDER BY는 행마다 값을 하나 구해 그 값으로 세워요. 열 그대로든, price * stock 같은 식이든, 식에 붙인 별칭이든 돼요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "여우골 떡방 물건을 재고 값어치가 작은 것부터 세웠어요. 맨 위에 오는 물건은?",
        code: "SELECT name, price, stock\nFROM items\nWHERE shop_id = 2\nORDER BY price * stock, item_id",
        options: ["인절미", "식혜", "약과"],
        answer: 0,
        explain: "인절미는 6엽전 × 9개 = 54엽전으로 가장 작아요. 식혜는 가장 싸지만(5엽전) 재고가 48개라 240엽전, 넷째예요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "카드 1의 결과 표에는 price * stock 열이 없어요. 그래도 그 값으로 줄 세울 수 있을까요?",
        options: ["있다. 세우는 값은 결과 표에 없어도 된다", "없다. 결과 표에 있는 열로만 세운다", "없다. 오류가 난다"],
        answer: 0,
        explain: "WHERE의 열이 SELECT에 없어도 됐듯, ORDER BY의 식도 결과 표에 없어도 돼요. 값을 보고 싶을 때만 SELECT에 함께 적어요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "ORDER BY price * stock DESC 에서 DESC가 붙는 것은?",
        options: ["price * stock 계산한 값 전체", "바로 앞의 stock 하나", "맨 앞의 price 하나"],
        answer: 0,
        explain: "DESC는 바로 앞 기준에 붙고, 여기서는 식 price * stock 전체가 기준 하나예요. 그래서 곱한 값이 큰 것부터예요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "ORDER BY price * stock DESC 와 차례가 같은 것은?",
        options: ["ORDER BY stock * price DESC", "ORDER BY price DESC, stock DESC", "ORDER BY price * stock"],
        answer: 0,
        explain: "곱하기는 앞뒤를 바꿔도 값이 같아요. price DESC, stock DESC는 값으로 먼저 세우고 같은 값끼리만 재고를 봐서 달라요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "SELECT에서 price * stock AS stock_value 라고 썼어요. 큰 것부터 세우는 ORDER BY로 맞는 것은?",
        options: [
          "ORDER BY stock_value DESC와 ORDER BY price * stock DESC 둘 다",
          "ORDER BY stock_value DESC만",
          "ORDER BY price * stock DESC만",
        ],
        answer: 0,
        explain: "별칭은 그 식의 이름이라 ORDER BY에서 이름으로 불러도, 식을 다시 적어도 같은 값이에요. 이름으로 부르면 짧고 읽기 쉬워요.",
      },
      {
        type: "blank", concept: "adv_sort_expr",
        q: "산삼 약방 물건이 재고 값어치가 큰 것부터 나오게 빈자리를 채워 보세요.",
        code: "SELECT name,\n  price * stock AS stock_value\nFROM items\nWHERE shop_id = 3\nORDER BY ___ DESC, item_id",
        chips: ["stock_value", "price", "stock"],
        answer: 0,
        explain: "별칭 stock_value로 부르면 쌍화탕(814)이 맨 위예요. price면 산삼이 맨 위예요. stock이면 셋째부터 달라져 산삼이 맨 아래로 가요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "ORDER BY price / 100 DESC 로만 세우면 장승(350)과 도깨비방망이(320)의 차례는?",
        options: ["정해지지 않는다", "장승이 늘 먼저", "도깨비방망이가 늘 먼저"],
        answer: 0,
        explain: "이 장터에서는 정수끼리 나누면 소수점 아래를 버려 둘 다 3이에요. 계산한 값도 동점이 될 수 있으니 item_id 같은 둘째 기준을 붙여요.",
      },
      {
        type: "choice", concept: "adv_sort_expr",
        q: "달빛 약초방(4번) 물건을 재고 값어치가 큰 것부터 보여 준 결과는?",
        options: [
          { sql: "SELECT name, price, stock\nFROM items\nWHERE shop_id = 4\nORDER BY price * stock DESC, item_id" },
          { sql: "SELECT name, price, stock\nFROM items\nWHERE shop_id = 4\nORDER BY price DESC, item_id" },
          { sql: "SELECT name, price, stock\nFROM items\nWHERE shop_id = 4\nORDER BY price * stock, item_id" },
        ],
        answer: 0, tables: ["items"],
        explain: "구기자(28엽전 × 56개 = 1568)가 맨 위인 표가 정답이에요. 값으로만 세우면 약초 주머니가, 작은 것부터면 도라지가 맨 위예요.",
      },
      {
        type: "order", concept: "adv_sort_expr",
        q: "여우골 떡방 물건을 재고 값어치가 큰 것부터 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price, stock", "FROM items", "WHERE shop_id = 2", "ORDER BY price * stock DESC,", "item_id"],
        expect: "name | price | stock\n약과 | 9 | 41\n식혜 | 5 | 48\n꿀떡 | 8 | 17\n송편 | 7 | 13\n인절미 | 6 | 9",
        explain: "식이 들어가도 ORDER BY 자리는 늘 맨 끝이에요. 약과(9 × 41 = 369)가 맨 위, 인절미(54)가 맨 아래예요.",
      },
      {
        id: "5-A1-b1", type: "build", concept: "adv_sort_expr",
        q: "방망이 대장간(7번) 물건을 재고 값어치가 큰 것부터 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "WHERE", "shop_id = 7", "ORDER BY", "price * stock", "DESC,", "item_id"],
        extra: ["ASC,", "DESC"],
        tables: ["items"],
        hints: [
          "7번 가게 물건만 고른 다음, 값과 재고를 곱한 값으로 큰 것부터 세워요. 같은 값에 대비해 번호도 붙여요.",
          "ORDER BY 다음에 price * stock, 쉼표가 붙은 DESC, 그리고 item_id를 놓아요.",
        ],
        explain: "은방망이(280 × 40 = 11200)가 맨 위예요! 가장 비싼 금방망이는 재고가 17개라 6800엽전, 넷째예요. 식으로 세우니 값만 볼 때와 차례가 달라졌죠.",
      },
      {
        type: "check", concept: "adv_sort_expr",
        q: "계산한 값으로 줄 세우기에 대해 맞는 말은?",
        options: [
          "ORDER BY 뒤에 식이나 별칭을 쓸 수 있고, 그 값이 결과 표에 없어도 된다",
          "ORDER BY 뒤에는 열 이름만 올 수 있다",
          "식으로 세우면 동점이 생기지 않아 둘째 기준이 필요 없다",
        ],
        answer: 0,
        explain: "식이든 별칭이든 행마다 구한 값으로 세워요. 계산한 값도 같을 수 있으니 고유한 둘째 기준은 그대로 붙여요.",
      },
    ],
  },
  {
    id: "5-A2", chapter: 5, isAdvanced: true, title: "OFFSET으로 쪽 나누기",
    goal: "OFFSET을 셈해 n쪽을 보고, 쪽이 겹치지 않게 할 수 있다",
    summary: [
      "n쪽 = OFFSET (n−1) × 한 쪽 행 수",
      "쪽 경계의 동점은 겹치거나 빠져요",
      "그래서 고유한 둘째 기준까지 세워요",
    ],
    cards: [
      {
        say: "5장에서 OFFSET으로 위에서 몇 행을 건너뛰었죠? 오늘은 장부를 쪽으로 나눠요. 한 쪽에 5행씩이면 1쪽은 LIMIT 5, 2쪽은 1쪽 5행을 건너뛴 LIMIT 5 OFFSET 5. n쪽은 앞 쪽을 다 건너뛰니 OFFSET이 (n−1) × 5예요.",
        sql: "SELECT item_id, name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT 5 OFFSET 5",
      },
      {
        say: "쪽 나누기엔 고유한 둘째 기준이 꼭 필요해요. 싼 것부터 5행씩이면 1쪽 끝 도토리묵과 2쪽 첫 꿀떡이 둘 다 8엽전이에요. 값으로만 세우면 쪽을 열 때마다 둘의 차례가 바뀔 수 있어, 꿀떡이 두 쪽에 다 나오거나 아예 빠질 수 있어요.",
        sql: "SELECT item_id, name, price\nFROM items\nWHERE price <= 9\nORDER BY price, item_id",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_offset_page",
        q: "한 쪽에 k행씩 나눌 때, n쪽을 보는 OFFSET은?",
        options: ["(n − 1) × k", "n × k", "n − 1"],
        answer: 0,
        explain: "n쪽을 보려면 앞의 n − 1쪽을 모두 건너뛰어요. 한 쪽이 k행이니 (n − 1) × k행이에요. n × k는 한 쪽 더 넘어가요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "한 쪽에 5행씩일 때 1쪽의 OFFSET은?",
        options: ["0이라서 LIMIT 5만 써도 같다", "1", "5"],
        answer: 0,
        explain: "1쪽은 건너뛸 쪽이 없어 (1 − 1) × 5 = 0이에요. OFFSET 0은 하나도 안 건너뛰니 LIMIT 5와 같아요. OFFSET 5는 2쪽이에요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "한 쪽에 4행씩 나눈 장부라면, 이 SQL은 몇 쪽일까요?",
        code: "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT 4 OFFSET 8",
        options: ["3쪽", "2쪽", "8쪽"],
        answer: 0,
        explain: "OFFSET 8은 4행짜리 쪽 두 개를 건너뛴 거예요. 1쪽·2쪽을 지나 3쪽, 방망이 손잡이부터 갓까지예요.",
      },
      {
        type: "blank", concept: "adv_offset_page",
        q: "한 쪽에 6행씩, 비싼 것부터 볼 때 2쪽이 나오게 빈자리를 채워 보세요.",
        code: "SELECT name, price\nFROM items\nORDER BY price DESC, item_id\nLIMIT 6 OFFSET ___",
        chips: ["6", "12", "2"],
        answer: 0,
        explain: "2쪽은 1쪽 6행을 건너뛰니 OFFSET 6이에요. 작은 방망이부터 갓까지 나와요. 12는 3쪽, 2는 쪽 수를 그대로 넣은 실수예요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "한 쪽에 3행씩인 장부의 2쪽이에요. 이 쪽에 나오는 물건은?",
        code: "SELECT name\nFROM items\nORDER BY price DESC, item_id\nLIMIT 3 OFFSET 3",
        options: ["쇠솥", "장승", "작은 방망이"],
        answer: 0,
        explain: "1쪽 금방망이·장승·도깨비방망이를 건너뛰고 은방망이·쇠솥·놋그릇이 2쪽이에요. 작은 방망이는 그다음 3쪽이에요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "한 쪽에 6행씩인 장부의 마지막 7쪽이에요. 몇 행일까요?",
        code: "SELECT name\nFROM items\nORDER BY price DESC, item_id\nLIMIT 6 OFFSET 36",
        options: ["4행", "6행", "0행"],
        answer: 0,
        explain: "물건 40가지 중 앞 6쪽이 36행이라 남은 건 4행이에요. 마지막 쪽은 LIMIT보다 짧을 수 있어요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "물건 40가지를 5행씩 나눌 때 9쪽을 열면 결과는 어떨까요?",
        code: "SELECT name\nFROM items\nORDER BY price DESC, item_id\nLIMIT 5 OFFSET 40",
        options: ["행이 하나도 없는 표", "8쪽과 같은 5행", "OFFSET이 너무 커서 오류가 난다"],
        answer: 0,
        explain: "40행을 모두 건너뛰면 남는 행이 없어 0행이에요. 오류가 아니라 「쪽이 끝났다」는 신호예요. 5행씩이면 8쪽이 마지막이에요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "물건을 ORDER BY price로만 세워 쪽을 나누면 무엇이 걱정일까요?",
        options: [
          "쪽 경계에 걸친 동점 행이 두 쪽에 겹치거나 빠질 수 있다",
          "OFFSET 때문에 오류가 난다",
          "마지막 쪽이 늘 비어 있다",
        ],
        answer: 0,
        explain: "쪽마다 SQL을 따로 돌리니, 동점끼리의 차례가 그때마다 다를 수 있어요. item_id처럼 행마다 다른 둘째 기준을 붙이면 쪽이 늘 같아요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "싼 것부터 5행씩, ORDER BY price, item_id로 나누면 꿀떡(10번)은 어디에 나올까요?",
        options: ["2쪽 맨 위", "1쪽 맨 아래", "1쪽과 2쪽 모두"],
        answer: 0,
        explain: "8엽전 동점끼리는 번호 차례라 3번 도토리묵이 1쪽 다섯째, 10번 꿀떡이 2쪽 첫째로 늘 정해져요. 겹치지도 빠지지도 않아요.",
      },
      {
        type: "choice", concept: "adv_offset_page",
        q: "손님을 번호 차례로 한 쪽에 10명씩 나눌 때, 3쪽을 보여 준 결과는?",
        options: [
          { sql: "SELECT customer_id, name\nFROM customers\nORDER BY customer_id\nLIMIT 10 OFFSET 20" },
          { sql: "SELECT customer_id, name\nFROM customers\nORDER BY customer_id\nLIMIT 10 OFFSET 30" },
          { sql: "SELECT customer_id, name\nFROM customers\nORDER BY customer_id\nLIMIT 10 OFFSET 3" },
        ],
        answer: 0, tables: ["customers"],
        explain: "21번 솔아부터 30번 백설까지인 표가 정답이에요. OFFSET 30은 4쪽(31번부터), OFFSET 3은 4번부터라 쪽이 어긋나요.",
      },
      {
        type: "order", concept: "adv_offset_page",
        q: "물건을 싼 것부터 한 쪽에 5행씩 볼 때, 2쪽을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name, price", "FROM items", "ORDER BY price, item_id", "LIMIT 5 OFFSET 5"],
        expect: "name | price\n꿀떡 | 8\n메밀전 | 9\n약과 | 9\n막걸리 | 10\n부채 | 11",
        explain: "고유한 둘째 기준으로 세운 다음 1쪽 5행을 건너뛰었어요. 경계의 꿀떡이 2쪽 맨 위에 딱 한 번 나와요.",
      },
      {
        id: "5-A2-b1", type: "build", concept: "adv_offset_page",
        q: "물건을 비싼 것부터 한 쪽에 5개씩 볼 때, 2쪽을 보여 줘",
        cards: ["SELECT", "*", "FROM", "items", "ORDER BY", "price DESC,", "item_id", "LIMIT 5", "OFFSET 5"],
        extra: ["OFFSET 10", "LIMIT 10"],
        tables: ["items"],
        hints: [
          "비싼 차례로 세우고 같은 값은 번호로 정한 뒤, 1쪽만큼 건너뛰고 한 쪽만큼 남겨요.",
          "ORDER BY price DESC, item_id 다음에 LIMIT 5와 OFFSET 5를 놓아요.",
        ],
        explain: "놋그릇(190)부터 빨래방망이(130)까지, 2쪽 완성! OFFSET 10이면 3쪽, LIMIT 10이면 한 쪽이 10행이 돼요.",
      },
      {
        type: "check", concept: "adv_offset_page",
        q: "OFFSET으로 쪽 나누기에 대해 맞는 말은?",
        options: [
          "한 쪽이 k행이면 n쪽은 OFFSET (n−1)×k로 보고, 고유한 둘째 기준으로 세운다",
          "n쪽은 OFFSET n으로 본다",
          "둘째 기준이 없어도 쪽끼리 겹치는 일은 없다",
        ],
        answer: 0,
        explain: "앞 쪽들을 건너뛰고 한 쪽만큼 남기는 것이 쪽 나누기예요. 동점이 경계에 걸려도 흔들리지 않게 item_id까지 세워요.",
      },
    ],
  },
  {
    id: "5-A3", chapter: 5, isAdvanced: true, title: "값으로 N번째 찾기",
    goal: "N번째 값을 찾고 그 값의 물건을 모두 고를 수 있다",
    summary: [
      "행으로 세면 같은 값이 여러 번 세어져요",
      "값으로 N번째 = DISTINCT + OFFSET N−1",
      "그 값의 물건은 WHERE로 모두 찾아요",
    ],
    cards: [
      {
        say: "5장에서 OFFSET으로 N번째 물건을 찾았죠? 오늘은 의뢰예요! 뚝딱 공방 나무쇠 님이 「네 번째로 싼 값이 얼마고, 그 값에 파는 물건이 뭔지 알려 주게」래요. 행으로 세면 아래처럼 넷째가 송편 7엽전인데, 6엽전이 두 번 세어졌어요.",
        sql: "SELECT name, price\nFROM items\nORDER BY price, item_id\nLIMIT 4",
      },
      {
        say: "값으로 세려면 DISTINCT로 같은 값을 하나로 합친 다음 OFFSET으로 건너뛰어요. 5·6·7을 건너뛰니 네 번째로 싼 값은 8엽전! 둘째 걸음은 그 값을 WHERE 조건에 넣어 8엽전 물건을 모두 찾는 거예요.",
        sql: "SELECT DISTINCT price\nFROM items\nORDER BY price\nLIMIT 1 OFFSET 3",
      },
    ],
    items: [
      {
        type: "choice", concept: "adv_apply_5",
        q: "카드 1에서 행으로 센 넷째 송편의 값 7엽전은, 값으로 세면 몇 번째로 싼 값일까요?",
        options: ["세 번째", "네 번째", "두 번째"],
        answer: 0,
        explain: "값은 5·6·6·7인데 6엽전 두 행은 같은 값이라 한 번만 세요. 그래서 7엽전은 5·6 다음 세 번째예요.",
      },
      {
        type: "choice", concept: "adv_apply_5",
        q: "DISTINCT를 뺀 이 SQL이 보여 주는 값은?",
        code: "SELECT price\nFROM items\nORDER BY price\nLIMIT 1 OFFSET 3",
        options: ["7", "8", "6"],
        answer: 0,
        explain: "행으로 세어 5·6·6을 건너뛰니 넷째 행 송편의 7엽전이에요. 의뢰가 묻는 네 번째로 싼 「값」은 8엽전이라 달라요.",
      },
      {
        type: "choice", concept: "adv_apply_5",
        q: "SELECT 바로 뒤에 DISTINCT를 붙이면 결과가 8엽전으로 바뀌는 까닭은?",
        options: [
          "6엽전 두 행이 하나로 합쳐져 값이 5·6·7·8 차례가 되어서",
          "DISTINCT가 OFFSET을 하나 더 건너뛰게 해서",
          "DISTINCT가 값을 큰 것부터 세워서",
        ],
        answer: 0,
        explain: "DISTINCT는 같은 값을 한 번만 남겨요. 그 뒤에 줄 세우고 3행을 건너뛰니 넷째 값 8엽전이 나와요.",
      },
      {
        type: "blank", concept: "adv_apply_5",
        q: "값으로 세어 다섯 번째로 싼 값이 나오게 빈자리를 채워 보세요.",
        code: "SELECT DISTINCT price\nFROM items\nORDER BY price\nLIMIT 1 OFFSET ___",
        chips: ["4", "5", "3"],
        answer: 0,
        explain: "다섯 번째는 앞 4개 값을 건너뛰어 OFFSET 4, 9엽전이에요. 5를 넣으면 여섯 번째 10엽전, 3이면 네 번째 8엽전이에요.",
      },
      {
        type: "choice", concept: "adv_apply_5",
        q: "네 번째로 싼 값이 8엽전인 걸 알았어요. 그 값에 파는 물건을 모두 보려면?",
        options: [
          "WHERE price = 8 로 그 값의 행을 모두 고른다",
          "ORDER BY price LIMIT 1 OFFSET 3 으로 넷째 행을 본다",
          "WHERE price = 4 로 고른다",
        ],
        answer: 0,
        explain: "같은 값의 물건이 여럿일 수 있어 LIMIT 1로는 하나만 나와요. 값을 WHERE에 넣으면 그 값의 물건이 빠짐없이 나와요.",
      },
      {
        type: "choice", concept: "adv_apply_5",
        q: "의뢰의 둘째 걸음 SQL이에요. 결과는 몇 행일까요?",
        code: "SELECT item_id, name, price\nFROM items\nWHERE price = 8\nORDER BY item_id",
        options: ["2행", "1행", "4행"],
        answer: 0,
        explain: "8엽전 물건은 도토리묵(3번)과 꿀떡(10번) 2가지예요. 나무쇠 님께 둘 다 알려 드려야 해요.",
      },
      {
        type: "choice", concept: "adv_apply_5",
        q: "비싼 쪽에서 값으로 센 두 번째 값이에요. 이 SQL이 보여 주는 값은?",
        code: "SELECT DISTINCT price\nFROM items\nORDER BY price DESC\nLIMIT 1 OFFSET 1",
        options: ["350", "400", "320"],
        answer: 0,
        explain: "비싼 쪽 위 12가지는 값이 모두 달라, 값으로 세나 행으로 세나 둘째는 장승의 350엽전이에요. 같은 값이 있는 곳에서만 둘이 달라져요.",
      },
      {
        type: "choice", concept: "adv_apply_5",
        q: "값으로 세어 세 번째로 싼 값의 물건을 모두 보여 준 결과는?",
        options: [
          { sql: "SELECT item_id, name, price\nFROM items\nWHERE price = 7\nORDER BY item_id" },
          { sql: "SELECT item_id, name, price\nFROM items\nWHERE price = 6\nORDER BY item_id" },
          { sql: "SELECT item_id, name, price\nFROM items\nWHERE price = 8\nORDER BY item_id" },
        ],
        answer: 0, tables: ["items"],
        explain: "값 차례는 5·6·7이라 세 번째 값은 7엽전, 송편 한 행이 정답이에요. 6엽전 인절미·한지는 두 번째 값이에요. 행으로 센 셋째 한지의 값이라 헷갈리기 쉬워요.",
      },
      {
        type: "order", concept: "adv_apply_5",
        q: "값으로 세어 일곱 번째로 싼 값을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT DISTINCT price", "FROM items", "ORDER BY price", "LIMIT 1 OFFSET 6"],
        expect: "price\n11",
        explain: "값 5·6·7·8·9·10을 건너뛰어 11엽전(부채)이에요. 행으로 세면 6엽전과 8엽전이 두 번씩 세어져, 일곱째 행은 9엽전(메밀전·약과 동점)이에요.",
      },
      {
        id: "5-A3-b1", type: "build", concept: "adv_apply_5",
        q: "나무쇠 님 의뢰: 물건값 가운데 네 번째로 싼 값을 알려 줘",
        cards: ["SELECT", "DISTINCT", "price", "FROM", "items", "ORDER BY", "price", "LIMIT 1", "OFFSET 3"],
        extra: ["OFFSET 4", "name"],
        tables: ["items"],
        hints: [
          "같은 값은 한 번만 세도록 겹침을 없애고, 싼 것부터 세운 뒤 앞의 값 세 개를 건너뛰어요.",
          "SELECT DISTINCT price로 시작해 ORDER BY price, LIMIT 1, OFFSET 3을 놓아요.",
        ],
        explain: "8엽전, 의뢰의 첫째 걸음 완성! DISTINCT가 빠지면 7엽전이 나와요. 이제 WHERE price = 8로 도토리묵·꿀떡을 찾아 드리면 끝이에요.",
      },
      {
        type: "check", concept: "adv_apply_5",
        q: "값으로 N번째 찾기에 대해 맞는 말은?",
        options: [
          "DISTINCT로 같은 값을 합친 뒤 OFFSET N−1로 N번째 값을 찾고, 그 값의 물건은 WHERE로 모두 고른다",
          "행으로 세는 N번째와 값으로 세는 N번째는 언제나 같다",
          "N번째 값의 물건은 LIMIT 1로 하나만 보면 충분하다",
        ],
        answer: 0,
        explain: "같은 값이 있으면 행으로 센 N번째와 값으로 센 N번째가 달라요. 값을 찾고, 그 값으로 다시 거르는 두 걸음이 의뢰의 답이에요.",
      },
    ],
  },
];
