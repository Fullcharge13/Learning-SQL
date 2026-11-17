// v0.3.2 칸 편집기 「비우기」: 놓인 카드 수, 모두 지우기(틀의 고정 낱말은 남음), 되돌리기(정확히 이전 카드)
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLOTS } from "../../data/stall.js";
import { cardCount, clearParts, clearConfirmTitle, previewSql } from "../../src/ui/stallslot.js";

const slot = (id) => SLOTS.find((s) => s.id === id);

test("cardCount: 지금 모드의 빈자리에 놓인 카드만 센다(틀 고정 낱말은 세지 않음)", () => {
  const def = slot("restock");
  assert.equal(cardCount(def, { mode: "frame", parts: { where: [{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 1 }] } }), 3);
  assert.equal(cardCount(def, { mode: "frame", parts: { where: [] } }), 0);
  assert.equal(cardCount(def, { mode: "frame", parts: {} }), 0);
  assert.equal(cardCount(def, null), 0);
  const disp = slot("display");
  assert.equal(cardCount(disp, { mode: "frame", parts: { order: [{ c: "col_stock" }, { c: "kw_desc" }], limit: [{ c: "num", n: 4 }] } }), 3);
  // 전체 모드는 full 자리만(틀 자리 찌꺼기는 세지 않음)
  assert.equal(cardCount(def, { mode: "full", parts: { full: [{ c: "kw_select" }, { c: "col_name" }], where: [{ c: "col_stock" }] } }), 2);
});

test("clearParts(틀): 빈자리마다 빈 목록, 켜짐·모드는 그대로, 원본은 그대로", () => {
  const def = slot("display");
  const st = { on: true, mode: "frame", parts: { order: [{ c: "col_stock" }, { c: "kw_desc" }], limit: [{ c: "num", n: 4 }] } };
  const keep = structuredClone(st);
  const next = clearParts(def, st);
  assert.deepEqual(next, { on: true, mode: "frame", parts: { order: [], limit: [] } });
  assert.deepEqual(st, keep);
  assert.equal(cardCount(def, next), 0);
  // 틀의 고정 낱말(SELECT … ORDER BY … LIMIT)은 미리 보기에 남고 빈자리는 [ ]
  assert.equal(previewSql(def, next), def.tpl.replace(/\{\w+\}/g, "[ ]"));
});

test("clearParts(전체): full 하나만 비움", () => {
  const def = slot("restock");
  const st = { on: false, mode: "full", parts: { full: [{ c: "kw_select" }, { c: "col_name" }] } };
  assert.deepEqual(clearParts(def, st), { on: false, mode: "full", parts: { full: [] } });
  const rep = slot("report");   // 전체만 쓰는 칸
  assert.deepEqual(clearParts(rep, { on: true, mode: "full", parts: { full: [{ c: "kw_select" }] } }).parts, { full: [] });
});

test("되돌리기: 비우기 전 상태를 그대로 다시 쓰면 카드·숫자 값까지 정확히 같음", () => {
  const def = slot("restock");
  const st = { on: true, mode: "frame", parts: { where: [{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 7 }] } };
  const prev = structuredClone(st);
  const cleared = clearParts(def, st);
  assert.notDeepEqual(cleared, prev);
  assert.deepEqual(prev, st);
  assert.equal(previewSql(def, prev), "SELECT name FROM items WHERE stock < 7");
});

test("확인 창 제목: 「카드 N장을 모두 지울까요?」", () => {
  assert.equal(clearConfirmTitle(3), "카드 3장을 모두 지울까요?");
  assert.equal(clearConfirmTitle(1), "카드 1장을 모두 지울까요?");
});
