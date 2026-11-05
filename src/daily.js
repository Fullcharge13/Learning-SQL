// 매일 도전 (리아 v0.9 작업 2, 판정 C53·C54 → 두억이 v0.1 작업 11, 설계 §7). 화면 없는 함수만(buildDailyLesson만 실행기를 씀).
//
// - 열림: 1장 본 과정 레슨을 모두 끝낸 뒤.
// - 하루 3문제: 터치 2(본 과정을 다 끝낸 장의 「틀」 TEMPLATES에서, 씨앗 0~99, 문제는 src/template.js가 SQL을 돌려 만듦)
//   + 카드 조립 1(끝낸 본 과정 레슨 중 build 문제가 있는 레슨(목록의 hasBuild)의 build 문제 그대로, dailyBuildItem).
//   복습 목록(review_queue) 개념이 든 장·레슨은 3배 자주.
// - 같은 날·같은 학습 기록 → 같은 3문제(날짜 + 끝낸 레슨 목록으로 정하는 난수). 고른 문제는 저장 daily에 고정해
//   그날 레슨을 더 끝내도 바뀌지 않는다.
// - 저장 칸 daily = { date, picks, done, streak, best, last_done_date } (없으면 newDaily()).
//   picks: [{ kind: "tpl", id: "1-T2", chapter: 1, seed }, …, { kind: "build", lesson: "2-3", chapter: 2 }]
//   done: 푼 문제 번호(picks의 자리). 문제마다 바로 기록 → 그날 안에는 남은 문제부터 이어서.
// - 보상(3문제 끝): XP 15(하루 목표·연속 기록·이정표·XP 퀘스트에 그대로) · 엽전 10. 도전 연속(따로 셈)이
//   7의 배수인 날 +20엽전. 레슨 퀘스트·진도·레슨 수에는 세지 않는다.
import { earnXp, markConcept, isDate } from "./rules.js";
import { ensureQuests, tick } from "./quests.js";
import { checkBadges } from "./badges.js";
import { localDate } from "./today.js";
import { hashStr, mulberry32, TEMPLATE_SEEDS, makeTemplateItem, engineError } from "./template.js";

export const DAILY_XP = 15;
export const DAILY_YEOPJEON = 10;
export const DAILY_BONUS_EVERY = 7;
export const DAILY_BONUS_YEOPJEON = 20;
export const DAILY_TOUCH = 2;
export const WEAK_WEIGHT = 3;

export function newDaily() {
  return { date: null, picks: [], done: [], streak: 0, best: 0, last_done_date: null };
}

// ---- 날짜 ----
const DAY_MS = 86400000;
const dayNum = (d) => { const [y, m, dd] = d.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, dd) / DAY_MS); };
const prevDay = (d) => new Date((dayNum(d) - 1) * DAY_MS).toISOString().slice(0, 10);

// ---- 저장 정리(save.js migrate가 부름) ----
const nonNegInt = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const TPL_ID = /^[1-9]\d*-T[1-9]\d*$/;
const LESSON_ID = /^[1-9]\d*-[1-9]\d*$/;

function goodPick(p) {
  if (!isObj(p) || !Number.isInteger(p.chapter) || p.chapter < 1) return false;
  if (p.kind === "tpl") return typeof p.id === "string" && TPL_ID.test(p.id) && Number.isInteger(p.seed) && p.seed >= 0 && p.seed < TEMPLATE_SEEDS;
  if (p.kind === "build") return typeof p.lesson === "string" && LESSON_ID.test(p.lesson);
  return false;
}

/** 저장의 daily 칸을 모양·범위에 맞춘다. 문제 목록이 하나라도 이상하면 목록을 비운다(그날 다시 고름) */
export function cleanDaily(raw) {
  const d = newDaily();
  if (!isObj(raw)) return d;
  d.date = isDate(raw.date) ? raw.date : null;
  const picks = Array.isArray(raw.picks) ? raw.picks : [];
  d.picks = picks.length >= 1 && picks.length <= 3 && picks.every(goodPick)
    ? picks.map((p) => (p.kind === "tpl" ? { kind: "tpl", id: p.id, chapter: p.chapter, seed: p.seed } : { kind: "build", lesson: p.lesson, chapter: p.chapter }))
    : [];
  const done = Array.isArray(raw.done) ? raw.done : [];
  d.done = [...new Set(done.filter((i) => Number.isInteger(i) && i >= 0 && i < Math.max(d.picks.length, 3)))].sort((a, b) => a - b);
  d.streak = nonNegInt(raw.streak);
  d.best = Math.max(nonNegInt(raw.best), d.streak);
  d.last_done_date = isDate(raw.last_done_date) ? raw.last_done_date : null;
  return d;
}

const dailyOf = (save) => (save && isObj(save.daily) ? save.daily : newDaily());

// ---- 열림·후보 ----
const mainDone = (c, doneSet) => (c.lessons || []).length > 0 && c.lessons.every((l) => doneSet.has(l.id));

/** 1장 본 과정 레슨을 모두 끝냈나 */
export function dailyOpen(index, completed) {
  const c1 = (index || []).find((c) => c.id === 1);
  return !!c1 && mainDone(c1, new Set(completed || []));
}

function weightedPick(rng, entries) {
  const total = entries.reduce((a, e) => a + e.w, 0);
  let r = rng() * total;
  for (const e of entries) { r -= e.w; if (r < 0) return e; }
  return entries[entries.length - 1];
}

/** 오늘의 문제 고르기. 열리지 않았거나 틀이 하나도 없으면 null */
export function pickDaily(index, save, today) {
  const completed = (save && save.completed_lessons) || [];
  if (!dailyOpen(index, completed)) return null;
  const doneSet = new Set(completed);
  const weak = new Set((save && save.review_queue) || []);
  const hasWeak = (l) => (l.concepts || []).some((k) => weak.has(k));
  const rng = mulberry32(hashStr(`${today}|${[...doneSet].sort().join(",")}`));

  // 틀: 본 과정을 다 끝낸 장 → 장을 가중치로 고른 뒤 그 장의 틀 하나(같은 틀 두 번 없음)
  let chapters = (index || []).filter((c) => mainDone(c, doneSet) && (c.templates || []).length)
    .map((c) => ({ c, w: c.lessons.some(hasWeak) ? WEAK_WEIGHT : 1, left: c.templates.map((t) => t.id) }));
  if (!chapters.length) return null;
  const picks = [];
  for (let k = 0; k < DAILY_TOUCH && chapters.length; k++) {
    const e = weightedPick(rng, chapters);
    const id = e.left.splice(Math.floor(rng() * e.left.length), 1)[0];
    picks.push({ kind: "tpl", id, chapter: e.c.id, seed: Math.floor(rng() * TEMPLATE_SEEDS) });
    chapters = chapters.filter((x) => x.left.length);
  }
  // 카드 조립: 끝낸 본 과정 레슨 중 build 문제가 있는 레슨(C53), 복습 개념이 든 레슨은 3배
  const lessons = (index || []).flatMap((c) => (c.lessons || []).filter((l) => doneSet.has(l.id) && l.hasBuild)
    .map((l) => ({ l, c, w: hasWeak(l) ? WEAK_WEIGHT : 1 })));
  if (lessons.length) {
    const e = weightedPick(rng, lessons);
    picks.push({ kind: "build", lesson: e.l.id, chapter: e.c.id });
  }
  return picks;
}

/** 오늘의 카드 조립 문제: 레슨의 build 문제 중 하나(날짜·레슨 id로 정함 → 그날은 같은 문제). 없으면 null */
export function dailyBuildItem(lesson, date) {
  const builds = ((lesson && lesson.items) || []).filter((x) => x && x.type === "build");
  if (!builds.length) return null;
  return builds[hashStr(`${date}|${lesson.id}`) % builds.length];
}

// 실행기 자체가 못 돈 결과(SqlRun의 error). 시간 초과는 makeTemplateItem이 engineError로 바꿈(판정 R28)
const ENGINE_ERRORS = new Set(["worker", "load", "timeout"]);

/**
 * 오늘 문제를 실제로 만든다(ui/lesson.js의 매일 도전 화면이 부름). 아직 안 푼 문제만, 다 풀었으면 null.
 * 틀은 장터 데이터베이스에서 SQL을 돌려 보기 표를 만들고, 카드 조립은 끝낸 레슨의 build 문제(dailyBuildItem).
 * 틀 탓으로 못 만든 문제(점검기가 막는 경우)는 skipped(→ 푼 것으로 기록). 실행기 탓(시간 초과·고장·없음)이면 engine 오류를
 * 던진다 → 화면은 「다시 시도」, 푼 기록은 그대로(판정 R28: 시간 초과로 문제를 건너뛰어 그날을 끝내지 않음).
 * @param o { save, getChapter: async n => 장 모듈, sql: { run: async sql => 결과 } }
 */
export async function buildDailyLesson({ save, getChapter, sql }) {
  const d = dailyOf(save);
  const done = new Set(d.done || []);
  const todo = (d.picks || []).map((p, i) => ({ p, i })).filter((x) => !done.has(x.i));
  if (!todo.length) return null;
  const chs = new Map();
  for (const n of [...new Set(todo.map((x) => x.p.chapter))]) chs.set(n, await getChapter(n));
  const run = async (q) => {
    if (!sql || typeof sql.run !== "function") throw engineError("load");
    const r = await sql.run(q);
    if (r && ENGINE_ERRORS.has(r.error)) throw engineError(r.error);
    return r;
  };
  const items = [], skipped = [];
  for (const { p, i } of todo) {
    const ch = chs.get(p.chapter) || {};
    if (p.kind === "tpl") {
      const t = (ch.TEMPLATES || []).find((x) => x.id === p.id);
      const it = t ? await makeTemplateItem(t, p.seed, run) : null;   // 실행기 탓이면 여기서 던짐
      if (it) items.push({ ...it, tag: `${p.chapter}장 새 문제`, dailyIndex: i });
      else skipped.push(i);
    } else {
      const l = (ch.LESSONS || []).find((x) => x.id === p.lesson);
      const b = dailyBuildItem(l, d.date);
      if (b) items.push({ ...b, tag: `${l.id} 다시 조립`, dailyIndex: i });
      else skipped.push(i);
    }
  }
  return { id: "daily", title: "오늘의 도전", cards: [], items, date: d.date, skipped, isDaily: true };
}

/** 저장의 문제가 지금 레슨 목록에 다 있나 */
function picksValid(picks, index) {
  if (!Array.isArray(picks) || !picks.length) return false;
  return picks.every((p) => {
    const c = (index || []).find((x) => x.id === p.chapter);
    if (!c) return false;
    return p.kind === "tpl" ? (c.templates || []).some((t) => t.id === p.id) : c.lessons.some((l) => l.id === p.lesson && l.hasBuild);
  });
}

/** 오늘 문제를 저장에 고정. 이미 오늘 것이면(또는 열리지 않았으면) 같은 저장을 그대로 돌려준다 */
export function ensureDaily(save, today, index) {
  const d = dailyOf(save);
  if (d.date === today && (d.last_done_date === today || picksValid(d.picks, index))) return save;
  const picks = pickDaily(index, save, today);
  if (!picks) return save;
  return { ...save, daily: { ...d, date: today, picks, done: [] } };
}

/** 홈 카드: { state: locked|new|partial|done, done, total, streak(오늘 보이는 도전 연속) } */
export function dailyStatus(save, today, index) {
  const d = dailyOf(save);
  const alive = d.last_done_date === today || (isDate(today) && d.last_done_date === prevDay(today));
  const streak = alive ? d.streak : 0;
  if (!dailyOpen(index, save && save.completed_lessons) || d.date !== today || !d.picks.length) {
    return { state: "locked", done: 0, total: 3, streak };
  }
  const total = d.picks.length;
  const done = d.done.length;
  const state = d.last_done_date === today ? "done" : done === 0 ? "new" : "partial";
  return { state, done: state === "done" ? total : Math.min(done, total), total, streak };
}

/** 레슨 흐름(lessonflow)에서 끝난 문제 번호: 맞힘·세 번 틀림·카드 조립은 제출해 넘어감 */
export function finishedItems(flow) {
  const out = [];
  (flow._items || []).forEach((t, i) => {
    if ((flow.solved || {})[i] || (flow.gaveUp || []).includes(i) || (t === "build" && ((flow.attempts || {})[i] || 0) >= 1)) out.push(i);
  });
  return out;
}

/** 푼 문제(picks 자리 번호)와 새 개념 점수를 저장에 바로 반영. 다른 날의 기록이면 진행은 버림 */
export function recordDaily(save, date, doneIdx, marks = []) {
  let s = save;
  for (const [concept, outcome] of marks || []) if (concept) s = markConcept(s, concept, outcome);
  const d = dailyOf(s);
  if (d.date !== date) return s === save ? { ...save } : s;
  const done = [...new Set([...d.done, ...(doneIdx || []).filter((i) => Number.isInteger(i) && i >= 0 && i < d.picks.length)])].sort((a, b) => a - b);
  return { ...s, daily: { ...d, done } };
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/**
 * 3문제를 끝냈을 때. 보상은 그 도전 날짜(daily.date)에 한 번만.
 * @param info { itemsSolved, logs, accuracy, advancedIds }
 */
export function finishDaily(save, info = {}, now = new Date()) {
  const today = localDate(now);
  const d0 = dailyOf(save);
  const day = isDate(d0.date) ? d0.date : today;
  let s = structuredClone(save);
  s.stats = { lessons: 0, perfect: 0, hintfree: 0, fixed: 0, review_items: 0, items: 0, ...s.stats };
  s.stats.items += num(info.itemsSolved);
  s.submission_logs = [...(s.submission_logs || []), ...(info.logs || [])].slice(-50);
  s.last_active_at = now.toISOString();
  const empty = { mode: "daily", xp: 0, lessonBytes: 0, bonusBytes: 0, questBytes: 0, milestoneBytes: 0, totalBytes: 0,
    finished: [], chest: false, newBadges: [], milestone: null, streakUp: false, streak: s.streak.days,
    dailyStreak: d0.streak, firstTime: false, accuracy: info.accuracy };
  if (d0.last_done_date === day) return { save: s, result: empty };

  const goalBefore = s.streak.lastGoalDate;
  const bytesBefore = num(s.yeopjeon);
  const earned = earnXp(s, DAILY_XP, today);
  s = earned.save;
  const milestoneBytes = num(s.yeopjeon) - bytesBefore;
  const streakUp = s.streak.lastGoalDate === today && goalBefore !== today;

  const streak = d0.last_done_date && isDate(day) && d0.last_done_date === prevDay(day) ? d0.streak + 1 : 1;
  const bonusBytes = streak % DAILY_BONUS_EVERY === 0 ? DAILY_BONUS_YEOPJEON : 0;
  s.yeopjeon = num(s.yeopjeon) + DAILY_YEOPJEON + bonusBytes;
  s.daily = { ...d0, done: d0.picks.map((_, i) => i), streak, best: Math.max(d0.best || 0, streak), last_done_date: day };

  s = ensureQuests(s, today);
  const before = s.yeopjeon;
  const q = tick(s, "xp", today, DAILY_XP);
  s = q.save;
  const questBytes = s.yeopjeon - before;

  const got = checkBadges(s, { hour: now.getHours(), lessonDone: false, advancedIds: info.advancedIds || [] });
  s.badges = [...s.badges, ...got];
  const had = new Set(save.badges || []);
  return {
    save: s,
    result: { ...empty, xp: DAILY_XP, lessonBytes: DAILY_YEOPJEON, bonusBytes, questBytes, milestoneBytes,
      totalBytes: num(s.yeopjeon) - num(save.yeopjeon), finished: q.finished, chest: q.chest,
      newBadges: s.badges.filter((b) => !had.has(b)), milestone: earned.milestone, streakUp, streak: s.streak.days,
      dailyStreak: streak, firstTime: true },
  };
}
