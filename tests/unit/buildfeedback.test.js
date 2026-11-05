// 조립 화면(src/ui/build.js)의 안내 문장 (마지막 전체 검수 2·4번, 판정 R48)
import { test } from "node:test";
import assert from "node:assert/strict";
import { wrongWhy, systemLine, ENGINE_FAIL_LINE } from "../../src/ui/build.js";
import { explain, extraLine } from "../../src/grade.js";

const T = (columns) => ({ columns, rows: [] });

test("R48: reason extra → 두억이의 「카드가 하나 더」 안내(의상 말투를 따름)", () => {
  const v = { ok: false, reason: "extra" };
  assert.equal(wrongWhy(v, T(["a"]), T(["a"]), "basic"), extraLine("basic"));
  assert.equal(wrongWhy(v, T(["a"]), T(["a"]), "detective"), extraLine("detective"));
  assert.match(wrongWhy(v, T(["a"]), T(["a"]), "basic"), /정답 카드는 다 있는데, 카드가 하나 더/);
});

test("columns: 열이 일부 겹치면 열만 말함, 하나도 안 겹치면 표도 다시 골라 보게", () => {
  const v = { ok: false, reason: "columns" };
  const some = wrongWhy(v, T(["name", "price"]), T(["name"]), "basic");
  assert.match(some, /열이 기대 결과와 달라요/);
  assert.doesNotMatch(some, /표를 다시/);
  const none = wrongWhy(v, T(["customer_id", "village"]), T(["Name", "price"]), "basic");
  assert.match(none, /표를 다시 골라 볼까/);
  // 대소문자만 다른 열은 겹치는 것으로 본다(sameTable과 같음)
  assert.doesNotMatch(wrongWhy(v, T(["NAME"]), T(["name", "x"]), "basic"), /표를 다시/);
});

test("rows: 행 안내 그대로", () => {
  assert.match(wrongWhy({ ok: false, reason: "rows" }, T(["a"]), T(["a"]), "basic"), /행이 기대 결과와 달라요/);
});

test("systemLine: load는 받지 못했다는 안내, worker(멈춤·정답 실행 실패)는 errors.js worker 문장", () => {
  const load = systemLine("load", "basic");
  assert.match(load.text, new RegExp(ENGINE_FAIL_LINE.slice(0, 10)));
  const w = systemLine("worker", "basic");
  assert.ok(w.text.startsWith(explain("worker", "basic")), w.text);
  assert.doesNotMatch(w.text, /인터넷|받지 못했/);
  assert.ok(systemLine("worker", "detective").text.startsWith(explain("worker", "detective")));
  for (const s of [load, w]) assert.match(s.text, /제출 횟수에 들어가지 않아요/);
});
