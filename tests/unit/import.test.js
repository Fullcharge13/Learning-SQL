// 설정 「저장 가져오기」(작업 16, 작업 10 넘김): 리아와 파이썬! 저장은 칸 이름이 많이 겹쳐(completed_lessons·xp·streak …)
// 「아는 칸이 하나라도 있으면 받기」로는 걸러지지 않는다. 두억이 표시(yeopjeon·saveVer)와 레슨 id 모양을 본다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkImport, newSave, migrate, SAVE_VER, IMPORT_MAX_CHAPTER } from "../../src/save.js";

// 리아 v0.9 내보내기 모양(같은 사용자의 다른 앱, 같은 주소)
const RIA = {
  saveVer: 5, current_chapter: 3, current_lesson: "3-2", completed_lessons: ["1-1", "1-2", "2-1"],
  submission_logs: [], grading_results: {}, weak_concepts: { print: 1 }, review_queue: ["slice"],
  xp: 340, bytes: 120, streak: { days: 4, best: 6, lastGoalDate: null, todayDate: null, todayXp: 0 },
  freezes: 1, badges: [], outfits: ["basic"], outfit: "basic", settings: { sound: true, dailyGoal: 20, name: "" },
};

test("checkImport accepts our own export (newSave and a played save)", () => {
  assert.deepEqual(checkImport(newSave()), { ok: true });
  const played = { ...newSave(), completed_lessons: ["1-1", "1-2", "17-5", "3-A1"], xp: 90, yeopjeon: 40 };
  assert.deepEqual(checkImport(JSON.parse(JSON.stringify(played))), { ok: true });
});

test("checkImport rejects a 리아와 파이썬! save with a friendly Korean message", () => {
  const r = checkImport(RIA);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "ria");
  assert.match(r.msg, /다른 앱의 저장/);   // 화면 글자에 「리아」는 쓰지 않는다(badges.test.js no ria strings)
  assert.match(r.msg, /두억이와 SQL!/);
  // bytes만 지우고 yeopjeon이 없어도 리아 쪽(두억이 표시 없음)
  const { bytes, ...noBytes } = RIA;
  assert.equal(checkImport({ ...noBytes, saveVer: 1 }).reason, "ria");
  // yeopjeon을 붙여도 bytes가 있으면 섞인 파일
  assert.equal(checkImport({ ...RIA, saveVer: 1, yeopjeon: 0 }).reason, "ria");
});

test("checkImport rejects a save from a newer app version", () => {
  const r = checkImport({ ...newSave(), saveVer: SAVE_VER + 1 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "newer");
  assert.match(r.msg, /새 판/);
});

test("checkImport rejects shapes that are not a dueogi save", () => {
  for (const raw of [null, 3, "x", [], {}, { hello: 1 }, { saveVer: "1", yeopjeon: 0 }, { saveVer: 1, yeopjeon: "많이" },
    { saveVer: 0, yeopjeon: 0 }, { saveVer: 1.5, yeopjeon: 0 }]) {
    const r = checkImport(raw);
    assert.equal(r.ok, false, JSON.stringify(raw));
    assert.ok(r.msg && /저장/.test(r.msg), JSON.stringify(r));
  }
  // 레슨 id가 SQL 레슨 모양(장 1~17, 레슨 1~5 또는 심화 A1~)이 아님
  for (const bad of [["1-1", "py-3"], ["18-1"], ["1-6"], [7], ["0-1"]]) {
    const r = checkImport({ ...newSave(), completed_lessons: bad });
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.equal(r.reason, "lessons", JSON.stringify(bad));
  }
});

// 작업 17(작업 16 넘김): 가져오기의 레슨 id 범위(IMPORT_MAX_CHAPTER, 레슨 번호 1~5)는 손으로 적은 값이다.
// 커리큘럼이 커지면(18장, 장마다 6레슨 …) 이 시험이 먼저 실패해 값을 고치게 한다.
test("import lesson-id range covers the real curriculum (fails if the course outgrows it)", async () => {
  const { readdirSync } = await import("node:fs");
  const dir = new URL("../../data/lessons/", import.meta.url);
  const files = readdirSync(dir).filter((f) => /^ch\d+\.js$/.test(f));
  const ids = [];
  let maxChapter = 0;
  for (const f of files) {
    const m = await import(new URL(f, dir).href);
    maxChapter = Math.max(maxChapter, m.CHAPTER.id);
    for (const l of [...m.LESSONS, ...(Array.isArray(m.ADVANCED) ? m.ADVANCED : [])]) ids.push(l.id);
  }
  assert.equal(IMPORT_MAX_CHAPTER, maxChapter, "IMPORT_MAX_CHAPTER must equal the last chapter number");
  const r = checkImport({ ...newSave(), completed_lessons: ids });
  assert.deepEqual(r, { ok: true }, "every real lesson id must be importable");
});

// migrate()는 saveVer가 없으면 첫 판(1)으로 본다. 가져오기도 같게: 엽전(yeopjeon)이 있으면 saveVer 없이도 받는다.
test("checkImport agrees with migrate on a missing saveVer when yeopjeon is present", () => {
  const { saveVer, ...noVer } = newSave();
  assert.deepEqual(checkImport(noVer), { ok: true });
  // 표시가 하나도 없으면 여전히 거절
  const { yeopjeon, ...neither } = noVer;
  assert.equal(checkImport(neither).ok, false);
});

test("a save carrying a stray bytes key (old dev save) round-trips: migrate drops bytes, export → import is accepted", () => {
  const dev = { ...newSave(), completed_lessons: ["1-1"], xp: 30, yeopjeon: 12, bytes: 7 };
  const s = migrate(JSON.parse(JSON.stringify(dev)));
  assert.equal(Object.hasOwn(s, "bytes"), false);
  const exported = JSON.parse(JSON.stringify(s));   // 설정 「저장 내보내기」가 쓰는 JSON
  assert.deepEqual(checkImport(exported), { ok: true });
  assert.deepEqual(migrate(exported).completed_lessons, ["1-1"]);
  assert.equal(migrate(exported).yeopjeon, 12);
});
