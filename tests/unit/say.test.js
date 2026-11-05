import { test } from "node:test";
import assert from "node:assert/strict";
import { LINES, FALLBACK_LINE } from "../../data/lines.js";
import { OUTFITS } from "../../data/outfits.js";
import { say, SITUATION_FACE, FACES as SAY_FACES, doneFace } from "../../src/say.js";
import { FACE_IDS } from "../../src/dueogi.js";
import * as SAY_FACES_MOD from "../../src/say.js";

const SITUATIONS = [
  "course_done",
  "greet", "correct", "combo", "wrong", "running", "error", "hint",
  "lesson_done", "streak_up", "streak_broken", "outfit_bought", "welcome_back",
];
const FACES = [...FACE_IDS];   // 두억이 표정 12가지(설계 §8-3)

// 씨앗 고정 난수(mulberry32) — 시험 결과가 매번 같도록
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("no_repeat: 같은 상황 100번 → 연달아 같은 줄 0회", () => {
  for (const s of SITUATIONS) {
    const rng = seeded(7);
    let last = null;
    let repeats = 0;
    for (let i = 0; i < 100; i++) {
      const r = say(s, { name: "민지", streak: 3, xp: 20, outfit: "실험복" }, rng, last);
      if (r.index === last) repeats++;
      last = r.index;
    }
    assert.equal(repeats, 0, `${s}에서 연속 반복`);
  }
});

test("no_repeat: rng가 항상 같은 칸을 가리켜도 직전 줄은 피함", () => {
  const r = say("greet", {}, () => 0, 0);
  assert.notEqual(r.index, 0);
});

test("all_situations: 13종 모두 3~5줄, 표정 이름이 두억이 12종 안에 있음", () => {
  assert.deepEqual(Object.keys(LINES).sort(), [...SITUATIONS].sort());
  for (const s of SITUATIONS) {
    assert.ok(LINES[s].length >= 3 && LINES[s].length <= 5, `${s} 줄 수 ${LINES[s].length}`);
    for (const l of LINES[s]) {
      assert.equal(typeof l.text, "string");
      assert.ok(FACES.includes(l.face), `${s}: 모르는 표정 ${l.face}`);
    }
  }
});

test("lines: 말풍선에 들어가는 길이(60자 이하), 알려진 자리 표시만 씀", () => {
  for (const s of SITUATIONS) {
    for (const l of LINES[s]) {
      const filled = l.text.replace(/\{name\}/g, "가나다").replace(/\{\w+\}/g, "00");
      assert.ok(filled.length <= 60, `${s}: 너무 김 (${filled.length}) ${l.text}`);
      for (const m of l.text.matchAll(/\{(\w+)\}/g)) {
        assert.ok(["name", "streak", "xp", "outfit"].includes(m[1]), `${s}: 모르는 자리 표시 ${m[0]}`);
      }
    }
  }
});

test("name_blank: 이름 없음 → {name}이나 빈 호칭이 남지 않음", () => {
  let sawNameLine = false;
  for (const s of SITUATIONS) {
    LINES[s].forEach((l, i) => {
      if (l.text.includes("{name}")) sawNameLine = true;
      // 해당 줄을 정확히 고르도록 rng를 맞춤
      const rng = () => (i + 0.5) / LINES[s].length;
      for (const vars of [{}, { name: "" }, { name: "   " }]) {
        const r = say(s, { streak: 2, xp: 10, outfit: "실험복", ...vars }, rng, null);
        assert.equal(r.index, i);
        assert.ok(!/\{\w*\}/.test(r.text), `자리 표시 남음: ${r.text}`);
        assert.ok(!/(^|[\s,.!?])님[,\s!?.]/.test(r.text) && !/^님/.test(r.text), `빈 호칭 남음: ${r.text}`);
        assert.ok(!/^[\s,]/.test(r.text) && !/\s{2,}/.test(r.text), `공백 어긋남: ${r.text}`);
      }
    });
  }
  assert.ok(sawNameLine, "{name}을 쓰는 줄이 하나 이상 있어야 함");
});

test("name_form: {name}은 줄 맨 앞 「{name}님, 」 꼴로 한 번만 (빼도 조사가 남지 않게)", () => {
  for (const s of SITUATIONS) {
    for (const l of LINES[s]) {
      if (!l.text.includes("{name}")) continue;
      assert.match(l.text, /^\{name\}님, /, `${s}: ${l.text}`);
      assert.equal(l.text.split("{name}").length, 2, `${s}: {name} 두 번 이상`);
    }
  }
});

test("name_filled: 이름이 있으면 「이름님」으로 들어감", () => {
  const s = "greet";
  const i = LINES[s].findIndex((l) => l.text.includes("{name}"));
  assert.ok(i >= 0);
  const r = say(s, { name: "민지" }, () => (i + 0.5) / LINES[s].length, null);
  assert.ok(r.text.includes("민지님"), r.text);
});

test("placeholders: {streak}·{xp} 채움", () => {
  for (const [s, key, val] of [["streak_up", "streak", 12], ["lesson_done", "xp", 35]]) {
    const i = LINES[s].findIndex((l) => l.text.includes(`{${key}}`));
    assert.ok(i >= 0, `${s}에 {${key}} 줄 없음`);
    const r = say(s, { [key]: val }, () => (i + 0.5) / LINES[s].length, null);
    assert.equal(r.index, i);
    assert.ok(r.text.includes(String(val)), r.text);
  }
});

test("outfit_short: 모든 의상에 short 이름이 있음 (C16)", () => {
  assert.equal(OUTFITS.length, 10);
  for (const o of OUTFITS) {
    assert.equal(typeof o.short, "string", o.id);
    assert.ok(o.short.length > 0 && o.short.length <= 8, `${o.id}: ${o.short}`);
  }
});

test("placeholders_outfit: 실제 의상 short 이름 10개 × {outfit} 줄 전부", () => {
  const s = "outfit_bought";
  const idx = LINES[s].map((l, i) => (l.text.includes("{outfit}") ? i : -1)).filter((i) => i >= 0);
  assert.ok(idx.length >= 1);
  for (const o of OUTFITS) {
    for (const i of idx) {
      const r = say(s, { outfit: o.short }, () => (i + 0.5) / LINES[s].length, null);
      assert.equal(r.index, i);
      assert.ok(r.text.includes(o.short), r.text);
      assert.ok(!/\{\w*\}/.test(r.text), r.text);
      assert.ok(r.text.length <= 60, r.text);
    }
  }
});

test("vars_missing: vars {} → 자리 표시가 빠진 줄은 건너뜀, 남는 괄호·문장부호·「일」 시작 없음", () => {
  for (const s of SITUATIONS) {
    for (let k = 0; k < 20; k++) {
      const rng = seeded(100 + k);
      for (const vars of [{}, undefined, null]) {
        const r = say(s, vars, rng, null);
        assert.ok(!/[{}]/.test(r.text), `${s}: ${r.text}`);
        assert.ok(!/^[\s,.!?…·]/.test(r.text), `${s}: ${r.text}`);
        assert.ok(!/^일/.test(r.text), `${s}: ${r.text}`);
        assert.ok(!/(^|\s)(XP|일)[\s.!,]/.test(r.text.replace(/\d+ ?(XP|일)/g, "")), `${s}: 숫자 없는 단위 ${r.text}`);
      }
    }
  }
  // 자리 표시가 필요한 줄만 있는 경우를 흉내: xp가 없으면 {xp} 줄은 절대 안 나옴
  for (let k = 0; k < 50; k++) {
    const r = say("lesson_done", {}, seeded(k), null);
    assert.ok(!LINES.lesson_done[r.index]?.text.includes("{xp}"), r.text);
  }
});

test("one_pass: 이름 속 $&·{xp}는 그대로 글자로 들어감 (다시 바꾸지 않음)", () => {
  const s = "greet";
  const i = LINES[s].findIndex((l) => l.text.includes("{name}"));
  const r = say(s, { name: "$&{xp}", xp: 5 }, () => (i + 0.5) / LINES[s].length, null);
  assert.ok(r.text.startsWith("$&{xp}님, "), r.text);
});

test("rng_guard: NaN·음수·1 이상 → 범위 안 줄", () => {
  for (const v of [NaN, -1, -0.5, 1, 1.5, Infinity]) {
    for (const last of [null, 0, 2]) {
      const r = say("wrong", {}, () => v, last);
      assert.ok(Number.isInteger(r.index) && r.index >= 0 && r.index < LINES.wrong.length, `${v}: ${r.index}`);
      assert.notEqual(r.index, last);
      assert.equal(typeof r.text, "string");
    }
  }
});

test("banned: 고친 문구와 피할 표현이 남지 않음", () => {
  const all = Object.values(LINES).flat().map((l) => l.text).join("\n");
  for (const bad of ["오늘부터 1일", "입고", "고마워요", "힌트예요", "한 끗", "충분할 거예요", "빨간 줄", "금방 끝나요", "비워 뒀어요", "조건을 먼저", "갱신"]) {
    assert.ok(!all.includes(bad), `남은 표현: ${bad}`);
  }
});

test("streak_one: {streak}=1이어도 자연스러움 (「1일 연속」 꼴 없음)", () => {
  LINES.streak_up.forEach((l, i) => {
    const r = say("streak_up", { streak: 1 }, () => (i + 0.5) / LINES.streak_up.length, null);
    assert.ok(!/1일 연속/.test(r.text), r.text);
  });
});

test("fallback: 모르는 상황 → 오류 없이 중립 대사, 표정 proud(의기양양)", () => {
  const r = say("no_such_situation", { name: "민지" }, seeded(1), null);
  assert.equal(typeof r.text, "string");
  assert.ok(r.text.length > 0);
  assert.equal(r.face, FALLBACK_LINE.face);
  assert.equal(r.text, FALLBACK_LINE.text);
  assert.equal(r.index, -1);
});

test("deterministic: 같은 씨앗 → 같은 결과", () => {
  const a = say("correct", {}, seeded(42), null);
  const b = say("correct", {}, seeded(42), null);
  assert.deepEqual(a, b);
});

// ---- 두억이 (작업 10, 설계 §8-1·§8-3) ----
test("faces: 상황마다 설계 §8-3의 표정 (정답 만세, 오답 놀람, 기록 끊김 울음, 오랜만 잠 …)", () => {
  assert.deepEqual(SITUATION_FACE, {
    greet: "proud", correct: "cheer", combo: "wink", wrong: "surprise", running: "think", error: "surprise",
    hint: "think", lesson_done: "cheer", course_done: "swing", streak_up: "laugh", streak_broken: "cry",
    outfit_bought: "eat", welcome_back: "sleep",
  });
  for (const s of SITUATIONS) for (const l of LINES[s]) assert.equal(l.face, SITUATION_FACE[s], `${s}: ${l.text}`);
  assert.ok(FACE_IDS.includes(FALLBACK_LINE.face));
});

test("faces: 화면이 쓰는 표정 이름 표(FACES)는 모두 그림에 있고, 화남은 없음", () => {
  for (const [k, f] of Object.entries(SAY_FACES)) assert.ok(FACE_IDS.includes(f), `${k}: ${f}`);
  assert.ok(!FACE_IDS.includes("angry"));
  assert.equal(SAY_FACES.home, "proud");
  assert.equal(SAY_FACES.card, "think");
  assert.equal(SAY_FACES.examStart, "nervous");
  assert.equal(SAY_FACES.wrongAgain, "run");
  assert.equal(SAY_FACES.closet, "eat");
  assert.equal(SAY_FACES.reward, "laugh");
});

test("doneFace: 장 평가 통과 결의 > 실수 없음 윙크 > 배지·퀘스트 웃음 > 대사 표정(만세)", () => {
  const base = { firstTime: true, perfect: false, newBadges: [], finished: [], chest: false };
  assert.equal(doneFace({ ...base }, { isExam: false }, "cheer"), "cheer");
  assert.equal(doneFace({ ...base, newBadges: ["fixer"] }, { isExam: false }, "cheer"), "laugh");
  assert.equal(doneFace({ ...base, finished: ["q_xp20"] }, null, "cheer"), "laugh");
  assert.equal(doneFace({ ...base, perfect: true, newBadges: ["fixer"] }, { isExam: false }, "cheer"), "wink");
  assert.equal(doneFace({ ...base, perfect: true }, { isExam: true }, "cheer"), "swing");
  assert.equal(doneFace({ ...base, firstTime: false }, { isExam: true }, "cheer"), "cheer", "다시 하기는 평가 통과 축하 없음");
  assert.equal(doneFace(null, null, "swing"), "swing");
});

test("voice: 두억이 대사에 리아 소품·말이 없고 SQL·장터 이야기를 함", () => {
  const all = Object.values(LINES).flat().map((l) => l.text).join("\n") + FALLBACK_LINE.text;
  for (const bad of ["리아", "파이썬", "교수", "브로치", "커피", "뱀", "코드", "바이트", "print"]) assert.ok(!all.includes(bad), bad);
  assert.match(all, /SQL/);
  assert.match(all, /장터/);
  assert.match(all, /엽전/);
});

test("dueogiSays: 두억이 그림 + 말풍선, 리아 그림 없음", async () => {
  const { dueogiSays } = await import("../../src/ui/dom.js");
  const h = dueogiSays({ outfit: "seonbi", face: "cheer", text: "<맞았어>", size: 64, sfx: "딩동!" });
  assert.match(h, /class="dueogi"/);
  assert.match(h, /두억이, 만세, 선비/);
  assert.match(h, /&lt;맞았어&gt;/);
  assert.match(h, /딩동!/);
  assert.doesNotMatch(h, /class="ria|ria-(row|wrap|body)/);
});

test("ria.js는 지워지고 아무도 부르지 않음 (판정 R7)", async () => {
  const { existsSync, readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = new URL("../../", import.meta.url).pathname;
  for (const f of ["src/ria.js", "tests/unit/ria.test.js", "tools/ria_sheet.py", "docs/img/ria-sheet.png", "docs/img/ria-hero.png"]) {
    assert.ok(!existsSync(join(root, f)), `${f} 남음`);
  }
  const users = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|py)$/.test(f) && /ria\.js|riaSVG|riaSays|ria_sheet/.test(readFileSync(p, "utf8"))) users.push(p.slice(root.length));
    }
  };
  for (const d of ["src", "data", "tools", "tests/unit", "tests/sim"]) walk(join(root, d));
  walk(join(root, "tests")); // flow.py 등
  assert.deepEqual([...new Set(users)].filter((p) => !p.startsWith("tests/out/") && p !== "tests/unit/say.test.js"), []);
});

// ---- 작업 10 고침 1회차 ----
test("stale titles: 시험 이름에 바이트·표정 smile이 남지 않음", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = new URL("./", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".test.js"))) {
    for (const m of readFileSync(new URL(f, dir), "utf8").matchAll(/^test\("([^"]*)"/gm)) {
      if (/없|남지 않/.test(m[1])) continue;   // 「바이트가 없음」을 지키는 시험 이름은 그대로
      assert.doesNotMatch(m[1], /바이트|표정 smile/, `${f}: ${m[1]}`);
    }
  }
});

test("no_repeat without vars: 자리 표시 값이 없어도 잇달아 같은 줄이 나오지 않음(상황마다 자리 표시 없는 줄 2개 이상)", () => {
  for (const s of SITUATIONS) {
    const free = LINES[s].filter((l) => !/\{(streak|xp|outfit)\}/.test(l.text));
    assert.ok(free.length >= 2, `${s}: 자리 표시 없는 줄 ${free.length}`);
    for (const vars of [{}, { name: "민지" }]) {
      const rng = seeded(3);
      let last = null;
      for (let i = 0; i < 50; i++) {
        const r = say(s, vars, rng, last);
        assert.notEqual(r.index, last, `${s} 반복`);
        last = r.index;
      }
    }
  }
});

test("no_repeat: 쓸 수 있는 줄이 하나뿐이면 그 줄 하나를 고르되, 둘 이상이면 절대 반복하지 않음(say 규칙)", () => {
  // streak_up에서 {streak} 없이: 자리 표시 없는 줄만 돌아가며
  const seen = new Set();
  let last = null;
  for (let i = 0; i < 30; i++) { const r = say("streak_up", {}, seeded(i), last); assert.notEqual(r.index, last); last = r.index; seen.add(r.index); }
  assert.ok(seen.size >= 2, `streak_up 줄 ${[...seen]}`);
  seen.clear(); last = null;
  for (let i = 0; i < 30; i++) { const r = say("outfit_bought", {}, seeded(i), last); assert.notEqual(r.index, last); last = r.index; seen.add(r.index); }
  assert.ok(seen.size >= 2, `outfit_bought 줄 ${[...seen]}`);
});

test("wrong lines: 꾸짖는 느낌의 「천천히 읽어」가 없음", () => {
  const all = LINES.wrong.map((l) => l.text).join("\n");
  assert.doesNotMatch(all, /천천히 읽어/);
  assert.ok(LINES.wrong.some((l) => l.text.includes("문제 속 단서")));
});

test("doneFace eat: 매일 도전으로 엽전을 받으면 고기 먹기(엽전 받기, 설계 §8-3), 웃음·만세와 겹치지 않음", () => {
  const base = { firstTime: true, perfect: false, newBadges: [], finished: [], chest: false };
  assert.equal(doneFace({ ...base, mode: "daily", totalYeopjeon: 10 }, null, "cheer"), "eat");
  assert.equal(doneFace({ ...base, mode: "daily", totalYeopjeon: 0, xp: 0 }, null, "cheer"), "cheer", "보상을 이미 받은 날");
  assert.equal(doneFace({ ...base, mode: "daily", totalYeopjeon: 18, finished: ["q_xp20"] }, null, "cheer"), "laugh", "퀘스트가 먼저");
  assert.equal(doneFace({ ...base, mode: "lesson", totalYeopjeon: 10 }, { isExam: false }, "cheer"), "cheer", "보통 레슨은 만세 그대로");
  assert.equal(SAY_FACES.yeopjeon, "eat");
  const { milestoneFace } = SAY_FACES_MOD;
  assert.equal(milestoneFace(7), "eat", "7일 이정표 = 50엽전");
  assert.equal(milestoneFace(30), "laugh");
  assert.equal(milestoneFace(100), "laugh");
});
