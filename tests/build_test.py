"""배포 빌드 시험 (두억이 작업 16: sql.js 포함 배포와 오프라인).

실행: python3 tests/build_test.py      (또는 python3 -m pytest tests/build_test.py -q)
      python3 tests/build_test.py test_html_static test_sw_activate_keeps_ria   이름을 주면 그 시험만

1. 배포용 빌드(python3 build.py → dist/)를 검사한다.
   - first html ≤ 650KB: dist/index.html 한 장, 바깥 <script src>·<link rel="stylesheet"> 없음, 압축 전 650KB 이하
   - wasm present: dist/sql-wasm.wasm이 node_modules/sql.js/dist의 것과 같은 바이트. worker.js는 sql.js를 묶어 넣은
     한 파일(실행 중 글자를 코드로 바꾸지 않음: new Function·eval·importScripts 없음 → 엄격한 CSP에서도 돎)
   - version v0.2.1 shown: index.html·sw.js에 판 표시, 첫 화면 .ver에도(브라우저 시험)
   - no pyodide/codemirror strings: 배포 파일 어디에도 리아 시절 이름이 없음
   - sw deletes only dueogi- caches: sw.js의 지우기 조건 검사 + sw.js를 Node에서 돌려 activate가 ria- 저장본을 남기는지
   - manifest·아이콘, licenses.txt(sql.js MIT 전문, SQLite 퍼블릭 도메인 문구), 빌드 폴더 청소, node 없음 안내
2. 브라우저(Chromium + "iPhone 17" 기기 설정)
   - offline open after first visit: 한 번 연 뒤 네트워크를 끊고 새로고침 → 1-1 첫 조립 문제에서 「실행」이 결과 표를 그림.
     같은 주소의 리아 저장본(ria- 캐시·localStorage)은 그대로
   - 깃허브 페이지처럼 하위 경로(/Learning-SQL/)에서 열기·실행·오프라인
   - 실행기 wasm이 막혀도 서비스 작업자 설치는 끝나고 오프라인에서 앱이 뜸 / 서버가 느리면 4초 뒤 저장본
   - 내용이 바뀐 빌드 → 새 게임 저장본, 옛 dueogi-game-은 지워지고 dueogi-engine-1.15.2는 남음
3. 장 따로 불러오기(리아 v0.3 작업 1 그대로): 장 파일 지문·내용·미리 받기·오프라인·막힘·404·복습
"""

import functools
import gzip
import hashlib
import http.server
import importlib.util
import json
import os
import re
import shutil
import socketserver
import struct
import subprocess
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_VERSION = re.search(r'VERSION = "(v[0-9.]+)"', open(os.path.join(ROOT, "src", "app.js"), encoding="utf-8").read()).group(1)
SAVE_KEY = "dueogi-sql-save"

DIST = os.path.join(ROOT, "dist")
OUT = os.path.join(ROOT, "tests", "out")
MAX_RAW = 650 * 1024           # 설계 §10: 첫 HTML 650KB 이하
SQLJS_DIST = os.path.join(ROOT, "node_modules", "sql.js", "dist")
SQLJS_VERSION = json.load(open(os.path.join(ROOT, "node_modules", "sql.js", "package.json"), encoding="utf-8"))["version"]
ENGINE_CACHE = "dueogi-engine-" + SQLJS_VERSION
CHAPTER_FILE = re.compile(r"^ch(\d+)-([0-9a-f]{8})\.json$")
ICON_SIZES = {"icons/icon-180.png": 180, "icons/icon-192.png": 192, "icons/icon-512.png": 512,
              "icons/icon-maskable-512.png": 512, "icons/apple-touch-icon.png": 180}
DOC_ICONS = ("icon-180.png", "icon-512.png", "icon-maskable-512.png")
LEGACY = re.compile(r"pyodide|codemirror|lezer", re.I)
# 같은 주소(fullcharge13.github.io)에서 도는 리아의 저장본·저장 칸 흉내
DUEOGI_CACHES = ("ria-game-v0.9-0123456789", "ria-pyodide-314.0.7")
DUEOGI_SAVE_KEY = "ria-python.save"

_built = {}


def _run_build(*args, env=None):
    return subprocess.run([sys.executable, os.path.join(ROOT, "build.py"), *args],
                          cwd=ROOT, capture_output=True, text=True, env=env)


def _build(*args):
    if args not in _built:
        r = _run_build(*args)
        assert r.returncode == 0, "build.py failed:\n" + r.stdout + r.stderr
        _built[args] = r.stdout
    return _built[args]


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    assert head[:8] == b"\x89PNG\r\n\x1a\n", path + " is not a PNG"
    return struct.unpack(">II", head[16:24])


def _build_module():
    spec = importlib.util.spec_from_file_location("dueogi_build", os.path.join(ROOT, "build.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _dist_text_files(folder=DIST):
    out = []
    for dp, _, fs in os.walk(folder):
        for f in fs:
            if f.endswith((".html", ".js", ".json", ".txt", ".webmanifest")):
                out.append(os.path.join(dp, f))
    return sorted(out)


# ---------------------------------------------------------------- 정적 검사

def test_html_static():
    """first html ≤ 650KB, version v0.2.1 shown (글자), 바깥 파일 없음"""
    out = _build()
    html = _read(os.path.join(DIST, "index.html"))
    raw = len(html.encode("utf-8"))
    gz = len(gzip.compress(html.encode("utf-8"), 9))
    print("    dist/index.html raw %.1f KB (limit %d KB), gzip %.1f KB" % (raw / 1024, MAX_RAW // 1024, gz / 1024))
    print("    build.py: " + out.strip().replace("\n", "\n    build.py: "))
    assert raw <= MAX_RAW, "first html too big: %d bytes > %d" % (raw, MAX_RAW)
    assert not re.search(r"<script\b[^>]*\ssrc\s*=", html, re.I), "external <script src> in index.html"
    assert 'rel="stylesheet"' not in html, "CSS must be inlined"
    assert APP_VERSION == "v0.2.1", APP_VERSION
    assert '<meta name="dueogi-version" content="v0.2.1">' in html
    assert 'window.DUEOGI_VERSION = "v0.2.1";' in html
    assert "<title>두억이와 SQL!</title>" in html, re.search(r"<title>.*?</title>", html).group(0)
    assert "/node_modules/" not in html
    assert '<link rel="manifest" href="manifest.webmanifest">' in html
    assert 'rel="apple-touch-icon"' in html
    assert re.search(r"index\.html raw [\d.]+ KB", out) and re.search(r"sql-wasm\.wasm [\d.]+ KB", out) \
        and re.search(r"worker\.js [\d.]+ KB", out), "build.py must print the sizes (first html, wasm, worker)"


def test_no_ria_names_in_build():
    """build.py·배포 HTML에 리아 시절 이름(ria-no-dev-lessons, ria-stub, meta ria-version·ria-build, window.RIA_*)이 없음"""
    src = _read(os.path.join(ROOT, "build.py"))
    for name in ("ria-no-dev-lessons", "ria-stub", "ria-version", "ria-build", "RIA_"):
        assert name not in src, "build.py still names %r" % name
    assert '"dueogi-no-dev-lessons"' in src and '"dueogi-stub"' in src
    _build()
    html = _read(os.path.join(DIST, "index.html"))
    assert not re.search(r'<meta name="ria-', html), "ria- meta in dist/index.html"
    assert "window.RIA_" not in html


def test_wasm_present():
    """sql-wasm.wasm은 따로 둔 파일(node_modules 그대로), worker.js는 sql.js까지 묶은 한 파일"""
    _build()
    wasm = os.path.join(DIST, "sql-wasm.wasm")
    assert os.path.exists(wasm), "dist/sql-wasm.wasm missing"
    with open(wasm, "rb") as a, open(os.path.join(SQLJS_DIST, "sql-wasm.wasm"), "rb") as b:
        data = a.read()
        assert data == b.read(), "dist/sql-wasm.wasm differs from node_modules/sql.js/dist/sql-wasm.wasm"
    assert data[:4] == b"\0asm"
    worker = _read(os.path.join(DIST, "worker.js"))
    print("    sql-wasm.wasm %.1f KB, worker.js %.1f KB" % (len(data) / 1024, len(worker.encode()) / 1024))
    assert not os.path.exists(os.path.join(DIST, "sql-wasm.js")), "sql-wasm.js is bundled into worker.js, do not ship it"
    # sql.js가 작업자 안에 묶여 있음(실행 중 받아 글자를 코드로 바꾸지 않음)
    assert "initSqlJs" in worker or "locateFile" in worker, "sql.js not bundled into worker.js"
    for bad in ("new Function", "eval(", "importScripts", "sql-wasm.js", "sqlJsURL"):
        assert bad not in worker, "worker.js must not contain %r (CSP unsafe-eval / runtime script loading)" % bad
    assert not re.search(r"\brequire\(\s*[\"'](?:node:)?(?:fs|crypto|path)", worker), "node-only require left in worker.js"


def test_no_legacy_strings():
    """no pyodide/codemirror strings: 배포 파일·sw.js·licenses.txt에 리아 시절 실행기·입력창 이름이 없음"""
    _build()
    found = []
    for p in _dist_text_files():
        m = LEGACY.search(_read(p))
        if m:
            found.append("%s: %r" % (os.path.relpath(p, DIST), m.group(0)))
    assert not found, "legacy strings in dist: %s" % found


SW_ACTIVATE = r"""
const [swPath, namesJson] = process.argv.slice(1);
const fs = await import("node:fs"); const vm = await import("node:vm");
const store = new Map(JSON.parse(namesJson).map((n) => [n, new Map()]));
const deleted = [];
const listeners = {};
const caches = {
  keys: async () => [...store.keys()],
  delete: async (k) => { deleted.push(k); return store.delete(k); },
  open: async (k) => { if (!store.has(k)) store.set(k, new Map()); const m = store.get(k);
    return { match: async () => undefined, put: async () => {}, addAll: async () => {}, keys: async () => [] }; },
  match: async () => undefined,
};
const self = { addEventListener: (t, f) => { listeners[t] = f; }, location: { origin: "https://fullcharge13.github.io" },
  clients: { claim: async () => {} }, skipWaiting: async () => {} };
vm.runInNewContext(fs.readFileSync(swPath, "utf8"), { self, caches, URL, Request: class {}, fetch: async () => { throw new Error("offline"); },
  setTimeout, clearTimeout, console });
let p = null;
listeners.activate({ waitUntil: (x) => { p = x; } });
await p;
process.stdout.write(JSON.stringify({ deleted: deleted.sort(), left: [...store.keys()].sort() }));
"""


def test_sw_deletes_only_dueogi():
    """sw deletes only dueogi- caches: 지우기 조건 검사(글자) + activate를 Node에서 돌려 봄"""
    _build()
    sw = _read(os.path.join(DIST, "sw.js"))
    deletes = [m.start() for m in re.finditer(r"caches\.delete\(", sw)]
    assert deletes, "sw.js has no caches.delete"
    for i in deletes:
        cond = sw[max(0, i - 200):i]
        assert 'key.startsWith("dueogi-")' in cond, "caches.delete not guarded by startsWith(\"dueogi-\"): ...%s" % cond[-120:]
    assert "ria-" not in re.sub(r"//.*", "", sw), "sw.js code must not name ria- caches"
    game = re.search(r'const GAME_CACHE = "([^"]+)"', sw).group(1)
    names = list(DUEOGI_CACHES) + ["dueogi-game-v0.0-aaaaaaaaaa", "dueogi-engine-1.15.1", ENGINE_CACHE, game, "other-app-cache"]
    r = subprocess.run(["node", "--input-type=module", "-e", SW_ACTIVATE, os.path.join(DIST, "sw.js"), json.dumps(names)],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    got = json.loads(r.stdout)
    print("    activate deleted %s, kept %s" % (got["deleted"], got["left"]))
    assert got["deleted"] == sorted(["dueogi-game-v0.0-aaaaaaaaaa", "dueogi-engine-1.15.1"]), got
    for keep in DUEOGI_CACHES + (ENGINE_CACHE, game, "other-app-cache"):
        assert keep in got["left"], (keep, got)


def test_sw_static():
    _build()
    sw = _read(os.path.join(DIST, "sw.js"))
    assert "__DUEOGI_" not in sw and "__DUEOGI_" not in sw, "placeholders left in sw.js"
    assert 'const VERSION = "v0.2.1";' in sw
    assert re.search(r'const GAME_CACHE = "dueogi-game-v0\.2\.1-[0-9a-f]{10}";', sw), sw[:600]
    assert 'const ENGINE_CACHE = "%s";' % ENGINE_CACHE in sw and ENGINE_CACHE == "dueogi-engine-1.15.2", ENGINE_CACHE
    engine = json.loads(re.search(r"const ENGINE_FILES = (\[[^\]]*\]);", sw).group(1))
    assert engine == ["sql-wasm.wasm"], engine
    game = json.loads(re.search(r"const GAME_FILES = (\[[^\]]*\]);", sw).group(1))
    assert {"./", "index.html", "worker.js", "manifest.webmanifest", "licenses.txt"} <= set(game), game
    assert "NETWORK_TIMEOUT_MS = 4000" in sw
    offline = _read(os.path.join(ROOT, "src", "offline.js"))
    assert 'export const ENGINE_CACHE_PREFIX = "dueogi-engine-";' in offline
    assert 'export const ENGINE_REQUIRED = ["sql-wasm.wasm"];' in offline


SW_ENGINE = r"""
const [swPath, casesJson] = process.argv.slice(1);
const fs = await import("node:fs"); const vm = await import("node:vm");
const out = [];
for (const c of JSON.parse(casesJson)) {
  const store = new Map();
  const listeners = {};
  const caches = {
    keys: async () => [...store.keys()],
    delete: async (k) => store.delete(k),
    open: async (k) => { if (!store.has(k)) store.set(k, new Map()); const m = store.get(k);
      return { match: async (r) => m.get(typeof r === "string" ? r : new URL(r.url).pathname.split("/").pop()),
               put: async (r, res) => { m.set(typeof r === "string" ? r : new URL(r.url).pathname.split("/").pop(), res); },
               addAll: async () => {}, keys: async () => [...m.keys()] }; },
  };
  const mkRes = () => {
    const body = new Uint8Array(c.bytes);
    const res = new Response(body, { status: c.status, headers: c.type ? { "content-type": c.type } : {} });
    Object.defineProperty(res, "type", { value: "basic" });
    return res;
  };
  const self = { addEventListener: (t, f) => { listeners[t] = f; }, location: { origin: "https://fullcharge13.github.io" },
    clients: { claim: async () => {} }, skipWaiting: async () => {} };
  vm.runInNewContext(fs.readFileSync(swPath, "utf8"), { self, caches, URL, Request: class { constructor(u) { this.url = new URL(u, "https://fullcharge13.github.io/Learning-SQL/").href; } },
    Response, fetch: async () => mkRes(), setTimeout, clearTimeout, console });
  // 1) 설치 때 미리 받기
  let p = null;
  listeners.install({ waitUntil: (x) => { p = x; } });
  await p;
  const engineName = [...store.keys()].find((k) => k.startsWith("dueogi-engine-"));
  const afterInstall = engineName ? store.get(engineName).size : 0;
  // 2) 처음 쓸 때 받기(fetch 가로채기)
  store.clear();
  let resp = null;
  listeners.fetch({ request: { method: "GET", mode: "cors", url: "https://fullcharge13.github.io/Learning-SQL/sql-wasm.wasm" },
    respondWith: (x) => { resp = x; } });
  const r = await resp;
  const engineName2 = [...store.keys()].find((k) => k.startsWith("dueogi-engine-"));
  out.push({ name: c.name, afterInstall, afterFetch: engineName2 ? store.get(engineName2).size : 0, served: r.status });
}
process.stdout.write(JSON.stringify(out));
"""


def test_sw_engine_cache_rejects_bad_wasm():
    """sw never caches a bad wasm: 로그인 화면 HTML(200)·잘린 파일은 실행기 저장본에 넣지 않고, 진짜 wasm만 넣음(설치·처음 받기 둘 다)"""
    _build()
    sw_path = os.path.join(DIST, "sw.js")
    sw = _read(sw_path)
    size = os.path.getsize(os.path.join(DIST, "sql-wasm.wasm"))
    assert "const ENGINE_BYTES = %d;" % size in sw, "sw.js must carry the wasm byte length"
    cases = [
        {"name": "wasm type", "status": 200, "type": "application/wasm", "bytes": 16},
        {"name": "right length, octet-stream", "status": 200, "type": "application/octet-stream", "bytes": size},
        {"name": "captive portal html", "status": 200, "type": "text/html; charset=utf-8", "bytes": 512},
        {"name": "truncated, no type", "status": 200, "type": "", "bytes": size - 1},
        {"name": "404", "status": 404, "type": "application/wasm", "bytes": 16},
    ]
    r = subprocess.run(["node", "--input-type=module", "-e", SW_ENGINE, sw_path, json.dumps(cases)],
                       capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    got = {x["name"]: x for x in json.loads(r.stdout)}
    print("    " + "; ".join("%s: install %d fetch %d" % (n, g["afterInstall"], g["afterFetch"]) for n, g in got.items()))
    for good in ("wasm type", "right length, octet-stream"):
        assert got[good]["afterInstall"] == 1 and got[good]["afterFetch"] == 1, got[good]
    for bad in ("captive portal html", "truncated, no type", "404"):
        assert got[bad]["afterInstall"] == 0 and got[bad]["afterFetch"] == 0, got[bad]
    # 저장하지 않아도 받은 답은 그대로 돌려준다(작업자가 오류를 보고 「실행기 준비 실패」를 띄움)
    assert got["captive portal html"]["served"] == 200


def test_manifest_and_icons():
    _build()
    with open(os.path.join(DIST, "manifest.webmanifest"), encoding="utf-8") as f:
        m = json.load(f)
    assert m["name"] == "두억이와 SQL!"
    assert m["short_name"] == "두억이와 SQL"
    assert m["lang"] == "ko" and m["display"] == "standalone"
    assert m["start_url"] == "./" and m["scope"] == "./", "relative start_url/scope so the app works under /Learning-SQL/"
    for k in ("theme_color", "background_color"):
        assert m[k].startswith("#") and len(m[k]) == 7, (k, m[k])
    sizes = {i["sizes"] for i in m["icons"]}
    assert {"180x180", "192x192", "512x512"} <= sizes, sizes
    assert any("maskable" in i.get("purpose", "") for i in m["icons"])
    for i in m["icons"]:
        w, h = _png_size(os.path.join(DIST, i["src"]))
        assert "%dx%d" % (w, h) == i["sizes"], (i, w, h)
    for rel, px in ICON_SIZES.items():
        assert _png_size(os.path.join(DIST, rel)) == (px, px), rel


def test_third_party_notices():
    """licenses.txt: sql.js MIT 전문(node_modules의 LICENSE 그대로)+AUTHORS 주소, Emscripten MIT, SQLite 퍼블릭 도메인 문구. 미리 받기·설정 링크"""
    _build()
    path = os.path.join(DIST, "licenses.txt")
    assert os.path.exists(path), "dist/licenses.txt missing"
    txt = _read(path)
    lic = _read(os.path.join(ROOT, "node_modules", "sql.js", "LICENSE")).strip()
    assert "== sql.js %s (MIT)" % SQLJS_VERSION in txt, txt[:400]
    assert lic in txt, "sql.js LICENSE text must be included verbatim"
    assert "Copyright (c) 2017 sql.js authors" in txt
    assert "https://github.com/sql-js/sql.js/blob/master/AUTHORS" in txt, "AUTHORS pointer for sql.js missing"
    assert "== Emscripten" in txt and "Emscripten authors" in txt and "Permission is hereby granted" in txt.split("== Emscripten", 1)[1], \
        "Emscripten MIT notice missing"
    assert "SQLite" in txt and "public domain" in txt.lower(), "SQLite public-domain notice missing"
    assert "퍼블릭 도메인" in txt
    assert "esbuild" not in txt, "build tool is not shipped, keep it out"
    sw = _read(os.path.join(DIST, "sw.js"))
    assert '"licenses.txt"' in sw, "licenses.txt must be precached for offline"
    html = _read(os.path.join(DIST, "index.html"))
    assert "licenses.txt" in html, "settings must link to licenses.txt"


def test_clean_and_docs_icons():
    out = os.path.join(OUT, "dist-clean")
    os.makedirs(os.path.join(out, "icons"), exist_ok=True)
    stale = [os.path.join(out, "icons", "stale.png"), os.path.join(out, "sql-wasm.js")]
    keep = os.path.join(out, "notes.txt")
    for p in stale + [keep]:
        with open(p, "w") as f:
            f.write("x")
    docs_dir = os.path.join(ROOT, "docs", "img")
    before = {f: os.stat(os.path.join(docs_dir, f)).st_mtime_ns for f in os.listdir(docs_dir)}
    r = _run_build("--out", out)
    assert r.returncode == 0, r.stdout + r.stderr
    for p in stale:
        assert not os.path.exists(p), "build must clear files it owns: " + p
    assert os.path.exists(keep), "build must not delete files it does not own"
    after = {f: os.stat(os.path.join(docs_dir, f)).st_mtime_ns for f in os.listdir(docs_dir)}
    assert after == before, "docs/img/ changed without --update-docs-icons"
    shutil.rmtree(out, ignore_errors=True)


def test_node_missing():
    env = {**os.environ, "PATH": "/nonexistent"}
    r = _run_build("--out", os.path.join(OUT, "dist-nonode"), env=env)
    assert r.returncode != 0
    assert "node" in (r.stdout + r.stderr).lower() and "Traceback" not in r.stderr, r.stderr


def test_guards():
    b = _build_module()
    try:
        b.check_output('<head><link rel="stylesheet" href="style.css"></head>')
    except SystemExit as e:
        assert "stylesheet" in str(e), e
    else:
        raise AssertionError("check_output accepted a stylesheet link")
    try:
        b.check_output('<script type="module" src="app.js"></script>')
    except SystemExit as e:
        assert "script" in str(e), e
    else:
        raise AssertionError("check_output accepted <script src>")
    b.check_output("<style>a{}</style><script>1</script>")
    for bad in ("x = new Function('a', s)", "importScripts('sql-wasm.js')", "eval(src)"):
        try:
            b.check_worker(bad)
        except SystemExit as e:
            assert "worker" in str(e), e
        else:
            raise AssertionError("check_worker accepted: " + bad)
    b.check_worker("var initSqlJs = function (m) { return m.locateFile('sql-wasm.wasm'); };")


# ---------------------------------------------------------------- 브라우저

class _Handler(http.server.SimpleHTTPRequestHandler):
    """빌드 폴더를 준다. 시험이 STATE로 네트워크 상태를 흉내 낸다."""
    STATE = {"block_wasm": False, "slow_s": 0, "block_chapters": False, "slow_chapter_s": 0,
             "chapter_404": False, "block_names": (), "block_sw": False}
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm",
        ".json": "application/json", ".webmanifest": "application/manifest+json",
    }

    def do_GET(self):
        p = self.path.split("?")[0]
        if p.endswith("/sql-wasm.wasm") and self.STATE["block_wasm"]:
            self.close_connection = True  # 답 없이 끊음(받기 실패 흉내)
            return
        if "/lessons/" in p and self.STATE["block_chapters"]:
            self.close_connection = True  # 장 파일만 끊음
            return
        if "/lessons/" in p and p.rsplit("/", 1)[-1] in self.STATE["block_names"]:
            self.close_connection = True  # 이 장 파일만 끊음
            return
        if "/lessons/" in p and self.STATE["chapter_404"]:
            self.send_error(404)  # 새 판을 올려 옛 이름의 장 파일이 없어진 서버 흉내
            return
        if p.endswith("/sw.js") and self.STATE["block_sw"]:
            self.send_error(404)  # 새 서비스 작업자 설치 실패 흉내
            return
        if "/lessons/" in p and self.STATE["slow_chapter_s"]:
            time.sleep(self.STATE["slow_chapter_s"])
        if (p.endswith("/") or p.endswith("/index.html")) and self.STATE["slow_s"]:
            time.sleep(self.STATE["slow_s"])
        try:
            return super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def end_headers(self):
        # 브라우저 HTTP 저장본을 막아, 오프라인에서 뜨는 것이 서비스 작업자 저장본 덕분인지 확인한다.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], (ConnectionError, BrokenPipeError)):
            super().handle_error(request, client_address)


def _reset_state():
    _Handler.STATE.update(block_wasm=False, slow_s=0, block_chapters=False, slow_chapter_s=0,
                          chapter_404=False, block_names=(), block_sw=False)


class _Browser:
    """빌드 폴더 하나를 새 서버·새 브라우저 문맥으로 연다(서비스 작업자가 시험끼리 섞이지 않게).
    sub: 하위 경로(예 "Learning-SQL/") — folder가 그 상위 폴더일 때"""

    def __init__(self, folder, service_workers="allow", init_save=None, sub=""):
        from playwright.sync_api import sync_playwright
        _reset_state()
        self.httpd = _Server(("127.0.0.1", 0), functools.partial(_Handler, directory=folder))
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.origin = "http://127.0.0.1:%d/" % self.httpd.server_address[1]
        self.url = self.origin + sub
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch()
        device = {k: v for k, v in self.pw.devices["iPhone 17"].items() if k != "default_browser_type"}
        self.context = self.browser.new_context(service_workers=service_workers, **device)
        if init_save is not None:
            self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { localStorage.setItem(%s, %s); sessionStorage.setItem('seeded', '1'); }"
                                         % (json.dumps(SAVE_KEY), json.dumps(json.dumps(init_save))))
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda e: self.errors.append("pageerror: " + str(e)))
        self.page.on("console", lambda m: self.errors.append("console.error: " + m.text) if m.type == "error" else None)

    def home(self):
        pg = self.page
        pg.wait_for_selector(".screen.splash #go", timeout=20_000)
        assert APP_VERSION in pg.inner_text(".screen.splash .ver")
        pg.click("#go")
        pg.wait_for_selector("#app[data-screen=home]", timeout=10_000)

    def wait_controlled(self):
        self.page.wait_for_function("() => navigator.serviceWorker && navigator.serviceWorker.controller",
                                    timeout=30_000)

    def cache_keys(self):
        return self.page.evaluate("async () => (await caches.keys()).sort()")

    def cached_urls(self, prefix=""):
        return self.page.evaluate("""async (prefix) => {
            const out = [];
            for (const k of await caches.keys()) {
                if (!k.startsWith(prefix)) continue;
                const c = await caches.open(k);
                for (const req of await c.keys()) out.push(req.url);
            }
            return out;
        }""", prefix)

    def wait_cached(self, prefix, name, timeout=30):
        deadline = time.monotonic() + timeout
        while True:
            if any(u.endswith("/" + name) for u in self.cached_urls(prefix)) or time.monotonic() > deadline:
                return any(u.endswith("/" + name) for u in self.cached_urls(prefix))
            self.page.wait_for_timeout(200)

    def seed_ria(self):
        """같은 주소에 리아가 남긴 저장본과 저장 칸을 만든다(앱을 열기 전에, 같은 주소의 다른 파일에서)"""
        self.page.goto(self.origin + "favicon-not-there")
        self.page.evaluate("""async ([names, key]) => {
            for (const n of names) { const c = await caches.open(n); await c.put('/ria/' + n, new Response('ria')); }
            localStorage.setItem(key, JSON.stringify({ saveVer: 5, bytes: 120, completed_lessons: ['1-1'] }));
        }""", [list(DUEOGI_CACHES), DUEOGI_SAVE_KEY])

    def ria_left(self):
        return self.page.evaluate("""async ([names, key]) => ({
            caches: (await caches.keys()).filter((k) => names.includes(k)).sort(),
            save: localStorage.getItem(key) }) """, [list(DUEOGI_CACHES), DUEOGI_SAVE_KEY])

    def close(self):
        try:
            self.browser.close()
            self.pw.stop()
        finally:
            self.httpd.shutdown()


def _flow_module():
    spec = importlib.util.spec_from_file_location("dueogi_flow", os.path.join(ROOT, "tests", "flow.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_flow = {}


def _driver(page):
    """flow.py의 레슨 풀기 도우미(App 메서드)를 이 page에 빌려 씀"""
    if not _flow:
        _flow["mod"] = _flow_module()
    mod = _flow["mod"]

    class Drv(mod.App):
        def __init__(self, pg):  # noqa: D401 (App.__init__은 새 문맥을 열므로 쓰지 않음)
            self.page = pg
            self.errors = []
    d = Drv(page)
    d.to_build = lambda lid="1-1": mod._to_build(d, lid)
    return d


def _run_first_build(pg, lid="1-1"):
    """lid의 첫 조립 문제까지 가서 정답 카드를 놓고 「실행」 → 결과 표. 돌려줌: (열 이름, 행 수)"""
    d = _driver(pg)
    pg.evaluate("(id) => window.__dueogi.ctx.show('lesson', { id })", lid)
    items = d.to_build(lid)
    it = next(x for x in items if x["type"] == "build")
    d.place(it["cards"])
    d.build_press("run")
    pg.wait_for_selector("#console .rtable", timeout=20_000)
    heads = pg.eval_on_selector_all("#console .rtable thead th", "es => es.map((e) => e.innerText)")
    rows = pg.eval_on_selector_all("#console .rtable tbody tr", "es => es.length")
    return heads, rows


def test_browser_offline():
    """offline open after first visit: 한 번 연 뒤 오프라인 새로고침 → 1-1 첫 조립 문제 「실행」이 됨. 리아 저장본은 그대로"""
    _build()
    b = _Browser(DIST)
    try:
        pg = b.page
        b.seed_ria()
        # 1) 온라인: 홈 화면, 실행기 준비, SQL 한 줄
        pg.goto(b.url)
        b.home()
        info = pg.evaluate("() => String(window.__dueogi.ctx.sql.workerURL)")
        assert info == b.url + "worker.js", info
        r = pg.evaluate("() => window.__dueogi.ctx.sql.run('SELECT COUNT(*) AS n FROM shops')")
        assert r["error"] is None and r["columns"] == ["n"] and r["rows"][0][0] > 0, r
        print("    online: SELECT COUNT(*) FROM shops → %s" % r["rows"][0][0])
        # 2) 서비스 작업자가 이 페이지를 통제하고, 게임·실행기 저장본이 찼을 때까지
        b.wait_controlled()
        assert b.wait_cached(ENGINE_CACHE, "sql-wasm.wasm"), "sql-wasm.wasm not in %s: %r" % (ENGINE_CACHE, b.cache_keys())
        game = b.cached_urls("dueogi-game-")
        for f in ("index.html", "worker.js", "licenses.txt"):
            assert any(u.endswith("/" + f) for u in game), (f, game)
        keys = b.cache_keys()
        print("    caches: %s" % keys)
        assert [k for k in keys if k.startswith("dueogi-")] == sorted([k for k in keys if k.startswith("dueogi-game-")] + [ENGINE_CACHE]), keys
        # 3) 오프라인 → 새로고침 → 첫 화면 v0.2.1 → 1-1 첫 조립 문제 「실행」
        b.context.set_offline(True)
        resp = pg.reload()
        assert resp is not None and resp.from_service_worker, "offline page not served by sw.js"
        b.home()
        heads, rows = _run_first_build(pg, "1-1")
        print("    offline 1-1 build 「실행」: heads %s, %d rows" % (heads, rows))
        assert heads and rows > 0, (heads, rows)
        pg.screenshot(path=os.path.join(OUT, "build_offline_run.png"))
        # 설정: 「오프라인 준비 완료」
        pg.evaluate("() => window.__dueogi.ctx.show('settings')")
        pg.wait_for_selector("#offline.ready, #offline.wait:not(:has-text('확인하는 중'))", timeout=10_000)
        assert "ready" in pg.get_attribute("#offline", "class"), pg.inner_text("#offline")
        b.context.set_offline(False)
        # 같은 주소의 리아: 저장본·저장 칸 그대로
        left = b.ria_left()
        assert left["caches"] == sorted(DUEOGI_CACHES) and left["save"], left
        bad = [e for e in b.errors if not re.search(r"Failed to load resource|ERR_INTERNET_DISCONNECTED", e)]
        assert not bad, bad
    finally:
        b.close()


def test_subpath_offline():
    """깃허브 페이지처럼 /Learning-SQL/ 아래에서: 열기·SQL 실행·오프라인 새로고침 뒤 실행"""
    _build()
    root = os.path.join(OUT, "pages")
    shutil.rmtree(root, ignore_errors=True)
    shutil.copytree(DIST, os.path.join(root, "Learning-SQL"))
    b = _Browser(root, sub="Learning-SQL/")
    try:
        pg = b.page
        pg.goto(b.url)
        b.home()
        st = pg.evaluate("() => ({ w: String(window.__dueogi.ctx.sql.workerURL), m: window.__dueogi.ctx.sql.wasmURL })")
        assert st == {"w": b.url + "worker.js", "m": b.url + "sql-wasm.wasm"}, st
        r = pg.evaluate("() => window.__dueogi.ctx.sql.run('SELECT name FROM shops ORDER BY shop_id LIMIT 1')")
        assert r["error"] is None and r["rows"] == [["도깨비 국밥집"]], r
        b.wait_controlled()
        scope = pg.evaluate("async () => (await navigator.serviceWorker.getRegistration()).scope")
        assert scope == b.url, scope
        assert b.wait_cached(ENGINE_CACHE, "sql-wasm.wasm")
        b.context.set_offline(True)
        resp = pg.reload()
        assert resp is not None and resp.from_service_worker
        b.home()
        r = pg.evaluate("() => window.__dueogi.ctx.sql.run('SELECT COUNT(*) FROM items')")
        assert r["error"] is None and r["rows"][0][0] > 0, r
        heads, rows = _run_first_build(pg, "1-1")
        print("    /Learning-SQL/: scope %s, offline run OK (%s, %d rows)" % (scope, heads, rows))
        b.context.set_offline(False)
    finally:
        b.close()
        shutil.rmtree(root, ignore_errors=True)


def test_blocked_engine_install():
    """sql-wasm.wasm을 못 받아도 sw.js 설치는 끝나고, 오프라인 새로고침에 앱이 뜸(실행기는 「준비 중」)"""
    _build()
    b = _Browser(DIST)
    try:
        _Handler.STATE["block_wasm"] = True
        b.page.goto(b.url)
        b.home()
        b.wait_controlled()  # 설치·활성화가 실행기 실패에 막히지 않음
        cached = b.cached_urls()
        assert not any(u.endswith("/sql-wasm.wasm") for u in cached), cached
        assert any(u.endswith("/index.html") for u in cached), cached
        b.context.set_offline(True)
        resp = b.page.reload()
        assert resp is not None and resp.from_service_worker
        b.home()
        b.page.wait_for_function("() => window.__dueogi.ctx.sql.status !== 'loading'", timeout=40_000)
        st = b.page.evaluate("() => window.__dueogi.ctx.sql.status")
        print("    blocked wasm: sw installed, %d files cached, offline home OK (engine status: %s)" % (len(cached), st))
        assert st == "failed", st
        # 받기 실패로 sql.js(Emscripten)가 남기는 알림은 예상된 것(flow.py test_build_no_engine과 같은 거르기)
        expected = ("sql-wasm.wasm", "Failed to load resource", "wasm streaming compile failed", "falling back to ArrayBuffer")
        bad = [e for e in b.errors if not any(x in e for x in expected)]
        assert not bad, bad
    finally:
        _reset_state()
        b.close()


def test_slow_network_falls_back():
    _build()
    b = _Browser(DIST)
    try:
        b.page.goto(b.url)
        b.home()
        b.wait_controlled()
        _Handler.STATE["slow_s"] = 8
        t0 = time.monotonic()
        resp = b.page.reload(timeout=20_000)
        b.page.wait_for_selector(".screen.splash #go", timeout=20_000)
        dt = time.monotonic() - t0
        print("    slow server (8 s): page shown after %.1f s" % dt)
        assert resp is not None and resp.from_service_worker
        assert 3.5 <= dt < 7.0, dt
    finally:
        _reset_state()
        b.close()


def test_cache_rotation():
    """내용이 바뀐 빌드 → 새 dueogi-game- 저장본, 옛 것은 지워짐. 실행기 저장본(dueogi-engine-1.15.2)과 리아 저장본은 남음"""
    folder = os.path.join(OUT, "dist-rotate")
    r = _run_build("--out", folder, "--build-id", "A")
    assert r.returncode == 0, r.stdout + r.stderr
    b = _Browser(folder)
    try:
        b.seed_ria()
        b.page.goto(b.url)
        b.home()
        b.wait_controlled()
        assert b.wait_cached(ENGINE_CACHE, "sql-wasm.wasm")
        old = [k for k in b.cache_keys() if k.startswith("dueogi-game-")]
        assert len(old) == 1, old
        r = _run_build("--out", folder, "--build-id", "B")
        assert r.returncode == 0, r.stdout + r.stderr
        b.page.evaluate("async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }")
        deadline = time.monotonic() + 30
        while True:
            new = [k for k in b.cache_keys() if k.startswith("dueogi-game-")]
            if old[0] not in new and new or time.monotonic() > deadline:
                break
            b.page.wait_for_timeout(200)
        keys = b.cache_keys()
        print("    cache rotation: %s -> %s; all caches %s" % (old[0], new[0], keys))
        assert len(new) == 1 and new[0] != old[0], (old, new)
        assert ENGINE_CACHE in keys, "engine cache must survive a game update: %r" % keys
        assert b.ria_left()["caches"] == sorted(DUEOGI_CACHES), keys
    finally:
        b.close()
        shutil.rmtree(folder, ignore_errors=True)


# ---------------------------------------------------------------- 장 따로 불러오기 (리아 v0.3 작업 1)

DUMP_LESSONS = r"""
const fs = await import("node:fs"); const path = await import("node:path"); const url = await import("node:url");
const dir = process.argv[1];
const out = {};
for (const f of fs.readdirSync(dir).filter((f) => /^ch\d+\.js$/.test(f))) {
  const m = await import(url.pathToFileURL(path.join(dir, f)).href);
  out[f] = { CHAPTER: m.CHAPTER, LESSONS: m.LESSONS,
    ...(Array.isArray(m.ADVANCED) && m.ADVANCED.length ? { ADVANCED: m.ADVANCED.map((l) => ({ ...l, isAdvanced: true })) } : {}),
    ...(Array.isArray(m.TEMPLATES) && m.TEMPLATES.length ? { TEMPLATES: m.TEMPLATES } : {}) };
}
process.stdout.write(JSON.stringify(out));
"""


def _source_lessons(folder=None):
    folder = folder or os.path.join(ROOT, "data", "lessons")
    r = subprocess.run(["node", "--input-type=module", "-e", DUMP_LESSONS, folder], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


SNAP = os.path.join(OUT, "lessons-snap")
SPLIT_OUT = os.path.join(OUT, "dist-split")


def _snapshot():
    """data/lessons를 한 번 복사해 둔다(다른 작업이 장 파일을 고치는 중이어도 시험끼리 같은 내용을 보게)"""
    if not _built.get("snap"):
        shutil.rmtree(SNAP, ignore_errors=True)
        shutil.copytree(os.path.join(ROOT, "data", "lessons"), SNAP)
        _built["snap"] = True
    return SNAP


def _lesson_texts():
    """index.html에 있으면 안 되는 글: 문제 문장, 카드 설명, 문제 해설"""
    texts = set()
    for mod in _source_lessons(_snapshot()).values():
        for l in mod["LESSONS"]:
            for c in l.get("cards", []):
                texts.add(c["say"])
            for it in l.get("items", []):
                for k in ("q", "explain"):
                    if it.get(k):
                        texts.add(it[k])
    return sorted(t for t in texts if len(t) >= 12)  # 아주 짧은 글은 앱 글자와 우연히 겹칠 수 있어 뺀다


def _split():
    """장 따로 불러오기 브라우저 시험용 빌드: 스냅숏 내용"""
    _build("--out", SPLIT_OUT, "--lessons-dir", _snapshot())
    return SPLIT_OUT


def _chapter_table(html):
    m = re.search(r"window\.DUEOGI_CHAPTER_FILES = (\{[^}]*\});", html)
    assert m, "DUEOGI_CHAPTER_FILES table not in index.html"
    return {int(k): v for k, v in json.loads(m.group(1)).items()}


def _chapter_files(folder):
    d = os.path.join(folder, "lessons")
    return sorted(f for f in os.listdir(d) if CHAPTER_FILE.match(f)) if os.path.isdir(d) else []


def test_split_static():
    out = _build("--out", SPLIT_OUT, "--lessons-dir", _snapshot())
    html = _read(os.path.join(SPLIT_OUT, "index.html"))
    files = _chapter_files(SPLIT_OUT)
    print("    chapter files: %d, %.1f KB total" % (len(files), sum(os.path.getsize(os.path.join(SPLIT_OUT, "lessons", f)) for f in files) / 1024))
    assert len(files) == 17, files
    src = _source_lessons(_snapshot())
    table = _chapter_table(html)
    assert sorted(table.values()) == sorted("lessons/" + f for f in files), (table, files)
    for f in files:
        n, h = CHAPTER_FILE.match(f).groups()
        with open(os.path.join(SPLIT_OUT, "lessons", f), "rb") as fh:
            data = fh.read()
        assert hashlib.sha256(data).hexdigest()[:8] == h, "file name hash must come from content: " + f
        assert json.loads(data) == src["ch%s.js" % n], "chapter file content differs from data/lessons/ch%s.js" % n
        assert table[int(n)] == "lessons/" + f
    leaked = [t for t in _lesson_texts() if t in html]
    assert not leaked, "lesson text found in index.html: %r" % leaked[:3]
    assert "lessons/" in out and "KB" in out


def _lesson_index(html):
    m = re.search(r"window\.DUEOGI_LESSON_INDEX = (.*?);\nwindow\.DUEOGI_CHAPTER_FILES", html, re.S)
    assert m, "DUEOGI_LESSON_INDEX not in index.html"
    return json.loads(m.group(1))


ADV_SNAP = os.path.join(OUT, "lessons-adv")
ADV_OUT = os.path.join(OUT, "dist-adv")


def _wrap_chapter(folder, n, extra_js):
    """chN.js를 chN.orig.mjs로 옮기고, 그것을 다시 내보내며 extra_js를 덧붙인 chN.js를 만든다"""
    os.rename(os.path.join(folder, "ch%d.js" % n), os.path.join(folder, "ch%d.orig.mjs" % n))
    with open(os.path.join(folder, "ch%d.js" % n), "w", encoding="utf-8") as f:
        f.write('import * as o from "./ch%d.orig.mjs";\nexport const CHAPTER = o.CHAPTER;\n'
                'export const TEMPLATES = o.TEMPLATES;\n%s\n' % (n, extra_js))


def test_split_advanced():
    """ADVANCED(심화)는 그 장 JSON에, 목록(index)에는 장의 advanced 칸에 stub만. 없는 장은 그대로"""
    shutil.rmtree(ADV_SNAP, ignore_errors=True)
    shutil.copytree(_snapshot(), ADV_SNAP)
    for n in (1, 2):
        adv = [{"id": "%d-A%d" % (n, k), "chapter": n, "title": "심화 %d" % k, "goal": "심화 시험 목표",
                "concepts": ["select"], "cards": [], "items": [{"type": "choice", "q": "심화 시험 문제 %d-A%d" % (n, k),
                "options": ["a", "b", "c"], "answer": 0, "explain": "x", "concept": "select"}]} for k in (1, 2, 3)]
        _wrap_chapter(ADV_SNAP, n, "export const LESSONS = o.LESSONS;\nexport const ADVANCED = %s;" % json.dumps(adv, ensure_ascii=False))
    _build("--out", ADV_OUT, "--lessons-dir", ADV_SNAP)
    html = _read(os.path.join(ADV_OUT, "index.html"))
    src = _source_lessons(ADV_SNAP)
    table = _chapter_table(html)
    for n in (1, 2):
        got = json.loads(_read(os.path.join(ADV_OUT, table[n])))
        assert [l["id"] for l in got["ADVANCED"]] == ["%d-A1" % n, "%d-A2" % n, "%d-A3" % n], got.get("ADVANCED")
        assert all(l["isAdvanced"] is True for l in got["ADVANCED"])
        assert got == src["ch%d.js" % n], "chapter %d file differs from source" % n
    # 3장부터는 실제 장 파일 그대로다(심화가 이미 들어간 장도 있음). 심화가 없는 장은 ADVANCED·advanced 칸이 없어야 한다.
    idx = {c["id"]: c for c in _lesson_index(html)}
    plain = [n for n in table if n > 2 and "ADVANCED" not in src["ch%d.js" % n]]
    # 심화 없는 장이 남아 있으면 그 장에 ADVANCED·advanced 칸이 없는지 본다(아래 for n in plain).
    # 모든 장에 심화가 들어가면 plain이 비어 그 검사는 건너뛴다 — 실패로 치지 않는다.
    for n in table:
        if n > 2:
            got = json.loads(_read(os.path.join(ADV_OUT, table[n])))
            assert got == src["ch%d.js" % n], "chapter %d file differs from source" % n
    for n in plain:
        assert "ADVANCED" not in json.loads(_read(os.path.join(ADV_OUT, table[n]))), n
        assert "advanced" not in idx[n], n
    # 1~3장 목록 stub id = N-A1..N-A3(1·2장은 위 시험용 심화, 3장은 실제 ch3.js 심화)
    for n in (1, 2, 3):
        assert [x["id"] for x in idx[n].get("advanced", [])] == ["%d-A%d" % (n, k) for k in (1, 2, 3)], (n, idx[n].get("advanced"))
    stubs = idx[1]["advanced"]
    assert [x["id"] for x in stubs] == ["1-A1", "1-A2", "1-A3"], stubs
    assert set(stubs[0]) == {"id", "chapter", "title", "goal", "concepts", "isAdvanced"}, stubs[0]
    assert stubs[0]["isAdvanced"] is True and stubs[0]["chapter"] == 1 and stubs[0]["concepts"] == ["select"]
    assert [l["id"] for l in idx[1]["lessons"]] == ["1-%d" % k for k in range(1, 6)], "main lessons unchanged"
    assert "심화 시험 문제 1-A2" not in html, "advanced lesson text leaked into index.html"


def test_split_templates():
    """매일 도전 틀(TEMPLATES)은 그 장 JSON에, 목록에는 장의 templates 칸에 id·개념만. 틀 글은 index.html에 없음"""
    snap = _snapshot()
    _build("--out", SPLIT_OUT, "--lessons-dir", snap)
    html = _read(os.path.join(SPLIT_OUT, "index.html"))
    src = _source_lessons(snap)
    with_tpl = sorted(int(k[2:-3]) for k, m in src.items() if m.get("TEMPLATES"))
    assert 1 in with_tpl and 2 in with_tpl, with_tpl
    table = _chapter_table(html)
    idx = {c["id"]: c for c in _lesson_index(html)}
    for n in table:
        got = json.loads(_read(os.path.join(SPLIT_OUT, table[n])))
        if n in with_tpl:
            assert got["TEMPLATES"] == src["ch%d.js" % n]["TEMPLATES"], n
            assert idx[n]["templates"] == [{"id": t["id"], "concept": t["concept"]} for t in got["TEMPLATES"]], idx[n].get("templates")
            for t in got["TEMPLATES"]:
                assert t["q"] not in html, "template text leaked into index.html: " + t["id"]
        else:
            assert "TEMPLATES" not in got and "templates" not in idx[n], n


UPD_SNAP = os.path.join(OUT, "lessons-upd")
UPD_OUT = os.path.join(OUT, "dist-upd")


def test_split_updated():
    """레슨의 updated("v0.2")는 목록 stub에도 옮겨진다(「새 내용」 점). 없는 레슨 stub에는 칸이 없다"""
    shutil.rmtree(UPD_SNAP, ignore_errors=True)
    shutil.copytree(_snapshot(), UPD_SNAP)
    _wrap_chapter(UPD_SNAP, 1, 'export const LESSONS = o.LESSONS.map((l) => (l.id === "1-2" ? { ...l, updated: "v0.2" } : l));')
    _build("--out", UPD_OUT, "--lessons-dir", UPD_SNAP)
    html = _read(os.path.join(UPD_OUT, "index.html"))
    idx = {c["id"]: c for c in _lesson_index(html)}
    by = {l["id"]: l for l in idx[1]["lessons"]}
    assert by["1-2"].get("updated") == "v0.2", by["1-2"]
    assert "updated" not in by["1-1"] and "updated" not in by["1-3"], (by["1-1"], by["1-3"])
    got = json.loads(_read(os.path.join(UPD_OUT, _chapter_table(html)[1])))
    assert [l.get("updated") for l in got["LESSONS"]][:3] == [None, "v0.2", None]


def test_split_advanced_bad_id():
    """ADVANCED 레슨 id가 N-Ak 꼴이 아니거나 isAdvanced가 false면 빌드가 멈춘다. 빠뜨린 isAdvanced는 채운다"""
    bad = os.path.join(OUT, "lessons-adv-bad")
    out = os.path.join(OUT, "dist-adv-bad")
    shutil.rmtree(bad, ignore_errors=True)
    shutil.copytree(_snapshot(), bad)
    os.rename(os.path.join(bad, "ch1.js"), os.path.join(bad, "ch1.orig.mjs"))
    for body, why in (('export const ADVANCED = [{ id: "1-B1", chapter: 1, isAdvanced: true, title: "x", items: [] }];', "id"),
                      ('export const ADVANCED = [{ id: "1-A1", chapter: 1, isAdvanced: false, title: "x", items: [] }];', "isAdvanced"),
                      ('export const ADVANCED = [{ id: "2-A1", chapter: 1, isAdvanced: true, title: "x", items: [] }];', "id")):
        with open(os.path.join(bad, "ch1.js"), "w", encoding="utf-8") as f:
            f.write('export * from "./ch1.orig.mjs";\n' + body + "\n")
        r = _run_build("--out", out, "--lessons-dir", bad)
        assert r.returncode != 0, "build must fail for bad ADVANCED (%s)" % why
        assert "ADVANCED" in (r.stdout + r.stderr), r.stdout + r.stderr
    with open(os.path.join(bad, "ch1.js"), "w", encoding="utf-8") as f:
        f.write('export * from "./ch1.orig.mjs";\nexport const ADVANCED = [{ id: "1-A1", chapter: 1, title: "x", goal: "", items: [] }];\n')
    r = _run_build("--out", out, "--lessons-dir", bad)
    assert r.returncode == 0, r.stdout + r.stderr
    html = _read(os.path.join(out, "index.html"))
    got = json.loads(_read(os.path.join(out, _chapter_table(html)[1])))
    assert got["ADVANCED"][0]["isAdvanced"] is True
    assert {c["id"]: c for c in _lesson_index(html)}[1]["advanced"][0]["isAdvanced"] is True
    shutil.rmtree(bad, ignore_errors=True)
    shutil.rmtree(out, ignore_errors=True)


def test_split_deterministic():
    _build("--out", SPLIT_OUT, "--lessons-dir", _snapshot())
    other = os.path.join(OUT, "dist-det")
    r = _run_build("--out", other, "--lessons-dir", _snapshot())
    assert r.returncode == 0, r.stdout + r.stderr
    a, b = _chapter_files(SPLIT_OUT), _chapter_files(other)
    assert a == b, (a, b)
    for f in a:
        with open(os.path.join(SPLIT_OUT, "lessons", f), "rb") as x, open(os.path.join(other, "lessons", f), "rb") as y:
            assert x.read() == y.read(), f
    shutil.rmtree(other, ignore_errors=True)


def test_sw_chapter_files():
    _build("--out", SPLIT_OUT, "--lessons-dir", _snapshot())
    sw = _read(os.path.join(SPLIT_OUT, "sw.js"))
    files = _chapter_files(SPLIT_OUT)
    assert len(files) == 17, files
    for f in files:
        assert '"lessons/%s"' % f in sw, "sw.js must precache " + f


def _wait_chapters_cached(b, files, timeout=30):
    deadline = time.monotonic() + timeout
    while True:
        urls = b.cached_urls()
        missing = [f for f in files if not any(u.endswith("/" + f) for u in urls)]
        if not missing or time.monotonic() > deadline:
            return missing
        b.page.wait_for_timeout(200)


def test_offline_chapter_build():
    """온라인으로 한 번 연 뒤 오프라인 → 6장 레슨을 저장된 장 파일로 열어 조립 문제 「실행」, 설정 「오프라인 준비 완료」"""
    folder = _split()
    b = _Browser(folder)
    try:
        pg = b.page
        pg.goto(b.url)
        b.home()
        b.wait_controlled()
        files = pg.evaluate("() => Object.values(window.DUEOGI_CHAPTER_FILES)")
        assert len(files) == 17, files
        missing = _wait_chapters_cached(b, files)
        assert not missing, "chapter files not precached: %r" % missing
        assert b.wait_cached(ENGINE_CACHE, "sql-wasm.wasm")
        b.context.set_offline(True)
        resp = pg.reload()
        assert resp is not None and resp.from_service_worker
        b.home()
        heads, rows = _run_first_build(pg, "6-1")
        print("    offline: 6-1 opened from cached chapter file, build 「실행」 %s × %d" % (heads, rows))
        assert heads and rows > 0
        pg.evaluate("() => window.__dueogi.ctx.show('settings')")
        pg.wait_for_selector("#offline.ready", timeout=10_000)
        b.context.set_offline(False)
        assert not [e for e in b.errors if e.startswith("pageerror")], b.errors
    finally:
        b.close()


def test_chapter_blocked_retry():
    folder = _split()
    b = _Browser(folder)
    try:
        pg = b.page
        _Handler.STATE["block_chapters"] = True
        pg.goto(b.url)
        b.home()
        b.wait_controlled()  # 장 파일을 못 받아도 설치는 끝남
        assert not [u for u in b.cached_urls() if "/lessons/" in u]
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { id: '2-1' })")
        pg.wait_for_selector(".lesson-wait[data-state=error]", timeout=15_000)
        txt = pg.inner_text(".lesson-wait")
        assert "이 장은 인터넷이 될 때 한 번 열어 주세요" in txt, txt
        assert pg.is_visible("#retry") and pg.is_visible("#to-home")
        pg.screenshot(path=os.path.join(OUT, "build_chapter_blocked.png"))
        pg.click("#to-home")
        pg.wait_for_selector("#app[data-screen=home] .screen.home")
        assert pg.evaluate("() => window.__dueogi.ctx.save.completed_lessons.length") == 0
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { id: '2-1' })")
        pg.wait_for_selector(".lesson-wait[data-state=error]", timeout=15_000)
        pg.click("#retry")
        pg.wait_for_selector(".lesson-wait[data-state=error]", timeout=15_000)  # 아직 막힘 → 다시 안내
        _Handler.STATE["block_chapters"] = False
        pg.click("#retry")
        pg.wait_for_selector(".card-view", timeout=15_000)
        print("    blocked chapter: guidance shown, retry after unblocking opened 2-1")
        _Handler.STATE["slow_chapter_s"] = 1.5
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { id: '3-1' })")
        pg.wait_for_selector(".lesson-wait[data-state=wait]:has-text('준비 중')", timeout=5_000)
        pg.wait_for_selector(".card-view", timeout=15_000)
        assert not [e for e in b.errors if e.startswith("pageerror")], b.errors
    finally:
        _reset_state()
        b.close()


def _alt_lessons(name):
    """스냅숏을 복사해 ch1 제목만 바꾼 폴더(내용이 바뀐 판 흉내)"""
    alt = os.path.join(OUT, name)
    shutil.rmtree(alt, ignore_errors=True)
    shutil.copytree(_snapshot(), alt)
    p = os.path.join(alt, "ch1.js")
    src = _read(p)
    changed = re.sub(r'(export const CHAPTER = \{[^}]*title: ")', r"\1(시험판) ", src, count=1)
    assert changed != src
    with open(p, "w", encoding="utf-8") as f:
        f.write(changed)
    return alt


def test_chapter_cache_rotation():
    folder = os.path.join(OUT, "dist-rotate-ch")
    alt = _alt_lessons("lessons-alt")
    r = _run_build("--out", folder, "--lessons-dir", alt)
    assert r.returncode == 0, r.stdout + r.stderr
    old_files = _chapter_files(folder)
    b = _Browser(folder)
    try:
        b.page.goto(b.url)
        b.home()
        b.wait_controlled()
        old_table = b.page.evaluate("() => window.DUEOGI_CHAPTER_FILES")
        assert not _wait_chapters_cached(b, list(old_table.values()))
        old_game = [k for k in b.cache_keys() if k.startswith("dueogi-game-")]
        r = _run_build("--out", folder, "--lessons-dir", _snapshot())
        assert r.returncode == 0, r.stdout + r.stderr
        new_files = _chapter_files(folder)
        gone = sorted(set(old_files) - set(new_files))
        assert len(gone) == 1 and gone[0].startswith("ch1-"), (old_files, new_files)
        assert not os.path.exists(os.path.join(folder, "lessons", gone[0])), "old chapter file left in out folder"
        b.page.evaluate("async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }")
        deadline = time.monotonic() + 30
        while True:
            keys = [k for k in b.cache_keys() if k.startswith("dueogi-game-")]
            if (keys and old_game[0] not in keys) or time.monotonic() > deadline:
                break
            b.page.wait_for_timeout(200)
        urls = b.cached_urls()
        assert not [u for u in urls if u.endswith("/lessons/" + gone[0])], "old chapter file still cached"
        new_ch1 = next(f for f in new_files if f.startswith("ch1-"))
        assert [u for u in urls if u.endswith("/lessons/" + new_ch1)], "new chapter file not precached"
        print("    chapter rotation: %s -> %s, cache %s -> %s" % (gone[0], new_ch1, old_game[0], keys[0]))
    finally:
        b.close()
        shutil.rmtree(folder, ignore_errors=True)
        shutil.rmtree(alt, ignore_errors=True)


def _unique_concepts(index, count=2):
    """레슨 목록(index.html의 DUEOGI_LESSON_INDEX)에서 그 장에만 나오는 개념이 있는 장을 앞(2장)부터 count개: [(장, 개념)]"""
    where = {}
    for ch in index:
        for l in ch["lessons"]:
            for c in l.get("concepts", []):
                where.setdefault(c, set()).add(ch["id"])
    out = []
    for ch in index:
        n = ch["id"]
        c = next((c for c, ns in sorted(where.items()) if ns == {n}), None)
        if c and n > 1:
            out.append((n, c))
        if len(out) == count:
            return out
    raise AssertionError("fewer than %d chapters with a concept of their own: %r" % (count, out))


def test_review_lazy():
    folder = _split()
    picked = _unique_concepts(_lesson_index(_read(os.path.join(folder, "index.html"))))
    concepts = [c for _, c in picked]
    seed = {"saveVer": 1, "yeopjeon": 0, "review_queue": concepts, "completed_lessons": ["1-1"]}
    b = _Browser(folder, service_workers="block", init_save=seed)
    try:
        pg = b.page
        asked = []
        pg.on("request", lambda req: asked.append(req.url.rsplit("/", 1)[-1]) if "/lessons/" in req.url else None)
        pg.goto(b.url)
        b.home()
        table = pg.evaluate("() => window.DUEOGI_CHAPTER_FILES")
        assert asked == [], "home must not load chapter files: %r" % asked
        pg.click("#review")
        pg.wait_for_selector("article.item", timeout=15_000)
        need = pg.evaluate("(c) => window.__dueogi.ctx.chaptersForConcepts(c)", concepts)
        assert sorted(need) == sorted(n for n, _ in picked), (need, picked)
        want = sorted(table[str(k)].rsplit("/", 1)[-1] for k in need)
        assert sorted(asked) == want, (asked, want)
        print("    review %s: loaded only %s" % (concepts, ", ".join(asked)))
        assert not [e for e in b.errors if e.startswith("pageerror")], b.errors
    finally:
        b.close()


def test_new_index_not_cached_without_new_sw():
    """새 판 index.html을 네트워크로 받아도, 새 서비스 작업자 설치가 실패하면 저장본은 옛 판 그대로여야 한다"""
    folder = os.path.join(OUT, "dist-sw-fail")
    alt = _alt_lessons("lessons-alt2")
    r = _run_build("--out", folder, "--lessons-dir", alt)
    assert r.returncode == 0, r.stdout + r.stderr
    b = _Browser(folder)
    try:
        pg = b.page
        pg.goto(b.url)
        b.home()
        b.wait_controlled()
        assert not _wait_chapters_cached(b, list(pg.evaluate("() => window.DUEOGI_CHAPTER_FILES").values()))
        r = _run_build("--out", folder, "--lessons-dir", _snapshot())
        assert r.returncode == 0, r.stdout + r.stderr
        _Handler.STATE["block_sw"] = True
        pg.reload()
        b.home()
        new_ch1 = pg.evaluate("() => window.DUEOGI_CHAPTER_FILES['1']")
        assert new_ch1.rsplit("/", 1)[-1] in _chapter_files(folder), "online reload should show the new build"
        pg.wait_for_timeout(500)
        b.context.set_offline(True)
        pg.reload()
        b.home()
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { id: '1-1' })")
        pg.wait_for_selector(".card-view, .lesson-wait[data-state=error]", timeout=15_000)
        assert pg.query_selector(".card-view"), "offline launch after failed sw update cannot open 1-1: " + pg.inner_text("#app")
        print("    failed sw update: offline launch still uses a consistent cached build")
    finally:
        _reset_state()
        b.close()
        shutil.rmtree(folder, ignore_errors=True)
        shutil.rmtree(alt, ignore_errors=True)


def test_chapter_wait_timeout():
    folder = _split()
    b = _Browser(folder, service_workers="block")
    try:
        pg = b.page
        pg.goto(b.url)
        b.home()
        _Handler.STATE["slow_chapter_s"] = 60
        t0 = time.monotonic()
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { id: '2-1' })")
        pg.wait_for_selector(".lesson-wait[data-state=wait]:has-text('준비 중')", timeout=5_000)
        assert pg.is_visible("#to-home"), "waiting screen needs a way back"
        pg.wait_for_selector(".lesson-wait[data-state=error]", timeout=20_000)
        dt = time.monotonic() - t0
        print("    slow chapter (60 s): error screen after %.1f s" % dt)
        assert 11 <= dt < 16, dt
        _Handler.STATE["slow_chapter_s"] = 0
        pg.click("#to-home")
        pg.wait_for_selector("#app[data-screen=home] .screen.home")
        _Handler.STATE["slow_chapter_s"] = 60
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { id: '3-1' })")
        pg.wait_for_selector(".lesson-wait[data-state=wait] #to-home", timeout=5_000)
        pg.click("#to-home")
        pg.wait_for_selector("#app[data-screen=home] .screen.home")
        assert not [e for e in b.errors if e.startswith("pageerror")], b.errors
    finally:
        _reset_state()
        b.close()


def test_chapter_404_reload():
    folder = _split()
    b = _Browser(folder, service_workers="block")
    try:
        pg = b.page
        pg.goto(b.url)
        b.home()
        _Handler.STATE["chapter_404"] = True
        pg.evaluate("() => { window.__marker = 1; window.__dueogi.ctx.show('lesson', { id: '2-1' }); }")
        pg.wait_for_selector(".lesson-wait[data-state=error]", timeout=15_000)
        txt = pg.inner_text(".lesson-wait")
        assert "새 판이 나왔어요. 눌러서 새로 고쳐요" in txt, txt
        _Handler.STATE["chapter_404"] = False
        with pg.expect_navigation(timeout=15_000):
            pg.click("#retry")
        pg.wait_for_selector(".screen.splash #go", timeout=20_000)
        assert pg.evaluate("() => window.__marker") is None, "retry must reload the page"
        print("    404 chapter: new-version message, retry reloaded the page")
    finally:
        _reset_state()
        b.close()


def test_review_one_chapter_fails():
    folder = _split()
    b = _Browser(folder, service_workers="block")
    try:
        pg = b.page
        pg.goto(b.url)
        b.home()
        pick = pg.evaluate("""() => {
            const ctx = window.__dueogi.ctx, out = [];
            for (const ch of ctx.chapters) {
                const c = ch.lessons.flatMap((l) => l.concepts).find((k) => ctx.chaptersForConcepts([k]).length === 1);
                if (c) out.push([ch.id, c]);
                if (out.length === 2) break;
            }
            return out;
        }""")
        assert len(pick) == 2, pick
        (bad_ch, bad_c), (good_ch, good_c) = pick
        table = pg.evaluate("() => window.DUEOGI_CHAPTER_FILES")
        _Handler.STATE["block_names"] = (table[str(bad_ch)].rsplit("/", 1)[-1],)
        pg.evaluate("(q) => { const ctx = window.__dueogi.ctx; ctx.commit({ ...ctx.save, review_queue: q }); ctx.show('lesson', { review: true }); }",
                    [bad_c, good_c])
        pg.wait_for_selector("article.item, .lesson-wait[data-state=error]", timeout=15_000)
        assert pg.query_selector("article.item"), pg.inner_text("#app")
        tag = pg.inner_text(".tag").strip()
        assert tag.startswith("%d-" % good_ch), tag
        print("    review with chapter %d blocked: items from chapter %d (%s)" % (bad_ch, good_ch, tag))
        _Handler.STATE["block_names"] = tuple(table[str(k)].rsplit("/", 1)[-1] for k in (bad_ch, good_ch))
        pg.reload()
        b.home()
        pg.evaluate("() => window.__dueogi.ctx.show('lesson', { review: true })")
        pg.wait_for_selector(".lesson-wait[data-state=error]", timeout=15_000)
        assert not [e for e in b.errors if e.startswith("pageerror")], b.errors
    finally:
        _reset_state()
        b.close()


def main(argv=()):
    tests = [(n, f) for n, f in globals().items() if n.startswith("test_") and callable(f)]
    if argv:
        unknown = [a for a in argv if a not in dict(tests)]
        if unknown:
            raise SystemExit("build_test.py: no test named %s" % unknown)
        tests = [(n, f) for n, f in tests if n in argv]
    fails = 0
    for name, f in tests:
        t0 = time.monotonic()
        try:
            f()
            print("PASS %s (%.1f s)" % (name, time.monotonic() - t0))
        except Exception as e:  # noqa: BLE001
            fails += 1
            print("FAIL", name, "-", type(e).__name__, str(e)[:2000])
    print("%d passed, %d failed" % (len(tests) - fails, fails))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
