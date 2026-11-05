// 장 따로 불러오기 (v0.3 작업 1): 레슨 목록 만들기, 장 파일 이름표, 가져오기·실패 뒤 다시 시도
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCHEMA } from "../../data/schema.js";
import {
  validateLesson, DIALECTS,
  buildLessonIndex, chapterFileName, CHAPTER_FILE_RE, chaptersForConcepts, createLessonData, ChapterLoadError,
} from "../../src/lessondata.js";

const mod = (n, k = 2) => ({
  CHAPTER: { id: n, title: `${n}장 제목` },
  LESSONS: Array.from({ length: k }, (_, i) => ({
    id: `${n}-${i + 1}`, chapter: n, title: `레슨 ${n}-${i + 1}`, goal: `목표 ${n}-${i + 1}`,
    summary: [`요약 ${n}-${i + 1}`], isExam: i === k - 1 ? true : undefined,
    cards: [{ say: `카드 ${n}-${i + 1}`, code: "print(1)", out: "1" }],
    items: [
      { type: "choice", concept: `c${n}a`, q: `문제 ${n}-${i + 1}`, options: ["a", "b"], answer: 0 },
      { type: "build", concept: `c${n}b`, q: `조립 ${n}-${i + 1}`, cards: ["SELECT", "1"], extra: [], tables: [], hints: ["a", "b"] },
      { type: "check", concept: `c${n}a`, q: "확인", options: ["a", "b"], answer: 1 },
    ],
  })),
});

test("index_build: 장·레슨 목록만 담고 문제·카드는 뺀다", () => {
  const idx = buildLessonIndex([mod(2), mod(1)]);
  assert.deepEqual(idx.map((c) => c.id), [1, 2], "장 번호 순서");
  assert.equal(idx[0].title, "1장 제목");
  const l = idx[0].lessons[1];
  assert.deepEqual(l, { id: "1-2", chapter: 1, title: "레슨 1-2", goal: "목표 1-2", summary: ["요약 1-2"], isExam: true, concepts: ["c1a", "c1b"], hasBuild: true });
  assert.equal(idx[0].lessons[0].isExam, false);
  const text = JSON.stringify(idx);
  assert.ok(!text.includes("카드 1-1") && !text.includes("작성 1-1") && !text.includes("문제 1-1"), text);
});

test("index_build: hasBuild only on lessons with a build item (daily challenge picks those, task 11)", () => {
  const m = mod(1);
  m.LESSONS[0].items = m.LESSONS[0].items.filter((it) => it.type !== "build");
  const idx = buildLessonIndex([m]);
  assert.equal("hasBuild" in idx[0].lessons[0], false);
  assert.equal(idx[0].lessons[1].hasBuild, true);
});

test("index_build: CHAPTER가 없으면 첫 레슨의 chapter로, LESSONS가 없는 모듈은 건너뜀", () => {
  const m = mod(3);
  delete m.CHAPTER;
  const idx = buildLessonIndex([m, { nothing: 1 }, null]);
  assert.equal(idx.length, 1);
  assert.equal(idx[0].id, 3);
  assert.equal(idx[0].title, "");
});

test("file_name: 장 번호와 지문 8자", () => {
  assert.equal(chapterFileName(6, "0123abcd"), "lessons/ch6-0123abcd.json");
  assert.match(chapterFileName(12, "deadbeef"), CHAPTER_FILE_RE);
  assert.throws(() => chapterFileName(1, "xyz"));
  assert.throws(() => chapterFileName(0, "0123abcd"));
  assert.ok(!CHAPTER_FILE_RE.test("lessons/ch6.json"));
});

test("concepts_chapters: 복습 개념이 들어 있는 장만", () => {
  const idx = buildLessonIndex([mod(1), mod(2), mod(3)]);
  assert.deepEqual(chaptersForConcepts(idx, ["c3b", "c1a"]), [1, 3]);
  assert.deepEqual(chaptersForConcepts(idx, ["없음"]), []);
  assert.deepEqual(chaptersForConcepts(idx, []), []);
});

function fakeFetch(table) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    const r = table(String(url), calls.length);
    if (r instanceof Error) throw r;
    return r;
  };
  fn.calls = calls;
  return fn;
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const FILES = { 1: "lessons/ch1-11111111.json", 2: "lessons/ch2-22222222.json" };
const BASE = "https://x.test/app/index.html";

test("fetch_once: 주소는 기준 주소 기준, 한 번 받은 장은 메모리에서", async () => {
  const f = fakeFetch(() => ok(mod(2)));
  const d = createLessonData({ index: buildLessonIndex([mod(1), mod(2)]), files: FILES, base: BASE, fetch: f });
  assert.equal(d.split, true);
  const [a, b] = await Promise.all([d.getChapter(2), d.getChapter(2)]);
  assert.equal(a, b, "동시에 불러도 한 번만");
  await d.getChapter(2);
  assert.deepEqual(f.calls, ["https://x.test/app/lessons/ch2-22222222.json"]);
  assert.equal(a.LESSONS[0].items.length, 3);
  assert.deepEqual(d.fileList(), Object.values(FILES));
  const l = await d.getLesson("2-2");
  assert.equal(l.cards[0].say, "카드 2-2");
  assert.equal(await d.getLesson("9-9"), null, "없는 레슨은 null");
  assert.equal(d.lessons.length, 4);
  assert.equal(d.chapterOf("1-2"), 1);
});

test("retry: 실패는 기억하지 않고 다음 부름에서 다시 받음", async () => {
  let fail = true;
  const f = fakeFetch(() => (fail ? new TypeError("Failed to fetch") : ok(mod(1))));
  const d = createLessonData({ index: buildLessonIndex([mod(1)]), files: FILES, base: BASE, fetch: f });
  await assert.rejects(d.getChapter(1), (e) => e instanceof ChapterLoadError && e.chapter === 1 && e.stale === false);
  fail = false;
  const c = await d.getChapter(1);
  assert.equal(c.CHAPTER.id, 1);
  assert.equal(f.calls.length, 2);
});

test("stale: 404면 옛 판 표시(stale), 내용이 다른 장이면 실패", async () => {
  const f404 = fakeFetch(() => ({ ok: false, status: 404, json: async () => ({}) }));
  const d = createLessonData({ index: buildLessonIndex([mod(1)]), files: FILES, base: BASE, fetch: f404 });
  await assert.rejects(d.getChapter(1), (e) => e instanceof ChapterLoadError && e.stale === true);
  const wrong = fakeFetch(() => ok(mod(2)));
  const d2 = createLessonData({ index: buildLessonIndex([mod(1)]), files: FILES, base: BASE, fetch: wrong });
  await assert.rejects(d2.getChapter(1), ChapterLoadError);
  const nofile = createLessonData({ index: buildLessonIndex([mod(1)]), files: {}, base: BASE, fetch: wrong });
  await assert.rejects(nofile.getChapter(1), ChapterLoadError);
});

test("dev_mode: 장 파일 표가 없으면 불러온 모듈을 그대로 씀(네트워크 없음)", async () => {
  const mods = [mod(1), mod(2)];
  const f = fakeFetch(() => { throw new Error("no network in dev"); });
  const d = createLessonData({ modules: mods, fetch: f });
  assert.equal(d.split, false);
  assert.deepEqual(d.index.map((c) => c.id), [1, 2]);
  assert.deepEqual(d.fileList(), []);
  const l = await d.getLesson("2-1");
  assert.equal(l.items[1].q, "조립 2-1");
  assert.equal(f.calls.length, 0);
});

// v0.9 매일 도전: 틀(TEMPLATES)은 장 파일에, 레슨 목록에는 틀 id·개념만(문제 고르기는 목록만 보고 함)
const TPL = (n) => [{ id: `${n}-T1`, concept: `c${n}a`, type: "choice", q: "비밀 문제 {A}", code: "print({A})", wrong: ["print(1)", "print(2)"], vars: { A: { min: 3, max: 9 } }, explain: "해설" }];

test("templates_index: 목록에는 틀 id·개념만, 틀 없는 장은 templates 칸 없음", () => {
  const idx = buildLessonIndex([{ ...mod(1), TEMPLATES: TPL(1) }, mod(2)]);
  assert.deepEqual(idx[0].templates, [{ id: "1-T1", concept: "c1a" }]);
  assert.equal("templates" in idx[1], false);
  assert.ok(!JSON.stringify(idx).includes("비밀 문제"));
});

test("templates_chapter: 개발판·배포판 모두 getChapter가 TEMPLATES를 돌려줌(없으면 [])", async () => {
  const dev = createLessonData({ modules: [{ ...mod(1), TEMPLATES: TPL(1) }, mod(2)] });
  assert.equal((await dev.getChapter(1)).TEMPLATES[0].q, "비밀 문제 {A}");
  assert.deepEqual((await dev.getChapter(2)).TEMPLATES, []);
  const f = fakeFetch(() => ok({ ...mod(1), TEMPLATES: TPL(1) }));
  const split = createLessonData({ index: buildLessonIndex([{ ...mod(1), TEMPLATES: TPL(1) }]), files: FILES, base: BASE, fetch: f });
  assert.equal((await split.getChapter(1)).TEMPLATES[0].id, "1-T1");
});

// ---- 레슨 형식 검사 (v0.1 작업 7): 설명 카드 sql, 객관식 sql 보기, 조립 문제 ----
const lesson = (over = {}) => ({
  id: "1-1", chapter: 1, title: "t", goal: "g", summary: ["s"],
  cards: [{ say: "설명" }],
  items: [{ type: "choice", concept: "c", q: "q", options: ["a", "b"], answer: 0 }],
  ...over,
});
const build = (over = {}) => ({
  type: "build", concept: "c", q: "q", cards: ["SELECT", "*", "FROM", "items"], extra: ["shops"], tables: ["items"],
  hints: ["첫째", "둘째"], ...over,
});
const errs = (l) => validateLesson(l, SCHEMA);

test("valid lesson has no errors", () => {
  assert.deepEqual(errs(lesson({ items: [build()] })), []);
});

test("card with sql accepted", () => {
  assert.deepEqual(errs(lesson({ cards: [{ say: "표를 봐요", sql: "SELECT name FROM items LIMIT 3" }] })), []);
  assert.ok(errs(lesson({ cards: [{ say: "x", sql: "" }] })).length, "빈 sql");
  assert.ok(errs(lesson({ cards: [{ sql: "SELECT 1" }] })).length, "say 없음");
});

test("card with code rejected", () => {
  const e = errs(lesson({ cards: [{ say: "리아 모양", code: "print(1)", out: "1" }] }));
  assert.ok(e.some((m) => m.includes("code")), e.join("|"));
  assert.ok(errs(lesson({ cards: [{ say: "x", out: "1" }] })).length);
});

// ---- 보기 전용 비교 카드 (판정 R30, 16장): { say, show, dialect }. show는 실행하지 않는 다른 데이터베이스 SQL ----
test("show card (view-only, R30) accepted with an allowed dialect", () => {
  assert.deepEqual(DIALECTS, ["MySQL", "PostgreSQL"]);
  for (const dialect of DIALECTS) {
    assert.deepEqual(errs(lesson({ cards: [{ say: "다른 데이터베이스", show: "SELECT DATE_FORMAT(d, '%Y-%m')", dialect }] })), [], dialect);
  }
});

test("show card: dialect must be in the list, and goes only with show", () => {
  const card = (c) => errs(lesson({ cards: [{ say: "x", ...c }] }));
  assert.ok(card({ show: "SELECT 1" }).some((m) => m.includes("dialect")), "dialect 없음");
  assert.ok(card({ show: "SELECT 1", dialect: "Oracle" }).some((m) => m.includes("dialect")), "목록 밖");
  assert.ok(card({ show: "SELECT 1", dialect: "mysql" }).some((m) => m.includes("dialect")), "대소문자까지 같아야 함");
  assert.ok(card({ sql: "SELECT 1", dialect: "MySQL" }).some((m) => m.includes("dialect")), "dialect는 show와만");
  assert.ok(card({ dialect: "MySQL" }).some((m) => m.includes("dialect")), "show 없이 dialect");
});

test("show card: show is a non-empty string and never sits with sql on one card", () => {
  const card = (c) => errs(lesson({ cards: [{ say: "x", ...c }] }));
  assert.ok(card({ show: "", dialect: "MySQL" }).length, "빈 show");
  assert.ok(card({ show: 3, dialect: "MySQL" }).length, "글자가 아님");
  assert.ok(card({ sql: "SELECT 1", show: "SELECT 1", dialect: "MySQL" }).some((m) => m.includes("show") && m.includes("sql")), "sql과 show를 함께");
});

test("choice option sql accepted", () => {
  const ok = { type: "choice", concept: "c", q: "q", code: "SELECT 1", options: [{ sql: "SELECT 1" }, { sql: "SELECT 2" }], answer: 1 };
  assert.deepEqual(errs(lesson({ items: [ok] })), []);
  assert.deepEqual(errs(lesson({ items: [{ ...ok, tables: ["items", "shops"] }] })), []);
});

test("choice options cannot mix text and sql, and need a valid answer", () => {
  const mixed = { type: "choice", concept: "c", q: "q", options: ["a", { sql: "SELECT 1" }], answer: 0 };
  assert.ok(errs(lesson({ items: [mixed] })).length, "섞음");
  assert.ok(errs(lesson({ items: [{ type: "choice", concept: "c", q: "q", options: [{ sql: "" }, { sql: "SELECT 1" }], answer: 0 }] })).length);
  assert.ok(errs(lesson({ items: [{ type: "choice", concept: "c", q: "q", options: ["a", "b"], answer: 2 }] })).length);
  assert.ok(errs(lesson({ items: [{ type: "choice", concept: "c", q: "q", options: ["a", "b"], answer: 0, tables: ["nope"] }] })).length, "없는 표");
});

test("build item needs cards and tables", () => {
  assert.ok(errs(lesson({ items: [build({ cards: [] })] })).length, "cards 비어 있음");
  assert.ok(errs(lesson({ items: [build({ cards: undefined })] })).length);
  assert.ok(errs(lesson({ items: [build({ cards: ["SELECT", 1] })] })).length, "문자열만");
  assert.ok(errs(lesson({ items: [build({ tables: [] })] })).length, "tables 비어 있음");
  assert.ok(errs(lesson({ items: [build({ tables: undefined })] })).length);
  assert.ok(errs(lesson({ items: [build({ tables: ["nope"] })] })).length, "SCHEMA에 없는 표");
  assert.ok(errs(lesson({ items: [build({ extra: "x" })] })).length, "extra는 배열");
  assert.deepEqual(errs(lesson({ items: [build({ extra: [] })] })), []);
});

test("build item needs hints", () => {
  assert.ok(errs(lesson({ items: [build({ hints: undefined })] })).length);
  assert.ok(errs(lesson({ items: [build({ hints: ["하나"] })] })).length, "정확히 2개");
  assert.ok(errs(lesson({ items: [build({ hints: ["a", "b", "c"] })] })).length);
  assert.ok(errs(lesson({ items: [build({ hints: ["a", " "] })] })).length, "빈 글");
});

test("flow fixture lessons pass the validator", async () => {
  const m = await import("../fixtures/lesson_build.js");
  for (const l of m.LESSONS) assert.deepEqual(validateLesson(l, SCHEMA), [], l.id);
});
