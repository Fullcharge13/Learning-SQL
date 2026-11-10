// 「두억이의 가게」(v0.3) 데이터: 수치 시작값은 모두 여기 한 곳에 둔다(설계 docs/specs/2026-11-11-두억이의-가게-설계.md).
// 시뮬레이션으로 값을 바꾸면 LOG에 전후 표로 남긴다. 이름·마을은 새로 지은 것으로 실존·민속 인물이 아니다.

// --- 상수 ---
export const START_MONEY = 100;     // 시작 돈(냥)
export const CRATE = 10;            // 한 상자 = 10개
export const STOCK_MAX = 30;        // 물건 하나의 재고 한도
export const CART_FEE = 2;          // 수레 삯(냥)
export const CART_FEE_BIG = 1;      // 큰 수레를 산 뒤
export const SHELF = 6;             // 진열대 칸(고침 1: 4 → 6, 시작 물건 6가지가 다 올라감)
export const SHELF_BIG = 8;         // 넓은 진열대(고침 1: 6 → 8, 새 물건까지 다 올라감)
export const REGULARS = 20;         // 단골 수
export const REGULARS_BIG = 30;     // 단골 늘리기 뒤
export const CUSTOMER_RATE = 0.6; // 오늘 손님 = floor(단골 × 이 값) + 간판 + 난수 0~3 (작업 6에서 data로 옮김)
export const SUBSTITUTE = 0.5;    // 진열대에 없는 물건을 찾던 손님이 진열된 다른 물건을 대신 살 확률(S11 ③)
export const SIGN_BONUS = 2;        // 간판: 손님 +2
export const DISCOUNT = 0.8;        // 할인: 값 × 0.8
export const DISCOUNT_POP = 1.6;    // 할인: 인기 × 1.6
export const TREND_POP = 4;         // 오늘의 인기: 인기 × 4
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
  { item_id: 7, name: "꿀떡", category: "먹거리", price: null, std: 8, cost: 4, stock: 10, pop: 10, upgrade: "newitems" },
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
  { id: "shelf", name: "넓은 진열대", desc: "진열 칸이 6칸에서 8칸으로 늘어요", price: 300 },
  { id: "regulars", name: "단골 늘리기", desc: "단골이 20명에서 30명으로 늘어요", price: 350 },
];

// --- 자동화 칸 (설계 §3-1). 배열 순서 = 하루의 실행 순서. frame: where = SELECT name FROM items WHERE {where},
//     order = SELECT name FROM items ORDER BY {order} LIMIT {limit}, full = 처음부터 전체 조립. kind: item = 물건 목록, number = 첫 행 첫 칸 ---
export const SLOTS = [
  { id: "pricing", name: "값 매기기", chapter: 6, frame: "where", tpl: "SELECT name FROM items WHERE {where}", kind: "item", desc: "값이 빈칸인 물건을 찾으면 표준값을 매겨요" },
  { id: "restock", name: "재고 채우기", chapter: 3, frame: "where", tpl: "SELECT name FROM items WHERE {where}", kind: "item", desc: "찾은 물건을 한 상자(10개)씩 들여와요" },
  { id: "best", name: "잘 팔린 물건 더 들이기", chapter: 8, frame: "full", kind: "item", desc: "찾은 물건을 두 상자(20개)씩 들여와요" },
  { id: "discount", name: "할인 걸기", chapter: 4, frame: "where", tpl: "SELECT name FROM items WHERE {where}", kind: "item", desc: "찾은 물건을 오늘 하루 2할 깎아 팔아요" },
  { id: "display", name: "진열하기", chapter: 5, frame: "order", tpl: "SELECT name FROM items ORDER BY {order} LIMIT {limit}", kind: "item", desc: "결과 위에서부터 진열대 칸 수만큼 올려요" },
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

// --- 의뢰 15개 (설계 §4-1). 한 번에 하나, 차례대로. need = 그 장까지 평가를 통과해야 이어짐.
//     goal: slot_ok{slot} · no_miss{days} · cart_max{fee, days} · profit{n} · report{answerSql} · upgrade{id}
//     no_miss·cart_max의 「허탕」은 재고 바닥·값 빈칸 허탕만 센다(진열 칸이 모자라 생긴 허탕은 칸으로 못 없앰, 작업 5).
//     solution = 그 차례에 열린 카드만으로 목표를 이루는 칸 구성(tests/stall_requests.js가 실제 엔진으로 확인).
//     보내는 사람은 두억이와 새로 지은 장터 이웃·손님(실존·민속 인물 아님). 수치는 작업 6이 경제를 맞춘 뒤 다시 검사한다. ---
const k = (c) => ({ c });                 // 카드 하나
const n = (v) => ({ c: "num", n: v });   // 숫자 카드
const where = (...cards) => ({ mode: "frame", parts: { where: cards } });
const full = (...cards) => ({ mode: "full", parts: { full: cards } });

export const REQUESTS = [
  {
    id: "r01", need: 3, from: "두억이", xp: 5, withinDays: 1,
    line: "재고 채우기 칸이 열렸어! 지금은 다 떨어져야(stock < 1) 채워. 먼저 장을 한 번 열어 칸이 도는 걸 보고, 몇 개 아래일 때 채우면 좋을지 고쳐 봐.",
    goal: { type: "slot_ok", slot: "restock" },
    solution: { restock: where(k("col_stock"), k("op_lt"), n(4)) },
  },
  {
    id: "r02", need: 3, from: "주막 아주머니 달래", xp: 5, withinDays: 6,
    line: "어제 식혜가 동나서 그냥 돌아왔지 뭐야. 이틀 내리 다 팔려서 못 사는 손님이 없게 해 줄래? 숫자를 넉넉히 올려 봐. (진열대에 못 올라 돌아가는 손님은 세지 않을게)",
    goal: { type: "no_miss", days: 2 },
    solution: { restock: where(k("col_stock"), k("op_lt"), n(12)) },
  },
  {
    id: "r03", need: 3, from: "수레꾼 굴렁", xp: 5, withinDays: 8,
    line: "수레를 너무 자주 부르는구먼. 하루 수레 삯은 6냥까지만, 그래도 다 팔려서 못 사는 손님은 없게 이틀만 해 보게.",
    goal: { type: "cart_max", fee: 6, days: 2 },
    solution: { restock: where(k("col_stock"), k("op_lt"), n(8)) },
  },
  {
    id: "r04", need: 3, from: "두억이", xp: 5, withinDays: 6,
    line: "하루에 25냥 이상 남겨 보자! 너무 많이 들여오면 들여온 값이 이익을 깎아.",
    goal: { type: "profit", n: 25 },
    solution: { restock: where(k("col_stock"), k("op_lt"), n(8)) },
  },
  {
    id: "r05", need: 4, from: "옆 좌판 짚신 장수 덕보", xp: 5, withinDays: 1,
    line: "재고가 잔뜩 쌓인 먹거리는 깎아서 빨리 파는 게 좋아. AND로 조건 두 개를 묶어 할인 칸에 넣어 봐.",
    goal: { type: "slot_ok", slot: "discount" },
    solution: { discount: where(k("col_stock"), k("op_gt"), n(25), k("kw_and"), k("col_category"), k("op_eq"), k("str_food")) },
  },
  {
    id: "r06", need: 4, from: "두억이", xp: 5, withinDays: 20,
    line: "가게 돈이 150냥 모이면 간판을 달자. 지나가던 손님이 하루 두 명은 더 들를 거야.",
    goal: { type: "upgrade", id: "sign" },
    solution: {},
  },
  {
    id: "r07", need: 5, from: "꼬마 손님 콩이", xp: 5, withinDays: 1,
    line: "진열대에 뭐가 먼저 올라가요? ORDER BY로 순서를 정하고 LIMIT으로 몇 칸 올릴지 정해 봐요.",
    goal: { type: "slot_ok", slot: "display" },
    solution: { display: { mode: "frame", parts: { order: [k("col_stock"), k("kw_desc")], limit: [n(6)] } } },
  },
  {
    id: "r08", need: 5, from: "주막 아주머니 달래", xp: 5, withinDays: 8,
    line: "요즘 장사가 제법이네! 하루에 35냥 남기는 날을 한번 만들어 봐.",
    goal: { type: "profit", n: 35 },
    solution: {},
  },
  {
    id: "r09", need: 6, from: "두억이", xp: 5, withinDays: 20,
    line: "새 물건(꿀떡·한지)을 들여오자! 200냥이야. 그런데 값이 아직 안 정해져서 들어온대.",
    goal: { type: "upgrade", id: "newitems" },
    solution: {},
  },
  {
    id: "r10", need: 6, from: "꼬마 손님 콩이", xp: 5, withinDays: 6,
    line: "꿀떡에 값이 없어서 못 샀어요! 값이 빈칸인 물건은 IS NULL로 찾을 수 있대요. 값이 없거나 다 팔려서 못 사고 가는 일이 이틀 동안 없게 해 줘요. (진열대에 안 보여서 못 사는 건 괜찮아요)",
    goal: { type: "no_miss", days: 2 },
    solution: { pricing: where(k("col_price"), k("kw_isnull")) },
  },
  {
    id: "r11", need: 7, from: "두억이", xp: 5, withinDays: 1,
    line: "하루 보고 칸이 열렸어. 가게에 남은 재고를 다 더하면 몇 개일까? SUM이 도와줄 거야.",
    goal: { type: "report", answerSql: "SELECT SUM(stock) FROM items" },
    solution: { report: full(k("kw_select"), k("fn_sum"), k("col_stock"), k("p_close"), k("kw_from"), k("tbl_items")) },
  },
  {
    id: "r12", need: 7, from: "서당 학동 똘이", xp: 5, withinDays: 1,
    line: "최근 사흘 동안 물건이 모두 몇 개 팔렸어요? order_items 표의 qty를 더해 보고에 적어 주세요.",
    goal: { type: "report", answerSql: "SELECT SUM(qty) FROM order_items" },
    solution: { report: full(k("kw_select"), k("fn_sum"), k("col_qty"), k("p_close"), k("kw_from"), k("tbl_order_items")) },
  },
  {
    id: "r13", need: 7, from: "수레꾼 굴렁", xp: 5, withinDays: 25,
    line: "큰 수레를 장만하면 한 번 부를 때 삯이 1냥이라네. 250냥 모이면 들이게.",
    goal: { type: "upgrade", id: "cart" },
    solution: {},
  },
  {
    id: "r14", need: 8, from: "옆 좌판 짚신 장수 덕보", xp: 5, withinDays: 1,
    line: "잘 팔린 물건은 두 상자씩 들여야지. GROUP BY로 물건마다 판 개수를 묶고, HAVING으로 많이 팔린 것만 골라 봐.",
    goal: { type: "slot_ok", slot: "best" },
    solution: {
      best: full(k("kw_select"), k("col_item_id"), k("kw_from"), k("tbl_order_items"), k("kw_groupby"), k("col_item_id"),
        k("kw_having"), k("fn_sum"), k("col_qty"), k("p_close"), k("op_ge"), n(8)),
    },
  },
  {
    id: "r15", need: 8, from: "두억이", xp: 5, withinDays: 8,
    line: "마지막 부탁이야! 잘 팔린 물건 칸까지 다 굴려서 하루에 45냥 이상 남겨 보자. 두 상자씩 들이는 물건이 너무 많으면 들여온 값이 이익을 깎으니, HAVING 기준도 살펴봐.",
    goal: { type: "profit", n: 45 },
    solution: {
      best: full(k("kw_select"), k("col_item_id"), k("kw_from"), k("tbl_order_items"), k("kw_groupby"), k("col_item_id"),
        k("kw_having"), k("fn_sum"), k("col_qty"), k("p_close"), k("op_ge"), n(15)),
    },
  },
];
