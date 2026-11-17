// v0.3.2 개발자 모드(검수용): 따로 저장 칸, 학습 기록은 그대로, 잠금 판정은 한 곳(isDev)으로
import { test } from "node:test";
import assert from "node:assert/strict";
import { SAVE_KEY, newSave, migrate } from "../../src/save.js";
import { RESUME_KEY, readResume, writeResume, clearResume } from "../../src/resume.js";
import {
  DEV_FLAG_KEY, DEV_SAVE_KEY, DEV_RESUME_KEY, keysFor, readDevFlag, writeDevFlag, loadSlot, storeSlot, setDevMode, markDev,
} from "../../src/devmode.js";
import { isDev, DEV_MARK, gateCompleted, mainLessonIds } from "../../src/devgate.js";
import { curriculum, lessonStateOf, courseJustFinished } from "../../src/curriculum.js";
import { advancedState } from "../../src/advanced.js";
import { pickDaily, dailyStatus, ensureDaily } from "../../src/daily.js";
import { stallPassedFor, stallOpen, newStall } from "../../src/stall/state.js";
import { openSlots, openCards, fullOpen } from "../../src/stall/slots.js";
import { currentRequest } from "../../src/stall/requests.js";
import { checkBadges } from "../../src/badges.js";
import { SLOTS, CARDS, REQUESTS } from "../../data/stall.js";

// 모든 읽기·쓰기를 적어 두는 가짜 저장소
function spyStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  const log = [];
  return {
    m, log,
    getItem: (k) => { log.push(["get", k]); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { log.push(["set", k]); m.set(k, String(v)); },
    removeItem: (k) => { log.push(["del", k]); m.delete(k); },
  };
}

// 17장 × 본 과정 5 + 심화(1~6장에 3개씩 = 18개, 실제 과정과 같음)
const ch = (n) => ({
  id: n, title: `${n}장`,
  lessons: [1, 2, 3, 4, 5].map((k) => ({ id: `${n}-${k}`, chapter: n, title: `레슨 ${n}-${k}`, concepts: [`c${n}`], isExam: k === 5, hasBuild: true })),
  advanced: n <= 6 ? [1, 2, 3].map((k) => ({ id: `${n}-A${k}`, chapter: n, title: `심화 ${n}-A${k}` })) : [],
  templates: [1, 2, 3].map((k) => ({ id: `${n}-T${k}` })),
});
const INDEX = Array.from({ length: 17 }, (_, i) => ch(i + 1));
const MAIN = INDEX.flatMap((c) => c.lessons.map((l) => l.id));
const ADV = INDEX.flatMap((c) => c.advanced.map((l) => l.id));
const dev = (over = {}) => ({ ...newSave(), ...over, [DEV_MARK]: true });

// ---- 저장 칸 ----
test("키: 개발자 모드 깃발·저장·이어 하기는 학습 기록 키와 따로", () => {
  assert.equal(DEV_FLAG_KEY, "dueogi-sql.dev");
  assert.equal(DEV_SAVE_KEY, `${SAVE_KEY}.dev`);
  assert.equal(DEV_RESUME_KEY, `${RESUME_KEY}.dev`);
  assert.deepEqual(keysFor(false), { save: SAVE_KEY, resume: RESUME_KEY });
  assert.deepEqual(keysFor(true), { save: DEV_SAVE_KEY, resume: DEV_RESUME_KEY });
  assert.equal(new Set([DEV_FLAG_KEY, DEV_SAVE_KEY, DEV_RESUME_KEY, SAVE_KEY, RESUME_KEY]).size, 5);
});

test("깃발: 없으면 꺼짐, 켜면 남고(새로고침 뒤에도), 끄면 지워짐. 저장소가 막혀도 던지지 않음", () => {
  const st = spyStore();
  assert.equal(readDevFlag(st), false);
  assert.equal(writeDevFlag(st, true), true);
  assert.equal(readDevFlag(st), true);
  assert.equal(st.m.get(DEV_FLAG_KEY), "1");
  writeDevFlag(st, false);
  assert.equal(readDevFlag(st), false);
  assert.equal(st.m.has(DEV_FLAG_KEY), false);
  const bad = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } };
  assert.equal(readDevFlag(bad), false);
  assert.equal(writeDevFlag(bad, true), false);
  assert.equal(readDevFlag(null), false);
});

test("loadSlot(켬): 개발자 저장이 없으면 newSave() + 표시, 학습 기록 키는 읽지도 않음", () => {
  const real = JSON.stringify({ ...newSave(), xp: 999, completed_lessons: ["1-1"] });
  const st = spyStore({ [SAVE_KEY]: real });
  const r = loadSlot(st, true);
  assert.equal(r.readFailed, false);
  assert.equal(r.save.xp, 0);
  assert.deepEqual(r.save.completed_lessons, []);
  assert.equal(isDev(r.save), true);
  assert.ok(!st.log.some(([, k]) => k === SAVE_KEY), JSON.stringify(st.log));
});

test("loadSlot(끔): 학습 기록을 읽고 개발자 표시는 없음(혹시 섞여 들어와도 지움)", () => {
  const st = spyStore({ [SAVE_KEY]: JSON.stringify({ ...newSave(), xp: 30, [DEV_MARK]: true }) });
  const r = loadSlot(st, false);
  assert.equal(r.save.xp, 30);
  assert.equal(isDev(r.save), false);
  assert.ok(!(DEV_MARK in r.save));
});

test("storeSlot: 켜 있으면 개발자 키에만 쓰고, 꺼 있으면 표시를 뺀 저장을 학습 기록 키에", () => {
  const st = spyStore();
  assert.equal(storeSlot(st, { ...newSave(), xp: 5 }, true), true);
  assert.ok(st.m.has(DEV_SAVE_KEY) && !st.m.has(SAVE_KEY));
  assert.equal(JSON.parse(st.m.get(DEV_SAVE_KEY))[DEV_MARK], true);
  storeSlot(st, { ...newSave(), xp: 7, [DEV_MARK]: true }, false);
  const real = JSON.parse(st.m.get(SAVE_KEY));
  assert.equal(real.xp, 7);
  assert.ok(!(DEV_MARK in real), "학습 기록에는 개발자 표시가 들어가지 않음");
});

test("markDev: 켬 → 표시, 끔 → 표시 없음. 이미 맞으면 같은 객체, 원본은 그대로", () => {
  const s = newSave();
  assert.equal(markDev(s, false), s);
  const d = markDev(s, true);
  assert.equal(isDev(d), true);
  assert.equal(markDev(d, true), d);
  assert.equal(isDev(markDev(d, false)), false);
  assert.ok(!(DEV_MARK in s));
});

test("migrate는 개발자 표시를 지우지 않는다(가져오기·읽기 뒤 markDev가 칸에 맞춤)", () => {
  assert.equal(isDev(migrate({ xp: 1, yeopjeon: 0, [DEV_MARK]: true })), true);
  assert.equal(isDev(migrate({ xp: 1, yeopjeon: 0 })), false);
  assert.equal(isDev({ [DEV_MARK]: "true" }), false, "참(true)만 개발자 저장");
  assert.equal(isDev(null), false);
});

test("켬 → 활동(레슨·가게 저장, 이어 하기 여러 번) → 끔: 학습 기록·이어 하기 칸은 한 글자도 그대로이고 그동안 손대지 않음", () => {
  // 일부러 공백·모르는 칸이 든 원문(다시 쓰면 모양이 바뀌어 들킴)
  const realText = '{ "saveVer": 1,  "xp": 120, "yeopjeon": 33, "completed_lessons": ["1-1","1-2"], "zz_unknown": {"a": 1} }';
  const resumeText = JSON.stringify({ v: 1, lessonId: "1-3", mode: "lesson", savedAt: 1 });
  const st = spyStore({ [SAVE_KEY]: realText, [RESUME_KEY]: resumeText });

  const before = loadSlot(st, false).save;            // 앱을 연 상태(꺼짐)
  st.log.length = 0;
  let r = setDevMode(st, true);
  assert.equal(readDevFlag(st), true);
  let s = r.save;
  for (let i = 0; i < 5; i++) {
    s = { ...s, xp: s.xp + 10, completed_lessons: [...s.completed_lessons, `${i + 1}-1`] };
    storeSlot(st, s, true);
    s = { ...s, stall: { ...newStall(7), day: i + 2, opened: true } };   // 가게 하루
    storeSlot(st, s, true);
  }
  const { resume } = keysFor(true);
  writeResume(st, { v: 1, lessonId: "17-3", savedAt: 2 }, resume);
  readResume(st, { key: resume, now: 3 });
  writeResume(st, { v: 1, lessonId: "17-4", savedAt: 4 }, resume);
  clearResume(st, resume);
  assert.ok(!st.log.some(([, k]) => k === SAVE_KEY || k === RESUME_KEY), "켜 있는 동안 학습 기록 키를 읽거나 쓰지 않음: " + JSON.stringify(st.log));

  r = setDevMode(st, false);
  assert.equal(st.m.get(SAVE_KEY), realText, "학습 기록 원문 그대로");
  assert.equal(st.m.get(RESUME_KEY), resumeText, "이어 하기 원문 그대로");
  assert.deepEqual(r.save, before, "끄면 학습 기록을 그대로 다시 읽음");
  assert.equal(isDev(r.save), false);
  assert.equal(readDevFlag(st), false);
  assert.ok(st.m.has(DEV_SAVE_KEY), "개발자 저장은 남겨 둠");
});

test("이어 하기: 키를 주지 않으면 학습 기록 칸(기존 동작 그대로)", () => {
  const st = spyStore();
  writeResume(st, { v: 1, lessonId: "1-1", savedAt: 1 });
  assert.ok(st.m.has(RESUME_KEY) && !st.m.has(DEV_RESUME_KEY));
  clearResume(st);
  assert.ok(!st.m.has(RESUME_KEY));
});

test("개발자 저장은 껐다 켜도 이어짐", () => {
  const st = spyStore();
  let s = setDevMode(st, true).save;
  storeSlot(st, { ...s, xp: 50 }, true);
  setDevMode(st, false);
  s = setDevMode(st, true).save;
  assert.equal(s.xp, 50);
  assert.equal(isDev(s), true);
});

test("깨진 개발자 저장은 개발자 키 옆에 남기고 새로 시작(학습 기록 쪽 .broken은 건드리지 않음)", () => {
  const st = spyStore({ [DEV_SAVE_KEY]: "{oops" });
  const r = loadSlot(st, true);
  assert.equal(r.save.xp, 0);
  assert.equal(st.m.get(`${DEV_SAVE_KEY}.broken`), "{oops");
  assert.ok(![...st.m.keys()].some((k) => k.startsWith(`${SAVE_KEY}.broken`)));
});

// ---- 잠금 판정 (isDev 한 곳) ----
test("gateCompleted: 개발자 저장이면 본 과정 85개 모두, 아니면 실제 기록. 저장 자체는 그대로", () => {
  assert.equal(mainLessonIds(INDEX).length, 85);
  const s = dev({ completed_lessons: ["2-1"] });
  const g = gateCompleted(s, INDEX);
  assert.equal(new Set(g).size, 85);
  assert.ok(MAIN.every((id) => g.includes(id)));
  assert.deepEqual(s.completed_lessons, ["2-1"]);
  assert.deepEqual(gateCompleted({ ...newSave(), completed_lessons: ["1-1"] }, INDEX), ["1-1"]);
});

test("lessonStateOf: 개발자 저장은 본 과정 85개·심화 18개 모두 열림(끝낸 것은 완료), 학습 기록은 순서대로", () => {
  const d = dev({ completed_lessons: ["1-1"], grading_results: { "1-1": { perfect: true } } });
  assert.equal(ADV.length, 18);
  assert.equal(lessonStateOf(INDEX, d, "1-1"), "perfect");
  for (const id of MAIN.slice(1)) assert.equal(lessonStateOf(INDEX, d, id), "open", id);
  for (const id of ADV) assert.equal(lessonStateOf(INDEX, d, id), "open", id);
  assert.equal(advancedState(INDEX, d, "6-A3"), "open");
  const real = { ...newSave(), completed_lessons: ["1-1"] };
  assert.equal(lessonStateOf(INDEX, real, "1-2"), "open");
  assert.equal(lessonStateOf(INDEX, real, "1-3"), "locked");
  assert.equal(lessonStateOf(INDEX, real, "17-5"), "locked");
  assert.equal(lessonStateOf(INDEX, real, "6-A3"), "locked");
  assert.equal(lessonStateOf(INDEX, real, "99-1"), "locked");
});

test("curriculum(설정 학습 내용): 개발자 저장이면 잠김 없음, 완료 개수는 실제 기록", () => {
  const c = curriculum({ chapters: INDEX, completed: ["1-1"], currentId: "1-2", dev: true });
  const all = c.chapters.flatMap((x) => [...x.lessons, ...x.advanced]);
  assert.equal(all.filter((l) => l.status === "locked").length, 0);
  assert.equal(c.done, 1);
  assert.equal(c.advDone, 0);
  const r = curriculum({ chapters: INDEX, completed: ["1-1"], currentId: "1-2" });
  assert.ok(r.chapters.flatMap((x) => x.lessons).some((l) => l.status === "locked"));
});

test("매일 도전: 개발자 저장이면 1장을 안 끝내도 열리고 모든 장에서 고름", () => {
  const today = "2026-11-18";
  const d = dev();
  const picks = pickDaily(INDEX, d, today);
  assert.ok(picks && picks.length === 3, JSON.stringify(picks));
  const s = ensureDaily(d, today, INDEX);
  assert.notEqual(dailyStatus(s, today, INDEX).state, "locked");
  // 여러 날 고르면 1장 밖의 장도 나옴
  const chs = new Set();
  for (let k = 1; k <= 20; k++) for (const p of pickDaily(INDEX, d, `2026-12-${String(k).padStart(2, "0")}`)) chs.add(p.chapter);
  assert.ok([...chs].some((n) => n > 9), [...chs]);
  assert.equal(pickDaily(INDEX, newSave(), today), null, "학습 기록은 1장 전에는 잠김");
});

test("가게: 개발자 저장이면 입구·칸 6개·카드 전부·전체 조립 열림, 의뢰는 장 기다림 없음", () => {
  const p = stallPassedFor(dev(), INDEX);
  assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: 17 }, (_, i) => i + 1));
  assert.equal(stallOpen(p), true);
  assert.equal(openSlots(p).length, SLOTS.length);
  assert.equal(openCards(p).length, CARDS.length);
  assert.equal(fullOpen(p), true);
  const last = REQUESTS[REQUESTS.length - 1];
  const st = { ...newStall(1), order: { idx: REQUESTS.length - 1, done: REQUESTS.slice(0, -1).map((r) => r.id), progress: {} } };
  assert.deepEqual(currentRequest(st, p), { req: last, waiting: false });
  const real = stallPassedFor({ ...newSave(), completed_lessons: ["1-5", "2-5"] }, INDEX);
  assert.equal(stallOpen(real), false);
  assert.deepEqual([...real].sort(), [1, 2]);
});

test("배지·과정 완주는 실제로 한 것만 센다(개발자 저장이라도)", () => {
  const d = dev({ completed_lessons: ["1-1"], stats: { ...newSave().stats, lessons: 1 } });
  const got = checkBadges(d, { advancedIds: ADV });
  assert.deepEqual(got, ["first_query"], "끝낸 1-1만: 장 묶음·심화 배지는 없음");
  assert.equal(courseJustFinished({ chapters: INDEX, completed: ["1-1"], firstTime: true, lessonId: "1-1" }), false);
});
