// 설정 「저장 가져오기」(작업 16, 작업 10 넘김): 리아와 파이썬! 저장은 칸 이름이 많이 겹쳐(completed_lessons·xp·streak …)
// 「아는 칸이 하나라도 있으면 받기」로는 걸러지지 않는다. 두억이 표시(yeopjeon·saveVer)와 레슨 id 모양을 본다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkImport, newSave, SAVE_VER } from "../../src/save.js";

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
  assert.match(r.msg, /리아와 파이썬!/);
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
