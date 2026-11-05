import { test } from "node:test";
import assert from "node:assert/strict";
import { current, answer } from "../../src/lessonflow.js";
import { newSession, touchResult, buildPass, buildWrong, buildHint, finishInfo } from "../../src/session.js";
import { finishLesson } from "../../src/finish.js";
import { pickQuests } from "../../src/quests.js";
import { newSave } from "../../src/save.js";

const L = {
  id: "1-1", chapter: 1, cards: [],
  items: [
    { type: "choice", concept: "select", options: ["a", "b"], answer: 0 },
    { type: "build", id: "b1", concept: "where", cards: ["SELECT", "1"], extra: [], tables: [], hints: ["h1", "h2"] },
  ],
};

// 퀘스트 「힌트 없이 통과」·「오류를 고쳐 통과」가 둘 다 뽑히는 날을 찾는다(뽑기는 날짜로 정해짐)
function dayWith(ids) {
  for (let d = 1; d <= 400; d++) {
    const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000);
    const day = dt.toISOString().slice(0, 10);
    const picked = pickQuests(day, newSave());
    if (ids.every((id) => picked.includes(id))) return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 10);
  }
  throw new Error("no day");
}

function play({ hint = false, wrong = false, hadError = false }) {
  const S = newSession(L);
  let cur = current(S.flow, L);
  touchResult(S, cur, true, false);
  S.flow = answer(S.flow, true);
  cur = current(S.flow, L);
  assert.equal(cur.item.type, "build");
  if (hint) buildHint(S, cur);
  if (wrong) buildWrong(S, cur);
  const r = buildPass(S, cur, { hintUsed: hint, solutionSeen: false, hadError, firstSubmit: !wrong });
  S.flow = answer(S.flow, r.flowCorrect);
  assert.equal(current(S.flow, L).kind, "done");
  const now = dayWith(["q_hintfree", "q_fixerr"]);
  return { S, r, ...finishLesson(newSave(), { ...finishInfo(S, L, false), nextLessonId: "1-2", nextChapter: 1 }, now) };
}

test("session buildPass counts hintfree", () => {
  const a = play({});
  assert.deepEqual(a.S.build, { passed: true, hintUsed: false, solutionSeen: false, fixedError: false });
  assert.equal(a.r.clean, true);
  assert.equal(a.r.flowCorrect, true);
  assert.equal(a.result.hintFreeWrite, true);
  assert.equal(a.save.stats.hintfree, 1);
  assert.equal(a.save.quests.progress.q_hintfree, 1);
  assert.ok(!a.save.quests.progress.q_fixerr);

  const b = play({ hint: true });
  assert.equal(b.S.build.hintUsed, true);
  assert.equal(b.result.hintFreeWrite, false);
  assert.equal(b.save.stats.hintfree, 0);
  assert.ok(!b.save.quests.progress.q_hintfree, "힌트를 쓰면 빠짐");
  assert.ok(b.S.marks.some(([c, o]) => c === "where" && o === "hint"));
});

test("session buildPass after an error counts fixed_error_pass", () => {
  const a = play({ wrong: true, hadError: true });
  assert.equal(a.S.build.fixedError, true);
  assert.equal(a.r.flowCorrect, false, "첫 제출이 아니면 흐름에서는 첫 시도 정답이 아님");
  assert.equal(a.save.quests.progress.q_fixerr, 1);
  assert.equal(a.save.quests.progress.q_hintfree, 1, "틀렸어도 힌트 없이 통과");
  assert.ok(a.S.marks.some(([c, o]) => c === "where" && o === "wrong"));
});
