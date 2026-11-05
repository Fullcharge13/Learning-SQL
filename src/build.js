// 카드 조립 규칙 (설계서 4-1·4-3·4-5). 화면 없이 도는 순수 함수.
// 상태는 JSON 그대로 저장할 수 있다: { bank: Card[], line: number[] }
//   Card = { text, ko, id }. id는 정답 카드 0..n-1(정답 순서), 그 뒤가 헷갈림 카드.
import { SCHEMA } from "../data/schema.js";
import { cardsToSql } from "./grade.js";
import { hashStr, mulberry32 } from "./template.js";

function koOf(text, tables) {
  if (Object.hasOwn(SCHEMA, text)) return SCHEMA[text].ko;
  const q = /^(\w+)\.(\w+)$/.exec(text);
  if (q && Object.hasOwn(SCHEMA, q[1]) && Object.hasOwn(SCHEMA[q[1]].cols, q[2])) return SCHEMA[q[1]].cols[q[2]];
  const find = (names) => {
    for (const t of names) {
      if (Object.hasOwn(SCHEMA, t) && Object.hasOwn(SCHEMA[t].cols, text)) return SCHEMA[t].cols[text];
    }
    return null;
  };
  return find(tables || []) ?? find(Object.keys(SCHEMA));
}

export function newBuild(item, seed) {
  const texts = [...item.cards, ...(item.extra || [])];
  const cards = texts.map((text, id) => ({ text, ko: koOf(text, item.tables), id }));
  const rng = mulberry32(hashStr(`${item.id}|${seed}`));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { bank: cards, line: [] };
}

export function tap(state, from, pos) {
  const bank = state.bank.map((c) => ({ ...c }));
  let line = [...state.line];
  if (from === "bank") {
    const c = state.bank[pos];
    if (c && !line.includes(c.id)) line.push(c.id);
  } else if (from === "line") {
    if (pos >= 0 && pos < line.length) line.splice(pos, 1);
  }
  return { bank, line };
}

const textById = (state, id) => state.bank.find((c) => c.id === id)?.text;

export function usedTexts(state) {
  return state.line.map((id) => textById(state, id));
}

export function sqlOf(state) {
  return cardsToSql(usedTexts(state));
}

// 글자가 text인, 줄에 없는 카드 하나. 정답 카드(작은 번호)를 먼저 고른다.
function pickUnused(state, text, line) {
  const c = state.bank.filter((b) => b.text === text && !line.includes(b.id)).sort((a, b) => a.id - b.id)[0];
  return c ? c.id : null;
}

export function hint(state, item, level) {
  if (level === 1) return { text: item.hints[0] };
  if (level === 2) return { text: item.hints[1] };
  const bank = state.bank.map((c) => ({ ...c }));
  const n = item.cards.length;
  if (level === 3) {
    return { state: { bank, line: Array.from({ length: Math.floor(n / 2) }, (_, i) => i) } };
  }
  const used = usedTexts(state);
  let k = 0;
  while (k < used.length && k < n && used[k] === item.cards[k]) k++;
  if (k >= n && state.line.length === n) return { state: { bank, line: [...state.line] } };
  const line = state.line.slice(0, k);
  if (k < n) {
    const id = pickUnused(state, item.cards[k], line);
    if (id != null) line.push(id);
  }
  return { state: { bank, line } };
}
