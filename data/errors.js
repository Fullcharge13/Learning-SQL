// 오류 설명 표 (설계 §4-6). 두억이 말투: 친근한 해요체에 반말이 조금 섞임. 꾸짖지 않고, 정답은 알려 주지 않는다.
// 키는 SQLite 오류 문장의 앞부분(또는 엔진이 주는 짧은 이름). explain()이 위에서부터 차례로 맞춰 본다.
//   match: 오류 문장에 맞춰 보는 정규식. 첫 번째 괄호 묶음이 있으면 {name} 자리에 들어간다.
//   body: 기본 말투, detective: 탐정 의상(outfit id "detective", 판정 R14)일 때의 말투.
// 자리: {name} 문제가 된 열·표·함수·글자 이름(못 찾으면 「그 이름」), {i} 「(이)라는」의 「이」, {eun} 은/는.
//   {i}·{eun}은 explain()이 이름의 받침에 맞춰 채운다(src/shuffle.js hasBatchim).
// 여는 말은 고루 바꾼다(「이거 봐요」만 되풀이하지 않게 — 시험 grade.test.js).
// match의 문장은 sql.js 1.15.2(SQLite)가 실제로 내는 문장이다(작업 10에서 장터 데이터로 뽑아 확인).

export const FALLBACK = "SQL 문장 어딘가가 어긋났어. 카드 순서를 다시 살펴볼까?";
export const DETECTIVE_ID = "detective";

export const ERRORS = {
  "no such column": {
    match: /^no such column: (.+)$/,
    body: "이거 봐요, '{name}'{i}라는 열은 이 표에 없어. 철자가 다르거나 다른 표의 열일지도 몰라요. 표 옆의 열 이름을 한 번 살펴볼까?",
    detective: "흠, '{name}'{i}라는 열은 현장 어디에도 없어요. 철자가 한 글자 바뀌었거나 다른 표의 열일 수 있어요. 열 목록과 대조해 봐요.",
  },
  "no such table": {
    match: /^no such table: (.+)$/,
    body: "어라, '{name}'{i}라는 표는 장터에 없어. 표 이름이 맞는지, FROM 뒤에 알맞은 표 카드를 놓았는지 볼까?",
    detective: "'{name}'{i}라는 표는 장부 어디에도 기록이 없어요. 표 이름의 철자와 FROM 뒤의 카드를 다시 확인해 봐요.",
  },
  // GROUP BY 안의 COUNT·SUM: 「aggregate functions are not allowed in the GROUP BY clause」
  "aggregate in GROUP BY": {
    match: /^aggregate functions are not allowed in the GROUP BY clause/,
    body: "잠깐, GROUP BY 뒤에는 묶을 열을 놓아요. COUNT나 SUM 같은 셈 함수는 묶은 다음에 세는 거라 그 자리엔 못 와. SELECT 쪽으로 옮겨 볼까?",
    detective: "GROUP BY 자리에 셈 함수가 숨어 있어요. 묶기 전에는 아직 셀 수 없으니, 묶을 열만 남기고 셈 함수는 SELECT로 보내 봐요.",
  },
  "misuse of aggregate": {
    // WHERE 안, JOIN … ON 안, 셈 함수 안의 셈 함수(SUM(COUNT(*))) 모두 같은 문장이라 자리를 단정하지 않는다
    match: /^misuse of aggregate/,
    body: "음, 묶어서 세는 함수(COUNT, SUM 같은 것)가 놓을 수 없는 자리에 있어. 묶기 전 단계나 다른 셈 함수 안에서는 못 써. 묶은 뒤의 조건이면 HAVING, 아니면 SELECT 쪽을 볼까?",
    detective: "묶어서 세는 함수가 엉뚱한 자리에 숨어 있어요. 묶기 전 단계나 다른 셈 함수 안에서는 쓸 수 없어요. 어느 자리에 놓였는지 따라가 봐요.",
  },
  // 같은 SELECT의 창 함수 별칭을 WHERE·GROUP BY·HAVING에서 부르면(WHERE rk = 1, 14장 / WHERE running > 300, 15장)
  // 「misuse of aliased window function rk」. {name}이 함수가 아니라 열 별칭이라 「'rk' 같은 창 함수」로 읽히지 않게 따로 둔다(작업 15b).
  // 아래 「misuse of window function」보다 먼저 맞춰 본다.
  "aliased window function": {
    match: /^misuse of aliased window function (\w+)/,
    body: "엇, 창 함수 결과({name})는 행을 다 고른 다음에야 생겨. 그래서 같은 SELECT의 WHERE·GROUP BY·HAVING에서는 아직 부를 수 없어. WITH로 한 번 감싸고 바깥에서 걸러 볼까?",
    detective: "창 함수 결과({name})가 아직 태어나기 전 구역에서 불렸어요. 같은 SELECT의 WHERE·GROUP BY·HAVING에는 그 열이 없어요. WITH로 먼저 결과를 만들고 바깥에서 걸러 봐요.",
  },
  // OVER가 붙은 창 함수를 WHERE·GROUP BY 등에 바로 놓거나, OVER를 빠뜨림(ROW_NUMBER() AS rn, LAG(price) AS p):
  // 「misuse of window function ROW_NUMBER()」, 「misuse of window function LAG()」
  "misuse of window function": {
    match: /^misuse of window function (\w+)/,
    body: "엇, '{name}' 같은 창 함수는 OVER (…)와 짝을 지어 SELECT나 ORDER BY에서만 쓸 수 있어. OVER가 빠졌는지, 조건 자리에 놓였는지 볼까? 조건으로 거르려면 WITH로 한 번 감싸고!",
    detective: "'{name}' 창 함수가 출입 금지 구역에 들어갔어요. 이 함수는 OVER (…)와 함께 SELECT·ORDER BY에서만 움직여요. OVER가 빠졌는지, 조건 자리에 있는지 확인해 봐요.",
  },
  // 「wrong number of arguments to function SUBSTR()」
  "wrong number of arguments": {
    match: /^wrong number of arguments to function (\w+)/,
    body: "앗, '{name}' 함수 괄호 안에 넣은 값의 개수가 맞지 않아. 쉼표로 나눈 값이 몇 개 필요한지 다시 세어 볼까?",
    detective: "'{name}' 함수에 건넨 증거의 개수가 맞지 않아요. 괄호 안 쉼표로 나뉜 값을 하나씩 세어 봐요.",
  },
  // 「1st ORDER BY term out of range - should be between 1 and 2」, 「… does not match any column in the result set」
  "ORDER BY term": {
    match: /ORDER BY term/,
    body: "흠, ORDER BY 뒤에 놓은 것이 결과의 어느 열인지 모르겠대. 숫자라면 SELECT에 놓은 열 개수 안이어야 해. 정렬할 열을 다시 볼까?",
    detective: "ORDER BY 뒤의 단서가 결과 표의 어느 열과도 맞지 않아요. 번호라면 SELECT의 열 개수를 넘지 않았는지 확인해 봐요.",
  },
  // 「1st GROUP BY term out of range - should be between 1 and 1」
  "GROUP BY term": {
    match: /GROUP BY term/,
    body: "어디 보자, GROUP BY 뒤에 놓은 것이 열 번호나 열 이름으로 읽히지 않아. 숫자라면 SELECT에 놓은 열 개수 안이어야 해. 묶을 열이 맞는지 볼까?",
    detective: "GROUP BY 뒤의 단서가 어느 열과도 맞지 않아요. 묶으려는 열의 이름이나 번호를 다시 확인해 봐요.",
  },
  // IN (SELECT a, b …) 처럼 열 하나가 와야 할 곳에 여러 열: 「sub-select returns 2 columns - expected 1」
  "sub-select columns": {
    match: /^sub-select returns \d+ columns/,
    body: "아, 괄호 안 SELECT가 열을 여러 개 돌려줘서 비교할 수가 없대. 그 자리에는 열 하나만 고르는 SELECT가 와야 해. 괄호 안 열을 하나로 줄여 볼까?",
    detective: "괄호 안 SELECT가 용의자를 여러 열이나 데려왔어요. 비교하는 자리에는 열 하나만 필요해요. 괄호 안 SELECT 뒤의 열을 줄여 봐요.",
  },
  // = (SELECT a, b …) 비교: 「row value misused」
  "row value misused": {
    match: /^row value misused/,
    body: "음, 값 하나와 비교할 자리에 여러 값이 묶여 들어왔어. 괄호 안 SELECT가 열 하나만 돌려주는지 볼까?",
    detective: "값 하나와 맞대야 할 자리에 여러 값이 한 묶음으로 들어왔어요. 괄호 안 SELECT의 열이 하나인지 확인해 봐요.",
  },
  // UNION·UNION ALL 양쪽 SELECT의 열 개수가 다름: 「SELECTs to the left and right of UNION do not have the same number of result columns」
  "UNION columns": {
    match: /^SELECTs to the left and right of UNION/,
    body: "어라, UNION 위아래 SELECT가 고른 열의 개수가 달라. 행을 아래로 쌓으려면 양쪽 열 개수가 같아야 해. 두 SELECT 뒤의 열을 하나씩 세어 볼까?",
    detective: "UNION 위아래 증거의 열 개수가 맞지 않아요. 행을 쌓으려면 양쪽 SELECT의 열이 같은 수여야 해요. 열을 하나씩 대조해 봐요.",
  },
  // 1장에서 가장 흔한 오류: 「SELECT *」까지만 놓고 실행하면 「no tables specified」(마지막 전체 검수)
  "no tables specified": {
    match: /^no tables specified/,
    body: "좋아, 거의 다 왔어! 그런데 FROM 뒤에 어느 표를 볼지 놓아 볼까? *은 표가 있어야 그 표의 모든 열이 돼요.",
    detective: "무엇을 볼지는 정했는데, 어느 장부를 펼칠지가 빠졌어요. FROM 카드와 그 뒤의 표 카드를 찾아봐요.",
  },
  "syntax error": {
    match: /^near "(.*)": syntax error/,
    body: "이거 봐요, '{name}' 근처에서 문장이 막혔어. 카드 순서가 맞는지, 빠진 카드는 없는지 앞뒤를 살펴볼까?",
    detective: "'{name}' 근처에서 문장의 흐름이 끊겼어요. 그 앞뒤 카드의 순서와 빠진 카드가 없는지 현장을 훑어봐요.",
  },
  "ambiguous column name": {
    match: /^ambiguous column name: (.+)$/,
    body: "어라라, '{name}'{eun} 두 표에 다 있어서 어느 쪽인지 모르겠대. 표 이름을 앞에 붙여 구분해 볼까?",
    detective: "'{name}'{i}라는 열이 두 표에 모두 있어 용의자가 둘이에요. 표 이름을 앞에 붙여 누구인지 가려내 봐요.",
  },
  "incomplete input": {
    match: /^incomplete input/,
    body: "어, 문장이 아직 끝나지 않은 것 같아. 괄호를 열고 닫았는지, 마지막에 필요한 카드가 빠졌는지 볼까?",
    detective: "문장이 중간에서 끊겨 있어요. 열린 괄호가 닫혔는지, 마지막 카드가 빠지지 않았는지 확인해 봐요.",
  },
  "no such function": {
    match: /^no such function: (.+)$/,
    body: "어이쿠, '{name}'{i}라는 함수는 SQLite에 없어. 함수 이름의 철자를 다시 살펴볼까?",
    detective: "'{name}'{i}라는 함수는 수배 명단에 없어요. 철자가 한 글자 바뀌었는지 대조해 봐요.",
  },
  "read-only": {
    match: /^read-only/,
    body: "여기서는 조회만 할 수 있어요. SELECT나 WITH로 시작하는 문장 하나만 만들어 볼까?",
    detective: "이 현장에서는 보기만 하고 건드릴 수 없어요. SELECT나 WITH로 시작하는 문장 하나만 만들어 봐요.",
  },
  timeout: {
    match: /^timeout/,
    body: "이거 봐요, 너무 오래 걸려서 멈췄어. 표를 이을 때 짝을 맞추는 조건(ON)이 빠지지 않았는지 볼까?",
    detective: "수사가 너무 길어져서 중단했어요. 표를 잇는 조건(ON)이 빠져 모든 경우를 뒤지고 있는 건 아닐까요?",
  },
  // v0.1.1: 느린 기기에서 10초로 다시 돌려도 끝나지 않음(src/slowdevice.js). 학습자 탓이 아니라 세지 않는다
  busy: {
    match: /^busy/,
    body: "휴대폰이 좀 바빠서 오래 걸렸어요. 잠시 뒤 다시 눌러 볼까요? 혹시 표를 잇는 조건(ON)이 빠지진 않았는지도 한번 봐요.",
    detective: "현장이 붐벼서 수사가 늦어졌어요. 숨을 고르고 잠시 뒤에 다시 조사해 봐요. 혹시 표를 잇는 조건(ON)이 빠지진 않았는지도 한번 살펴봐요.",
  },
  worker: {
    match: /^worker/,
    body: "앗, 실행기가 잠깐 멈췄어. 잠시 뒤에 다시 눌러 볼까?",
    detective: "수사 장비가 잠시 멈췄어요. 잠시 뒤에 다시 가동해 봐요.",
  },
  load: {
    match: /^load/,
    body: "아직 실행기를 못 받았어요. 인터넷 연결을 확인하고 다시 해 볼까?",
    detective: "수사 장비를 아직 못 받았어요. 인터넷 연결을 확인하고 다시 시도해 봐요.",
  },
};
