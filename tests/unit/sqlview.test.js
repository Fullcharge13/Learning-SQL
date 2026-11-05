// 작업 7: 결과 표 채우기 — 화면을 떠난 뒤 끝난 실행은 아무것도 그리지 않는다
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillResults, whenEngine, FAIL_LINE } from "../../src/ui/sqlview.js";

function fakeSql(status = "loading") {
  const ls = new Set();
  const sql = {
    status, ran: [],
    listen(fn) { ls.add(fn); return () => ls.delete(fn); },
    preload() { return Promise.resolve(); },
    set(s) { sql.status = s; for (const f of [...ls]) f(s); },
    run(q) { sql.ran.push(q); return Promise.resolve({ columns: ["n"], rows: [[1]], error: null }); },
  };
  return sql;
}
const node = (q) => ({ dataset: { sql: q, box: "card" }, innerHTML: "loading", isConnected: true, closest: () => null });
const root = (nodes) => ({ querySelectorAll: () => nodes });
const tick = () => new Promise((r) => setTimeout(r, 5));

test("fill waits for the engine then paints", async () => {
  const sql = fakeSql("loading"), n = node("SELECT 1");
  fillResults(root([n]), sql);
  await tick();
  assert.equal(n.innerHTML, "loading");
  sql.set("ready");
  await tick();
  assert.ok(n.innerHTML.includes("rtable"), n.innerHTML);
});

test("stopped fill paints nothing even if the engine becomes ready later", async () => {
  const sql = fakeSql("loading"), n = node("SELECT 1");
  const stop = fillResults(root([n]), sql);
  stop();
  sql.set("ready");
  await tick();
  assert.equal(n.innerHTML, "loading");
  assert.deepEqual(sql.ran, []);
});

test("stop during a run keeps the node untouched", async () => {
  const sql = fakeSql("ready"), n = node("SELECT 1");
  const stop = fillResults(root([n]), sql);
  stop();
  await tick();
  assert.equal(n.innerHTML, "loading");
});

test("failed engine shows the note, or calls onFailed", async () => {
  const a = node("SELECT 1"), b = node("SELECT 2");
  fillResults(root([a]), fakeSql("failed"));
  let seen = null;
  fillResults(root([b]), fakeSql("failed"), { onFailed: (x) => { seen = x; } });
  await tick();
  assert.ok(a.innerHTML.includes(FAIL_LINE));
  assert.equal(seen, b);
  assert.equal((await whenEngine(null).promise), false);
});

// ---- 작업 11 고침 1회차: 객관식 보기가 정답을 드러내지 않음 ----
import { choiceOptionHTML, choiceOptionFailed, optionsShowCode, answerFeedbackHTML, OPT_FAIL_LINE } from "../../src/ui/sqlview.js";
import { ERROR_OPTION } from "../../src/template.js";

const CODE = "SELECT name FROM shops\nWHERE shop_id <= 2";
const R = (rows) => ({ columns: ["name"], rows: rows.map((v) => [v]), error: null, truncated: false });
// 화면에 보이는 글자: 태그를 지우고(속성 값은 보이지 않음) 공백을 하나로
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const flat = (s) => s.replace(/\s+/g, " ").trim();
function optNode(i, sql) {
  const btn = { dataset: { i: String(i) }, classList: { add() {} }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  return {
    dataset: { sql, box: "opt" }, innerHTML: "", textContent: "", isConnected: true,
    classList: { list: [], add(c) { this.list.push(c); } },
    closest: () => btn, btn,
    get shown() { return this.textContent || visible(this.innerHTML); },
  };
}

test("daily template options carry their tables: drawn at once, nothing left for the engine to fill", () => {
  const opts = [{ sql: CODE, result: R(["도깨비 국밥집", "여우골 떡방"]) }, { sql: "SELECT name FROM items\nWHERE item_id <= 2", result: R(["국밥", "수육"]) }, ERROR_OPTION];
  const html = opts.map((o, i) => choiceOptionHTML(o, i)).join("");
  assert.equal((html.match(/class="rtable"/g) || []).length, 2, html);
  assert.doesNotMatch(html, /sql-result"[^>]*data-sql=|data-sql="[^"]*"[^>]*data-box/, "no slot for fillResults → the SQL is never run or shown again");
  assert.ok(!visible(html).includes(flat(CODE)) && !visible(html).includes("SELECT"), visible(html));
  assert.ok(visible(html).includes("도깨비 국밥집") && visible(html).includes(ERROR_OPTION));
});

test("fake failed engine: drawn options never show SQL text equal to the question code", async () => {
  // 레슨 객관식(결과 표 없이 { sql }만): 정답 보기 SQL이 문제 code와 같다
  const opts = [{ sql: CODE }, { sql: "SELECT name FROM items\nWHERE item_id <= 2" }, { sql: "SELECT owner FROM shops\nWHERE shop_id <= 2" }];
  assert.equal(optionsShowCode(opts, CODE), true);
  assert.equal(optionsShowCode(opts, "SELECT name   FROM shops WHERE shop_id <= 2"), true, "whitespace does not matter");
  assert.equal(optionsShowCode(opts, "SELECT 1"), false);
  assert.equal(optionsShowCode(["가", "나"], CODE), false);
  const nodes = opts.map((o, i) => optNode(i, o.sql));
  const hide = optionsShowCode(opts, CODE);
  fillResults(root(nodes), fakeSql("failed"), { onFailed: (n) => choiceOptionFailed(n, hide) });
  await tick();
  for (const n of nodes) {
    assert.ok(n.shown.length > 0, "something is drawn");
    assert.ok(!flat(n.shown).includes(flat(CODE)), `option shows the answer SQL: ${n.shown}`);
    assert.doesNotMatch(n.shown, /SELECT/, "no option SQL at all (else the odd one out is the answer)");
    assert.ok(n.shown.includes(OPT_FAIL_LINE), n.shown);
    assert.ok(!String(n.btn.attrs["aria-label"]).includes("SELECT"), n.btn.attrs["aria-label"]);
  }
  // 문제 code와 같은 보기가 없으면 예전처럼 SQL 글자로 대신 보여 준다(그대로 풀 수 있음)
  const other = optNode(0, "SELECT name FROM items");
  fillResults(root([other]), fakeSql("failed"), { onFailed: (n) => choiceOptionFailed(n, false) });
  await tick();
  assert.equal(other.textContent, "SELECT name FROM items");
});

test("choice feedback does not repeat the question's SQL: shows the answer table instead (or nothing)", () => {
  const right = { sql: CODE, result: R(["도깨비 국밥집"]) };
  const fb = answerFeedbackHTML(right, 2, CODE);
  assert.ok(fb.includes("3번 보기"), fb);
  assert.ok(!visible(fb).includes("SELECT"), fb);
  assert.ok(fb.includes("rtable") && visible(fb).includes("도깨비 국밥집"), fb);
  // 결과 표를 들고 있지 않은 레슨 보기: 화면에 그려 둔 표를 쓰고, 그것도 없으면 표 없이
  const drawn = '<div class="rtable">그린 표</div>';
  assert.ok(answerFeedbackHTML({ sql: CODE }, 0, CODE, drawn).includes("그린 표"));
  const bare = answerFeedbackHTML({ sql: CODE }, 0, CODE, null);
  assert.ok(!visible(bare).includes("SELECT") && bare.includes("1번 보기"), bare);
  // 문제 code와 다른 SQL이면 예전처럼 정답 SQL을 보여 줌, 글자 보기는 글자로
  assert.ok(visible(answerFeedbackHTML({ sql: "SELECT owner FROM shops" }, 0, CODE)).includes("SELECT owner FROM shops"));
  assert.ok(visible(answerFeedbackHTML({ sql: "SELECT owner FROM shops" }, 0, undefined)).includes("SELECT owner FROM shops"));
  assert.ok(visible(answerFeedbackHTML("WHERE", 1, undefined)).includes("WHERE"));
});
