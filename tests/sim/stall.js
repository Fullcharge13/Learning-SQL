// 작업 6. 「두억이의 가게」 경제 시뮬레이션 — 학습자 모습 4가지 × 씨앗 12개 × 40일(설계 §4-3)
// 실행: node tests/sim/stall.js [--seeds 12] [--days 40]  — 표와 판정 줄을 찍고, 모두 OK면 종료 코드 0.
// 실제 엔진(playDay = 장부 SQL을 sql.js로 실행 → runDay → 의뢰 판정)을 그대로 부른다. sql.js는 한 번만 띄운다.
//
// 해석(보고서에 함께 적음):
// - 시작 질의 판정(고침 2, 설계 §4-3): 좋은 조건보다 하루 이익 5냥 이상 적고, 허탕(모든 까닭)이 2배 이상.
// - 진열하기 칸: 40일 전체로 0 이하면 넓은 진열대를 사기 전 날들로 판정한다(그 뒤엔 물건 8가지가 다 올라가 할 일이 없음, 고침 2).
// - start·good·all: 3장만 통과, 재고 채우기 칸 하나(stock < 1 · < 4 · < 100), 성장을 사지 않음(가게 바탕 경제를 잼).
// - all의 「stock < 100」은 숫자 카드(0~30)로 못 놓으므로 같은 뜻인 stock >= 0으로 잰다.
// - full: 장이 CH_OPEN 날에 하나씩 열린다(3장 1일 … 8장 16일, 사흘에 한 장). 지금 의뢰가 열리면 그 의뢰의 정답 칸 구성을 넣고
//   (앞 의뢰들 구성은 그대로), 넓은 진열대를 사면 진열하기 LIMIT을 진열대 칸 수로 늘리고, 날마다 장을 열기 전에 돈이 되는 성장을 값 싼 순으로 산다(산 날 = 그날 번호).
// - 칸마다 효과: full 판의 날마다 칸 구성(timeline)을 그대로 다시 돌리되 그 칸만 끈 판과 비교한다(성장은 그 판의 돈으로 값 싼 순).
//   그 칸이 처음 켜진 날부터 끝까지, 이익 차이(켬 − 끔, 재고 값 포함 하루 평균) ≥ 0.5냥 또는 재고·값 허탕 차이(끔 − 켬) ≥ 0.1개/일
//   (12판 중앙값). 「0보다 큼」을 반올림 잡음과 가르려고 최소 크기를 둔다.
//   「하루 보고」 칸은 설계 §2-3대로 가게에 영향이 없으므로 판정에서 뺀다(표에는 보임).
// - 「재고 값 포함 이익」 = 그 기간 하루 이익(돈) + (끝날 저녁 재고 − 시작 전날 저녁 재고)을 들여온 값으로 셈 ÷ 날 수.
//   짧은 기간을 비교할 때 아직 안 팔린 물건(가게 것)을 손해로 세지 않으려고 쓴다. 칸 효과·HAVING 판정은 이 값으로, 표에는 돈 이익도 함께.
// - HAVING: full 판에서 r15 정답의 HAVING 숫자만 바꿔(4·8·12·15·20) r15를 넣은 날부터 HAVING_WINDOW일(판은 그만큼 늘려 돌림)의
//   재고 값 포함 이익을 잰다.
//   판정: 가장 좋은 기준이 양 끝(가장 낮음·가장 높음)이 아니고, 양 끝보다 1냥 넘게 많음(봉우리가 있음). r15 정답 기준은 봉우리에서 2냥 안.
// - SIM_TRACE=1 이면 날마다 한 줄(돈·이익·허탕·칸 결과·재고)을 찍는다(수치 맞출 때).
import initSqlJs from "sql.js";
import { UPGRADES, REQUESTS, ITEMS } from "../../data/stall.js";
import { newStall, buyUpgrade } from "../../src/stall/state.js";
import { currentRequest, checkUpgradeNow } from "../../src/stall/requests.js";
import { playDay } from "../../src/stall/play.js";
import { runLedger } from "../../src/sqlcore.js";

export const TARGETS = {
  startGap: 5,         // 시작 질의만: 좋은 조건보다 하루 이익이 5냥 이상 적음(고침 2, 설계 §4-3)
  startMiss: 2,        // 시작 질의만: 허탕(모든 까닭)이 좋은 조건의 2배 이상
  good: [30, 45],      // 좋은 조건: 하루 이익
  firstUp: [4, 7],     // 첫 성장 「5일째 안팎」
  allUp: [25, 35],     // 성장 5개 「30일째 안팎」
};
export const CH_OPEN = { 3: 1, 4: 4, 5: 7, 6: 10, 7: 13, 8: 16 }; // 장이 열리는 날(full)
export const HAVING_TRY = [4, 8, 12, 15, 20];
export const HAVING_WINDOW = 20;
// 칸 효과 「0보다 큼」을 반올림 잡음과 가르는 최소 크기(하루 평균): 이익 0.5냥, 또는 재고·값 허탕 0.1개(열흘에 한 번)
export const EFFECT_EPS = { profit: 0.5, miss: 0.1 };
export const EFFECT_SLOTS = ["pricing", "restock", "best", "discount", "display"]; // report는 가게에 영향 없음

let SQL = null;
const COST = new Map(ITEMS.map((it) => [it.item_id, it.cost]));
const runner = async (l, q) => ({ results: runLedger(SQL, l, q), error: null, timeout: false });
const UP_ORDER = [...UPGRADES].sort((a, b) => a.price - b.price);
const restockOnly = ([op, n]) => ({ restock: { on: true, mode: "frame", parts: { where: [{ c: "col_stock" }, { c: op }, { c: "num", n }] } } });
// 「다 채우기」 stock < 100은 숫자 카드(0~30)로 못 놓으므로 같은 뜻인 stock >= 0(모든 물건)으로 둔다.
const PROFILE_Q = { start: ["op_lt", 1], good: ["op_lt", 4], all: ["op_ge", 0] }; // good: 예전 이름(시험·추적용)
// 「좋은 조건」 = 단순한 stock < k 중 이익이 가장 큰 k(설계 §4-3 「stock < 4 근처」, 고침 1 지시). 이 k들을 다 돌려 고른다
export const GOOD_K = [2, 3, 4, 5, 6, 7, 8, 10, 12];
const profileQ = (p) => (p.startsWith("k") ? ["op_lt", Number(p.slice(1))] : PROFILE_Q[p]);

const passedOn = (day) => new Set(Object.entries(CH_OPEN).filter(([, d]) => d <= day).map(([c]) => Number(c)));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// 지금 의뢰가 열렸고 아직 구성을 안 넣었으면 넣는다(성장 의뢰는 넣을 것이 없음). having은 r15 HAVING 숫자 바꾸기.
function applyRequests(stall, passed, applied, having) {
  for (;;) {
    const { req, waiting } = currentRequest(stall, passed);
    if (!req || waiting || applied.has(req.id)) return;
    applied.set(req.id, stall.day);
    for (const [slot, st] of Object.entries(req.solution)) {
      const s = { on: true, ...structuredClone(st) };
      if (req.id === "r15" && having != null) {
        const list = s.parts.full;
        list[list.length - 1] = { c: "num", n: having };
      }
      stall.slots[slot] = s;
    }
    return; // 한 번에 하나: 다음 의뢰는 이 의뢰를 해낸 뒤
  }
}

// 돈이 되는 성장을 값 싼 순으로(한 번에 여러 개도)
function buyCheapest(stall, passed, applied, having, upgrades, track) {
  for (const up of UP_ORDER) {
    if (stall.upgrades.includes(up.id) || stall.money < up.price) {
      if (!stall.upgrades.includes(up.id)) break; // 값 싼 것을 못 사면 더 비싼 것도 안 삼(값 싼 순)
      continue;
    }
    const b = buyUpgrade(stall, up.id);
    if (!b.ok) break;
    upgrades[up.id] = b.stall.day;
    let s = b.stall;
    // 넓은 진열대를 사면 진열하기 칸의 LIMIT도 진열대 칸 수로 늘린다(칸을 잘 쓰는 학습자)
    const lim = s.slots.display && s.slots.display.parts && s.slots.display.parts.limit;
    if (up.id === "shelf" && track && Array.isArray(lim) && lim[0] && lim[0].c === "num" && lim[0].n < s.shelf) lim[0] = { c: "num", n: s.shelf };
    if (track) {
      s = checkUpgradeNow(s, passed).stall;
      applyRequests(s, passed, applied, having);
    }
    Object.assign(stall, s);
  }
}

/**
 * 한 판. profile: start|good|all|full. timeline을 주면(full) 날마다 그 칸 구성으로 돌리고, off 칸은 끈다.
 * @returns {{profits:number[], misses:number[], shelf:number[], fees:number[], upgrades:object, timeline:object[], r15Day:number|null}}
 */
export async function simulate({ profile, seed, days = 40, timeline = null, off = null, having = null }) {
  if (!SQL) SQL = await initSqlJs();
  let stall = newStall(seed);
  const full = profile === "full";
  if (!full) stall.slots = restockOnly(profileQ(profile));
  const applied = new Map();
  const upgrades = {};
  const out = { profits: [], misses: [], shelf: [], stockMiss: [], priceMiss: [], customers: [], fees: [], inv: [], upgrades, timeline: [], r15Day: null };
  out.inv0 = stall.items.reduce((v, it) => v + it.stock * COST.get(it.item_id), 0);
  for (let d = 0; d < days; d++) {
    const passed = full ? passedOn(stall.day) : new Set([3]);
    if (full) {
      const track = !timeline;
      if (track) applyRequests(stall, passed, applied, having);
      buyCheapest(stall, passed, applied, having, upgrades, track);
      if (timeline) stall.slots = structuredClone(timeline[d].slots);
      if (off && stall.slots[off]) stall.slots[off] = { ...stall.slots[off], on: false };
    }
    out.timeline.push({ day: stall.day, slots: structuredClone(stall.slots) });
    const r = await playDay(stall, passed, runner);
    stall = r.stall;
    const s = r.summary;
    out.profits.push(s.profit);
    out.misses.push(s.missBy.stock + s.missBy.price);
    out.shelf.push(s.missBy.shelf);
    out.stockMiss.push(s.missBy.stock);
    out.priceMiss.push(s.missBy.price);
    out.customers.push(s.customers);
    out.fees.push(s.fees);
    out.inv.push(stall.items.reduce((v, it) => v + it.stock * COST.get(it.item_id), 0)); // 저녁 재고를 들여온 값으로
    if (process.env.SIM_TRACE) console.log(`  ${s.day}일 돈${stall.money} 이익${s.profit} 손님${s.customers} 허탕 재고${s.missBy.stock}·값${s.missBy.price}·진열${s.missBy.shelf} 인기${s.trend} 채움${JSON.stringify(stall.last.slots.restock.ids)} 두상자${JSON.stringify(stall.last.slots.best.ids)} 할인${JSON.stringify((stall.last.slots.discount||{}).ids||[])} 진열${JSON.stringify((stall.last.slots.display||{}).ids||"기본")} 재고${stall.items.map((i) => i.stock).join(",")} 성장${stall.upgrades.length}`);
  }
  out.r15Day = applied.has("r15") ? applied.get("r15") : null;
  out.money = stall.money;
  return out;
}

// [from, to) 날들의 재고 값 포함 하루 평균 이익
function withInv(r, from, to) {
  const before = from > 0 ? r.inv[from - 1] : r.inv0;
  return mean(r.profits.slice(from, to)) + (r.inv[to - 1] - before) / (to - from);
}
const firstUp = (r) => { const v = Object.values(r.upgrades); return v.length ? Math.min(...v) : Infinity; };
const allUp = (r) => (Object.keys(r.upgrades).length === UPGRADES.length ? Math.max(...Object.values(r.upgrades)) : Infinity);

/** 씨앗들 × 학습자 모습 → 판정에 쓸 숫자 */
export async function collect({ seeds = 12, days = 40 } = {}) {
  const S = Array.from({ length: seeds }, (_, i) => i + 1);
  const runs = {};
  const PROFILES = ["start", ...GOOD_K.map((k) => `k${k}`), "all", "full"];
  for (const p of PROFILES) runs[p] = [];
  for (const seed of S) for (const p of PROFILES) runs[p].push(await simulate({ profile: p, seed, days }));
  const stats = { seeds, days, raw: {} };
  const sum = (rs) => ({ profit: median(rs.map((r) => mean(r.profits))), miss: median(rs.map((r) => mean(r.misses))),
    total: median(rs.map((r) => mean(r.shelf) + mean(r.stockMiss) + mean(r.priceMiss))),
    shelf: median(rs.map((r) => mean(r.shelf))), stock: median(rs.map((r) => mean(r.stockMiss))), price: median(rs.map((r) => mean(r.priceMiss))),
    customers: median(rs.map((r) => mean(r.customers))),
    fees: median(rs.map((r) => mean(r.fees))), lo: Math.min(...rs.map((r) => mean(r.profits))), hi: Math.max(...rs.map((r) => mean(r.profits))) });
  for (const p of ["start", "all"]) stats[p] = sum(runs[p]);
  stats.ks = GOOD_K.map((k) => ({ k, ...sum(runs[`k${k}`]) }));
  const best = stats.ks.reduce((a, b) => (b.profit > a.profit ? b : a));
  stats.good = { ...best };
  stats.full = {
    ...sum(runs.full),
    firstUp: median(runs.full.map(firstUp)), allUp: median(runs.full.map(allUp)),
    firstUps: runs.full.map(firstUp), allUps: runs.full.map(allUp),
    r15Day: median(runs.full.map((r) => r.r15Day ?? Infinity)),
    upDays: Object.fromEntries(UPGRADES.map((u) => [u.id, median(runs.full.map((r) => r.upgrades[u.id] ?? Infinity))])),
  };
  // 칸마다 효과
  stats.slots = {};
  for (const slot of [...EFFECT_SLOTS, "report"]) {
    const dP = [], dC = [], dM = [], fromDays = [], dPpre = [], dMpre = [];
    for (let i = 0; i < S.length; i++) {
      const on = runs.full[i];
      const offR = await simulate({ profile: "full", seed: S[i], days, timeline: on.timeline, off: slot });
      // 그 칸이 처음 켜진 날부터 끝까지만 비교(늦게 열리는 칸이 앞날들에 묽어지지 않게)
      let from = on.timeline.findIndex((t) => t.slots[slot] && t.slots[slot].on === true);
      if (from < 0) from = days;
      dP.push(withInv(on, from, days) - withInv(offR, from, days));
      dC.push(mean(on.profits.slice(from)) - mean(offR.profits.slice(from)));
      dM.push(mean(offR.misses.slice(from)) - mean(on.misses.slice(from)));
      fromDays.push(from + 1);
      // 넓은 진열대를 사기 전 날들만(그 뒤엔 물건 8가지가 다 올라가 진열하기가 할 일이 없음) — 고침 2
      const to = on.upgrades.shelf ? on.upgrades.shelf - 1 : days;
      if (to > from) {
        dPpre.push(withInv(on, from, to) - withInv(offR, from, to));
        dMpre.push(mean(offR.misses.slice(from, to)) - mean(on.misses.slice(from, to)));
      }
    }
    stats.slots[slot] = { dProfit: median(dP), dCash: median(dC), dMiss: median(dM), from: median(fromDays),
      pre: dPpre.length ? { dProfit: median(dPpre), dMiss: median(dMpre), runs: dPpre.length } : null };
  }
  // HAVING 기준
  stats.having = [];
  for (const n of HAVING_TRY) {
    const ps = [], cs = [], ms = [];
    for (const seed of S) {
      const r = await simulate({ profile: "full", seed, days: days + HAVING_WINDOW, having: n });
      if (r.r15Day == null || r.r15Day - 1 + HAVING_WINDOW > r.profits.length) continue;
      const from = r.r15Day - 1; // 날 번호 → 배열 위치
      ps.push(withInv(r, from, from + HAVING_WINDOW));
      cs.push(mean(r.profits.slice(from, from + HAVING_WINDOW)));
      ms.push(mean(r.misses.slice(from, from + HAVING_WINDOW)));
    }
    stats.having.push({ n, profit: ps.length ? median(ps) : NaN, cash: median(cs), miss: median(ms), runs: ps.length });
  }
  const r15 = REQUESTS.find((r) => r.id === "r15");
  stats.havingPick = r15.solution.best.parts.full.at(-1).n;
  return stats;
}

const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
const f2 = (v) => (Number.isFinite(v) ? (v > 0 ? "+" : "") + v.toFixed(2) : "없음");
const f1 = (v) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toString() : "없음");

/** 숫자 → 판정 줄 [{ok, text}] */
export function judge(st) {
  const L = [];
  const add = (ok, text) => L.push({ ok, text: `${ok ? "OK" : "NG"} ${text}` });
  add(st.good.profit - st.start.profit >= TARGETS.startGap,
    `시작 질의(stock<1) 하루 이익 ${f1(st.start.profit)}냥이 좋은 조건 ${f1(st.good.profit)}냥보다 ${TARGETS.startGap}냥 이상 적음(차이 ${f1(st.good.profit - st.start.profit)})`);
  // 허탕은 모든 까닭(진열·재고·값)을 센다: 기본 진열은 재고 0 물건을 내려 다 팔린 손님이 「진열 허탕」으로 잡히므로
  add(st.start.total >= TARGETS.startMiss * st.good.total,
    `시작 질의 허탕(모든 까닭) ${f1(st.start.total)}개/일 ≥ 좋은 조건 ${f1(st.good.total)}의 ${TARGETS.startMiss}배 (재고 허탕만: ${f1(st.start.stock)} vs ${f1(st.good.stock)})`);
  add(inBand(st.good.profit, TARGETS.good), `좋은 조건(가장 좋은 stock<${st.good.k}) 하루 이익 ${f1(st.good.profit)}냥 (목표 ${TARGETS.good.join("~")})`);
  add(st.all.profit < st.good.profit, `다 채우기(stock<100) ${f1(st.all.profit)}냥 < 좋은 조건 ${f1(st.good.profit)}냥`);
  add(inBand(st.full.firstUp, TARGETS.firstUp), `첫 성장 ${f1(st.full.firstUp)}일째 (목표 ${TARGETS.firstUp.join("~")})`);
  add(inBand(st.full.allUp, TARGETS.allUp), `성장 5개 ${f1(st.full.allUp)}일째 (목표 ${TARGETS.allUp.join("~")})`);
  for (const [slot, e] of Object.entries(st.slots)) {
    if (slot === "report") continue;
    const ok = (x) => !!x && (x.dProfit >= EFFECT_EPS.profit || x.dMiss >= EFFECT_EPS.miss);
    const base = `칸 ${slot} 효과(켬 − 끔): 이익(재고 값 포함) ${f2(e.dProfit)}냥/일 · 재고·값 허탕 ${f2(-e.dMiss)}개/일 (기준: 이익 +${EFFECT_EPS.profit} 또는 허탕 −${EFFECT_EPS.miss} 이상)`;
    if (ok(e) || slot !== "display") add(ok(e), base);
    else add(ok(e.pre), `${base} → 진열하기는 넓은 진열대를 사기 전 날들로 판정(그 뒤엔 물건이 다 올라감): 이익 ${e.pre ? f2(e.pre.dProfit) : "없음"}냥/일 · 재고·값 허탕 ${e.pre ? f2(-e.pre.dMiss) : "없음"}개/일`);
  }
  if (st.having && st.having.length >= 3) {
    const h = st.having;
    const best = h.reduce((a, b) => (b.profit > a.profit ? b : a));
    const ends = [h[0], h[h.length - 1]];
    const peak = best !== ends[0] && best !== ends[1] && ends.every((e) => best.profit - e.profit > 1);
    add(peak, `HAVING 봉우리: 가장 좋은 기준 ${best.n}(${f1(best.profit)}냥), 양 끝 ${ends.map((e) => `${e.n}:${f1(e.profit)}`).join(" · ")}`);
    if (st.havingPick != null) {
      const pick = h.find((x) => x.n === st.havingPick);
      add(!!pick && best.profit - pick.profit <= 2, `r15 정답 기준 ${st.havingPick}가 봉우리 근처(${pick ? f1(pick.profit) : "-"}냥, 가장 좋음 ${f1(best.profit)}냥)`);
    }
  }
  return L;
}

function print(st) {
  console.log(`가게 시뮬레이션 — 씨앗 ${st.seeds}개 × ${st.days}일 (중앙값)`);
  console.log("학습자      하루이익  (가장 낮음~높음)  손님/일  허탕/일 진열·재고·값  수레 삯/일");
  const row = (name, s) => console.log(`${name.padEnd(10)} ${f1(s.profit).padStart(7)}  (${f1(s.lo)}~${f1(s.hi)})  ${f1(s.customers).padStart(6)}  ${f1(s.shelf)}·${f1(s.stock)}·${f1(s.price)}  ${f1(s.fees).padStart(6)}`);
  row("start", st.start);
  for (const x of st.ks || []) row(`stock<${x.k}${x.k === st.good.k ? "★" : ""}`, x);
  row("all", st.all);
  row("full", st.full);
  const fu = st.full;
  console.log(`full    ${f1(fu.profit).padStart(8)}  허탕 ${f1(fu.miss)}/일 · 첫 성장 ${f1(fu.firstUp)}일 · 성장 5개 ${f1(fu.allUp)}일 · r15 ${f1(fu.r15Day)}일`);
  console.log(`  성장 산 날: ${Object.entries(fu.upDays).map(([k, v]) => `${k} ${f1(v)}`).join(" · ")}`);
  console.log(`  씨앗별 첫 성장: ${fu.firstUps.map(f1).join(",")} / 성장 5개: ${fu.allUps.map(f1).join(",")}`);
  console.log("칸 끔 비교(켬 − 끔, 그 칸이 켜진 날부터 끝까지 하루 평균): 칸  켜진 날  이익(재고 값 포함)  이익(돈)  재고·값 허탕 줄임");
  for (const [slot, e] of Object.entries(st.slots)) console.log(`  ${slot.padEnd(9)} ${f1(e.from).padStart(4)}  ${f2(e.dProfit).padStart(8)}  ${f2(e.dCash).padStart(8)}  ${f2(e.dMiss).padStart(7)}${e.pre ? `   넓은 진열대 전: ${f2(e.pre.dProfit)} · ${f2(e.pre.dMiss)} (${e.pre.runs}판)` : ""}${slot === "report" ? "  (판정 제외: 가게에 영향 없음)" : ""}`);
  console.log(`HAVING 기준(r15를 넣은 날부터 ${HAVING_WINDOW}일 하루 평균): 기준  이익(재고 값 포함)  이익(돈)  재고·값 허탕`);
  for (const h of st.having) console.log(`  >= ${String(h.n).padStart(2)}  ${f1(h.profit).padStart(6)}냥  ${f1(h.cash).padStart(6)}냥  ${f1(h.miss).padStart(5)}  (${h.runs}판)${h.n === st.havingPick ? "  ← r15 정답" : ""}`);
}

async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
  const t0 = Date.now();
  const st = await collect({ seeds: arg("--seeds", 12), days: arg("--days", 40) });
  print(st);
  const lines = judge(st);
  for (const l of lines) console.log(l.text);
  const bad = lines.filter((l) => !l.ok).length;
  console.log(`판정 ${lines.length - bad}/${lines.length} OK · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  if (process.argv.includes("--json")) console.log(JSON.stringify(st));
  process.exit(bad ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
