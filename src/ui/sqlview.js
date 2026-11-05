// SQL 실행 결과 표를 화면 조각에 채우기 (설명 카드·객관식 보기·「쓸 표 보기」 공용, v0.1 작업 7).
// 글자(HTML)에는 `<div class="sql-result" data-sql="…" data-box="card|opt|sheet">` 자리만 두고, 화면을 붙인 뒤
//   const stop = fillResults(root, sql, { onFilled, onFailed })
// 를 부르면 실행기가 준비되는 대로 표를 채운다. 화면을 떠날 때 stop()을 부르면 이후에 끝난 실행은 아무것도 그리지 않는다.
// - 실행기가 준비 중: 자리의 「표를 불러오는 중…」을 그대로 둔다. 준비되면 실행해서 채움.
// - 실행기가 실패(failed): box별 안내(onFailed가 있으면 그쪽이 그림). 카드는 SQL이 그대로 읽힌다.
// - 실행 오류: 짧은 안내 한 줄(내용 점검기가 막아야 하는 경우).
import { SCHEMA } from "../../data/schema.js";
import { tableHTML } from "./table.js";
import { esc } from "./dom.js";

export const LOADING_LINE = "표를 불러오는 중…";
export const FAIL_LINE = "실행기를 불러오지 못해 표를 보여 줄 수 없어요";
export const OPT_ROWS = 5;     // 객관식 보기의 작은 표

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

function paint(node, r, box) {
  if (r.error) {
    node.innerHTML = `<p class="muted sql-err">표를 보여 줄 수 없어요</p>`;
    return;
  }
  node.innerHTML = tableHTML(r, box === "opt"
    ? { ko: SCHEMA, max: OPT_ROWS, label: "보기 결과 표", focusable: false }
    : { ko: SCHEMA, label: box === "sheet" ? "표 미리 보기" : "실행 결과 표" });
  node.dataset.filled = "1";
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
      paint(node, r, node.dataset.box);
      if (onFilled) { try { onFilled(node, r); } catch (e) { console.error(e); } }
    }
  });
  return () => { stopped = true; w.cancel(); };
}
