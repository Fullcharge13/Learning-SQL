// 의뢰 게시판: 지금 의뢰 고르기, 목표 판정, 완료 처리. 순수 함수만(입력 가게를 바꾸지 않음).
// 설계 docs/specs/2026-11-11-두억이의-가게-설계.md §4-1. XP는 여기서 주지 않는다 — completed를 받은 화면이 earnXp로 준다.
import { REQUESTS, UNLOCK_CHAPTER } from "../../data/stall.js";

// 고칠 수 있는 허탕: 재고가 바닥났거나(stock) 값이 빈칸(price). 진열 칸이 모자라 생긴 허탕(shelf)은
// 진열대가 물건 수보다 작아 칸으로 없앨 수 없으므로 의뢰 판정에서 세지 않는다(작업 5 결정, 보고서 참고).
function fixableMisses(summary) {
  const by = summary && summary.missBy;
  if (by && typeof by === "object") return (Number(by.stock) || 0) + (Number(by.price) || 0);
  return Number(summary && summary.missed) || 0; // missBy가 없는 옛 기록이면 전체 허탕
}

/** 지금 의뢰: 아직 안 끝낸 첫 의뢰. 그 의뢰의 장까지(3장부터) 다 통과하지 않았으면 waiting. */
export function currentRequest(stall, passed) {
  const done = new Set((stall && stall.order && stall.order.done) || []);
  const req = REQUESTS.find((r) => !done.has(r.id)) || null;
  if (!req) return { req: null, waiting: false };
  for (let ch = UNLOCK_CHAPTER; ch <= req.need; ch++) {
    if (!passed || !passed.has(ch)) return { req, waiting: true };
  }
  return { req, waiting: false };
}

// 하루 보고 비교: 둘 중 하나라도 숫자면 숫자로, 아니면 글자로. 빈 값(null)이 있으면 미달
function sameAnswer(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === "number" || typeof b === "number") {
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-9;
  }
  return String(a) === String(b);
}

/** 오늘 하루(summary)로 의뢰 하나를 판정. 연속 일수는 stall.order.progress[id]에서 이어 센다. */
export function checkRequest(req, stall, summary, reportAnswer) {
  const g = req.goal;
  const prev = Number((stall && stall.order && stall.order.progress && stall.order.progress[req.id]) || 0);
  const once = (ok) => ({ done: ok, progress: { n: ok ? 1 : 0, of: 1 } });
  const streak = (ok, days) => {
    const n = ok ? prev + 1 : 0;
    return { done: n >= days, progress: { n: Math.min(n, days), of: days } };
  };
  switch (g.type) {
    case "slot_ok": {
      const st = stall && stall.slots && stall.slots[g.slot];
      const rest = (summary && summary.rest) || {};
      return once(!!summary && !!st && st.on === true && !Object.hasOwn(rest, g.slot));
    }
    case "no_miss":
      return streak(!!summary && fixableMisses(summary) === 0, g.days);
    case "cart_max":
      return streak(!!summary && fixableMisses(summary) === 0 && Number(summary.fees) <= g.fee, g.days);
    case "profit":
      return once(!!summary && Number(summary.profit) >= g.n);
    case "report":
      return once(!!summary && sameAnswer(summary.report, reportAnswer));
    case "upgrade":
      return once(!!stall && Array.isArray(stall.upgrades) && stall.upgrades.includes(g.id));
    default:
      return once(false);
  }
}

// 판정 결과를 새 가게에 적는다: 완료면 done에 id(한 번만), idx는 다음 차례, progress에서 지움
function apply(stall, req, res) {
  const next = structuredClone(stall);
  next.order = next.order || { idx: 0, done: [], progress: {} };
  next.order.progress = next.order.progress || {};
  next.order.done = Array.isArray(next.order.done) ? next.order.done : [];
  if (res.done) {
    if (!next.order.done.includes(req.id)) next.order.done.push(req.id);
    delete next.order.progress[req.id];
    const done = new Set(next.order.done);
    const i = REQUESTS.findIndex((r) => !done.has(r.id));
    next.order.idx = i < 0 ? REQUESTS.length : i;
    return { stall: next, completed: [req] };
  }
  next.order.progress[req.id] = res.progress.n;
  return { stall: next, completed: [] };
}

/** 하루를 마친 뒤: 지금 의뢰 하나만 판정한다(같은 날 다음 의뢰는 판정하지 않음). */
export function advanceRequests(stall, passed, summary, reportAnswer) {
  const { req, waiting } = currentRequest(stall, passed);
  if (!req || waiting) return { stall, completed: [] };
  return apply(stall, req, checkRequest(req, stall, summary, reportAnswer));
}

/** 성장을 산 직후(화면이 부름): 지금 의뢰가 그 성장이면 장을 열지 않고 바로 완료. */
export function checkUpgradeNow(stall, passed) {
  const { req, waiting } = currentRequest(stall, passed);
  if (!req || waiting || req.goal.type !== "upgrade") return { stall, completed: [] };
  const res = checkRequest(req, stall, null, null);
  return res.done ? apply(stall, req, res) : { stall, completed: [] };
}
