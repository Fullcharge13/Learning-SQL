// v0.1 작업 11: 매일 도전 「틀」 엔진을 SQL로 (리아 v0.9 작업 2의 틀을 SQL 결과 표로 바꿈).
// 틀에 값을 바꿔 끼우고, 장터 데이터베이스에서 실제로 돌린 결과 표로 정답·오답 보기를 정한다.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { openMarket, execOne } from "../../src/sqlcore.js";
import { sameTable } from "../../src/grade.js";
import * as tpl from "../../src/template.js";
import {
  instantiate, runList, judgeInstance, makeTemplateItem, placeholders, optionsLookSame, mulberry32, hashStr,
  TEMPLATE_SEEDS, TEMPLATE_ATTEMPTS, ERROR_OPTION, OPT_ROWS,
} from "../../src/template.js";
import { OPT_ROWS as VIEW_OPT_ROWS } from "../../src/ui/sqlview.js";

let db;
before(async () => {
  const SQL = await initSqlJs();
  db = openMarket(SQL, readFileSync(new URL("../../data/market.sql", import.meta.url), "utf8"));
});
const engine = async (sql) => execOne(db, sql);

// 5장(줄 세우기) 모양의 시험용 틀. 실제 장 틀은 작업 12~15가 쓴다.
const CHOICE = {
  id: "5-T9", concept: "orderby", type: "choice",
  q: "비싼 물건 {N}개를 보는 SQL이에요. 결과로 알맞은 표는?",
  sql: "SELECT name, price FROM items\nORDER BY price DESC, item_id\nLIMIT {N}",
  wrong: [
    "SELECT name, price FROM items\nORDER BY price, item_id\nLIMIT {N}",
    "SELECT name, price FROM items\nLIMIT {N}",
  ],
  vars: { N: { min: 2, max: 5 } },
  explain: "DESC는 큰 값부터예요. LIMIT {N}로 앞의 {N}행만 남아요.",
};
const BLANK = {
  id: "5-T8", concept: "orderby", type: "blank",
  q: "{KIND} 손님을 나이가 많은 순서로 보이게 빈칸을 채워 보세요",
  sql: "SELECT name, age FROM customers\nWHERE kind = '{KIND}'\nORDER BY age ___, customer_id\nLIMIT 3",
  chips: ["DESC", "ASC", "LIMIT"], answer: 0,
  vars: { KIND: ["도깨비", "사람", "여우"] },
  explain: "DESC를 붙이면 나이가 많은 손님이 먼저 나와요.",
};

test("constants: 100 seeds, 5 attempts, mulberry32 still exported (R4)", () => {
  assert.equal(TEMPLATE_SEEDS, 100);
  assert.equal(TEMPLATE_ATTEMPTS, 5);
  assert.equal(typeof mulberry32, "function");
  assert.equal(typeof hashStr, "function");
  const r = mulberry32(42);
  assert.ok(r() >= 0 && r() < 1);
});

test("OPT_ROWS lives in template.js and the screen uses the same value; template.js imports nothing from src/ui/", () => {
  assert.equal(OPT_ROWS, 5);
  assert.equal(VIEW_OPT_ROWS, OPT_ROWS);
  const src = readFileSync(new URL("../../src/template.js", import.meta.url), "utf8");
  const from = [...src.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.ok(from.length > 0, "found the import lines");
  for (const f of from) assert.doesNotMatch(f, /(^|\/)ui\//, `template.js imports ${f}`);
  assert.doesNotMatch(src, /import\s*\(\s*["'][^"']*ui\//, "no dynamic import from ui/");
});

test("no Python-era exports left (OUT_KEY, print output width)", () => {
  for (const k of ["OUT_KEY", "OPTION_COLS", "textWidth"]) assert.equal(k in tpl, false, `${k} is Python-era`);
  const src = readFileSync(new URL("../../src/template.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Pyodide|stdout|stdin|print\(/);
});

test("instantiate same seed same sql", () => {
  const a = instantiate(CHOICE, 7);
  const b = instantiate(CHOICE, 7);
  assert.deepEqual(a, b);
  assert.ok(Number.isInteger(a.vals.N) && a.vals.N >= 2 && a.vals.N <= 5);
  assert.equal(a.sql, `SELECT name, price FROM items\nORDER BY price DESC, item_id\nLIMIT ${a.vals.N}`);
  assert.deepEqual(a.wrong, CHOICE.wrong.map((w) => w.replace("{N}", String(a.vals.N))));
  assert.ok(a.q.includes(`${a.vals.N}개`));
  assert.ok(a.explain.includes(`LIMIT ${a.vals.N}`));
  for (const s of [a.sql, a.q, a.explain, ...a.wrong]) assert.doesNotMatch(s, /\{[A-Z]/);
  // 다른 시도 번호는 값을 다시 뽑는다(같은 씨앗이라도)
  const tries = new Set(Array.from({ length: TEMPLATE_ATTEMPTS }, (_, k) => instantiate(CHOICE, 7, k).sql));
  assert.ok(tries.size > 1, "attempts redraw the values");
});

test("instantiate: list values stay in the list, seeds vary", () => {
  const seen = new Set();
  for (let s = 0; s < TEMPLATE_SEEDS; s++) {
    const i = instantiate(BLANK, s);
    assert.ok(["도깨비", "사람", "여우"].includes(i.vals.KIND));
    assert.ok(i.sql.includes(`kind = '${i.vals.KIND}'`));
    seen.add(i.vals.KIND);
  }
  assert.equal(seen.size, 3);
});

test("placeholders: uppercase names only (SQL words in lowercase braces are not names)", () => {
  assert.deepEqual(placeholders("SELECT {N} {x} {KIND_2} '{A}'").sort(), ["A", "KIND_2", "N"]);
});

test("runList: choice runs [answer, ...wrong], blank runs each chip filled in", () => {
  const c = instantiate(CHOICE, 1);
  assert.deepEqual(runList(c), [c.sql, ...c.wrong]);
  const b = instantiate(BLANK, 1);
  assert.deepEqual(runList(b), b.chips.map((ch) => b.sql.replace("___", ch)));
  assert.match(runList(b)[0], /ORDER BY age DESC, customer_id/);
});

// ---- judgeInstance (가짜 결과 표) ----
const T = (cols, rows) => ({ columns: cols, rows, error: null, truncated: false, timeout: false });
const E = (msg = "no such column: x") => ({ columns: [], rows: [], error: msg, truncated: false, timeout: false });
const ONE = (...vals) => T(["name"], vals.map((v) => [v]));

test("judgeInstance choice: options are {sql} result tables, answer is 0, code is the SQL", () => {
  const i = instantiate(CHOICE, 2);
  const j = judgeInstance(i, [ONE("가", "나"), ONE("다", "라"), ONE("가", "다")]);
  assert.equal(j.ok, true, j.why);
  assert.equal(j.item.type, "choice");
  // 보기마다 이미 돌린 결과 표를 함께 들고 다닌다(화면이 다시 돌리지 않음 → 실행기가 그 사이 멈춰도 SQL 글자가 보이지 않음)
  assert.deepEqual(j.item.options.map((o) => o.sql), runList(i));
  assert.deepEqual(j.item.options.map((o) => o.result.rows), [[["가"], ["나"]], [["다"], ["라"]], [["가"], ["다"]]]);
  assert.deepEqual(j.item.options[0].result.columns, ["name"]);
  assert.equal(j.item.answer, 0);
  assert.equal(j.item.code, i.sql);
  assert.equal(j.item.concept, "orderby");
  assert.equal(j.item.q, i.q);
  assert.equal(j.item.explain, i.explain);
});

test("judgeInstance choice: an erroring wrong SQL becomes the error option, two errors collide", () => {
  const i = instantiate(CHOICE, 2);
  const j = judgeInstance(i, [ONE("가"), E(), ONE("나")]);
  assert.equal(j.ok, true);
  assert.equal(j.item.options[1], ERROR_OPTION);
  assert.equal(j.item.options[2].sql, i.wrong[1]);
  assert.deepEqual(j.item.options[2].result.rows, [["나"]]);
  assert.equal(judgeInstance(i, [ONE("가"), E(), E("near x: syntax error")]).why, "dup");
});

test("judgeInstance choice: broken answers and look-alike tables", () => {
  const i = instantiate(CHOICE, 2);   // 정답 SQL에 ORDER BY가 있음 → 순서까지 봄
  assert.equal(judgeInstance(i, [E(), ONE("가"), ONE("나")]).why, "answer-error");
  assert.equal(judgeInstance(i, [ONE(), ONE("가"), ONE("나")]).why, "empty");
  assert.equal(judgeInstance(i, [ONE("가", "나"), ONE("가", "나"), ONE("다")]).why, "dup");
  // 순서만 다름: ORDER BY가 있으니 다른 보기
  assert.equal(judgeInstance(i, [ONE("가", "나"), ONE("나", "가"), ONE("다")]).ok, true);
  // 화면(앞 5행 + 행 수)이 같으면 6행째가 달라도 고를 수 없음 → dup
  const six = (last) => ONE("1", "2", "3", "4", "5", last);
  assert.equal(judgeInstance(i, [six("가"), six("나"), ONE("다")]).why, "dup");
  // 열 이름만 대소문자가 다른 표는 같은 표(sameTable)
  assert.equal(judgeInstance(i, [T(["name"], [["가"]]), T(["NAME"], [["가"]]), ONE("다")]).why, "dup");
  // 시간 초과는 다시 만들지 않고 실패(학습자에게 3초 넘게 기다리게 하지 않음)
  assert.equal(judgeInstance(i, [ONE("가"), { ...E("timeout"), timeout: true }, ONE("다")]).why, "slow");
});

test("judgeInstance choice: without ORDER BY, the same rows in another order collide", () => {
  const t = { ...CHOICE, sql: "SELECT name FROM shops WHERE shop_id <= {N}" };
  const i = instantiate(t, 3);
  assert.equal(judgeInstance(i, [ONE("가", "나"), ONE("나", "가"), ONE("다")]).why, "dup");
});

test("judgeInstance blank: only the answer chip gives the answer table", () => {
  const i = instantiate(BLANK, 4);
  const j = judgeInstance(i, [ONE("가", "나"), ONE("나", "가"), E()]);
  assert.equal(j.ok, true, j.why);
  assert.equal(j.item.type, "blank");
  assert.equal(j.item.code, i.sql);
  assert.ok(j.item.code.includes("___"));
  assert.deepEqual(j.item.chips, ["DESC", "ASC", "LIMIT"]);
  assert.equal(j.item.answer, 0);
  assert.ok(j.item.q.includes(i.vals.KIND));
  assert.ok(judgeInstance(i, [ONE("가"), E(), E()]).ok, "wrong chips may both error");
  assert.equal(judgeInstance(i, [ONE("가"), ONE("가"), E()]).why, "dup");
  assert.equal(judgeInstance(i, [E(), ONE("가"), ONE("나")]).why, "answer-error");
  assert.equal(judgeInstance({ ...i, answer: 1 }, [E(), ONE("가"), ONE("나")]).ok, true, "answer index is the chip number");
});

test("optionsLookSame: what the learner sees (columns, first 5 rows, row count)", () => {
  assert.equal(optionsLookSame(ONE("가"), ONE("가")), true);
  assert.equal(optionsLookSame(ONE("가"), ONE("나")), false);
  assert.equal(optionsLookSame(ONE("1", "2", "3", "4", "5", "6"), ONE("1", "2", "3", "4", "5", "7")), true);
  assert.equal(optionsLookSame(ONE("1", "2", "3", "4", "5"), ONE("1", "2", "3", "4", "5", "6")), false);
  assert.equal(optionsLookSame(E(), E()), false);
});

// ---- 실제 장터 데이터베이스 ----
test("options are distinct result tables", async () => {
  for (const t of [CHOICE, BLANK]) {
    for (let seed = 0; seed < TEMPLATE_SEEDS; seed++) {
      const it = await makeTemplateItem(t, seed, engine);
      assert.ok(it, `${t.id} seed ${seed}: no item within ${TEMPLATE_ATTEMPTS} attempts`);
      assert.equal(it.tpl, t.id);
      assert.equal(it.seed, seed);
      assert.ok(it.attempt >= 0 && it.attempt < TEMPLATE_ATTEMPTS);
      const inst = instantiate(t, seed, it.attempt);
      if (t.type === "blank") {
        const res = runList(inst).map((sql) => execOne(db, sql));
        assert.equal(res[it.answer].error, null);
        res.forEach((r, k) => { if (k !== it.answer) assert.ok(r.error || !sameTable(res[it.answer], r, { ordered: true }).ok); });
        continue;
      }
      // 보기 표를 화면처럼 실제로 돌린다: 정답 보기는 문제 SQL의 결과, 모든 보기는 서로 달라 보임
      const shown = it.options.map((o) => (typeof o === "string" ? o : o.result));
      for (const o of it.options) if (typeof o !== "string") assert.ok(sameTable(execOne(db, o.sql), o.result, { ordered: true }).ok, "stored table = running the SQL");
      assert.equal(it.options[0].sql, it.code);
      assert.ok(sameTable(execOne(db, it.code), shown[0], { ordered: true }).ok);
      for (let a = 0; a < shown.length; a++) {
        for (let b = a + 1; b < shown.length; b++) {
          const x = shown[a], y = shown[b];
          if (typeof x === "string" || typeof y === "string") { assert.notEqual(x, y); continue; }
          assert.equal(optionsLookSame(x, y), false, `${t.id} seed ${seed}: options ${a} and ${b} look the same`);
          assert.equal(sameTable(x, y, { ordered: true }).ok, false);
        }
      }
    }
  }
});

test("makeTemplateItem: a collision moves to the next attempt", async () => {
  let calls = 0;
  const fake = async (sql) => {
    calls++;
    if (calls <= 3) return ONE("같음");          // 첫 시도: 보기 셋이 모두 같음
    return execOne(db, sql);
  };
  const it = await makeTemplateItem(CHOICE, 5, fake);
  assert.ok(it);
  assert.equal(it.attempt, 1);
  assert.equal(calls, 6);
  assert.deepEqual(it.options.map((o) => o.sql), runList(instantiate(CHOICE, 5, 1)));
});

test("makeTemplateItem: gives up (null) after 5 collisions or on a broken answer — the template's fault", async () => {
  let n = 0;
  assert.equal(await makeTemplateItem(CHOICE, 0, async () => { n++; return ONE("같음"); }), null);
  assert.equal(n, TEMPLATE_ATTEMPTS * 3);
  assert.equal(await makeTemplateItem(CHOICE, 0, async () => E()), null);
  assert.equal(await makeTemplateItem(CHOICE, 0, async () => ONE()), null, "empty answer");
});

test("makeTemplateItem: a timeout or a runner failure is an engine error, not a skip (R28)", async () => {
  const slow = async (sql) => (sql === instantiate(CHOICE, 0).sql ? execOne(db, sql) : { ...E("timeout"), timeout: true });
  await assert.rejects(makeTemplateItem(CHOICE, 0, slow), (e) => e.engine === true && /timeout|slow/.test(e.message));
  await assert.rejects(makeTemplateItem(CHOICE, 0, async () => { throw new Error("worker"); }), (e) => e.engine === true);
});
