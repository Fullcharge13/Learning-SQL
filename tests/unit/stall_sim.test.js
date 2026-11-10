// 작업 6: 가게 시뮬레이션이 결정적이고, 판정 함수가 목표 밖 값에 NG를 내는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, judge, TARGETS } from "../sim/stall.js";

test("simulate: 같은 학습자·씨앗·날 수 → 같은 결과", async () => {
  const a = await simulate({ profile: "good", seed: 1, days: 5 });
  const b = await simulate({ profile: "good", seed: 1, days: 5 });
  assert.deepEqual(a, b);
  assert.equal(a.profits.length, 5);
  for (const p of a.profits) assert.ok(Number.isFinite(p));
});

test("simulate: 다른 씨앗은 다른 하루를 낼 수 있음", async () => {
  const rs = await Promise.all([1, 2, 3].map((s) => simulate({ profile: "good", seed: s, days: 5 })));
  assert.ok(new Set(rs.map((r) => JSON.stringify(r.profits))).size > 1);
});

test("simulate full: 성장을 값 싼 순으로 사고, 기록한 칸 구성을 다시 돌리면 같은 판", async () => {
  const a = await simulate({ profile: "full", seed: 1, days: 12 });
  const days = Object.values(a.upgrades);
  assert.ok(days.length >= 1, "12일 안에 성장 하나는 삼");
  const order = Object.keys(a.upgrades);
  assert.equal(order[0], "sign");
  const b = await simulate({ profile: "full", seed: 1, days: 12, timeline: a.timeline });
  assert.deepEqual(b.profits, a.profits);
  assert.deepEqual(b.upgrades, a.upgrades);
});

test("simulate full: 칸 하나를 끄면 그 칸은 하루도 켜지지 않음", async () => {
  const a = await simulate({ profile: "full", seed: 1, days: 6 });
  const off = await simulate({ profile: "full", seed: 1, days: 6, timeline: a.timeline, off: "restock" });
  assert.ok(off.profits.length === 6);
  assert.ok(off.timeline.every((t) => !t.slots.restock || t.slots.restock.on !== true));
});

const okStats = () => ({
  start: { profit: 30, miss: 6, total: 6, stock: 4 },
  good: { profit: 38, miss: 1, total: 2, stock: 1, k: 4 },
  all: { profit: 30, miss: 0 },
  full: { firstUp: 5, allUp: 30 },
  slots: { restock: { dProfit: 20, dMiss: 3 }, pricing: { dProfit: 0, dMiss: 1 } },
  having: [{ n: 4, profit: 30 }, { n: 12, profit: 40 }, { n: 20, profit: 33 }],
  havingPick: 12,
});

test("judge: 목표 안의 값은 모두 OK", () => {
  const lines = judge(okStats());
  assert.ok(lines.length >= 7);
  for (const l of lines) assert.equal(l.ok, true, l.text);
});

test("judge: 목표 밖 값에 NG", () => {
  const bad = (patch) => judge({ ...okStats(), ...patch }).filter((l) => !l.ok).map((l) => l.text);
  assert.ok(bad({ start: { profit: 34, miss: 6, total: 6, stock: 4 } }).length); // 좋은 조건과 5냥 차이가 안 됨
  assert.ok(bad({ start: { profit: 30, miss: 3, total: 3, stock: 2 } }).length); // 허탕이 2배가 안 됨
  assert.ok(bad({ good: { profit: 50, miss: 1 } }).length);          // 좋은 조건 30~45 밖
  assert.ok(bad({ all: { profit: 40, miss: 0 } }).length);           // 다 채우기가 좋은 조건보다 많이 남김
  assert.ok(bad({ full: { firstUp: 2, allUp: 30 } }).length);        // 첫 성장 4~7일 밖
  assert.ok(bad({ full: { firstUp: 5, allUp: 41 } }).length);        // 성장 5개 25~35일 밖
  assert.ok(bad({ slots: { display: { dProfit: 0, dMiss: 0 } } }).length); // 효과 없는 칸
  assert.ok(bad({ slots: { display: { dProfit: 0.01, dMiss: 0.01 } } }).length); // 반올림 잡음 수준은 효과로 안 침
  assert.equal(bad({ slots: { report: { dProfit: 0, dMiss: 0 } } }).length, 0); // 하루 보고는 판정 제외
  // 진열하기: 40일 전체가 0 이하여도 넓은 진열대 전 날들이 양수면 OK(그렇게 판정했다고 밝힘), 둘 다 아니면 NG
  // 판정 S12: 진열하기는 「켜면 결과가 달라짐」(차이 크기) — 손해여도 차이가 크면 OK, 차이가 거의 없으면 NG
  const moved = judge({ ...okStats(), slots: { display: { dProfit: -0.6, dMiss: -0.3 } } });
  assert.ok(moved.every((l) => l.ok) && moved.some((l) => /결과가 달라짐/.test(l.text)));
  assert.ok(bad({ slots: { display: { dProfit: 0.1, dMiss: 0.05 } } }).length);
  assert.ok(bad({ having: [{ n: 4, profit: 40 }, { n: 12, profit: 35 }, { n: 20, profit: 30 }] }).length); // 기준이 낮을수록 좋기만 함
  const lines = judge({ ...okStats(), good: { profit: 50, miss: 1 } });
  assert.ok(lines.some((l) => !l.ok && /NG/.test(l.text)));
});

test("TARGETS: 설계 §4-3 띠", () => {
  assert.equal(TARGETS.startGap, 5);
  assert.equal(TARGETS.startMiss, 2);
  assert.deepEqual(TARGETS.good, [30, 45]);
  assert.deepEqual(TARGETS.firstUp, [4, 7]);
  assert.deepEqual(TARGETS.allUp, [25, 35]);
});
