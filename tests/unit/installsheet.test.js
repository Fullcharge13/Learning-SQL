// v0.3.1: 「홈 화면에 추가」 안내 시트 — 안드로이드 크롬 3단계, 「바로 설치」 단추, 사파리 7일 경고는 아이폰에서만
import { test } from "node:test";
import assert from "node:assert/strict";
import { installSheetHTML } from "../../src/ui/installsheet.js";

const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("android: ⋮ 메뉴 → 「홈 화면에 추가」 또는 「앱 설치」 → 설치 3단계, 사파리 공유·7일 경고 없음", () => {
  const t = text(installSheetHTML({ kind: "android", outfit: "basic" }));
  assert.match(t, /⋮/);
  assert.match(t, /「홈 화면에 추가」 또는 「앱 설치」/);
  assert.match(t, /「설치」 또는 「추가」/);
  assert.doesNotMatch(t, /공유 버튼/);
  assert.doesNotMatch(t, /7일/);
  assert.equal((installSheetHTML({ kind: "android", outfit: "basic" }).match(/<li>/g) || []).length, 3);
});

test("android + canPrompt: 「바로 설치」 단추가 보이고, 없으면 안 보임", () => {
  assert.match(installSheetHTML({ kind: "android", outfit: "basic", canPrompt: true }), /id="ins-prompt"/);
  assert.doesNotMatch(installSheetHTML({ kind: "android", outfit: "basic", canPrompt: false }), /id="ins-prompt"/);
  // 아이폰 사파리에는 설치 신호가 없지만, 혹시 와도 사파리 안내에선 단추를 숨기지 않을 까닭이 없어 똑같이 보임
  assert.match(installSheetHTML({ kind: "both", outfit: "basic", canPrompt: true }), /id="ins-prompt"/);
});

test("safari: 지금 3단계와 7일 경고 그대로", () => {
  const t = text(installSheetHTML({ kind: "safari", outfit: "basic" }));
  assert.match(t, /공유 버튼/);
  assert.match(t, /7일/);
});

test("both: 아이폰·안드로이드 방법을 둘 다 보여 줌", () => {
  const t = text(installSheetHTML({ kind: "both", outfit: "basic" }));
  assert.match(t, /아이폰/);
  assert.match(t, /안드로이드/);
  assert.match(t, /공유 버튼/);
  assert.match(t, /⋮/);
});

test("inapp: 안드로이드면 크롬으로, 아이폰이면 Safari로 열라는 안내", () => {
  assert.match(text(installSheetHTML({ kind: "inapp", outfit: "basic", android: true })), /크롬/);
  assert.match(text(installSheetHTML({ kind: "inapp", outfit: "basic", android: false })), /Safari/);
});
