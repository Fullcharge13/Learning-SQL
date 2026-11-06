// 두억이와 SQL! 서비스 작업자 (설계서 8장, 계획 작업 10)
// build.py가 밑줄 두 개로 감싼 DUEOGI 자리 표시를 채워 dist/sw.js로 내보낸다. 이 파일을 그대로 쓰지 않는다.
//
// - 게임 파일(index.html, manifest, 아이콘): 네트워크 먼저 → 끊기거나 4초 넘게 느리면 저장본. 새 판이 바로 보이게.
//   저장본은 설치 때만 채운다(받은 새 판을 옛 저장본에 섞지 않음 → 오프라인은 언제나 한 판이 통째로).
// - 실행기(sql-wasm.wasm, 작업 16): 저장본 dueogi-engine-<sql.js 판>에 설치 때 받아 둔다(실패해도 설치는 계속, 처음 쓸 때 받음).
//   이름에 sql.js 판만 들어 있어 게임 새 판을 올려도 다시 받지 않는다. 요청은 저장본 먼저.
//   sql.js 코드 자체는 worker.js(게임 파일) 안에 묶여 있다.
// - 장 파일(lessons/chN-<지문8자>.json, v0.3 작업 1): 설치 때 모두 미리 받음(하나가 실패해도 설치는 계속, 처음 열 때 받음).
//   이름에 내용 지문이 있어 바뀌지 않으므로 저장본 먼저. 게임 저장본에 함께 들어 있어 새 판 활성화 때 함께 지워진다.
// - GET이 아닌 요청, 다른 주소의 요청은 건드리지 않는다.
// - 게임 저장본 이름에 판 번호와 내용 지문이 들어 있어, 새 판을 올리면 활성화 때 옛 저장본을 지운다.
//   지우는 것은 dueogi- 로 시작하는 저장본뿐이다(같은 주소의 리아 ria- 저장본은 건드리지 않는다).

const VERSION = "v0.2.1";
const GAME_CACHE = "dueogi-game-v0.2.1-2f1d3befe5";
const ENGINE_CACHE = "dueogi-engine-1.15.2";
const GAME_FILES = ["./", "index.html", "worker.js", "manifest.webmanifest", "licenses.txt", "icons/apple-touch-icon.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
const ENGINE_FILES = ["sql-wasm.wasm"];
const ENGINE_RE = /\/sql-wasm\.wasm$/;
const ENGINE_BYTES = 685235; // build.py가 넣는 sql-wasm.wasm 바이트 수

// 실행기 저장본에는 진짜 wasm만 넣는다(작업 17). 와이파이 로그인 화면·오류 HTML이 200으로 오면
// 그것을 저장본에 넣는 순간 다시 받지 않아 오프라인 실행이 영영 깨진다.
// 받아들이는 것: content-type에 application/wasm이 있거나, 바이트 수가 빌드한 wasm과 같은 것.
async function goodWasm(res) {
  if (!res || !res.ok) return false;
  const type = (res.headers && res.headers.get("content-type")) || "";
  if (type.toLowerCase().includes("application/wasm")) return true;
  try {
    return (await res.clone().arrayBuffer()).byteLength === ENGINE_BYTES;
  } catch (_) {
    return false;
  }
}
const CHAPTER_FILES = ["lessons/ch1-7b58e651.json", "lessons/ch2-8963f452.json", "lessons/ch3-886d5519.json", "lessons/ch4-cb10ffbd.json", "lessons/ch5-4a07baac.json", "lessons/ch6-a3487fa6.json", "lessons/ch7-1e63c313.json", "lessons/ch8-1f688824.json", "lessons/ch9-702c94dd.json", "lessons/ch10-014aadf4.json", "lessons/ch11-b76c29ac.json", "lessons/ch12-53c37ba5.json", "lessons/ch13-7073a039.json", "lessons/ch14-bb727b92.json", "lessons/ch15-cc6fb470.json", "lessons/ch16-b0504a29.json", "lessons/ch17-5a7de6f3.json"];
const CHAPTER_RE = /\/lessons\/ch[1-9]\d*-[0-9a-f]{8}\.json$/;
const NETWORK_TIMEOUT_MS = 4000; // 게임 파일: 이보다 느리면 저장본을 먼저 보여 줌
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const game = await caches.open(GAME_CACHE);
    await game.addAll(GAME_FILES.map((f) => new Request(f, { cache: "reload" })));
    await Promise.all(CHAPTER_FILES.map(async (f) => {
      try {
        if (await game.match(f)) return;
        const res = await fetch(new Request(f, { cache: "reload" }));
        if (res.ok) await game.put(f, res);
      } catch (_) { /* 이 장은 처음 열 때 받는다 */ }
    }));
    // 실행기: 이미 있으면 그대로(판이 같으면 같은 파일), 없으면 받아 둔다. 실패해도 설치는 끝낸다
    try {
      const engine = await caches.open(ENGINE_CACHE);
      await Promise.all(ENGINE_FILES.map(async (f) => {
        if (await engine.match(f)) return;
        const res = await fetch(new Request(f, { cache: "reload" }));
        if (await goodWasm(res)) await engine.put(f, res);
      }));
    } catch (_) { /* 처음 실행할 때 받는다 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      // 우리 것(dueogi-)만, 지금 쓰는 둘을 빼고 지운다. 같은 주소의 리아(ria-)·다른 앱 저장본은 건드리지 않는다
      if (key.startsWith("dueogi-") && key !== GAME_CACHE && key !== ENGINE_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

// 장 파일: 저장본 먼저 → 없으면 받아서 저장(이름이 내용 지문이라 바뀌지 않음)
async function chapterFirst(request) {
  const cache = await caches.open(GAME_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    try { await cache.put(request, res.clone()); } catch (_) { /* 저장 공간 부족 등 */ }
  }
  return res;
}

// 실행기 wasm: 저장본 먼저 → 없으면 받아서 저장(판 이름이 저장본 이름에 들어 있음)
async function engineFirst(request) {
  const cache = await caches.open(ENGINE_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic" && (await goodWasm(res))) {
    try { await cache.put(request, res.clone()); } catch (_) { /* 저장 공간 부족 등 */ }
  }
  return res;
}

async function fromCache(cache, request) {
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  if (request.mode === "navigate") return (await cache.match("index.html")) || (await cache.match("./")) || null;
  return null;
}

// 네트워크 먼저. 끊기면 바로, 느리면 NETWORK_TIMEOUT_MS 뒤 저장본. 저장본이 없으면 네트워크를 계속 기다린다.
async function networkFirst(request) {
  const cache = await caches.open(GAME_CACHE);
  // 받은 것을 저장본에 쓰지 않는다: 게임 저장본은 설치 때만 채운다(v0.3). 새 판 index.html을 옛 저장본에 쓰면
  // 새 작업자 설치가 실패했을 때 오프라인에서 저장 안 된 새 장 파일을 찾게 된다.
  const net = fetch(request);
  net.catch(() => {}); // 저장본으로 이미 답한 뒤 늦게 실패해도 경고를 남기지 않게
  let timer;
  const slow = new Promise((resolve) => { timer = setTimeout(resolve, NETWORK_TIMEOUT_MS, "timeout"); });
  try {
    const first = await Promise.race([net, slow]);
    if (first !== "timeout") return first;
    const hit = await fromCache(cache, request);
    return hit || (await net);
  } catch (err) {
    const hit = await fromCache(cache, request);
    if (hit) return hit;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (CHAPTER_RE.test(url.pathname)) {
    event.respondWith(chapterFirst(req));
    return;
  }
  if (ENGINE_RE.test(url.pathname)) {
    event.respondWith(engineFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});

self.addEventListener("message", (event) => {
  if (event.data === "version" && event.source) event.source.postMessage({ version: VERSION, cache: GAME_CACHE, engine: ENGINE_CACHE });
});
