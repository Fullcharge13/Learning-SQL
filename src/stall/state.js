// 가게 상태: 만들기·정리(저장에서 읽을 때)·성장 사기·열림 판정. 순수 함수만.
import {
  ITEMS, UPGRADES, SLOTS, CARDS, START_MONEY, STOCK_MAX, SHELF, SHELF_BIG, REGULARS, REGULARS_BIG,
  KEEP_DAYS, LOG_DAYS, MONEY_MAX, UNLOCK_CHAPTER,
} from "../../data/stall.js";
import { examId } from "../advanced.js";

const BASE_ITEMS = ITEMS.filter((it) => !it.upgrade);
const NEW_ITEMS = ITEMS.filter((it) => it.upgrade === "newitems");
const MAX_CARDS = 40;      // 한 칸의 카드 수 한도(설계 §3-2)
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
const SLOT_BY_ID = new Map(SLOTS.map((s) => [s.id, s]));
const UPGRADE_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const itemDef = (id) => ITEMS.find((it) => it.item_id === id);

function startItem(it) {
  return { item_id: it.item_id, price: it.price, stock: it.stock };
}

export function newStall(seed) {
  return {
    v: 1, seed, day: 1, money: START_MONEY,
    items: BASE_ITEMS.map(startItem),
    shelf: SHELF, regulars: REGULARS, upgrades: [],
    slots: { restock: { on: true, mode: "frame", parts: { where: [{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 1 }] } } },
    orders: [], order: { idx: 0, done: [], progress: {} },
    log: [], last: null, opened: false,
  };
}

// 카드 목록 하나를 정리: 지금 데이터에 있는 카드만, 숫자 카드는 n을 0~30 정수로
function cleanCards(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list) {
    if (out.length >= MAX_CARDS) break;
    if (!isPlain(e) || typeof e.c !== "string" || !CARD_BY_ID.has(e.c)) continue;
    const def = CARD_BY_ID.get(e.c);
    if (def.kind === "num") out.push({ c: e.c, n: isInt(e.n) ? clamp(e.n, def.min, def.max) : def.min });
    else out.push({ c: e.c });
  }
  return out;
}

// 칸이 쓰는 카드 자리 이름: 틀이면 틀의 빈칸, 전체 조립이면 full
function partKeys(def, mode) {
  if (mode === "full") return ["full"];
  return def.frame === "where" ? ["where"] : def.frame === "order" ? ["order", "limit"] : ["full"];
}

function cleanSlot(def, raw) {
  if (!isPlain(raw)) return null;
  let mode = raw.mode === "full" ? "full" : "frame";
  if (def.frame === "full") mode = "full";
  const parts = {};
  const rp = isPlain(raw.parts) ? raw.parts : {};
  for (const k of partKeys(def, mode)) if (Object.hasOwn(rp, k)) parts[k] = cleanCards(rp[k]);
  return { on: raw.on === true, mode, parts };
}

function cleanItems(raw, upgrades) {
  const have = new Map();
  for (const e of Array.isArray(raw) ? raw : []) {
    if (!isPlain(e) || !isInt(e.item_id)) continue;
    const def = itemDef(e.item_id);
    if (!def || have.has(def.item_id)) continue;
    if (def.upgrade && !upgrades.includes(def.upgrade)) continue; // 새 물건은 성장을 샀을 때만
    const price = def.price === null && e.price === null ? null
      : isInt(e.price) && e.price >= 0 && e.price <= 999 ? e.price : def.price;
    const stock = isInt(e.stock) ? clamp(e.stock, 0, STOCK_MAX) : def.stock;
    have.set(def.item_id, { item_id: def.item_id, price, stock });
  }
  // 기본 물건은 하나도 잃지 않는다(저장에서 빠졌으면 시작 상태로 채움)
  for (const def of BASE_ITEMS) if (!have.has(def.item_id)) have.set(def.item_id, startItem(def));
  return [...have.values()].sort((a, b) => a.item_id - b.item_id);
}

function cleanProgress(raw) {
  const out = {};
  if (!isPlain(raw)) return out;
  for (const k of Object.keys(raw)) {
    if (BAD_KEYS.has(k)) continue;
    const v = raw[k];
    if ((typeof v === "number" && Number.isFinite(v)) || typeof v === "boolean" || typeof v === "string") out[k] = v;
  }
  return out;
}

const plainList = (v, cap) => (Array.isArray(v) ? v.filter(isPlain).slice(-cap).map((e) => structuredClone(e)) : []);

/** 저장에서 읽은 값을 가게 상태로 정리한다. 원본은 건드리지 않고, 못 쓸 값은 기본값으로. */
export function cleanStall(raw) {
  if (!isPlain(raw)) return newStall(1);
  const seed = isInt(raw.seed) ? raw.seed : 1;
  const base = newStall(seed);
  const day = isInt(raw.day) && raw.day >= 1 ? raw.day : 1;
  const money = isInt(raw.money) ? clamp(raw.money, 0, MONEY_MAX) : START_MONEY;
  const upgrades = [];
  for (const id of Array.isArray(raw.upgrades) ? raw.upgrades : []) {
    if (typeof id === "string" && UPGRADE_BY_ID.has(id) && !upgrades.includes(id)) upgrades.push(id);
  }
  const slots = {};
  const rs = isPlain(raw.slots) ? raw.slots : {};
  for (const def of SLOTS) {
    if (!Object.hasOwn(rs, def.id)) continue;
    const s = cleanSlot(def, rs[def.id]);
    if (s) slots[def.id] = s;
  }
  // 슬롯 자체가 없으면 시작 칸(재고 채우기)을 다시 깔지는 않는다: 학습자가 비운 것일 수 있다.
  // 다만 slots 칸 자체가 없는(옛·깨진) 저장은 시작 상태를 쓴다.
  const slotsOut = isPlain(raw.slots) ? slots : base.slots;
  const ro = isPlain(raw.order) ? raw.order : {};
  return {
    v: 1, seed, day, money,
    items: cleanItems(raw.items, upgrades),
    shelf: upgrades.includes("shelf") ? SHELF_BIG : SHELF,
    regulars: upgrades.includes("regulars") ? REGULARS_BIG : REGULARS,
    upgrades,
    slots: slotsOut,
    orders: (Array.isArray(raw.orders) ? raw.orders : [])
      .filter((o) => isPlain(o) && isInt(o.day) && o.day >= day - KEEP_DAYS)
      .map((o) => structuredClone(o)),
    order: {
      idx: isInt(ro.idx) && ro.idx >= 0 ? ro.idx : 0,
      done: Array.isArray(ro.done) ? ro.done.filter((x) => typeof x === "string") : [],
      progress: cleanProgress(ro.progress),
    },
    log: plainList(raw.log, LOG_DAYS),
    last: isPlain(raw.last) ? structuredClone(raw.last) : null,
    opened: raw.opened === true,
  };
}

/** 성장 사기. 순수: 새 객체를 돌려준다. 실패하면 같은 가게와 이유. */
export function buyUpgrade(stall, id) {
  const up = UPGRADE_BY_ID.get(id);
  if (!up) return { ok: false, stall, reason: "unknown" };
  if (stall.upgrades.includes(id)) return { ok: false, stall, reason: "owned" };
  if (stall.money < up.price) return { ok: false, stall, reason: "money" };
  const next = structuredClone(stall);
  next.money -= up.price;
  next.upgrades.push(id);
  if (id === "newitems") for (const it of NEW_ITEMS) if (!next.items.some((x) => x.item_id === it.item_id)) next.items.push({ item_id: it.item_id, price: null, stock: 10 });
  if (id === "shelf") next.shelf = SHELF_BIG;
  if (id === "regulars") next.regulars = REGULARS_BIG;
  return { ok: true, stall: next };
}

/** 장 평가(advanced.js의 examId와 같은 규칙)를 통과한 장 번호들 */
export function passedChapters(chapters, completed) {
  const done = new Set(completed || []);
  const out = new Set();
  for (const ch of chapters || []) {
    const ex = examId(ch);
    if (ex && done.has(ex)) out.add(ch.id);
  }
  return out;
}

export const stallOpen = (passed) => !!passed && passed.has(UNLOCK_CHAPTER);
