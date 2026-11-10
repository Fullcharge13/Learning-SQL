// 「두억이의 가게」(v0.3) 데이터: 수치 시작값은 모두 여기 한 곳에 둔다(설계 docs/specs/2026-11-11-두억이의-가게-설계.md).
// 시뮬레이션으로 값을 바꾸면 LOG에 전후 표로 남긴다. 이름·마을은 새로 지은 것으로 실존·민속 인물이 아니다.

// --- 상수 ---
export const START_MONEY = 100;     // 시작 돈(냥)
export const CRATE = 10;            // 한 상자 = 10개
export const STOCK_MAX = 30;        // 물건 하나의 재고 한도
export const CART_FEE = 2;          // 수레 삯(냥)
export const CART_FEE_BIG = 1;      // 큰 수레를 산 뒤
export const SHELF = 4;             // 진열대 칸
export const SHELF_BIG = 6;         // 넓은 진열대
export const REGULARS = 20;         // 단골 수
export const REGULARS_BIG = 30;     // 단골 늘리기 뒤
export const SIGN_BONUS = 2;        // 간판: 손님 +2
export const DISCOUNT = 0.8;        // 할인: 값 × 0.8
export const DISCOUNT_POP = 1.6;    // 할인: 인기 × 1.6
export const TREND_POP = 2;         // 오늘의 인기: 인기 × 2
export const TREND_DAYS = 3;        // 오늘의 인기는 3일마다 바뀜
export const KEEP_DAYS = 3;         // 장부에 두는 주문: 최근 3일
export const LOG_DAYS = 7;          // 저장해 두는 하루 기록: 최근 7일
export const MONEY_MAX = 999999;    // 돈 상한
export const UNLOCK_CHAPTER = 3;    // 가게는 3장 평가를 통과하면 열림

// --- 물건 (설계 §2-1). 7·8은 성장 「새 물건」으로 들어오며 값이 빈칸(price:null), std는 「값 매기기」가 매기는 표준값 ---
export const ITEMS = [
  { item_id: 1, name: "인절미", category: "먹거리", price: 6, cost: 3, stock: 6, pop: 5 },
  { item_id: 2, name: "약과", category: "먹거리", price: 9, cost: 5, stock: 4, pop: 4 },
  { item_id: 3, name: "식혜", category: "먹거리", price: 5, cost: 2, stock: 8, pop: 6 },
  { item_id: 4, name: "엿", category: "먹거리", price: 4, cost: 2, stock: 10, pop: 3 },
  { item_id: 5, name: "짚신", category: "잡화", price: 12, cost: 7, stock: 3, pop: 2 },
  { item_id: 6, name: "부채", category: "잡화", price: 10, cost: 6, stock: 5, pop: 2 },
  { item_id: 7, name: "꿀떡", category: "먹거리", price: null, std: 8, cost: 4, stock: 10, pop: 4, upgrade: "newitems" },
  { item_id: 8, name: "한지", category: "잡화", price: null, std: 11, cost: 5, stock: 10, pop: 2, upgrade: "newitems" },
];

// --- 단골 30명: 앞 20명이 처음 단골, 21~30은 「단골 늘리기」 뒤 ---
export const CUSTOMERS = [
  { customer_id: 1, name: "가온", kind: "사람", age: 34, village: "은행나무마을" },
  { customer_id: 2, name: "나루", kind: "사람", age: 61, village: "버드나무고개" },
  { customer_id: 3, name: "다솜", kind: "사람", age: 27, village: "달빛마을" },
  { customer_id: 4, name: "라온", kind: "사람", age: 45, village: "개울마을" },
  { customer_id: 5, name: "마루", kind: "도깨비", age: 88, village: "큰바위마을" },
  { customer_id: 6, name: "바우", kind: "도깨비", age: 52, village: "솔바위골" },
  { customer_id: 7, name: "사슬이", kind: "도깨비", age: 19, village: "큰바위마을" },
  { customer_id: 8, name: "아라", kind: "사람", age: 39, village: "개울마을" },
  { customer_id: 9, name: "자두", kind: "여우", age: 23, village: "여우고개" },
  { customer_id: 10, name: "차돌", kind: "도깨비", age: 66, village: "솔바위골" },
  { customer_id: 11, name: "카누", kind: "사람", age: 12, village: "달빛마을" },
  { customer_id: 12, name: "타래", kind: "사람", age: 58, village: "버드나무고개" },
  { customer_id: 13, name: "파랑", kind: "여우", age: 31, village: "여우고개" },
  { customer_id: 14, name: "하늘", kind: "사람", age: 47, village: "은행나무마을" },
  { customer_id: 15, name: "구슬", kind: "여우", age: 40, village: "개울마을" },
  { customer_id: 16, name: "두루", kind: "사람", age: 73, village: "달빛마을" },
  { customer_id: 17, name: "미르", kind: "도깨비", age: 29, village: "큰바위마을" },
  { customer_id: 18, name: "새봄", kind: "사람", age: 21, village: "느티나무골" },
  { customer_id: 19, name: "해든", kind: "사람", age: 36, village: "느티나무골" },
  { customer_id: 20, name: "소담", kind: "여우", age: 55, village: "여우고개" },
  { customer_id: 21, name: "이슬", kind: "사람", age: 25, village: "은행나무마을" },
  { customer_id: 22, name: "초롱", kind: "사람", age: 9, village: "개울마을" },
  { customer_id: 23, name: "한결", kind: "사람", age: 42, village: "버드나무고개" },
  { customer_id: 24, name: "다울", kind: "도깨비", age: 70, village: "솔바위골" },
  { customer_id: 25, name: "보람", kind: "사람", age: 33, village: "달빛마을" },
  { customer_id: 26, name: "나래", kind: "여우", age: 17, village: "여우고개" },
  { customer_id: 27, name: "도담", kind: "사람", age: 50, village: "느티나무골" },
  { customer_id: 28, name: "여울", kind: "사람", age: 64, village: "큰바위마을" },
  { customer_id: 29, name: "길벗", kind: "도깨비", age: 41, village: "솔바위골" },
  { customer_id: 30, name: "윤슬", kind: "사람", age: 28, village: "개울마을" },
];

// --- 성장 (설계 §4-2) ---
export const UPGRADES = [
  { id: "sign", name: "간판", desc: "손님이 하루 2명 더 와요", price: 150 },
  { id: "newitems", name: "새 물건", desc: "꿀떡과 한지가 값이 빈칸인 채로 들어와요", price: 200 },
  { id: "cart", name: "큰 수레", desc: "수레 삯이 2냥에서 1냥으로 줄어요", price: 250 },
  { id: "shelf", name: "넓은 진열대", desc: "진열 칸이 4칸에서 6칸으로 늘어요", price: 300 },
  { id: "regulars", name: "단골 늘리기", desc: "단골이 20명에서 30명으로 늘어요", price: 400 },
];

// --- 자동화 칸 (설계 §3-1). 배열 순서 = 하루의 실행 순서. frame: where = SELECT name FROM items WHERE {where},
//     order = SELECT name FROM items ORDER BY {order} LIMIT {limit}, full = 처음부터 전체 조립. kind: item = 물건 목록, number = 첫 행 첫 칸 ---
export const SLOTS = [
  { id: "pricing", name: "값 매기기", chapter: 6, frame: "where", kind: "item", desc: "값이 빈칸인 물건을 찾으면 표준값을 매겨요" },
  { id: "restock", name: "재고 채우기", chapter: 3, frame: "where", kind: "item", desc: "찾은 물건을 한 상자(10개)씩 들여와요" },
  { id: "best", name: "잘 팔린 물건 더 들이기", chapter: 8, frame: "full", kind: "item", desc: "찾은 물건을 두 상자(20개)씩 들여와요" },
  { id: "discount", name: "할인 걸기", chapter: 4, frame: "where", kind: "item", desc: "찾은 물건을 오늘 하루 2할 깎아 팔아요" },
  { id: "display", name: "진열하기", chapter: 5, frame: "order", kind: "item", desc: "결과 위에서부터 진열대 칸 수만큼 올려요" },
  { id: "report", name: "하루 보고", chapter: 7, frame: "full", kind: "number", desc: "결과의 첫 칸 값을 장부에 적어요" },
];

// --- 카드 (설계 §3-2). chapter = 그 장 평가를 통과해야 열림. kind: col 열 · op 비교 · str 글자 · num 숫자 · kw 낱말 · fn 집계 · tbl 표 이름 · punct 쉼표·괄호 ---
// 숫자 카드는 하나(num): 놓을 때 n을 정한다(0~30). 비교 값과 LIMIT 값에 같이 쓴다.
export const CARDS = [
  // 3장
  { id: "col_stock", text: "stock", chapter: 3, kind: "col" },
  { id: "col_price", text: "price", chapter: 3, kind: "col" },
  { id: "col_cost", text: "cost", chapter: 3, kind: "col" },
  { id: "col_category", text: "category", chapter: 3, kind: "col" },
  { id: "col_name", text: "name", chapter: 3, kind: "col" },
  { id: "op_lt", text: "<", chapter: 3, kind: "op" },
  { id: "op_gt", text: ">", chapter: 3, kind: "op" },
  { id: "op_le", text: "<=", chapter: 3, kind: "op" },
  { id: "op_ge", text: ">=", chapter: 3, kind: "op" },
  { id: "op_eq", text: "=", chapter: 3, kind: "op" },
  { id: "op_ne", text: "<>", chapter: 3, kind: "op" },
  { id: "num", kind: "num", chapter: 3, min: 0, max: 30 },
  { id: "str_food", text: "'먹거리'", chapter: 3, kind: "str" },
  { id: "str_goods", text: "'잡화'", chapter: 3, kind: "str" },
  // 4장
  { id: "kw_and", text: "AND", chapter: 4, kind: "kw" },
  { id: "kw_or", text: "OR", chapter: 4, kind: "kw" },
  { id: "kw_not", text: "NOT", chapter: 4, kind: "kw" },
  { id: "p_open", text: "(", chapter: 4, kind: "punct" },
  { id: "p_close", text: ")", chapter: 4, kind: "punct" },
  { id: "kw_in", text: "IN", chapter: 4, kind: "kw" },
  { id: "kw_between", text: "BETWEEN", chapter: 4, kind: "kw" },
  // 5장
  { id: "kw_asc", text: "ASC", chapter: 5, kind: "kw" },
  { id: "kw_desc", text: "DESC", chapter: 5, kind: "kw" },
  // 6장
  { id: "kw_isnull", text: "IS NULL", chapter: 6, kind: "kw" },
  { id: "kw_isnotnull", text: "IS NOT NULL", chapter: 6, kind: "kw" },
  { id: "fn_coalesce", text: "COALESCE(", chapter: 6, kind: "fn" },
  { id: "p_comma", text: ",", chapter: 6, kind: "punct" },
  // 7장: 집계 + 전체 조립용 낱말·표·열
  { id: "fn_count", text: "COUNT(*)", chapter: 7, kind: "fn" },
  { id: "fn_sum", text: "SUM(", chapter: 7, kind: "fn" },
  { id: "fn_avg", text: "AVG(", chapter: 7, kind: "fn" },
  { id: "fn_min", text: "MIN(", chapter: 7, kind: "fn" },
  { id: "fn_max", text: "MAX(", chapter: 7, kind: "fn" },
  { id: "kw_select", text: "SELECT", chapter: 7, kind: "kw" },
  { id: "kw_from", text: "FROM", chapter: 7, kind: "kw" },
  { id: "kw_where", text: "WHERE", chapter: 7, kind: "kw" },
  { id: "kw_orderby", text: "ORDER BY", chapter: 7, kind: "kw" },
  { id: "kw_limit", text: "LIMIT", chapter: 7, kind: "kw" },
  { id: "star", text: "*", chapter: 7, kind: "punct" },
  { id: "tbl_items", text: "items", chapter: 7, kind: "tbl" },
  { id: "tbl_customers", text: "customers", chapter: 7, kind: "tbl" },
  { id: "tbl_orders", text: "orders", chapter: 7, kind: "tbl" },
  { id: "tbl_order_items", text: "order_items", chapter: 7, kind: "tbl" },
  { id: "col_item_id", text: "item_id", chapter: 7, kind: "col" },
  { id: "col_qty", text: "qty", chapter: 7, kind: "col" },
  { id: "col_order_id", text: "order_id", chapter: 7, kind: "col" },
  { id: "col_customer_id", text: "customer_id", chapter: 7, kind: "col" },
  { id: "col_day", text: "day", chapter: 7, kind: "col" },
  { id: "col_village", text: "village", chapter: 7, kind: "col" },
  { id: "col_age", text: "age", chapter: 7, kind: "col" },
  // 8장
  { id: "kw_groupby", text: "GROUP BY", chapter: 8, kind: "kw" },
  { id: "kw_having", text: "HAVING", chapter: 8, kind: "kw" },
];

// --- 의뢰 15개: 작업 5에서 채움 ---
export const REQUESTS = [];
