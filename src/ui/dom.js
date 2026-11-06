// 화면 공용 도우미: 글자 이스케이프, 요소 만들기, 두억이 말풍선, 아이콘, 창(modal)
import { dueogiSVG } from "../dueogi.js";
import { milestoneFace } from "../say.js";

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** SQL·무늬가 든 글자용 esc: 이어진 밑줄(2개 이상, LIKE '__%')은 고정폭 글꼴에서 한 줄로 붙어 몇 개인지 셀 수 없다(휴대폰).
 *  밑줄마다 span.us로 감싸 CSS가 조금 좁혀 그린다(transform이라 칸 너비·SQL_COLS는 그대로). 한 덩어리는 span.us-run(줄바꿈 안 함).
 *  글자(textContent)는 그대로라 복사·읽기 프로그램·aria-label에는 영향이 없다. 밑줄 하나(item_id)는 감싸지 않는다 */
export function escCode(v) {
  return esc(v).replace(/_{2,}/g, (m) => `<span class="us-run">${'<span class="us">_</span>'.repeat(m.length)}</span>`);
}

export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));

/** 두억이 + 말풍선. face: src/dueogi.js FACE_IDS(설계 §8-3), sfx: 효과음 말풍선 글자(딩동! 등) */
export function dueogiSays({ outfit, face, text, size = 96, sfx = "", cls = "" }) {
  return `<div class="dueogi-row ${cls}">
    <div class="dueogi-wrap">${dueogiSVG({ outfit, face, size })}${sfx ? `<span class="sfx" aria-hidden="true">${esc(sfx)}</span>` : ""}</div>
    <p class="bubble">${escCode(text)}</p>
  </div>`;
}

// 선 아이콘 (24 격자). 색은 currentColor
const P = {
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2.2 2.5C10.5 8.5 11 5.5 12 3z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx=".4"/>',   // 엽전(가운데 네모 구멍)
  xp: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  path: '<path d="M6 20c0-4 12-4 12-8S6 8 6 4"/><circle cx="6" cy="4" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="20" r="1.6"/>',
  badge: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',
  hanger: '<path d="M12 7.5a2 2 0 1 1 2-2c0 1-2 1.5-2 3L3.5 15a1.3 1.3 0 0 0 .8 2.4h15.4a1.3 1.3 0 0 0 .8-2.4L12 8.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>',
  chest: '<rect x="3.5" y="9.5" width="17" height="10" rx="1.5"/><path d="M3.5 9.5c0-3 2-5 8.5-5s8.5 2 8.5 5M3.5 13h17M10.5 12v3h3v-3"/>',
  chestOpen: '<rect x="3.5" y="11" width="17" height="8.5" rx="1.5"/><path d="M3.5 11l2-6.5h13l2 6.5M10.5 13.5v3h3v-3M12 2v1.5M7.5 2.8l.8 1.2M16.5 2.8l-.8 1.2"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  send: '<path d="M4 12l16-7.5-6 16-2.5-6.5z"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.3 8-7.5 9.5-4.2-1.5-7.5-5-7.5-9.5V6z"/>',
  review: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',
  book: '<path d="M4 5.5A2 2 0 0 1 6 4h13v14H6a2 2 0 0 0-2 2zM4 20V5.5M8 8h7"/>',
  table: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
};
export function icon(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ""}</svg>`;
}

/** 확인 창. buttons: [{ label, value, kind }] → 누른 value로 resolve */
export function dialog({ title, body = "", buttons, cls = "" }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = el(`<div class="modal-back" role="presentation">
      <div class="modal${cls ? " " + esc(cls) : ""}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title">${esc(title)}</h2>
        ${body ? `<div class="modal-body">${body}</div>` : ""}
        <div class="modal-actions">${buttons.map((b, i) => `<button class="btn ${b.kind || "ghost"}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div>
      </div></div>`);
    const close = (v) => {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus();
      resolve(v);
    };
    const onKey = (e) => { if (e.key === "Escape") close(null); };
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-i]");
      if (b) close(buttons[+b.dataset.i].value);
      else if (e.target === wrap) close(null);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    const first = wrap.querySelector(".btn.primary") || wrap.querySelector("button");
    if (first) first.focus();
  });
}

/** 잠깐 뜨는 알림 */
export function toast(msg, kind = "") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = el('<div id="toasts" class="toasts" role="status" aria-live="polite"></div>');
    document.body.appendChild(box);
  }
  const t = el(`<div class="toast ${kind}">${esc(msg)}</div>`);
  box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/** 진행 막대 */
export function bar(value, max, cls = "", label = "") {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `<div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(value, max)}"${label ? ` aria-label="${esc(label)}"` : ""}><span style="width:${pct}%"></span></div>`;
}

/** 코드 보기 블록 */
export function codeBlock(code, cls = "") {
  return `<pre class="code ${cls}"><code>${escCode(code)}</code></pre>`;
}

/** 보기 전용 카드(판정 R30, 16장)의 안내. show의 SQL은 다른 데이터베이스 문법이라 실행하지 않는다 */
export const SHOW_NOTE = "보기 전용이에요. 이 장터에서는 돌지 않는 SQL이에요.";

/** 보기 전용 카드 { say, show, dialect }: 데이터베이스 이름표 + 안내 + SQL 상자. 결과 표 자리(.sql-result)가 없어 fillResults가 실행하지 않는다 */
function showExample(c) {
  return `<div class="example show-only">
    <p class="ex-label"><span class="dialect">${esc(c.dialect || "")}</span><span class="show-note">${esc(SHOW_NOTE)}</span></p>
    <pre class="code sql show" aria-label="${esc(`${c.dialect || ""} SQL, 보기 전용`)}"><code>${escCode(c.show)}</code></pre></div>`;
}

/** 개념 카드의 SQL 칸: SQL(코드 글꼴) + 그 아래 실행 결과 표 자리. 표는 화면을 그린 뒤 ui/sqlview.js의 fillResults가 채운다
 *  (실행기가 준비되기 전에는 「표를 불러오는 중…」). SQL이 없는 카드는 빈 글자 */
export function cardExample(c) {
  if (c && c.show) return showExample(c);
  if (!c || !c.sql) return "";
  return `<div class="example sql-example">${codeBlock(c.sql, "sql")}
    <p class="ex-label">실행 결과</p>
    <div class="sql-result" data-sql="${esc(c.sql)}" data-box="card"><p class="muted">표를 불러오는 중…</p></div></div>`;
}

export const MILESTONE_REWARD = {
  7: "보너스 50엽전을 받았어요",
  30: "졸업 가운과 학사모를 선물로 받았어요",
  100: "「연속 100일」 배지를 받았어요",
};

/** 연속 기록 이정표 축하 창. 누르면(또는 Enter·Esc) 닫히고 resolve */
export function celebrate({ outfit, milestone }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = el(`<div class="celebrate" role="dialog" aria-modal="true" aria-labelledby="cel-title">
      <div class="cel-card">
        <div class="dueogi-wrap big jump">${dueogiSVG({ outfit, face: milestoneFace(milestone), size: 150 })}<span class="sfx" aria-hidden="true">짠!</span></div>
        <h2 id="cel-title" class="cel-title">${icon("flame")}연속 ${esc(milestone)}일!</h2>
        <p class="cel-reward">${esc(MILESTONE_REWARD[milestone] || "")}</p>
        <button class="btn sun wide" id="cel-ok">좋아요</button>
      </div>
    </div>`);
    const shownAt = performance.now();
    const close = () => {
      if (performance.now() - shownAt < 400) return; // 입력 보호
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
      resolve();
    };
    const onKey = (e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); close(); } };
    wrap.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    wrap.querySelector("#cel-ok").focus({ preventScroll: true });
  });
}
