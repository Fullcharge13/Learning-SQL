// 「두억이의 가게」 화면(v0.3 작업 7): 윗줄(날·돈·닫기) → 좌판 그림 → 「장 열기」 → 의뢰 게시판 → 자동화 칸 → 어제 장부 → 성장 → 쓸 표 보기.
// 설계 docs/specs/2026-11-11-두억이의-가게-설계.md §6. 게임 규칙은 src/stall/에만 있고, 여기서는 부르고 그리기만 한다.
// 하루 흐름: 「장 열기」 → 단추 잠금 → playDay → 가게 저장(+ 의뢰 XP, 재생 전) → 재생 → 정산 카드 → 단추 풀림.
// 하루 계산은 모듈에 하나만(inflight): 두 번 빨리 눌러도, 계산 중에 화면을 떠났다 와도 하루는 한 번만 지난다.
import { SLOTS, UPGRADES } from "../../data/stall.js";
import { newStall, buyUpgrade, stallOpen } from "../stall/state.js";
import { playDay } from "../stall/play.js";
import { currentRequest, checkUpgradeNow } from "../stall/requests.js";
import { ledgerSql, LEDGER_SCHEMA } from "../stall/ledger.js";
import { openSlots, slotSql } from "../stall/slots.js";
import { dueogiSVG } from "../dueogi.js";
import { FACES } from "../say.js";
import { esc, escCode, icon, toast, celebrate } from "./dom.js";
import { openTables } from "./tables.js";
import { stallSVG, playReplay, summaryRows, lastLines, requestProgress, itemName } from "./stallart.js";

export { eventLine, bubbleText, summaryRows, lastLines, requestProgress, arrivalLine, restLines, TIMEOUT_LINE } from "./stallart.js";

export const ENGINE_WAIT = "실행기 준비 중이에요. 잠시 뒤에 다시 눌러 주세요.";
const REPLAY_STEP = 750;   // 손님 한 명(ms)

let inflight = null;       // 하루 계산 중인 약속(화면을 다시 그려도 하나)

function reducedMotion() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** 그날 진열대에 오른 물건(재생용): 진열하기 칸 결과, 없으면 아침 재고가 있는 물건을 번호 순으로 */
function dayShelf(before, after) {
  const d = after && after.last && after.last.slots && after.last.slots.display;
  if (d && Array.isArray(d.ids)) return d.ids.slice(0, before.shelf);
  return [...before.items].sort((a, b) => a.item_id - b.item_id).filter((it) => it.stock > 0).map((it) => it.item_id).slice(0, before.shelf);
}

function newSeed() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647 || 1; } catch { return (Date.now() % 2147483647) || 1; }
}

export function render(root, ctx) {
  const passed = ctx.stallPassed();
  if (!stallOpen(passed)) { toast("3장 평가를 통과하면 열려요"); ctx.show("home"); return undefined; }

  // 처음 열기: 가게를 만들고 두억이가 소개
  let say = null;
  if (!ctx.save.stall || !ctx.save.stall.opened) {
    const base = ctx.save.stall || newStall(newSeed());
    ctx.commit({ ...ctx.save, stall: { ...base, opened: true } });
    say = ctx.say("stall_intro");
  }

  let alive = true;
  let view = "idle";       // idle · replay · settle
  let day = null;          // 마지막으로 연 하루 { before, stall, events, summary, completed, timedOut }
  let replay = null;

  const stall = () => ctx.save.stall;

  function header(st) {
    return `<header class="stall-top">
      <button class="icon-btn" id="stall-close" aria-label="가게 닫고 학습 길로">${icon("close")}</button>
      <h1 class="stall-title">두억이의 가게</h1>
      <div class="stall-stats">
        <span class="stall-day">${esc(st.day)}일째</span>
        <span class="stall-money">${icon("coin")}<b>${esc(st.money)}</b>냥</span>
      </div>
    </header>`;
  }

  function artHTML(st, opts) {
    const face = view === "settle" && day && day.completed.length ? "cheer" : view === "replay" ? "think" : FACES.home;
    return `<section class="stall-art" aria-label="좌판 그림">
      ${stallSVG(st, opts)}
      <div class="stall-dueogi" aria-hidden="true">${dueogiSVG({ outfit: ctx.save.outfit, face, size: 74 })}</div>
      <p class="cust-bubble" hidden></p>
    </section>`;
  }

  function requestHTML(st) {
    const { req, waiting } = currentRequest(st, ctx.stallPassed());
    if (!req) return `<section class="panel req done-all" aria-labelledby="req-title"><h2 id="req-title">${icon("check")}의뢰 게시판</h2><p>의뢰를 모두 끝냈어요! 가게는 계속 열 수 있어요.</p></section>`;
    return `<section class="panel req${waiting ? " waiting" : ""}" aria-labelledby="req-title">
      <h2 id="req-title">${icon("book")}의뢰 게시판</h2>
      <p class="req-from">${esc(req.from)}의 부탁</p>
      <p class="req-line">${escCode(req.line)}</p>
      ${waiting ? `<p class="req-wait">${icon("lock")}<span>${esc(req.need)}장 평가를 통과하면 이 의뢰를 할 수 있어요</span></p>`
        : `<p class="req-prog"><b>목표</b> ${esc(requestProgress(req, st))} <span class="req-xp">XP +${esc(req.xp)}</span></p>`}
    </section>`;
  }

  function slotsHTML(st, busy) {
    const open = new Set(openSlots(ctx.stallPassed()).map((d) => d.id));
    const list = [...SLOTS].sort((a, b) => a.chapter - b.chapter).map((def) => {
      if (!open.has(def.id)) {
        return `<li class="slot locked"><span class="slot-name">${icon("lock")}${esc(def.name)}</span><span class="slot-lock">${esc(def.chapter)}장을 끝내면 열려요</span></li>`;
      }
      const s = st.slots[def.id];
      const on = !!(s && s.on);
      const sql = s ? slotSql(def, s) : null;
      const shown = sql || (def.tpl ? def.tpl.replace(/\{\w+\}/g, "[ ]") : "[ ]");
      return `<li class="slot${on ? " on" : ""}">
        <div class="slot-head">
          <span class="slot-name">${esc(def.name)}</span>
          <span class="slot-sw"><span class="slot-state" aria-hidden="true">${on ? "켜짐" : "꺼짐"}</span><button class="switch" role="switch" aria-checked="${on}" data-slot="${esc(def.id)}" aria-label="${esc(`${def.name} 칸 켜기`)}"${busy ? " disabled" : ""}><span></span></button></span>
        </div>
        <p class="slot-desc">${esc(def.desc)}</p>
        <code class="slot-sql${sql ? "" : " blank"}">${escCode(shown)}</code>
        ${on && !sql ? `<p class="slot-note">빈자리가 있어 장을 열면 이 칸은 쉬어요</p>` : ""}
      </li>`;
    }).join("");
    return `<section class="panel slots" aria-labelledby="slots-title"><h2 id="slots-title">${icon("gear")}자동화 칸</h2><ul class="slot-list">${list}</ul></section>`;
  }

  function rowsHTML(summary) {
    return `<dl class="sum-rows">${summaryRows(summary).map(([k, v]) => `<div class="sum-row${k === "이익" ? " profit" : ""}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  }

  function lastHTML(st) {
    if (!st.last || !st.last.summary) return "";
    const lines = lastLines(st.last, st);
    return `<section class="panel last" aria-labelledby="last-title">
      <h2 id="last-title">${icon("table")}어제 장부 <small>${esc(st.last.summary.day)}일째</small></h2>
      ${rowsHTML(st.last.summary)}
      ${lines.length ? `<ul class="last-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
    </section>`;
  }

  function upgradesHTML(st, busy) {
    const rows = UPGRADES.map((u) => {
      const own = st.upgrades.includes(u.id);
      const short = !own && st.money < u.price;
      return `<li class="up${own ? " own" : ""}">
        <div class="up-text"><b>${esc(u.name)}</b><span>${esc(u.desc)}</span></div>
        <button class="btn ${own ? "ghost" : "sun"} small up-buy" data-up="${esc(u.id)}"${own || short || busy ? " disabled" : ""}
          aria-label="${esc(own ? `${u.name}, 들였어요` : `${u.name} ${u.price}냥에 사기`)}">${own ? "들였어요" : `${u.price}냥 사기`}</button>
      </li>`;
    }).join("");
    return `<section class="panel ups" aria-labelledby="ups-title"><h2 id="ups-title">${icon("star")}성장</h2><ul class="up-list">${rows}</ul></section>`;
  }

  function settleHTML() {
    if (!day) return "";
    const s = day.summary;
    const done = day.completed.map((r) => `<p class="req-done">${icon("check")}의뢰 완료! XP +${esc(r.xp)}</p>`).join("");
    return `<section class="panel settle" aria-labelledby="settle-title" data-autofocus>
      <h2 id="settle-title">${esc(s.day)}일째 정산</h2>
      ${rowsHTML(s)}
      ${s.trend ? `<p class="settle-trend">오늘의 인기: ${esc(itemName(s.trend))}</p>` : ""}
      ${done}
      <p class="muted settle-next">내일은 ${esc(s.day + 1)}일째예요.${s.bought > 0 ? " 들인 상자는 저녁에 도착해 내일 팔 수 있어요." : ""}</p>
    </section>`;
  }

  function paint() {
    if (!alive) return;
    const busy = !!inflight || view === "replay";
    const showing = view === "replay" && day ? day.before : stall();
    const artOpts = view === "replay" && day ? { ids: dayShelf(day.before, day.stall) } : {};
    root.innerHTML = `<div class="screen stall">
      ${header(showing)}
      <main class="stall-body">
        ${say ? `<p class="bubble stall-say">${escCode(say.text)}</p>` : ""}
        ${artHTML(showing, artOpts)}
        ${view === "replay" ? `<section class="panel replay" aria-labelledby="replay-title">
            <h2 id="replay-title">${esc(day.before.day)}일째 장사 중</h2>
            <ol class="replay-log" aria-live="polite"></ol>
            <button class="btn ghost wide" id="skip">건너뛰기</button>
          </section>`
          : `<button class="btn sun wide open-day" id="open-day"${busy ? " disabled" : ""}>${icon("play")}<span>${inflight ? "장 여는 중…" : "장 열기"}</span></button>`}
        ${view === "settle" ? settleHTML() : ""}
        ${requestHTML(stall())}
        ${slotsHTML(stall(), busy)}
        ${lastHTML(stall())}
        ${upgradesHTML(stall(), busy)}
        <button class="btn ghost wide" id="stall-tables">${icon("table")}<span>쓸 표 보기</span></button>
      </main>
    </div>`;
    bind();
  }

  function bind() {
    root.querySelector("#stall-close").addEventListener("click", () => ctx.show("home"));
    const od = root.querySelector("#open-day");
    if (od) od.addEventListener("click", openDay);
    const sk = root.querySelector("#skip");
    if (sk) sk.addEventListener("click", () => { if (replay) replay.skip(); });
    root.querySelectorAll("[data-slot]").forEach((b) => b.addEventListener("click", () => toggleSlot(b.dataset.slot)));
    root.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => buy(b.dataset.up)));
    root.querySelector("#stall-tables").addEventListener("click", () => {
      openTables(Object.keys(LEDGER_SCHEMA), ctx.sql, { schema: LEDGER_SCHEMA, ledgerSql: ledgerSql(stall()) });
    });
  }

  function toggleSlot(id) {
    if (inflight || view === "replay") return;
    const def = SLOTS.find((d) => d.id === id);
    if (!def) return;
    const next = structuredClone(stall());
    const st = next.slots[id];
    next.slots[id] = st ? { ...st, on: !st.on } : { on: true, mode: def.frame === "full" ? "full" : "frame", parts: {} };
    ctx.commit({ ...ctx.save, stall: next });
    paint();
    const sw = root.querySelector(`[data-slot="${id}"]`);
    if (sw) sw.focus({ preventScroll: true });
  }

  function buy(id) {
    if (inflight || view === "replay") return;
    const r = buyUpgrade(stall(), id);
    if (!r.ok) { toast(r.reason === "money" ? "가게 돈이 모자라요" : "살 수 없어요"); return; }
    const c = checkUpgradeNow(r.stall, ctx.stallPassed());
    ctx.stallCommit(c.stall, c.completed);
    ctx.sound.play("buy");
    const u = UPGRADES.find((x) => x.id === id);
    toast(`${u ? u.name : "성장"}을 들였어요`);
    if (c.completed.length) {
      say = ctx.say("stall_request_done");
      toast(`의뢰 완료! XP +${c.completed.reduce((n, q) => n + q.xp, 0)}`);
    }
    if (view === "settle") view = "idle";
    paint();
  }

  async function openDay() {
    if (inflight || view === "replay") return;
    const before = stall();
    const passedNow = ctx.stallPassed();
    let timedOut = false;
    const runner = async (l, q) => {
      const r = await ctx.sql.runLedger(l, q);
      timedOut = !!(r && (r.timeout || r.error === "timeout"));
      return r;
    };
    const job = (async () => {
      const out = await playDay(before, passedNow, runner);
      const cur = ctx.save.stall;
      if (!cur || cur.day !== before.day) return null;          // 그 사이 다른 판이 하루를 넘겼으면 버림
      const saved = ctx.stallCommit(out.stall, out.completed);  // 재생 전에 저장
      return { ...out, before, timedOut, milestone: saved.milestone };
    })();
    inflight = job;
    say = null;
    if (view === "settle") view = "idle";
    paint();
    let out = null, failed = false;
    try { out = await job; } catch (e) { console.warn("장 열기 실패:", e); failed = true; } finally { inflight = null; }
    if (!alive) return;
    if (failed) { toast(ENGINE_WAIT); paint(); return; }
    if (!out) { paint(); return; }
    day = out;
    if (reducedMotion()) { finishDay(); return; }
    view = "replay";
    paint();
    replay = playReplay({
      art: root.querySelector(".stall-art"),
      log: root.querySelector(".replay-log"),
      bubble: root.querySelector(".cust-bubble"),
      events: out.events, before: out.before, after: out.stall, timedOut: out.timedOut,
      step: REPLAY_STEP,
      onDone: () => { replay = null; finishDay(); },
    });
  }

  function finishDay() {
    if (!alive) return;
    view = "settle";
    if (day && day.completed.length) say = ctx.say("stall_request_done");   // 결과는 재생이 끝난 뒤에 알린다
    paint();
    const card = root.querySelector(".settle");
    if (card) {
      card.setAttribute("tabindex", "-1");
      card.focus({ preventScroll: true });
      try { card.scrollIntoView({ block: "nearest" }); } catch { /* 옛 브라우저 */ }
    }
    if (day && day.completed.length) ctx.sound.play("done");
    if (day && day.milestone) celebrate({ outfit: ctx.save.outfit, milestone: day.milestone });
  }

  paint();
  // 다른 판의 이 화면이 하루를 계산하는 중이면 끝난 뒤 새 상태로 다시 그린다
  if (inflight) inflight.then(() => paint(), () => paint());
  return () => {
    alive = false;
    if (replay) { replay.stop(); replay = null; }
  };
}
