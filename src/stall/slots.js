// 자동화 칸과 카드: 어떤 칸·카드가 열렸는지, 카드를 SQL로 잇는 일, 실행 결과에서 물건·값을 읽는 일. 순수 함수만.
import { SLOTS, CARDS, ITEMS } from "../../data/stall.js";
import { explain } from "../grade.js";

const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
const CARD_BY_TEXT = new Map(CARDS.filter((c) => c.text != null).map((c) => [c.text, c]));
const FULL_CHAPTER = 7; // 전체 조립은 7장 통과 뒤

export const openSlots = (passed) => SLOTS.filter((s) => passed && passed.has(s.chapter));
export const openCards = (passed) => CARDS.filter((c) => passed && passed.has(c.chapter));
export const fullOpen = (passed) => !!passed && passed.has(FULL_CHAPTER);

export function cardLocked(card, passed) {
  return passed && passed.has(card.chapter) ? null : `${card.chapter}장을 끝내면 열려요`;
}

// 틀 글자를 카드 토큰으로: {키}는 칸의 카드 자리, 나머지 낱말은 같은 글자의 카드
function frameTokens(def, parts) {
  const out = [];
  for (const m of def.tpl.matchAll(/\{(\w+)\}|ORDER BY|\S+/g)) {
    if (m[1]) {
      const cards = parts && parts[m[1]];
      if (!Array.isArray(cards) || cards.length === 0) return null; // 빈 틀 자리
      out.push(...cards);
    } else {
      const c = CARD_BY_TEXT.get(m[0]);
      if (!c) return null;
      out.push({ c: c.id });
    }
  }
  return out;
}

function tokens(def, st) {
  if (!st || !def) return null;
  if (st.mode === "full") return st.parts && Array.isArray(st.parts.full) && st.parts.full.length ? st.parts.full : null;
  return def.tpl ? frameTokens(def, st.parts) : null;
}

// 카드를 공백으로 잇되 「COALESCE(」 뒤, 「)」·「,」 앞은 붙인다. 숫자 카드는 n
function join(list) {
  let out = "";
  for (const t of list) {
    const def = CARD_BY_ID.get(t.c);
    if (!def) return null;
    const text = def.kind === "num" ? String(Number.isInteger(t.n) ? t.n : def.min) : def.text;
    const glue = out === "" || out.endsWith("(") || text === ")" || text === ",";
    out += (glue ? "" : " ") + text;
  }
  return out;
}

export function slotSql(def, st) {
  const t = tokens(def, st);
  return t ? join(t) : null;
}

export function toFull(def, st) {
  const t = tokens(def, st);
  return { on: !!(st && st.on), mode: "full", parts: { full: t ? t.map((x) => ({ ...x })) : [] } };
}

const NO_COL = "결과에 name이나 item_id 열이 있어야 해요";

export function acceptRows(def, result, stall) {
  if (!result || result.error) return { ok: false, why: explain(result ? result.error : "") };
  const rows = Array.isArray(result.rows) ? result.rows : [];
  if (def.kind === "number") {
    const v = rows.length && Array.isArray(rows[0]) ? rows[0][0] : undefined;
    return { ok: true, value: v === undefined ? null : v };
  }
  const cols = (result.columns || []).map((c) => String(c).toLowerCase());
  let idx = cols.indexOf("item_id"), byId = true;
  if (idx < 0) { idx = cols.indexOf("name"); byId = false; }
  if (idx < 0) return { ok: false, why: NO_COL };
  const have = new Set((stall.items || []).map((it) => it.item_id));
  const nameToId = new Map(ITEMS.map((it) => [it.name, it.item_id]));
  const seen = new Set(), ids = [];
  for (const r of rows) {
    const raw = r[idx];
    const id = byId ? Number(raw) : nameToId.get(raw);
    if (!Number.isInteger(id) || !have.has(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return { ok: true, ids };
}
