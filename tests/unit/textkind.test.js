import { test } from "node:test";
import assert from "node:assert/strict";
import { isCodey } from "../../src/textkind.js";

test("codey_multiline: 줄바꿈이 있는 보기(여러 줄 출력)는 코드 글꼴", () => {
  assert.equal(isCodey("3\n2\n1"), true);
  assert.equal(isCodey("안녕\n반가워"), true);
});

test("codey_code: 코드 기호가 있으면 코드 글꼴, 보통 문장은 아님", () => {
  assert.equal(isCodey('print("hi")'), true);
  assert.equal(isCodey("a = 3"), true);
  assert.equal(isCodey("버스가 와요"), false);
  assert.equal(isCodey("3줄"), false);
  assert.equal(isCodey(""), false);
  assert.equal(isCodey(undefined), false);
});

test("codey_sql_prose: 한국어 문장 속 SQL·괄호는 보통 글꼴, SQL 조각만이면 코드 글꼴 (작업 12)", () => {
  // 한국어 설명 보기 — 괄호·* 가 있어도 문장이다(고정폭 글꼴로 빈칸이 벌어져 읽기 어려움)
  assert.equal(isCodey("shops (가게)"), false);
  assert.equal(isCodey("SELECT * FROM 표 이름은 그 표 전체를 보여 준다"), false);
  assert.equal(isCodey("행은 가로 한 줄, 열은 세로 한 줄"), false);
  assert.equal(isCodey("12엽전"), false);
  // SQL 조각 보기 — 한글이 글자 상수 안에만 있으면 코드
  assert.equal(isCodey("SELECT * FROM shops"), true);
  assert.equal(isCodey("WHERE kind = '도깨비'"), true);
  assert.equal(isCodey("'먹거리'"), true);
  assert.equal(isCodey("ORDER BY"), true);
  assert.equal(isCodey("DESC"), true);
  assert.equal(isCodey("price >= 200"), true);
});

test("codey_sql_alias: SQL 낱말로 시작하는 SQL은 한글 별칭(AS 값, AS \"두 배 값\")이 있어도 코드 (판정 R32)", () => {
  assert.equal(isCodey("SELECT price AS 값 FROM items"), true);
  assert.equal(isCodey('SELECT price * 2 AS "두 배 값" FROM items'), true);
  assert.equal(isCodey("SELECT name AS 이름, price AS 값 FROM items"), true);
  assert.equal(isCodey("WHERE kind = '도깨비'"), true);
  assert.equal(isCodey("FROM items"), true);
  assert.equal(isCodey("WITH t AS (SELECT 1) SELECT * FROM t"), true);
  // 한국어 설명은 SQL 낱말로 시작해도 문장(별칭·글자 상수 밖의 한글이 남음)
  assert.equal(isCodey("SELECT * FROM 표 이름은 그 표 전체를 보여 준다"), false);
  assert.equal(isCodey("SELECT가 FROM보다 먼저예요"), false);
});
