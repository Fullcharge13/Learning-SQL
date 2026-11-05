// 판정 R48(마지막 전체 검수): 표 이름 뒤에 끼운 낱말은 SQLite가 표 별칭으로 읽어 결과가 같아진다.
// 정답 카드를 차례대로 모두 쓰고 카드를 더 놓은 조립(정답의 상위 집합)은 결과가 같아도 오답(reason "extra").
// 정답과 다른 카드로 같은 결과를 내는 진짜 다른 답은 그대로 결과로 채점한다.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { openMarket, execOne } from "../../src/sqlcore.js";
import { judgeBuild, cardsToSql, extraLine, isSuperset } from "../../src/grade.js";
import { LESSONS as CH1 } from "../../data/lessons/ch1.js";
import { LESSONS as CH5 } from "../../data/lessons/ch5.js";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js");
let db;
before(async () => {
  const SQL = await initSqlJs();
  db = openMarket(SQL, readFileSync(new URL("../../data/market.sql", import.meta.url), "utf8"));
});

const find = (chapter, id) => chapter.flatMap((l) => l.items).find((it) => it.id === id);
function judge(item, used) {
  const exp = execOne(db, cardsToSql(item.cards));
  const got = execOne(db, cardsToSql(used));
  return { got, v: judgeBuild(item, got, exp, used) };
}

test("R48: 「SELECT * FROM shops items」는 결과가 같아도 오답(extra)", () => {
  const it = find(CH1, "1-1-b1");
  const { got, v } = judge(it, ["SELECT", "*", "FROM", "shops", "items"]);
  assert.ok(!got.error, "SQLite가 items를 표 별칭으로 읽어 실행은 됨");
  assert.deepEqual(v, { ok: false, reason: "extra" });
});

test("R48: 「SELECT * FROM shops customers」도 오답(extra)", () => {
  const it = find(CH1, "1-1-b1");
  assert.deepEqual(judge(it, ["SELECT", "*", "FROM", "shops", "customers"]).v, { ok: false, reason: "extra" });
});

test("R48: 「… FROM items shop_id WHERE shop_id = 3」도 오답(정답 카드와 같은 글자가 한 장 더)", () => {
  const it = { type: "build", cards: ["SELECT", "*", "FROM", "items", "WHERE", "shop_id", "=", "3"], extra: ["shops", "item_id"] };
  const { got, v } = judge(it, ["SELECT", "*", "FROM", "items", "shop_id", "WHERE", "shop_id", "=", "3"]);
  assert.ok(!got.error);
  assert.deepEqual(v, { ok: false, reason: "extra" });
});

test("R48: 「SELECT * FROM shops DESC ORDER BY name」도 오답(extra)", () => {
  const it = find(CH5, "5-1-b1");
  const { got, v } = judge(it, ["SELECT", "*", "FROM", "shops", "DESC", "ORDER", "BY", "name"]);
  assert.ok(!got.error);
  assert.deepEqual(v, { ok: false, reason: "extra" });
});

test("R48: 정답 카드만 그대로 내면 맞음", () => {
  for (const it of [find(CH1, "1-1-b1"), find(CH5, "5-1-b1")]) assert.deepEqual(judge(it, it.cards).v, { ok: true, reason: null });
});

test("R48: 상위 집합이 아닌 진짜 다른 답(같은 결과)은 그대로 맞음", () => {
  const it = { type: "build", cards: ["SELECT", "*", "FROM", "items", "WHERE", "price", ">", "100"], extra: ["<", "stock"] };
  const { got, v } = judge(it, ["SELECT", "*", "FROM", "items", "WHERE", "100", "<", "price"]);
  assert.ok(!got.error && got.rows.length > 0);
  assert.deepEqual(v, { ok: true, reason: null });
});

test("R48: 순서가 다른 카드(상위 집합 아님)는 결과로 채점", () => {
  assert.equal(isSuperset(["SELECT", "*", "FROM", "shops"], ["*", "SELECT", "FROM", "shops", "items"]), false);
  assert.equal(isSuperset(["SELECT", "*", "FROM", "shops"], ["SELECT", "*", "FROM", "shops"]), false);
  assert.equal(isSuperset(["SELECT", "*", "FROM", "shops"], ["SELECT", "*", "FROM", "shops", "items"]), true);
  assert.equal(isSuperset(["a", "b", "a"], ["a", "x", "b", "a"]), true);
  assert.equal(isSuperset(["a", "b", "a"], ["a", "b", "x"]), false);
});

test("R48: 오류·다른 결과가 먼저(카드가 더 있어도 오류면 error, 열이 다르면 columns)", () => {
  const it = find(CH1, "1-1-b1");
  assert.equal(judge(it, ["SELECT", "*", "FROM", "shops", "items", "customers"]).v.reason, "error");
  const it2 = { type: "build", cards: ["SELECT", "name", "FROM", "shops"], extra: [",", "owner"] };
  assert.equal(judge(it2, ["SELECT", "name", ",", "owner", "FROM", "shops"]).v.reason, "columns");
});

test("R48: extra 안내는 두억이 말투(기본·탐정 두 가지), 정답을 알려 주지 않음", () => {
  const a = extraLine("basic"), d = extraLine("detective");
  assert.match(a, /정답 카드는 다 있는데/);
  assert.match(a, /빼/);
  assert.notEqual(a, d);
  assert.match(d, /빼/);
  assert.equal(extraLine("gardener"), a);
});
