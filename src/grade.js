// 채점 핵심 (설계서 4-4, 4-6). 실행은 sqlcore/sqlrun이 하고,
// 이 파일은 결과 표를 비교하고 오류를 설명할 뿐이다.
import { ERRORS, FALLBACK, DETECTIVE_ID } from "../data/errors.js";
import { sqlEul, sqlEun, sqlI } from "./shuffle.js";

// 카드를 공백으로 잇는다. 줄 주석(--, 1장 심화)이 든 카드 뒤는 줄바꿈으로 이어 다음 카드가 주석에 삼켜지지 않게 한다.
// 주석이 없는 조립은 v0.1과 같은 글자(공백 잇기).
export function cardsToSql(cards) {
  const list = cards || [];
  let out = "";
  list.forEach((c, i) => {
    if (i) out += hasLineComment(list[i - 1]) ? "\n" : " ";
    out += c;
  });
  return out;
}

// 글자 상수·따옴표 이름 바깥에 -- 가 있는가(카드 한 장은 한 줄이라 그 뒤는 끝까지 주석)
function hasLineComment(text) {
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      for (i++; i < s.length; i++) {
        if (s[i] === close) { if (close !== "]" && s[i + 1] === close) { i++; continue; } break; }
      }
    } else if (c === "-" && s[i + 1] === "-") return true;
  }
  return false;
}

// 맨 바깥(괄호 깊이 0) 문장에 ORDER BY가 있는지. 글자·주석·괄호 안은 무시.
export function hasOrderBy(sql) {
  const s = String(sql ?? "");
  let depth = 0;
  let word = "";
  const words = []; // 깊이 0의 낱말만. 그 밖의 덩어리(글자·괄호)는 "#"로 끊어 둔다.
  const flush = () => { if (word) { if (depth === 0) words.push(word.toUpperCase()); word = ""; } };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/[A-Za-z0-9_]/.test(c)) { word += c; continue; }
    flush();
    if (c === "'" || c === '"' || c === "`") {
      for (i++; i < s.length; i++) {
        if (s[i] === c) { if (s[i + 1] === c) i++; else break; }
      }
      if (depth === 0) words.push("#");
    } else if (c === "-" && s[i + 1] === "-") {
      while (i < s.length && s[i] !== "\n") i++;
    } else if (c === "/" && s[i + 1] === "*") {
      const e = s.indexOf("*/", i + 2);
      i = e < 0 ? s.length : e + 1;
    } else if (c === "(") { if (depth === 0) words.push("#"); depth++; }
    else if (c === ")") { depth = Math.max(0, depth - 1); if (depth === 0) words.push("#"); }
  }
  flush();
  for (let i = 0; i + 1 < words.length; i++) {
    if (words[i] === "ORDER" && words[i + 1] === "BY") return true;
  }
  return false;
}

function normVal(v) {
  if (v === null || v === undefined) return "N";
  if (typeof v === "number") return "n" + String(Math.round(v * 1e4) / 1e4 + 0);
  if (typeof v === "bigint") return "n" + v.toString();
  return "s" + String(v);
}
const rowKey = (row) => JSON.stringify(row.map(normVal));

// exp, got: { columns, rows }. why: "columns" | "rowcount" | "values" | null
export function sameTable(exp, got, { ordered = false } = {}) {
  const ec = exp.columns || [], gc = got.columns || [];
  if (ec.length !== gc.length || ec.some((c, i) => String(c).toLowerCase() !== String(gc[i]).toLowerCase())) {
    return { ok: false, why: "columns" };
  }
  const er = exp.rows || [], gr = got.rows || [];
  if (er.length !== gr.length) return { ok: false, why: "rowcount" };
  let a = er.map(rowKey), b = gr.map(rowKey);
  if (!ordered) { a = a.sort(); b = b.sort(); }
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return { ok: false, why: "values" };
  return { ok: true, why: null };
}

// 판정 R48: used가 정답 cards를 차례대로 모두 품고(띄엄띄엄이어도 됨) 카드가 더 있는가.
// SQLite는 「FROM shops items」의 뒤 낱말을 표 별칭으로 읽어 결과가 같아지므로, 결과 비교만으로는 남는 카드를 못 잡는다.
export function isSuperset(cards, used) {
  const a = cards || [], u = used || [];
  if (u.length <= a.length) return false;
  let k = 0;
  for (const c of u) if (k < a.length && c === a[k]) k++;
  return k === a.length;
}

// 남는 카드 안내(판정 R48). 두억이 말투: 기본과 탐정(DETECTIVE_ID) 두 가지. 어느 카드인지는 알려 주지 않는다.
const EXTRA_LINES = {
  body: "정답 카드는 다 있는데, 카드가 하나 더 들어갔어요. 빼도 되는 카드를 찾아볼까요?",
  detective: "필요한 단서는 모두 모였는데, 현장에 카드가 하나 더 놓여 있어요. 빼도 되는 카드를 찾아봐요.",
};
export function extraLine(outfit) {
  return outfit === DETECTIVE_ID ? EXTRA_LINES.detective : EXTRA_LINES.body;
}

export function judgeBuild(item, got, exp, usedCards) {
  if (got && got.error) return { ok: false, reason: "error" };
  const ordered = hasOrderBy(cardsToSql(item.cards));
  const r = sameTable(exp, got, { ordered });
  if (!r.ok) return { ok: false, reason: r.why === "columns" ? "columns" : "rows" };
  // 잘린 결과는 같은 표로 보지 않는다.
  if (got.truncated !== exp.truncated && (got.truncated || exp.truncated)) return { ok: false, reason: "rows" };
  // 판정 R48: 결과가 같아도 정답 카드 + 남는 카드(표 별칭으로 읽힌 낱말 등)면 오답. 진짜 다른 답(상위 집합 아님)은 그대로 결과로 채점
  if (isSuperset(item.cards, usedCards)) return { ok: false, reason: "extra" };
  const used = new Set(usedCards || []);
  const missingNeed = (item.need || []).filter((n) => !used.has(n));
  if (missingNeed.length) return { ok: false, reason: "need", missingNeed };
  return { ok: true, reason: null };
}

// error: SQLite 오류 문장 또는 엔진 오류 이름. 모르는 오류여도 예외를 던지지 않는다.
// outfit: 입은 의상 id. 탐정 의상(DETECTIVE_ID, 판정 R14)이면 탐정 말투.
// 설명 글의 자리: {name} 문제가 된 이름, {i} 「(이)라는」의 「이」, {eun} 은/는 — 이름의 받침에 맞춘다.
export function explain(error, outfit) {
  const msg = String(error && typeof error === "object" ? error.message ?? "" : error ?? "");
  for (const e of Object.values(ERRORS)) {
    const m = e.match.exec(msg);
    if (!m) continue;
    const text = outfit === DETECTIVE_ID ? e.detective : e.body;
    const name = m[1] != null && m[1] !== "" ? m[1] : "그 이름";
    return text.replace(/\{(name|i|eun)\}/g, (_, k) => (k === "name" ? name : k === "i" ? sqlI(name) : sqlEun(name)));
  }
  return FALLBACK;
}

/** 결과는 맞았지만 꼭 써야 할 카드(need)를 안 썼을 때의 안내 제목 (설계 §4-4-4). 조사는 마지막 카드의 받침에 맞춘다 */
export function needLine(missing) {
  const words = (missing || []).map(String).join(", ");
  return `결과는 맞았는데 이번엔 ${words}${sqlEul(words)} 써 보자`;
}
