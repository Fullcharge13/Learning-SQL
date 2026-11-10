import { test } from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { SLOTS, CARDS } from "../../data/stall.js";
import { newStall } from "../../src/stall/state.js";
import { ledgerSql } from "../../src/stall/ledger.js";
import { runLedger } from "../../src/sqlcore.js";
import { openSlots, openCards, fullOpen, slotSql, toFull, acceptRows, cardLocked } from "../../src/stall/slots.js";

const SQL = await initSqlJs();
const slot = (id) => SLOTS.find((s) => s.id === id);
const card = (id) => CARDS.find((c) => c.id === id);

test("열린 칸: 3장까지는 재고 채우기뿐, 1~8장이면 6칸", () => {
  assert.deepEqual(openSlots(new Set([1, 2, 3])).map((s) => s.id), ["restock"]);
  assert.equal(openSlots(new Set([1, 2, 3, 4, 5, 6, 7, 8])).length, 6);
  assert.deepEqual(openSlots(new Set([1, 2])).map((s) => s.id), []);
});

test("열린 카드와 전체 조립(7장)", () => {
  const three = openCards(new Set([3]));
  assert.ok(three.length > 0 && three.every((c) => c.chapter === 3));
  assert.equal(openCards(new Set([3, 4])).length > three.length, true);
  assert.equal(fullOpen(new Set([3, 6])), false);
  assert.equal(fullOpen(new Set([3, 7])), true);
});

test("틀 칸 SQL", () => {
  assert.equal(slotSql(slot("restock"), newStall(1).slots.restock), "SELECT name FROM items WHERE stock < 1");
  assert.equal(slotSql(slot("restock"), { on: true, mode: "frame", parts: { where: [] } }), null);
  assert.equal(slotSql(slot("restock"), { on: true, mode: "frame", parts: {} }), null);
  const disp = { on: true, mode: "frame", parts: { order: [{ c: "col_price" }, { c: "kw_desc" }], limit: [{ c: "num", n: 4 }] } };
  assert.equal(slotSql(slot("display"), disp), "SELECT name FROM items ORDER BY price DESC LIMIT 4");
  assert.equal(slotSql(slot("display"), { ...disp, parts: { order: disp.parts.order, limit: [] } }), null);
});

test("toFull 뒤에도 같은 SQL", () => {
  const r = newStall(1).slots.restock;
  const f = toFull(slot("restock"), r);
  assert.equal(f.mode, "full");
  assert.ok(Array.isArray(f.parts.full) && f.parts.full.every((t) => card(t.c)));
  assert.equal(slotSql(slot("restock"), f), slotSql(slot("restock"), r));
  const disp = { on: true, mode: "frame", parts: { order: [{ c: "col_price" }, { c: "kw_desc" }], limit: [{ c: "num", n: 4 }] } };
  assert.equal(slotSql(slot("display"), toFull(slot("display"), disp)), slotSql(slot("display"), disp));
});

test("전체 조립 SQL: 빈 칸은 null", () => {
  assert.equal(slotSql(slot("report"), { on: true, mode: "full", parts: { full: [] } }), null);
  const full = { on: true, mode: "full", parts: { full: [{ c: "kw_select" }, { c: "fn_count" }, { c: "kw_from" }, { c: "tbl_items" }] } };
  assert.equal(slotSql(slot("report"), full), "SELECT COUNT(*) FROM items");
});

test("acceptRows: 중복 제거·순서 유지·없는 물건 건너뜀", () => {
  const s = newStall(1);
  const d = slot("restock");
  const r = acceptRows(d, { columns: ["name"], rows: [["식혜"], ["식혜"], ["엿"], ["수박"]] }, s);
  assert.deepEqual(r, { ok: true, ids: [3, 4] });
  assert.deepEqual(acceptRows(d, { columns: ["name"], rows: [["엿"], ["인절미"], ["엿"]] }, s).ids, [4, 1]);
  assert.deepEqual(acceptRows(d, { columns: ["ITEM_ID"], rows: [[2]] }, s), { ok: true, ids: [2] });
  assert.deepEqual(acceptRows(d, { columns: ["item_id"], rows: [[2], [2], [99], [1]] }, s).ids, [2, 1]);
});

test("acceptRows: 수백 줄이 반복돼도 물건마다 한 번", () => {
  const rows = [];
  for (let i = 0; i < 600; i++) rows.push([["식혜", "엿", "약과"][i % 3]]);
  const r = acceptRows(slot("restock"), { columns: ["name"], rows }, newStall(1));
  assert.deepEqual(r.ids, [3, 4, 2]);
});

test("acceptRows: 열이 없거나 오류면 실패", () => {
  const s = newStall(1);
  const d = slot("restock");
  assert.deepEqual(acceptRows(d, { columns: ["price"], rows: [[5]] }, s), { ok: false, why: "결과에 name이나 item_id 열이 있어야 해요" });
  const e = acceptRows(d, { error: "timeout" }, s);
  assert.equal(e.ok, false);
  assert.ok(e.why.length > 0);
  const e2 = acceptRows(d, { columns: [], rows: [], error: "no such column: foo" }, s);
  assert.equal(e2.ok, false);
});

test("acceptRows: 숫자 칸은 첫 행 첫 칸", () => {
  const d = slot("report");
  const s = newStall(1);
  assert.deepEqual(acceptRows(d, { columns: ["c"], rows: [[7]] }, s), { ok: true, value: 7 });
  assert.deepEqual(acceptRows(d, { columns: ["c"], rows: [] }, s), { ok: true, value: null });
  assert.equal(acceptRows(d, { error: "timeout" }, s).ok, false);
});

test("모든 카드의 장은 3~8, 숫자 카드는 하나", () => {
  assert.ok(CARDS.every((c) => c.chapter >= 3 && c.chapter <= 8));
  assert.equal(CARDS.filter((c) => c.kind === "num").length, 1);
});

test("3장 카드만으로 재고 채우기 틀이 실행되는 SQL이 된다", () => {
  const three = new Set(openCards(new Set([3])).map((c) => c.id));
  const parts = [{ c: "col_category" }, { c: "op_eq" }, { c: "str_food" }];
  assert.ok(parts.every((p) => three.has(p.c)));
  const sql = slotSql(slot("restock"), { on: true, mode: "frame", parts: { where: parts } });
  assert.equal(sql, "SELECT name FROM items WHERE category = '먹거리'");
  const out = runLedger(SQL, ledgerSql(newStall(1)), [sql])[0];
  assert.ok(!out.error);
  assert.deepEqual(out.rows.map((r) => r[0]), ["인절미", "약과", "식혜", "엿"]);
  assert.deepEqual(acceptRows(slot("restock"), out, newStall(1)).ids, [1, 2, 3, 4]);
});

test("cardLocked", () => {
  assert.equal(cardLocked(card("kw_and"), new Set([3])), "4장을 끝내면 열려요");
  assert.equal(cardLocked(card("kw_and"), new Set([3, 4])), null);
});
