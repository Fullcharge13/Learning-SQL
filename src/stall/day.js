// 하루 계산: 아침 행동(값 매기기 → 채우기 주문 → 할인 → 진열) → 낮(손님) → 저녁(상자 도착·정산). 순수 함수: 입력 가게를 바꾸지 않고 새 객체를 돌려준다.
// 난수는 rngFor(씨앗, 날짜)만 쓴다(Math.random 금지). 설계 docs/specs/2026-11-11-두억이의-가게-설계.md §2-2, §2-3.
import {
  ITEMS, STOCK_MAX, CRATE, CART_FEE, CART_FEE_BIG, DISCOUNT, DISCOUNT_POP, TREND_POP, TREND_DAYS,
  KEEP_DAYS, LOG_DAYS, MONEY_MAX, SIGN_BONUS, CUSTOMER_RATE, SUBSTITUTE,
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
  //  - S11 ①: 아침에 주문하고 값을 치르며, 상자는 저녁(손님이 다 간 뒤)에 도착한다. 오늘 팔 물건은 아침 재고뿐.
  //  - 재고 한도 30: 아침 재고 + 오늘 이미 주문한 몫 기준으로 넘는 만큼은 안 들어옴(클램프). 이미 30이면 full 사건, 수레 삯만 낸다.
  //  - 돈이 모자라면 결과 순서대로 살 수 있는 데까지만 산다. 돈은 0 아래로 내려가지 않는다.
  //  - 결정(작업 4): 한 상자(클램프 뒤 n개 × cost) 값 + 수레 삯을 다 낼 수 없으면 그 행은 broke이고 수레 삯도 안 낸다
  //    (부분 상자는 사지 않는다). 한 행이 broke이면 그 뒤 행도 모두 broke(설계 「그 행부터 들여오지 않고」).
  const fee = next.upgrades.includes("cart") ? CART_FEE_BIG : CART_FEE;
  let bought = 0, fees = 0, broke = false;
  const pending = new Map(); // 저녁에 도착할 개수(물건 번호 → 개수)
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
    const n = Math.max(0, Math.min(want, STOCK_MAX - it.stock - (pending.get(id) || 0))); // 저장이 깨져 재고가 한도를 넘어도 돈이 늘지 않게
    const cost = DEF.get(id).cost * n;
    if (broke || next.money < cost + fee) { broke = true; events.push({ t: "broke", item_id: id, slot }); continue; }
    next.money -= cost + fee;
    bought += cost;
    fees += fee;
    rec.ids.push(id);
    rec.fee += fee;
    if (n <= 0) { events.push({ t: "full", item_id: id, fee, slot }); continue; }
    pending.set(id, (pending.get(id) || 0) + n);
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

  // 6) 손님: 단골 수로 자르지 않는다(S11 ④, 같은 단골이 다시 올 수 있음)
  const rng = rngFor(next.seed, day);
  const regulars = next.regulars;
  const count = Math.floor(regulars * CUSTOMER_RATE) + (next.upgrades.includes("sign") ? SIGN_BONUS : 0) + Math.floor(rng() * 4);
  const weights = sorted.map((it) => DEF.get(it.item_id).pop * (onSale.has(it.item_id) ? DISCOUNT_POP : 1) * (it.item_id === trendId ? TREND_POP : 1));
  const totalW = weights.reduce((x, y) => x + y, 0);
  const W = new Map(sorted.map((it, i) => [it.item_id, weights[i]]));
  const canBuy = (it) => shelf.has(it.item_id) && it.stock > 0 && it.price !== null;
  // 후보 중 인기 가중치로 하나(후보가 없으면 null). 난수는 후보가 있을 때만 하나 쓴다
  const pickBy = (cands) => {
    if (!cands.length) return null;
    const tot = cands.reduce((x, it) => x + W.get(it.item_id), 0);
    let r = rng() * tot, k = 0;
    while (k < cands.length - 1 && r >= W.get(cands[k].item_id)) { r -= W.get(cands[k].item_id); k++; }
    return cands[k];
  };
  let nextOrder = next.orders.reduce((m, o) => (Number.isInteger(o.order_id) && o.order_id > m ? o.order_id : m), 0) + 1;
  let revenue = 0, sold = 0, missed = 0, lost = 0;
  const missBy = { shelf: 0, stock: 0, price: 0 }; // 마지막까지 못 산 허탕만 까닭별로(의뢰 no_miss·cart_max는 재고·값 허탕만 셈)
  const todays = [];
  for (let i = 0; i < count; i++) {
    const customer_id = 1 + Math.floor(rng() * regulars);
    let r = rng() * totalW, k = 0;
    while (k < sorted.length - 1 && r >= weights[k]) { r -= weights[k]; k++; }
    const wanted = sorted[k];
    const want = rng() < 0.2 ? 2 : 1;
    let why = null;
    if (!shelf.has(wanted.item_id)) why = "shelf";
    else if (wanted.stock <= 0) why = "stock";
    else if (wanted.price === null) why = "price";
    let it = wanted;
    if (why) {
      // (1) 할인 물건이 붙잡음 (2) 진열대에 없던 물건이면 SUBSTITUTE 확률로 다른 진열 물건 (3) 허탕 — S11 ②③
      let alt = pickBy(sorted.filter((x) => onSale.has(x.item_id) && x !== wanted && canBuy(x)));
      if (!alt && why === "shelf" && rng() < SUBSTITUTE) alt = pickBy(sorted.filter((x) => x !== wanted && canBuy(x)));
      if (!alt) {
        const price = unitPrice(wanted);
        missed++;
        missBy[why]++;
        lost += price * want;
        events.push({ t: "miss", customer_id, item_id: wanted.item_id, qty: want, why, lost: price * want });
        continue;
      }
      it = alt;
    }
    const price = unitPrice(it);
    const qty = Math.min(want, it.stock); // 재고가 모자라면 있는 만큼만 팔고, 모자란 몫은 못 판 값(lost)에만 더한다(miss 사건 없음)
    it.stock -= qty;
    revenue += price * qty;
    sold += qty;
    lost += price * (want - qty);
    const buy = { t: "buy", customer_id, item_id: it.item_id, qty, want, price };
    if (it !== wanted) buy.want_item = wanted.item_id; // 원래 찾던 물건(붙잡힘·대신 삼)
    events.push(buy);
    todays.push({ order_id: nextOrder++, customer_id, day, items: [{ item_id: it.item_id, qty }] });
  }

  // 저녁: 아침에 주문한 상자 도착(S11 ①)
  for (const [id, n] of pending) byId.get(id).stock += n;

  // 7) 정산
  next.money = Math.min(MONEY_MAX, next.money + revenue);
  const summary = {
    day, customers: count, sold, missed, missBy, lost, revenue, bought, fees,
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
