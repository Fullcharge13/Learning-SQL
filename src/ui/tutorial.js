// 첫 사용 튜토리얼 화면(v0.3.3, 리아 v0.18.0 꼴): 두억이 카드 4장 + 마지막에 진짜 SQL 한 줄을 카드로 조립해 실행.
//   ctx.show("tutorial")                 새 저장의 「시작하기」 뒤(splash) — 끝나면 저장의 tutorial = "done" | "skipped"
//   ctx.show("tutorial", { replay: true }) 설정 「사용법 다시 보기」 — 저장은 아무것도 바꾸지 않음
// - 카드 4: SELECT · * · FROM · shops를 섞은 더미에서 눌러 조립 → 「실행」이 진짜 실행기로 돌려 결과 표(8행) → 「잘했어요!」.
//   차례가 틀리면 짧은 안내만(실행기 오류 원문은 보이지 않음, v0.3.3 검토). 맞지 않은 실행 2번이면 「정답 보기」(카드를 정답 차례로 놓아 줌).
//   막지 않는다: 「건너뛰기」는 카드마다, 실행기를 기다리는 동안·못 받았을 때도 「홈으로」.
// - XP·엽전·레슨 진도·퀘스트·배지는 건드리지 않는다.
// - 화면 요소에만 눌림 묶음을 단다(#app에 달지 않음). 떠나면 실행기 구독을 떼고(alive), 늦게 끝난 실행은 그리지 않는다.
import { dueogiSVG } from "../dueogi.js";
import { SCHEMA } from "../../data/schema.js";
import { esc, escCode, icon } from "./dom.js";
import { tableHTML } from "./table.js";
import { TUT_TEXT, TUT_CARDS, SHOW_ANSWER_AFTER, TUT_HINT, tutorialCheck, tutorialBank } from "../tutorial.js";

const LAST = TUT_TEXT.length - 1;
const FACE = ["proud", "think", "wink", "think"];
const KO = { "*": "모든 열", shops: SCHEMA.shops ? SCHEMA.shops.ko : "가게" };
// 카드 2의 작은 표: 장터 shops의 앞 세 줄(data/market.sql과 같은 값)
const MINI = [["도깨비 국밥집", "달래 할멈", "먹거리"], ["여우골 떡방", "금순", "먹거리"], ["산삼 약방", "한약수", "약재"]];

function miniTable() {
  const cols = ["name", "owner", "category"];
  const ko = cols.map((c) => (SCHEMA.shops && SCHEMA.shops.cols[c]) || c);
  return `<figure class="tut-fig" aria-label="장부 표 그림: 가게 세 줄, 정보 세 칸">
    <table class="tut-table">
      <thead><tr>${cols.map((c, i) => `<th scope="col"${i === 1 ? ' class="col-on"' : ""}><span class="col-en">${esc(c)}</span><span class="col-ko">${esc(ko[i])}</span></th>`).join("")}</tr></thead>
      <tbody>${MINI.map((r, k) => `<tr${k === 0 ? ' class="row-on"' : ""}>${r.map((v, i) => `<td${i === 1 ? ' class="col-on"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    <figcaption class="tut-legend">
      <span><i class="sw row" aria-hidden="true"></i>가로 한 줄 = 가게 하나</span>
      <span><i class="sw col" aria-hidden="true"></i>세로 한 칸 = 정보 하나(주인)</span>
    </figcaption>
  </figure>`;
}

function demoCards() {
  return `<div class="tut-demo" aria-label="카드 조립 예: SELECT * FROM shops">
    ${TUT_CARDS.map((t) => `<span class="bcard placed" aria-hidden="true"><span class="bc-text">${esc(t)}</span>${KO[t] ? `<span class="bc-ko">${esc(KO[t])}</span>` : ""}</span>`).join("")}
  </div>
  <p class="muted center tut-note">카드를 누르면 줄에 붙고, 붙은 카드를 누르면 빠져요.</p>`;
}

export function render(root, ctx, params = {}) {
  const replay = !!(params && params.replay);
  let step = 0;
  let alive = true;
  let ended = false;
  // 카드 4 상태
  const bank = tutorialBank();
  let line = [];            // 놓은 카드: 더미 번호
  let tries = 0;            // 맞지 않은 실행 수
  let running = false;
  let passed = false;
  let outHTML = "";
  let off = () => {};

  const sql = ctx.sql;
  const engine = () => (sql ? sql.status : "failed");
  const texts = () => line.map((i) => bank[i]);

  function end(kind, then) {
    if (ended) return;
    ended = true;
    if (!replay) ctx.commit({ ...ctx.save, tutorial: kind });
    if (then === "lesson") ctx.show("lesson", { id: ctx.currentLessonId() || "1-1" });
    else ctx.show("home");
  }

  // ---- 카드 4: 조립 ----
  function cardHTML(i, placedAt) {
    const t = bank[i];
    const ko = KO[t] ? `<span class="bc-ko">${esc(KO[t])}</span>` : "";
    if (placedAt >= 0) return `<button class="bcard placed" data-k="${placedAt}" aria-label="${esc(`${placedAt + 1}번째 카드 빼기: ${t}`)}"><span class="bc-text">${esc(t)}</span>${ko}</button>`;
    return `<button class="bcard" data-i="${i}" data-text="${esc(t)}"><span class="bc-text">${esc(t)}</span>${ko}</button>`;
  }
  function paintBuild() {
    const card = root.querySelector(".tut-card");
    if (!card || step !== LAST) return;
    const lineEl = card.querySelector("#tut-line");
    const bankEl = card.querySelector("#tut-bank");
    lineEl.innerHTML = line.length ? line.map((i, k) => cardHTML(i, k)).join("") : `<span class="bline-empty">아래 카드를 눌러 보세요</span>`;
    bankEl.innerHTML = bank.map((t, i) => (line.includes(i) ? `<span class="bcard slot" aria-hidden="true"><span class="bc-text">${esc(t)}</span></span>` : cardHTML(i, -1))).join("");
    const st = engine();
    const chip = card.querySelector("#tut-eng");
    chip.hidden = st === "ready" || passed;
    chip.className = "eng-chip" + (st === "failed" ? " err" : "");
    chip.innerHTML = st === "failed"
      ? `<p class="eng-head">실행기를 아직 받지 못했어요</p><p>홈에서 첫 레슨부터 해도 괜찮아요. 인터넷이 될 때 다시 열면 받아 둬요.</p>`
      : `<p class="eng-head"><span class="dot" aria-hidden="true"></span>실행기 준비 중이에요</p>`;
    const run = card.querySelector("#tut-run");
    run.hidden = passed;
    run.disabled = running || st !== "ready";
    run.setAttribute("aria-busy", String(running));
    card.querySelector("#tut-out").innerHTML = outHTML;
    card.querySelector("#tut-answer").hidden = passed || tries < SHOW_ANSWER_AFTER;
    card.querySelector(".tut-after").hidden = !passed;
    card.querySelector(".tut-wait").hidden = passed || st === "ready";
    card.querySelector(".tut-build").classList.toggle("passed", passed);   // 통과 뒤 빈 카드 더미 자리는 접음
    lineEl.querySelectorAll("button").forEach((b) => { b.disabled = passed; });
    bankEl.querySelectorAll("button").forEach((b) => { b.disabled = passed; });
  }

  async function runIt() {
    if (running || passed || engine() !== "ready") return;
    const verdict = tutorialCheck(texts());
    if (verdict === "empty" || verdict === "short") {
      tries++;
      outHTML = `<div class="err-panel soft"><p>${esc(TUT_HINT[verdict])}</p></div>`;
      paintBuild();
      return;
    }
    running = true;
    paintBuild();
    let r;
    try { r = await sql.run(texts().join(" ")); } catch { r = { error: "worker", columns: [], rows: [] }; }
    if (!alive || step !== LAST) return;
    running = false;
    if (r && !r.error && verdict === "ok") {
      passed = true;
      const n = Array.isArray(r.rows) ? r.rows.length : 0;
      outHTML = `<p class="pass-line">${icon("check")}잘했어요! 가게 ${esc(n)}곳이 모두 나왔어요</p>
        ${tableHTML(r, { ko: SCHEMA, tables: ["shops"], label: "실행 결과 표", sql: texts().join(" ") })}`;
      try { ctx.sound.play("correct"); } catch { /* 소리는 없어도 됨 */ }
      const face = root.querySelector(".tut-dueogi");
      if (face) face.innerHTML = dueogiSVG({ outfit: ctx.save.outfit, face: "cheer", size: 84 });
    } else if (!r || r.error === "load" || r.error === "worker" || r.error === "timeout" || r.timeout) {
      // 실행기 탓(멈춤·시간 넘김)은 차례 안내가 아니라 다시 눌러 보라는 말(v0.3.3 검토: 맞는 차례인데 「SELECT로 시작해요」가 뜨던 일)
      outHTML = `<div class="err-panel soft"><p>실행기가 잠깐 멈췄어요. 다시 눌러 보세요.</p></div>`;
    } else {
      // 차례만 틀림: 처음 보는 오류가 「조회만 할 수 있어요」 같은 엉뚱한 설명이 되지 않게 친절한 안내만(v0.3.3 검토)
      tries++;
      outHTML = `<div class="err-panel soft"><p class="tut-hint">${icon("bulb")}<span>${esc(TUT_HINT.order)}</span></p></div>`;
    }
    paintBuild();
    const box = root.querySelector("#tut-out");
    try { if (box) box.scrollIntoView({ block: "nearest" }); } catch { /* 옛 브라우저 */ }
    if (passed) {
      const next = root.querySelector(".tut-after .btn");
      if (next) next.focus({ preventScroll: true });
    }
  }

  function buildHTML() {
    return `<div class="tut-build">
      <p class="ex-label">내가 만든 SQL <small>(누르면 빠져요)</small></p>
      <div class="bline" id="tut-line" aria-label="조립 줄"></div>
      <p class="ex-label tut-bank-label">카드 더미 <small>(누른 차례대로 붙어요)</small></p>
      <div class="bbank" id="tut-bank" aria-label="카드 더미"></div>
      <div class="eng-chip" id="tut-eng" role="status" aria-live="polite" hidden></div>
      <button class="btn primary wide" id="tut-run">${icon("play")}<span>실행</span></button>
      <section class="tut-out" id="tut-out" aria-live="polite"></section>
      <button class="btn ghost wide" id="tut-answer" hidden>${icon("eye")}<span>정답 보기</span></button>
      <div class="tut-wait" hidden><button class="btn ghost wide" id="tut-wait-home">홈으로</button></div>
      <div class="tut-after" hidden>
        ${replay ? "" : `<button class="btn primary wide" id="tut-lesson">첫 레슨 시작</button>`}
        <button class="btn ${replay ? "primary" : "ghost"} wide" id="tut-home">홈으로</button>
      </div>
    </div>`;
  }

  function draw() {
    const last = step === LAST;
    const face = FACE[step] || "proud";
    root.innerHTML = `<main class="screen tutorial">
      <header class="tut-top">
        <div class="tut-dots" role="img" aria-label="${esc(`${TUT_TEXT.length}장 중 ${step + 1}장`)}">${TUT_TEXT.map((_, i) => `<span class="${i === step ? "on" : i < step ? "seen" : ""}"></span>`).join("")}</div>
        <button class="btn ghost small" id="tut-skip">${replay ? "닫기" : "건너뛰기"}</button>
      </header>
      <section class="tut-card${last ? " last" : ""}">
        <div class="dueogi-row tut-say">
          <div class="dueogi-wrap tut-dueogi">${dueogiSVG({ outfit: ctx.save.outfit, face, size: last ? 84 : 128 })}</div>
          <p class="bubble" data-autofocus>${escCode(TUT_TEXT[step])}</p>
        </div>
        ${step === 1 ? miniTable() : step === 2 ? demoCards() : last ? buildHTML() : ""}
      </section>
      ${last ? "" : `<footer class="tut-foot"><button class="btn primary wide" id="tut-next">${step === LAST - 1 ? "직접 해 보기" : "다음"}</button></footer>`}
    </main>`;
    root.querySelector("#tut-skip").addEventListener("click", () => end("skipped", "home"));
    if (last) {
      const card = root.querySelector(".tut-card");
      card.querySelector("#tut-bank").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-i]");
        if (!b || passed || running) return;
        const i = +b.dataset.i;
        if (!line.includes(i)) line = [...line, i];
        paintBuild();
      });
      card.querySelector("#tut-line").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-k]");
        if (!b || passed || running) return;
        line = line.filter((_, k) => k !== +b.dataset.k);
        paintBuild();
      });
      card.querySelector("#tut-run").addEventListener("click", runIt);
      card.querySelector("#tut-answer").addEventListener("click", () => {
        if (passed || running) return;
        line = TUT_CARDS.map((t) => bank.indexOf(t));
        outHTML = `<p class="muted">정답 차례로 놓았어요. 「실행」을 눌러 보세요.</p>`;
        paintBuild();
        const run = card.querySelector("#tut-run");
        if (run && !run.disabled) run.focus({ preventScroll: true });
      });
      card.querySelector("#tut-home").addEventListener("click", () => end("done", "home"));
      card.querySelector("#tut-wait-home").addEventListener("click", () => end("done", "home"));
      const les = card.querySelector("#tut-lesson");
      if (les) les.addEventListener("click", () => end("done", "lesson"));
      paintBuild();
      if (sql && sql.status === "idle") sql.preload().catch(() => {});
    } else {
      root.querySelector("#tut-next").addEventListener("click", () => { step++; draw(); });
    }
    const b = root.querySelector("[data-autofocus]");
    if (b) { b.setAttribute("tabindex", "-1"); b.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  draw();
  off = sql && typeof sql.listen === "function" ? sql.listen(() => { if (alive && step === LAST) paintBuild(); }) : () => {};
  return () => { alive = false; off(); };
}
