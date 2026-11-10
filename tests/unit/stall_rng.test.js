import { test } from "node:test";
import assert from "node:assert/strict";
import { rngFor } from "../../src/stall/rng.js";

const take = (r, n) => Array.from({ length: n }, () => r());

test("rngFor: 같은 (씨앗, 날짜)는 같은 수열", () => {
  assert.deepEqual(take(rngFor(7, 1), 10), take(rngFor(7, 1), 10));
});

test("rngFor: 날짜나 씨앗이 다르면 다른 수열", () => {
  assert.notDeepEqual(take(rngFor(7, 1), 10), take(rngFor(7, 2), 10));
  assert.notDeepEqual(take(rngFor(7, 1), 10), take(rngFor(8, 1), 10));
  // 씨앗·날짜를 바꿔 끼워도 섞이지 않는다
  assert.notDeepEqual(take(rngFor(1, 2), 10), take(rngFor(2, 1), 10));
});

test("rngFor: 모든 수가 0 이상 1 미만", () => {
  for (const [s, d] of [[7, 1], [0, 0], [123456789, 99], [-5, 3]]) {
    for (const x of take(rngFor(s, d), 2000)) assert.ok(x >= 0 && x < 1, `${s},${d}: ${x}`);
  }
});
