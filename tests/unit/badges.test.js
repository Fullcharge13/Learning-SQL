import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBadges, RULES } from "../../src/badges.js";
import { BADGES } from "../../data/badges.js";

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
const stats = (o) => ({ lessons: 0, perfect: 0, hintfree: 0, fixed: 0, review_items: 0, ...o });

test("BADGES table: 16 ids (첫 조회 + 장 묶음 4 + 리아에서 그대로 11) with Korean name/desc", () => {
  assert.equal(BADGES.length, 16);
  assert.deepEqual(BADGES.map((b) => b.id), ["first_query", "book_reader", "count_dokkaebi", "join_master", "analyst",
    "streak7", "streak30", "streak100", "fixer", "hintfree10", "perfectionist", "reviewer", "collector", "night_owl",
    "advanced1", "advancedAll"]);
  for (const b of BADGES) {
    assert.match(b.name, /[가-힣]/);
    assert.match(b.desc, /[가-힣]/);
  }
  const name = (id) => BADGES.find((b) => b.id === id).name;
  assert.equal(name("first_query"), "첫 조회");
  assert.equal(name("book_reader"), "장부 읽기");
  assert.equal(name("count_dokkaebi"), "셈 도깨비");
  assert.equal(name("join_master"), "조인 장인");
  assert.equal(name("analyst"), "분석 도깨비");
});

test("empty save -> no badges", () => {
  assert.deepEqual(checkBadges(mkSave(), { hour: 12 }), []);
  assert.deepEqual(checkBadges(mkSave()), []);
});

test("badge_first_query: 1-1 completed -> ['first_query'], recheck -> []", () => {
  const s = mkSave({ completed_lessons: ["1-1"] });
  const got = checkBadges(s, { hour: 12 });
  assert.deepEqual(got, ["first_query"]);
  const s2 = { ...s, badges: [...s.badges, ...got] };
  assert.deepEqual(checkBadges(s2, { hour: 12 }), []);
});

test("night: lesson done 22:00-03:59 -> night_owl; 21 and 4 -> none", () => {
  const owl = (hour) => checkBadges(mkSave(), { hour, lessonDone: true }).includes("night_owl");
  assert.equal(owl(21), false);
  assert.equal(owl(22), true);
  assert.equal(owl(23), true);
  assert.equal(owl(0), true);
  assert.equal(owl(3), true);
  assert.equal(owl(4), false);
});

test("night_owl requires a lesson completed in this check (ruling)", () => {
  assert.deepEqual(checkBadges(mkSave(), { hour: 22 }), []);
  assert.deepEqual(checkBadges(mkSave(), { hour: 22, lessonDone: false }), []);
  assert.deepEqual(checkBadges(mkSave(), { hour: 3 }), []);
});

test("chapter-group badges: earned when the group's last chapter exam is passed", () => {
  const groups = [["book_reader", 5], ["count_dokkaebi", 9], ["join_master", 13], ["analyst", 17]];
  for (const [id, last] of groups) {
    // 그 묶음의 앞 장 평가만으로는 안 됨, 마지막 장의 4번째 레슨까지도 안 됨
    const before = mkSave({ completed_lessons: [`${last - 1}-5`, `${last}-1`, `${last}-2`, `${last}-3`, `${last}-4`] });
    assert.ok(!checkBadges(before, { hour: 12 }).includes(id), `${id} too early`);
    const after = mkSave({ completed_lessons: [`${last}-5`] });
    assert.deepEqual(checkBadges(after, { hour: 12 }), [id], id);
  }
  // 옛 1~3장 배지 id는 없어짐
  for (const old of ["ch1", "ch2", "ch3", "first_print"]) assert.equal(RULES[old], undefined, old);
});

test("join_master after chapter 13 exam", () => {
  const ids = [];
  for (let n = 1; n <= 13; n++) for (let k = 1; k <= 5; k++) ids.push(`${n}-${k}`);
  const got = checkBadges(mkSave({ completed_lessons: ids }), { hour: 12 });
  assert.deepEqual(got, ["first_query", "book_reader", "count_dokkaebi", "join_master"]);
  const short = checkBadges(mkSave({ completed_lessons: ids.filter((x) => x !== "13-5") }), { hour: 12 });
  assert.ok(!short.includes("join_master"));
});

test("badge descriptions use SQL wording (조립), not 코드", () => {
  const d = (id) => BADGES.find((b) => b.id === id).desc;
  assert.match(d("fixer"), /조립/);
  assert.match(d("hintfree10"), /조립/);
});

test("streak badges use streak.best", () => {
  assert.deepEqual(checkBadges(mkSave({ streak: { days: 0, best: 6 } }), { hour: 12 }), []);
  assert.deepEqual(checkBadges(mkSave({ streak: { days: 0, best: 7 } }), { hour: 12 }), ["streak7"]);
  assert.deepEqual(checkBadges(mkSave({ streak: { days: 30, best: 30 } }), { hour: 12 }), ["streak7", "streak30"]);
  assert.deepEqual(checkBadges(mkSave({ streak: { days: 99, best: 99 } }), { hour: 12 }), ["streak7", "streak30"]);
  assert.deepEqual(checkBadges(mkSave({ streak: { days: 100, best: 100 } }), { hour: 12 }), ["streak7", "streak30", "streak100"]);
});

test("streak100: already granted (by Task 2 milestone) -> not returned again", () => {
  const s = mkSave({ streak: { days: 100, best: 100 }, badges: ["streak7", "streak30", "streak100"] });
  assert.deepEqual(checkBadges(s, { hour: 12 }), []);
  const b = BADGES.find((x) => x.id === "streak100");
  assert.equal(b.name, "연속 100일");
  assert.equal(b.desc, "100일 연속으로 하루 목표를 채워요");
});

test("stat thresholds: fixed 5, hintfree 10, perfect 10, review_items 30", () => {
  const below = mkSave({ stats: stats({ fixed: 4, hintfree: 9, perfect: 9, review_items: 29 }) });
  assert.deepEqual(checkBadges(below, { hour: 12 }), []);
  const at = mkSave({ stats: stats({ fixed: 5, hintfree: 10, perfect: 10, review_items: 30 }) });
  assert.deepEqual(checkBadges(at, { hour: 12 }), ["fixer", "hintfree10", "perfectionist", "reviewer"]);
});

test("collector: 3 outfits besides basic (ruling)", () => {
  assert.deepEqual(checkBadges(mkSave({ outfits: ["basic", "merchant", "seonbi"] }), { hour: 12 }), []);
  assert.deepEqual(checkBadges(mkSave({ outfits: ["basic", "merchant", "seonbi", "podol"] }), { hour: 12 }), ["collector"]);
});

test("does not mutate save", () => {
  const s = mkSave({ completed_lessons: ["1-1"] });
  const snap = JSON.stringify(s);
  checkBadges(s, { hour: 22, lessonDone: true });
  assert.equal(JSON.stringify(s), snap);
});

test("every BADGES id has a rule (and no extra rules)", () => {
  for (const b of BADGES) assert.equal(typeof RULES[b.id], "function", b.id);
  assert.deepEqual(Object.keys(RULES).sort(), BADGES.map((b) => b.id).sort());
});

test("every badge has its own art (no '?' fallback), incl. 장 묶음 4개", async () => {
  const { badgeArt } = await import("../../src/ui/badges.js");
  const arts = new Set();
  for (const b of BADGES) {
    const svg = badgeArt(b.id, true);
    assert.ok(!/>\?<\/text>/.test(svg), `${b.id} uses fallback art`);
    arts.add(svg);
  }
  assert.equal(arts.size, BADGES.length, "배지 그림은 모두 다름");
});

// ---- 화면 글자 검사 (작업 10, 판정 R7 · 작업 12 이월) ----
// 「리아」·「파이썬」·「바이트」·「코드」가 사용자에게 보이는 글자로 남지 않았는지 src/·data/ 전체를 본다.
// 방법: JS는 esbuild로 주석만 걷어 낸다(minifyWhitespace + legalComments none). 이 저장소의 식별자는 모두 영어라서
//   (charset utf8: 그래야 한글이 \uXXXX로 바뀌지 않는다 — 아래 검사기 시험이 지킴) 주석을 뺀 뒤 남는 한글은 문자열·템플릿 글자(= 화면 글자나 화면에 이어지는 글자)뿐이다. 그래서 식별자·주석의
//   「코드」(예: 주석 「코드로 그린 배지」)는 걸리지 않고, 화면 글자만 걸린다. CSS·HTML은 주석을 걷고 같은 검사를 한다.
test("no ria strings: 화면 글자에 리아·파이썬·바이트·코드가 없음 (src/·data/ 전체)", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { transformSync } = await import("esbuild");
  const root = new URL("../../", import.meta.url).pathname;
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|html|css)$/.test(f)) files.push(p);
    }
  };
  walk(join(root, "src"));
  walk(join(root, "data"));
  assert.ok(files.length > 30, `files ${files.length}`);
  const BAD = /리아|파이썬|바이트|코드/g;
  const hits = [];
  for (const p of files) {
    const raw = readFileSync(p, "utf8");
    let text;
    if (p.endsWith(".js")) text = transformSync(raw, { loader: "js", minifyWhitespace: true, legalComments: "none", charset: "utf8" }).code;
    else if (p.endsWith(".css")) text = raw.replace(/\/\*[^]*?\*\//g, "");
    else text = raw.replace(/<!--[^]*?-->/g, "");
    for (const m of text.matchAll(BAD)) hits.push(`${p.slice(root.length)}: …${text.slice(Math.max(0, m.index - 20), m.index + 20)}…`);
  }
  assert.deepEqual(hits, []);
});

test("no ria strings: 검사기가 주석 속 「코드」는 넘기고 문자열 속 「코드」는 잡음", async () => {
  const { transformSync } = await import("esbuild");
  const strip = (s) => transformSync(s, { loader: "js", minifyWhitespace: true, legalComments: "none", charset: "utf8" }).code;
  assert.doesNotMatch(strip("// 코드로 그림\n/** 리아 */ const a = 1;"), /코드|리아/);
  assert.match(strip("const a = `내가 만든 코드`;"), /코드/);
  assert.match(strip("const a = '100바이트';"), /바이트/);
});

test("card layout fallback: :has() 없이도 카드 단추를 고정하지 않는 규칙이 있음(.screen.lesson.on-card)", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../../src/style.css", import.meta.url), "utf8").replace(/\/\*[^]*?\*\//g, "");
  assert.match(css, /\.screen\.lesson\.on-card \.lesson-foot \{[^}]*position: static/);
  assert.match(css, /\.screen\.lesson\.on-card \{[^}]*flex-direction: column/);
  assert.match(css, /\.screen\.lesson\.on-card \.lesson-body \{[^}]*padding-bottom: 8px/);
  // :has 규칙과 한 묶음(쉼표)으로 쓰면 :has를 모르는 브라우저가 묶음 전체를 버리므로 따로 써야 함
  assert.doesNotMatch(css, /on-card[^{]*:has\(|:has\([^{]*on-card/);
});
