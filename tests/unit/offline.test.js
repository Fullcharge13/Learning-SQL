import { test } from "node:test";
import assert from "node:assert/strict";
import { offlineStatus, ENGINE_REQUIRED, ENGINE_CACHE_PREFIX, GAME_CACHE_PREFIX } from "../../src/offline.js";

// 실행기 저장본(dueogi-engine-<sql.js 판>)에 sql-wasm.wasm, 게임 저장본에 장 파일이 모두 있어야 오프라인 준비 완료(작업 16)
const ORIGIN = "https://fullcharge13.github.io/Learning-SQL/";
const CH = ["lessons/ch1-11111111.json", "lessons/ch2-22222222.json"];
const GAME = GAME_CACHE_PREFIX + "v0.1-a";
const ENGINE = ENGINE_CACHE_PREFIX + "1.15.2";
const WASM = ORIGIN + "sql-wasm.wasm";

test("offline constants: dueogi- prefixes, the engine needs sql-wasm.wasm", () => {
  assert.equal(ENGINE_CACHE_PREFIX, "dueogi-engine-");
  assert.equal(GAME_CACHE_PREFIX, "dueogi-game-");
  assert.deepEqual(ENGINE_REQUIRED, ["sql-wasm.wasm"]);
});

test("offline_ready: 작업자가 다루고 실행기·장 파일이 모두 저장됨", () => {
  const r = offlineStatus({ controlled: true, cacheNames: [GAME, ENGINE], chapterFiles: CH,
    urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c), [ENGINE]: [WASM] } });
  assert.equal(r.ready, true);
  assert.deepEqual(r.missing, []);
  assert.equal(r.reason, "ok");
});

test("offline_engine_missing: 실행기 wasm이 저장되지 않았으면 준비 안 됨(장 파일은 다 있어도)", () => {
  const none = offlineStatus({ controlled: true, cacheNames: [GAME], chapterFiles: CH, urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c) } });
  assert.equal(none.ready, false);
  assert.equal(none.reason, "missing-files");
  assert.deepEqual(none.missing, ["sql-wasm.wasm"]);
  // 게임 저장본·리아 저장본에 있는 wasm은 세지 않음, 비슷한 이름도 아님
  for (const [name, url] of [[GAME, WASM], ["ria-pyodide-314", WASM], [ENGINE, ORIGIN + "x-sql-wasm.wasm"]]) {
    const r = offlineStatus({ controlled: true, cacheNames: [GAME, name], chapterFiles: CH,
      urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c), [name]: [url] } });
    assert.equal(r.ready, false, name + " " + url);
  }
  // 옛 판 실행기 저장본 이름(다른 sql.js 판)도 dueogi-engine-이면 센다(sw.js가 활성화 때 지우기 전)
  const old = offlineStatus({ controlled: true, cacheNames: [GAME, "dueogi-engine-1.15.1"], chapterFiles: CH,
    urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c), "dueogi-engine-1.15.1": [WASM + "?v=1"] } });
  assert.equal(old.ready, true);
});

test("offline_no_controller: 서비스 작업자가 없으면 준비 안 됨", () => {
  const r = offlineStatus({ controlled: false, cacheNames: [GAME, ENGINE], chapterFiles: CH, urlsByCache: { [GAME]: CH.map((c) => ORIGIN + c), [ENGINE]: [WASM] } });
  assert.equal(r.ready, false);
  assert.equal(r.reason, "no-controller");
});

test("offline_no_caches: 저장본 API가 없으면 준비 안 됨", () => {
  assert.equal(offlineStatus({ controlled: true, cacheNames: null, urlsByCache: null, chapterFiles: CH }).ready, false);
  assert.equal(offlineStatus({ controlled: true, cacheNames: null, urlsByCache: null, chapterFiles: CH }).reason, "no-caches");
});

test("offline_chapters_needed: 장 파일 하나가 게임 저장본에 없으면 준비 안 됨", () => {
  const r = offlineStatus({ controlled: true, cacheNames: [GAME, ENGINE], chapterFiles: CH,
    urlsByCache: { [GAME]: [ORIGIN + "index.html", ORIGIN + CH[0]], [ENGINE]: [WASM] } });
  assert.equal(r.ready, false);
  assert.deepEqual(r.missing, [CH[1]]);
  assert.equal(r.reason, "missing-chapters");
});

test("offline_chapters_all: 다른 이름 저장본에 있는 장 파일은 세지 않음, 이름 끝만 같은 파일도 아님", () => {
  const other = offlineStatus({ controlled: true, cacheNames: ["other", ENGINE], chapterFiles: CH, urlsByCache: { other: CH.map((c) => ORIGIN + c), [ENGINE]: [WASM] } });
  assert.equal(other.ready, false);
  // 리아 저장본(ria-game-)도 세지 않음
  const ria = offlineStatus({ controlled: true, cacheNames: ["ria-game-v0.9-a", ENGINE], chapterFiles: CH, urlsByCache: { "ria-game-v0.9-a": CH.map((c) => ORIGIN + c), [ENGINE]: [WASM] } });
  assert.equal(ria.ready, false);
  const near = offlineStatus({ controlled: true, cacheNames: [GAME, ENGINE], chapterFiles: [CH[0]], urlsByCache: { [GAME]: [ORIGIN + "lessons/xch1-11111111.json"], [ENGINE]: [WASM] } });
  assert.equal(near.ready, false);
});
