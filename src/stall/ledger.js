// 임시 장부: 가게 상태를 SQL(CREATE+INSERT) 글자로 바꾼다. 학습자 질의가 보는 표 4개(설계 §2-4). 순수 함수.
import { ITEMS, CUSTOMERS, KEEP_DAYS } from "../../data/stall.js";

const ITEM_BY_ID = new Map(ITEMS.map((it) => [it.item_id, it]));

/** 「쓸 표 보기」용: 표 이름·열의 한글 뜻 */
export const LEDGER_SCHEMA = {
  items: {
    ko: "내 물건",
    cols: { item_id: "물건 번호", name: "이름", category: "종류", price: "파는 값(빈칸이면 아직 안 매김)", cost: "들여온 값", stock: "남은 재고" },
  },
  customers: {
    ko: "단골 손님",
    cols: { customer_id: "손님 번호", name: "이름", kind: "사람·도깨비·여우", age: "나이", village: "사는 마을" },
  },
  orders: {
    ko: "주문(최근 3일)",
    cols: { order_id: "주문 번호", customer_id: "누가 샀나", day: "며칠째" },
  },
  order_items: {
    ko: "주문한 물건",
    cols: { order_id: "주문 번호", item_id: "물건 번호", qty: "몇 개" },
  },
};

// 글자는 작은따옴표로 감싸고 안의 작은따옴표는 두 번으로
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const int = (v) => (Number.isFinite(v) ? Math.trunc(v) : "NULL");
const intOrNull = (v) => (v === null || v === undefined ? "NULL" : int(v));

/** 장부 SQL. customers 인자는 시험에서 단골 목록을 바꿔 볼 때만 쓴다. */
export function ledgerSql(stall, customers = CUSTOMERS) {
  const out = [
    "CREATE TABLE items (item_id INTEGER PRIMARY KEY, name TEXT, category TEXT, price INTEGER, cost INTEGER, stock INTEGER);",
    "CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT, kind TEXT, age INTEGER, village TEXT);",
    "CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, day INTEGER);",
    "CREATE TABLE order_items (order_id INTEGER, item_id INTEGER, qty INTEGER);",
  ];
  for (const e of stall.items || []) {
    const def = ITEM_BY_ID.get(e.item_id);
    if (!def) continue;
    out.push(`INSERT INTO items VALUES (${int(def.item_id)}, ${q(def.name)}, ${q(def.category)}, ${intOrNull(e.price)}, ${int(def.cost)}, ${int(e.stock)});`);
  }
  for (const c of customers.slice(0, stall.regulars)) {
    out.push(`INSERT INTO customers VALUES (${int(c.customer_id)}, ${q(c.name)}, ${q(c.kind)}, ${int(c.age)}, ${q(c.village)});`);
  }
  // 최근 KEEP_DAYS일만(부르는 쪽이 정리했는지에 기대지 않음), 같은 order_id는 첫 번째만(깨진 저장이 UNIQUE 오류를 내지 않게)
  const seenOrders = new Set();
  for (const o of stall.orders || []) {
    if (!o || !Number.isInteger(o.order_id) || !Number.isInteger(o.day)) continue;
    if (o.day < stall.day - KEEP_DAYS || seenOrders.has(o.order_id)) continue;
    seenOrders.add(o.order_id);
    out.push(`INSERT INTO orders VALUES (${o.order_id}, ${intOrNull(o.customer_id)}, ${o.day});`);
    for (const it of Array.isArray(o.items) ? o.items : []) {
      if (!it || !Number.isInteger(it.item_id) || !Number.isInteger(it.qty)) continue;
      out.push(`INSERT INTO order_items VALUES (${o.order_id}, ${it.item_id}, ${it.qty});`);
    }
  }
  return out.join("\n");
}
