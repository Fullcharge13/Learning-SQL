// 칸 편집기의 순수 함수(v0.3 작업 8): 카드 놓기·빼기, 숫자 −/+, 저장 단추 상태, 시험 실행 풀이 한 줄, 고르기 묶음.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLOTS, CARDS } from "../../data/stall.js";
import { newStall } from "../../src/stall/state.js";
import { placeCard, removeCard, bumpNum, saveState, acceptLine, frameDefault, pickerGroups, previewSql, tooLong, EMPTY_BLOCK, TOO_MANY, MAX_PART } from "../../src/ui/stallslot.js";
import { toFull } from "../../src/stall/slots.js";

const slot = (id) => SLOTS.find((s) => s.id === id);
const frame = (where) => ({ on: true, mode: "frame", parts: { where } });

test("placeCard: 그 자리 끝에 붙이고 원본은 그대로", () => {
  const st = frame([{ c: "col_stock" }]);
  const next = placeCard(st, "where", "op_lt");
  assert.deepEqual(next.parts.where, [{ c: "col_stock" }, { c: "op_lt" }]);
  assert.deepEqual(st.parts.where, [{ c: "col_stock" }]);
  // 빈 자리(키가 없음)에도 놓인다
  const d = placeCard({ on: false, mode: "frame", parts: {} }, "order", "col_price");
  assert.deepEqual(d.parts.order, [{ c: "col_price" }]);
});

test("placeCard: 숫자 카드는 n(없으면 1), 0~30으로 자름. 모르는 카드·40장 넘으면 그대로", () => {
  assert.deepEqual(placeCard(frame([]), "where", "num", 4).parts.where, [{ c: "num", n: 4 }]);
  assert.deepEqual(placeCard(frame([]), "where", "num").parts.where, [{ c: "num", n: 1 }]);
  assert.deepEqual(placeCard(frame([]), "where", "num", 99).parts.where, [{ c: "num", n: 30 }]);
  assert.deepEqual(placeCard(frame([]), "where", "num", -3).parts.where, [{ c: "num", n: 0 }]);
  assert.deepEqual(placeCard(frame([]), "where", "nope").parts.where, []);
  const full = frame(Array.from({ length: MAX_PART }, () => ({ c: "col_stock" })));
  assert.equal(MAX_PART, 40);
  assert.equal(placeCard(full, "where", "op_lt").parts.where.length, 40);
});

test("removeCard: 그 번째 카드를 빼고, 없는 번째면 그대로", () => {
  const st = frame([{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 1 }]);
  assert.deepEqual(removeCard(st, "where", 1).parts.where, [{ c: "col_stock" }, { c: "num", n: 1 }]);
  assert.equal(st.parts.where.length, 3);
  assert.deepEqual(removeCard(st, "where", 7).parts.where, st.parts.where);
  assert.deepEqual(removeCard(st, "order", 0).parts, st.parts);
});

test("bumpNum: −/+ 는 0~30에서 멈추고, 숫자 카드가 아니면 그대로", () => {
  const st = frame([{ c: "col_stock" }, { c: "op_lt" }, { c: "num", n: 1 }]);
  let s = st;
  for (let i = 0; i < 3; i++) s = bumpNum(s, "where", 2, 1);
  assert.deepEqual(s.parts.where[2], { c: "num", n: 4 });
  assert.equal(st.parts.where[2].n, 1);
  const zero = frame([{ c: "num", n: 0 }]);
  assert.deepEqual(bumpNum(zero, "where", 0, -1).parts.where, [{ c: "num", n: 0 }]);
  const top = frame([{ c: "num", n: 30 }]);
  assert.deepEqual(bumpNum(top, "where", 0, 1).parts.where, [{ c: "num", n: 30 }]);
  assert.deepEqual(bumpNum(st, "where", 0, 1).parts.where, st.parts.where);
});

test("saveState: 빈 틀 자리면 막힘, 시험 안 함·오류면 「그래도 저장」, 성공이면 「저장」", () => {
  const def = slot("restock");
  const ok = newStall(1).slots.restock;
  assert.deepEqual(saveState(ok, def, { ok: true }), { label: "저장", blocked: null });
  assert.deepEqual(saveState(ok, def, { ok: false }), { label: "그래도 저장", blocked: null });
  assert.deepEqual(saveState(ok, def, null), { label: "그래도 저장", blocked: null });
  assert.equal(EMPTY_BLOCK, "빈자리를 채워 주세요");
  assert.equal(saveState(frame([]), def, { ok: true }).blocked, EMPTY_BLOCK);
  const disp = slot("display");
  assert.equal(saveState({ on: true, mode: "frame", parts: { order: [{ c: "col_price" }] } }, disp, null).blocked, EMPTY_BLOCK);
  assert.equal(saveState({ on: true, mode: "frame", parts: { order: [{ c: "col_price" }], limit: [{ c: "num", n: 3 }] } }, disp, null).blocked, null);
  // 전체 조립인데 카드가 하나도 없으면 막힘
  assert.equal(saveState({ on: true, mode: "full", parts: { full: [] } }, slot("report"), null).blocked, EMPTY_BLOCK);
});

test("acceptLine: 칸마다 한 줄 풀이(받침에 맞는 조사), 오류는 그 안내 그대로", () => {
  const s = newStall(1);
  assert.equal(acceptLine(slot("restock"), { ok: true, ids: [3, 4] }, s), "→ 식혜·엿을 채워요");
  assert.equal(acceptLine(slot("restock"), { ok: true, ids: [5] }, s), "→ 짚신을 채워요");
  assert.equal(acceptLine(slot("restock"), { ok: true, ids: [1] }, s), "→ 인절미를 채워요");
  assert.equal(acceptLine(slot("best"), { ok: true, ids: [3] }, s), "→ 식혜를 두 상자씩 더 들여요");
  assert.equal(acceptLine(slot("discount"), { ok: true, ids: [3, 4] }, s), "→ 식혜·엿을 할인해요");
  assert.equal(acceptLine(slot("display"), { ok: true, ids: [3, 4] }, s), "→ 진열대에 식혜·엿 순서로 올려요 (6칸 중 2칸만 채워요)");
  assert.equal(acceptLine(slot("display"), { ok: true, ids: [3, 4, 5] }, { ...s, shelf: 3 }), "→ 진열대에 식혜·엿·짚신 순서로 올려요"); // 칸이 다 차면 안내 없음
  assert.equal(acceptLine(slot("display"), { ok: true, ids: [3] }, { ...s, shelf: 4 }), "→ 진열대에 식혜 순서로 올려요 (4칸 중 1칸만 채워요)");
  // 진열대 칸 수(6)를 넘는 물건은 줄임표
  assert.equal(acceptLine(slot("display"), { ok: true, ids: [1, 2, 3, 4, 5, 6, 7] }, s), "→ 진열대에 인절미·약과·식혜·엿·짚신·부채 순서로 올려요 (나머지는 못 올라가요)");
  assert.equal(acceptLine(slot("report"), { ok: true, value: 7 }, s), "→ 보고: 7");
  assert.equal(acceptLine(slot("report"), { ok: true, value: null }, s), "→ 보고: 빈 값");
  assert.equal(acceptLine(slot("restock"), { ok: true, ids: [] }, s), "→ 찾은 물건이 없어요. 오늘은 할 일이 없어요");
  assert.equal(acceptLine(slot("restock"), { ok: false, why: "결과에 name이나 item_id 열이 있어야 해요" }, s), "결과에 name이나 item_id 열이 있어야 해요");
  // 값 매기기: 값이 빈칸인 물건만 매김
  const priced = { ...s, items: [...s.items, { item_id: 7, price: null, stock: 10 }] };
  assert.equal(acceptLine(slot("pricing"), { ok: true, ids: [7, 3] }, priced), "→ 꿀떡에 값을 매겨요");
  assert.equal(acceptLine(slot("pricing"), { ok: true, ids: [3] }, priced), "→ 찾은 물건은 모두 값이 있어요. 오늘은 할 일이 없어요");
});

test("frameDefault: 재고 채우기는 시작 조건, 다른 틀 칸은 빈 자리, 전체 칸은 full", () => {
  assert.deepEqual(frameDefault(slot("restock")), newStall(1).slots.restock.parts);
  assert.deepEqual(frameDefault(slot("discount")), { where: [] });
  assert.deepEqual(frameDefault(slot("display")), { order: [], limit: [] });
  assert.deepEqual(frameDefault(slot("report")), { full: [] });
});

test("pickerGroups: 3~8장 카드 전부를 네 묶음으로, 잠긴 카드는 사유와 함께", () => {
  const g = pickerGroups(new Set([1, 2, 3]));
  assert.deepEqual(g.map((x) => x.name), ["열·표", "비교", "숫자·글자", "낱말"]);
  const all = g.flatMap((x) => x.cards);
  assert.equal(all.length, CARDS.length);
  const and = all.find((x) => x.card.id === "kw_and");
  assert.equal(and.locked, "4장을 끝내면 열려요");
  assert.equal(all.find((x) => x.card.id === "col_stock").locked, null);
  assert.ok(g.find((x) => x.name === "비교").cards.every((x) => x.locked === null));
  // 열린 카드가 잠긴 카드보다 앞
  for (const grp of g) {
    const firstLocked = grp.cards.findIndex((x) => x.locked);
    if (firstLocked >= 0) assert.ok(grp.cards.slice(firstLocked).every((x) => x.locked));
  }
});

test("tooLong·saveState: 한 자리가 40장을 넘으면 저장 막힘(toFull로 넘친 경우 포함)", () => {
  const def = slot("restock");
  const many = frame([{ c: "col_stock" }, { c: "op_lt" }, ...Array.from({ length: 36 }, () => ({ c: "num", n: 1 }))]);
  assert.equal(tooLong(many), false);
  const full = toFull(def, many);              // SELECT name FROM items WHERE + 38장
  assert.ok(full.parts.full.length > MAX_PART);
  assert.equal(tooLong(full), true);
  assert.equal(saveState(full, def, { ok: true }).blocked, TOO_MANY);
  assert.equal(TOO_MANY, "한 자리에는 카드를 40장까지 놓을 수 있어요");
  assert.equal(saveState(many, def, null).blocked, null);
});

test("previewSql: 지금 SQL 한 줄, 빈 자리는 [ ]", () => {
  assert.equal(previewSql(slot("restock"), newStall(1).slots.restock), "SELECT name FROM items WHERE stock < 1");
  assert.equal(previewSql(slot("restock"), frame([])), "SELECT name FROM items WHERE [ ]");
  assert.equal(previewSql(slot("display"), { mode: "frame", parts: { order: [{ c: "col_price" }, { c: "kw_desc" }] } }),
    "SELECT name FROM items ORDER BY price DESC LIMIT [ ]");
  assert.equal(previewSql(slot("report"), { mode: "full", parts: { full: [] } }), "[ ]");
  assert.equal(previewSql(slot("report"), { mode: "full", parts: { full: [{ c: "kw_select" }, { c: "fn_count" }] } }), "SELECT COUNT(*)");
});
