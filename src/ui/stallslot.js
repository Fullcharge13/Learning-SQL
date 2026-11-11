// 칸 편집기(v0.3 작업 8): 자동화 칸의 SQL을 카드로 조립하는 화면. 설계 docs/specs/2026-11-11-두억이의-가게-설계.md §3·§6-4.
//   const saved = await openSlotEditor(ctx, slotId, { root })   // 저장하면 true, 그냥 나가면 false
// - 틀 칸은 틀 줄(고정 낱말 + 빈자리 [ ])로 보인다. 빈자리를 누르면 그 자리가 「고르는 자리」, 고르기 창의 카드를 누르면 그 자리 끝에 붙고,
//   놓인 카드를 누르면 빠진다. 숫자 카드는 −/+(0~30).
// - 「오늘 장부로 시험 실행」: 지금 SQL을 오늘 아침 장부(ledgerSql)에 돌려 결과 표(앞 20행) + 한 줄 풀이(acceptRows). 하루는 안 지나감.
// - 「저장」은 마지막 시험 실행이 지금 SQL로 성공했을 때, 아니면 「그래도 저장」. 빈 틀 자리가 남으면 저장 못 함(「빈자리를 채워 주세요」).
// - 7장 평가 뒤에는 「전체 조립」 바꾸기: 틀 → 전체는 toFull(지금 SQL이 카드로 풀림), 전체 → 틀은 확인 뒤 틀 카드를 되살림.
// - 저장하지 않고 나가면 고친 것은 버림(바꾼 것이 있을 때만 묻는다).
// 게임 규칙(카드 → SQL, 결과 받기)은 src/stall/slots.js에 있고, 여기서는 순수 편집 함수와 그리기만 한다.
import { SLOTS, CARDS } from "../../data/stall.js";
import { newStall } from "../stall/state.js";
import { slotSql, toFull, fullOpen, cardLocked, acceptRows } from "../stall/slots.js";
import { ledgerSql, LEDGER_SCHEMA } from "../stall/ledger.js";
import { explain } from "../grade.js";
import { esc, escCode, icon, dialog, toast } from "./dom.js";
import { tableHTML } from "./table.js";
import { SHEET_HEAD } from "./sqlview.js";
import { itemName } from "./stallart.js";

export const MAX_PART = 40;                          // 한 자리의 카드 한도(설계 §3-2, cleanStall과 같음)
export const EMPTY_BLOCK = "빈자리를 채워 주세요";
export const TOO_MANY = `한 자리에는 카드를 ${MAX_PART}장까지 놓을 수 있어요`;
const NUM_START = 1;                                 // 숫자 카드를 처음 놓을 때 값
const CARD = new Map(CARDS.map((c) => [c.id, c]));
const PART_LABEL = { where: "WHERE 뒤", order: "ORDER BY 뒤", limit: "LIMIT 뒤", full: "전체" };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clone = (v) => structuredClone(v);

// ---------------------------------------------------------------- 순수 편집 함수

/** 칸이 쓰는 카드 자리 이름 */
export function partKeys(def, mode) {
  if (mode === "full" || def.frame === "full") return ["full"];
  return def.frame === "order" ? ["order", "limit"] : ["where"];
}

/** 틀 칸의 처음 카드: 재고 채우기는 시작 조건(stock < 1), 나머지는 빈 자리. 전체 칸은 { full: [] } */
export function frameDefault(def) {
  const base = newStall(1).slots[def.id];
  if (base && base.mode !== "full" && def.frame !== "full") return clone(base.parts);
  const out = {};
  for (const k of partKeys(def, def.frame === "full" ? "full" : "frame")) out[k] = [];
  return out;
}

/** 지금 모드의 자리만, 자리마다 배열로(비교·저장용) */
function normParts(def, st) {
  const out = {};
  const p = st && st.parts && typeof st.parts === "object" ? st.parts : {};
  for (const k of partKeys(def, st && st.mode)) out[k] = Array.isArray(p[k]) ? clone(p[k]) : [];
  return out;
}

/** 자리 하나를 고친 새 칸 상태. fn이 null을 돌려주면 아무것도 바꾸지 않은 복사본 */
function editPart(st, part, fn) {
  const next = clone(st || {});
  const list = next.parts && Array.isArray(next.parts[part]) ? next.parts[part] : null;
  const out = fn(list || []);
  if (out === null) return next;
  next.parts = next.parts && typeof next.parts === "object" ? next.parts : {};
  next.parts[part] = out;
  return next;
}

/** 카드를 그 자리 끝에 놓는다. 숫자 카드는 n(없으면 1)을 0~30으로. 모르는 카드·40장이 차면 그대로 */
export function placeCard(st, part, cardId, n) {
  const def = CARD.get(cardId);
  return editPart(st, part, (list) => {
    if (!def || list.length >= MAX_PART) return list;
    if (def.kind === "num") return [...list, { c: def.id, n: clamp(Number.isInteger(n) ? n : NUM_START, def.min, def.max) }];
    return [...list, { c: def.id }];
  });
}

/** 그 자리의 index번째 카드를 뺀다. 없는 번째면 그대로 */
export function removeCard(st, part, index) {
  return editPart(st, part, (list) => (Number.isInteger(index) && index >= 0 && index < list.length
    ? list.filter((_, i) => i !== index) : null));
}

/** 숫자 카드를 delta만큼(0~30에서 멈춤). 숫자 카드가 아니면 그대로 */
export function bumpNum(st, part, index, delta) {
  return editPart(st, part, (list) => {
    const t = list[index];
    const def = t && CARD.get(t.c);
    if (!def || def.kind !== "num") return null;
    const n = clamp((Number.isInteger(t.n) ? t.n : def.min) + delta, def.min, def.max);
    return list.map((x, i) => (i === index ? { c: x.c, n } : x));
  });
}

/** 어느 자리든 카드가 40장을 넘나(toFull은 틀의 고정 낱말까지 카드로 풀어서 넘칠 수 있음) */
export function tooLong(st) {
  const p = st && st.parts && typeof st.parts === "object" ? st.parts : {};
  return Object.values(p).some((list) => Array.isArray(list) && list.length > MAX_PART);
}

/** 저장 단추: 시험 실행이 지금 SQL로 성공했으면 「저장」, 아니면 「그래도 저장」. 빈 자리가 남거나 40장을 넘으면 blocked */
export function saveState(st, def, tested) {
  return {
    label: tested && tested.ok ? "저장" : "그래도 저장",
    blocked: tooLong(st) ? TOO_MANY : slotSql(def, st) === null ? EMPTY_BLOCK : null,
  };
}

/** 저장 줄의 미리 보기: 지금 SQL 한 줄. 빈 자리는 「[ ]」 */
export function previewSql(def, st) {
  const one = (k) => {
    const list = st && st.parts && Array.isArray(st.parts[k]) ? st.parts[k] : [];
    return (list.length && slotSql({ tpl: `{${k}}` }, { mode: "frame", parts: { [k]: list } })) || "[ ]";
  };
  if ((st && st.mode === "full") || def.frame === "full") return one("full");
  return def.tpl.replace(/\{(\w+)\}/g, (_, k) => one(k));
}

// 받침이 있으면 「을」, 없으면 「를」(한글 물건 이름)
function eul(word) {
  const s = String(word);
  const c = s.charCodeAt(s.length - 1) - 0xac00;
  return `${s}${c >= 0 && c <= 11171 && c % 28 !== 0 ? "을" : "를"}`;
}
const names = (ids) => ids.map(itemName).join("·");
const NOTHING = "→ 찾은 물건이 없어요. 오늘은 할 일이 없어요";

/** 시험 실행 결과(acceptRows)의 한 줄 풀이: 장을 열면 이 칸이 무엇을 할지 */
export function acceptLine(def, got, stall) {
  if (!got || !got.ok) return (got && got.why) || explain("");
  if (def.kind === "number") return `→ 보고: ${got.value === null || got.value === undefined ? "빈 값" : String(got.value)}`;
  const ids = Array.isArray(got.ids) ? got.ids : [];
  if (!ids.length) return NOTHING;
  if (def.id === "restock") return `→ ${eul(names(ids))} 채워요`;
  if (def.id === "best") return `→ ${eul(names(ids))} 두 상자씩 더 들여요`;
  if (def.id === "discount") return `→ ${eul(names(ids))} 할인해요`;
  if (def.id === "display") {
    const shelf = Number.isInteger(stall && stall.shelf) ? stall.shelf : 6;
    const shown = ids.slice(0, shelf);
    return `→ 진열대에 ${names(shown)} 순서로 올려요${ids.length > shelf ? " (나머지는 못 올라가요)" : ""}`;
  }
  if (def.id === "pricing") {
    const blank = new Set(((stall && stall.items) || []).filter((it) => it.price === null).map((it) => it.item_id));
    const todo = ids.filter((id) => blank.has(id));
    return todo.length ? `→ ${names(todo)}에 값을 매겨요` : "→ 찾은 물건은 모두 값이 있어요. 오늘은 할 일이 없어요";
  }
  return `→ ${names(ids)}`;
}

const GROUPS = [
  ["열·표", ["col", "tbl"]],
  ["비교", ["op"]],
  ["숫자·글자", ["num", "str"]],
  ["낱말", ["kw", "fn", "punct"]],
];

/** 고르기 창: 3~8장 카드 전부를 네 묶음으로. 묶음 안에서 열린 카드가 앞, 잠긴 카드는 장 순서로 뒤(사유 locked) */
export function pickerGroups(passed) {
  return GROUPS.map(([name, kinds]) => {
    const all = CARDS.filter((c) => kinds.includes(c.kind)).map((card) => ({ card, locked: cardLocked(card, passed) }));
    const open = all.filter((x) => !x.locked);
    const locked = all.filter((x) => x.locked).sort((a, b) => a.card.chapter - b.card.chapter);
    return { name, cards: [...open, ...locked] };
  });
}

const cardText = (def, t) => (def.kind === "num" ? String(Number.isInteger(t && t.n) ? t.n : NUM_START) : def.text);

// ---------------------------------------------------------------- 화면

export function openSlotEditor(ctx, slotId, { root } = {}) {
  const def = SLOTS.find((s) => s.id === slotId);
  if (!def || !root) return Promise.resolve(false);
  return new Promise((resolve) => {
    const passed = ctx.stallPassed();
    const canFull = fullOpen(passed) && def.frame !== "full";
    const saved = ctx.save.stall && ctx.save.stall.slots ? ctx.save.stall.slots[slotId] : null;
    const startMode = def.frame === "full" ? "full" : saved && saved.mode === "full" ? "full" : "frame";
    let cur = saved ? { on: !!saved.on, mode: startMode, parts: {} } : { on: true, mode: startMode, parts: frameDefault(def) };
    if (saved) cur.parts = normParts(def, { ...saved, mode: startMode });
    const original = JSON.stringify(normParts(def, cur)) + cur.mode;
    // 틀 카드 기억: 전체 → 틀로 돌아갈 때 되살림(저장된 틀, 이번에 전체로 바꾼 순간의 틀, 없으면 처음 틀)
    let frameMemo = saved && saved.mode !== "full" ? normParts(def, { ...saved, mode: "frame" }) : frameDefault(def);
    let active = firstActive();
    let tested = null;        // 지금 SQL의 마지막 시험 실행 { ok } (고치면 null)
    let resultHTML = "";
    let running = false;
    let token = 0;            // 고치면 늘어남: 고치기 전에 시작한 시험 실행 결과는 버린다
    let alive = true;
    const outfit = ctx.save.outfit;
    const groups = pickerGroups(passed);

    function firstActive() {
      const keys = partKeys(def, cur.mode);
      return keys.find((k) => !(cur.parts[k] || []).length) || keys[0];
    }
    const dirty = () => JSON.stringify(normParts(def, cur)) + cur.mode !== original;

    // ---- 조립 줄 ----
    function tokenHTML(t, k) {
      const d = CARD.get(t.c);
      if (!d) return "";
      const text = cardText(d, t);
      if (d.kind === "num") {
        return `<span class="sp-num">
          <button class="sp-bump" data-b="${k}" data-d="-1" aria-label="숫자 줄이기"${t.n <= d.min ? " disabled" : ""}>−</button>
          <button class="bcard placed" data-k="${k}" data-text="${esc(text)}" aria-label="${esc(`${k + 1}번째 카드 빼기: 숫자 ${text}`)}"><span class="bc-text">${esc(text)}</span></button>
          <button class="sp-bump" data-b="${k}" data-d="1" aria-label="숫자 늘리기"${t.n >= d.max ? " disabled" : ""}>+</button>
        </span>`;
      }
      return `<button class="bcard placed" data-k="${k}" data-text="${esc(text)}" aria-label="${esc(`${k + 1}번째 카드 빼기: ${text}`)}"><span class="bc-text">${escCode(text)}</span></button>`;
    }
    function partHTML(key) {
      const list = cur.parts[key] || [];
      const on = key === active;
      return `<span class="sp-part${on ? " active" : ""}${list.length ? "" : " empty"}" data-part="${esc(key)}">
        ${list.map(tokenHTML).join("")}
        <button class="sp-hole" data-hole="${esc(key)}" aria-pressed="${on}" aria-label="${esc(`${PART_LABEL[key]} 자리에 카드 놓기`)}">[ ]</button>
      </span>`;
    }
    function lineHTML() {
      if (cur.mode === "full") return partHTML("full");
      const out = [];
      for (const m of def.tpl.matchAll(/\{(\w+)\}|[^{}]+/g)) {
        if (m[1]) out.push(partHTML(m[1]));
        else if (m[0].trim()) out.push(`<span class="sp-fixed">${escCode(m[0].trim())}</span>`);
      }
      return out.join("");
    }

    // ---- 고르기 창 ----
    function pickerHTML() {
      return groups.map((g) => {
        const open = g.cards.filter((x) => !x.locked);
        const byWhy = new Map();
        for (const x of g.cards) if (x.locked) byWhy.set(x.locked, [...(byWhy.get(x.locked) || []), x.card]);
        const openHTML = open.map(({ card }) => {
          const text = card.kind === "num" ? "숫자" : card.text;
          return `<button class="bcard" data-c="${esc(card.id)}" data-text="${esc(text)}" aria-label="${esc(`${text} 카드 놓기`)}"><span class="bc-text">${escCode(text)}</span>${card.kind === "num" ? `<span class="bc-ko">0~30</span>` : ""}</button>`;
        }).join("");
        const lockHTML = [...byWhy].map(([why, cards]) => `<div class="sp-lockrow">
            <p class="sp-lockwhy">${icon("lock")}<span>${esc(why)}</span></p>
            <div class="sp-cards">${cards.map((c) => `<span class="bcard locked" data-text="${esc(c.kind === "num" ? "숫자" : c.text)}" aria-label="${esc(`${c.text} 카드, ${why}`)}"><span class="bc-text">${escCode(c.kind === "num" ? "숫자" : c.text)}</span></span>`).join("")}</div>
          </div>`).join("");
        return `<div class="sp-group">
          <h3 class="sp-gname">${esc(g.name)}</h3>
          ${open.length ? `<div class="sp-cards">${openHTML}</div>` : ""}
          ${lockHTML}
        </div>`;
      }).join("");
    }

    function dockHTML() {
      const s = saveState(cur, def, tested);
      return `${s.blocked ? `<p class="sp-block" role="status">${esc(s.blocked)}</p>` : ""}
        <button class="btn ${s.label === "저장" ? "primary" : "sun"} wide" id="sp-save"${s.blocked ? " disabled" : ""}>${icon("check")}<span>${esc(s.label)}</span></button>`;
    }

    function modeHTML() {
      if (!canFull) return "";
      const full = cur.mode === "full";
      return `<section class="panel sp-mode-box">
        <button class="btn ghost wide" id="sp-mode">${icon("review")}<span>${full ? "틀로 돌아가기" : "전체 조립으로 바꾸기"}</span></button>
        <p class="muted">${full ? "SELECT부터 모두 카드로 조립해요. 틀로 돌아가면 전체 조립으로 고친 것은 사라져요." : "지금 SQL이 그대로 카드로 풀려요. SELECT·FROM도 바꿀 수 있어요."}</p>
      </section>`;
    }

    function paint() {
      if (!alive) return;
      root.innerHTML = `<div class="screen slot-editor">
        <header class="stall-top sp-top">
          <button class="icon-btn" id="sp-close" aria-label="칸 고치기 닫고 가게로">${icon("close")}</button>
          <h1 class="stall-title">칸 고치기 · ${esc(def.name)}</h1>
          <span aria-hidden="true"></span>
        </header>
        <main class="sp-body">
          <p class="sp-desc">${esc(def.desc)}${def.kind === "number" ? "" : ". 결과에 name이나 item_id 열이 있어야 해요."}</p>
          <section class="panel sp-build" aria-labelledby="sp-build-title">
            <h2 id="sp-build-title">내 SQL <small>(놓인 카드를 누르면 빠져요)</small></h2>
            <div class="sp-line" aria-label="조립 줄"></div>
          </section>
          <button class="btn ghost wide" id="sp-test">${icon("play")}<span>오늘 장부로 시험 실행</span></button>
          <section class="sp-result" aria-live="polite"></section>
          <section class="panel sp-picker" aria-labelledby="sp-pick-title">
            <h2 id="sp-pick-title">카드 고르기 <small class="sp-target"></small></h2>
            ${pickerHTML()}
          </section>
          ${modeHTML()}
        </main>
        <footer class="sp-dock">
          <p class="sp-preview" aria-label="지금 SQL"><code class="sp-preview-code"></code></p>
          <p class="sp-live" role="status" aria-live="polite"></p>
          <div class="sp-dock-act"></div>
        </footer>
      </div>`;
      paintLine();
      paintResult();
      paintDock();
    }
    function paintLine() {
      root.querySelector(".sp-line").innerHTML = lineHTML();
      root.querySelector(".sp-target").textContent = `(놓는 자리: ${PART_LABEL[active]})`;
    }
    function paintResult() {
      const r = root.querySelector(".sp-result");
      r.innerHTML = running ? `<p class="muted">오늘 장부에 돌려 보는 중…</p>` : resultHTML;
      root.querySelector("#sp-test").disabled = running;
    }
    function paintDock() {
      root.querySelector(".sp-preview-code").innerHTML = escCode(previewSql(def, cur));
      root.querySelector(".sp-dock-act").innerHTML = dockHTML();
    }
    // 고를 때 조립 줄이 화면 밖일 수 있어 저장 줄에 짧은 알림(읽기 프로그램에도 polite로)
    function note(text) {
      const n = root.querySelector(".sp-live");
      if (n) n.textContent = text || "";
    }

    // 고침: 지난 시험 결과는 지금 SQL의 것이 아니므로 지운다
    function edited(next) {
      cur = next;
      tested = null;
      resultHTML = "";
      running = false;
      token++;
      paintLine();
      paintResult();
      paintDock();
    }
    // 다시 그린 줄에서 같은 자리에 초점(키보드·읽기 프로그램)
    function refocus(sel) {
      const b = sel && root.querySelector(sel);
      if (b && !b.disabled) b.focus({ preventScroll: true });
    }

    async function runTest() {
      if (running) return;
      const sql = slotSql(def, cur);
      if (!sql) { resultHTML = `<p class="sp-warn">${esc(EMPTY_BLOCK)}</p>`; paintResult(); return; }
      const my = ++token;
      running = true;
      paintResult();
      const stall = ctx.save.stall;
      let r;
      try { r = await ctx.sql.runLedger(ledgerSql(stall), [sql]); } catch (e) { r = { results: [], error: "worker" }; }
      if (!alive || my !== token) return;
      running = false;
      const timedOut = !!(r && (r.timeout || r.error === "timeout"));
      if (r && r.error && !timedOut) {
        tested = null;   // 실행기를 못 받음: 학습자 SQL 탓이 아님
        resultHTML = `<div class="err-panel soft"><p>실행기를 아직 받지 못했어요. 잠시 뒤에 다시 눌러 주세요.</p></div>`;
      } else {
        const res = timedOut ? { columns: [], rows: [], error: "timeout" } : (r && r.results && r.results[0]) || { columns: [], rows: [], error: "worker" };
        const got = acceptRows(def, res, stall);
        tested = { ok: got.ok };
        if (res.error) {
          resultHTML = `<div class="err-panel">
            <p class="err-orig mono" lang="en">${esc(res.error === "timeout" ? "timeout: 시간 안에 끝나지 않음" : res.error)}</p>
            <p>${esc(explain(res.error, outfit))}</p>
          </div>`;
        } else {
          const n = Array.isArray(res.rows) ? res.rows.length : 0;
          resultHTML = `<p class="ex-label">오늘 아침 장부로 돌린 결과</p>
            ${tableHTML(res, { ko: LEDGER_SCHEMA, max: SHEET_HEAD, label: "시험 실행 결과 표", sql, more: n > SHEET_HEAD ? `처음 ${SHEET_HEAD}행만 보여요 · 전체 ${n}행` : null })}
            <p class="sp-accept${got.ok ? "" : " bad"}">${esc(acceptLine(def, got, stall))}</p>`;
        }
      }
      paintResult();
      paintDock();
      const box = root.querySelector(".sp-result");
      try { if (box) box.scrollIntoView({ block: "nearest" }); } catch { /* 옛 브라우저 */ }
    }

    async function toggleMode() {
      if (!canFull) return;
      if (cur.mode !== "full") {
        const full = toFull(def, cur);
        if (tooLong(full)) { toast(`전체 조립으로 바꾸면 카드가 ${MAX_PART}장을 넘어요. 카드를 조금 빼고 바꿔 주세요`); return; }
        frameMemo = normParts(def, cur);
        active = "full";
        edited(full);
        paint();
      } else {
        const ok = await dialog({
          title: "틀로 돌아갈까요?",
          body: `<p>전체 조립으로 고친 것은 사라져요</p>`,
          buttons: [{ label: "계속 고치기", value: false, kind: "ghost" }, { label: "틀로 돌아가기", value: true, kind: "coral" }],
        });
        if (!ok || !alive) return;
        cur = { on: cur.on, mode: "frame", parts: clone(frameMemo) };
        active = firstActive();
        edited(cur);
        paint();
      }
      refocus("#sp-mode");
    }

    function finish(v) {
      if (!alive) return;
      alive = false;
      root.removeEventListener("click", onClick);
      resolve(v);
    }

    async function leave() {
      if (dirty()) {
        const ok = await dialog({
          title: "고친 것을 버릴까요?",
          body: `<p>저장하지 않고 나가면 이번에 고친 것은 사라져요.</p>`,
          buttons: [{ label: "계속 고치기", value: false, kind: "ghost" }, { label: "버리고 나가기", value: true, kind: "coral" }],
        });
        if (!ok) return;
      }
      finish(false);
    }

    function save() {
      const s = saveState(cur, def, tested);
      if (s.blocked) { toast(s.blocked); return; }
      const next = clone(ctx.save.stall);
      const prev = next.slots[slotId];
      next.slots[slotId] = { on: prev ? !!prev.on : true, mode: cur.mode, parts: normParts(def, cur) };
      const r = ctx.stallCommit(next, []);
      if (r && r.ok) toast(tested && tested.ok ? `${def.name} 칸을 저장했어요` : `${def.name} 칸을 저장했어요. 시험에서 문제가 있으면 장을 열 때 그날은 쉬어요`);
      finish(true);
    }

    function onClick(e) {
      if (!alive) return;
      const b = e.target.closest("button");
      if (!b || b.disabled || !root.contains(b)) return;
      if (b.id === "sp-close") { leave(); return; }
      if (b.id === "sp-test") { runTest(); return; }
      if (b.id === "sp-mode") { toggleMode(); return; }
      if (b.id === "sp-save") { save(); return; }
      if (b.dataset.hole) { active = b.dataset.hole; paintLine(); note(`${PART_LABEL[active]} 자리에 놓아요`); refocus(`[data-hole="${active}"]`); return; }
      const part = b.closest(".sp-part");
      if (part && b.dataset.b !== undefined) {
        edited(bumpNum(cur, part.dataset.part, +b.dataset.b, +b.dataset.d));
        const t = (cur.parts[part.dataset.part] || [])[+b.dataset.b];
        note(t ? `숫자 ${t.n}` : "");
        refocus(`.sp-part[data-part="${part.dataset.part}"] [data-b="${b.dataset.b}"][data-d="${b.dataset.d}"]`);
        return;
      }
      if (part && b.dataset.k !== undefined) {
        active = part.dataset.part;
        const gone = b.dataset.text;
        edited(removeCard(cur, part.dataset.part, +b.dataset.k));
        note(`${gone} 뺐어요`);
        refocus(`.sp-part[data-part="${active}"] .sp-hole`);
        return;
      }
      if (b.dataset.c && b.closest(".sp-picker")) {
        const card = CARD.get(b.dataset.c);
        const why = card ? cardLocked(card, passed) : "없는 카드예요";
        if (why) { toast(why); return; }   // 잠긴 카드는 단추로 그리지 않지만 한 번 더 막음
        const before = (cur.parts[active] || []).length;
        const next = placeCard(cur, active, b.dataset.c);
        if ((next.parts[active] || []).length === before) { toast(`한 자리에는 카드를 ${MAX_PART}장까지 놓을 수 있어요`); return; }
        edited(next);
        note(`${b.dataset.text} 놓았어요`);
      }
    }

    root.addEventListener("click", onClick);
    paint();
    try { window.scrollTo(0, 0); } catch { /* 화면 없음 */ }
    const first = root.querySelector("#sp-close");
    if (first) first.focus({ preventScroll: true });
  });
}
