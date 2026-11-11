// 「두억이의 가게」 좌판 그림(SVG 코드, 이미지 파일 없음)·하루 재생·재생 글(순수 함수).
// 게임 규칙은 src/stall/day.js 한 곳에만 있다. 여기서는 사건(events)을 글과 그림으로 옮기기만 한다(설계 §5·§6-3).
import { ITEMS, CUSTOMERS, SLOTS, UPGRADES } from "../../data/stall.js";
import { explain } from "../grade.js";
import { esc } from "./dom.js";

const ITEM = new Map(ITEMS.map((it) => [it.item_id, it]));
const CUSTOMER = new Map(CUSTOMERS.map((c) => [c.customer_id, c]));
const SLOT = new Map(SLOTS.map((s) => [s.id, s]));
const UPGRADE = new Map(UPGRADES.map((u) => [u.id, u]));

export const itemName = (id) => (ITEM.has(id) ? ITEM.get(id).name : `물건 ${id}`);
export const customerName = (id) => (CUSTOMER.has(id) ? CUSTOMER.get(id).name : "손님");
export const slotName = (id) => (SLOT.has(id) ? SLOT.get(id).name : id);
const idList = (v) => (Array.isArray(v) ? v : []); // 가져온 저장의 이상한 값에도 깨지지 않게
const names = (ids) => idList(ids).map(itemName).join("·");
const won = (n) => `${Number(n) || 0}냥`;
/** 이익처럼 음수가 될 수 있는 냥: 음수는 「−7냥」 */
const signedWon = (n) => (Number(n) < 0 ? `−${Math.abs(Number(n))}냥` : won(n));

// 받침에 따라 「으로/로」(ㄹ 받침은 「로」)
export function ro(word) {
  const c = String(word).charCodeAt(String(word).length - 1) - 0xac00;
  if (c < 0 || c > 11171) return `${word}로`;
  const jong = c % 28;
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
}

/** 장부 셈 전체가 제한 시간을 넘었을 때(어느 칸 탓인지 모름) 한 줄 */
export const TIMEOUT_LINE = "오늘은 장부 셈이 너무 오래 걸려 칸들이 쉬었어요";
const TIMEOUT_REASON = explain("timeout");
const restReason = (why) => (why === TIMEOUT_REASON ? "장부 셈이 너무 오래 걸렸어요" : why);

/** 손님 말풍선(짧게) */
export function bubbleText(ev) {
  if (!ev) return "";
  if (ev.t === "miss") {
    if (ev.why === "stock" || (ev.why === "shelf" && ev.soldOut)) return "다 팔렸네";
    if (ev.why === "price") return "값이 없네";
    return "안 보이네";
  }
  if (ev.t === "buy") {
    const name = itemName(ev.item_id);
    if (ev.want_item) return `그럼 ${ro(name)} 할게요`;
    if (ev.want > ev.qty) return `${ev.qty}개만 남았네`;
    return `${name} ${ev.qty}개 주세요`;
  }
  return "";
}

/** 재생 기록 한 줄(사건 하나). 순수 */
export function eventLine(ev, stall) {
  if (!ev) return "";
  const who = customerName(ev.customer_id);
  const name = itemName(ev.item_id);
  switch (ev.t) {
    case "slot":
      return `${slotName(ev.slot)} 칸 쉼: ${restReason(ev.line)}`;
    case "price":
      return `값 매기기: ${name} 값 ${won(ev.price)} 매김`;
    case "fill":
      return `${name} ${ev.n}개 주문 → 저녁에 도착 (들여온 값 ${won(ev.cost)} · 수레 삯 ${won(ev.fee)})`;
    case "full":
      return `${name}: 재고가 가득 차 못 들임 (수레 삯 ${won(ev.fee)})`;
    case "broke":
      return `${name}: 돈이 모자라 못 채움`;
    case "buy": {
      if (ev.want_item) return `${who}: ${itemName(ev.want_item)} 찾다가 ${name} ${ev.qty}개 샀어요`;
      if (ev.want > ev.qty) return `${who}: ${name} ${ev.want}개 찾았는데 ${ev.qty}개만 남아 ${ev.qty}개 샀어요`;
      return `${who}: ${name} ${ev.qty}개 샀어요`;
    }
    case "miss":
      return `${who}: ${name} 찾다가 「${bubbleText(ev)}」 하고 돌아갔어요`;
    default:
      return "";
  }
}

/** 쉰 칸 사건들 → 줄. 시간 초과(묶음 전체)면 한 줄로 */
export function restLines(events, stall, timedOut) {
  const rests = (events || []).filter((e) => e && e.t === "slot");
  if (!rests.length) return [];
  if (timedOut) return [TIMEOUT_LINE];
  return rests.map((e) => eventLine(e, stall));
}

/** 저녁 도착 줄(주문한 것이 없으면 null) */
export function arrivalLine(events, stall) {
  const got = new Map();
  for (const e of events || []) if (e && e.t === "fill" && e.n > 0) got.set(e.item_id, (got.get(e.item_id) || 0) + e.n);
  if (!got.size) return null;
  return `저녁: ${[...got].map(([id, n]) => `${itemName(id)} ${n}개`).join("·")} 도착`;
}

/** 정산 줄 [이름, 값] */
export function summaryRows(s) {
  const by = (s && s.missBy) || {};
  const so = Number(by.soldOut) || 0; // shelf 중 다 팔려 내려간 몫은 「다 팔림」으로 보여 준다
  const parts = [["안 보임", (Number(by.shelf) || 0) - so], ["다 팔림", (Number(by.stock) || 0) + so], ["값 없음", by.price]].filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`);
  return [
    ["손님", `${Number(s && s.customers) || 0}명`],
    ["팔린 개수", `${Number(s && s.sold) || 0}개`],
    ["허탕", `${Number(s && s.missed) || 0}번${parts.length ? ` (${parts.join("·")})` : ""}`],
    ["매출", won(s && s.revenue)],
    ["들여온 값", won(s && s.bought)],
    ["수레 삯", won(s && s.fees)],
    ["이익", signedWon(s && s.profit)],
  ];
}

/** 어제 장부의 칸별 줄: 지금 켜진 칸만 */
export function lastLines(last, stall) {
  if (!last || typeof last !== "object") return [];
  const sl = last.slots && typeof last.slots === "object" ? last.slots : {};
  const rested = last.rested && typeof last.rested === "object" ? last.rested : {};
  const out = [];
  for (const def of SLOTS) {
    const st = stall && stall.slots && stall.slots[def.id];
    if (!st || st.on !== true) continue;
    const head = `${def.name}: `;
    if (Object.hasOwn(rested, def.id)) { out.push(`${head}쉼 — ${restReason(rested[def.id])}`); continue; }
    const r = sl[def.id];
    if (!r || typeof r !== "object") { out.push(`${head}어제는 돌지 않았어요`); continue; }
    const ids = idList(r.ids);
    if (def.id === "report") { out.push(`${head}${r.value === null || r.value === undefined ? "빈 값" : String(r.value)}`); continue; }
    if (!ids.length) { out.push(`${head}찾은 물건이 없었어요`); continue; }
    if (def.id === "restock" || def.id === "best") {
      out.push(r.n > 0 ? `${head}${names(ids)} → ${r.n}개 들임(저녁 도착)` : `${head}${names(ids)} → 재고가 가득 차 못 들임`);
    } else if (def.id === "pricing") out.push(`${head}${names(ids)} → 값 매김`);
    else if (def.id === "discount") out.push(`${head}${names(ids)} → 2할 할인`);
    else if (def.id === "display") out.push(`${head}${names(ids)} 순서로 진열`);
    else out.push(`${head}${names(ids)}`);
  }
  return out;
}

/** 의뢰 진행 글. 허탕 없는 날은 다 팔림·값 없음 허탕만 센다(설계 S11 ⑤) */
export function requestProgress(req, stall) {
  if (!req) return "";
  const g = req.goal || {};
  const n = Number((stall && stall.order && stall.order.progress && stall.order.progress[req.id]) || 0);
  switch (g.type) {
    case "slot_ok": return `${slotName(g.slot)} 칸을 켜고 하루 쉬지 않고 돌리기`;
    case "no_miss": return `다 팔림·값 없음 허탕 없는 날 ${Math.min(n, g.days)}/${g.days}`;
    case "cart_max": return `수레 삯 ${g.fee}냥 이하 + 다 팔림·값 없음 허탕 없는 날 ${Math.min(n, g.days)}/${g.days}`;
    case "profit": return `하루 이익 ${g.n}냥 이상 남기기`;
    case "report": return "하루 보고 칸에 맞는 값 적기";
    case "upgrade": return `성장 「${UPGRADE.has(g.id) ? UPGRADE.get(g.id).name : g.id}」 들이기`;
    default: return "";
  }
}

// ---------------------------------------------------------------- 좌판 그림

const VW = 360, VH = 220;
const BOX_X0 = 22, BOX_X1 = 262, BOX_Y0 = 58, BOX_GAP = 6, BOX_H = 44;

/** 진열대에 올라갈 물건 번호(칸 수만큼, 빈 칸은 null). ids가 없으면 물건 번호 순 */
function shelfCells(stall, ids) {
  const n = stall.shelf === 8 ? 8 : 6;
  const list = Array.isArray(ids) ? ids : [...stall.items].sort((a, b) => a.item_id - b.item_id).map((it) => it.item_id);
  return Array.from({ length: n }, (_, i) => (i < list.length ? list[i] : null));
}

function customerFigure() {
  // 손님: 둥근 머리 + 두루마기. 종류(사람·도깨비·여우)는 data-kind로 머리 장식만 바꿈
  return `<g class="cust" aria-hidden="true">
    <g class="cust-in">
      <ellipse cx="0" cy="214" rx="15" ry="3" fill="#22304A" opacity=".15"/>
      <path class="cust-robe" d="M-13 212 L-10 182 Q0 174 10 182 L13 212 Z" stroke="#22304A" stroke-width="2" stroke-linejoin="round"/>
      <path d="M0 180 L0 210" stroke="#22304A" stroke-width="1.5" opacity=".5"/>
      <circle cx="0" cy="168" r="11" fill="#F6D7B8" stroke="#22304A" stroke-width="2"/>
      <circle cx="-3.5" cy="168" r="1.4" fill="#22304A"/><circle cx="4" cy="168" r="1.4" fill="#22304A"/>
      <g class="cust-horn"><path d="M-5 158 L-3 150 L0 158" fill="#FFD43B" stroke="#22304A" stroke-width="1.6" stroke-linejoin="round"/></g>
      <g class="cust-ears"><path d="M-10 162 L-9 152 L-3 158 M10 162 L9 152 L3 158" fill="#E4664F" stroke="#22304A" stroke-width="1.6" stroke-linejoin="round"/></g>
    </g>
  </g>`;
}

/**
 * 좌판 SVG. cells: 진열 칸의 물건 번호(null = 빈 칸), stocks: 물건 번호 → 재고(그릴 때 값)
 */
export function stallSVG(stall, { ids = null, stocks = null } = {}) {
  const cells = shelfCells(stall, ids);
  const cols = cells.length / 2;
  const bw = (BOX_X1 - BOX_X0 - BOX_GAP * (cols - 1)) / cols;
  const stockOf = (id) => {
    if (stocks && stocks.has(id)) return stocks.get(id);
    const it = stall.items.find((x) => x.item_id === id);
    return it ? it.stock : 0;
  };
  const priceOf = (id) => { const it = stall.items.find((x) => x.item_id === id); return it ? it.price : null; };
  const boxes = cells.map((id, i) => {
    const x = BOX_X0 + (i % cols) * (bw + BOX_GAP);
    const y = BOX_Y0 + Math.floor(i / cols) * (BOX_H + BOX_GAP);
    if (id === null) return `<rect x="${x}" y="${y}" width="${bw}" height="${BOX_H}" rx="6" fill="none" stroke="#7A4A22" stroke-width="1.5" stroke-dasharray="4 4" opacity=".5"/>`;
    const st = stockOf(id);
    const noPrice = priceOf(id) === null;
    return `<g class="box${st <= 0 ? " empty" : ""}" data-item="${id}">
      <rect x="${x}" y="${y}" width="${bw}" height="${BOX_H}" rx="6" fill="#FFFDF8" stroke="#22304A" stroke-width="2"/>
      <text x="${x + bw / 2}" y="${y + 18}" text-anchor="middle" class="box-name">${esc(itemName(id))}</text>
      <text x="${x + bw / 2}" y="${y + 36}" text-anchor="middle" class="box-stock" data-stock="${id}">${st <= 0 ? "다 팔림" : `${st}개`}</text>
      ${noPrice ? `<text x="${x + bw - 5}" y="${y + 12}" text-anchor="end" class="box-tag">값?</text>` : ""}
    </g>`;
  }).join("");
  // 차양 줄무늬(짝수 칸은 산호, 홀수 칸은 크림)
  const stripes = Array.from({ length: 9 }, (_, i) => {
    const x = 6 + i * 38;
    return `<path d="M${x} 12 H${x + 38} V40 Q${x + 19} 52 ${x} 40 Z" fill="${i % 2 ? "#FFF3C4" : "#E4664F"}" stroke="#22304A" stroke-width="2" stroke-linejoin="round"/>`;
  }).join("");
  const label = `좌판: ${cells.filter((x) => x !== null).map((id) => `${itemName(id)} ${stockOf(id)}개`).join(", ")}`;
  return `<svg class="stall-svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${esc(label)}">
    <rect x="0" y="206" width="${VW}" height="14" fill="#E2D6BD"/>
    <rect x="14" y="36" width="8" height="172" fill="#A86B3C" stroke="#22304A" stroke-width="2"/>
    <rect x="${VW - 22}" y="36" width="8" height="172" fill="#A86B3C" stroke="#22304A" stroke-width="2"/>
    <rect x="16" y="50" width="252" height="${BOX_H * 2 + BOX_GAP + 14}" rx="4" fill="#E8C391" stroke="#22304A" stroke-width="2"/>
    <path d="M18 ${BOX_Y0 + BOX_H + BOX_GAP / 2} H266" stroke="#B9824B" stroke-width="2"/>
    ${stripes}
    <rect x="4" y="6" width="${VW - 8}" height="10" rx="4" fill="#22304A"/>
    <rect x="150" y="18" width="60" height="18" rx="4" fill="#FFFDF8" stroke="#22304A" stroke-width="1.5"/>
    <text x="180" y="31" text-anchor="middle" class="sign">두억이네</text>
    ${boxes}
    <rect x="8" y="160" width="${VW - 16}" height="46" rx="4" fill="#A86B3C" stroke="#22304A" stroke-width="2"/>
    <path d="M8 170 H${VW - 8} M8 188 H${VW - 8}" stroke="#7A4A22" stroke-width="1.5" opacity=".7"/>
    ${customerFigure()}
  </svg>`;
}

// ---------------------------------------------------------------- 하루 재생

const KIND_ROBE = { "사람": "#7FB8D9", "도깨비": "#8FCB8F", "여우": "#F2B36B" };

/**
 * 하루 재생. 화면이 그린 좌판(.stall-art)·기록 목록·말풍선 위에서 사건을 하나씩 보인다.
 * @returns {{ skip():void, stop():void }} skip: 남은 것을 건너뛰고 끝(onDone), stop: 아무것도 안 하고 멈춤(화면을 떠날 때)
 */
export function playReplay({ art, log, bubble, events, before, after, timedOut, step = 900, onDone }) {
  const timers = new Set();
  let finished = false;
  const stocks = new Map(before.items.map((it) => [it.item_id, it.stock]));
  const lines = [];
  const add = (text, cls = "") => lines.push({ text, cls });

  // 아침
  for (const l of restLines(events, before, timedOut)) lines.push({ text: l, cls: "rest" });
  for (const e of events) if (e.t === "price") add(eventLine(e, before), "morning");
  for (const e of events) if (e.t === "fill" || e.t === "full" || e.t === "broke") add(eventLine(e, before), e.t === "broke" ? "rest" : "morning");
  if (after && after.last && after.last.summary && after.last.summary.trend) add(`오늘의 인기: ${itemName(after.last.summary.trend)}`, "morning");
  const morning = lines.length;
  if (!morning) add("아침: 오늘은 칸이 할 일이 없었어요", "morning");
  const steps = lines.map((l) => ({ line: l }));
  // 낮: 손님
  for (const e of events) if (e.t === "buy" || e.t === "miss") steps.push({ line: { text: eventLine(e, before), cls: e.t }, ev: e });
  // 저녁
  const arr = arrivalLine(events, before);
  steps.push({ line: { text: arr || "저녁: 장을 닫았어요", cls: "evening" }, evening: true });

  const cust = art.querySelector(".cust");
  const setStock = (id) => {
    const t = art.querySelector(`[data-stock="${id}"]`);
    if (!t) return;
    const n = stocks.get(id) || 0;
    t.textContent = n <= 0 ? "다 팔림" : `${n}개`;
    const g = t.closest(".box");
    if (g) g.classList.toggle("empty", n <= 0);
  };
  const write = (l) => {
    const li = document.createElement("li");
    if (l.cls) li.className = l.cls;
    li.textContent = l.text;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  };
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const clear = () => { for (const t of timers) clearTimeout(t); timers.clear(); };

  function showCustomer(ev) {
    if (!cust) return;
    const c = CUSTOMER.get(ev.customer_id);
    const kind = c ? c.kind : "사람";
    cust.dataset.kind = kind;
    cust.querySelector(".cust-robe").setAttribute("fill", KIND_ROBE[kind] || KIND_ROBE["사람"]);
    cust.classList.add("in");
    bubble.textContent = bubbleText(ev);
    bubble.dataset.kind = ev.t;
    bubble.hidden = false;
  }
  function hideCustomer() {
    if (cust) cust.classList.remove("in");
    bubble.hidden = true;
  }

  function finish() {
    if (finished) return;
    finished = true;
    clear();
    hideCustomer();
    if (typeof onDone === "function") onDone();
  }

  let i = 0;
  function next() {
    if (finished) return;
    if (i >= steps.length) { later(finish, step / 2); return; }
    const s = steps[i++];
    if (s.ev) {
      showCustomer(s.ev);
      if (s.ev.t === "buy") { stocks.set(s.ev.item_id, (stocks.get(s.ev.item_id) || 0) - s.ev.qty); setStock(s.ev.item_id); }
      write(s.line);
      later(hideCustomer, step * 0.7);
      later(next, step);
      return;
    }
    if (s.evening) for (const it of after.items) { stocks.set(it.item_id, it.stock); setStock(it.item_id); }
    write(s.line);
    later(next, step * 0.6);
  }
  next();
  return {
    skip() {
      if (finished) return;
      // 남은 줄을 모두 적고 저녁 재고로
      while (i < steps.length) write(steps[i++].line);
      for (const it of after.items) { stocks.set(it.item_id, it.stock); setStock(it.item_id); }
      finish();
    },
    stop() { finished = true; clear(); },
  };
}
