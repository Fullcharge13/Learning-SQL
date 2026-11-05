"""브라우저(Chromium) 안에서 SQL 작업자(SqlRun)를 시험한다 (계획 작업 3).

실행: python3 tests/engine_browser.py   → 마지막 줄 "OK 4/4"

tools/dev.py --build-only로 dev/worker.js(sql.js를 묶은 작업자)를 만든 뒤,
저장소 뿌리를 로컬 서버(빈 포트)로 띄우고 tests/browser/engine_page.html을 연다.
검사 4가지: 준비됨 / SELECT 실행 / 끝없는 재귀 CTE는 시간 초과 / 바로 다음 실행이 정상.
"""

import functools
import http.server
import os
import socketserver
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE_PATH = "/tests/browser/engine_page.html"


class _Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".wasm": "application/wasm",
        ".sql": "text/plain; charset=utf-8",
    }

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


RECURSIVE = "WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM r) SELECT count(*) FROM r"


def main():
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "dev.py"), "--build-only"], check=True, cwd=ROOT)
    httpd = _Server(("127.0.0.1", 0), functools.partial(_Handler, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    port = httpd.server_address[1]
    results = []
    errors = []
    pw = sync_playwright().start()
    try:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto("http://127.0.0.1:%d%s" % (port, PAGE_PATH))
        page.wait_for_function("() => window.readyPromise !== undefined", timeout=60000)

        def check(name, fn):
            try:
                fn()
                results.append(True)
                print("ok   " + name)
            except Exception as e:  # noqa: BLE001
                results.append(False)
                print("FAIL %s: %s: %s" % (name, type(e).__name__, e))

        def t_ready():
            state = page.evaluate("() => window.readyPromise")
            assert state == "ready", (state, page.evaluate("() => window.pageErrors"))

        def t_select():
            r = page.evaluate("() => window.runner.run('SELECT name FROM shops ORDER BY shop_id LIMIT 2')")
            assert r["error"] is None and r["columns"] == ["name"] and len(r["rows"]) == 2, r
            assert r["timeout"] is False and r["truncated"] is False, r

        def t_timeout():
            res = page.evaluate("""async (sql) => {
                const t0 = performance.now();
                const r = await window.runner.run(sql);
                return { r, ms: performance.now() - t0 };
            }""", RECURSIVE)
            r = res["r"]
            assert r["timeout"] is True and r["error"] == "timeout", r
            assert r["columns"] == [] and r["rows"] == [] and r["truncated"] is False, r
            assert 900 <= res["ms"] < 2500, res["ms"]

        def t_after():
            r = page.evaluate("() => window.runner.run('SELECT COUNT(*) FROM shops')")
            assert r["error"] is None and r["timeout"] is False and len(r["rows"]) == 1, r
            assert r["rows"][0][0] > 0, r

        check("ready", t_ready)
        check("SELECT ok", t_select)
        check("recursive CTE times out", t_timeout)
        check("next run after restart ok", t_after)
        if errors:
            print("page errors:", errors)
        browser.close()
    finally:
        pw.stop()
        httpd.shutdown()
    passed = sum(results)
    print("OK %d/4" % passed if passed == 4 else "FAILED %d/4" % passed)
    return 0 if passed == 4 else 1


if __name__ == "__main__":
    sys.exit(main())
