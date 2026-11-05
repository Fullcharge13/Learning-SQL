// 카드 조립 문제 화면 (설계 §4-3·§4-4·§4-5). 입력창 없이 카드만 누른다:
// 카드 더미를 눌러 조립 줄에 놓고, 「실행」으로 결과 표를 보고, 「제출」로 채점한다.
//
//   const off = mountBuild({ body, foot }, { item, seed, sql, outfit, init, onState, onPass, onWrong, onHint, log, sound, say });
//
// - host: 화면 요소 하나(단추도 그 안에) 또는 { body, foot }(단추는 아래 고정 줄에).
// - init(이어 하기): { line, hintsShown, solutionSeen, submits, hadError } — 놓은 카드·힌트·정답 보기·제출 수를 되살림.
// - onState(state): 같은 모양으로 지금 상태를 알림(카드를 놓거나 뺄 때, 힌트·정답·틀린 제출 뒤).
// - onPass({ hintUsed, solutionSeen, hadError, firstSubmit }): 맞은 제출. 그 뒤 화면은 레슨 쪽이 넘긴다.
// - hadError: 이 문제에서 「실행」·「제출」이 SQL 오류(시간 초과·조회 전용 포함)를 낸 적이 있음.
//   실행기를 못 받은 것(load·worker)은 학습자 잘못이 아니라서 세지 않고, 제출 수에도 넣지 않는다.
// - 실행기가 준비되지 않았으면(받는 중·실패) 「실행」·「제출」을 막고 안내 줄을 보인다. 카드 놓기·힌트는 된다.
import { newBuild, tap, sqlOf, usedTexts, hint as hintStep } from "../build.js";
import { cardsToSql, judgeBuild, explain, needLine } from "../grade.js";
import { SCHEMA } from "../../data/schema.js";
import { FACES } from "../say.js";
import { esc, icon, codeBlock, dueogiSays } from "./dom.js";
import { tableHTML } from "./table.js";
import { openTables } from "./tables.js";

export const HINT_LEVELS = 4;
export const AUTO_SOLUTION_AFTER = 3;   // 틀린 제출이 이만큼이면 정답을 같이 본다
const SYSTEM_ERRORS = new Set(["load", "worker"]);
export const ENGINE_WAIT_LINE = "실행기 준비 중이에요";
export const ENGINE_FAIL_LINE = "실행기를 아직 받지 못했어요. 인터넷이 될 때 「다시 시도」를 눌러 주세요. 다른 문제는 그대로 풀 수 있어요.";

function cleanLine(line, bank) {
  const ids = new Set(bank.map((c) => c.id));
  const out = [];
  for (const id of Array.isArray(line) ? line : []) if (ids.has(id) && !out.includes(id)) out.push(id);
  return out;
}

export function mountBuild(host, {
  item, seed = 0, sql, outfit, init = null, onState = null, onPass, onWrong, onHint,
  log = null, sound = null, say = null, tag = "",
} = {}) {
  const body = host && host.body ? host.body : host;
  const foot = host && host.foot ? host.foot : null;
  const hints = Array.isArray(item.hints) ? item.hints : [];
  const opts = { ko: SCHEMA, tables: item.tables || [] };
  // passed: 맞은 제출 뒤에는 카드·단추를 잠근다(결과 창이 떠 있는 동안 바꾸지 못하게)
  const st = { hintsShown: 0, solutionSeen: false, submits: 0, hadError: false, busy: false, destroyed: false, passed: false };
  let B = newBuild(item, seed);
  if (init && typeof init === "object") {
    B = { bank: B.bank, line: cleanLine(init.line, B.bank) };
    st.submits = Math.max(0, init.submits | 0);
    st.hadError = !!init.hadError;
  }
  let expP = null;   // 정답 SQL 결과(문제를 여는 동안 한 번만 실행)
  const play = (name) => { try { if (sound) sound.play(name); } catch { /* 소리는 없어도 됨 */ } };
  const stateNow = () => ({ line: [...B.line], hintsShown: st.hintsShown, solutionSeen: st.solutionSeen, submits: st.submits, hadError: st.hadError });
  function notify() {
    if (!onState || st.destroyed) return;
    try { onState(stateNow()); } catch (e) { console.error(e); }
  }

  const actions = `<div class="dock-actions">
      <button class="btn ghost" id="run">${icon("play")}<span>실행</span></button>
      <button class="btn primary" id="submit">${icon("check")}<span>제출</span></button>
    </div>`;
  body.innerHTML = `<article class="item build">
    <span class="tag build-tag">${tag ? esc(tag) : "카드 조립"}</span>
    <h1 class="q">${esc(item.q || "카드를 눌러 SQL을 만들어 보세요.")}</h1>
    <div class="eng-chip" id="engchip" role="status" aria-live="polite" hidden></div>
    <p class="ex-label">내가 만든 SQL <small>(누르면 빠져요)</small></p>
    <div class="bline" id="bline" aria-label="조립 줄"></div>
    <p class="ex-label">카드 더미 <small>(누른 차례대로 붙어요)</small></p>
    <div class="bbank" id="bbank" aria-label="카드 더미"></div>
    <div class="help-row">
      <button class="btn ghost small" id="hint">${icon("bulb")}<span>힌트 <span id="hn">0</span>/${HINT_LEVELS}</span></button>
      <button class="btn ghost small" id="sol">${icon("eye")}<span>정답 보기</span></button>
      ${item.tables && item.tables.length ? `<button class="btn ghost small" id="tablesbtn">${icon("table")}<span>쓸 표 보기</span></button>` : ""}
    </div>
    <ol class="hints" id="hints"></ol>
    <section class="console" id="console" aria-live="polite"></section>
    <section class="solution" id="solution" hidden></section>
    ${foot ? "" : actions}
  </article>`;
  if (foot) {
    foot.innerHTML = actions;
    foot.classList.add("has-dock");
  }
  const $ = (sel) => body.querySelector(sel) || (foot && foot.querySelector(sel));
  const lineEl = $("#bline"), bankEl = $("#bbank"), consoleEl = $("#console"), chip = $("#engchip");
  const runBtn = $("#run"), subBtn = $("#submit"), hintBtn = $("#hint"), solBtn = $("#sol");

  // ---- 카드 ----
  const cardInner = (c) => `<span class="bc-text">${esc(c.text)}</span>${c.ko ? `<span class="bc-ko">${esc(c.ko)}</span>` : ""}`;
  function paint() {
    const placed = new Set(B.line);
    lineEl.innerHTML = B.line.length
      ? B.line.map((id, k) => {
        const c = B.bank.find((x) => x.id === id);
        return `<button class="bcard placed" data-k="${k}" data-text="${esc(c.text)}" aria-label="${esc(`${k + 1}번째 카드 빼기: ${c.text}`)}">${cardInner(c)}</button>`;
      }).join("")
      : `<span class="bline-empty">아래 카드를 눌러 보세요</span>`;
    // 놓은 카드 자리는 빈 칸으로 남겨 다른 카드가 움직이지 않게 한다
    bankEl.innerHTML = B.bank.map((c, i) => (placed.has(c.id)
      ? `<span class="bcard slot" aria-hidden="true">${cardInner(c)}</span>`
      : `<button class="bcard" data-i="${i}" data-text="${esc(c.text)}">${cardInner(c)}</button>`)).join("");
    paintButtons();
  }
  lineEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b || st.busy || st.passed) return;
    B = tap(B, "line", +b.dataset.k);
    paint();
    notify();
  });
  bankEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b || st.busy || st.passed) return;
    B = tap(B, "bank", +b.dataset.i);
    paint();
    notify();
  });

  // ---- 실행기 준비 상태 ----
  const ready = () => !!sql && sql.status === "ready";
  function paintButtons() {
    const off = st.busy || st.passed || !ready();
    runBtn.disabled = off;
    subBtn.disabled = off;
    subBtn.setAttribute("aria-busy", String(st.busy));
  }
  function paintEngine() {
    if (st.destroyed) return;
    const s = sql ? sql.status : "failed";
    if (s === "ready") { chip.hidden = true; chip.innerHTML = ""; }
    else if (s === "failed") {
      chip.hidden = false;
      chip.className = "eng-chip err";
      chip.innerHTML = `<p class="eng-head">${esc(ENGINE_WAIT_LINE)}</p><p>${esc(ENGINE_FAIL_LINE)}</p>${sql ? `<button class="link" id="engretry">다시 시도</button>` : ""}`;
      const r = chip.querySelector("#engretry");
      if (r) r.addEventListener("click", () => { sql.preload().catch(() => {}); });
    } else {
      chip.hidden = false;
      chip.className = "eng-chip";
      chip.innerHTML = `<p class="eng-head"><span class="dot" aria-hidden="true"></span>${esc(ENGINE_WAIT_LINE)}</p>`;
    }
    paintButtons();
  }
  const offEngine = sql && typeof sql.listen === "function" ? sql.listen(paintEngine) : () => {};
  if (sql && sql.status === "idle") sql.preload().catch(() => {});

  // ---- 출력 ----
  // 두억이 한마디. face: 대사 표정 대신 쓸 표정(같은 문제를 두 번째 틀리면 「달리기」, 설계 §8-3)
  function sayLine(situation, sfx = "", face = null) {
    if (!say) return "";
    const l = say(situation);
    return dueogiSays({ outfit, face: face || l.face, text: l.text, size: 56, sfx, cls: "small" });
  }
  const errorHTML = (error) => `<div class="err-panel">
      <p class="err-orig mono" lang="en">${esc(error === "timeout" ? "timeout: 3초 안에 끝나지 않음" : error)}</p>
      <p>${esc(explain(error, outfit))}</p>
    </div>`;
  const systemHTML = () => `<div class="err-panel soft"><h3>${esc(ENGINE_WAIT_LINE)}</h3>
      <p>${esc(ENGINE_FAIL_LINE)} 이번 실행은 제출 횟수에 들어가지 않아요.</p></div>`;
  const emptyHTML = () => `<p class="muted">카드를 먼저 조립 줄에 놓아 보세요.</p>`;
  function show(html) { consoleEl.innerHTML = html; }

  function setBusy(b) { st.busy = b; paintButtons(); }

  async function doRun() {
    if (st.busy || st.passed || !ready()) return;
    if (!B.line.length) { show(emptyHTML()); return; }
    setBusy(true);
    show(sayLine("running", "타닥타닥") || `<p class="muted">실행하는 중…</p>`);
    try {
      const ranSql = sqlOf(B);
      const r = await sql.run(ranSql);
      if (st.destroyed) return;
      if (r.error && SYSTEM_ERRORS.has(r.error)) { show(systemHTML()); return; }
      if (r.error) {
        st.hadError = true;
        play("error");
        show(`<p class="ex-label">실행 결과</p>${errorHTML(r.error)}${sayLine("error", "어라?")}`);
        notify();
        return;
      }
      show(`<p class="ex-label">실행 결과</p>${tableHTML(r, { ...opts, label: "실행 결과 표", sql: ranSql })}`);
    } finally { if (!st.destroyed) setBusy(false); }
  }

  function expected() {
    if (!expP) {
      expP = sql.run(cardsToSql(item.cards)).then((r) => {
        if (r.error) expP = null;   // 다음 제출에 다시(실행기가 다시 뜨는 중이었을 수 있음)
        return r;
      });
    }
    return expP;
  }

  // 틀렸을 때 두 표 모두 평소처럼 50행까지. 표 상자 높이를 줄여(CSS .cmp .rt-scroll) 두 표가 한 화면 가까이에 오게 한다
  function compareHTML(got, exp, mySql) {
    const mine = got.error ? errorHTML(got.error) : tableHTML(got, { ...opts, label: "내 결과 표", sql: mySql });
    return `<div class="cmp">
      <div class="cmp-col"><p class="ex-label bad">내 결과</p>${mine}</div>
      <div class="cmp-col"><p class="ex-label">기대 결과</p>${tableHTML(exp, { ...opts, label: "기대 결과 표", sql: cardsToSql(item.cards) })}</div>
    </div>`;
  }

  async function doSubmit() {
    if (st.busy || st.passed || !ready()) return;
    if (!B.line.length) { show(emptyHTML()); return; }
    setBusy(true);
    show(sayLine("running", "타닥타닥") || `<p class="muted">채점하는 중…</p>`);
    try {
      const mySql = sqlOf(B);
      const got = await sql.run(mySql);
      if (st.destroyed) return;
      if (got.error && SYSTEM_ERRORS.has(got.error)) { show(systemHTML()); return; }
      const exp = await expected();
      if (st.destroyed) return;
      if (exp.error) {
        // 문제 정답이 실행되지 않음: 학습자 탓이 아니므로 세지 않는다(내용 점검기가 막아야 하는 경우)
        console.warn("build answer failed", item.id, exp.error);
        show(systemHTML());
        return;
      }
      const v = judgeBuild(item, got, exp, usedTexts(B));
      st.submits++;
      if (log) { try { log({ pass: v.ok }); } catch (e) { console.error(e); } }
      if (v.ok) {
        st.passed = true;
        hintBtn.disabled = true;
        solBtn.disabled = true;
        show(`<p class="pass-line">${icon("check")}기대 결과와 같아요</p>${tableHTML(got, { ...opts, label: "내 결과 표", sql: mySql })}`);
        onPass({ hintUsed: st.hintsShown > 0, solutionSeen: st.solutionSeen, hadError: st.hadError, firstSubmit: st.submits === 1 });
        return;
      }
      onWrong();
      // 같은 문제를 두 번째 이상 틀리면 땀 흘리며 달리는 얼굴(설계 §8-3). 오류도 놀람 대신 달리기
      const again = st.submits >= 2 ? FACES.wrongAgain : null;
      let html;
      if (v.reason === "error") {
        st.hadError = true;
        play("error");
        html = compareHTML(got, exp, mySql) + sayLine("error", "어라?", again);
      } else if (v.reason === "need") {
        play("wrong");
        html = `<div class="err-panel soft"><h3>${icon("cross")}${esc(needLine(v.missingNeed))}</h3>
          <p>같은 결과를 그 카드를 써서 만들어 볼까요?</p></div>` + sayLine("wrong", "", again);
      } else {
        play("wrong");
        const why = v.reason === "columns"
          ? "보여 주는 열이 기대 결과와 달라요. 어떤 열을 어떤 차례로 보여 줘야 할지 살펴봐요."
          : "행이 기대 결과와 달라요. 조건이나 차례를 다시 살펴봐요.";
        html = `<div class="err-panel soft"><h3>${icon("cross")}${esc(why)}</h3></div>` + compareHTML(got, exp, mySql) + sayLine("wrong", "", again);
      }
      show(`<p class="submit-count">제출 ${st.submits}번째</p>${html}`);
      if (st.submits >= AUTO_SOLUTION_AFTER && !st.solutionSeen) revealSolution(true);
      notify();
      // 틀린 까닭(첫 안내)부터 보이게 피드백 맨 위로. 비교 표 상자는 낮게(CSS 30vh) 두어 까닭·내 결과·기대 결과 머리가 한 화면에
      consoleEl.scrollIntoView({ block: "start" });
    } finally { if (!st.destroyed) setBusy(false); }
  }

  // ---- 힌트 4단계(설계 §4-5): ① 생각할 것 ② SQL 낱말 ③ 정답 절반 카드 ④ 다음 카드 하나(반복 가능) ----
  const hintList = $("#hints");
  const HINT_TEXT = { 3: "정답의 앞 절반 카드를 놓아 줬어요.", 4: "다음 카드 하나를 놓아 줬어요. 또 누르면 하나 더 놓아요." };
  function paintHint(level) {
    const text = level <= 2 ? hints[level - 1] || "" : HINT_TEXT[level];
    if (level === 4 && hintList.querySelector("[data-level='4']")) return;
    const li = document.createElement("li");
    li.className = "hint";
    li.dataset.level = String(level);
    li.innerHTML = `<span class="hint-no">힌트 ${level}</span><p>${esc(text)}</p>`;
    hintList.appendChild(li);
    $("#hn").textContent = String(Math.min(level, HINT_LEVELS));
  }
  function showHint() {
    if (st.busy || st.passed) return;
    const level = Math.min(st.hintsShown + 1, HINT_LEVELS);
    if (st.hintsShown === 0) onHint();
    const r = hintStep(B, item, level);
    if (r.state) { B = { bank: B.bank, line: cleanLine(r.state.line, B.bank) }; paint(); }
    st.hintsShown = Math.max(st.hintsShown, level);
    paintHint(level);
    show(sayLine("hint"));
    hintList.lastElementChild.scrollIntoView({ block: "nearest" });
    notify();
  }
  hintBtn.addEventListener("click", showHint);

  const solEl = $("#solution");
  function paintSolution(auto) {
    st.solutionSeen = true;
    solEl.hidden = false;
    solEl.innerHTML = `<h2>${auto ? `${AUTO_SOLUTION_AFTER}번 제출했으니 정답을 같이 볼까요?` : "정답"}</h2>
      ${codeBlock(cardsToSql(item.cards), "sql")}
      ${item.explain ? `<p>${esc(item.explain)}</p>` : ""}
      <button class="btn ghost small" id="usesol">정답 카드로 놓기</button>`;
    solEl.querySelector("#usesol").addEventListener("click", () => {
      if (st.busy || st.passed) return;
      B = { bank: B.bank, line: item.cards.map((_, i) => i) };
      paint();
      notify();
    });
    solBtn.disabled = true;
  }
  function revealSolution(auto) {
    if (!st.solutionSeen && st.hintsShown === 0) onHint();
    paintSolution(auto);
    if (!auto) { solEl.scrollIntoView({ block: "nearest" }); notify(); }
  }
  solBtn.addEventListener("click", () => revealSolution(false));
  const tablesBtn = $("#tablesbtn");
  if (tablesBtn) tablesBtn.addEventListener("click", () => { openTables(item.tables, sql); });

  // 이어 하기: 보던 힌트·정답을 다시 펼친다(개념 점수 표시는 이미 레슨 쪽에 남아 있어 다시 부르지 않음)
  if (init) {
    const n = Math.min(HINT_LEVELS, Math.max(0, init.hintsShown | 0));
    for (let lv = 1; lv <= n; lv++) paintHint(lv);
    st.hintsShown = n;
    if (init.solutionSeen) paintSolution(st.submits >= AUTO_SOLUTION_AFTER);
  }

  runBtn.addEventListener("click", doRun);
  subBtn.addEventListener("click", doSubmit);
  paint();
  paintEngine();

  return () => {
    st.destroyed = true;
    offEngine();
    if (foot) foot.classList.remove("has-dock");
  };
}
