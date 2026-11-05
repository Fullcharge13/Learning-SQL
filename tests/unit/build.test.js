import { test } from "node:test";
import assert from "node:assert/strict";
import { newBuild, tap, sqlOf, usedTexts, hint } from "../../src/build.js";

const item = {
  id: "t-build-1", type: "build", q: "q",
  cards: ["SELECT", "name", ",", "price", "FROM", "items", ";"],
  extra: ["age", "WHERE", ","],
  tables: ["items"], hints: ["힌트1", "힌트2"],
};
const textsOf = (s) => usedTexts(s);
const idOf = (s, text) => s.bank.find((c) => c.text === text).id;

test("same seed same bank", () => {
  const a = newBuild(item, 5), b = newBuild(item, 5);
  assert.deepEqual(a, b);
  const orders = new Set();
  for (let s = 0; s < 10; s++) orders.add(newBuild(item, s).bank.map((c) => c.id).join());
  assert.ok(orders.size > 1);
});

test("bank has cards plus extra", () => {
  const s = newBuild(item, 1);
  assert.equal(s.bank.length, 10);
  assert.deepEqual(s.line, []);
  assert.deepEqual(s.bank.map((c) => c.id).sort((x, y) => x - y), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(s.bank.find((c) => c.id === 0).text, "SELECT");
  assert.equal(s.bank.find((c) => c.id === 7).text, "age");
});

test("ko lookup", () => {
  const s = newBuild({ ...item, extra: ["items.price", "customers", "age"] }, 1);
  const ko = (t) => s.bank.find((c) => c.text === t).ko;
  assert.equal(ko("items"), "물건");
  assert.equal(ko("name"), "이름");
  assert.equal(ko("price"), "값(엽전)");
  assert.equal(ko("items.price"), "값(엽전)");
  assert.equal(ko("customers"), "손님");
  assert.equal(ko("age"), "나이"); // item.tables에 없어도 전체에서 찾음
  assert.equal(ko("SELECT"), null);
  assert.equal(ko(","), null);
});

test("tap moves card both ways", () => {
  let s = newBuild(item, 3);
  const pos = s.bank.findIndex((c) => c.text === "SELECT");
  s = tap(s, "bank", pos);
  assert.deepEqual(s.line, [0]);
  assert.equal(s.bank.length, 10);
  s = tap(s, "bank", pos); // 이미 놓음: 아무 일 없음
  assert.deepEqual(s.line, [0]);
  s = tap(s, "bank", s.bank.findIndex((c) => c.text === "name"));
  assert.deepEqual(textsOf(s), ["SELECT", "name"]);
  s = tap(s, "line", 0);
  assert.deepEqual(textsOf(s), ["name"]);
});

test("tap returns new object", () => {
  const s = newBuild(item, 3);
  const snap = JSON.stringify(s);
  const t = tap(s, "bank", 0);
  assert.notEqual(t, s);
  assert.equal(JSON.stringify(s), snap);
  const u = tap(t, "line", 0);
  assert.notEqual(u, t);
  assert.deepEqual(t.line, [t.bank[0].id]);
});

test("sqlOf joins with single space", () => {
  let s = newBuild(item, 2);
  for (const t of ["SELECT", "name", "FROM", "items"]) s = tap(s, "bank", s.bank.findIndex((c) => c.text === t));
  assert.equal(sqlOf(s), "SELECT name FROM items");
  assert.equal(sqlOf(newBuild(item, 2)), "");
});

test("hint1 hint2 give text", () => {
  const s = newBuild(item, 1);
  assert.deepEqual(hint(s, item, 1), { text: "힌트1" });
  assert.deepEqual(hint(s, item, 2), { text: "힌트2" });
});

test("hint3 places half", () => {
  let s = newBuild(item, 4);
  s = tap(s, "bank", s.bank.findIndex((c) => c.text === "age"));
  const r = hint(s, item, 3);
  assert.deepEqual(r.state.line, [0, 1, 2]);
  assert.deepEqual(textsOf(r.state), ["SELECT", "name", ","]);
  assert.equal(r.state.bank.length, 10);
});

test("hint4 fixes wrong prefix", () => {
  let s = newBuild(item, 6);
  s = tap(s, "bank", s.bank.findIndex((c) => c.text === "SELECT"));
  s = tap(s, "bank", s.bank.findIndex((c) => c.text === "age"));
  const r = hint(s, item, 4);
  assert.deepEqual(textsOf(r.state), ["SELECT", "name"]);
  assert.ok(!r.state.line.includes(7)); // age는 더미로 돌아감
});

test("hint4 adds next from empty and at full answer", () => {
  let s = newBuild(item, 6);
  s = hint(s, item, 4).state;
  assert.deepEqual(textsOf(s), ["SELECT"]);
  for (let i = 0; i < 6; i++) s = hint(s, item, 4).state;
  assert.deepEqual(textsOf(s), item.cards);
  const again = hint(s, item, 4).state;
  assert.deepEqual(again, s);
});

test("duplicate card texts", () => {
  let s = newBuild({ ...item, cards: ["SELECT", "a", ",", "b", ",", "c"], extra: [] }, 2);
  const commas = s.bank.filter((c) => c.text === ",").map((c) => c.id);
  assert.equal(commas.length, 2);
  s = tap(s, "bank", s.bank.findIndex((c) => c.id === commas[0]));
  assert.deepEqual(s.line, [commas[0]]);
  s = tap(s, "bank", s.bank.findIndex((c) => c.id === commas[1]));
  assert.deepEqual(s.line, [commas[0], commas[1]]);
  s = tap(s, "line", 0);
  assert.deepEqual(s.line, [commas[1]]);
});

test("hint4 treats same-text cards as interchangeable", () => {
  const it = { ...item, cards: ["SELECT", "name", ",", "price", ",", "stock"], extra: [","] };
  let s = newBuild(it, 9);
  const commaIds = s.bank.filter((c) => c.text === ",").map((c) => c.id); // 2, 4, 6
  for (const t of ["SELECT", "name"]) s = tap(s, "bank", s.bank.findIndex((c) => c.text === t));
  s = tap(s, "bank", s.bank.findIndex((c) => c.id === 6)); // extra의 쉼표
  s = tap(s, "bank", s.bank.findIndex((c) => c.text === "price"));
  const r = hint(s, it, 4).state;
  assert.deepEqual(textsOf(r), ["SELECT", "name", ",", "price", ","]);
  assert.equal(new Set(r.line).size, r.line.length);
  assert.ok(commaIds.includes(r.line[4]) && r.line[4] !== 6);
});
