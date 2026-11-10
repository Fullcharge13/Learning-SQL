// 하루 계산: 아침 행동(값 매기기 → 채우기 → 할인 → 진열) → 낮(손님) → 저녁(정산). 순수 함수: 입력 가게를 바꾸지 않고 새 객체를 돌려준다.
// 난수는 rngFor(씨앗, 날짜)만 쓴다(Math.random 금지). 설계 docs/specs/2026-11-11-두억이의-가게-설계.md §2-2, §2-3.
import {
  ITEMS, STOCK_MAX, CRATE, CART_FEE, CART_FEE_BIG, DISCOUNT, DISCOUNT_POP, TREND_POP, TREND_DAYS,
  KEEP_DAYS, LOG_DAYS, MONEY_MAX,
} from "../../data/stall.js";
import { rngFor } from "./rng.js";

const DEF = new Map(ITEMS.map((it) => [it.item_id, it]));

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
  const list = (v) => (Array.isArray(v) ? v : []);

  // 쉰 칸 안내
  const rest = a.rest && typeof a.rest === "object" ? { ...a.rest } : {};
  for (const slot of Object.keys(rest)) events.push({ t: "slot", slot, line: rest[slot] });

  // 1) 값 매기기: 값이 빈칸인 물건에만 표준값
  for (const id of list(a.pricing)) {
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
  const restockRows = [...list(a.restock).map((id) => [id, CRATE]), ...list(a.best).map((id) => [id, CRATE * 2])];
  for (const [id, want] of restockRows) {
    const it = byId.get(id);
    if (!it) continue;
    const n = Math.min(want, STOCK_MAX - it.stock);
    const cost = DEF.get(id).cost * n;
    if (broke || next.money < cost + fee) { broke = true; events.push({ t: "broke", item_id: id }); continue; }
    next.money -= cost + fee;
    bought += cost;
    fees += fee;
    if (n <= 0) { events.push({ t: "full", item_id: id, fee }); continue; }
    it.stock += n;
    events.push({ t: "fill", item_id: id, n, cost, fee });
  }

  // 3) 할인(오늘 하루): 값 × 0.8 반올림, 인기 × 1.6
  const onSale = new Set(list(a.discount).filter((id) => byId.has(id)));
  const unitPrice = (it) => {
    const p = it.price !== null ? it.price : DEF.get(it.item_id).std; // 빈칸이면 표준값(허탕 계산용)
    return onSale.has(it.item_id) ? Math.round(p * DISCOUNT) : p;
  };

  // 4) 진열: display가 null이면 재고>0인 물건을 item_id 순서로. 배열이면 그 순서(없는 물건·중복 제외) 위에서부터 칸 수만큼
  const sorted = [...next.items].sort((x, y) => x.item_id - y.item_id);
  let shelfIds;
  if (a.display === null || a.display === undefined) shelfIds = sorted.filter((it) => it.stock > 0).map((it) => it.item_id);
  else shelfIds = [...new Set(list(a.display).filter((id) => byId.has(id)))];
  const shelf = new Set(shelfIds.slice(0, next.shelf));

  // 5) 오늘의 인기: TREND_DAYS일 구간마다 하나(구간 안에서는 같은 난수 → 같은 물건)
  const segment = Math.floor((day - 1) / TREND_DAYS);
  const trendRng = rngFor(next.seed, -1 - segment);
  const trendId = sorted[Math.floor(trendRng() * sorted.length)].item_id;

  // 6) 손님
  const rng = rngFor(next.seed, day);
  const regulars = next.regulars;
  const count = Math.min(regulars, Math.floor(regulars * 0.4) + (next.upgrades.includes("sign") ? 2 : 0) + Math.floor(rng() * 4));
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
    const qty = Math.min(want, it.stock); // 재고가 모자라면 있는 만큼만
    it.stock -= qty;
    revenue += price * qty;
    sold += qty;
    events.push({ t: "buy", customer_id, item_id: it.item_id, qty, price });
    todays.push({ order_id: nextOrder++, customer_id, day, items: [{ item_id: it.item_id, qty }] });
  }

  // 7) 정산
  next.money = Math.min(MONEY_MAX, next.money + revenue);
  const summary = {
    day, customers: count, sold, missed, lost, revenue, bought, fees,
    profit: revenue - bought - fees,
    report: a.report === undefined ? null : a.report,
    rest,
  };
  next.day = day + 1;
  next.orders = [...next.orders, ...todays].filter((o) => o.day >= next.day - KEEP_DAYS);
  next.log = [...next.log, structuredClone(summary)].slice(-LOG_DAYS);
  next.last = { summary: structuredClone(summary), slotLines: { ...rest } };
  return { stall: next, events, summary };
}
