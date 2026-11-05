// 「쓸 표 보기」 시트 (설계 §3): 문제가 쓰는 표마다 한글 이름, 열 목록(`name — 이름`), `SELECT * FROM 표 LIMIT 5` 결과.
//   openTables(names, sql) → 닫힐 때 resolve하는 약속. 닫기 단추·Esc·바깥 누르기로 닫힘(dialog 도우미).
// 시트를 닫은 뒤에 끝난 실행은 아무것도 그리지 않는다.
import { SCHEMA } from "../../data/schema.js";
import { dialog, esc } from "./dom.js";
import { fillResults } from "./sqlview.js";

export function tablesHTML(names) {
  return (names || []).filter((n) => Object.hasOwn(SCHEMA, n)).map((n) => {
    const t = SCHEMA[n];
    return `<section class="tbl-sec" data-table="${esc(n)}">
      <h3 class="tbl-name">${esc(t.ko)} <small class="mono">${esc(n)}</small></h3>
      <ul class="col-list">${Object.entries(t.cols).map(([c, ko]) => `<li><code>${esc(c)}</code> — ${esc(ko)}</li>`).join("")}</ul>
      <div class="sql-result" data-sql="${esc(`SELECT * FROM ${n} LIMIT 5`)}" data-box="sheet"><p class="muted">표를 불러오는 중…</p></div>
    </section>`;
  }).join("");
}

export function openTables(names, sql) {
  const p = dialog({
    title: "쓸 표 보기",
    body: `<div class="tables-sheet">${tablesHTML(names)}</div>`,
    buttons: [{ label: "닫기", value: true, kind: "primary" }],
  });
  // dialog()는 창을 바로 붙이므로 지금 찾을 수 있다
  const sheet = document.querySelector(".tables-sheet");
  const stop = sheet ? fillResults(sheet, sql) : () => {};
  return p.then((v) => { stop(); return v; });
}
