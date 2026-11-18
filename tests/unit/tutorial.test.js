// v0.3.3 첫 사용 튜토리얼의 순수 함수(src/tutorial.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldShowTutorial, TUT_CARDS, TUT_ANSWER, TUT_TEXT, tutorialCheck, tutorialBank, SHOW_ANSWER_AFTER } from "../../src/tutorial.js";
import { newSave } from "../../src/save.js";

test("shown only for a save that has not seen it, never in dev mode", () => {
  assert.equal(shouldShowTutorial(newSave(), { dev: false }), true);
  assert.equal(shouldShowTutorial(newSave(), { dev: true }), false);
  assert.equal(shouldShowTutorial({ ...newSave(), tutorial: "done" }, {}), false);
  assert.equal(shouldShowTutorial({ ...newSave(), tutorial: "skipped" }, {}), false);
  assert.equal(shouldShowTutorial(null, {}), false);
});

test("four cards with the agreed copy", () => {
  assert.equal(TUT_TEXT.length, 4);
  assert.equal(TUT_TEXT[0], "안녕! 나는 두억이, 도깨비 장터의 장부지기야.");
  assert.match(TUT_TEXT[1], /^장부는 표예요\. 가로 한 줄이 가게 하나, 세로 한 칸이 정보 하나/);
  assert.equal(TUT_TEXT[2], "카드를 눌러 SQL을 조립해요. 타자는 필요 없어요.");
  assert.deepEqual(TUT_CARDS, ["SELECT", "*", "FROM", "shops"]);
  assert.equal(TUT_ANSWER, "SELECT * FROM shops");
  assert.equal(SHOW_ANSWER_AFTER, 2);
});

test("check: right order ok, too few cards short, wrong order order", () => {
  assert.equal(tutorialCheck(["SELECT", "*", "FROM", "shops"]), "ok");
  assert.equal(tutorialCheck([]), "empty");
  assert.equal(tutorialCheck(["SELECT", "*"]), "short");
  assert.equal(tutorialCheck(["FROM", "shops", "SELECT", "*"]), "order");
  assert.equal(tutorialCheck(["SELECT", "shops", "FROM", "*"]), "order");
});

test("bank: the four cards, shuffled, never already in the right order", () => {
  for (let i = 0; i < 200; i++) {
    const b = tutorialBank(Math.random);
    assert.deepEqual([...b].sort(), [...TUT_CARDS].sort());
    assert.notDeepEqual(b, TUT_CARDS);
  }
  // 늘 같은 값을 주는 난수도 끝난다(정답 차례면 한 칸 돌림)
  assert.notDeepEqual(tutorialBank(() => 0.999), TUT_CARDS);
  assert.notDeepEqual(tutorialBank(() => 0), TUT_CARDS);
});
