// 하루 계산: 아침 행동(값 매기기 → 채우기 → 할인 → 진열) → 낮(손님) → 저녁(정산). 순수 함수: 입력 가게를 바꾸지 않고 새 객체를 돌려준다.
// 난수는 rngFor(씨앗, 날짜)만 쓴다(Math.random 금지). 설계 docs/specs/2026-11-11-두억이의-가게-설계.md §2-2, §2-3.
import {
  ITEMS, STOCK_MAX, CRATE, CART_FEE, CART_FEE_BIG, DISCOUNT, DISCOUNT_POP, TREND_POP, TREND_DAYS,
  KEEP_DAYS, LOG_DAYS, MONEY_MAX, SIGN_BONUS,
} from "../../data/stall.js";
import { rngFor } from "./rng.js";

const DEF = new Map(ITEMS.map((it) => [it.item_id, it]));
const BASE_IDS = ITEMS.filter((d) => !d.upgrade).map((d) => d.item_id); // 오늘의 인기는 기본 물건 중에서만(성장으로 구간 중간에 바뀌지 않게)

/**
 * @param {object} stall 가게 상태(바꾸지 않음)
 * @param {{pricing:number[],restock:number[],best:number[],discount:number[],display:number[]|null,report:any,rest:object}} actions
 * @returns {{stall:object, events:object[], summary:object}}
 */
export function runDay(stall, actions) {
  const a = actions || {};
  const next = structuredClone(stall);
  const events = [];
  const day = next.day;
  const byId = new Map(next.items.map((it) => [it.item_id, it]));
  const list = (v) => (Array.isArray(v) ? [...new Set(v)] : []); // 같은 번호는 한 번만

  // 쉰 칸 안내
  const rest = a.rest && typeof a.rest === "object" ? { ...a.rest } : {};
  for (const slot of Object.keys(rest)) events.push({ t: "slot", slot, line: rest[slot] });

  // 1) 값 매기기: 값이 빈칸인 물건에만 표준값
  const slots = {};
  const pricingIds = list(a.pricing);
  slots.pricing = { ids: pricingIds };
  for (const id of pricingIds) {
    const it = byId.get(id);
    if (!it || it.price !== null) continue;
    it.price = DEF.get(id).std;
    events.push({ t: "price", item_id: id, price: it.price });
  }

  // 2) 채우기(restock 10개, best 20개). 규칙:
  //  - 재고 한도 30: 넘는 만큼은 안 들어옴(클램프). 이미 30이면 full 사건, 수레 삯만 낸다.
  //  - 돈이 모자라면 결과 순서대로 살 수 있는 데까지만 산다. 돈은 0 아래로 내려가지 않는다.
  //  - 결정(작업 4): 한 상자(클램프 뒤 n개 × cost) 값 + 수레 삯을 다 낼 수 없으면 그 행은 broke이고 수레 삯도 안 낸다
  //    (부분 상자는 사지 않는다). 한 행이 broke이면 그 뒤 행도 모두 broke(설계 「그 행부터 들여오지 않고」).
  const fee = next.upgrades.includes("cart") ? CART_FEE_BIG : CART_FEE;
  let bought = 0, fees = 0, broke = false;
  // restock과 best에 같은 물건이 둘 다 있으면 둘 다 한다(칸마다 목록 안의 중복만 제거)
  const restockRows = [
    ...list(a.restock).map((id) => [id, CRATE, "restock"]),
    ...list(a.best).map((id) => [id, CRATE * 2, "best"]),
  ];
  slots.restock = { ids: [], n: 0, fee: 0 };
  slots.best = { ids: [], n: 0, fee: 0 };
  for (const [id, want, slot] of restockRows) {
    const it = byId.get(id);
    if (!it) continue;
    const rec = slots[slot];
    const n = Math.max(0, Math.min(want, STOCK_MAX - it.stock)); // 저장이 깨져 재고가 한도를 넘어도 돈이 늘지 않게
    const cost = DEF.get(id).cost * n;
    if (broke || next.money < cost + fee) { broke = true; events.push({ t: "broke", item_id: id, slot }); continue; }
    next.money -= cost + fee;
    bought += cost;
    fees += fee;
    rec.ids.push(id);
    rec.fee += fee;
    if (n <= 0) { events.push({ t: "full", item_id: id, fee, slot }); continue; }
    it.stock += n;
    rec.n += n;
    events.push({ t: "fill", item_id: id, n, cost, fee, slot });
  }

  // 3) 할인(오늘 하루): 값 × 0.8 반올림, 인기 × 1.6
  const discountIds = list(a.discount).filter((id) => byId.has(id));
  slots.discount = { ids: discountIds };
  const onSale = new Set(discountIds);
  const unitPrice = (it) => {
    const p = it.price !== null ? it.price : DEF.get(it.item_id).std; // 빈칸이면 표준값(허탕 계산용)
    return onSale.has(it.item_id) ? Math.round(p * DISCOUNT) : p;
  };

  // 4) 진열: display가 null이면 재고>0인 물건을 item_id 순서로. 배열이면 그 순서(없는 물건·중복 제외) 위에서부터 칸 수만큼
  const sorted = [...next.items].sort((x, y) => x.item_id - y.item_id);
  let shelfIds;
  if (a.display === null || a.display === undefined) shelfIds = sorted.filter((it) => it.stock > 0).map((it) => it.item_id);
  else shelfIds = list(a.display).filter((id) => byId.has(id));
  shelfIds = shelfIds.slice(0, next.shelf);
  const shelf = new Set(shelfIds);
  if (a.display !== null && a.display !== undefined) slots.display = { ids: shelfIds };

  // 5) 오늘의 인기: TREND_DAYS일 구간마다 하나(구간 안에서는 같은 난수 → 같은 물건)
  const segment = Math.floor((day - 1) / TREND_DAYS);
  const trendRng = rngFor(next.seed, -1 - segment);
  const trendId = BASE_IDS[Math.floor(trendRng() * BASE_IDS.length)];

  // 6) 손님
  const rng = rngFor(next.seed, day);
  const regulars = next.regulars;
  const count = Math.min(regulars, Math.floor(regulars * 0.4) + (next.upgrades.includes("sign") ? SIGN_BONUS : 0) + Math.floor(rng() * 4));
  const weights = sorted.map((it) => DEF.get(it.item_id).pop * (onSale.has(it.item_id) ? DISCOUNT_POP : 1) * (it.item_id === trendId ? TREND_POP : 1));
  const totalW = weights.reduce((x, y) => x + y, 0);
  const pool = Array.from({ length: regulars }, (_, i) => i + 1); // 손님 번호 1..단골 수, 하루에 한 번씩만
  let nextOrder = next.orders.reduce((m, o) => (Number.isInteger(o.order_id) && o.order_id > m ? o.order_id : m), 0) + 1;
  let revenue = 0, sold = 0, missed = 0, lost = 0;
  const todays = [];
  for (let i = 0; i < count; i++) {
    const pick = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[pick]] = [pool[pick], pool[i]];
    const customer_id = pool[i];
    let r = rng() * totalW, k = 0;
    while (k < sorted.length - 1 && r >= weights[k]) { r -= weights[k]; k++; }
    const it = sorted[k];
    const want = rng() < 0.2 ? 2 : 1;
    const price = unitPrice(it);
    let why = null;
    if (!shelf.has(it.item_id)) why = "shelf";
    else if (it.stock <= 0) why = "stock";
    else if (it.price === null) why = "price";
    if (why) {
      missed++;
      lost += price * want;
      events.push({ t: "miss", customer_id, item_id: it.item_id, qty: want, why, lost: price * want });
      continue;
    }
    const qty = Math.min(want, it.stock); // 재고가 모자라면 있는 만큼만 팔고, 모자란 몫은 못 판 값(lost)에만 더한다(miss 사건 없음)
    it.stock -= qty;
    revenue += price * qty;
    sold += qty;
    lost += price * (want - qty);
    events.push({ t: "buy", customer_id, item_id: it.item_id, qty, want, price });
    todays.push({ order_id: nextOrder++, customer_id, day, items: [{ item_id: it.item_id, qty }] });
  }

  // 7) 정산
  next.money = Math.min(MONEY_MAX, next.money + revenue);
  const summary = {
    day, customers: count, sold, missed, lost, revenue, bought, fees,
    profit: revenue - bought - fees,
    report: a.report === undefined ? null : a.report,
    rest,
    trend: trendId,
  };
  if (a.report !== null && a.report !== undefined) slots.report = { value: a.report };
  next.day = day + 1;
  next.orders = [...next.orders, ...todays].filter((o) => o.day >= next.day - KEEP_DAYS);
  next.log = [...next.log, structuredClone(summary)].slice(-LOG_DAYS);
  next.last = { summary: structuredClone(summary), slots: structuredClone(slots), rested: { ...rest } };
  return { stall: next, events, summary };
}
