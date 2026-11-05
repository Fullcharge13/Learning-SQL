import { test } from "node:test";
import assert from "node:assert/strict";
import { offlineStatus, PYODIDE_REQUIRED, PYODIDE_CACHE_PREFIX, GAME_CACHE_PREFIX } from "../../src/offline.js";

// 실행기(ENGINE_*) 필수 파일은 작업 16에서 채운다. 지금은 비어 있어, 장 파일·작업자 판정만 본다.
const ORIGIN = "https://x.test/app/";
const CH = ["lessons/ch1-11111111.json", "lessons/ch2-22222222.json"];
const GAME = GAME_CACHE_PREFIX + "v0.1-a";

test("offline prefixes start with dueogi-", () => {
  assert.ok(PYODIDE_CACHE_PREFIX.startsWith("dueogi-"));
  assert.ok(GAME_CACHE_PREFIX.startsWith("dueogi-"));
  assert.deepEqual(PYODIDE_REQUIRED, []);
});

test("offline_ready: 작업자가 다루고 게임 저장본에 장 파일이 모두 있음", () => {
  const r = offlineStatus({ controlled: true, cacheNames: [GAME], chapterFiles: CH, urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c) } });
  assert.equal(r.ready, true);
  assert.deepEqual(r.missing, []);
  assert.equal(r.reason, "ok");
});

test("offline_no_controller: 서비스 작업자가 없으면 준비 안 됨", () => {
  const r = offlineStatus({ controlled: false, cacheNames: [GAME], chapterFiles: CH, urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c) } });
  assert.equal(r.ready, false);
  assert.equal(r.reason, "no-controller");
});

test("offline_no_caches: 저장본 API가 없으면 준비 안 됨", () => {
  assert.equal(offlineStatus({ controlled: true, cacheNames: null, urlsByCache: null, chapterFiles: CH }).ready, false);
  assert.equal(offlineStatus({ controlled: true, cacheNames: null, urlsByCache: null, chapterFiles: CH }).reason, "no-caches");
});

test("offline_chapters_needed: 장 파일 하나가 게임 저장본에 없으면 준비 안 됨", () => {
  const r = offlineStatus({ controlled: true, cacheNames: [GAME], chapterFiles: CH,
    urlsByCache: { [GAME]: [ORIGIN + "index.html", ORIGIN + CH[0]] } });
  assert.equal(r.ready, false);
  assert.deepEqual(r.missing, [CH[1]]);
  assert.equal(r.reason, "missing-chapters");
});

test("offline_chapters_all: 다른 이름 저장본에 있는 장 파일은 세지 않음, 이름 끝만 같은 파일도 아님", () => {
  const other = offlineStatus({ controlled: true, cacheNames: ["other"], chapterFiles: CH, urlsByCache: { other: CH.map((c) => ORIGIN + c) } });
  assert.equal(other.ready, false);
  // 리아 저장본(ria-game-)도 세지 않음
  const ria = offlineStatus({ controlled: true, cacheNames: ["ria-game-v0.9-a"], chapterFiles: CH, urlsByCache: { "ria-game-v0.9-a": CH.map((c) => ORIGIN + c) } });
  assert.equal(ria.ready, false);
  const near = offlineStatus({ controlled: true, cacheNames: [GAME], chapterFiles: [CH[0]], urlsByCache: { [GAME]: [ORIGIN + "lessons/xch1-11111111.json"] } });
  assert.equal(near.ready, false);
});
