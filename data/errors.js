// 오류 설명 표 (설계서 4-6). 두억이 말투: 친근한 해요체에 반말이 조금 섞임. 꾸짖지 않고, 정답은 알려 주지 않는다.
// 키는 SQLite 오류 문장의 앞부분(또는 엔진이 주는 짧은 이름). explain()이 위에서부터 차례로 맞춰 본다.
//   match: 오류 문장에 맞춰 보는 정규식. 첫 번째 괄호 묶음이 있으면 {name} 자리에 들어간다.
//   body: 기본 말투, detective: 탐정 의상(outfit id "detective")일 때의 말투.
// {name}: 문제가 된 열·표·함수·글자 이름. 이름을 못 찾으면 「그 이름」으로 바뀐다.

export const FALLBACK = "SQL 문장 어딘가가 어긋났어. 카드 순서를 다시 살펴볼까?";
export const DETECTIVE_ID = "detective";

export const ERRORS = {
  "no such column": {
    match: /^no such column: (.+)$/,
    body: "이거 봐요, '{name}'라는 열은 이 표에 없어. 철자가 다르거나 다른 표의 열일지도 몰라요. 표 옆의 열 이름을 한 번 살펴볼까?",
    detective: "흠, '{name}'라는 열은 현장 어디에도 없어요. 철자가 한 글자 바뀌었거나 다른 표의 열일 수 있어요. 열 목록과 대조해 봐요.",
  },
  "no such table": {
    match: /^no such table: (.+)$/,
    body: "이거 봐요, '{name}'라는 표는 장터에 없어. 표 이름이 맞는지, FROM 뒤에 알맞은 표 카드를 놓았는지 볼까?",
    detective: "'{name}'라는 표는 장부 어디에도 기록이 없어요. 표 이름의 철자와 FROM 뒤의 카드를 다시 확인해 봐요.",
  },
  "misuse of aggregate": {
    match: /^misuse of aggregate/,
    body: "이거 봐요, 묶어서 세는 함수(COUNT, SUM 같은 것)는 놓을 수 없는 자리에 있어. WHERE 대신 HAVING에 놓는 건 어떨까?",
    detective: "묶어서 세는 함수가 엉뚱한 자리에 숨어 있어요. 조건 단계(WHERE)에서는 아직 묶기 전이라 쓸 수 없어요. 어느 단계에 놓였는지 따라가 봐요.",
  },
  "syntax error": {
    match: /^near "(.*)": syntax error/,
    body: "이거 봐요, '{name}' 근처에서 문장이 막혔어. 카드 순서가 맞는지, 빠진 카드는 없는지 앞뒤를 살펴볼까?",
    detective: "'{name}' 근처에서 문장의 흐름이 끊겼어요. 그 앞뒤 카드의 순서와 빠진 카드가 없는지 현장을 훑어봐요.",
  },
  "ambiguous column name": {
    match: /^ambiguous column name: (.+)$/,
    body: "이거 봐요, '{name}'는 두 표에 다 있어서 어느 쪽인지 모르겠대. 표 이름을 앞에 붙여 구분해 볼까?",
    detective: "'{name}'라는 열이 두 표에 모두 있어 용의자가 둘이에요. 표 이름을 앞에 붙여 누구인지 가려내 봐요.",
  },
  "incomplete input": {
    match: /^incomplete input/,
    body: "이거 봐요, 문장이 아직 끝나지 않은 것 같아. 괄호를 열고 닫았는지, 마지막에 필요한 카드가 빠졌는지 볼까?",
    detective: "문장이 중간에서 끊겨 있어요. 열린 괄호가 닫혔는지, 마지막 카드가 빠지지 않았는지 확인해 봐요.",
  },
  "no such function": {
    match: /^no such function: (.+)$/,
    body: "이거 봐요, '{name}'라는 함수는 SQLite에 없어. 함수 이름의 철자를 다시 살펴볼까?",
    detective: "'{name}'라는 함수는 수배 명단에 없어요. 철자가 한 글자 바뀌었는지 대조해 봐요.",
  },
  "GROUP BY term": {
    match: /GROUP BY term/,
    body: "이거 봐요, GROUP BY 뒤에 놓은 것이 열 번호나 열 이름으로 읽히지 않아. 묶을 열이 맞는지 볼까?",
    detective: "GROUP BY 뒤의 단서가 어느 열과도 맞지 않아요. 묶으려는 열의 이름이나 번호를 다시 확인해 봐요.",
  },
  "read-only": {
    match: /^read-only/,
    body: "이거 봐요, 여기서는 조회만 할 수 있어. SELECT나 WITH로 시작하는 문장 하나만 써 볼까?",
    detective: "이 현장에서는 보기만 하고 건드릴 수 없어요. SELECT나 WITH로 시작하는 문장 하나만 사용해 봐요.",
  },
  timeout: {
    match: /^timeout/,
    body: "이거 봐요, 너무 오래 걸려서 멈췄어. 표를 이을 때 짝을 맞추는 조건(ON)이 빠지지 않았는지 볼까?",
    detective: "수사가 너무 길어져서 중단했어요. 표를 잇는 조건(ON)이 빠져 모든 경우를 뒤지고 있는 건 아닐까요?",
  },
  worker: {
    match: /^worker/,
    body: "이거 봐요, 실행기가 잠깐 멈췄어. 잠시 뒤에 다시 눌러 볼까?",
    detective: "수사 장비가 잠시 멈췄어요. 잠시 뒤에 다시 가동해 봐요.",
  },
  load: {
    match: /^load/,
    body: "이거 봐요, 실행기를 아직 못 받았어. 인터넷 연결을 확인하고 다시 해 볼까?",
    detective: "수사 장비를 아직 못 받았어요. 인터넷 연결을 확인하고 다시 시도해 봐요.",
  },
};
