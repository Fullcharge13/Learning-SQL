// 장마다 새로 배우는 SQL 낱말 (설계 §6 「배우는 것」, §10 ⑤). 레슨 점검기(tests/content.js)의 `grammar` 규칙이 쓴다.
//
// - GRAMMAR[n]: n장에서 **새로** 배우는 낱말(대문자). 레슨은 1~n장 낱말만 쓸 수 있다(누적).
// - UNTAUGHT: 이번 판에서 가르치지 않는 낱말. 어느 장에서도 쓰면 안 된다(필요하면 알맞은 장으로 옮긴다).
// - 점검기는 SQL 글자를 글자 상수('…')·따옴표 이름·주석 바깥에서 낱말로 자르고, 그 낱말이 SQL_WORDS(아래 두 표의 합)에
//   있을 때만 검사한다. 표·열·별칭 이름, 숫자, 연산 기호(* + - / = < > || 등)는 검사하지 않는다.
// - 흔한 별칭 이름이 될 만한 낱말(TOTAL, FIRST, LAST, TIME …)은 일부러 넣지 않았다(별칭을 잘못 막지 않게).
// - 데이터를 바꾸는 낱말(INSERT·UPDATE·DELETE·CREATE·DROP·ALTER …)은 여기가 아니라 점검기의 `readonly` 규칙이 막는다.
export const GRAMMAR = {
  // 1장 장터 장부 펼치기: 표·행·열, SELECT * FROM (* 는 기호라 검사하지 않음)
  1: ["SELECT", "FROM"],
  // 2장 원하는 칸만: 열 고르기, AS, 계산 열(+ - * / 는 기호)
  2: ["AS"],
  // 3장 조건으로 거르기: WHERE, 비교 연산(= <> != < > <= >= 는 기호), 글자 값
  3: ["WHERE"],
  // 4장 여러 조건: AND·OR·NOT, IN, BETWEEN, LIKE
  4: ["AND", "OR", "NOT", "IN", "BETWEEN", "LIKE"],
  // 5장 줄 세우기: ORDER BY(ASC·DESC), LIMIT(OFFSET은 「N번째로 비싼 것」 유형용), DISTINCT
  5: ["ORDER", "BY", "ASC", "DESC", "LIMIT", "OFFSET", "DISTINCT"],
  // 6장 빈칸 다루기: NULL, IS NULL(IS NOT NULL의 NOT은 4장), COALESCE(IFNULL은 같은 일을 하는 SQLite 이름)
  6: ["NULL", "IS", "COALESCE", "IFNULL"],
  // 7장 모아 세기: COUNT·SUM·AVG·MIN·MAX
  7: ["COUNT", "SUM", "AVG", "MIN", "MAX"],
  // 8장 묶어서 세기: GROUP BY(BY는 5장), HAVING
  8: ["GROUP", "HAVING"],
  // 9장 값 바꿔 보기: CASE WHEN, 글자·숫자 함수(ROUND, LENGTH, UPPER, || 는 기호) + 짝 함수(LOWER, SUBSTR, REPLACE, TRIM, ABS),
  //    나눗셈을 실수로 하려고 CAST(x AS REAL)
  9: ["CASE", "WHEN", "THEN", "ELSE", "END", "ROUND", "LENGTH", "UPPER", "LOWER", "SUBSTR", "REPLACE", "TRIM", "ABS",
    "CAST", "INTEGER", "REAL", "TEXT"],
  // 10장 표 잇기 ①: INNER JOIN … ON
  10: ["JOIN", "INNER", "ON"],
  // 11장 표 잇기 ②: LEFT JOIN(LEFT OUTER JOIN), 여러 표 잇기, 짝 없는 행
  11: ["LEFT", "OUTER"],
  // 12장 질문 속 질문: 서브쿼리 IN (SELECT …)·값 하나 서브쿼리는 이미 배운 낱말로 쓴다. EXISTS만 새로
  12: ["EXISTS"],
  // 13장 중간 표 만들기: WITH, FROM 안 서브쿼리(새 낱말 없음), UNION(UNION ALL)
  13: ["WITH", "UNION", "ALL"],
  // 14장 줄마다 순위: ROW_NUMBER·RANK·DENSE_RANK, OVER (PARTITION BY …)
  14: ["OVER", "PARTITION", "ROW_NUMBER", "RANK", "DENSE_RANK"],
  // 15장 누적과 이웃 줄: SUM() OVER (ORDER BY …), LAG·LEAD, 이동 평균(ROWS BETWEEN n PRECEDING AND CURRENT ROW;
  //     BETWEEN·AND는 4장)
  15: ["LAG", "LEAD", "ROWS", "PRECEDING", "FOLLOWING", "CURRENT", "ROW", "UNBOUNDED"],
  // 16장 날짜와 시계열: date()·strftime(), 날짜 차이(julianday)
  16: ["DATE", "STRFTIME", "JULIANDAY"],
  // 17장 장터 분석 실전: 새 낱말 없음(코호트·함께 산 물건·종합 문제는 앞 장 낱말로)
  17: [],
};

// 이번 판에서 가르치지 않는 낱말(어느 장에서도 오류). 시각이 바뀌면 결과가 바뀌는 것(CURRENT_DATE, RANDOM …)도 여기.
export const UNTAUGHT = [
  // 조인·집합의 다른 모양
  "RIGHT", "FULL", "CROSS", "NATURAL", "USING", "INTERSECT", "EXCEPT", "RECURSIVE", "VALUES",
  // 창 함수·틀의 다른 모양
  "RANGE", "GROUPS", "EXCLUDE", "WINDOW", "FILTER", "NTILE", "FIRST_VALUE", "LAST_VALUE", "NTH_VALUE",
  "PERCENT_RANK", "CUME_DIST",
  // 비교·정렬의 다른 모양
  "GLOB", "REGEXP", "MATCH", "ESCAPE", "COLLATE", "NOCASE", "NULLS", "ISNULL", "NOTNULL",
  // 함수
  "GROUP_CONCAT", "IIF", "INSTR", "PRINTF", "FORMAT", "TYPEOF", "HEX", "QUOTE", "CHAR", "UNICODE",
  "DATETIME", "UNIXEPOCH", "TIMEDIFF", "NUMERIC",
  // 시각·난수(돌릴 때마다 결과가 바뀜)
  "RANDOM", "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP",
  // 숨은 행 번호(표를 다시 만들면 값이 바뀜)
  "ROWID", "OID", "_ROWID_",
];

// 낱말이 아닌 문법 모양 → 처음 배우는 장. 점검기가 기호·괄호 모양을 보고 GRAMMAR와 같은 방식으로 막는다.
//   "*"는 1장 SELECT *와 곱하기가 같은 기호라 검사하지 않는다.
export const FORMS = {
  "+": 2, "-": 2, "/": 2,                                      // 2장 계산 열(나머지 %는 2장 심화 전용, ADVANCED_GRAMMAR)
  "=": 3, "<": 3, ">": 3, "<=": 3, ">=": 3, "<>": 3, "!=": 3,  // 3장 비교 연산
  "||": 9,                                                     // 9장 글자 잇기
  "(SELECT": 12,                                               // 12장 서브쿼리(괄호 안 SELECT)
  "FROM (SELECT": 13,                                          // 13장 FROM 안 서브쿼리
};

// 심화 전용 낱말·모양 (v0.2, 설계 「심화 1~6장」 §3-1). ADVANCED_GRAMMAR[n]: n장 심화 레슨(N-A1~N-A3)에서만 새로 쓰는 것.
// - 심화 레슨(n장)이 쓸 수 있는 것 = GRAMMAR[1..n] + ADVANCED_GRAMMAR[n]. 앞 장 심화 낱말은 쓰지 않는다(심화는 골라 듣는 것이라
//   2장 심화를 건너뛴 학습자도 3장 심화를 연다).
// - 본 과정 레슨·매일 도전 틀은 여기 낱말을 쓰지 못한다(그 낱말이 GRAMMAR의 그 장 이하에도 있을 때만 됨).
// - 낱말(NULLIF)과 기호 모양(%, 주석 --)이 섞여 있다. 점검기(tests/content.js)는
//   낱말은 SQL_WORDS처럼, %는 FORMS처럼(글자 상수 바깥의 기호), --는 주석이 있는지로 본다. 블록 주석 /* */은 어디서도 가르치지 않는다.
// - 이미 본 과정에서 가르친 것은 넣지 않는다(예: OFFSET은 GRAMMAR[5]).
// 3·4·5장 심화는 새 낱말 없이 모양만(열끼리 비교, NOT ( … ), LIKE 무늬 섞기, ASC·DESC 섞기). 작업 2의 조사로 확정.
export const ADVANCED_GRAMMAR = {
  1: ["--"],       // 1장 심화 A2 주석 달기
  2: ["%"],        // 2장 심화 A2 나머지(짝수·홀수)
  3: [],
  4: [],
  5: [],
  6: ["NULLIF"],   // 6장 심화 A2
};

/** 심화 전용 낱말·모양 → 그 장 */
export const ADVANCED_CHAPTER = Object.freeze(Object.fromEntries(
  Object.entries(ADVANCED_GRAMMAR).flatMap(([ch, words]) => words.map((w) => [w, Number(ch)])),
));

export const SQL_WORDS = new Set([...Object.values(GRAMMAR).flat(), ...UNTAUGHT,
  ...Object.values(ADVANCED_GRAMMAR).flat().filter((w) => /^[A-Z_]+$/.test(w))]);

/** 낱말 → 처음 배우는 장(가르치지 않는 낱말은 없음) */
export const WORD_CHAPTER = Object.freeze(Object.fromEntries(
  Object.entries(GRAMMAR).flatMap(([ch, words]) => words.map((w) => [w, Number(ch)])),
));
