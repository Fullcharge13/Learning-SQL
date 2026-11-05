// 결과 표 그리기 (설계 §3 「결과 표」, §4-4-5). 화면 없이 글자(HTML)만 만든다 → node 시험 가능.
// - 앞 max(기본 50)행만 그리고 나머지는 「… 외 N행」. 실행기가 5,000행에서 잘랐으면 「… 외 N행 이상」.
// - 열 이름(영어) 아래에 한글 뜻(SCHEMA). tables를 주면 그 표에서 먼저 찾고, 없으면 모든 표에서 찾는다.
//   단, 결과 열 이름이 별칭이 진짜 열 이름을 가린 것이면(`SELECT name price FROM items`) 뜻을 달지 않는다.
//   결과 표의 머리글만으로는 진짜 열인지 별칭인지 알 수 없어서(sql.js가 열의 출처를 알려 주지 않음) sql을 받아 별칭을 찾는다.
// - 값은 모두 이스케이프. NULL은 흐린 「NULL」, 실수는 소수 넷째 자리까지.
// - 가로로 넘치면 표 상자(.rt-scroll) 안에서만 옆으로 밀린다(CSS).
import { esc } from "./dom.js";

export const TABLE_MAX = 50;

function koOf(col, ko, tables) {
  if (!ko) return null;
  const has = (t) => Object.hasOwn(ko, t) && ko[t] && ko[t].cols && Object.hasOwn(ko[t].cols, col);
  for (const t of tables || []) if (has(t)) return ko[t].cols[col];
  for (const t of Object.keys(ko)) if (has(t)) return ko[t].cols[col];
  return null;
}

// ---- 별칭 찾기: SQL을 낱말로 자르고(글자·주석·따옴표 이름 처리), SELECT 목록마다 별칭을 본다 ----
const KW_END = new Set(["from", "where", "group", "having", "order", "limit", "union", "except", "intersect", "window"]);
const NOT_ALIAS = new Set(["null", "true", "false", "and", "or", "not", "is", "in", "like", "glob", "between", "then", "else",
  "when", "case", "distinct", "all", "as", "escape", "collate", "asc", "desc", "over", "filter", "by", "on", "using", "end"]);
// 별칭 앞에 올 수 있는 것: 이름·숫자·글자·닫는 괄호·END
const ALIAS_PREV = (t) => t.type === "id" || t.type === "qid" || t.type === "num" || t.type === "str" || t.v === ")" || t.lv === "end";

function tokens(sql) {
  const out = [];
  const src = String(sql ?? "");
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "-" && src[i + 1] === "-") { const j = src.indexOf("\n", i); i = j < 0 ? src.length : j; continue; }
    if (c === "/" && src[i + 1] === "*") { const j = src.indexOf("*/", i + 2); i = j < 0 ? src.length : j + 2; continue; }
    const close = { "'": "'", '"': '"', "`": "`", "[": "]" }[c];
    if (close) {
      let j = i + 1, text = "";
      while (j < src.length) {
        if (src[j] === close) { if (close !== "]" && src[j + 1] === close) { text += close; j += 2; continue; } break; }
        text += src[j++];
      }
      out.push({ type: c === "'" ? "str" : "qid", v: text, lv: text.toLowerCase() });
      i = j + 1;
      continue;
    }
    const m = /^(?:[A-Za-z_\u0080-\uffff][\w\u0080-\uffff$]*|\d+(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+|\|\||<>|!=|<=|>=|==|<<|>>|.)/.exec(src.slice(i));
    const v = m[0];
    const type = /^[A-Za-z_\u0080-\uffff]/.test(v) ? "id" : /^\.?\d/.test(v) ? "num" : "op";
    out.push({ type, v, lv: v.toLowerCase() });
    i += v.length;
  }
  return out;
}

/** 이 SQL의 SELECT 목록에서, 같은 이름의 진짜 열이 아닌 것에 붙은 별칭 이름들(소문자).
 *  바깥 SELECT뿐 아니라 WITH·서브쿼리 안의 별칭도 센다: 안쪽에서 이름을 바꾼 열이 바깥에서 그 이름으로 다시 나올 수 있어서
 *  (뜻을 틀리게 다느니 안 단다). `SELECT price AS price`, `SELECT t.price`처럼 진짜 열 그대로면 세지 않는다. */
export function shadowedNames(sql) {
  const T = tokens(sql);
  const out = new Set();
  const depthAt = [];
  let d = 0;
  for (const t of T) { if (t.v === ")") d--; depthAt.push(d); if (t.v === "(") d++; }
  for (let k = 0; k < T.length; k++) {
    if (T[k].lv !== "select" || T[k].type !== "id") continue;
    const dd = depthAt[k];
    const items = [[]];
    for (let j = k + 1; j < T.length; j++) {
      const t = T[j];
      if (depthAt[j] < dd) break;
      if (depthAt[j] === dd && t.type === "id" && KW_END.has(t.lv)) break;
      if (depthAt[j] === dd && t.v === ",") { items.push([]); continue; }
      items[items.length - 1].push({ ...t, top: depthAt[j] === dd && t.v !== "(" });
    }
    items.forEach((it, n) => {
      let x = it;
      if (n === 0) while (x.length && x[0].type === "id" && (x[0].lv === "distinct" || x[0].lv === "all")) x = x.slice(1);
      if (x.length < 2) return;
      const last = x[x.length - 1];
      let alias = null, expr = null;
      const asAt = x.length >= 3 && x[x.length - 2].top && x[x.length - 2].type === "id" && x[x.length - 2].lv === "as";
      if (asAt && last.type !== "op") { alias = last.lv; expr = x.slice(0, -2); }
      else if (last.top && (last.type === "qid" || last.type === "str" || (last.type === "id" && !NOT_ALIAS.has(last.lv)))
        && ALIAS_PREV(x[x.length - 2]) && x[x.length - 2].v !== ".") { alias = last.lv; expr = x.slice(0, -1); }
      if (alias == null) return;
      // 진짜 열 그대로인가: name · t.name (따옴표 이름 포함)
      const bare = (expr.length === 1 && /^(id|qid)$/.test(expr[0].type)) ? expr[0]
        : (expr.length === 3 && expr[1].v === "." && /^(id|qid)$/.test(expr[2].type)) ? expr[2] : null;
      if (!bare || bare.lv !== alias) out.add(alias);
    });
  }
  return out;
}

function cell(v) {
  if (v === null || v === undefined) return `<td class="null">NULL</td>`;
  if (typeof v === "number") {
    const n = Number.isInteger(v) ? v : Math.round(v * 1e4) / 1e4;
    return `<td class="num">${esc(String(n))}</td>`;
  }
  if (typeof v === "bigint") return `<td class="num">${esc(v.toString())}</td>`;
  if (v instanceof Uint8Array) return `<td class="null">(이진 값)</td>`;
  return `<td>${esc(v)}</td>`;
}

/**
 * @param r  { columns, rows, truncated }
 * @param o  { ko?: SCHEMA, tables?: string[], max = 50, label?: 읽기 도구용 이름, focusable = true (false: 단추 안에 넣는 표 — 따로 포커스를 받지 않음),
 *              sql?: 이 표를 만든 SQL — 주면 별칭이 가린 열 이름에는 한글 뜻을 달지 않는다 }
 */
export function tableHTML(r, { ko = null, tables = null, max = TABLE_MAX, label = "결과 표", focusable = true, sql = null } = {}) {
  const columns = Array.isArray(r && r.columns) ? r.columns : [];
  const rows = Array.isArray(r && r.rows) ? r.rows : [];
  const shown = rows.slice(0, Math.max(0, max));
  const rest = rows.length - shown.length;
  const shadow = sql ? shadowedNames(sql) : null;
  const head = columns.map((c) => {
    const k = shadow && shadow.has(String(c).toLowerCase()) ? null : koOf(String(c), ko, tables);
    return `<th scope="col"><span class="col-en">${esc(c)}</span>${k ? `<span class="col-ko">${esc(k)}</span>` : ""}</th>`;
  }).join("");
  const body = shown.map((row) => `<tr>${(Array.isArray(row) ? row : []).map(cell).join("")}</tr>`).join("");
  const more = rest > 0 ? `… 외 ${rest}행${r && r.truncated ? " 이상" : ""}` : "";
  const count = rows.length === 0 ? "0행 (조건에 맞는 행이 없어요)" : `${rows.length}행${r && r.truncated ? " 이상" : ""}`;
  return `<div class="rtable">
    <div class="rt-scroll"${focusable ? ` tabindex="0" role="region" aria-label="${esc(label)}"` : ""}>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </div>
    <p class="rt-foot">${more ? `<span class="rt-more">${esc(more)}</span>` : `<span class="rt-count">${esc(count)}</span>`}</p>
  </div>`;
}
