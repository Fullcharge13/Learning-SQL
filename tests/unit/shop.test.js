import { test } from "node:test";
import assert from "node:assert/strict";
import { buy } from "../../src/shop.js";
import { OUTFITS } from "../../data/outfits.js";
import { OUTFIT_IDS } from "../../src/dueogi.js";

function mkSave(over = {}) {
  return {
    saveVer: 1,
    current_chapter: 1, current_lesson: "1-1",
    completed_lessons: [], submission_logs: [], grading_results: {},
    weak_concepts: {}, review_queue: [], last_active_at: null,
    xp: 0, yeopjeon: 0,
    streak: { days: 0, best: 0, lastGoalDate: null, todayDate: null, todayXp: 0 },
    freezes: 0,
    quests: { date: null, ids: [], progress: {}, done: [], chest: false },
    badges: [], outfits: ["basic"], outfit: "basic",
    stats: { lessons: 0, perfect: 0, hintfree: 0, fixed: 0, review_items: 0 },
    settings: { sound: true, dailyGoal: 20, name: "" },
    ...over,
  };
}

const NEW_IDS = ["basic", "merchant", "seonbi", "podol", "detective", "winter", "gukbap", "seolbim", "hunjang", "graduate"];

test("OUTFITS table: 두억이 10벌(설계 §8-4), 값은 리아 의상 값 순서 그대로", () => {
  const price = Object.fromEntries(OUTFITS.map((o) => [o.id, o.price]));
  assert.deepEqual(OUTFITS.map((o) => o.id), NEW_IDS);
  assert.deepEqual(price, { basic: null, merchant: 110, seonbi: 180, podol: 180, detective: 180, winter: 180,
    gukbap: 240, seolbim: 240, hunjang: 300, graduate: null });
  assert.equal(OUTFITS.find((o) => o.id === "basic").unlock, "start");
  assert.equal(OUTFITS.find((o) => o.id === "graduate").unlock, "streak30");
  for (const o of OUTFITS) {
    assert.match(o.name, /[가-힣]/, o.id);
    assert.match(o.short, /^[가-힣 ·]+$/, o.id + " short: 조사 없이 대사에 들어가는 짧은 이름");
    assert.ok(typeof o.desc === "string" && /[가-힣]/.test(o.desc) && o.desc.length <= 30, o.id + " desc");
    assert.ok(!/python/i.test(o.name + o.short + o.desc), o.id + ": 상표 이름 안 씀");
  }
  assert.equal(new Set(OUTFITS.map((o) => o.desc)).size, OUTFITS.length, "설명은 모두 다름");
  for (const o of OUTFITS) assert.doesNotMatch(o.name + o.short + o.desc, /리아|교수|코드|바이트/, o.id);
  // 의상 id는 그림(src/dueogi.js)의 의상 id와 같은 차례
  assert.deepEqual(OUTFITS.map((o) => o.id), [...OUTFIT_IDS]);
});

test("buy(v0.1.1): 110 yeopjeon buys merchant -> 0 yeopjeon, owned; again -> error; graduate -> error", () => {
  const s0 = mkSave({ yeopjeon: 110 });
  const s1 = buy(s0, "merchant");
  assert.ok(!(s1 instanceof Error));
  assert.equal(s1.yeopjeon, 0);
  assert.ok(s1.outfits.includes("merchant"));
  assert.equal(s0.yeopjeon, 110);
  assert.deepEqual(s0.outfits, ["basic"]);
  const again = buy({ ...s1, yeopjeon: 500 }, "merchant");
  assert.ok(again instanceof Error);
  const grad = buy(mkSave({ yeopjeon: 9999 }), "graduate");
  assert.ok(grad instanceof Error);
});

test("buy errors: insufficient yeopjeon, unknown/old id, basic not for sale", () => {
  assert.ok(buy(mkSave({ yeopjeon: 179 }), "winter") instanceof Error);
  assert.ok(buy(mkSave({ yeopjeon: 109 }), "merchant") instanceof Error);
  assert.ok(buy(mkSave({ yeopjeon: 299 }), "hunjang") instanceof Error);
  assert.ok(buy(mkSave({ yeopjeon: 9999 }), "pirate") instanceof Error);
  for (const ria of ["casual", "whitecoat", "explorer", "wizard", "lab"]) assert.ok(buy(mkSave({ yeopjeon: 9999 }), ria) instanceof Error, ria);
  const short = buy(mkSave({ yeopjeon: 10 }), "merchant");
  assert.match(short.message, /엽전이 모자라요/);
  assert.ok(buy(mkSave({ yeopjeon: 9999 }), "basic") instanceof Error);
});

test("buy does not change the worn outfit", () => {
  const s = buy(mkSave({ yeopjeon: 300 }), "hunjang");
  assert.equal(s.outfit, "basic");
  assert.equal(s.yeopjeon, 0);
});

test("voice: 탐정 말투(detective)는 탐정 의상 하나에만 (판정 R14)", async () => {
  assert.deepEqual(OUTFITS.filter((o) => o.voice).map((o) => [o.id, o.voice]), [["detective", "detective"]]);
  // 입은 옷 id 그대로 explain에 넘기면 탐정 말투가 나온다(화면은 save.outfit을 넘김)
  const { explain } = await import("../../src/grade.js");
  const { DETECTIVE_ID } = await import("../../data/errors.js");
  assert.equal(DETECTIVE_ID, "detective");
  assert.notEqual(explain("no such column: nme", "detective"), explain("no such column: nme", "basic"));
  for (const o of OUTFITS.filter((x) => x.id !== "detective")) {
    assert.equal(explain("no such column: nme", o.id), explain("no such column: nme", "basic"), o.id);
  }
});
