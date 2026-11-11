// 의뢰 정답 검사(설계 §8): 새 가게(newStall(1))에서 의뢰를 차례로, 그 의뢰의 정답 칸 구성을 넣고(앞 의뢰들 정답은 그대로)
// 실제 sql.js + 엔진(playDay)으로 withinDays번 안에 목표를 이루는지 본다. 정답이 쓰는 칸·카드는 그 의뢰의 장까지 열린 것만.
// 성장 의뢰는 돈이 될 때까지(withinDays번까지) 장을 연 뒤 사고, checkUpgradeNow로 바로 완료되는지 본다.
// 실행: node tests/stall_requests.js [--verbose] [--seed N]  (npm run test:stall) — 실패하면 의뢰 id·이유를 찍고 종료 코드 1.
import initSqlJs from "sql.js";
import { REQUESTS, SLOTS, CARDS, UPGRADES, UNLOCK_CHAPTER } from "../data/stall.js";
import { newStall, buyUpgrade } from "../src/stall/state.js";
import { openSlots, fullOpen, slotSql, cardLocked } from "../src/stall/slots.js";
import { currentRequest, checkUpgradeNow } from "../src/stall/requests.js";
import { playDay } from "../src/stall/play.js";
import { runLedger } from "../src/sqlcore.js";

const SQL = await initSqlJs();
const VERBOSE = process.argv.includes("--verbose"); // 날마다 숫자를 찍음(수치 맞출 때)
const runner = async (l, q) => ({ results: runLedger(SQL, l, q), error: null, timeout: false });
const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));
const upTo = (n) => new Set(Array.from({ length: n - UNLOCK_CHAPTER + 1 }, (_, i) => i + UNLOCK_CHAPTER));

// 정답 구성이 그 장까지 열린 칸·카드만 쓰는지
function lockedParts(req, passed) {
  const why = [];
  const open = new Set(openSlots(passed).map((d) => d.id));
  for (const [slotId, st] of Object.entries(req.solution)) {
    const def = SLOTS.find((d) => d.id === slotId);
    if (!def) { why.push(`없는 칸 ${slotId}`); continue; }
    if (!open.has(slotId)) why.push(`칸 ${slotId}는 ${def.chapter}장에 열림`);
    if (st.mode === "full" && def.frame !== "full" && !fullOpen(passed)) why.push(`${slotId} 전체 조립은 7장 뒤`);
    if (st.mode !== "full" && def.frame === "full") why.push(`${slotId}는 전체 조립 칸`);
    for (const list of Object.values(st.parts || {})) {
      for (const t of list) {
        const card = CARD_BY_ID.get(t.c);
        if (!card) { why.push(`없는 카드 ${t.c}`); continue; }
        const lock = cardLocked(card, passed);
        if (lock) why.push(`카드 ${card.text || card.id}: ${lock}`);
      }
    }
    if (slotSql(def, st) === null) why.push(`${slotId} 빈자리`);
  }
  return why;
}

const fmt = (s) => `이익 ${s.profit} · 허탕 ${s.missed}(재고 ${s.missBy.stock}·값 ${s.missBy.price}·진열 ${s.missBy.shelf} 중 다 팔림 ${s.missBy.soldOut}) · 수레 삯 ${s.fees} · 보고 ${s.report}`;

const si = process.argv.indexOf("--seed"); // 다른 씨앗으로도 돌려 볼 때(기본 1, 완료 기준은 1)
const SEED = si > 0 ? Number(process.argv[si + 1]) : 1;
let stall = newStall(SEED);
const fails = [];
const rows = [];
for (const req of REQUESTS) {
  const passed = upTo(req.need);
  const why = lockedParts(req, passed);
  for (const [slotId, st] of Object.entries(req.solution)) stall.slots[slotId] = { on: true, ...structuredClone(st) };

  const cur = currentRequest(stall, passed);
  if (cur.req !== req || cur.waiting) why.push(`차례가 아님(지금 ${cur.req && cur.req.id}, waiting ${cur.waiting})`);

  const startDay = stall.day;
  let done = false, last = null, note = "";
  if (why.length === 0 && req.goal.type === "upgrade") {
    const up = UPGRADES.find((u) => u.id === req.goal.id);
    let days = 0;
    while (stall.money < up.price && days < req.withinDays) {
      const out = await playDay(stall, passed, runner);
      stall = out.stall; last = out.summary; days++;
      if (out.completed.length) why.push(`모으는 동안 엉뚱한 완료 ${out.completed.map((r) => r.id)}`);
    }
    if (stall.money < up.price) why.push(`${req.withinDays}일 안에 ${up.price}냥을 못 모음(${stall.money}냥)`);
    else {
      const b = buyUpgrade(stall, up.id);
      if (!b.ok) why.push(`사기 실패 ${b.reason}`);
      else {
        const c = checkUpgradeNow(b.stall, passed);
        stall = c.stall;
        if (c.completed.length === 1 && c.completed[0] === req) done = true;
        else why.push("산 뒤 바로 완료되지 않음");
      }
    }
    note = `${days}일 모아 ${up.price}냥`;
  } else if (why.length === 0) {
    for (let d = 1; d <= req.withinDays; d++) {
      const out = await playDay(stall, passed, runner);
      stall = out.stall; last = out.summary;
      if (VERBOSE) console.log(`   ${req.id} ${last.day}일: ${fmt(last)} · 돈 ${stall.money}`);
      if (Object.keys(out.rest).length) why.push(`쉰 칸 ${JSON.stringify(out.rest)}`);
      if (out.completed.length) {
        if (out.completed.length === 1 && out.completed[0] === req) { done = true; note = `${d}일째 완료`; }
        else why.push(`엉뚱한 완료 ${out.completed.map((r) => r.id)}`);
        break;
      }
    }
    if (!done && why.length === 0) why.push(`${req.withinDays}일 안에 못 이룸 (마지막 날 ${last ? fmt(last) : "-"})`);
  }
  if (!done) {
    fails.push(`${req.id}: ${why.join(" / ")}`);
    // 뒤 의뢰도 검사할 수 있게 완료로 적고 넘어간다
    stall = structuredClone(stall);
    if (!stall.order.done.includes(req.id)) stall.order.done.push(req.id);
  }
  rows.push(`${done ? "OK " : "NG "} ${req.id} ${req.need}장 ${req.goal.type.padEnd(8)} ${String(stall.day - startDay).padStart(2)}일/${req.withinDays} · ${note || "-"} · 돈 ${stall.money}냥${last ? " · " + fmt(last) : ""}`);
}

const ids = REQUESTS.map((r) => r.id);
if (JSON.stringify(stall.order.done) !== JSON.stringify(ids)) fails.push(`order.done 순서·중복 이상: ${stall.order.done}`);

for (const r of rows) console.log(r);
console.log(`가게 ${stall.day - 1}일 · 돈 ${stall.money}냥 · 성장 ${stall.upgrades.join(",")}`);
if (fails.length) {
  console.log(`의뢰 ${REQUESTS.length - fails.length}/${REQUESTS.length} 통과`);
  for (const f of fails) console.log("실패 " + f);
  process.exit(1);
}
console.log(`의뢰 ${REQUESTS.length}/${REQUESTS.length} 통과`);
