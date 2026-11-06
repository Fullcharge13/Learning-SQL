// v0.2.1: 완료 대사는 레슨·복습·매일 도전 모두에 쓰인다 — 「레슨 완료」라고 못 박지 않는다(아이폰 복습 화면에서 「복습 완료!」 밑에 「레슨 완료」가 떴음)
import { test } from "node:test";
import assert from "node:assert/strict";
import { LINES } from "../../data/lines.js";

test("lesson_done lines do not say 레슨 완료", () => {
  for (const l of LINES.lesson_done) assert.doesNotMatch(l.text, /레슨 완료/, l.text);
});
