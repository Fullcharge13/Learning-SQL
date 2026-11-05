// 9장 「값 바꿔 보기」 (설계 §6: CASE WHEN, 글자·숫자 함수(ROUND, LENGTH, UPPER, ||) / 장터 예: 값으로 싼/보통/비싼 나누기).
// 쓰기 안내: docs/lesson-writing-guide.md · 점검: node tests/content.js --chapter 9
// 9장 낱말은 8장까지에 CASE·WHEN·THEN·ELSE·END, ROUND·LENGTH·UPPER, 글자 잇기 ||, 그리고 판정 R23의 LOWER·SUBSTR·REPLACE·TRIM·ABS·CAST(INTEGER·REAL·TEXT)를 더한 것.
// - 장터 예 「값으로 싼/보통/비싼 나누기」: 100엽전 이상 '비싼', 20엽전 이상 '보통', 나머지 '싼'.
//   값 분포(items 40가지): 5~18엽전 16가지, 20~45엽전 12가지, 110~400엽전 12가지. 45(노리개) 다음이 110(갓)이라 100은 깔끔한 경계이고,
//   20은 익모초가 딱 20이라 >=와 >가 갈린다(> 20이면 익모초가 '싼'). >= 100과 > 100은 100엽전 물건이 없어 결과가 같아서 헷갈림 카드로 쓰지 않는다.
//   9-2-b1·9-5-b1. 갈래 차례를 바꾸면(20 먼저) 비싼 물건 12가지가 모두 '보통'이 된다(9-2 둘째 카드).
// - 확인한 값(data/market.sql, openEngine):
//   3·6번 가게 물건: 산삼 120 비싼, 갓 110 비싼, 인삼차 30·쌍화탕 22·오미자청 25·담뱃대 33·복주머니 28·노리개 45 보통, 감초 12·보따리 16 싼.
//   4번 가게: 도라지 15·쑥뜸 18 싼, 익모초 20·구기자 28·약초 주머니 35 보통. 5번 가게 재고: 부채 12, 짚신 0, 한지 NULL, 등불 47, 비단 주머니 16.
//   재고 빈칸: 메밀전·한지·장승. CASE WHEN stock < 10 … ELSE '넉넉'에서 빈칸 셋은 '넉넉'(NULL < 10은 참이 아님). stock < 10인 물건 7가지, 도라지 재고는 딱 10.
//   LENGTH(이 장터 SQLite는 글자 수): 방망이 손잡이 7(띄어쓰기 포함), 작은 방망이 6, 도깨비방망이 6, 금방망이·은방망이 4, 약초 주머니 6, 국밥 2.
//     다섯 자 이상인 물건 7가지(약초 주머니, 비단 주머니, 도깨비방망이, 방망이 손잡이, 작은 방망이, 다듬이방망이, 빨래방망이 5).
//   SUBSTR(name, 1, 2): 도깨비방망이 → 도깨, 빨래방망이 → 빨래. SUBSTR(name, 1, 3): 도깨비방망이 → 도깨비.
//     7번 가게 SUBSTR(name, 1, 2): 도깨·금방·은방·방망·작은(9-5-b3). 6번 가게 ABS(price - 100): 갓 10·담뱃대 67·복주머니 72·노리개 55·보따리 84(9-5-b2).
// - 장 평가 조립은 앞 조립을 그대로 되풀이하지 않는다: 9-5-b1만 대표 문제(9-2-b1과 같은 과제)이고, 9-5-b2는 ABS, 9-5-b3은 SUBSTR로 새로 냈다.
//   REPLACE(name, '방망이', '봉'): 도깨비봉, 금봉, 은봉, 봉 손잡이, 작은 봉. UPPER(name)은 한글이라 그대로(장터 데이터에 영어 글자 값은 하나도 없다).
//   ||: 국밥 || ' ' || 12 → '국밥 12'. price || '엽전' → '12엽전'.
//   나누기: 1번 가게 price / 2 → 국밥 6, 수육 12, 도토리묵 4, 막걸리 5, 메밀전 4. CAST(price AS REAL) / 2와 price * 1.0 / 2 → 6, 12.5, 4, 5, 4.5.
//   AVG(age) 종류별: 도깨비 44.3043, 사람 43.5, 여우 38.3333 → ROUND(…, 1) 44.3·43.5·38.3, ROUND(…) 44·44·38,
//     ROUND(ABS(AVG(age) - 40), 1) 4.3·3.5·1.7. ABS(16 - 100) = 84(보따리).
// - 엔진마다 다른 것(판정 R36): 정수 나눗셈의 소수점 버림(MySQL은 12.5), LENGTH가 글자 수인 것(MySQL LENGTH는 바이트라 한글 한 자가 3),
//   ||가 글자 잇기인 것(MySQL은 기본 설정에서 ||를 OR로 읽고 CONCAT 함수를 씀, CONCAT은 말로만). 「이 장터에서는」을 붙인다.
//   이 장터의 ROUND(price)는 실수를 돌려줘서 ROUND(price) / 2가 12.5가 된다(점검기 swap-extra가 찾음). 그래서 「정수 그대로」 헷갈림 카드로 쓰지 않는다.
//   ROUND(x.5)의 올림 방향은 데이터베이스·자료형마다 달라서 .5 문제는 내지 않는다(43.5는 문제 값으로 쓰지 않음).
//   CASE의 차례(처음 맞은 갈래), ELSE 없으면 NULL, UPPER가 한글을 그대로 두는 것은 어디서나 같아 붙이지 않는다.
// - 조립 카드(판정 R38·R40): SELECT·FROM·WHERE는 한 장씩, GROUP BY는 한 장(R40).
//   CASE 갈래가 셋인 조립(장터 예, 재고 쪽지)은 갈래 하나 「WHEN 조건 THEN 값」을 카드 한 장으로 둔다. 갈래 셋을 WHEN·THEN으로 쪼개면
//   SELECT name , CASE … END AS … FROM items가 카드 13장이 되어 더미 12장을 넘는다. 이 조립에서 연습하는 것은 갈래의 차례(처음 맞은 갈래)라
//   갈래 덩어리가 「이 덩어리를 여기 놓는다」로 말할 수 있는 한 단위다. 갈래가 하나인 9-1 조립은 WHEN 조건과 THEN 값을 따로 둔다.
//   END와 별칭은 「END AS band」 한 장(키워드 + 이름).
// - 헷갈림 갈래 카드는 정답 갈래 뒤에 끼워도 결과가 바뀌어야 한다(swap-extra). 앞 갈래에 이미 걸린 행만 고르는 갈래(WHEN price >= 200 …)나
//   절대 맞지 않는 갈래(WHEN stock = NULL …)는 끼워도 결과가 같아 쓰지 않는다. 남은 행을 가로채는 갈래(WHEN price < 100 THEN '보통')를 쓴다.
// - UPPER·LOWER는 장터 값이 모두 한글이라 바꿀 것이 없다. 카드에서 UPPER(name)이 그대로인 것을 보여 주고, 영어 글자 상수 'sql'로 한 번 보인다.
//   TRIM은 장터 값에 앞뒤 공백이 없어 보여 줄 데이터가 없다. 말풍선에서 이름만 알리고 문제로 내지 않는다.
// - 결과 표 보기(choice {sql})의 셈·계산 열에는 같은 별칭(band, avg_age 등)을 붙여 열 머리로 답이 드러나지 않게 한다.
export const CHAPTER = { id: 9, title: "값 바꿔 보기" };

export const LESSONS = [
  {
    id: "9-1", chapter: 9, title: "CASE WHEN으로 나누기",
    goal: "CASE WHEN으로 조건에 따라 다른 값을 내고 ELSE·END를 안다",
    summary: [
      "CASE WHEN 조건 THEN 값 ELSE 값 END",
      "행마다 조건을 보고 값을 하나 골라요",
      "ELSE가 없으면 안 맞는 행은 NULL",
    ],
    cards: [
      {
        say: "CASE(케이스)는 행마다 조건을 보고 값을 골라요. WHEN 뒤에 조건, THEN 뒤에 맞을 때 값, ELSE 뒤에 안 맞을 때 값을 쓰고 END로 닫아요. 아래 band 열을 봐요. 산삼·갓만 '비싼'이죠?",
        sql: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id IN (3, 6)",
      },
      {
        say: "ELSE를 빼면 어느 조건에도 안 맞는 행은 NULL(빈칸)이 돼요. 아래는 ELSE 없이 같은 SQL을 돌렸어요. 산삼·갓 말고는 band가 모두 NULL이에요. CASE가 만든 열에도 AS로 영어 이름을 붙여요.",
        sql: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  END AS band\nFROM items\nWHERE shop_id IN (3, 6)",
      },
    ],
    items: [
      {
        type: "choice", concept: "case",
        q: "CASE WHEN은 무슨 일을 할까요?",
        options: ["행마다 조건을 보고 다른 값을 골라 낸다", "조건에 맞는 행만 남기고 나머지를 뺀다", "행을 값 차례로 줄 세운다"],
        answer: 0,
        explain: "CASE는 행을 빼지 않고, 행마다 새 값을 하나 골라 열로 보여요. 행 거르기는 WHERE, 줄 세우기는 ORDER BY예요.",
      },
      {
        type: "choice", concept: "case",
        q: "이 SQL 결과에서 갓(110엽전)의 band는?",
        code: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 6",
        options: ["비싼", "싼", "110"],
        answer: 0,
        explain: "110은 100 이상이라 WHEN 조건이 참이에요. 그래서 THEN 뒤의 '비싼'이 나와요. 110은 price 열 값이에요.",
      },
      {
        type: "choice", concept: "case",
        q: "같은 SQL에서 노리개(45엽전)의 band는?",
        code: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 6",
        options: ["싼", "비싼", "NULL"],
        answer: 0,
        explain: "45는 100보다 작아 WHEN 조건이 거짓이에요. 그러면 ELSE 뒤의 '싼'이 나와요. ELSE가 있으니 NULL은 안 나와요.",
      },
      {
        type: "choice", concept: "case",
        q: "CASE를 닫는 SQL 낱말은?",
        options: ["END", "ELSE", "THEN"],
        answer: 0,
        explain: "CASE로 열고 END로 닫아요. 그 사이에 WHEN … THEN …과 ELSE …가 들어가요. END 뒤에 AS로 이름을 붙여요.",
      },
      {
        type: "choice", concept: "case",
        q: "이 SQL은 어떻게 될까요?",
        code: "SELECT name,\n  CASE WHEN price >= 100 THEN '비싼'\n  ELSE '싼' AS band\nFROM items",
        options: ["오류가 난다", "모든 물건이 '싼'으로 나온다", "END 없이도 잘 돈다"],
        answer: 0,
        explain: "CASE를 닫는 END가 빠져서 오류예요. 이 단서를 보면 ELSE '싼' 뒤에 END를 놓아요.",
      },
      {
        type: "choice", concept: "case",
        q: "ELSE가 없을 때, 어느 WHEN에도 안 맞는 행의 값은?",
        options: ["NULL(빈칸)", "0", "오류가 난다"],
        answer: 0,
        explain: "ELSE가 없으면 안 맞는 행에는 낼 값이 없어서 NULL이 돼요. 오류는 나지 않아요. 둘째 카드의 band 열처럼요.",
      },
      {
        type: "choice", concept: "case",
        q: "이 SQL 결과에서 노리개(45엽전)의 band는?",
        code: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  END AS band\nFROM items\nWHERE shop_id = 6",
        options: ["NULL", "싼", "비싼"],
        answer: 0,
        explain: "45는 WHEN 조건에 안 맞고 ELSE도 없어서 NULL이에요. '싼'을 보려면 ELSE '싼'을 더해요.",
      },
      {
        type: "blank", concept: "case",
        q: "값이 100엽전 이상이면 '비싼', 아니면 '싼'이 나오게 빈자리를 채워 보세요.",
        code: "SELECT name,\n  CASE WHEN price >= 100 THEN '비싼'\n  ___ '싼' END AS band\nFROM items",
        chips: ["ELSE", "THEN", "WHEN"],
        answer: 0,
        explain: "안 맞을 때의 값은 ELSE 뒤에 써요. THEN이 두 번 오거나 WHEN 뒤에 조건 없이 값만 오면 단서가 나와요.",
      },
      {
        type: "blank", concept: "case",
        q: "CASE 안에서 조건을 쓰는 자리가 되게 빈자리를 채워 보세요.",
        code: "SELECT name,\n  CASE ___ price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items",
        chips: ["WHEN", "WHERE", "ELSE"],
        answer: 0,
        explain: "CASE 안의 조건은 WHEN 뒤에 써요. WHERE는 행을 거르는 낱말이라 CASE 안에 놓으면 단서가 나와요.",
      },
      {
        type: "order", concept: "case",
        q: "물건마다 '비싼'·'싼'을 붙여 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name,", "CASE WHEN price >= 100 THEN '비싼'", "ELSE '싼' END AS band", "FROM items"],
        explain: "CASE … END 덩어리는 SELECT 안의 열 하나예요. 그래서 SELECT name, 뒤, FROM 앞에 놓아요.",
      },
      {
        id: "9-1-b1", type: "build", concept: "case",
        q: "물건마다 이름과, 값이 100엽전 이상이면 '비싼' 아니면 '싼'을 band라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "CASE", "WHEN price >= 100", "THEN '비싼'", "ELSE '싼'", "END AS band", "FROM", "items"],
        extra: ["WHEN price <= 100", "THEN '싼'"],
        tables: ["items"],
        hints: [
          "물건 표에서 이름과 함께, 값을 보고 두 갈래 중 하나를 고르는 열을 만들어요.",
          "CASE, WHEN price >= 100, THEN '비싼', ELSE '싼', END AS band 차례로 놓아요.",
        ],
        explain: "물건 40가지 중 12가지가 '비싼'이에요. <= 100으로 쓰면 거꾸로 싼 물건이 '비싼'이 돼요. 조건은 WHEN 뒤, 값은 THEN 뒤!",
      },
      {
        id: "9-1-b2", type: "build", concept: "case",
        q: "재고가 10개보다 적은 물건에만 '부족'을 stock_note라는 이름으로 붙여 줘",
        cards: ["SELECT", "name", ",", "CASE", "WHEN stock < 10", "THEN '부족'", "END AS stock_note", "FROM", "items"],
        extra: ["ELSE '넉넉'", "WHEN stock <= 10"],
        tables: ["items"],
        hints: [
          "재고를 보고 적을 때만 값을 내요. 나머지는 비워 둬도 돼요.",
          "CASE, WHEN stock < 10, THEN '부족', END AS stock_note 차례로 놓아요. ELSE는 없어요.",
        ],
        explain: "산삼·놋그릇 같은 7가지만 '부족'이고 나머지는 ELSE가 없어 NULL이에요. <= 10이면 재고가 딱 10인 도라지도 걸려요.",
      },
      {
        type: "check", concept: "case",
        q: "CASE WHEN에 대해 맞는 말은?",
        options: [
          "WHEN 조건이 참이면 THEN 값, 아니면 ELSE 값을 내고 END로 닫는다",
          "ELSE가 없으면 오류가 난다",
          "조건에 안 맞는 행은 결과에서 빠진다",
        ],
        answer: 0,
        explain: "CASE는 행을 빼지 않아요. 모든 행이 남고 값만 골라져요. ELSE가 없으면 안 맞는 행은 NULL이에요.",
      },
    ],
  },
  {
    id: "9-2", chapter: 9, title: "갈래 여럿과 차례",
    goal: "WHEN을 여럿 쓰고, 위에서 처음 맞은 갈래가 고른다는 것을 안다",
    summary: [
      "WHEN을 여러 개 이어 갈래를 나눠요",
      "위에서부터 보고 처음 맞은 갈래 하나!",
      "빈칸은 조건이 참이 아니라 다음 갈래로",
    ],
    cards: [
      {
        say: "9장 대표 문제 「값으로 싼/보통/비싼 나누기」예요! WHEN을 여러 개 이으면 갈래가 늘어요. 100엽전 이상은 '비싼', 20엽전 이상은 '보통', 나머지는 '싼'. 장터 물건 40가지는 싼 16, 보통 12, 비싼 12가지예요.",
        sql: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id IN (3, 6)",
      },
      {
        say: "CASE는 위에서부터 보고 처음 맞은 갈래에서 멈춰요. 아래는 두 WHEN의 차례를 바꿨어요. 산삼(120엽전)은 20 이상에 먼저 걸려서 '보통'이 됐죠? 그래서 좁은 조건(100 이상)을 위에 놓아요.",
        sql: "SELECT name, price,\n  CASE WHEN price >= 20 THEN '보통'\n  WHEN price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id IN (3, 6)",
      },
    ],
    items: [
      {
        type: "choice", concept: "case",
        q: "WHEN이 여럿일 때 한 행이 두 조건에 모두 맞으면?",
        options: ["위에 있는 갈래 하나의 값만 나온다", "두 값이 이어 붙어 나온다", "아래에 있는 갈래의 값이 나온다"],
        answer: 0,
        explain: "CASE는 위에서부터 보고 처음 맞은 갈래에서 멈춰요. 산삼은 100 이상에도, 20 이상에도 맞지만 위 갈래 하나만 골라져요.",
      },
      {
        type: "choice", concept: "case",
        q: "이 SQL 결과에서 인삼차(30엽전)의 band는?",
        code: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 3",
        options: ["보통", "비싼", "싼"],
        answer: 0,
        explain: "30은 100 이상이 아니라 첫 갈래를 지나, 20 이상인 둘째 갈래에 맞아요. 그래서 '보통'이에요.",
      },
      {
        type: "choice", concept: "case",
        q: "갈래 차례를 바꾼 이 SQL에서 갓(110엽전)의 band는?",
        code: "SELECT name, price,\n  CASE WHEN price >= 20 THEN '보통'\n  WHEN price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 6",
        options: ["보통", "비싼", "싼"],
        answer: 0,
        explain: "110은 첫 갈래 20 이상에 먼저 맞아서 '보통'에서 멈춰요. 이 차례로는 '비싼'이 한 번도 안 나와요.",
      },
      {
        type: "choice", concept: "case",
        q: "4번 가게 물건을 나눈 이 SQL에서 익모초(딱 20엽전)의 band는?",
        code: "SELECT name, price,\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 4",
        options: ["보통", "싼", "비싼"],
        answer: 0,
        explain: ">= 20은 20도 넣어요. 그래서 익모초는 '보통'이에요. 같은 가게의 쑥뜸(18엽전)은 '싼'이에요.",
      },
      {
        type: "choice", concept: "case",
        q: "둘째 갈래를 WHEN price > 20으로 바꾸면 익모초(20엽전)는?",
        options: ["싼", "보통", "NULL"],
        answer: 0,
        explain: "> 20은 20을 빼요. 익모초는 두 WHEN에 모두 안 맞아 ELSE의 '싼'이 돼요. 경계 값은 >=와 >를 꼭 따져 봐요.",
      },
      {
        type: "choice", concept: "case",
        q: "대표 문제 기준으로 장터 물건 40가지를 나누면 '보통'은 몇 가지일까요?",
        options: ["12가지", "24가지", "16가지"],
        answer: 0,
        explain: "20~45엽전인 12가지예요. 20 이상은 24가지지만 그중 12가지는 위 갈래에서 '비싼'이 돼요. 16가지는 '싼'이에요.",
      },
      {
        type: "choice", concept: "case",
        q: "재고 칸이 빈 메밀전은 이 SQL에서 무엇이 될까요?",
        code: "SELECT name,\n  CASE WHEN stock < 10 THEN '부족'\n  ELSE '넉넉' END AS stock_note\nFROM items\nWHERE shop_id = 1",
        options: ["넉넉", "부족", "NULL"],
        answer: 0,
        explain: "NULL < 10은 참이 아니라서(6장) 첫 갈래를 지나 ELSE로 가요. 재고를 모르는데 '넉넉'이라니! 빈칸은 WHEN stock IS NULL로 먼저 걸러요.",
      },
      {
        type: "blank", concept: "case",
        q: "100엽전 이상이 '비싼'이 되게 빈자리를 채워 보세요.",
        code: "SELECT name,\n  CASE WHEN price >= ___ THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items",
        chips: ["100", "20", "10"],
        answer: 0,
        explain: "첫 갈래가 100이어야 비싼 물건이 먼저 걸려요. 20을 넣으면 20엽전 넘는 물건이 모두 '비싼'이 돼요.",
      },
      {
        type: "order", concept: "case",
        q: "값으로 싼·보통·비싼을 나누는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name,", "CASE WHEN price >= 100 THEN '비싼'", "WHEN price >= 20 THEN '보통'", "ELSE '싼' END AS band", "FROM items"],
        explain: "100 이상 갈래가 20 이상 갈래보다 위에 와야 해요. 둘을 바꾸면 SQL은 돌지만 '비싼'이 하나도 안 나와요.",
      },
      {
        type: "choice", concept: "case",
        q: "재고가 빈칸이면 '모름', 10개 미만이면 '부족', 나머지는 '넉넉'으로 5번 가게 물건을 나눈 결과는?",
        options: [
          { sql: "SELECT name,\n  CASE WHEN stock IS NULL THEN '모름'\n  WHEN stock < 10 THEN '부족'\n  ELSE '넉넉' END AS stock_note\nFROM items\nWHERE shop_id = 5" },
          { sql: "SELECT name,\n  CASE WHEN stock < 10 THEN '부족'\n  ELSE '넉넉' END AS stock_note\nFROM items\nWHERE shop_id = 5" },
          { sql: "SELECT name,\n  CASE WHEN stock IS NULL THEN '모름'\n  WHEN stock < 20 THEN '부족'\n  ELSE '넉넉' END AS stock_note\nFROM items\nWHERE shop_id = 5" },
        ],
        answer: 0, tables: ["items"],
        explain: "한지 '모름', 짚신 '부족', 나머지 '넉넉'인 표가 정답이에요. IS NULL 갈래가 없으면 한지가 '넉넉', 20 미만이면 부채도 '부족'이에요.",
      },
      {
        id: "9-2-b1", type: "build", concept: "case",
        q: "물건마다 이름과, 값으로 싼/보통/비싼을 나눠 price_band라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "CASE", "WHEN price >= 100 THEN '비싼'", "WHEN price >= 20 THEN '보통'", "ELSE '싼'", "END AS price_band", "FROM", "items"],
        extra: ["WHEN price < 100 THEN '보통'", "ELSE '보통'"],
        tables: ["items"],
        hints: [
          "100엽전 이상은 비싼, 20엽전 이상은 보통, 나머지는 싼이에요. 어느 갈래를 위에 둘지 생각해요.",
          "CASE 다음에 100 이상 갈래, 20 이상 갈래, ELSE '싼', END AS price_band 차례로 놓아요.",
        ],
        explain: "9장의 대표 문제예요! 싼 16, 보통 12, 비싼 12가지로 나뉘었어요. 두 WHEN을 바꾸면 비싼 물건까지 '보통'이 돼요. 좁은 조건이 위!",
      },
      {
        id: "9-2-b2", type: "build", concept: "case",
        q: "물건마다 재고가 빈칸이면 '모름', 10개 미만이면 '부족', 나머지는 '넉넉'을 stock_note로 보여 줘",
        cards: ["SELECT", "name", ",", "CASE", "WHEN stock IS NULL THEN '모름'", "WHEN stock < 10 THEN '부족'", "ELSE '넉넉'", "END AS stock_note", "FROM", "items"],
        extra: ["WHEN stock < 20 THEN '부족'", "ELSE '모름'"],
        tables: ["items"],
        hints: [
          "재고를 모르는 물건, 적은 물건, 나머지 세 갈래로 나눠요. 빈칸은 비교로 못 잡아요.",
          "CASE 다음에 IS NULL 갈래, stock < 10 갈래, ELSE '넉넉', END AS stock_note를 놓아요.",
        ],
        explain: "메밀전·한지·장승이 '모름', 7가지가 '부족'이에요. IS NULL 갈래가 없으면 빈칸 셋이 ELSE로 가서 '넉넉'이 돼요.",
      },
      {
        type: "check", concept: "case",
        q: "WHEN이 여러 개인 CASE에 대해 맞는 말은?",
        options: [
          "위에서부터 보고 처음 맞은 갈래의 값 하나를 낸다",
          "맞는 갈래가 여럿이면 오류가 난다",
          "갈래의 차례는 결과에 상관없다",
        ],
        answer: 0,
        explain: "차례가 결과를 바꿔요. 좁은 조건(100 이상)을 넓은 조건(20 이상)보다 위에 놓아요. 빈칸은 IS NULL 갈래로 먼저!",
      },
    ],
  },
  {
    id: "9-3", chapter: 9, title: "글자 함수",
    goal: "글자 함수로 글자를 세고, 자르고, 바꾸고, 잇는다",
    summary: [
      "LENGTH 글자 수, SUBSTR 잘라 내기",
      "REPLACE 바꾸기, || 이어 붙이기",
      "대·소문자가 없는 한글은 UPPER도 그대로",
    ],
    cards: [
      {
        say: "LENGTH(렝스)는 글자 수, 띄어쓰기도 한 자! SUBSTR은 몇째 글자부터 몇 자를 잘라요(아래는 첫째부터 2자). REPLACE는 바꾸기! 이 장터는 한글 한 자를 1로 세요. MySQL의 LENGTH는 저장 크기라 한 자가 보통 3이에요.",
        sql: "SELECT name, LENGTH(name) AS len,\n  SUBSTR(name, 1, 2) AS head,\n  REPLACE(name, '방망이', '봉')\n    AS short\nFROM items\nWHERE shop_id = 7",
      },
      {
        say: "||는 글자를 이어 붙여요. 숫자도 붙죠. 이 장터에서는 ||로 잇지만 MySQL은 기본 설정에서 ||를 OR로 읽어 CONCAT 함수로 이어요. UPPER는 영어를 대문자로(LOWER는 소문자로) 바꿔요. 장터 이름은 한글이라 up 열이 그대로!",
        sql: "SELECT name || ' ' || price AS tag,\n  UPPER(name) AS up\nFROM items\nWHERE shop_id = 7",
      },
    ],
    items: [
      {
        type: "choice", concept: "strfunc",
        q: "LENGTH(name)은 무엇을 낼까요?",
        options: ["이름의 글자 수(띄어쓰기 포함)", "이름이 들어 있는 행의 수", "이름 열의 값 그대로"],
        answer: 0,
        explain: "LENGTH는 행마다 글자 수를 세요. 띄어쓰기도 한 자예요. 행의 수를 세는 건 7장의 COUNT예요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "이 SQL 결과에서 방망이 손잡이의 len은?",
        code: "SELECT name, LENGTH(name) AS len\nFROM items\nWHERE shop_id = 7",
        options: ["7", "6", "150"],
        answer: 0,
        explain: "방망이 3자, 띄어쓰기 1자, 손잡이 3자라 7이에요. 띄어쓰기를 빼면 6이고, 150은 값이에요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "이 장터에서 LENGTH('국밥')은 2인데 MySQL에서는 6이 나오는 까닭은?",
        options: [
          "MySQL의 LENGTH는 글자 수가 아니라 저장 크기를 세서",
          "MySQL은 따옴표까지 세서",
          "MySQL은 한글을 영어로 바꿔 세서",
        ],
        answer: 0,
        explain: "MySQL은 흔한 설정(utf8mb4)에서 한글 한 자를 크기 3으로 저장해 LENGTH가 6이에요. 데이터베이스마다 다르니 글자 수를 셀 때는 그 데이터베이스의 설명을 확인해요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "도깨비방망이(31번 물건)의 이름을 자른 결과는?",
        code: "SELECT SUBSTR(name, 1, 3) AS head\nFROM items\nWHERE item_id = 31",
        options: ["도깨비", "도깨", "방망이"],
        answer: 0,
        explain: "첫째 글자부터 3자라 도깨비예요. 2자였다면 도깨, 넷째 글자부터 3자였다면 방망이예요.",
      },
      {
        type: "blank", concept: "strfunc",
        q: "이름 속 '방망이'를 '봉'으로 바꿔 보이게 빈자리를 채워 보세요.",
        code: "SELECT ___(name, '방망이', '봉')\n  AS short\nFROM items\nWHERE shop_id = 7",
        chips: ["REPLACE", "SUBSTR", "LENGTH"],
        answer: 0,
        explain: "REPLACE(글자, 찾을 것, 바꿀 것)이에요. 금방망이는 금봉, 방망이 손잡이는 봉 손잡이가 돼요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "국밥(1번 물건)의 tag는?",
        code: "SELECT name || ' ' || price AS tag\nFROM items\nWHERE item_id = 1",
        options: ["국밥 12", "국밥12", "오류가 난다"],
        answer: 0,
        explain: "이름, 띄어쓰기 한 자(' '), 값 12를 차례로 이어서 '국밥 12'예요. ' '를 빼면 국밥12가 돼요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "이 장터의 || 에 대해 맞는 말은?",
        options: [
          "이 장터에서는 글자 잇기지만, MySQL은 기본 설정에서 OR로 읽고 CONCAT 함수로 잇는다",
          "모든 데이터베이스에서 ||는 글자 잇기다",
          "||는 숫자를 더한다",
        ],
        answer: 0,
        explain: "SQLite·PostgreSQL은 ||로 잇지만 MySQL은 기본 설정에서 ||를 OR로 읽어요. 데이터베이스마다 다르니 확인해요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "갓(26번 물건)의 이름을 UPPER로 바꾼 결과는?",
        code: "SELECT UPPER(name) AS up\nFROM items\nWHERE item_id = 26",
        options: ["갓", "GAT", "NULL"],
        answer: 0,
        explain: "UPPER는 소문자를 대문자로 바꿔요. 대·소문자가 없는 한글은 그대로라 갓이에요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "영어 글자 'sql'에 UPPER를 쓴 결과는?",
        code: "SELECT UPPER('sql') AS up",
        options: ["SQL", "sql", "Sql"],
        answer: 0,
        explain: "영어 소문자가 모두 대문자가 돼요. 거꾸로 소문자로 바꾸는 짝 함수는 LOWER예요.",
      },
      {
        type: "order", concept: "strfunc",
        q: "7번 가게 물건의 이름과 글자 수를 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name,", "LENGTH(name) AS len", "FROM items", "WHERE shop_id = 7"],
        explain: "함수를 쓴 열도 SELECT 안의 열 하나예요. 방망이 손잡이 7, 도깨비방망이 6처럼 나와요.",
      },
      {
        id: "9-3-b1", type: "build", concept: "strfunc",
        q: "이름이 다섯 자 이상인 물건의 이름을 보여 줘",
        cards: ["SELECT", "name", "FROM", "items", "WHERE", "LENGTH(name) >= 5"],
        extra: ["LENGTH(name) > 5", "price >= 5"],
        tables: ["items"],
        hints: [
          "물건 이름의 글자 수를 세어, 그 수로 행을 걸러요. 띄어쓰기도 한 자예요.",
          "WHERE 뒤에 LENGTH(name) >= 5를 놓아요.",
        ],
        explain: "7가지예요. 빨래방망이가 딱 다섯 자라 > 5면 빠져요. 함수는 WHERE 조건 안에서도 쓸 수 있어요!",
      },
      {
        id: "9-3-b2", type: "build", concept: "strfunc",
        q: "물건마다 이름과, 값 뒤에 '엽전'을 이어 붙인 것을 price_tag라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "price", "||", "'엽전'", "AS price_tag", "FROM", "items"],
        extra: ["OR", "stock"],
        tables: ["items"],
        hints: [
          "값(숫자) 뒤에 글자 '엽전'을 이어 붙인 열을 만들어 이름을 붙여요.",
          "price, ||, '엽전', AS price_tag 차례로 놓아요.",
        ],
        explain: "국밥은 12엽전, 금방망이는 400엽전처럼 나와요. 이 장터에서는 ||가 글자 잇기예요. OR를 놓으면 참·거짓(1·0)인데, MySQL은 기본 설정에서 ||를 그렇게 읽어요!",
      },
      {
        type: "check", concept: "strfunc",
        q: "9-3에서 배운 것으로 맞는 말은?",
        options: [
          "LENGTH는 글자 수, SUBSTR은 잘라 내기, REPLACE는 바꾸기, ||는 잇기다",
          "UPPER를 쓰면 한글 이름이 영어로 바뀐다",
          "글자 함수는 SELECT에만 쓸 수 있고 WHERE에는 못 쓴다",
        ],
        answer: 0,
        explain: "글자 함수는 SELECT 열에도, WHERE 조건에도 써요. UPPER·LOWER는 대·소문자만 바꿔서, 대·소문자가 없는 한글은 그대로예요.",
      },
    ],
  },
  {
    id: "9-4", chapter: 9, title: "숫자 함수와 CAST",
    goal: "정수 나눗셈을 CAST로 피하고 ROUND·ABS로 숫자를 다듬는다",
    summary: [
      "이 장터의 정수 ÷ 정수는 소수점 버림",
      "CAST(x AS REAL)이나 * 1.0으로 실수로",
      "ROUND 반올림, ABS 부호 떼기",
    ],
    cards: [
      {
        say: "2장에서 수육 25 나누기 2가 12였죠? 이 장터에서는 정수끼리 나누면 소수점 아래를 버려요. MySQL은 12.5를 내요. 데이터베이스마다 달라요! CAST로 값을 실수(REAL)로 바꾸거나 1.0을 곱하고 나누면 12.5가 나와요.",
        sql: "SELECT name, price / 2 AS half,\n  CAST(price AS REAL) / 2 AS exact,\n  price * 1.0 / 2 AS also_exact\nFROM items\nWHERE shop_id = 1",
      },
      {
        say: "ROUND(라운드)는 반올림이에요. 뒤 숫자 1은 소수 첫째 자리까지, 빼면 정수로! ABS는 부호를 떼요. 아래 gap은 평균 나이가 40살에서 얼마나 먼지예요. ROUND는 보기 좋게 자리를 줄일 때 써요.",
        sql: "SELECT kind,\n  ROUND(AVG(age), 1) AS avg_age,\n  ROUND(ABS(AVG(age) - 40), 1) AS gap\nFROM customers\nGROUP BY kind",
      },
    ],
    items: [
      {
        type: "choice", concept: "numfunc",
        q: "수육(25엽전)의 값을 2로 나눈 이 장터의 결과는?",
        code: "SELECT price / 2 AS half\nFROM items\nWHERE item_id = 2",
        options: ["12", "12.5", "13"],
        answer: 0,
        explain: "이 장터에서는 정수끼리 나누면 소수점 아래를 버려요. 반올림도 아니라서 13이 아니라 12예요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "정수 나눗셈에 대해 맞는 말은?",
        options: [
          "이 장터는 소수점 아래를 버리고, MySQL은 12.5처럼 소수까지 낸다",
          "모든 데이터베이스가 25 / 2를 12로 낸다",
          "모든 데이터베이스가 25 / 2를 13으로 반올림한다",
        ],
        answer: 0,
        explain: "데이터베이스마다 달라요. 어디서나 소수까지 보고 싶으면 CAST로 실수로 바꾸거나 1.0을 곱하고 나눠요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "CAST로 실수로 바꿔 나눈 수육(25엽전)의 결과는?",
        code: "SELECT CAST(price AS REAL) / 2 AS half\nFROM items\nWHERE item_id = 2",
        options: ["12.5", "12", "13"],
        answer: 0,
        explain: "CAST(price AS REAL)이 25를 실수 25.0으로 바꿔서 나누기가 12.5를 내요.",
      },
      {
        type: "blank", concept: "numfunc",
        q: "메밀전(9엽전)의 절반이 4.5로 나오게 빈자리를 채워 보세요.",
        code: "SELECT price * ___ / 2 AS half\nFROM items\nWHERE item_id = 5",
        chips: ["1.0", "1", "2"],
        answer: 0,
        explain: "1.0을 곱하면 9.0이 되어 4.5가 나와요. 1을 곱하면 정수 그대로라 4, 2를 곱하면 9가 돼요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "여우 손님의 평균 나이를 반올림한 결과는?",
        code: "SELECT ROUND(AVG(age), 1) AS avg_age\nFROM customers\nWHERE kind = '여우'",
        options: ["38.3", "38.3333", "38"],
        answer: 0,
        explain: "평균 38.3333…을 소수 첫째 자리까지 반올림해 38.3이에요. 자리 수 1을 빼면 38이 돼요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "도깨비 손님의 평균 나이를 자리 수 없이 반올림하면?",
        code: "SELECT ROUND(AVG(age)) AS avg_age\nFROM customers\nWHERE kind = '도깨비'",
        options: ["44", "44.3", "45"],
        answer: 0,
        explain: "평균 44.3043…에서 자리 수를 주지 않으면 정수로 반올림해요. 소수 첫째가 3이라 44예요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "ROUND에 대해 맞는 말은?",
        options: [
          "보기 좋게 자리를 줄인다",
          "ROUND를 안 하면 소수가 있는 결과는 오류가 난다",
          "ROUND는 값을 늘 올린다",
        ],
        answer: 0,
        explain: "ROUND는 반올림이라 내려가기도 해요(44.3 → 44). 소수가 길어도 오류는 아니에요. 보기 좋게 할 때 써요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "보따리(16엽전)의 값이 100엽전에서 얼마나 먼지 본 결과는?",
        code: "SELECT ABS(price - 100) AS gap\nFROM items\nWHERE item_id = 30",
        options: ["84", "-84", "116"],
        answer: 0,
        explain: "16 - 100은 -84이고, ABS가 부호를 떼서 84예요. 116은 더했을 때 값이에요.",
      },
      {
        type: "order", concept: "numfunc",
        q: "손님 종류마다 평균 나이를 소수 첫째 자리까지 보게 줄을 놓아 보세요.",
        lines: ["SELECT kind,", "ROUND(AVG(age), 1) AS avg_age", "FROM customers", "GROUP BY kind"],
        explain: "AVG를 ROUND로 감싸고 이름을 붙여요. 도깨비 44.3, 사람 43.5, 여우 38.3이 나와요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "손님 종류마다 평균 나이를 소수 첫째 자리까지 반올림한 결과는 어느 것일까요?",
        options: [
          { sql: "SELECT kind,\n  ROUND(AVG(age), 1) AS avg_age\nFROM customers\nGROUP BY kind" },
          { sql: "SELECT kind,\n  ROUND(AVG(age)) AS avg_age\nFROM customers\nGROUP BY kind" },
          { sql: "SELECT kind,\n  AVG(age) AS avg_age\nFROM customers\nGROUP BY kind" },
        ],
        answer: 0, tables: ["customers"],
        explain: "44.3·43.5·38.3인 표가 정답이에요. 자리 수가 없으면 정수로, ROUND가 없으면 44.3043처럼 길게 나와요.",
      },
      {
        id: "9-4-b1", type: "build", concept: "numfunc",
        q: "손님 종류마다 평균 나이를 소수 첫째 자리까지 반올림해 avg_age라는 이름으로 보여 줘",
        cards: ["SELECT", "kind", ",", "ROUND(AVG(age), 1)", "AS avg_age", "FROM", "customers", "GROUP BY", "kind"],
        extra: ["ROUND(AVG(age))", "AVG(age)"],
        tables: ["customers"],
        hints: [
          "손님 표를 종류로 묶고, 묶음마다 나이 평균을 소수 한 자리로 반올림해요.",
          "SELECT 다음에 kind, 쉼표, ROUND(AVG(age), 1)과 AS avg_age, 끝에 GROUP BY kind예요.",
        ],
        explain: "도깨비 44.3, 사람 43.5, 여우 38.3살이에요. 8장의 평균이 한결 읽기 쉬워졌죠? 자리 수가 없으면 정수가 돼요.",
      },
      {
        id: "9-4-b2", type: "build", concept: "numfunc",
        q: "물건마다 이름과, 값의 절반을 소수까지 half라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "CAST(price AS REAL)", "/", "2", "AS half", "FROM", "items"],
        extra: ["price", "CAST(price AS INTEGER)"],
        tables: ["items"],
        hints: [
          "값을 그냥 나누면 이 장터에서는 소수점 아래가 버려져요. 먼저 실수로 바꿔요.",
          "CAST(price AS REAL), /, 2, AS half 차례로 놓아요.",
        ],
        explain: "수육 12.5, 메밀전 4.5처럼 나와요. 이 장터에서는 price나 INTEGER로 나누면 12, 4로 소수점 아래가 버려져요.",
      },
      {
        type: "check", concept: "numfunc",
        q: "9-4에서 배운 것으로 맞는 말은?",
        options: [
          "이 장터에서 정수끼리 나누면 소수점 아래가 버려져서, 실수로 바꿔 나눈다",
          "CAST는 값을 반올림하는 함수다",
          "ABS는 값을 소수 첫째 자리까지 다듬는다",
        ],
        answer: 0,
        explain: "CAST는 자료형을 바꾸고, ROUND는 반올림하고, ABS는 부호를 떼요. 나눗셈 결과는 데이터베이스마다 다르니 실수로 바꿔 두면 대부분의 데이터베이스에서 같아요.",
      },
    ],
  },
  {
    id: "9-5", chapter: 9, title: "9장 평가", isExam: true,
    goal: "CASE로 값을 나누고 글자·숫자 함수로 값을 바꿀 수 있다",
    summary: [
      "CASE는 위에서 처음 맞은 갈래 하나",
      "LENGTH·SUBSTR·REPLACE·UPPER·||",
      "CAST로 실수 나눗셈, ROUND·ABS",
    ],
    cards: [
      {
        say: "9장 정리! 이름과 값을 이어 꼬리표를 만들고, 값으로 싼·보통·비싼을 나눴어요. 좁은 조건이 위, ELSE가 없으면 NULL. 같이 풀어 봐요!",
        sql: "SELECT name || ' ' || price AS tag,\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 3",
      },
    ],
    items: [
      {
        type: "choice", concept: "case",
        q: "한 행이 두 WHEN 조건에 모두 맞으면 CASE는 어느 값을 낼까요?",
        options: ["위에 있는 갈래의 값", "아래에 있는 갈래의 값", "ELSE 뒤의 값"],
        answer: 0,
        explain: "위에서부터 보고 처음 맞은 갈래에서 멈춰요. 그래서 좁은 조건을 위에 놓아요.",
      },
      {
        type: "choice", concept: "case",
        q: "익모초(18번 물건, 20엽전)를 나눈 결과는?",
        code: "SELECT\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items\nWHERE item_id = 18",
        options: ["보통", "싼", "비싼"],
        answer: 0,
        explain: ">= 20은 20을 넣어서 '보통'이에요. > 20이었다면 '싼'이 돼요.",
      },
      {
        type: "choice", concept: "case",
        q: "국밥(1번 물건, 재고 27)에 이 CASE를 쓴 결과는?",
        code: "SELECT\n  CASE WHEN stock < 10 THEN '부족'\n  END AS stock_note\nFROM items\nWHERE item_id = 1",
        options: ["NULL", "넉넉", "부족"],
        answer: 0,
        explain: "27은 10보다 작지 않아 WHEN에 안 맞고, ELSE가 없어 NULL이에요. '넉넉'은 어디에도 적혀 있지 않아요.",
      },
      {
        type: "choice", concept: "case",
        q: "100엽전 이상 '비싼', 20엽전 이상 '보통', 나머지 '싼'으로 3번 가게 물건을 나눈 결과는?",
        options: [
          { sql: "SELECT name,\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 3" },
          { sql: "SELECT name,\n  CASE WHEN price >= 20 THEN '보통'\n  WHEN price >= 100 THEN '비싼'\n  ELSE '싼' END AS band\nFROM items\nWHERE shop_id = 3" },
          { sql: "SELECT name,\n  CASE WHEN price >= 100 THEN '비싼'\n  WHEN price >= 20 THEN '보통'\n  END AS band\nFROM items\nWHERE shop_id = 3" },
        ],
        answer: 0,
        explain: "산삼 '비싼', 감초 '싼', 나머지 '보통'인 표예요. 갈래 차례를 바꾸면 산삼이 '보통', ELSE가 없으면 감초가 NULL이에요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "약초 주머니(20번 물건)의 이름 글자 수는?",
        code: "SELECT LENGTH(name) AS len\nFROM items\nWHERE item_id = 20",
        options: ["6", "5", "35"],
        answer: 0,
        explain: "약초 2자, 띄어쓰기 1자, 주머니 3자라 6이에요. 띄어쓰기를 빼면 5, 35는 값이에요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "LENGTH가 한글 한 자를 1로 세는 것에 대해 맞는 말은?",
        options: [
          "이 장터에서는 그렇지만, MySQL의 LENGTH는 저장 크기를 세서 한 자가 보통 3이다",
          "모든 데이터베이스에서 똑같이 1로 센다",
          "한글은 글자 수를 셀 수 없어 0이 나온다",
        ],
        answer: 0,
        explain: "데이터베이스마다 달라요. 이 장터(SQLite)의 LENGTH는 글자 수, MySQL의 LENGTH는 저장 크기예요.",
      },
      {
        type: "blank", concept: "strfunc",
        q: "물건 이름 뒤에 '!'를 이어 붙여 보이게 빈자리를 채워 보세요.",
        code: "SELECT name ___ '!' AS shout\nFROM items",
        chips: ["||", "OR", "+"],
        answer: 0,
        explain: "이 장터에서 글자 잇기는 ||예요. OR는 참·거짓, +는 숫자 더하기라 '국밥!'이 나오지 않아요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "빨래방망이(37번 물건)의 이름을 자른 결과는?",
        code: "SELECT SUBSTR(name, 1, 2) AS head\nFROM items\nWHERE item_id = 37",
        options: ["빨래", "빨래방", "방망이"],
        answer: 0,
        explain: "첫째 글자부터 2자라 빨래예요. 3자였다면 빨래방이에요.",
      },
      {
        type: "choice", concept: "strfunc",
        q: "장터 물건 이름에 UPPER를 쓰면?",
        options: ["한글이라 이름이 그대로 나온다", "한글 이름이 영어로 바뀐다", "오류가 난다"],
        answer: 0,
        explain: "UPPER·LOWER는 대·소문자를 바꿔요. 대·소문자가 없는 한글은 그대로예요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "메밀전(5번 물건, 9엽전)의 값을 2로 나눈 이 장터의 결과는?",
        code: "SELECT price / 2 AS half\nFROM items\nWHERE item_id = 5",
        options: ["4", "4.5", "5"],
        answer: 0,
        explain: "이 장터에서는 정수끼리 나누면 소수점 아래를 버려서 4예요. 4.5를 보려면 실수로 바꿔 나눠요.",
      },
      {
        type: "choice", concept: "numfunc",
        q: "이 장터에서 메밀전 값 9의 절반을 4.5로 보려면?",
        options: [
          "CAST(price AS REAL) / 2처럼 실수로 바꿔 나눈다",
          "ROUND(price / 2, 1)처럼 나눈 뒤 반올림한다",
          "ABS(price / 2)처럼 부호를 뗀다",
        ],
        answer: 0,
        explain: "나눈 뒤에는 이미 4라서 ROUND해도 4예요. 나누기 전에 실수로 바꿔야 4.5가 나와요.",
      },
      {
        type: "order", concept: "case",
        q: "재고가 빈칸이면 '모름', 아니면 '있음'을 보는 SQL이 되게 줄을 놓아 보세요.",
        lines: ["SELECT name,", "CASE WHEN stock IS NULL THEN '모름'", "ELSE '있음' END AS stock_note", "FROM items"],
        explain: "CASE … END가 SELECT의 열 하나예요. 메밀전·한지·장승이 '모름', 나머지 37가지가 '있음'이에요.",
      },
      {
        id: "9-5-b1", type: "build", concept: "case",
        q: "물건마다 이름과, 값으로 싼/보통/비싼을 나눠 price_band라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "CASE", "WHEN price >= 100 THEN '비싼'", "WHEN price >= 20 THEN '보통'", "ELSE '싼'", "END AS price_band", "FROM", "items"],
        extra: ["WHEN price >= 10 THEN '보통'", "ELSE NULL"],
        tables: ["items"],
        hints: [
          "100엽전 이상은 비싼, 20엽전 이상은 보통, 나머지는 싼이에요. 좁은 조건을 위에 둬요.",
          "CASE 다음에 100 이상 갈래, 20 이상 갈래, ELSE '싼', END AS price_band를 놓아요.",
        ],
        explain: "9장의 대표 문제를 다시 풀었어요! 싼 16, 보통 12, 비싼 12가지예요. 10 이상을 보통으로 하면 싼 물건이 거의 없어져요.",
      },
      {
        id: "9-5-b2", type: "build", concept: "numfunc",
        q: "바람 보따리(6번 가게) 물건마다 이름과, 값이 100엽전에서 얼마나 먼지 gap이라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "ABS(price - 100)", "AS gap", "FROM", "items", "WHERE", "shop_id = 6"],
        extra: ["price - 100", "ABS(price) - 100"],
        tables: ["items"],
        hints: [
          "6번 가게 물건만 남기고, 값과 100의 차이를 부호 없이 낸 열에 이름을 붙여요.",
          "name 쉼표 다음에 ABS(price - 100)과 AS gap을, WHERE 다음에 shop_id = 6을 놓아요.",
        ],
        explain: "갓 10, 노리개 55, 보따리 84엽전처럼 모두 0 이상이에요. 빼기만 하면 100보다 싼 물건은 -84처럼 음수가 되고, ABS(price) - 100도 빼기가 밖이라 음수예요.",
      },
      {
        id: "9-5-b3", type: "build", concept: "strfunc",
        q: "방망이 대장간(7번 가게) 물건마다 이름과, 이름의 앞 두 글자를 head라는 이름으로 보여 줘",
        cards: ["SELECT", "name", ",", "SUBSTR(name, 1, 2)", "AS head", "FROM", "items", "WHERE", "shop_id = 7"],
        extra: ["SUBSTR(name, 2, 2)", "SUBSTR(name, 1, 3)", "LENGTH(name)"],
        tables: ["items"],
        hints: [
          "7번 가게 물건만 남기고, 이름을 첫째 글자부터 두 글자만 잘라 낸 열에 이름을 붙여요.",
          "name 쉼표 다음에 SUBSTR(name, 1, 2)와 AS head를, WHERE 다음에 shop_id = 7을 놓아요.",
        ],
        explain: "도깨비방망이는 도깨, 방망이 손잡이는 방망, 작은 방망이는 작은이에요. SUBSTR(name, 2, 2)는 둘째 글자부터, (name, 1, 3)은 세 글자예요.",
      },
      {
        type: "check", concept: "case",
        q: "9장에서 배운 것으로 맞는 말은?",
        options: [
          "CASE로 조건마다 다른 값을 내고, 함수로 글자와 숫자를 바꿔 보인다",
          "CASE에서 맞는 갈래가 여럿이면 값이 모두 나온다",
          "어느 데이터베이스에서나 25 / 2는 12다",
        ],
        answer: 0,
        explain: "값을 나누고, 잇고, 다듬었어요. 실무에서는 쇼핑몰 상품 표의 가격을 CASE로 저가·중가·고가로 나누고, 이름과 값을 이어 상품 꼬리표를 만들어요.",
      },
    ],
  },
];

// 매일 도전 틀 (쓰기 안내 6절). 9장을 끝낸 학습자에게 값을 바꿔 가며 나온다.
// - P: '비싼' 기준 값. 어느 값이든 정답 SQL은 40행이고, 오답 칩(THEN, WHEN)은 오류라 겹치지 않는다.
// - S: 가게 번호 1~8(가게마다 물건 5가지). 이름 글자 수와 값의 자릿수(LENGTH(price))가 모든 가게에서 다르고,
//   items가 아닌 shops에서 같은 번호를 고르면 1행이라 늘 다르다.
// - S(9-T3): 가게마다 값이 3으로 나누어떨어지지 않는 물건이 있어 REAL과 INTEGER·TEXT 결과가 다르다.
export const TEMPLATES = [
  {
    id: "9-T1", concept: "case", type: "blank",
    q: "값이 {P}엽전 이상이면 '비싼', 아니면 '싼'이 나오게 빈자리를 채워 보세요.",
    sql: "SELECT name,\n  CASE WHEN price >= {P} THEN '비싼'\n  ___ '싼' END AS band\nFROM items",
    chips: ["ELSE", "THEN", "WHEN"],
    answer: 0,
    vars: { P: [20, 30, 50, 100, 150, 200] },
    explain: "WHEN 조건에 안 맞는 행의 값은 ELSE 뒤에 써요. CASE는 END로 닫아요.",
  },
  {
    id: "9-T2", concept: "strfunc", type: "choice",
    q: "이 SQL의 결과로 알맞은 표는?",
    sql: "SELECT name, LENGTH(name) AS len\nFROM items\nWHERE shop_id = {S}",
    wrong: [
      "SELECT name, LENGTH(price) AS len\nFROM items\nWHERE shop_id = {S}",
      "SELECT name, LENGTH(name) AS len\nFROM shops\nWHERE shop_id = {S}",
    ],
    vars: { S: { min: 1, max: 8 } },
    explain: "items 표에서 {S}번 가게 물건 이름의 글자 수를 세요. 이 장터에서는 띄어쓰기도 한 자로 세요.",
  },
  {
    id: "9-T3", concept: "numfunc", type: "blank",
    q: "{S}번 가게 물건 값을 3으로 나눠 소수까지 보게 빈자리를 채워 보세요.",
    sql: "SELECT name,\n  CAST(price AS ___) / 3 AS third\nFROM items\nWHERE shop_id = {S}",
    chips: ["REAL", "INTEGER", "TEXT"],
    answer: 0,
    vars: { S: { min: 1, max: 8 } },
    explain: "실수(REAL)로 바꿔야 소수까지 나와요. 이 장터에서는 정수끼리 나누면 소수점 아래를 버려요.",
  },
];
