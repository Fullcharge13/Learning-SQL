// 「쓸 표 보기」 시트 (설계 §3): 문제가 쓰는 표마다 한글 이름, 열 목록(`name — 이름`), `SELECT * FROM 표` 결과(작은 표는 통째로, 큰 표는 앞 20행 + 전체 행 수 — v0.2.1).
//   openTables(names, sql) → 닫힐 때 resolve하는 약속. 닫기 단추·Esc·바깥 누르기로 닫힘(dialog 도우미).
//   openTables(names, sql, { schema, ledgerSql }) (v0.3 가게): 장터 대신 가게 장부. 표 설명은 schema(LEDGER_SCHEMA),
//     표는 sql.runLedger(ledgerSql, [SELECT * FROM …])로 오늘 아침 장부를 새로 올려 한 번에 돌린다.
// 시트를 닫은 뒤에 끝난 실행은 아무것도 그리지 않는다.
import { SCHEMA } from "../../data/schema.js";
import { dialog, esc } from "./dom.js";
import { fillResults, whenEngine, FAIL_LINE, SHEET_FULL, SHEET_HEAD } from "./sqlview.js";
import { tableHTML } from "./table.js";

export function tablesHTML(names, schema = SCHEMA) {
  return (names || []).filter((n) => Object.hasOwn(schema, n)).map((n) => {
    const t = schema[n];
    return `<section class="tbl-sec" data-table="${esc(n)}">
      <h3 class="tbl-name">${esc(t.ko)} <small class="mono">${esc(n)}</small></h3>
      <ul class="col-list">${Object.entries(t.cols).map(([c, ko]) => `<li><code>${esc(c)}</code> — ${esc(ko)}</li>`).join("")}</ul>
      <div class="sql-result" data-sql="${esc(`SELECT * FROM ${n}`)}" data-box="sheet"><p class="muted">표를 불러오는 중…</p></div>
    </section>`;
  }).join("");
}

/** 가게 장부 표 채우기: 실행기가 준비되면 장부를 올려 표마다 SELECT * 를 한 번에 돌린다. 돌려주는 함수를 부르면 멈춤 */
function fillLedger(root, sql, ledgerSql, schema) {
  let stopped = false;
  const nodes = Array.from(root.querySelectorAll(".sql-result[data-sql]"));
  if (!nodes.length) return () => {};
  const fail = (text) => { for (const n of nodes) if (n.isConnected) n.innerHTML = `<p class="muted sql-err">${esc(text)}</p>`; };
  const w = whenEngine(sql);
  w.promise.then(async (ok) => {
    if (stopped) return;
    if (!ok) { fail(FAIL_LINE); return; }
    let r;
    try { r = await sql.runLedger(ledgerSql, nodes.map((n) => n.dataset.sql)); } catch (e) { r = { error: String(e), results: [] }; }
    if (stopped) return;
    if (r.error) { fail("표를 보여 줄 수 없어요"); return; }
    nodes.forEach((node, i) => {
      if (!node.isConnected) return;
      const res = r.results[i];
      if (!res || res.error) { node.innerHTML = `<p class="muted sql-err">표를 보여 줄 수 없어요</p>`; return; }
      const n = res.rows.length;
      node.innerHTML = n > SHEET_FULL
        ? tableHTML(res, { ko: schema, max: SHEET_HEAD, label: "표 미리 보기", more: `처음 ${SHEET_HEAD}행만 보여요 · 전체 ${n}행` })
        : tableHTML(res, { ko: schema, max: SHEET_FULL, label: "표 보기" });
      node.dataset.filled = "1";
    });
  });
  return () => { stopped = true; w.cancel(); };
}

export function openTables(names, sql, { schema = null, ledgerSql = null } = {}) {
  const ledger = typeof ledgerSql === "string" && ledgerSql !== "";
  const sc = schema || SCHEMA;
  const p = dialog({
    title: ledger ? "쓸 표 보기 · 가게 장부" : "쓸 표 보기", cls: "tables",
    body: `${ledger ? `<p class="muted tables-note">오늘 아침 가게 장부예요. 칸의 SQL은 이 표들을 봐요.</p>` : ""}<div class="tables-sheet">${tablesHTML(names, sc)}</div>`,
    buttons: [{ label: "닫기", value: true, kind: "primary" }],
  });
  // dialog()는 창을 바로 붙이므로 지금 찾을 수 있다
  const sheet = document.querySelector(".tables-sheet");
  const stop = !sheet ? () => {} : ledger ? fillLedger(sheet, sql, ledgerSql, sc) : fillResults(sheet, sql);
  return p.then((v) => { stop(); return v; });
}
