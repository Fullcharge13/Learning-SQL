// 결과 표 그리기 (설계 §3 「결과 표」, §4-4-5). 화면 없이 글자(HTML)만 만든다 → node 시험 가능.
// - 앞 max(기본 50)행만 그리고 나머지는 「… 외 N행」. 실행기가 5,000행에서 잘랐으면 「… 외 N행 이상」.
// - 열 이름(영어) 아래에 한글 뜻(SCHEMA). tables를 주면 그 표에서 먼저 찾고, 없으면 모든 표에서 찾는다.
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
 * @param o  { ko?: SCHEMA, tables?: string[], max = 50, label?: 읽기 도구용 이름, focusable = true (false: 단추 안에 넣는 표 — 따로 포커스를 받지 않음) }
 */
export function tableHTML(r, { ko = null, tables = null, max = TABLE_MAX, label = "결과 표", focusable = true } = {}) {
  const columns = Array.isArray(r && r.columns) ? r.columns : [];
  const rows = Array.isArray(r && r.rows) ? r.rows : [];
  const shown = rows.slice(0, Math.max(0, max));
  const rest = rows.length - shown.length;
  const head = columns.map((c) => {
    const k = koOf(String(c), ko, tables);
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
