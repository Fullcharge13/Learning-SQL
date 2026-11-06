// 레슨 점검기 (v0.1 작업 8): tests/content.js의 checkChapter와 명령줄, data/grammar.js.
// content_good.js → 문제점 0개, content_bad.js → 심어 둔 곳(BAD)마다 그 규칙이 나온다.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GRAMMAR, SQL_WORDS, UNTAUGHT } from "../../data/grammar.js";
import * as grammar from "../../data/grammar.js";
import { CONCEPTS as DATA_CONCEPTS } from "../../data/concepts.js";
import { cardsToSql, hasOrderBy } from "../../src/grade.js";
import { checkReadOnly } from "../../src/sqlcore.js";
import { SCHEMA } from "../../data/schema.js";
import { checkChapter, openEngine, sqlWords, RULES, buildRange, withTieBreak } from "../content.js";
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

test("R48: inserting an extra card is not a checker issue (the app grades the superset as extra)", () => {
  const issues = checkChapter(bad, 5, engine, { concepts: bad.CONCEPTS });
  const hit = issues.filter((i) => i.rule === "swap-extra" && `${i.where} ${i.msg}`.includes("bad-insert-asc"));
  assert.deepEqual(hit, [], show(hit));
  assert.ok(!issues.some((i) => /더 놓아도/.test(i.msg)), "끼워 넣기 검사는 R48로 없어짐");
});

test("bad chapter covers every rule name at least once", () => {
  const want = ["answer-runs", "drop-one", "swap-extra", "bank-size", "table-truth", "grammar", "readonly", "shape",
    "stable-order", "engine-guard", "blank-unique", "order-unique", "exam-coverage", "templates"];
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
  assert.match(r.stdout, /ch5: OK \(레슨 5, 문제 52, 틀 3: 씨앗 300개 중 다시 만든 것 \d+, 심화 3레슨·30문제\)/);
  assert.match(r.stdout, /합계: 장 1개, 레슨 5, 문제 52, 심화 3레슨·30문제, 문제점 0/);
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

test("grammar: symbol forms in prose text options are not policed (ch1)", () => {
  const issues = checkChapter(good, 1, engine, { concepts: good.CONCEPTS })
    .filter((i) => i.rule === "grammar" && i.where.includes("g5-prose-forms"));
  assert.deepEqual(issues, [], show(issues));
});

test("withTieBreak appends to the outermost ORDER BY, before LIMIT/OFFSET", () => {
  assert.equal(withTieBreak("SELECT a, b FROM t ORDER BY b DESC LIMIT 3", ", 1, 2"), "SELECT a, b FROM t ORDER BY b DESC , 1, 2 LIMIT 3");
  assert.equal(withTieBreak("SELECT a FROM t ORDER BY a", ", 1"), "SELECT a FROM t ORDER BY a , 1");
  assert.equal(withTieBreak("WITH x AS (SELECT a FROM t ORDER BY a LIMIT 2) SELECT a, RANK() OVER (ORDER BY a) FROM x ORDER BY 2 LIMIT 1 OFFSET 1", ", 1"),
    "WITH x AS (SELECT a FROM t ORDER BY a LIMIT 2) SELECT a, RANK() OVER (ORDER BY a) FROM x ORDER BY 2 , 1 LIMIT 1 OFFSET 1");
  assert.equal(withTieBreak("SELECT 'ORDER BY x LIMIT' FROM t", ", 1"), null, "ORDER BY 없음");
});

test("exam lessons allow at most 3 builds (R25)", () => {
  assert.deepEqual(buildRange(3, false), [1, 1]);
  assert.deepEqual(buildRange(3, true), [1, 2]);
  assert.deepEqual(buildRange(8, true), [2, 3]);
  assert.deepEqual(buildRange(15, false), [2, 3]);
  assert.deepEqual(buildRange(15, true), [2, 3]);
});

test("engine: a run over the time limit is a timeout, and the restarted engine still works", () => {
  const e = openEngine({ timeoutMs: 200 });
  try {
    const slow = e.run("SELECT c.name, SUM(i.qty) FROM customers c, orders o, order_items i GROUP BY c.name");
    assert.equal(slow.error, "timeout");
    assert.equal(slow.timeout, true);
    assert.equal(e.stats.timeouts, 1);
    const ok = e.run("SELECT COUNT(*) AS n FROM items");
    assert.equal(ok.error, null);
    assert.deepEqual(ok.rows, [[40]]);
  } finally { e.close(); }
});

test("drop-one: a variant that times out counts as wrong, not an issue (R24)", () => {
  const e = openEngine({ timeoutMs: 200 });
  const item = {
    type: "build", id: "t-drop-timeout", concept: "select", q: "손님마다 산 물건 수를 보여 줘",
    cards: ["SELECT c.name, SUM(oi.qty)", "FROM customers c", "JOIN orders o", "ON o.customer_id = c.customer_id",
      "JOIN order_items oi", "ON oi.order_id = o.order_id", "GROUP BY c.name", "ORDER BY 2 DESC, 1"],
    extra: ["LEFT", "ORDER BY 2"], tables: ["customers", "orders", "order_items"],
    hints: ["세 표를 이어요.", "JOIN 카드가 필요해요."], explain: "주문을 거쳐 손님과 주문 내역을 이어요.",
  };
  const mod = { CHAPTER: { id: 17, title: "시험" }, LESSONS: [{ id: "17-1", chapter: 17, title: "시험", goal: "시험", summary: ["가", "나", "다"], cards: [{ say: "시험" }], items: [item] }] };
  try {
    const issues = checkChapter(mod, 17, e, { concepts: [{ id: "select", name: "고르기", chapter: 1 }] });
    assert.ok(e.stats.timeouts >= 1, "drop-one 변형 중 시간 초과가 있어야 시험이 뜻이 있음");
    const drop = issues.filter((i) => i.rule === "drop-one");
    assert.deepEqual(drop, [], show(drop));
  } finally { e.close(); }
});

// ---- 작업 11: 매일 도전 틀(templates) ----
const tplMod = (templates) => ({ ...good, TEMPLATES: templates });
const tplIssues = (templates, chapter = 5) => checkChapter(tplMod(templates), chapter, engine, { concepts: good.CONCEPTS })
  .filter((i) => i.where.startsWith("틀"));   // 틀 문제점의 where는 「틀 5-T1」·「틀 5-T1 씨앗 3」 모양
const T1 = good.TEMPLATES[0];

test("templates: every seed 0..99 of the good templates becomes an item (stats count retries)", () => {
  const stats = {};
  const issues = checkChapter(good, 5, engine, { concepts: good.CONCEPTS, stats });
  assert.deepEqual(issues, [], show(issues));
  assert.equal(stats.templates, 3);
  assert.equal(stats.seeds, 300);
  assert.ok(stats.retried >= 0 && stats.retried < 300, JSON.stringify(stats));
});

test("templates: template SQL must pass the engine guard and the chapter grammar", () => {
  const guard = tplIssues([{ ...T1, id: "5-T4", sql: "SELECT name FROM items LIMIT {N}; SELECT 1" }]);
  assert.ok(guard.some((i) => i.rule === "engine-guard" && i.where.includes("5-T4")), show(guard));
  const late = tplIssues([{ ...T1, id: "5-T5", wrong: [T1.wrong[0], "SELECT name, COUNT(*) FROM items\nLIMIT {N}"] }]);
  assert.ok(late.some((i) => i.rule === "grammar" && i.where.includes("5-T5") && /COUNT/.test(i.msg)), show(late));
  // 같은 문제점은 씨앗마다 되풀이하지 않고 한 번만
  assert.equal(late.filter((i) => i.rule === "grammar").length, 1, show(late));
  const write = tplIssues([{ ...T1, id: "5-T6", wrong: [T1.wrong[0], "DELETE FROM items"] }]);
  assert.ok(write.some((i) => i.rule === "readonly" && i.where.includes("5-T6")), show(write));
});

test("templates: shape mistakes are reported under templates", () => {
  const cases = [
    [{ ...T1, id: "6-T1" }, /id/],
    [{ ...T1, id: "5-T1", vars: { N: { min: 2, max: 5 }, M: [1, 2] } }, /M/],              // 쓰지 않는 값
    [{ ...T1, id: "5-T1", q: "{Q} 표는?" }, /\{Q\}/],                                    // 모르는 자리 표시
    [{ ...T1, id: "5-T1", wrong: [T1.wrong[0]] }, /wrong/],                               // 오답 1개
    [{ ...T1, id: "5-T1", code: "SELECT 1" }, /code/],                                    // 리아 시절 칸
    [{ ...T1, id: "5-T1", concept: "nope" }, /개념/],
    [{ ...T1, id: "5-T1", vars: { N: ["a'b", "c"] } }, /따옴표/],
    [{ ...T1, id: "5-T1", tables: ["nope"] }, /nope/],
  ];
  for (const [t, re] of cases) {
    const issues = tplIssues([t]);
    assert.ok(issues.some((i) => i.rule === "templates" && re.test(`${i.where} ${i.msg}`)), `${re}\n${show(issues)}`);
  }
  const dup = tplIssues([T1, { ...T1 }]);
  assert.ok(dup.some((i) => i.rule === "templates" && /겹침/.test(i.msg)), show(dup));
  const blank = tplIssues([{ ...good.TEMPLATES[2], id: "5-T3", sql: "SELECT name FROM items LIMIT {N}" }]);
  assert.ok(blank.some((i) => i.rule === "templates" && /___/.test(i.msg)), show(blank));
});

test("templates: a broken answer or a seed that always collides is reported with the seed", () => {
  const broken = tplIssues([{ ...T1, sql: "SELECT nam FROM items\nLIMIT {N}" }]);
  assert.ok(broken.some((i) => i.rule === "templates" && /씨앗 0/.test(i.where) && /정답 SQL/.test(i.msg)), show(broken));
  const empty = tplIssues([{ ...T1, sql: "SELECT name FROM items\nWHERE price < 0\nLIMIT {N}" }]);
  assert.ok(empty.some((i) => i.rule === "templates" && /0행/.test(i.msg)), show(empty));
  const same = tplIssues([{ ...T1, wrong: [T1.sql.replace("DESC, item_id", "DESC, item_id ASC"), T1.wrong[1]] }]);
  assert.ok(same.some((i) => i.rule === "templates" && /다섯|5번/.test(i.msg)), show(same));
  // 씨앗마다 같은 말을 되풀이하지 않음
  assert.ok(same.filter((i) => i.rule === "templates").length <= 2, show(same));
});

test("templates: a chapter needs 2..5 templates (shape, 작업 12a 고침 1회차)", () => {
  const count = (templates) => checkChapter({ ...good, TEMPLATES: templates }, 5, engine, { concepts: good.CONCEPTS })
    .filter((i) => i.rule === "shape" && i.where === "ch5 TEMPLATES");
  assert.equal(count([T1]).length, 1, "틀 1개는 모자람");
  assert.equal(count(undefined).length, 1, "틀이 없으면 모자람");
  assert.equal(count(good.TEMPLATES).length, 0, "틀 3개는 괜찮음");
  assert.match(count([T1])[0].msg, /2~5개/);
});

// ---- 보기 전용 비교 카드 (판정 R30, 16장): show는 실행하지 않는다 ----
// 좋은 5장의 카드 하나짜리 레슨에 show 카드를 더해 점검한다(장 번호 5: 날짜 함수도 아직 안 배운 때).
function withShowCard(card) {
  const lessons = good.LESSONS.map((l) => ({ ...l, cards: l.cards.slice() }));
  const target = lessons.find((l) => l.cards.length === 1);
  target.cards.push({ say: "다른 데이터베이스에서는 이렇게 써요. 이 장터에서는 돌지 않아요.", ...card });
  return { mod: { ...good, LESSONS: lessons }, lid: target.id };
}

test("show card: grammar, engine-guard and answer-runs skip show (MySQL/PostgreSQL names are fine)", () => {
  const code = "SELECT DATE_FORMAT(d, '%Y-%m')\n  AS month, DATEDIFF(a, b) AS days,\n  ordered_on - INTERVAL '7 days'\nFROM orders\nGROUP BY month;\nSELECT TO_CHAR(d, 'YYYY-MM')";
  const { mod } = withShowCard({ show: code, dialect: "MySQL" });
  const issues = checkChapter(mod, 5, engine, { concepts: good.CONCEPTS });
  assert.deepEqual(issues, [], show(issues));
});

test("show card: lines still obey the SQL column limit, and data-changing words are still caught", () => {
  const long = withShowCard({ show: "SELECT TO_CHAR(ordered_on, 'YYYY-MM') AS month_key\nFROM orders", dialect: "PostgreSQL" });
  const wide = checkChapter(long.mod, 5, engine, { concepts: good.CONCEPTS });
  assert.ok(wide.some((i) => i.rule === "shape" && i.where.startsWith(long.lid) && /넓음/.test(i.msg)), show(wide));
  const del = withShowCard({ show: "DELETE FROM orders", dialect: "MySQL" });
  const ro = checkChapter(del.mod, 5, engine, { concepts: good.CONCEPTS });
  assert.ok(ro.some((i) => i.rule === "readonly" && i.where.startsWith(del.lid)), show(ro));
});

test("show card: dialect outside the list and show together with sql are shape issues", () => {
  const bad1 = withShowCard({ show: "SELECT 1", dialect: "Oracle" });
  assert.ok(checkChapter(bad1.mod, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && /dialect/.test(i.msg)));
  const bad2 = withShowCard({ show: "SELECT 1", dialect: "MySQL", sql: "SELECT 1" });
  assert.ok(checkChapter(bad2.mod, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && /show/.test(i.msg)));
});

// 작업 16(버그 B1 넘김): iPhone 17e에서 순서 문제의 놓은 줄은 33칸, 코드 모양 글자 보기는 31칸까지 한 줄(flow.py가 잼)
test("phone widths: placed order lines ≤ ORDER_COLS, code-like text options ≤ OPT_COLS, prose options free", async () => {
  const { ORDER_COLS, OPT_COLS } = await import("../content.js");
  assert.equal(ORDER_COLS, 33);
  assert.equal(OPT_COLS, 31);
  const mod = structuredClone({ CHAPTER: good.CHAPTER, LESSONS: good.LESSONS, TEMPLATES: good.TEMPLATES });
  const items = mod.LESSONS.flatMap((l) => l.items);
  const ord = items.find((it) => it.type === "order");
  const ch = items.find((it) => it.type === "choice" && it.options.every((o) => typeof o === "string"));
  assert.ok(ord && ch, "good fixture needs an order item and a text choice item");
  const longLine = "SELECT name, price " + "x".repeat(ORDER_COLS - 18);       // 34칸
  ord.lines = [...ord.lines.slice(0, -1), ord.lines[ord.lines.length - 1].padEnd(ORDER_COLS, " ")];  // 33칸 끝 공백은 통과
  const fine = checkChapter(mod, 5, engine, { concepts: good.CONCEPTS }).filter((i) => /놓은 줄|코드 보기/.test(i.msg));
  assert.deepEqual(fine, [], show(fine));
  ord.lines = [...ord.lines.slice(0, -1), longLine];
  ch.options = ["SELECT name FROM shops WHERE x = 1", "가게 이름을 고르고 값이 큰 차례로 줄 세워 셋만 보여 주는 한국어 문장 보기", ...ch.options.slice(2)];
  const issues = checkChapter(mod, 5, engine, { concepts: good.CONCEPTS }).filter((i) => /놓은 줄|코드 보기/.test(i.msg));
  const msgs = issues.map((i) => i.msg).join("\n");
  assert.match(msgs, new RegExp(`놓은 줄 ${ORDER_COLS + 1}칸 > ${ORDER_COLS}칸`));
  assert.match(msgs, new RegExp(`코드 보기 34칸 > ${OPT_COLS}칸`));
  // 시험용 장은 같은 문제를 여러 레슨이 함께 쓰므로 같은 글이 여러 번 나올 수 있다. 다른 글은 둘뿐(한국어 문장 보기는 걸리지 않음)
  assert.equal(new Set(issues.map((i) => i.msg)).size, 2, show(issues));
});

// ---- v0.2 작업 1: 심화 레슨(ADVANCED, N-A1~N-A3) ----
// 심화 레슨은 본 과정과 같은 규칙을 받되(장 평가가 아님), 쓰는 낱말은 GRAMMAR[1..N] + ADVANCED_GRAMMAR[N].
// 문제점의 where는 「N-Ak …」.
const advMod = (patch) => {
  const m = structuredClone({ CHAPTER: good.CHAPTER, LESSONS: good.LESSONS, ADVANCED: good.ADVANCED, TEMPLATES: good.TEMPLATES });
  patch(m);
  return m;
};
const advConcepts = [...good.CONCEPTS,
  { id: "adv_c1", name: "심화 시험 1장", chapter: 1, advanced: true },
  { id: "adv_c6", name: "심화 시험 6장", chapter: 6, advanced: true }];
const issuesAt = (mod, chapter, id) => checkChapter(mod, chapter, engine, { concepts: advConcepts }).filter((i) => i.where.includes(id));
const touch = (id, code, more = {}) => ({ type: "choice", id, concept: "select", q: "이 SQL의 결과는 무엇일까요?", code,
  options: ["1", "0", "7"], answer: 0, explain: "시험용 문제예요.", ...more });

test("advanced lessons checked: the good fixture's 3 advanced lessons have no issues", () => {
  assert.equal(good.ADVANCED.length, 3);
  assert.deepEqual(good.ADVANCED.map((l) => l.id), ["5-A1", "5-A2", "5-A3"]);
  assert.ok(good.ADVANCED.some((l) => !("isAdvanced" in l)), "isAdvanced가 없는 심화도 고정 파일에 있어야 함(빠져도 됨)");
  const issues = checkChapter(good, 5, engine, { concepts: good.CONCEPTS });
  assert.deepEqual(issues, [], show(issues));
  // 심화 레슨도 실제로 점검한다: 심화 조립 문제 정답을 망가뜨리면 5-A1에서 잡힘
  const broken = advMod((m) => { m.ADVANCED[0].items.find((it) => it.type === "build").cards[3] = "shop"; });
  const hit = checkChapter(broken, 5, engine, { concepts: good.CONCEPTS });
  assert.ok(hit.some((i) => i.rule === "answer-runs" && i.where.startsWith("5-A1")), show(hit));
});

test("advanced shape: count, id/chapter, isExam", () => {
  const two = advMod((m) => { m.ADVANCED.pop(); });
  const a = checkChapter(two, 5, engine, { concepts: good.CONCEPTS });
  assert.ok(a.some((i) => i.rule === "shape" && i.where === "ch5 ADVANCED" && /3개/.test(i.msg)), show(a));
  // 5-A1이 4장 파일에 있으면 id·chapter가 틀림
  const ch4 = checkChapter(good, 4, engine, { concepts: good.CONCEPTS }).filter((i) => i.rule === "shape" && i.where.startsWith("5-A"));
  assert.ok(ch4.some((i) => /4-A1/.test(i.msg)), show(ch4));
  const exam = advMod((m) => { m.ADVANCED[1].isExam = true; });
  const e = checkChapter(exam, 5, engine, { concepts: good.CONCEPTS });
  assert.ok(e.some((i) => i.rule === "shape" && i.where.startsWith("5-A2") && /isExam/.test(`${i.where} ${i.msg}`)), show(e));
  const notAdv = advMod((m) => { m.ADVANCED[0].isAdvanced = false; });
  assert.ok(checkChapter(notAdv, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && i.where.startsWith("5-A1") && /isAdvanced/.test(`${i.where} ${i.msg}`)));
  const swapped = advMod((m) => { [m.ADVANCED[0], m.ADVANCED[1]] = [m.ADVANCED[1], m.ADVANCED[0]]; });
  assert.ok(checkChapter(swapped, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && /5-A1이어야/.test(i.msg)));
  // 문제 수·조립 수는 본 과정 같은 장(장 평가 아님)과 같은 한도
  const short = advMod((m) => { m.ADVANCED[2].items.splice(0, 2); });
  assert.ok(checkChapter(short, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && i.where === "5-A3 items" && /10~14/.test(i.msg)));
  const twoBuilds = advMod((m) => { const l = m.ADVANCED[2]; const b = l.items.find((it) => it.type === "build"); l.items.splice(l.items.indexOf(b), 0, { ...b, id: "g5a-extra-build" }); });
  assert.ok(checkChapter(twoBuilds, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && i.where === "5-A3 items" && /build는 1~1개/.test(i.msg)));
  // 없으면 괜찮고(7~17장), 목록이 아니면 문제
  const none = advMod((m) => { delete m.ADVANCED; });
  assert.ok(!checkChapter(none, 5, engine, { concepts: good.CONCEPTS }).some((i) => /ADVANCED/.test(i.where)));
  const notList = advMod((m) => { m.ADVANCED = {}; });
  assert.ok(checkChapter(notList, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && i.where === "ch5 ADVANCED"));
  // 문제 id는 본 과정과 심화를 통틀어 겹치지 않음
  const dupId = advMod((m) => { m.ADVANCED[0].items.find((it) => it.type === "build").id = "g5-top5"; });
  assert.ok(checkChapter(dupId, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.rule === "shape" && i.where.startsWith("5-A1") && /겹침/.test(i.msg)));
});

test("advanced rules: planted faults in the bad fixture's advanced lessons are caught at N-Ak", () => {
  assert.ok(bad.ADV_BAD.length >= 7, "심화에 심은 곳이 있어야 함");
  const issues = checkChapter(bad, 5, engine, { concepts: bad.CONCEPTS });
  const missing = bad.ADV_BAD.filter(([rule, lid, where]) =>
    !issues.some((i) => i.rule === rule && i.where.startsWith(lid) && `${i.where} ${i.msg}`.includes(where)));
  assert.deepEqual(missing, [], `빠진 곳:\n${missing.map((m) => m.join(" @ ")).join("\n")}\n\n나온 것:\n${show(issues)}`);
  const rules = new Set(bad.ADV_BAD.map(([r]) => r));
  for (const r of ["answer-runs", "drop-one", "swap-extra", "bank-size", "stable-order", "grammar", "shape"]) assert.ok(rules.has(r), r);
  // R48: 심화에서도 정답 카드에 카드를 더 놓은 조립은 앱이 extra로 막으므로 점검기 문제가 아님
  assert.ok(!issues.some((i) => i.where.includes("bad-adv-insert")), show(issues.filter((i) => i.where.includes("bad-adv-insert"))));
});

test("advanced words: ADVANCED_GRAMMAR shape (uppercase, not in GRAMMAR or UNTAUGHT, OFFSET is main)", () => {
  const AG = grammar.ADVANCED_GRAMMAR;
  assert.ok(AG && typeof AG === "object", "data/grammar.js가 ADVANCED_GRAMMAR를 내보냄");
  assert.deepEqual(AG[1], ["--"]);
  assert.deepEqual(AG[2], ["%"]);
  assert.deepEqual(AG[4], []);
  assert.deepEqual(AG[5], []);
  assert.deepEqual(AG[6], ["NULLIF"]);
  const main = new Set(Object.values(GRAMMAR).flat());
  for (const [ch, ws] of Object.entries(AG)) {
    for (const w of ws) {
      assert.equal(w, w.toUpperCase());
      assert.ok(!main.has(w), `${w}(${ch}장 심화)는 본 과정 낱말이 아님`);
      assert.ok(!UNTAUGHT.includes(w), `${w}는 심화에서 가르치므로 UNTAUGHT에서 뺌`);
    }
  }
  assert.ok(main.has("OFFSET") && !Object.values(AG).flat().includes("OFFSET"), "OFFSET은 5장 본 과정 낱말");
  assert.ok(SQL_WORDS.has("NULLIF"), "NULLIF도 검사하는 낱말");
});

test("advanced words allowed only in advanced: % in chapter 2", () => {
  const pct = (i) => i.rule === "grammar" && /%/.test(i.msg);
  const inAdv = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-mod-q", "SELECT 7 % 2 AS r")); });
  assert.deepEqual(issuesAt(inAdv, 2, "adv-mod-q").filter(pct), []);
  const inMain = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-mod-q", "SELECT 7 % 2 AS r")); });
  const hit = issuesAt(inMain, 2, "adv-mod-q").filter(pct);
  assert.ok(hit.length && /심화/.test(hit[0].msg), show(hit));
  const tpl = advMod((m) => { m.TEMPLATES = [{ id: "2-T1", concept: "select", type: "choice", q: "나머지를 구하는 SQL이에요. 알맞은 표는?",
    sql: "SELECT {N} % 2 AS r", wrong: ["SELECT {N} AS r", "SELECT 2 AS r"], vars: { N: { min: 3, max: 9 } }, explain: "나머지를 구해요." }, m.TEMPLATES[1]]; });
  const th = checkChapter(tpl, 2, engine, { concepts: advConcepts }).filter((i) => i.where.startsWith("틀 2-T1") && pct(i));
  assert.ok(th.length, "2장 틀의 %는 grammar");
  // 3장 심화에서는 2장 심화 낱말 %를 쓰지 않음(심화는 고를 수 있어 2장 심화를 건너뛴 학습자가 있음)
  assert.ok(issuesAt(inAdv, 3, "adv-mod-q").some(pct));
  // 글자 보기(prose)의 「50%」와 LIKE 무늬 '%방'은 그대로 괜찮음
  const prose = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-prose-q", "SELECT name FROM shops WHERE name LIKE '%방'", { options: ["50% 할인", "2곳", "3곳"], answer: 1, q: "이 SQL의 결과는 몇 행일까요?" })); });
  assert.deepEqual(issuesAt(prose, 4, "adv-prose-q").filter(pct), []);
});

test("advanced words do not leak: -- (1장 심화) and NULLIF (6장 심화)", () => {
  const cmt = (i) => i.rule === "grammar" && /--/.test(i.msg);
  const sql = "SELECT 1 AS r -- 하나";
  const main3 = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-cmt-q", sql)); });
  const hit = issuesAt(main3, 3, "adv-cmt-q").filter(cmt);
  assert.ok(hit.length && /1장 심화/.test(hit[0].msg), show(hit));
  const adv1 = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-cmt-q", sql)); });
  assert.deepEqual(issuesAt(adv1, 1, "adv-cmt-q").filter(cmt), []);
  assert.ok(issuesAt(adv1, 2, "adv-cmt-q").some(cmt), "2장 심화는 1장 심화 낱말을 쓰지 않음");
  // 주석이 설명 카드에 있어도(본 과정) 잡힘, 블록 주석 /* */은 어디서나 가르치지 않음
  const card = advMod((m) => { m.LESSONS[0].cards[0].sql = "SELECT name FROM items -- 물건\nORDER BY price DESC\nLIMIT 5"; });
  assert.ok(checkChapter(card, 5, engine, { concepts: good.CONCEPTS }).some((i) => i.where === "5-1 cards[0]" && cmt(i)));
  const block = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-block-q", "SELECT 1 AS r /* 하나 */")); });
  assert.ok(issuesAt(block, 1, "adv-block-q").some((i) => i.rule === "grammar" && /\/\*/.test(i.msg)));
  // NULLIF: 6장 심화만
  const nsql = "SELECT NULLIF(1, 0) AS r";
  const nf = (i) => i.rule === "grammar" && /NULLIF/.test(i.msg);
  const adv6 = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-nullif-q", nsql)); });
  assert.deepEqual(issuesAt(adv6, 6, "adv-nullif-q").filter(nf), []);
  const main6 = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-nullif-q", nsql)); });
  assert.ok(issuesAt(main6, 6, "adv-nullif-q").some(nf));
  assert.ok(issuesAt(main6, 17, "adv-nullif-q").some(nf), "본 과정은 뒷장에서도 심화 전용 낱말을 쓰지 않음");
  assert.ok(issuesAt(adv6, 5, "adv-nullif-q").some(nf), "5장 심화는 6장 심화 낱말을 쓰지 않음");
});

test("advanced words in code-looking text options are checked too (-- and %)", () => {
  const cmt = (i) => i.rule === "grammar" && /--/.test(i.msg);
  const pct = (i) => i.rule === "grammar" && /%/.test(i.msg);
  const opt = (a) => ({ options: a, answer: 0, q: "FROM 없는 SELECT는 어느 것일까요?" });
  // 본 과정의 글자 보기가 SQL 모양이면(한글 없음) 심화 전용 주석·% 가 잡힌다
  const main = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-opt-cmt", undefined, opt(["SELECT 1 -- x", "SELECT 2", "SELECT 3"]))); delete m.LESSONS[0].items[0].code; });
  assert.ok(issuesAt(main, 3, "adv-opt-cmt").some(cmt), show(issuesAt(main, 3, "adv-opt-cmt")));
  const mainPct = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-opt-pct", undefined, opt(["SELECT 7 % 2", "SELECT 7", "SELECT 2"]))); delete m.LESSONS[0].items[0].code; });
  assert.ok(issuesAt(mainPct, 3, "adv-opt-pct").some(pct), show(issuesAt(mainPct, 3, "adv-opt-pct")));
  // 같은 보기가 그 장 심화 레슨에서는 괜찮고, 한국어 문장 속 「50%」·「--」 설명은 걸리지 않는다
  const adv = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-opt-cmt", undefined, opt(["SELECT 1 -- x", "SELECT 2", "SELECT 3"]))); delete m.ADVANCED[0].items[0].code; });
  assert.deepEqual(issuesAt(adv, 1, "adv-opt-cmt").filter(cmt), []);
  const prose = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-opt-prose", undefined, opt(["50% 할인", "-- 는 메모", "3곳"]))); delete m.LESSONS[0].items[0].code; });
  assert.deepEqual(issuesAt(prose, 3, "adv-opt-prose").filter((i) => cmt(i) || pct(i)), []);
});

test("advanced concept in main: advanced concepts only in advanced lessons (and not from a later chapter)", () => {
  const sh = (i) => i.rule === "shape" && /adv_c1/.test(i.msg);
  const main = advMod((m) => { m.LESSONS[0].items.unshift(touch("adv-concept-q", "SELECT 1 AS r", { concept: "adv_c1" })); });
  assert.ok(issuesAt(main, 5, "adv-concept-q").some((i) => sh(i) && /심화 개념/.test(i.msg)));
  const adv = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-concept-q", "SELECT 1 AS r", { concept: "adv_c1" })); });
  assert.deepEqual(issuesAt(adv, 5, "adv-concept-q").filter((i) => i.rule === "shape"), []);
  const later = advMod((m) => { m.ADVANCED[0].items.unshift(touch("adv-concept-q", "SELECT 1 AS r", { concept: "adv_c6" })); });
  assert.ok(issuesAt(later, 5, "adv-concept-q").some((i) => i.rule === "shape" && /6장/.test(i.msg)));
  // data/concepts.js: 1~6장 심화 개념(advanced: true)이 장마다 있고 응용 개념 adv_apply_N이 있음
  for (let n = 1; n <= 6; n++) {
    const mine = DATA_CONCEPTS.filter((c) => c.advanced === true && c.chapter === n);
    assert.ok(mine.length >= 2, `${n}장 심화 개념`);
    assert.ok(mine.some((c) => c.id === `adv_apply_${n}`), `adv_apply_${n}`);
    for (const c of mine) assert.ok(c.id.startsWith("adv_") && c.name && [...c.name].length <= 16, JSON.stringify(c));
  }
  assert.equal(new Set(DATA_CONCEPTS.map((c) => c.id)).size, DATA_CONCEPTS.length, "개념 id가 겹치지 않음");
});

test("comment card does not swallow next card (cardsToSql, hasOrderBy, read-only guard, tie-break)", () => {
  const tail = cardsToSql(["SELECT", "1 + 1 AS n", "-- 계산"]);
  assert.equal(tail, "SELECT 1 + 1 AS n -- 계산");
  assert.deepEqual(engine.run(tail).rows, [[2]]);
  const mid = cardsToSql(["SELECT", "-- 계산", "1 + 1 AS n"]);
  assert.equal(mid, "SELECT -- 계산\n1 + 1 AS n", "주석 카드 뒤는 줄바꿈으로 이음");
  const r = engine.run(mid);
  assert.equal(r.error, null);
  assert.deepEqual(r.rows, [[2]]);
  assert.ok(checkReadOnly(mid));
  assert.ok(checkReadOnly(cardsToSql(["-- 먼저 설명", "SELECT", "1 AS n"])), "주석으로 시작해도 SELECT 문장 하나");
  assert.equal(hasOrderBy(cardsToSql(["SELECT", "name", "FROM", "shops", "-- 정렬", "ORDER", "BY", "name"])), true);
  assert.equal(hasOrderBy("SELECT name FROM shops -- ORDER BY name"), false);
  // 글자 상수 안의 --는 주석이 아님 → 줄바꿈 없음
  assert.equal(cardsToSql(["SELECT", "'a--b'", "AS", "s"]), "SELECT 'a--b' AS s");
  assert.equal(cardsToSql(["SELECT", "name", "FROM", "shops"]), "SELECT name FROM shops", "주석 없는 조립은 그대로");
  // 동점 검사(stable-order)용 꼬리는 끝 주석 안으로 들어가지 않는다
  assert.equal(withTieBreak("SELECT a FROM t ORDER BY a -- 정렬", ", 1"), "SELECT a FROM t ORDER BY a , 1 -- 정렬");
  assert.equal(withTieBreak("SELECT a FROM t ORDER BY a -- 정렬\nLIMIT 3", ", 1"), "SELECT a FROM t ORDER BY a , 1 -- 정렬\nLIMIT 3");
  assert.equal(withTieBreak("SELECT a FROM t ORDER BY a;", ", 1"), "SELECT a FROM t ORDER BY a , 1 ;");
});

test("comment card in a chapter-1 advanced build: one card, needs `need`, and the whole build passes", () => {
  const b = { type: "build", id: "adv-cmt-build", concept: "select", q: "가게 장부 전체에 설명을 달아 보여 줘",
    cards: ["SELECT", "*", "FROM", "shops", "-- 가게 장부"], extra: ["items", "name"], need: ["-- 가게 장부"], tables: ["shops"],
    hints: ["가게 장부 전체를 펼쳐요.", "끝에 주석 카드를 붙여요."], explain: "주석은 결과를 바꾸지 않고 설명만 달아요." };
  const ok = advMod((m) => { const l = m.ADVANCED[0]; const k = l.items.findIndex((it) => it.type === "build"); l.items[k] = b; });
  assert.deepEqual(issuesAt(ok, 1, "adv-cmt-build"), [], show(issuesAt(ok, 1, "adv-cmt-build")));
  // need가 없으면 주석 카드를 빼도 같은 결과 → drop-one
  const noNeed = advMod((m) => { const l = m.ADVANCED[0]; const k = l.items.findIndex((it) => it.type === "build"); const { need, ...rest } = b; l.items[k] = rest; });
  assert.ok(issuesAt(noNeed, 1, "adv-cmt-build").some((i) => i.rule === "drop-one"));
});

// 판정 R51: 1~5장 심화 조립은 R38 구절 카드(1~3토큰, 30칸 이하)를 쓸 수 있다. 본 과정은 5장까지 카드 하나에 낱말 하나 그대로
test("R51: chapter 1-5 advanced builds may use 1-3 token phrase cards; main lessons may not", () => {
  const b = { type: "build", id: "adv-phrase-build", concept: "select", q: "물건 이름과 값을 2로 나눈 나머지를 보여 줘",
    cards: ["SELECT", "name", ",", "price % 2", "FROM", "items"], extra: ["price / 2", "stock % 2"], tables: ["items"],
    hints: ["이름 옆에 나머지 열을 하나 더 만들어요.", "% 카드가 든 구절 카드를 놓아요."], explain: "price % 2는 값을 2로 나눈 나머지예요." };
  const put = (list) => (m) => { const l = m[list][0]; const k = l.items.findIndex((it) => it.type === "build"); l.items[k] = structuredClone(b); };
  const adv = issuesAt(advMod(put("ADVANCED")), 2, "adv-phrase-build");
  assert.deepEqual(adv, [], show(adv));
  const main = issuesAt(advMod(put("LESSONS")), 2, "adv-phrase-build").filter((i) => i.rule === "bank-size");
  assert.ok(main.some((i) => /카드 하나에 낱말 하나/.test(i.msg) && /price % 2/.test(i.msg)), show(main));
  // 심화도 3토큰을 넘는 카드는 bank-size
  const long = advMod((m) => { put("ADVANCED")(m); const l = m.ADVANCED[0]; l.items.find((it) => it.id === "adv-phrase-build").extra = ["price % 2 + 1", "stock % 2"]; });
  assert.ok(issuesAt(long, 2, "adv-phrase-build").some((i) => i.rule === "bank-size" && /price % 2 \+ 1/.test(i.msg)));
});

test("blank: a code with a literal '___' pattern besides the blank marker is reported (the screen splits on ___)", () => {
  const lit = { type: "blank", concept: "distinct", q: "세 글자 이름 손님의 마을을 한 번씩만 보이게 채워 보세요",
    code: "SELECT ___ village\nFROM customers\nWHERE name LIKE '___'", chips: ["DISTINCT", "ORDER", "LIMIT"], answer: 0,
    explain: "DISTINCT는 SELECT 바로 뒤에 써요." };
  let swapped = 0;
  const mod = { ...good, LESSONS: good.LESSONS.map((l) => ({ ...l,
    items: l.items.map((it) => (it.type === "blank" && /village/.test(it.code) ? (swapped++, lit) : it)) })) };
  assert.ok(swapped > 0);
  const issues = checkChapter(mod, 5, engine, { concepts: good.CONCEPTS });
  assert.ok(issues.some((i) => i.rule === "shape" && /___/.test(i.msg) && /정확히 하나/.test(i.msg)), show(issues));
});
