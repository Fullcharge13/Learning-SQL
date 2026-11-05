#!/usr/bin/env python3
"""개발용: src/app.js를 설치된 esbuild로 묶어 dev/에 두고, 저장소 뿌리를 로컬 서버로 연다.

    python3 tools/dev.py               # 묶고 http://127.0.0.1:8765/dev/ 열기
    python3 tools/dev.py --port 9000
    python3 tools/dev.py --build-only  # 묶기만 (시험 도구가 씀)

dev/ 구성: index.html · style.css · app.js(묶음, 장터 데이터 글자 포함) · worker.js(묶음, sql.js 포함) · sql-wasm.wasm
(배포판 build.py와 같은 방식으로 sql.js를 작업자에 묶는다. tests/engine_browser.py도 dev/worker.js를 쓴다)
레슨은 data/lessons/chN.js를 그대로 묶는다(src/lessondev.js).
"""
import argparse
import functools
import http.server
import os
import shutil
import socketserver
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
DEV = os.path.join(ROOT, "dev")
ESBUILD = os.path.join(ROOT, "node_modules", ".bin", "esbuild")
SQLJS_DIST = os.path.join(ROOT, "node_modules", "sql.js", "dist")


def build():
    os.makedirs(DEV, exist_ok=True)
    for entry, fmt in (("app.js", "esm"), ("worker.js", "esm")):
        subprocess.run(
            [ESBUILD, os.path.join(SRC, entry), "--bundle", "--format=" + fmt, "--target=es2022,safari16",
             "--platform=browser", "--loader:.sql=text", "--outfile=" + os.path.join(DEV, entry), "--log-level=warning"],
            check=True, cwd=ROOT)
    with open(os.path.join(SRC, "index.html"), encoding="utf-8") as f:
        html = f.read()
    html = html.replace("<!-- RIA:CONFIG -->", "")
    with open(os.path.join(DEV, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    shutil.copy(os.path.join(SRC, "style.css"), os.path.join(DEV, "style.css"))
    stale = os.path.join(DEV, "sql-wasm.js")   # 작업 16 전 개발판이 두던 파일(이제 worker.js 안에 묶임)
    if os.path.exists(stale):
        os.remove(stale)
    shutil.copy(os.path.join(SQLJS_DIST, "sql-wasm.wasm"), os.path.join(DEV, "sql-wasm.wasm"))
    print("묶음 dev/app.js %.1f KB, dev/worker.js %.1f KB" % (
        os.path.getsize(os.path.join(DEV, "app.js")) / 1024, os.path.getsize(os.path.join(DEV, "worker.js")) / 1024))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm",
        ".json": "application/json", ".css": "text/css",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def make_server(port=0):
    return Server(("127.0.0.1", port), functools.partial(Handler, directory=ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--build-only", action="store_true")
    a = ap.parse_args()
    build()
    if a.build_only:
        return
    httpd = make_server(a.port)
    print("http://127.0.0.1:%d/dev/" % httpd.server_address[1])
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
