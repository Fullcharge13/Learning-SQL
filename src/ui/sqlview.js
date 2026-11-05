// SQL 실행 결과 표를 화면 조각에 채우기 (설명 카드·객관식 보기·「쓸 표 보기」 공용, v0.1 작업 7).
// 글자(HTML)에는 `<div class="sql-result" data-sql="…" data-box="card|opt|sheet">` 자리만 두고, 화면을 붙인 뒤
//   const stop = fillResults(root, sql, { onFilled, onFailed })
// 를 부르면 실행기가 준비되는 대로 표를 채운다. 화면을 떠날 때 stop()을 부르면 이후에 끝난 실행은 아무것도 그리지 않는다.
// - 실행기가 준비 중: 자리의 「표를 불러오는 중…」을 그대로 둔다. 준비되면 실행해서 채움.
// - 실행기가 실패(failed): box별 안내(onFailed가 있으면 그쪽이 그림). 카드는 SQL이 그대로 읽힌다.
// - 실행 오류: 짧은 안내 한 줄(내용 점검기가 막아야 하는 경우).
import { SCHEMA } from "../../data/schema.js";
import { tableHTML } from "./table.js";
import { esc, codeBlock } from "./dom.js";
import { OPT_ROWS } from "../template.js";
import { isCodey } from "../textkind.js";

export const LOADING_LINE = "표를 불러오는 중…";
export const FAIL_LINE = "실행기를 불러오지 못해 표를 보여 줄 수 없어요";
export { OPT_ROWS };          // 객관식 보기의 작은 표(값은 src/template.js — 매일 도전 틀이 「화면에서 같아 보임」을 같은 값으로 판정)

/** 실행기가 준비되면 true, 실패하면 false로 끝나는 약속. cancel()을 부르면 더 듣지 않는다(약속은 끝나지 않음) */
export function whenEngine(sql) {
  let off = () => {};
  const promise = new Promise((resolve) => {
    if (!sql) { resolve(false); return; }
    const check = () => {
      if (sql.status === "ready") { off(); resolve(true); return true; }
      if (sql.status === "failed") { off(); resolve(false); return true; }
      return false;
    };
    if (check()) return;
    if (typeof sql.listen === "function") off = sql.listen(check);
    if (sql.status === "idle" && typeof sql.preload === "function") sql.preload().catch(() => {});
  });
  return { promise, cancel: () => off() };
}

/** 결과 표 HTML (box: card·opt·sheet). 객관식 보기(opt)는 앞 OPT_ROWS행, 포커스 없음.
 *  sql: 이 표를 만든 SQL(별칭이 진짜 열 이름을 가리면 한글 뜻을 달지 않으려고) */
export function resultHTML(r, box, sql = null) {
  return tableHTML(r, box === "opt"
    ? { ko: SCHEMA, max: OPT_ROWS, label: "보기 결과 표", focusable: false, sql }
    : { ko: SCHEMA, label: box === "sheet" ? "표 미리 보기" : "실행 결과 표", sql });
}

function paint(node, r, box, sql) {
  if (r.error) {
    node.innerHTML = `<p class="muted sql-err">표를 보여 줄 수 없어요</p>`;
    return;
  }
  node.innerHTML = resultHTML(r, box, sql);
  node.dataset.filled = "1";
}

// ---- 객관식 보기 (ui/lesson.js renderChoice, 작업 11 고침 1회차) ----
// 보기 모양: 글자 "…" | { sql }(레슨: 화면이 fillResults로 돌려 채움) | { sql, result }(매일 도전 틀: 이미 돌린 표를 바로 그림).
export const OPT_FAIL_LINE = "표를 불러오지 못했어요";
const optSql = (o) => (o && typeof o === "object" ? o.sql : null);
const sqlKey = (s) => String(s ?? "").replace(/\s+/g, " ").trim().replace(/;$/, "").trim();
/** 두 SQL이 공백만 다른 같은 글자인가 */
export function sameSql(a, b) {
  return a != null && b != null && sqlKey(a) !== "" && sqlKey(a) === sqlKey(b);
}
/** 보기 중 하나가 문제에 보이는 SQL(code)과 같나 — 그러면 보기에 SQL 글자를 보이면 정답이 드러난다 */
export function optionsShowCode(options, code) {
  return (options || []).some((o) => sameSql(optSql(o), code));
}

/** 보기 단추 하나의 HTML (i: 화면 순서 0부터) */
export function choiceOptionHTML(o, i) {
  const q = optSql(o);
  const n = i + 1;
  if (q == null) {
    return `<button class="opt${isCodey(o) ? " mono" : ""}" role="radio" aria-checked="false" data-i="${i}"><span class="opt-key" aria-hidden="true">${n}</span><span class="opt-text">${esc(o)}</span></button>`;
  }
  const has = o.result && Array.isArray(o.result.columns) && Array.isArray(o.result.rows);
  // 표를 들고 있으면 바로 그린다(data-sql 자리가 없어 fillResults가 다시 돌리지 않음). 아니면 fillResults가 채울 자리
  const inner = has
    ? `<span class="opt-text sql-result" data-box="opt" data-filled="1">${resultHTML(o.result, "opt", q)}</span>`
    : `<span class="opt-text sql-result" data-sql="${esc(q)}" data-box="opt"><span class="muted">${esc(LOADING_LINE)}</span></span>`;
  const label = has ? `${n}번 보기: 열 ${o.result.columns.join(", ")}, ${o.result.rows.length}행` : `${n}번 보기: 표를 불러오는 중`;
  return `<button class="opt sqlopt" role="radio" aria-checked="false" data-i="${i}" data-sql="${esc(q)}" aria-label="${esc(label)}"><span class="opt-key" aria-hidden="true">${n}</span>${inner}</button>`;
}

/** 실행기가 실패해 보기 표를 못 그림: SQL 글자로 대신 보인다. 단 hideSql(보기 하나가 문제 SQL과 같음)이면 어떤 보기도 SQL을
 *  보이지 않고 안내 한 줄만(하나만 숨기면 남은 것으로 정답이 드러남) */
export function choiceOptionFailed(node, hideSql) {
  const b = node.closest(".opt");
  const n = b ? b.dataset.i * 1 + 1 : null;
  if (hideSql) {
    node.innerHTML = `<span class="muted">${esc(OPT_FAIL_LINE)}</span>`;
    if (b) b.setAttribute("aria-label", `${n}번 보기: ${OPT_FAIL_LINE}`);
    return;
  }
  node.classList.add("sql-text");
  node.textContent = node.dataset.sql;
  if (b) { b.classList.add("mono"); b.setAttribute("aria-label", `${n}번 보기: ${node.dataset.sql}`); }
}

/** 채점 뒤 「정답」 줄. 정답 보기 SQL이 문제에 이미 보이는 SQL과 같으면 SQL을 되풀이하지 않고 그 결과 표를 보인다
 *  (들고 있는 result, 없으면 화면에 그려 둔 표 drawnHTML, 그것도 없으면 표 없이) */
export function answerFeedbackHTML(right, answerIndex, code, drawnHTML = null) {
  const rq = optSql(right);
  if (rq == null) return `<p class="answer">정답: <span class="${isCodey(right) ? "mono" : ""}">${esc(right)}</span></p>`;
  const head = `<p class="answer">정답: ${answerIndex + 1}번 보기</p>`;
  if (!sameSql(rq, code)) return head + codeBlock(rq, "sql");
  const table = right.result ? resultHTML(right.result, "opt", rq) : drawnHTML || "";
  return head + (table ? `<div class="answer-table">${table}</div>` : "");
}

/** root 안의 `.sql-result[data-sql]` 자리를 모두 채운다. 돌려주는 함수를 부르면 멈춘다 */
export function fillResults(root, sql, { onFilled = null, onFailed = null } = {}) {
  let stopped = false;
  const nodes = Array.from(root.querySelectorAll(".sql-result[data-sql]"));
  if (!nodes.length) return () => {};
  const w = whenEngine(sql);
  w.promise.then(async (ok) => {
    if (stopped) return;
    for (const node of nodes) {
      if (stopped) return;
      if (!ok) {
        if (onFailed) onFailed(node);
        else node.innerHTML = `<p class="muted sql-err">${esc(FAIL_LINE)}</p>`;
        continue;
      }
      let r;
      try { r = await sql.run(node.dataset.sql); } catch (e) { r = { error: String(e), columns: [], rows: [] }; }
      if (stopped || !node.isConnected) return;
      paint(node, r, node.dataset.box, node.dataset.sql);
      if (onFilled) { try { onFilled(node, r); } catch (e) { console.error(e); } }
    }
  });
  return () => { stopped = true; w.cancel(); };
}
