// 개념 목록 (설계 §4-1·§6). 문제의 concept 칸과 취약 개념 집계(weak_concepts, review_queue), 복습 문제 고르기,
// 매일 도전 틀의 concept 칸에 쓴다. 화면(홈 「복습할 개념」, 배지 화면 「약한 개념」)에는 name이 보인다.
//
// - chapter: 그 개념을 처음 배우는 장. 레슨·틀은 자기 장 이하의 개념만 쓸 수 있다(tests/content.js `shape`).
// - id는 바꾸지 않는다(학습자 저장의 weak_concepts·review_queue에 남음). 새 개념은 더하기만 한다.
// - 뒤 장 레슨이 앞 장 개념을 다시 써도 된다(예: 10장 조인 문제에 where). 같은 것을 가르치면 같은 id를 쓴다.
// - 심화 개념(advanced: true)은 심화 레슨(N-A1~N-A3, 장 파일의 ADVANCED)에서만 쓴다. 본 과정 레슨·매일 도전 틀은 쓰지 못한다
//   (tests/content.js `shape`). 심화 레슨은 자기 장 이하의 본 과정 개념도 함께 쓸 수 있다. 장마다 응용(A3) 개념 adv_apply_N.
// - name은 화면 한 줄에 들어가게 짧게(16자 안팎). SQL 낱말은 대문자 그대로 쓴다.
export const CONCEPTS = [
  // 1장 장터 장부 펼치기
  { id: "table", name: "표(장부) 읽기", chapter: 1 },
  { id: "rowcol", name: "행과 열", chapter: 1 },
  { id: "selectall", name: "SELECT * FROM", chapter: 1 },
  { id: "market", name: "장터의 다섯 표", chapter: 1 },
  // 2장 원하는 칸만
  { id: "columns", name: "열 골라 보기", chapter: 2 },
  { id: "alias", name: "AS로 열 이름 붙이기", chapter: 2 },
  { id: "calc", name: "계산 열", chapter: 2 },
  // 3장 조건으로 거르기
  { id: "where", name: "WHERE로 거르기", chapter: 3 },
  { id: "compare", name: "비교 연산", chapter: 3 },
  { id: "textval", name: "글자 값 비교", chapter: 3 },
  // 4장 여러 조건
  { id: "andor", name: "AND·OR로 조건 묶기", chapter: 4 },
  { id: "not", name: "NOT으로 뒤집기", chapter: 4 },
  { id: "in", name: "IN으로 여러 값 고르기", chapter: 4 },
  { id: "between", name: "BETWEEN으로 범위", chapter: 4 },
  { id: "like", name: "LIKE로 글자 찾기", chapter: 4 },
  // 5장 줄 세우기
  { id: "orderby", name: "ORDER BY로 줄 세우기", chapter: 5 },
  { id: "limit", name: "LIMIT·OFFSET", chapter: 5 },
  { id: "distinct", name: "DISTINCT로 겹침 없애기", chapter: 5 },
  // 6장 빈칸 다루기
  { id: "null", name: "NULL(빈칸) 이해", chapter: 6 },
  { id: "isnull", name: "IS NULL로 빈칸 찾기", chapter: 6 },
  { id: "coalesce", name: "COALESCE로 빈칸 채우기", chapter: 6 },
  // 7장 모아 세기
  { id: "count", name: "COUNT로 세기", chapter: 7 },
  { id: "sumavg", name: "SUM·AVG 합과 평균", chapter: 7 },
  { id: "minmax", name: "MIN·MAX", chapter: 7 },
  // 8장 묶어서 세기
  { id: "groupby", name: "GROUP BY로 묶기", chapter: 8 },
  { id: "having", name: "HAVING으로 묶음 거르기", chapter: 8 },
  // 9장 값 바꿔 보기
  { id: "case", name: "CASE WHEN으로 나누기", chapter: 9 },
  { id: "strfunc", name: "글자 함수", chapter: 9 },
  { id: "numfunc", name: "숫자 함수·CAST", chapter: 9 },
  // 10장 표 잇기 ①
  { id: "join", name: "INNER JOIN", chapter: 10 },
  { id: "joinkey", name: "ON으로 짝 맞추기", chapter: 10 },
  // 11장 표 잇기 ②
  { id: "leftjoin", name: "LEFT JOIN", chapter: 11 },
  { id: "multijoin", name: "여러 표 잇기", chapter: 11 },
  { id: "unmatched", name: "짝 없는 행 찾기", chapter: 11 },
  // 12장 질문 속 질문
  { id: "subin", name: "IN (SELECT …)", chapter: 12 },
  { id: "subvalue", name: "값 하나 서브쿼리", chapter: 12 },
  { id: "exists", name: "EXISTS", chapter: 12 },
  // 13장 중간 표 만들기
  { id: "with", name: "WITH로 중간 표", chapter: 13 },
  { id: "fromsub", name: "FROM 안 서브쿼리", chapter: 13 },
  { id: "union", name: "UNION으로 합치기", chapter: 13 },
  // 14장 줄마다 순위
  { id: "rownumber", name: "ROW_NUMBER", chapter: 14 },
  { id: "rank", name: "RANK·DENSE_RANK", chapter: 14 },
  { id: "partition", name: "PARTITION BY", chapter: 14 },
  // 15장 누적과 이웃 줄
  { id: "running", name: "누적 합", chapter: 15 },
  { id: "laglead", name: "LAG·LEAD 이웃 줄", chapter: 15 },
  { id: "moving", name: "이동 평균", chapter: 15 },
  // 16장 날짜와 시계열
  { id: "datefunc", name: "date·strftime", chapter: 16 },
  { id: "monthly", name: "월별로 묶기", chapter: 16 },
  { id: "change", name: "지난달 대비 증감", chapter: 16 },
  // 17장 장터 분석 실전
  { id: "cohort", name: "코호트 재방문율", chapter: 17 },
  { id: "basket", name: "함께 산 물건", chapter: 17 },
  { id: "analysis", name: "종합 분석", chapter: 17 },
  // ---- 심화 (v0.2, 설계 「심화 1~6장」 §2·§3) ----
  // 1장 심화
  { id: "adv_select_value", name: "FROM 없이 값 보기", chapter: 1, advanced: true },
  { id: "adv_comment", name: "주석 달기(--)", chapter: 1, advanced: true },
  { id: "adv_apply_1", name: "다섯 장부 탐험", chapter: 1, advanced: true },
  // 2장 심화
  { id: "adv_paren_calc", name: "괄호로 계산 순서", chapter: 2, advanced: true },
  { id: "adv_mod", name: "% 나머지", chapter: 2, advanced: true },
  { id: "adv_apply_2", name: "할인 가격표", chapter: 2, advanced: true },
  // 3장 심화
  { id: "adv_col_compare", name: "열끼리 비교", chapter: 3, advanced: true },
  { id: "adv_text_range", name: "글자·날짜 범위 비교", chapter: 3, advanced: true },
  { id: "adv_apply_3", name: "재고 점검표", chapter: 3, advanced: true },
  // 4장 심화
  { id: "adv_not_paren", name: "NOT과 괄호 위치", chapter: 4, advanced: true },
  { id: "adv_like_mix", name: "LIKE 무늬 섞기", chapter: 4, advanced: true },
  { id: "adv_apply_4", name: "손님 찾기 의뢰", chapter: 4, advanced: true },
  // 5장 심화
  { id: "adv_sort_expr", name: "계산값·별칭으로 정렬", chapter: 5, advanced: true },
  { id: "adv_offset_page", name: "OFFSET 쪽 나누기", chapter: 5, advanced: true },
  { id: "adv_apply_5", name: "값으로 N번째 찾기", chapter: 5, advanced: true },
  // 6장 심화
  { id: "adv_coalesce_where", name: "COALESCE 거르기·정렬", chapter: 6, advanced: true },
  { id: "adv_nullif", name: "NULLIF", chapter: 6, advanced: true },
  { id: "adv_apply_6", name: "빈칸 점검", chapter: 6, advanced: true },
];
