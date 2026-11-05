// 레슨 점검기 (v0.1 작업 8): tests/content.js의 checkChapter와 명령줄, data/grammar.js.
// content_good.js → 문제점 0개, content_bad.js → 심어 둔 곳(BAD)마다 그 규칙이 나온다.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GRAMMAR, SQL_WORDS, UNTAUGHT } from "../../data/grammar.js";
import { SCHEMA } from "../../data/schema.js";
import { checkChapter, openEngine, sqlWords, RULES } from "../content.js";
import * as good from "../fixtures/content_good.js";
import * as bad from "../fixtures/content_bad.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
let engine;
before(() => { engine = openEngine(); });
after(() => { if (engine) engine.close(); });

const show = (issues) => issues.map((i) => `[${i.rule}] ${i.where}: ${i.msg}`).join("\n");

test("good chapter has no issues", () => {
  const issues = checkChapter(good, 5, engine, { concepts: good.CONCEPTS });
  assert.deepEqual(issues, [], show(issues));
});

test("bad chapter: every planted fault is reported under its rule", () => {
  const issues = checkChapter(bad, 5, engine, { concepts: bad.CONCEPTS });
  const missing = bad.BAD.filter(([rule, where]) =>
    !issues.some((i) => i.rule === rule && `${i.where} ${i.msg}`.includes(where)));
  assert.deepEqual(missing, [], `빠진 규칙:\n${missing.map((m) => m.join(" @ ")).join("\n")}\n\n나온 것:\n${show(issues)}`);
  for (const i of issues) {
    assert.ok(RULES.includes(i.rule), `모르는 규칙 이름 ${i.rule}`);
    assert.equal(typeof i.where, "string");
    assert.ok(i.msg && typeof i.msg === "string");
  }
});

test("bad chapter covers every rule name at least once", () => {
  const want = ["answer-runs", "drop-one", "swap-extra", "bank-size", "table-truth", "grammar", "readonly", "shape",
    "stable-order", "engine-guard", "blank-unique", "order-unique", "exam-coverage"];
  const planted = new Set(bad.BAD.map(([r]) => r));
  for (const r of want) assert.ok(planted.has(r), `content_bad.js에 ${r}를 어긴 곳이 없음`);
  const issues = checkChapter(bad, 5, engine, { concepts: bad.CONCEPTS });
  for (const r of want) assert.ok(issues.some((i) => i.rule === r), `${r} 규칙이 나오지 않음\n${show(issues)}`);
});

test("grammar: words are new per chapter, uppercase, no duplicates, untaught set apart", () => {
  const seen = new Map();
  for (let ch = 1; ch <= 17; ch++) {
    assert.ok(Array.isArray(GRAMMAR[ch]), `GRAMMAR[${ch}]`);
    for (const w of GRAMMAR[ch]) {
      assert.equal(w, w.toUpperCase());
      assert.ok(!seen.has(w), `${w}가 ${seen.get(w)}장과 ${ch}장에 둘 다 있음`);
      seen.set(w, ch);
    }
  }
  for (const w of UNTAUGHT) assert.ok(!seen.has(w), `${w}는 가르치는 낱말이면서 UNTAUGHT에도 있음`);
  for (const w of ["SELECT", "FROM", "WHERE", "BETWEEN", "COALESCE", "HAVING", "CASE", "JOIN", "EXISTS", "WITH", "ROW_NUMBER", "LAG", "STRFTIME"]) {
    assert.ok(SQL_WORDS.has(w), w);
  }
  assert.equal(seen.get("BETWEEN"), 4, "BETWEEN은 4장(15장 창 틀에서 다시 씀)");
  for (const w of ["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER"]) assert.ok(!SQL_WORDS.has(w), `${w}는 readonly 규칙 몫`);
});

test("grammar: no table or column name of the market is a policed SQL word", () => {
  for (const [t, def] of Object.entries(SCHEMA)) {
    for (const n of [t, ...Object.keys(def.cols)]) assert.ok(!SQL_WORDS.has(n.toUpperCase()), `${n}가 SQL 낱말 목록에 있음 — grammar 규칙이 이름을 낱말로 봄`);
  }
});

test("sqlWords skips string literals and comments, uppercases words", () => {
  const { words } = sqlWords("select name, 'ORDER by' AS t -- GROUP BY\nFROM items /* HAVING */ WHERE x = \"y\"");
  assert.deepEqual(words, ["SELECT", "NAME", "AS", "T", "FROM", "ITEMS", "WHERE", "X"]);
});

test("grammar rule allows earlier chapters' words only", () => {
  // 5장 좋은 장을 3장으로 점검하면 ORDER·BY·DESC·LIMIT·DISTINCT가 걸린다
  const issues = checkChapter(good, 3, engine, { concepts: good.CONCEPTS }).filter((i) => i.rule === "grammar");
  const text = show(issues);
  for (const w of ["ORDER", "DESC", "LIMIT", "DISTINCT"]) assert.match(text, new RegExp(`\\b${w}\\b`));
});

function cli(...args) {
  return spawnSync(process.execPath, ["tests/content.js", ...args], { cwd: ROOT, encoding: "utf8" });
}

test("cli: good lessons dir prints OK and exits 0", () => {
  const r = cli("--lessons-dir", "tests/fixtures/content_good");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ch5: OK \(레슨 5, 문제 50\)/);
});

test("cli: bad lessons dir lists issues and exits 1", () => {
  const r = cli("--lessons-dir", "tests/fixtures/content_bad");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /swap-extra/);
  assert.doesNotMatch(r.stdout, /ch5: OK/);
});

test("cli: --full N reports missing chapters, --chapter N checks one", () => {
  const r = cli("--lessons-dir", "tests/fixtures/content_good", "--full", "6");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const n of [1, 2, 3, 4, 6]) assert.match(r.stdout, new RegExp(`ch${n}: .*missing`));
  assert.match(r.stdout, /ch5: OK/);
  const one = cli("--lessons-dir", "tests/fixtures/content_good", "--chapter", "5");
  assert.equal(one.status, 0, one.stdout + one.stderr);
  const none = cli("--lessons-dir", "tests/fixtures/content_good", "--chapter", "4");
  assert.equal(none.status, 1, none.stdout + none.stderr);
  assert.match(none.stdout, /ch4: .*missing/);
});
