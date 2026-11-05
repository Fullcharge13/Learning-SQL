"""화면 순회 시험 (리아 작업 11 → 두억이 작업 6에서 SQL 앱에 맞춤).

실행: python3 tests/flow.py                 전부
      python3 tests/flow.py --only build    이름이 test_build 이거나 test_build_로 시작하는 시험만(여러 번 줄 수 있음)
      python3 tests/flow.py test_first_lesson   정확한 이름
      python3 tests/flow.py --lesson 1-3    실제 레슨(data/lessons) 하나를 아이폰 17 화면으로 끝까지 풀며 화면마다 캡처
                                            (tests/out/flow/walk-1-3-*.png). 넘침·화면 밖 단추·콘솔 오류가 있으면 실패

- 배포와 같은 빌드를 시험용으로 만든다: python3 build.py --out tests/out/flow/dist --lessons-dir tests/out/flow/lessons-fixture
  화면 장치 시험은 시험용 레슨 tests/fixtures/lesson_build.js를 1장(ch1.js)으로 복사해 넣은 빌드를 쓴다(문제 수·모양이 고정).
  실제 레슨이 필요한 시험(장 평가, --lesson)은 data/lessons로 따로 빌드한다(real_url, tests/out/flow/dist-real).
  앱 코드에는 시험용 갈래가 없다(레슨은 평소처럼 장 파일로 받음).
- 실행 기록 C2: WebKit이 없어 Chromium에 Playwright 기기 설정("iPhone 17" 등)을 적용한다.
- 캡처: tests/out/flow/*.png

시험
- test_no_overflow: 화면 9개 × 기기 4종 — 가로 스크롤 0, 화면 밖 버튼 0, 콘솔 오류 0
- test_touch_targets: 화면마다 보이는 버튼 44×44 CSS px 이상
- test_first_lesson: 새 저장 → 1-1(객관식 + 조립) 전부 정답 → XP +20, completed_lessons ["1-1"]
- test_old_save: saveVer 없는 {xp: 30} → 홈 정상, XP 30
- test_replay_and_exam: 1-1 다시 하기 XP +10·레슨 엽전 0 / 실제 1장으로 1-1~1-4를 끝낸 저장 → 1-5(장 평가) 첫 완료 XP +40·엽전 15
- test_wrong_then_retry: 객관식 틀림 → 본 문제 끝에 다시 나옴 → 완료 화면은 실수 없음 아님
- test_reduced_motion: 동작 줄이기에서 두억이 .dueogi-body 움직임 없음
- test_status_after_milestone: 연속 6일(어제 달성) → 레슨 완료로 7일 축하 창이 떠 있는 동안 상태 줄 7일
- test_resume_lesson: 조립 문제에 카드 몇 장 놓고 새로고침 → 「이어서 하기」 → 같은 카드가 놓여 있음 → 끝까지: 보상·저장이 끊지 않은 판과 같음
- test_resume_decline: 「처음부터」 → 카드 1부터, 칸 지워짐 / 「그만두기」도 칸을 지움
- test_build_solve: 조립 문제를 카드 누르기로 — 틀린 조립 실행(결과 표) → 오류 실행(설명) → 틀린 제출(내 결과·기대 결과 나란히)
                    → 맞게 고쳐 제출 → 「단서를 따라 고쳐서 통과!」, 통계 fixed·hintfree 1. 캡처 build-*.png (iPhone 17)
- test_lesson: 카드 SQL+결과 표, 행 많은 카드(30vh 상자), 객관식 표 보기(44px·포커스 없음), 「쓸 표 보기」 세 가지 닫기·한글 뜻·5행, 조립에도 단추. 캡처 lesson-*.png\n- test_lesson_wrong_option / test_lesson_no_engine: 틀린 보기 안내(정답 SQL이 문제 SQL과 같으면 정답 표), 실행기 없을 때 카드 안내·보기는
  SQL 글자로(단 보기 하나가 문제 SQL과 같으면 「표를 불러오지 못했어요」만 — 정답이 드러나지 않게)\n- test_build_no_engine: sql-wasm.wasm 받기를 막음 → 객관식은 풀림, 조립 문제는 「실행기 준비 중이에요」·실패 안내, 실행·제출 막힘
- test_daily_challenge(작업 11): 시험용 1장(1-1·1-2)을 끝낸 저장 → 홈 카드 → 틀 객관식(보기 = SQL 결과 표)·틀 빈자리·카드 조립 3문제
  → 새로고침 뒤 이어서 → 완료 화면 XP 15·엽전 10. 캡처 daily-*.png
- test_daily_no_engine: 실행기를 못 받으면 매일 도전은 「SQL 실행기를 깨우는 중에…」 + 다시 시도, 푼 기록 없음
- test_real_lesson_walk(작업 12): 실제 1-1을 끝까지 — 화면마다 넘침 0(열 많은 결과 표 보기 포함)
- test_new_content_dot: 실제 1장 1-2에 updated를 단 빌드 — 홈·설정의 「새 내용」 점, 다시 하기로 끝까지 마치면 사라짐
- test_card_table_above_button(작업 10): 7·8장 장 평가 카드·7-1의 결과 표가 「문제 풀기」 단추 줄에 가리지 않음(처음·끝까지 내림)
- test_foot_clear_after_scroll(버그 B1): 실제 12-1·12-5·13-1·13-5를 폰 3종으로(12-1은 :has 규칙을 지운 판도) 풀며 화면마다 끝까지 내려
  마지막 카드·보기·빈칸·줄·「쓸 표 보기」가 고정 단추 줄 위에 다 보임 + 전체 캡처 맨 아래가 내린 화면의 단추 줄과 같음(App.shot이 고정 줄을 페이지 끝으로 옮겨 찍음)
- test_sql_cols_fit(B1 관련): SQL_COLS(38)칸 한 줄이 iPhone 17e 코드 상자·순서 줄에서 줄바꿈 없음, 글씨 13px 이상
- SKIP(까닭 출력): test_advanced_branch(심화 내용 필요)
"""

import atexit
import datetime
import functools
import http.server
import json
import os
import re
import shutil
import socketserver
import subprocess
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tests", "out", "flow")
DIST = os.path.join(OUT, "dist")
SAVE_KEY = "dueogi-sql-save"
RESUME_KEY = "dueogi-sql-resume"
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "lesson_build.js")
GUARD_WAIT = 450          # 결과 창 입력 보호(400ms)보다 조금 길게
ENGINE_READY_MS = 60_000

DEVICES = ["iPhone 17", "iPhone 17e", "iPhone 17 Pro Max", "PC 1280x800"]
SCREENS = ["splash", "home", "lesson-card", "touch-item", "build", "done", "badges", "closet", "settings"]

# 터치 영역 예외(근거가 있는 것만). 비어 있으면 예외 없음.
TOUCH_EXCEPTIONS = {}


# ---------------------------------------------------------------- 서버·브라우저

class _Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm",
        ".json": "application/json", ".webmanifest": "application/manifest+json",
        ".zip": "application/zip",
    }

    def translate_path(self, path):
        p = path.split("?")[0]
        if p.startswith("/node_modules/"):
            return os.path.join(ROOT, *p.lstrip("/").split("/"))
        return super().translate_path(path)

    def log_message(self, *a):
        pass


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        # 창을 닫을 때 끊긴 내려받기(ConnectionResetError 등)는 시험과 무관
        if not isinstance(sys.exc_info()[1], (ConnectionError, BrokenPipeError)):
            super().handle_error(request, client_address)


_env = {}


def env():
    """빌드 한 번 + 서버 + Chromium 하나를 시험 전체가 같이 쓴다."""
    if _env:
        return _env
    os.makedirs(OUT, exist_ok=True)
    lessons = os.path.join(OUT, "lessons-fixture")
    if os.path.isdir(lessons):
        shutil.rmtree(lessons)
    os.makedirs(lessons)
    shutil.copy(FIXTURE, os.path.join(lessons, "ch1.js"))
    r = subprocess.run([sys.executable, os.path.join(ROOT, "build.py"), "--out", DIST, "--lessons-dir", lessons],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, "build.py failed:\n" + r.stdout + r.stderr
    httpd = _Server(("127.0.0.1", 0), functools.partial(_Handler, directory=DIST))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch()
    _env.update(httpd=httpd, pw=pw, browser=browser, url="http://127.0.0.1:%d/" % httpd.server_address[1],
                build=r.stdout.strip())

    def stop():
        try:
            browser.close()
            pw.stop()
        finally:
            httpd.shutdown()
    atexit.register(stop)
    return _env


_real_env = {}


def real_url():
    """실제 레슨(data/lessons)으로 만든 빌드를 따로 띄운다(장 평가 시험, --lesson). 시험용 레슨 빌드와 섞이지 않게 다른 폴더·포트."""
    if _real_env:
        return _real_env["url"]
    env()
    dist = os.path.join(OUT, "dist-real")
    r = subprocess.run([sys.executable, os.path.join(ROOT, "build.py"), "--out", dist,
                        "--lessons-dir", os.path.join(ROOT, "data", "lessons")], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, "build.py (data/lessons) failed:\n" + r.stdout + r.stderr
    httpd = _Server(("127.0.0.1", 0), functools.partial(_Handler, directory=dist))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    atexit.register(httpd.shutdown)
    _real_env["url"] = "http://127.0.0.1:%d/" % httpd.server_address[1]
    return _real_env["url"]


def device_opts(name):
    if name.startswith("PC"):
        return {"viewport": {"width": 1280, "height": 800}}
    d = dict(env()["pw"].devices[name])
    d.pop("default_browser_type", None)
    return d


def slug(name):
    return name.lower().replace(" ", "-")


def today(n=0):
    return (datetime.date.today() - datetime.timedelta(days=n)).isoformat()


class SkipTest(Exception):
    """아직 돌릴 수 없는 시험(까닭을 출력하고 실패로 세지 않음)"""


# 전체 캡처 동안 화면 아래에 붙은 고정 요소(레슨 단추 줄 등)를 문서 맨 아래로 옮기고 되돌린다(App.shot)
PIN_FIXED_JS = r"""() => {
  const vh = innerHeight, sh = document.documentElement.scrollHeight;
  if (sh <= vh + 1) return 0;
  let n = 0;
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect();
    if (r.height < 1 || Math.abs(r.bottom - vh) > 1 || r.top < vh / 3) continue;   // 아래에 붙은 줄만(덮개 창 제외)
    e.dataset.flowPin = e.getAttribute('style') || '';
    e.style.setProperty('position', 'absolute', 'important');
    e.style.setProperty('top', (sh - r.height) + 'px', 'important');
    e.style.setProperty('bottom', 'auto', 'important');
    n++;
  }
  return n;
}"""
UNPIN_FIXED_JS = r"""() => { for (const e of document.querySelectorAll('[data-flow-pin]')) {
  const s = e.dataset.flowPin; if (s) e.setAttribute('style', s); else e.removeAttribute('style'); delete e.dataset.flowPin; } }"""


class App:
    """기기 하나 + 새 저장소의 앱 한 판."""

    def __init__(self, device="iPhone 17", save=None, reduced=False, url=None, block=()):
        e = env()
        opts = device_opts(device)
        if reduced:
            opts["reduced_motion"] = "reduce"
        # sw.js가 옛 빌드를 저장해 두지 않도록 서비스 작업자는 막는다(오프라인은 build_test.py가 시험)
        self.context = e["browser"].new_context(service_workers="block", **opts)
        for pat in block:   # 받기를 막을 주소(예: 실행기 wasm). 작업자 안의 요청도 막히도록 context에 건다
            self.context.route(pat, lambda route: route.abort())
        self.page = self.context.new_page()
        self.device = device
        self.errors = []
        self.page.on("pageerror", lambda x: self.errors.append("pageerror: " + str(x)))
        self.page.on("console", lambda m: self.errors.append("console.error: " + m.text) if m.type == "error" else None)
        if save is not None:
            self.page.add_init_script(
                "if (!sessionStorage.getItem('flow-seeded')) { localStorage.setItem(%s, %s); sessionStorage.setItem('flow-seeded', '1'); }"
                % (json.dumps(SAVE_KEY), json.dumps(json.dumps(save))))
        self.page.goto(url or e["url"])
        self.page.wait_for_selector(".screen.splash #go", timeout=20_000)

    def close(self):
        self.context.close()

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()

    # -- 공용 동작 --
    def shot(self, name, full=False):
        """full=True: 페이지 전체 캡처. Chromium 전체 캡처는 position: fixed 요소를 지금 스크롤 자리의 화면 안 위치에
        그대로 그린다(맨 위에서 찍으면 아래 단추 줄이 페이지 중간, 첫 화면 높이 자리에 찍혀 그 밑 내용을 덮는다 — 버그 B1).
        그래서 찍는 동안만 화면 아래에 붙은 고정 요소를 페이지 맨 아래로 옮긴다(끝까지 내린 화면과 같은 자리)."""
        path = os.path.join(OUT, name)
        pinned = self.js(PIN_FIXED_JS) if full else 0
        try:
            self.page.screenshot(path=path, full_page=full)
        finally:
            if pinned:
                self.js(UNPIN_FIXED_JS)
        return path

    def js(self, expr, arg=None):
        return self.page.evaluate(expr, arg)

    def save(self):
        return self.js("() => JSON.parse(localStorage.getItem(%s))" % json.dumps(SAVE_KEY))

    def dismiss(self):
        """홈 화면 추가 안내(iOS 사파리 흉내 UA라서 뜰 수 있음)·확인되지 않은 창을 닫는다. 닫은 이름 목록."""
        closed = []
        for _ in range(3):
            if self.page.is_visible("#ins-ok"):
                self.page.wait_for_timeout(100)
                self.page.click("#ins-ok")
                self.page.wait_for_selector(".modal.install", state="detached")
                closed.append("install")
                continue
            break
        return closed

    def start(self):
        self.page.click("#go")
        self.page.wait_for_selector("#app[data-screen=home] .screen.home")
        self.page.wait_for_timeout(200)
        self.dismiss()

    def lesson(self, lid):
        # 레슨 목록(index.html)에는 문제가 없어 장 파일에서 받는다(v0.3 작업 1)
        return self.js("(id) => window.__dueogi.ctx.getLesson(id)", lid)

    def wait_engine(self):
        self.page.wait_for_function("() => window.__dueogi.ctx.sql.status === 'ready'", timeout=ENGINE_READY_MS)

    def bank_texts(self):
        return self.js("() => [...document.querySelectorAll('#bbank button.bcard')].map((b) => b.dataset.text)")

    def line_texts(self):
        return self.js("() => [...document.querySelectorAll('#bline button.bcard')].map((b) => b.dataset.text)")

    def tap_card(self, text):
        """카드 더미에서 글자가 text인 카드 하나를 누른다(실제 클릭)"""
        h = self.page.evaluate_handle(
            "(t) => [...document.querySelectorAll('#bbank button.bcard')].find((b) => b.dataset.text === t) || null", text)
        el = h.as_element()
        assert el, "card %r not in bank %s" % (text, self.bank_texts())
        el.click()

    def clear_line(self):
        while self.page.query_selector("#bline button.bcard"):
            self.page.click("#bline button.bcard")

    def place(self, texts):
        self.clear_line()
        for t in texts:
            self.tap_card(t)
        assert self.line_texts() == list(texts), (self.line_texts(), texts)

    def build_press(self, which):
        """「실행」(run) 또는 「제출」(submit)을 누르고 결과가 그려질 때까지 기다린다"""
        self.wait_engine()
        self.page.wait_for_selector("#%s:not([disabled])" % which)
        self.page.click("#" + which)
        self.page.wait_for_function(
            "() => !document.querySelector('#submit') || !document.querySelector('#submit').disabled"
            " || !document.querySelector('#result').hidden", timeout=20_000)

    def which_item(self, items):
        """지금 화면의 문제가 레슨 items의 몇 번인지 (보기 순서가 섞여 있어도 글자 묶음으로 찾음)"""
        if self.page.query_selector(".item.build"):
            q = " ".join(self.page.inner_text("h1.q").split())
            return next(i for i, x in enumerate(items) if x["type"] == "build" and " ".join(str(x.get("q") or "").split()) == q)
        norm = lambda v: " ".join(str(v or "").split())
        q = self.page.inner_text("h1.q")
        # 결과 표 보기(.opt[data-sql])는 표 글자 대신 SQL로 알아본다(작업 11 매일 도전 틀)
        shown = sorted(t.strip() for t in self.page.eval_on_selector_all(
            ".opt, .chip, #op .line",
            "es => es.map(e => e.classList.contains('opt') ? (e.dataset.sql || e.querySelector('.opt-text').innerText) : e.innerText)"))
        code = self.page.eval_on_selector_all("article.item > pre.code", "es => es.map(e => e.innerText).join('')")

        def keyset(x):
            return sorted((v["sql"] if isinstance(v, dict) else str(v)).strip()
                          for v in (x.get("options") or x.get("chips") or x.get("lines") or []))
        cands = [i for i, x in enumerate(items) if x["type"] != "build" and norm(x.get("q")) == norm(q) and keyset(x) == shown]
        if len(cands) > 1:
            cands = [i for i in cands if norm(items[i].get("code")) == norm(code)] or cands
        assert cands, "unknown item on screen: %r %r" % (q, shown)
        return cands[0]

    def answer_touch(self, it, correct=True):
        t = it["type"]
        if t in ("choice", "check"):
            right = it["options"][it["answer"]]
            target = right if correct else next(o for o in it["options"] if o != right)
            if isinstance(target, dict):   # 결과 표 보기: 그 SQL의 보기를 누름
                h = self.page.evaluate_handle("(q) => [...document.querySelectorAll('.opt')].find((b) => b.dataset.sql === q) || null", target["sql"])
                assert h.as_element(), "option %r not on screen" % target["sql"]
                h.as_element().click()
            else:
                for b in self.page.query_selector_all(".opt"):
                    if b.query_selector(".opt-text").inner_text().strip() == target:
                        b.click()
                        break
        elif t == "blank":
            right = it["chips"][it["answer"]]
            target = right if correct else next(c for c in it["chips"] if c != right)
            for b in self.page.query_selector_all(".chip"):
                if b.inner_text().strip() == target:
                    b.click()
                    break
        elif t == "order":
            lines = list(it["lines"]) if correct else list(reversed(it["lines"]))
            for line in lines:
                for b in self.page.query_selector_all("#op .line:not([disabled])"):
                    if b.inner_text().strip() == line.strip():
                        b.click()
                        break
        self.page.click("#act")

    def solve_build(self, it):
        """조립 문제를 정답 카드로 놓고 제출 → 결과 창"""
        self.place(it["cards"])
        self.build_press("submit")
        try:
            self.page.wait_for_selector("#result:not([hidden])", timeout=20_000)
        except Exception:
            raise AssertionError("build not accepted, console: " + self.page.inner_text("#console"))

    def cont(self):
        """결과 창의 「계속」 (입력 보호 시간 뒤)"""
        ok = "ok" in (self.page.get_attribute("#result", "class") or "")
        self.page.wait_for_timeout(GUARD_WAIT)
        self.page.click("#cont")
        return ok

    def play(self, lid, wrong=(), hook=None):
        """레슨 lid를 끝까지 푼다. wrong: 처음 한 번 틀릴 문제 번호들. hook(name, app): 화면별로 부름.
        돌려줌: 본 문제 순서 ["0", "1", ..., "0r", ...]"""
        items = self.lesson(lid)["items"]
        seq = []
        wrong_left = set(wrong)
        first_card = first_touch = True
        for _ in range(60):
            self.page.wait_for_timeout(80)
            if self.page.query_selector(".screen.done"):
                break
            if self.page.query_selector(".card-view"):
                if first_card and hook:
                    hook("lesson-card", self)
                first_card = False
                self.page.click("#act")
                continue
            if not self.page.query_selector("article.item"):
                continue
            idx = self.which_item(items)
            retry = self.page.query_selector(".tag.retry") is not None
            seq.append(str(idx) + ("r" if retry else ""))
            it = items[idx]
            bad = False
            if it["type"] == "build":
                self.page.wait_for_selector("#bbank button.bcard")
                if hook:
                    hook("build", self)
                self.solve_build(it)
            else:
                if first_touch and hook:
                    hook("touch-item", self)
                first_touch = False
                bad = idx in wrong_left
                wrong_left.discard(idx)
                self.answer_touch(it, correct=not bad)
                self.page.wait_for_selector("#result:not([hidden])")
            ok = self.cont()
            assert ok == (not bad), "item %d (%s) judged ok=%s, expected %s" % (idx, it["type"], ok, not bad)
        self.page.wait_for_selector(".screen.done", timeout=10_000)
        self.page.wait_for_timeout(300)
        return seq

    def result(self):
        return self.js("() => window.__dueogi.app.params && window.__dueogi.app.params.result")


# ---------------------------------------------------------------- 화면 측정

MEASURE_JS = r"""() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, label.btn, [role=button], [role=radio], [role=switch], [role=tab]';
  const items = [];
  for (const e of document.querySelectorAll(sel)) {
    if (e.closest('[hidden]')) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;          // .sr로 숨긴 파일 입력 등
    let fixed = false, scroller = false;
    for (let p = e; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.position === 'fixed' || ps.position === 'sticky') fixed = true;
      if (p !== e && /(auto|scroll)/.test(ps.overflowX) && p.scrollWidth > p.clientWidth + 1) scroller = true;
    }
    const text = (e.getAttribute('aria-label') || e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    const name = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : '') + ' "' + text + '"';
    items.push({ name, l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, fixed, scroller });
  }
  return { vw, vh, sw: document.documentElement.scrollWidth, bsw: document.body.scrollWidth, items };
}"""


def measure(app, screen):
    m = app.js(MEASURE_JS)
    problems = []
    if max(m["sw"], m["bsw"]) > m["vw"]:
        problems.append("horizontal scroll: scrollWidth %d > %d" % (max(m["sw"], m["bsw"]), m["vw"]))
    # 가로 스크롤을 시도해서 실제로 움직이는지도 확인
    sx = app.js("() => { window.scrollTo(200, window.scrollY); const x = window.scrollX; window.scrollTo(0, window.scrollY); return x; }")
    if sx:
        problems.append("page scrolls horizontally by %dpx" % sx)
    offscreen, small, scrolled = [], [], []
    for it in m["items"]:
        out_h = it["l"] < -1 or it["r"] > m["vw"] + 1
        out_v = it["fixed"] and (it["t"] < -1 or it["b"] > m["vh"] + 1)
        if out_h or out_v:
            (scrolled if it["scroller"] and not out_v else offscreen).append(
                "%s [%d,%d..%d,%d]" % (it["name"], it["l"], it["t"], it["r"], it["b"]))
        if (it["w"] < 43.5 or it["h"] < 43.5) and it["name"] not in TOUCH_EXCEPTIONS:
            small.append("%s %dx%d" % (it["name"], round(it["w"]), round(it["h"])))
    problems += ["offscreen: " + x for x in offscreen]
    return {"screen": screen, "problems": problems, "small": small, "in_scroller": scrolled,
            "errors": list(app.errors), "count": len(m["items"])}


_traversals = {}


def traverse(device):
    """새 저장으로 9개 화면을 차례로 열어 측정하고 캡처한다(기기마다 한 번, 결과는 다시 씀)."""
    if device in _traversals:
        return _traversals[device]
    res = {}
    tag = slug(device)
    with App(device) as a:
        def at(name, app, full=False):
            app.page.wait_for_timeout(150)
            res[name] = measure(app, name)
            app.shot("%s-%s.png" % (tag, name), full=full)
            app.errors.clear()

        at("splash", a)
        a.start()
        at("home", a)
        a.page.click("#continue")
        a.page.wait_for_selector(".screen.lesson")
        a.play("1-1", hook=lambda n, app: at(n, app))
        if a.page.is_visible("#ins-ok"):
            at("install-sheet", a)
            a.dismiss()
        at("done", a, full=False)
        a.page.click("#home")
        a.page.wait_for_selector(".screen.home")
        if a.page.is_visible("#ins-ok"):
            at("install-sheet", a)
            a.dismiss()
        for name in ("badges", "closet", "settings"):
            a.page.click('[data-go="%s"]' % name)
            a.page.wait_for_selector(".screen.%s" % name)
            at(name, a)
        res["_errors_left"] = list(a.errors)
    _traversals[device] = res
    return res


# ---------------------------------------------------------------- 시험

def test_no_overflow():
    fails = []
    for dev in DEVICES:
        res = traverse(dev)
        missing = [s for s in SCREENS if s not in res]
        if missing:
            fails.append("%s: screens not reached %s" % (dev, missing))
        for s, r in res.items():
            if s.startswith("_"):
                if r:
                    fails.append("%s: console errors %s" % (dev, r))
                continue
            for p in r["problems"]:
                fails.append("%s/%s: %s" % (dev, s, p))
            for e in r["errors"]:
                fails.append("%s/%s: %s" % (dev, s, e))
            if r["in_scroller"]:
                print("    note %s/%s: inside horizontal scroller (partly hidden by design): %s" % (dev, s, r["in_scroller"]))
        print("    %s: %s" % (dev, ", ".join("%s(%d)" % (s, r["count"]) for s, r in res.items() if not s.startswith("_"))))
    assert not fails, "\n".join(fails)


def test_touch_targets():
    fails = []
    for dev in DEVICES:
        res = traverse(dev)
        for s, r in res.items():
            if not s.startswith("_") and r["small"]:
                fails.append("%s/%s: %s" % (dev, s, "; ".join(r["small"])))
    assert not fails, "touch targets < 44x44:\n" + "\n".join(fails)


def test_first_lesson():
    with App("iPhone 17") as a:
        a.start()
        assert "첫 레슨 시작" in a.page.inner_text("#continue")
        a.page.click("#continue")
        seq = a.play("1-1")
        assert seq == ["0", "1"], seq
        xp_tile = a.page.inner_text(".tile.xp b")
        a.shot("first-lesson-done.png", full=True)
        r = a.result()
        s = a.save()
        print("    done tiles: %s | result xp=%s yeopjeon=%s perfect=%s hintfree=%s" % (
            a.page.inner_text(".tiles").replace("\n", " "), r["xp"], r["totalYeopjeon"], r["perfect"], r["hintFreeBuild"]))
        assert xp_tile == "+20", xp_tile
        assert r["xp"] == 20 and r["perfect"] and r["hintFreeBuild"] and r["firstTime"], r
        assert s["completed_lessons"] == ["1-1"], s["completed_lessons"]
        assert s["xp"] == 20, s["xp"]
        a.dismiss()
        assert not a.errors, a.errors


def _to_build(a, lid="1-1"):
    """lid 레슨을 조립 문제까지 진행"""
    items = a.lesson(lid)["items"]
    for _ in range(40):
        a.page.wait_for_timeout(80)
        if a.page.query_selector(".item.build #bbank"):
            return items
        if a.page.query_selector(".card-view"):
            a.page.click("#act")
            continue
        if a.page.query_selector("article.item"):
            a.answer_touch(items[a.which_item(items)])
            a.page.wait_for_selector("#result:not([hidden])")
            a.cont()
    raise AssertionError("build item not reached")


RIA_EXPORT = {"saveVer": 5, "current_chapter": 3, "current_lesson": "3-2", "completed_lessons": ["1-1", "1-2", "2-1"],
              "xp": 340, "bytes": 120, "streak": {"days": 4, "best": 6}, "badges": [], "outfits": ["basic"], "outfit": "basic"}


def test_import_ria_save():
    """작업 16(작업 10 넘김): 설정 「저장 가져오기」에 리아와 파이썬! 저장을 고르면 바꾸지 않고 안내만. 두억이 저장은 확인 창"""
    with App("iPhone 17", save={"saveVer": 1, "xp": 30, "yeopjeon": 5, "completed_lessons": ["1-1"]}) as a:
        a.start()
        a.page.click('[data-go="settings"]')
        a.page.wait_for_selector(".screen.settings")
        before = a.save()
        a.page.set_input_files("#import", files=[{"name": "ria-python-save.json", "mimeType": "application/json",
                                                  "buffer": json.dumps(RIA_EXPORT).encode()}])
        a.page.wait_for_selector(".toast.warn")
        msg = a.page.inner_text(".toast.warn")
        print("    ria save: %r" % msg)
        assert "리아와 파이썬!" in msg and "두억이와 SQL!" in msg, msg
        assert not a.page.query_selector(".modal-back"), "no confirm dialog for a Ria save"
        assert a.save() == before, "save changed by a rejected import"
        mine = dict(before, xp=99, yeopjeon=12, completed_lessons=["1-1", "1-2"])
        a.page.set_input_files("#import", files=[{"name": "dueogi-sql-save.json", "mimeType": "application/json",
                                                  "buffer": json.dumps(mine).encode()}])
        a.page.wait_for_selector(".modal-back")
        body = a.page.inner_text(".modal-back")
        assert "끝낸 레슨 2개" in body and "XP 99" in body and "엽전 12" in body, body
        assert not a.errors, a.errors


def test_old_save():
    with App("iPhone 17", save={"xp": 30}) as a:
        a.start()
        xp = a.page.inner_text(".status .stat.xp b")
        s = a.save()
        a.shot("old-save-home.png")
        assert xp == "30", xp
        assert s["saveVer"] == 1 and s["xp"] == 30 and s["yeopjeon"] == 0, s   # 이 앱은 saveVer 1부터
        assert a.page.is_visible("#continue")
        assert not a.errors, a.errors




def test_replay_and_exam():
    # 1) 1-1 첫 완료 → 다시 하기
    with App("iPhone 17") as a:
        a.start()
        a.page.click("#continue")
        a.play("1-1")
        first = a.result()
        assert first["xp"] == 20, first
        a.dismiss()
        a.page.click("#home")
        a.page.wait_for_selector(".screen.home")
        a.dismiss()
        before = a.save()
        a.page.click('[data-lesson="1-1"]')
        a.page.wait_for_selector(".modal .btn.primary")
        a.page.click(".modal .btn.primary")
        a.page.wait_for_selector(".screen.lesson")
        a.play("1-1")
        r = a.result()
        after = a.save()
        a.shot("replay-done.png", full=True)
        print("    replay: xp +%s, lessonYeopjeon %s, questYeopjeon %s, total yeopjeon +%s, tiles %s" % (
            r["xp"], r["lessonYeopjeon"], r["questYeopjeon"], r["totalYeopjeon"], a.page.inner_text(".tiles").replace("\n", " ")))
        assert a.page.inner_text(".tile.xp b") == "+10"
        assert r["xp"] == 10 and r["lessonYeopjeon"] == 0 and not r["firstTime"], r
        assert after["xp"] - before["xp"] == 10, (before["xp"], after["xp"])
        assert after["completed_lessons"] == ["1-1"]
        assert "다시 하기라서" in a.page.inner_text(".screen.done")
        assert not a.errors, a.errors

    # 2) 실제 1장: 1-1~1-4를 끝낸 저장 → 1-5(장 평가) 첫 완료. 장 평가는 XP 30 + 실수 없음 5 + 힌트 없음 5, 엽전 10 + 5
    seed = {"saveVer": 1, "xp": 80, "yeopjeon": 60, "completed_lessons": ["1-1", "1-2", "1-3", "1-4"],
            "current_lesson": "1-5", "current_chapter": 1,
            "grading_results": {k: {"perfect": True, "attempts": 1} for k in ("1-1", "1-2", "1-3", "1-4")}}
    with App("iPhone 17", save=seed, url=real_url()) as a:
        a.start()
        node = a.page.query_selector('.node[data-lesson="1-5"]')
        assert node and "current" in node.get_attribute("class"), node and node.get_attribute("class")
        assert "1-5" in a.page.inner_text("#continue")
        a.page.click("#continue")
        a.page.wait_for_selector(".screen.lesson")
        assert a.lesson("1-5")["isExam"] is True
        a.play("1-5")
        r = a.result()
        s = a.save()
        a.shot("exam-done.png", full=True)
        print("    exam: xp +%s (perfect %s, hintfree %s), lessonYeopjeon %s, total yeopjeon +%s" % (
            r["xp"], r["perfect"], r["hintFreeBuild"], r["lessonYeopjeon"], r["totalYeopjeon"]))
        assert r["firstTime"] and r["perfect"] and r["hintFreeBuild"], r
        assert r["xp"] == 30 + 5 + 5, r["xp"]
        assert r["lessonYeopjeon"] == 15, r["lessonYeopjeon"]
        assert a.page.inner_text(".tile.xp b") == "+40"
        assert s["xp"] == 120 and "1-5" in s["completed_lessons"], (s["xp"], s["completed_lessons"])
        assert s["yeopjeon"] - seed["yeopjeon"] == r["totalYeopjeon"], (s["yeopjeon"], r["totalYeopjeon"])
        a.dismiss()
        assert not a.errors, a.errors


def test_wrong_then_retry():
    with App("iPhone 17") as a:
        a.start()
        a.page.click("#continue")
        seq = a.play("1-1", wrong=(0,))
        r = a.result()
        a.shot("retry-done.png", full=True)
        acc = a.page.inner_text(".tile.acc b")
        print("    sequence %s, accuracy tile %s, perfect %s" % (seq, acc, r["perfect"]))
        # 0번(객관식)을 틀림 → 본 문제(0, 1) 뒤에 0번을 다시
        assert seq == ["0", "1", "0r"], seq
        assert r["perfect"] is False and r["xp"] == 15, r     # 10 + 힌트 없이 5
        assert acc != "100%", acc
        assert "실수 없이 끝냈어요" not in a.page.inner_text(".screen.done")
        s = a.save()
        assert s["grading_results"]["1-1"]["perfect"] is False, s["grading_results"]
        a.dismiss()
        assert not a.errors, a.errors



def test_reduced_motion():
    q = """() => [...document.querySelectorAll('svg.dueogi .dueogi-body')].map(e => ({
        name: getComputedStyle(e).animationName,
        running: e.getAnimations().filter(x => x.playState === 'running').length }))"""
    with App("iPhone 17", reduced=True) as a:
        seen = {}
        seen["splash"] = a.js(q)
        a.start()
        seen["home"] = a.js(q)
        a.page.click("#continue")
        a.page.wait_for_selector(".card-view")
        seen["card"] = a.js(q)
        print("    %s" % {k: len(v) for k, v in seen.items()})
        bad = {k: v for k, v in seen.items() if any(x["running"] or x["name"] != "none" for x in v)}
        assert all(seen.values()), "no Dueogi found on some screen: %s" % seen
        assert not bad, bad
    # 대조: 동작 줄이기가 없으면 숨쉬기 움직임이 돈다(측정 방법이 맞는지)
    with App("iPhone 17") as a:
        v = a.js(q)
        assert any(x["running"] for x in v), v


def test_status_after_milestone():
    seed = {"saveVer": 1, "xp": 100, "yeopjeon": 0, "completed_lessons": [],
            "streak": {"days": 6, "best": 6, "lastGoalDate": today(1), "todayDate": today(), "todayXp": 0},
            "settings": {"sound": True, "dailyGoal": 20, "name": ""}}
    fails = []
    # 가) 레슨 완료로 7일 → 축하 창
    with App("iPhone 17", save=seed) as a:
        a.start()
        assert a.page.inner_text(".status .stat.flame b") == "6"
        a.page.click("#continue")
        a.play("1-1")
        a.page.wait_for_selector(".celebrate", timeout=3000)
        bars = a.js("() => [...document.querySelectorAll('.status .stat.flame b')].map(e => e.textContent)")
        tile = a.page.inner_text(".tile.flame b")
        a.shot("milestone-lesson.png")
        print("    lesson path: status bars behind overlay %s, done tile %s, overlay %r" % (
            bars, tile, a.page.inner_text(".celebrate .cel-title")))
        if any(b != "7" for b in bars):
            fails.append("lesson path: status bar shows %s while overlay open" % bars)
        if tile != "7":
            fails.append("lesson path: done tile %s" % tile)
        a.page.wait_for_timeout(GUARD_WAIT)
        a.page.click("#cel-ok")
        a.page.wait_for_selector(".celebrate", state="detached")
        a.dismiss()
        a.page.click("#home")
        a.page.wait_for_selector(".screen.home")
        a.dismiss()
        home = a.page.inner_text(".status .stat.flame b")
        if home != "7":
            fails.append("lesson path: home shows %s" % home)
        if a.errors:
            fails.append("lesson path errors: %s" % a.errors)
    # 나) 설정에서 목표를 낮춰 7일 → 축하 창 (상태 줄이 같은 화면에 있음; 실행 기록 작업 9 남은 경미)
    seed2 = dict(seed, streak=dict(seed["streak"], todayXp=12))
    with App("iPhone 17", save=seed2) as a:
        a.start()
        a.page.click('[data-go="settings"]')
        a.page.wait_for_selector(".screen.settings")
        a.page.click('[data-g="10"]')
        a.page.wait_for_selector(".celebrate", timeout=3000)
        a.page.wait_for_timeout(100)
        bars = a.js("() => [...document.querySelectorAll('.status .stat.flame b')].map(e => e.textContent)")
        a.shot("milestone-settings.png")
        print("    settings path: status bars behind overlay %s" % bars)
        if not bars or any(b != "7" for b in bars):
            fails.append("settings path: status bar shows %s while overlay open" % bars)
        a.page.wait_for_timeout(GUARD_WAIT)
        a.page.click("#cel-ok")
        a.page.wait_for_selector(".celebrate", state="detached")
        after = a.page.inner_text(".status .stat.flame b")
        if after != "7":
            fails.append("settings path: after closing shows %s" % after)
        if a.errors:
            fails.append("settings path errors: %s" % a.errors)
    assert not fails, "\n".join(fails)


# ---------------------------------------------------------------- 이어 하기 (v0.6.2 다)

# 시험용 레슨은 1-1 하나뿐이라 이어 하기도 1-1에서 본다(실제 레슨이 생기면 1-1을 끝낸 저장 + 1-2로 되돌려도 됨)
RESUME_LESSON = "1-1"
SEED_AFTER_11 = {"saveVer": 1, "xp": 0, "yeopjeon": 0, "completed_lessons": [], "current_lesson": "1-1",
                 "current_chapter": 1}


def _resume_rec(a):
    return a.js("() => JSON.parse(localStorage.getItem(%s))" % json.dumps(RESUME_KEY))


def _answer_items(a, items, n):
    """카드를 넘기고 터치 문제 n개를 맞힌다. 푼 문제 번호 목록"""
    done = []
    for _ in range(40):
        if len(done) >= n:
            return done
        a.page.wait_for_timeout(80)
        if a.page.query_selector(".card-view"):
            a.page.click("#act")
            continue
        if a.page.query_selector("article.item"):
            idx = a.which_item(items)
            a.answer_touch(items[idx])
            a.page.wait_for_selector("#result:not([hidden])")
            a.cont()
            done.append(idx)
    raise AssertionError("items not answered: %s" % done)


def _reload_to_prompt(a, lid):
    a.page.reload()
    a.page.wait_for_selector(".screen.splash #go", timeout=20_000)
    a.start()
    assert lid in a.page.inner_text("#continue")
    a.page.click("#continue")
    a.page.wait_for_selector(".modal .resume-ask", timeout=10_000)
    assert "하던 곳부터 이어서 할까요?" in a.page.inner_text(".modal")


def _strip_times(save):
    s = dict(save)
    s.pop("last_active_at", None)
    s["submission_logs"] = [{k: v for k, v in e.items() if k != "at"} for e in s.get("submission_logs", [])]
    return s


def test_resume_lesson():
    # 끊지 않은 판(같은 답: 전부 정답, 조립은 첫 제출에 정답)
    with App("iPhone 17", save=SEED_AFTER_11) as a:
        a.start()
        a.page.click("#continue")
        a.play(RESUME_LESSON)
        whole_r, whole_s = a.result(), a.save()
        a.dismiss()
    with App("iPhone 17", save=SEED_AFTER_11) as a:
        a.start()
        a.page.click("#continue")
        items = a.lesson(RESUME_LESSON)["items"]
        done = _answer_items(a, items, 1)
        a.page.wait_for_selector("article.item")
        on_screen = a.which_item(items)
        rec = _resume_rec(a)
        assert rec and rec["lessonId"] == RESUME_LESSON and rec["flow"]["answered"] == 1, rec
        # 새로고침 → 묻기 → 이어서 하기 → 같은 문제
        _reload_to_prompt(a, RESUME_LESSON)
        path = a.shot("resume-prompt-iphone-17.png")
        a.page.wait_for_timeout(GUARD_WAIT)
        a.page.click(".modal .btn.primary")
        a.page.wait_for_selector("article.item")
        assert a.which_item(items) == on_screen, (done, on_screen)
        assert a.page.inner_text(".lesson-tag") == RESUME_LESSON
        # 조립 문제에서 카드 3장을 놓고 새로고침 → 같은 카드가 같은 차례로
        bi = next(x for x in items if x["type"] == "build")
        a.page.wait_for_selector("#bbank button.bcard")
        part = bi["cards"][:3]
        a.place(part)
        rec = _resume_rec(a)
        assert rec["item"] and len(rec["item"]["line"]) == 3, rec and rec["item"]
        _reload_to_prompt(a, RESUME_LESSON)
        a.page.click(".modal .btn.primary")
        a.page.wait_for_selector("#bline button.bcard")
        assert a.line_texts() == part, a.line_texts()
        # 끝까지 → 보상이 끊지 않은 판과 같음
        a.play(RESUME_LESSON)
        r, s = a.result(), a.save()
        print("    resumed: xp +%s yeopjeon +%s perfect %s | whole: xp +%s yeopjeon +%s perfect %s | prompt %s" % (
            r["xp"], r["totalYeopjeon"], r["perfect"], whole_r["xp"], whole_r["totalYeopjeon"], whole_r["perfect"], path))
        assert r == whole_r, (r, whole_r)
        assert _strip_times(s) == _strip_times(whole_s)
        assert _resume_rec(a) is None
        a.dismiss()
        assert not a.errors, a.errors

def test_resume_decline():
    with App("iPhone 17", save=SEED_AFTER_11) as a:
        a.start()
        a.page.click("#continue")
        items = a.lesson(RESUME_LESSON)["items"]
        _answer_items(a, items, 1)
        assert _resume_rec(a) is not None
        _reload_to_prompt(a, RESUME_LESSON)
        a.page.click(".modal .btn:not(.primary)")       # 처음부터
        a.page.wait_for_selector(".card-view")
        assert "오늘의 목표" in a.page.inner_text(".card-view")   # 첫 카드
        assert _resume_rec(a) is None
        # 카드 하나 넘기면 다시 기록 → 그만두기로 지움
        a.page.click("#act")
        a.page.wait_for_timeout(150)
        assert _resume_rec(a) is not None
        a.page.click("#quit")
        a.page.wait_for_selector(".modal")
        a.page.click(".modal .btn:not(.primary)")       # 그만두기
        a.page.wait_for_selector(".screen.home")
        assert _resume_rec(a) is None
        # 다시 들어가도 묻지 않음
        a.page.click("#continue")
        a.page.wait_for_selector(".card-view")
        assert not a.page.query_selector(".modal")
        assert not a.errors, a.errors


# ---------------------------------------------------------------- 실행

# ---------------------------------------------------------------- 심화 (v0.7 작업 1)

_adv_env = {}


def adv_url():
    """시험 심화를 1·2장에 끼운 빌드를 따로 띄운다(실제 심화 내용이 없어도 엔진·화면을 시험)."""
    if _adv_env:
        return _adv_env["url"]
    env()
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from fixtures.advanced_dir import make
    lessons = make(os.path.join(ROOT, "data", "lessons"), os.path.join(OUT, "lessons-adv"), chapters=(1, 2), strip_advanced=(17,))
    dist = os.path.join(OUT, "dist-adv")
    r = subprocess.run([sys.executable, os.path.join(ROOT, "build.py"), "--out", dist, "--lessons-dir", lessons],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, "build.py (advanced fixture) failed:\n" + r.stdout + r.stderr
    httpd = _Server(("127.0.0.1", 0), functools.partial(_Handler, directory=dist))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    atexit.register(httpd.shutdown)
    _adv_env["url"] = "http://127.0.0.1:%d/" % httpd.server_address[1]
    return _adv_env["url"]


def _adv_classes(a, chapter):
    return a.js("(n) => [1, 2, 3].map((k) => document.querySelector(`.star-node[data-lesson='${n}-A${k}']`)?.className || null)", chapter)


def test_advanced_branch():
    raise SkipTest('실제 장 레슨(작업 12)과 심화 내용이 있어야 함 — tests/fixtures/advanced_dir.py가 data/lessons를 복사해 씀')
    url = adv_url()
    ch1 = ["1-%d" % k for k in range(1, 6)]
    seed = {"saveVer": 2, "xp": 120, "yeopjeon": 0, "completed_lessons": ch1, "current_lesson": "2-1", "current_chapter": 2,
            "grading_results": {k: {"perfect": True, "attempts": 1} for k in ch1}, "outfits": ["basic"], "outfit": "basic"}
    with App("iPhone 17", save=seed, url=url) as a:
        a.start()
        # 학습 길: 1장 별 3개 열림, 2장 별 3개 잠김, 지금 레슨 2-1
        c1, c2 = _adv_classes(a, 1), _adv_classes(a, 2)
        assert all(c and "open" in c for c in c1), c1
        assert all(c and "locked" in c for c in c2), c2
        assert "current" in a.page.get_attribute('.node[data-lesson="2-1"]', "class")
        assert "2-1" in a.page.inner_text("#continue")
        a.js("() => document.querySelector(`.star-node[data-lesson='1-A1']`).scrollIntoView({ block: 'center' })")
        a.page.wait_for_timeout(200)
        a.shot("adv-home.png")
        m = measure(a, "home-adv")
        assert not m["problems"] and not m["small"], m
        # 잠긴 별: 열리지 않음
        a.page.click(".star-node[data-lesson='2-A1']")
        a.page.wait_for_timeout(300)
        assert a.page.query_selector(".screen.home"), "locked advanced star must not open"
        # 1-A1 풀기(첫 문제 한 번 틀림 → 실수 없음 아님, 힌트 없이 통과)
        a.page.click(".star-node[data-lesson='1-A1']")
        a.page.wait_for_selector(".screen.lesson")
        a.play("1-A1", wrong=(0,))
        r = a.result()
        s = a.save()
        title = a.page.inner_text(".done-hero h1")
        print("    advanced: %s xp +%s, lessonYeopjeon %s, perfect %s, hintfree %s, badges %s" % (
            title, r["xp"], r["lessonYeopjeon"], r["perfect"], r["hintFreeBuild"], r["newBadges"]))
        assert title == "1-A1 심화 완료!", title
        assert r["firstTime"] and not r["perfect"] and r["hintFreeBuild"], r
        assert r["xp"] == 15 + 5 and r["lessonYeopjeon"] == 15, r
        assert "advanced1" in r["newBadges"], r["newBadges"]
        assert "심화 첫걸음" in a.page.inner_text(".screen.done")
        assert "1-A1" in s["completed_lessons"] and s["current_lesson"] == "2-1" and s["current_chapter"] == 2, s
        a.shot("adv-done.png")
        a.dismiss()
        a.page.click("#home")
        a.page.wait_for_selector(".screen.home")
        a.dismiss()
        c1 = _adv_classes(a, 1)
        assert "done" in c1[0] and "open" in c1[1] and "open" in c1[2], c1
        assert "2-1" in a.page.inner_text("#continue"), "current lesson stays 2-1"
        # 설정: 「심화 1/3」, 펼치면 「심화」 아래 3개
        a.page.click('[data-go="settings"]')
        a.page.wait_for_selector(".screen.settings")
        row = a.page.query_selector('.ch-row[aria-controls="ch-1"]')
        assert "심화 1/3" in row.inner_text(), row.inner_text()
        plain = a.js("() => (window.__dueogi.app.chapters.find((c) => !(c.advanced || []).length) || {}).id")
        assert plain, "need a chapter without ADVANCED"
        assert a.page.query_selector('.ch-row[aria-controls="ch-%d"] .ch-adv' % plain) is None, "chapter without ADVANCED shows no 심화 count"
        assert "심화 0/3" in a.page.inner_text('.ch-row[aria-controls="ch-2"]')
        assert "레슨 중 5개 완료" in a.page.inner_text(".course-sum"), a.page.inner_text(".course-sum")
        row.click()
        a.page.wait_for_selector("#ch-1:not([hidden])")
        assert a.page.inner_text("#ch-1 .ch-adv-head").startswith("심화")
        assert a.page.eval_on_selector_all("#ch-1 .ls.adv", "es => es.map(e => e.className)") == ["ls adv done", "ls adv open", "ls adv open"]
        a.js("() => document.querySelector('#ch-1').scrollIntoView({ block: 'start' })")
        a.page.wait_for_timeout(150)
        a.shot("adv-settings.png")
        m = measure(a, "settings-adv")
        assert not m["problems"] and not m["small"], m
        # 배지: 15개
        a.page.click('[data-go="badges"]')
        a.page.wait_for_selector(".screen.badges")
        assert "/15" in a.page.inner_text(".page-title"), a.page.inner_text(".page-title")
        assert "끝낸 심화" in a.page.inner_text(".stat-grid")
        a.shot("adv-badges.png", full=True)
        m = measure(a, "badges-adv")
        assert not m["problems"] and not m["small"], m
        assert not a.errors, a.errors


# ---------------------------------------------------------------- 「새 내용」 점 (v0.7.1 작업 1)

_upd_env = {}


UPD_VER = "v0.1.1"   # 시험용 보강 판 이름(실제 판은 v0.1)


def _lessons_with_updated(dst, updated):
    """data/lessons를 dst에 복사하고 레슨 머리 `id: "N-k", chapter: N,` 뒤에 updated: "판"을 끼운다(시험용, 앱 코드는 그대로)"""
    src = os.path.join(ROOT, "data", "lessons")
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    for lid, ver in updated.items():
        n = lid.split("-")[0]
        path = os.path.join(dst, "ch%s.js" % n)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        head = 'id: "%s", chapter: %s,' % (lid, n)
        assert text.count(head) == 1, "lesson head %r not found once in %s" % (head, path)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(head, '%s updated: "%s",' % (head, ver)))
    return dst


def upd_url():
    """실제 레슨(data/lessons)의 1-2에 updated(UPD_VER)를 단 빌드를 따로 띄운다(실제 보강 내용이 없어도 점·기록을 시험)."""
    if _upd_env:
        return _upd_env["url"]
    env()
    lessons = _lessons_with_updated(os.path.join(OUT, "lessons-upd"), {"1-2": UPD_VER})
    dist = os.path.join(OUT, "dist-upd")
    r = subprocess.run([sys.executable, os.path.join(ROOT, "build.py"), "--out", dist, "--lessons-dir", lessons],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, "build.py (updated fixture) failed:\n" + r.stdout + r.stderr
    httpd = _Server(("127.0.0.1", 0), functools.partial(_Handler, directory=dist))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    atexit.register(httpd.shutdown)
    _upd_env["url"] = "http://127.0.0.1:%d/" % httpd.server_address[1]
    return _upd_env["url"]


def _dots(a):
    return a.js("() => [...document.querySelectorAll('.screen.home .new-dot')].map((d) => d.dataset.for)")


def test_new_content_dot():
    url = upd_url()
    done = ["1-1", "1-2"]
    seed = {"saveVer": 1, "xp": 40, "yeopjeon": 30, "completed_lessons": done, "current_lesson": "1-3", "current_chapter": 1,
            "grading_results": {k: {"perfect": True, "attempts": 1} for k in done}}
    with App("iPhone 17", save=seed, url=url) as a:
        a.start()
        assert _dots(a) == ["1-2"], _dots(a)
        dot = a.page.query_selector('.new-dot[data-for="1-2"]')
        assert dot.get_attribute("aria-label") == "새 내용 있음" and dot.get_attribute("role") == "img"
        assert "새 내용 있음" in a.page.get_attribute('.node[data-lesson="1-2"]', "aria-label")
        assert "새 내용" not in (a.page.get_attribute('.node[data-lesson="1-1"]', "aria-label") or "")
        a.js("() => document.querySelector('.node[data-lesson=\"1-2\"]').scrollIntoView({ block: 'center' })")
        a.page.wait_for_timeout(200)
        # 점이 노드 누르기를 가리지 않음: 노드 가운데·점 자리를 누르면 노드가 받는다, 노드 크기 그대로
        box = a.page.query_selector('.node[data-lesson="1-2"]').bounding_box()
        assert round(box["width"]) == 68 and round(box["height"]) == 68, box
        hit = a.js("([x, y]) => document.elementFromPoint(x, y)?.closest('.node')?.dataset.lesson || null",
                   [box["x"] + box["width"] / 2, box["y"] + box["height"] / 2])
        assert hit == "1-2", hit
        db = dot.bounding_box()
        under = a.js("([x, y]) => document.elementFromPoint(x, y)?.closest('.new-dot') ? 'dot' : 'other'",
                     [db["x"] + db["width"] / 2, db["y"] + db["height"] / 2])
        assert under == "other", "dot must not take taps (pointer-events: none)"
        a.shot("v071-new-dot-home.png")
        m = measure(a, "home-new-dot")
        assert not m["problems"] and not m["small"], m
        # 설정 학습 내용: 1장을 펼치면 1-2 줄에 점
        a.page.click('[data-go="settings"]')
        a.page.wait_for_selector(".screen.settings")
        a.page.click('.ch-row[aria-controls="ch-1"]')
        a.page.wait_for_selector("#ch-1:not([hidden])")
        rows = a.page.eval_on_selector_all("#ch-1 .ls", "es => es.map(e => !!e.querySelector('.new-dot'))")
        assert rows[:3] == [False, True, False], rows
        a.js("() => document.querySelector('#ch-1 .new-dot').scrollIntoView({ block: 'center' })")
        a.page.wait_for_timeout(150)
        a.shot("v071-new-dot-settings.png")
        m = measure(a, "settings-new-dot")
        assert not m["problems"] and not m["small"], m
        # 다시 하기 → 끝까지 → 점 사라짐, 완료 화면은 평소 다시 하기와 같음
        a.page.click('[data-go="home"]')
        a.page.wait_for_selector(".screen.home")
        a.page.click('[data-lesson="1-2"]')
        a.page.wait_for_selector(".modal .btn.primary")
        a.page.click(".modal .btn.primary")
        a.page.wait_for_selector(".screen.lesson")
        a.play("1-2")
        r = a.result()
        s = a.save()
        assert r["xp"] == 10 and r["lessonYeopjeon"] == 0 and not r["firstTime"], r
        assert s["seen_updates"] == {"1-2": UPD_VER}, s.get("seen_updates")
        assert s["completed_lessons"] == done and s["saveVer"] == 1, s
        text = a.page.inner_text(".screen.done")
        assert "다시 하기라서" in text and "새 내용" not in text, text
        a.dismiss()
        a.page.click("#home")
        a.page.wait_for_selector(".screen.home")
        a.dismiss()
        assert _dots(a) == [], _dots(a)
        assert "새 내용" not in a.page.get_attribute('.node[data-lesson="1-2"]', "aria-label")
        a.js("() => document.querySelector('.node[data-lesson=\"1-2\"]').scrollIntoView({ block: 'center' })")
        a.page.wait_for_timeout(200)
        a.shot("v071-new-dot-after-replay.png")
        # 새로 불러도 그대로(저장됨)
        a.page.reload()
        a.page.wait_for_selector(".screen.splash #go", timeout=20_000)
        a.start()
        assert _dots(a) == [], _dots(a)
        assert not a.errors, a.errors



# ---------------------------------------------------------------- 매일 도전 (리아 v0.9 작업 2 → 두억이 작업 11)

DAILY_JS = "() => { const l = window.__dueogi.app.dailyLesson; return l ? l.items : null; }"


def _daily_card(a):
    return a.js("""() => { const c = document.querySelector('.panel.daily'); if (!c) return null;
      const b = c.querySelector('#daily');
      return { cls: c.className, text: c.innerText, btn: b ? b.innerText.trim() : null, disabled: b ? b.disabled : null,
               on: c.querySelectorAll('.d-dot.on').length, dots: c.querySelectorAll('.d-dot').length,
               first: [...document.querySelector('main').children].filter((e) => !e.classList.contains('sr'))[0] === c }; }""")


def _daily_answer_one(a, shots):
    """도전 화면의 지금 문제 하나를 맞게 풀고 「계속」. 돌려줌: 문제 종류"""
    a.page.wait_for_selector("article.item", timeout=ENGINE_READY_MS)
    items = a.js(DAILY_JS)
    idx = a.which_item(items)
    it = items[idx]
    if it["type"] == "build":
        a.page.wait_for_selector("#bbank button.bcard")
        if "build" in shots:
            a.shot(shots.pop("build"))
        a.solve_build(it)
    else:
        assert a.page.query_selector(".tag.daily"), "daily tag missing"
        if it["type"] == "choice":
            # 틀 객관식: 보기는 실제로 돌린 결과 표(오답 SQL이 오류면 「오류가 나요」 글자), 정답 SQL이 문제에 보임
            n_sql = sum(1 for o in it["options"] if isinstance(o, dict))
            a.page.wait_for_function("(n) => document.querySelectorAll('.opt .rtable').length === n", arg=n_sql, timeout=ENGINE_READY_MS)
            code = a.page.inner_text("article.item > pre.code")
            assert code.strip() == it["code"].strip() and it["options"][it["answer"]]["sql"] == it["code"], (code, it)
            # 표는 들고 온 결과로 바로 그림: 다시 채울 자리(data-sql 있는 .sql-result)가 없고, 보기에 SQL 글자가 없음
            assert a.js("() => document.querySelectorAll('.opt .sql-result[data-sql]').length") == 0
            assert all("SELECT" not in o["text"] for o in a.js(SQL_CHOICE_JS))
            if "choice" in shots:
                a.shot(shots.pop("choice"))
        elif "blank" in shots:
            a.shot(shots.pop("blank"))
        a.answer_touch(it)
        a.page.wait_for_selector("#result:not([hidden])")
    if it["type"] == "choice":   # 맞힌 결과 창에는 정답 줄이 없다(틀린 경우의 정답 표는 test_lesson_wrong_option)
        res = a.page.inner_text("#result")
        assert "SELECT" not in res, "feedback must not repeat the question SQL: %r" % res
    assert a.cont(), "daily item %d (%s) judged wrong" % (idx, it["type"])
    return it["type"]


def test_daily_challenge():
    with App("iPhone 17") as a:   # 새 저장: 잠긴 카드
        a.start()
        c = _daily_card(a)
        assert c and "locked" in c["cls"] and "1장을 끝내면 열려요" in c["text"] and c["btn"] is None, c
        assert a.save()["daily"]["picks"] == [], "no picks before chapter 1"
        assert not a.errors, a.errors

    # 시험용 1장은 레슨 2개(1-1·1-2)와 틀 2개(1-T1 객관식, 1-T2 빈자리) — 1장을 끝내면 도전이 열림
    done12 = ["1-1", "1-2"]
    base = {"saveVer": 1, "completed_lessons": done12, "current_chapter": 1, "current_lesson": "1-2",
            "settings": {"sound": False, "dailyGoal": 10, "name": ""}}
    with App("iPhone 17", save=base) as a:
        a.start()
        c = _daily_card(a)
        assert c and c["first"] and "daily new" in c["cls"] and c["btn"] == "시작" and c["on"] == 0 and c["dots"] == 3, c
        assert "첫 도전" in c["text"], c["text"]
        assert a.js("() => window.scrollY") == 0, "home must stay at the top while today's challenge is open"
        a.shot("daily-home.png")
        box = a.page.eval_on_selector("#daily", "e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }")
        assert box[0] >= 44 and box[1] >= 44, box
        m = measure(a, "home-daily")
        assert not m["problems"], m["problems"]
        assert not [x for x in m["small"] if "daily" in x], m["small"]
        s0 = a.save()
        picks = s0["daily"]["picks"]
        assert s0["daily"]["date"] == today() and len(picks) == 3, s0["daily"]
        assert [p["kind"] for p in picks] == ["tpl", "tpl", "build"], picks
        assert all(p["chapter"] == 1 for p in picks), picks
        assert sorted(p["id"] for p in picks[:2]) == ["1-T1", "1-T2"], picks
        assert picks[2]["lesson"] in done12, picks
        xp0, yeopjeon0 = s0["xp"], s0["yeopjeon"]

        a.wait_engine()
        a.page.click("#daily")
        shots = {"choice": "daily-choice.png", "blank": "daily-blank.png", "build": "daily-build.png"}
        kinds = [_daily_answer_one(a, shots)]
        a.page.wait_for_selector("article.item")
        s1 = a.save()
        assert s1["daily"]["done"] == [0], s1["daily"]

        # 새로고침(같은 날) → 같은 문제, 「이어서」, 점 1
        a.page.reload()
        a.page.wait_for_selector(".screen.splash #go", timeout=20_000)
        a.start()
        c = _daily_card(a)
        assert c["btn"] == "이어서" and c["on"] == 1 and "partial" in c["cls"], c
        assert a.save()["daily"]["picks"] == picks, "same picks after reload"
        a.wait_engine()
        a.page.click("#daily")
        for _ in range(2):
            kinds.append(_daily_answer_one(a, shots))
        assert sorted(kinds) == ["blank", "build", "choice"], kinds
        a.page.wait_for_selector(".screen.done", timeout=10_000)
        a.page.wait_for_timeout(300)
        title = a.page.inner_text(".done-hero h1")
        assert title == "오늘의 도전 완료!", title
        assert "도전 1일째" in a.page.inner_text(".daily-done"), a.page.inner_text(".daily-done")
        assert a.page.inner_text(".tile.xp b") == "+15"
        a.shot("daily-done.png", full=True)
        r = a.result()
        s2 = a.save()
        assert r["mode"] == "daily" and r["xp"] == 15 and r["lessonYeopjeon"] == 10, r
        assert s2["xp"] == xp0 + 15, (s2["xp"], xp0)
        assert s2["yeopjeon"] == yeopjeon0 + 10 + r["questYeopjeon"] + r["milestoneYeopjeon"], (s2["yeopjeon"], yeopjeon0, r)
        assert s2["daily"]["streak"] == 1 and s2["daily"]["last_done_date"] == today() and s2["daily"]["done"] == [0, 1, 2], s2["daily"]
        assert s2["streak"]["todayXp"] >= 15 and s2["streak"]["lastGoalDate"] == today(), s2["streak"]
        assert s2["completed_lessons"] == done12, "daily does not change course progress"

        a.page.click("#home")
        a.page.wait_for_selector(".screen.home")
        c = _daily_card(a)
        assert c["btn"] == "완료됨" and c["disabled"] and c["on"] == 3 and "도전 1일째" in c["text"], c
        a.js("() => window.scrollTo(0, 0)")
        a.shot("daily-home-done.png")
        a.page.reload()
        a.page.wait_for_selector(".screen.splash #go", timeout=20_000)
        a.start()
        c = _daily_card(a)
        assert c["btn"] == "완료됨" and c["disabled"], c
        assert a.save()["daily"]["picks"] == picks
        assert not a.errors, a.errors


def test_daily_no_engine():
    """sql-wasm.wasm을 못 받음 → 틀 보기를 만들 수 없음 → 「SQL 실행기를 깨우는 중에 문제가 생겼어요」 + 다시 시도(푼 기록 그대로)"""
    base = {"saveVer": 1, "completed_lessons": ["1-1", "1-2"], "current_chapter": 1, "current_lesson": "1-2",
            "settings": {"sound": False, "dailyGoal": 10, "name": ""}}
    with App("iPhone 17", save=base, block=("**/sql-wasm.wasm",)) as a:
        a.page.wait_for_function("() => window.__dueogi.ctx.sql.status === 'failed'", timeout=20_000)
        a.start()
        a.page.click("#daily")
        a.page.wait_for_selector(".lesson-wait[data-state=error]", timeout=ENGINE_READY_MS)
        assert a.page.get_attribute(".lesson-wait", "data-kind") == "engine"
        text = a.page.inner_text(".lesson-wait")
        assert "SQL 실행기" in text and "Python" not in text, text
        assert a.page.is_visible("#retry")
        a.shot("daily-no-engine.png")
        assert a.save()["daily"]["done"] == [], "nothing recorded as solved"


# ---------------------------------------------------------------- 카드 조립 (두억이 작업 6)

CARD_JS = """() => {
  const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const cards = [...document.querySelectorAll('#bbank .bcard, #bline .bcard')].filter((e) => !e.classList.contains('slot'));
  return { sizes: cards.map(box), ko: [...document.querySelectorAll('#bbank button.bcard')].map((b) => [b.dataset.text, (b.querySelector('.bc-ko') || {}).textContent || null]) };
}"""

TABLE_JS = """(sel) => { const t = document.querySelector(sel); if (!t) return null;
  const sc = t.querySelector('.rt-scroll');
  return { heads: [...t.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\\n/g, '/')),
           rows: t.querySelectorAll('tbody tr').length, foot: t.querySelector('.rt-foot').innerText,
           scrollW: sc.scrollWidth, clientW: sc.clientWidth }; }"""


def _shot_dir():
    d = os.path.join(ROOT, ".superpowers", "sdd", "2026-11-05-두억이와-SQL-v0.1", "shots")
    os.makedirs(d, exist_ok=True)
    return d


def test_build_solve():
    shots = []
    with App("iPhone 17") as a:
        a.start()
        a.page.click("#continue")
        items = _to_build(a)
        it = next(x for x in items if x["type"] == "build")
        a.wait_engine()
        assert not a.page.is_visible("#engchip"), "engine ready → no waiting chip"
        # 카드: 높이 44px 이상, 표·열 이름 카드에는 한글 뜻
        c = a.js(CARD_JS)
        assert c["sizes"] and all(h >= 44 and w >= 44 for w, h in c["sizes"]), c["sizes"]
        ko = dict(c["ko"])
        assert ko["items"] == "물건" and ko["name"] == "이름" and ko["customers"] == "손님" and ko["SELECT"] is None, ko
        a.shot("build-before.png")
        shutil.copy(os.path.join(OUT, "build-before.png"), os.path.join(_shot_dir(), "build-1-before-run.png"))
        shots.append("build-1-before-run.png")
        # 카드를 놓아도 더미의 다른 카드 자리는 그대로(빈 칸이 남음)
        before = a.js("() => [...document.querySelectorAll('#bbank .bcard')].map((e) => Math.round(e.getBoundingClientRect().left))")
        a.tap_card("SELECT")
        after = a.js("() => [...document.querySelectorAll('#bbank .bcard')].map((e) => Math.round(e.getBoundingClientRect().left))")
        assert before == after, (before, after)
        assert a.page.query_selector("#bbank .bcard.slot"), "placed card leaves an empty slot"
        a.page.click("#bline button.bcard")
        assert a.line_texts() == []

        wrong = ["SELECT", "name", ",", "price", "FROM", "items", "WHERE", "price", "<", "200"]
        # 1) 틀린 조건으로 「실행」 → 결과 표(35행), 열 이름 아래 한글 뜻. 채점에는 영향 없음
        a.place(wrong)
        a.build_press("run")
        a.page.wait_for_selector("#console .rtable")
        t = a.js(TABLE_JS, "#console .rtable")
        print("    run table: heads %s rows %s foot %r" % (t["heads"], t["rows"], t["foot"]))
        assert t["heads"] == ["name/이름", "price/값(엽전)"] and t["rows"] == 35 and "35행" in t["foot"], t
        a.js("() => { const e = document.querySelector('#console'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 160); }")
        a.page.wait_for_timeout(150)
        a.shot("build-run-table.png")
        shutil.copy(os.path.join(OUT, "build-run-table.png"), os.path.join(_shot_dir(), "build-2-after-run-table.png"))
        shots.append("build-2-after-run-table.png")
        m = measure(a, "build-run")
        assert not m["problems"] and not m["small"], m
        # 2) 없는 열(customers에는 price가 없음) 실행 → 오류 설명(hadError)
        a.place(["SELECT", "name", ",", "price", "FROM", "customers"])
        a.build_press("run")
        a.page.wait_for_selector("#console .err-panel")
        err = a.page.inner_text("#console .err-panel")
        assert "no such column: price" in err and "열은 이 표에 없어" in err, err
        # 3) 틀린 제출 → 내 결과·기대 결과 나란히(좁은 화면은 위아래), 결과 창 없음
        a.place(wrong)
        a.build_press("submit")
        a.page.wait_for_selector("#console .cmp")
        assert a.page.is_hidden("#result"), "wrong submit keeps the question open"
        mine, exp = a.js(TABLE_JS, ".cmp-col:nth-child(1) .rtable"), a.js(TABLE_JS, ".cmp-col:nth-child(2) .rtable")
        assert mine["rows"] == 35 and mine["rows"] > 6 and "35행" in mine["foot"], mine   # 50행까지 모두(앞 몇 행만 아님)
        assert exp["rows"] == 5 and "5행" in exp["foot"], exp
        # 비교 표 상자는 높이 제한 + 상자 안 세로 스크롤, 머리 줄은 상자 안에 붙어 있음
        box = a.js("""() => { const sc = document.querySelector('.cmp-col:nth-child(1) .rt-scroll');
          const r0 = sc.getBoundingClientRect(); sc.scrollTop = 200;
          const th = sc.querySelector('thead th').getBoundingClientRect(); const out = { h: r0.height, vh: innerHeight,
            scrollH: sc.scrollHeight, oy: getComputedStyle(sc).overflowY, headTop: Math.round(th.top - sc.getBoundingClientRect().top) };
          sc.scrollTop = 0; return out; }""")
        assert box["oy"] == "auto" and box["h"] <= box["vh"] * 0.3 + 1 and box["scrollH"] > box["h"], box
        assert abs(box["headTop"]) <= 3, "sticky header stays at the top of the box: %s" % box
        assert "제출 1번째" in a.page.inner_text("#console")
        stacked = a.js("() => { const c = [...document.querySelectorAll('.cmp-col')].map((e) => e.getBoundingClientRect()); return c[1].top >= c[0].bottom - 1; }")
        assert stacked, "iPhone width: my result above expected result"
        # 앱이 스스로 비교 표로 내려 준 화면 그대로 본다(시험이 따로 스크롤하지 않음)
        a.page.wait_for_timeout(250)
        # 비교로 내려온 화면에서 기대 결과 표의 머리가 아래 고정 줄(실행·제출) 위에 보여야 한다
        # 틀린 까닭 줄(h3)이 화면 안(위 머리 줄 아래, 아래 실행·제출 줄 위)에 다 보이고, 기대 결과 표 머리도 아래 줄 위에
        vis = a.js("""() => { const r = (sel) => document.querySelector(sel).getBoundingClientRect();
          const why = r('#console .err-panel h3'), mine = r('.cmp-col:nth-child(1) .rt-scroll'), th = r('.cmp-col:nth-child(2) thead');
          return { top: Math.round(r('.lesson-top').bottom), foot: Math.round(r('#foot').top),
                   whyTop: Math.round(why.top), whyBottom: Math.round(why.bottom), mineBottom: Math.round(mine.bottom),
                   expHeadTop: Math.round(th.top), expHeadBottom: Math.round(th.bottom) }; }""")
        print("    compare: box %dpx of %dpx viewport | header %d, reason %d-%d, my box ends %d, expected head %d-%d, action bar %d" % (
            box["h"], box["vh"], vis["top"], vis["whyTop"], vis["whyBottom"], vis["mineBottom"], vis["expHeadTop"], vis["expHeadBottom"], vis["foot"]))
        assert vis["whyTop"] >= vis["top"] and vis["whyBottom"] <= vis["foot"], "reason line fully visible: %s" % vis
        assert vis["mineBottom"] <= vis["foot"], "my result box above the action bar: %s" % vis
        assert vis["expHeadTop"] < vis["foot"] and vis["expHeadBottom"] <= vis["foot"], "expected table header above the action bar: %s" % vis
        a.shot("build-wrong-compare.png")
        shutil.copy(os.path.join(OUT, "build-wrong-compare.png"), os.path.join(_shot_dir(), "build-3-wrong-compare.png"))
        shots.append("build-3-wrong-compare.png")
        m = measure(a, "build-wrong")
        assert not m["problems"] and not m["small"], m
        # 4) 고쳐서 제출 → 통과(오류를 고쳐 통과, 힌트 없이)
        a.place(it["cards"])
        a.build_press("submit")
        a.page.wait_for_selector("#result:not([hidden])")
        title = a.page.inner_text("#result h2")
        assert title == "단서를 따라 고쳐서 통과!", title
        assert a.page.is_disabled("#submit") and a.page.is_disabled("#run"), "locked after pass"
        assert a.cont()
        a.page.wait_for_selector(".screen.done", timeout=10_000)
        a.page.wait_for_timeout(300)
        r, s = a.result(), a.save()
        print("    build done: xp +%s perfect %s hintfree %s stats %s logs %s" % (
            r["xp"], r["perfect"], r["hintFreeBuild"], s["stats"], [e["pass"] for e in s["submission_logs"]]))
        assert r["hintFreeBuild"] and not r["perfect"] and r["xp"] == 15, r
        assert s["stats"]["fixed"] == 1 and s["stats"]["hintfree"] == 1, s["stats"]
        assert [e["pass"] for e in s["submission_logs"]] == [False, True], s["submission_logs"]
        a.dismiss()
        assert not a.errors, a.errors
    print("    screenshots: %s" % ", ".join(shots))


def test_build_no_engine():
    with App("iPhone 17", block=("**/sql-wasm.wasm",)) as a:
        a.page.wait_for_function("() => window.__dueogi.ctx.sql.status === 'failed'", timeout=20_000)
        assert "못 받았어요" in a.page.inner_text(".load-text"), a.page.inner_text(".load-text")
        a.start()
        a.page.click("#continue")
        items = a.lesson("1-1")["items"]
        a.page.wait_for_selector(".card-view")
        a.page.click("#act")
        # 보기 전용 카드(판정 R30)는 실행기가 없어도 그대로 읽힌다(실행하지 않으므로 「불러오지 못해」 안내도 없음)
        a.page.wait_for_selector(".card-view.show-card pre.code.show")
        assert "불러오지 못해" not in a.page.inner_text(".card-view"), a.page.inner_text(".card-view")
        a.page.click("#act")
        # 객관식은 그대로 풀림
        a.page.wait_for_selector("article.item")
        idx = a.which_item(items)
        assert items[idx]["type"] == "choice", items[idx]
        a.answer_touch(items[idx])
        a.page.wait_for_selector("#result:not([hidden])")
        assert a.cont(), "choice judged correct without the engine"
        # 조립 문제: 안내 줄, 실행·제출 막힘, 카드 놓기와 힌트는 됨
        a.page.wait_for_selector("#bbank button.bcard")
        chip = a.page.inner_text("#engchip")
        print("    no-engine chip: %r" % chip.replace("\n", " / "))
        assert "실행기 준비 중이에요" in chip and "받지 못했어요" in chip, chip
        assert a.page.is_disabled("#run") and a.page.is_disabled("#submit")
        a.tap_card("SELECT")
        assert a.line_texts() == ["SELECT"]
        a.page.click("#hint")
        assert "힌트 1" in a.page.inner_text("#hints")
        a.page.click("#run", force=True)
        assert a.page.is_hidden("#result")
        # 「다시 시도」를 눌러도 막혀 있으면 계속 실패 안내
        a.page.click("#engretry")
        a.page.wait_for_function("() => window.__dueogi.ctx.sql.status === 'failed'", timeout=20_000)
        a.page.wait_for_selector("#engchip.err")
        assert a.page.is_disabled("#submit")
        a.shot("build-no-engine.png")
        m = measure(a, "build-no-engine")
        assert not m["problems"] and not m["small"], m
        # 막은 wasm 받기에 대한 브라우저·sql.js 자체 기록(일부러 막았으므로 예상한 것)만 허용
        expected = ("sql-wasm.wasm", "Failed to load resource", "wasm streaming compile failed", "falling back to ArrayBuffer")
        bad = [e for e in a.errors if not any(x in e for x in expected)]
        assert not bad, bad


SQL_CHOICE_JS = """() => [...document.querySelectorAll('.opt')].map((b) => { const r = b.getBoundingClientRect(); const t = b.querySelector('.rtable');
  return { sql: b.dataset.sql || null, h: Math.round(r.height), w: Math.round(r.width), rows: t ? t.querySelectorAll('tbody tr').length : 0,
           heads: t ? [...t.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\\n/g, '/')) : [], text: b.innerText.replace(/\\n/g, ' / '),
           label: b.getAttribute('aria-label'), tabbable: t ? t.querySelectorAll('[tabindex]').length : 0 }; })"""

SHEET_JS = """() => [...document.querySelectorAll('.tables-sheet .tbl-sec')].map((s) => ({
  table: s.dataset.table, name: s.querySelector('.tbl-name').innerText.replace(/\\n/g, ' '),
  cols: [...s.querySelectorAll('.col-list li')].map((li) => li.innerText), rows: s.querySelectorAll('tbody tr').length,
  heads: [...s.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\\n/g, '/')) }))"""


def _sheet_checks(a, want):
    """「쓸 표 보기」 시트가 열려 있어야 함: 표마다 한글 이름·열 목록·5행. want: {표: 한글 이름}"""
    a.page.wait_for_selector(".modal[role=dialog] .tables-sheet")
    a.page.wait_for_function("(n) => document.querySelectorAll('.tables-sheet .rtable').length === n", arg=len(want), timeout=20_000)
    secs = a.js(SHEET_JS)
    assert [x["table"] for x in secs] == list(want), secs
    for x in secs:
        assert x["name"].startswith(want[x["table"]]) and x["table"] in x["name"], x
        assert x["rows"] == 5, x
        assert any(c.startswith(x["heads"][0].split("/")[0]) and " — " in c for c in x["cols"]), x
    return secs


def _sheet_close_ways(a, open_fn, want):
    """닫기 단추·Esc·바깥 누르기 세 가지로 닫힘"""
    for how in ("button", "escape", "backdrop"):
        open_fn()
        _sheet_checks(a, want)
        if how == "button":
            a.page.click(".modal .btn.primary")
        elif how == "escape":
            a.page.keyboard.press("Escape")
        else:
            a.page.mouse.click(8, 8)
        a.page.wait_for_selector(".modal-back", state="detached", timeout=3000)


def test_lesson():
    shots = []
    sd = _shot_dir()

    def keep(a, name, src):
        a.shot(src)
        shutil.copy(os.path.join(OUT, src), os.path.join(sd, name))
        shots.append(name)
    with App("iPhone 17", save={"completed_lessons": ["1-1"]}) as a:
        a.start()
        a.page.click("#continue")
        a.page.wait_for_selector(".card-view")
        assert "시험용 결과 표" in a.page.inner_text(".lesson-title"), a.page.inner_text(".lesson-title")
        # 1) 설명 카드: SQL(코드 글꼴) + 결과 표
        a.page.wait_for_selector(".card-view .sql-result .rtable", timeout=ENGINE_READY_MS)
        code = a.page.inner_text(".card-view pre.code.sql")
        assert code == "SELECT name, price FROM items WHERE price >= 200", code
        assert "monospace" in a.js("() => getComputedStyle(document.querySelector('.card-view pre.code code')).fontFamily") \
            or "mono" in a.js("() => getComputedStyle(document.querySelector('.card-view pre.code')).fontFamily").lower(), "SQL in mono font"
        t = a.js(TABLE_JS, ".card-view .rtable")
        print("    card table: %s rows %s foot %r" % (t["heads"], t["rows"], t["foot"]))
        assert t["heads"] == ["name/이름", "price/값(엽전)"] and t["rows"] == 5 and "5행" in t["foot"], t
        m = measure(a, "lesson-card-sql")
        assert not m["problems"] and not m["small"], m
        keep(a, "lesson-1-card-table.png", "lesson-card-sql.png")
        # 2) 행이 많은 카드: 표 상자 30vh 안에서 스크롤
        a.page.click("#act")
        a.page.wait_for_selector(".card-view .sql-result .rtable", timeout=20_000)
        a.page.wait_for_function("() => document.querySelectorAll('.card-view tbody tr').length > 5")
        big = a.js("""() => { const sc = document.querySelector('.card-view .rt-scroll'); const r = sc.getBoundingClientRect();
          return { h: r.height, vh: innerHeight, scrollH: sc.scrollHeight, oy: getComputedStyle(sc).overflowY,
                   rows: sc.querySelectorAll('tbody tr').length, foot: document.querySelector('.card-view .rt-foot').innerText }; }""")
        assert big["oy"] == "auto" and big["h"] <= big["vh"] * 0.3 + 1 and big["scrollH"] > big["h"], big
        assert big["rows"] == 40 and "40행" in big["foot"], big
        a.page.click("#act")
        # 3) 객관식: 보기가 결과 표. 한 보기 = 눌리는 요소 하나(44px 이상), 표는 따로 포커스를 받지 않음
        a.page.wait_for_selector("article.item .opt")
        a.page.wait_for_function("() => document.querySelectorAll('.opt .rtable').length === 3", timeout=20_000)
        opts = a.js(SQL_CHOICE_JS)
        print("    options: %s" % [(o["rows"], o["h"], o["heads"]) for o in opts])
        assert len(opts) == 3 and all(o["h"] >= 44 and o["rows"] == 3 and o["heads"] == ["name/이름"] for o in opts), opts
        assert all(o["tabbable"] == 0 and o["label"] and "3행" in o["label"] for o in opts), opts
        assert a.js("() => document.querySelectorAll('.opt button, .opt a').length") == 0
        right = "SELECT name FROM shops ORDER BY shop_id LIMIT 3"
        texts = {o["sql"]: o["text"] for o in opts}
        assert texts[right] != texts["SELECT name FROM items ORDER BY item_id LIMIT 3"], "options must differ"
        m = measure(a, "lesson-choice-sql")
        assert not m["problems"] and not m["small"], m
        keep(a, "lesson-2-choice-tables.png", "lesson-choice-sql.png")
        # 쓸 표 보기: 세 가지 닫기
        assert a.page.is_visible("#tablesbtn")
        _sheet_close_ways(a, lambda: a.page.click("#tablesbtn"), {"shops": "가게", "items": "물건"})
        a.page.click("#tablesbtn")
        secs = _sheet_checks(a, {"shops": "가게", "items": "물건"})
        print("    sheet: %s" % [(x["name"], len(x["cols"]), x["rows"]) for x in secs])
        assert secs[0]["cols"][0] == "shop_id — 가게 번호", secs[0]["cols"]
        assert secs[1]["heads"][:2] == ["item_id/물건 번호", "shop_id/가게 번호"], secs[1]["heads"]
        a.page.wait_for_timeout(200)
        keep(a, "lesson-3-tables-sheet.png", "lesson-tables-sheet.png")
        # 처음 열린 그대로(스크롤 없이) 닫기 단추가 화면 안에 있고, 눌러서 닫힌다
        cb = a.js("""() => { const m = document.querySelector('.modal'); const b = document.querySelector('.modal .btn.primary').getBoundingClientRect();
          return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight, scrollTop: m.scrollTop, scrollable: m.scrollHeight > m.clientHeight }; }""")
        print("    sheet close button: %s" % cb)
        assert cb["scrollTop"] == 0 and cb["scrollable"] and cb["top"] >= 0 and cb["bottom"] <= cb["vh"], cb
        a.page.click(".modal .btn.primary")
        a.page.wait_for_selector(".modal-back", state="detached", timeout=3000)
        a.page.click("#tablesbtn")
        _sheet_checks(a, {"shops": "가게", "items": "물건"})
        a.page.keyboard.press("Escape")
        a.page.wait_for_selector(".modal-back", state="detached")
        # 맞는 보기를 눌러 확인 → 정답
        a.page.click('.opt[data-sql="%s"]' % right)
        a.page.click("#act")
        a.page.wait_for_selector("#result:not([hidden])")
        assert "ok" in (a.page.get_attribute("#result", "class") or ""), "tapping the table option that matches is correct"
        assert a.cont()
        # 4) 조립 문제에도 「쓸 표 보기」
        a.page.wait_for_selector("#bbank button.bcard")
        assert a.page.is_visible("#tablesbtn")
        m = measure(a, "lesson-build-tables")
        assert not m["problems"] and not m["small"], m
        _sheet_close_ways(a, lambda: a.page.click("#tablesbtn"), {"shops": "가게", "items": "물건"})
        a.solve_build(next(x for x in a.lesson("1-2")["items"] if x["type"] == "build"))
        assert a.cont()
        a.page.wait_for_selector(".screen.done", timeout=10_000)
        a.dismiss()
        assert not a.errors, a.errors
    print("    screenshots: %s" % ", ".join(shots))


def test_lesson_wrong_option():
    with App("iPhone 17", save={"completed_lessons": ["1-1"]}) as a:
        a.start()
        a.page.click("#continue")
        a.page.wait_for_selector(".card-view")
        a.page.click("#act")
        a.page.click("#act")
        a.page.wait_for_function("() => document.querySelectorAll('.opt .rtable').length === 3", timeout=ENGINE_READY_MS)
        a.page.click('.opt[data-sql="SELECT name FROM items ORDER BY item_id LIMIT 3"]')
        a.page.click("#act")
        a.page.wait_for_selector("#result:not([hidden])")
        res = a.page.inner_text("#result")
        # 정답 보기 SQL이 문제 SQL과 같으면 되풀이하지 않고 정답 결과 표를 보인다(작업 11 고침 1회차)
        assert "bad" in (a.page.get_attribute("#result", "class") or "") and "번 보기" in res and "SELECT" not in res, res
        assert a.page.query_selector("#result .rtable") and "도깨비 국밥집" in res, res
        a.page.wait_for_timeout(300)
        a.shot("lesson-wrong-answer-table.png")
        assert not a.errors, a.errors


def test_lesson_no_engine():
    with App("iPhone 17", save={"completed_lessons": ["1-1"]}, block=("**/sql-wasm.wasm",)) as a:
        a.page.wait_for_function("() => window.__dueogi.ctx.sql.status === 'failed'", timeout=20_000)
        a.start()
        a.page.click("#continue")
        a.page.wait_for_selector(".card-view")
        a.page.wait_for_function("() => /불러오지 못해/.test(document.querySelector('.card-view .sql-result').innerText)", timeout=20_000)
        assert "SELECT name, price FROM items" in a.page.inner_text(".card-view"), "card stays readable"
        assert a.page.is_enabled("#act")
        a.page.click("#act")
        a.page.click("#act")
        # 이 문제는 정답 보기 SQL이 문제 SQL과 같다 → 실행기가 없으면 어떤 보기도 SQL 글자를 보이지 않는다(정답이 드러남, 작업 11 고침 1회차)
        a.page.wait_for_selector("article.item .opt")
        a.page.wait_for_function("() => [...document.querySelectorAll('.opt')].every((b) => /표를 불러오지 못했어요/.test(b.innerText))", timeout=20_000)
        opts = a.js(SQL_CHOICE_JS)
        code = " ".join(a.page.inner_text("article.item > pre.code").split())
        assert code == "SELECT name FROM shops ORDER BY shop_id LIMIT 3", code
        assert all(o["rows"] == 0 and "SELECT" not in o["text"] and "SELECT" not in (o["label"] or "") and o["h"] >= 44 for o in opts), opts
        a.shot("lesson-no-engine.png")
        m = measure(a, "lesson-no-engine")
        assert not m["problems"] and not m["small"], m
        a.page.click('.opt[data-sql="SELECT name FROM shops ORDER BY shop_id LIMIT 3"]')
        a.page.click("#act")
        a.page.wait_for_selector("#result:not([hidden])")
        assert "ok" in (a.page.get_attribute("#result", "class") or ""), "judging still works without the engine"
        assert "SELECT" not in a.page.inner_text("#result"), "feedback does not repeat the question SQL"
        expected = ("sql-wasm.wasm", "Failed to load resource", "wasm streaming compile failed", "falling back to ArrayBuffer")
        bad = [e for e in a.errors if not any(x in e for x in expected)]
        assert not bad, bad



# ---------------------------------------------------------------- 실제 레슨 하나 풀어 보기 (--lesson, 작업 12 내용 검토)

LOADING_TEXT = "표를 불러오는 중"


def _seed_before(lid):
    """lid 바로 앞까지 끝낸 저장(그 레슨이 「이어서 하기」가 됨). 레슨 id는 N-1 … N-5"""
    n, k = (int(x) for x in lid.split("-"))
    done = ["%d-%d" % (c, j) for c in range(1, n) for j in range(1, 6)] + ["%d-%d" % (n, j) for j in range(1, k)]
    return {"saveVer": 1, "completed_lessons": done, "current_lesson": lid, "current_chapter": n,
            "grading_results": {x: {"perfect": True, "attempts": 1} for x in done}}


def walk_lesson(lid, device="iPhone 17", probe=None):
    """실제 레슨 lid를 처음부터 끝까지 정답으로 풀며 화면마다 캡처·측정한다. 돌려줌: (캡처 이름 목록, 문제점 목록)
    probe(app, kind)가 있으면 카드·문제 화면마다 캡처 전에 불러 그 문제점 목록을 더한다."""
    shots, fails = [], []
    tag = "walk-%s" % lid
    for f in os.listdir(OUT) if os.path.isdir(OUT) else []:
        if f.startswith(tag + "-") and f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    with App(device, save=_seed_before(lid), url=real_url()) as a:
        a.start()
        assert lid in a.page.inner_text("#continue"), a.page.inner_text("#continue")
        a.page.click("#continue")
        a.page.wait_for_selector(".screen.lesson")
        items = a.lesson(lid)["items"]
        n = 0

        def at(kind, full=True):
            nonlocal n
            n += 1
            # 결과 창은 0.28초 동안 아래에서 올라온다(.result animation up) — 다 올라온 뒤에 잰다
            a.page.wait_for_timeout(400 if kind == "result" else 150)
            name = "%s-%02d-%s.png" % (tag, n, kind)
            if probe and kind not in ("result", "done"):
                fails.extend("%s %s: %s" % (device, name, p) for p in probe(a, kind))
                a.js("() => window.scrollTo(0, 0)")
            m = measure(a, name)
            fails.extend("%s: %s" % (name, p) for p in m["problems"] + m["errors"])
            if m["small"]:
                fails.append("%s: touch targets < 44px: %s" % (name, "; ".join(m["small"])))
            a.errors.clear()
            a.shot(name, full=full)
            shots.append(name)

        def tables_drawn():
            a.page.wait_for_function("(t) => !document.querySelector('#body').innerText.includes(t)", arg=LOADING_TEXT,
                                     timeout=ENGINE_READY_MS)

        for _ in range(80):
            a.page.wait_for_timeout(80)
            if a.page.query_selector(".screen.done"):
                break
            if a.page.query_selector(".card-view"):
                tables_drawn()
                at("card")
                a.page.click("#act")
                continue
            if not a.page.query_selector("article.item"):
                continue
            idx = a.which_item(items)
            it = items[idx]
            if it["type"] == "build":
                a.page.wait_for_selector("#bbank button.bcard")
                at("build")
                a.solve_build(it)
            else:
                tables_drawn()
                at(it["type"])
                a.answer_touch(it)
                a.page.wait_for_selector("#result:not([hidden])")
            at("result", full=False)
            if not a.cont():
                fails.append("item %d (%s) judged wrong with the stored answer" % (idx, it["type"]))
        a.page.wait_for_selector(".screen.done", timeout=10_000)
        a.page.wait_for_timeout(300)
        a.dismiss()
        at("done", full=False)
    return shots, fails


def test_real_lesson_walk():
    """실제 1-1을 아이폰 17로 끝까지: 화면마다 넘침·화면 밖 단추·콘솔 오류 0. 열이 5~6개인 결과 표 보기도
    보기 단추가 화면 폭 안에 있고 표만 옆으로 밀린다(설계 §3)"""
    shots, fails = walk_lesson("1-1")
    print("    %d screens, e.g. %s" % (len(shots), ", ".join(shots[:3])))
    assert not fails, "\n".join(fails)


CARD_FOOT_JS = r"""() => {
  const f = document.querySelector('#foot').getBoundingClientRect();
  const b = document.querySelector('#act').getBoundingClientRect();
  const t = document.querySelector('.card-view .sql-result[data-filled="1"] .rtable');
  const r = t.getBoundingClientRect();
  return { vh: innerHeight, footTop: f.top, footBottom: f.bottom, btnTop: b.top, btnBottom: b.bottom,
           top: r.top, bottom: r.bottom, sy: scrollY, max: document.documentElement.scrollHeight - innerHeight,
           pos: getComputedStyle(document.querySelector('#foot')).position };
}"""


def test_card_table_above_button():
    """작업 10 (작업 13c 이월): 설명 카드의 결과 표가 「다음 카드」/「문제 풀기」 단추에 가리지 않는다.
    7장·8장 장 평가 카드(표가 화면 아래쪽까지 오는 카드)와 7-1을 아이폰 17·17e로: 처음 화면과 끝까지 내린 화면 모두에서
    결과 표(행 수 줄까지)와 단추 줄이 겹치지 않고, 끝까지 내리면 단추가 화면 안에 다 보인다."""
    fails = []
    for dev in ["iPhone 17", "iPhone 17e"]:
        for lid in ["7-5", "8-5", "7-1"]:
            with App(dev, save=_seed_before(lid), url=real_url()) as a:
                a.start()
                a.page.click("#continue")
                a.page.wait_for_selector(".card-view")
                a.page.wait_for_selector(".card-view .sql-result[data-filled='1']", timeout=ENGINE_READY_MS)
                a.page.wait_for_timeout(200)
                for when in ("top", "bottom"):
                    if when == "bottom":
                        a.js("() => window.scrollTo(0, 1e6)")
                        a.page.wait_for_timeout(100)
                    p = a.js(CARD_FOOT_JS)
                    if not a.js("() => document.querySelector('.screen.lesson').classList.contains('on-card')"):
                        fails.append("%s %s: .screen.lesson has no on-card class on a card (:has() fallback)" % (dev, lid))
                    visible_table = p["bottom"] > 0 and p["top"] < p["vh"]
                    overlap = visible_table and p["bottom"] > p["footTop"] + 0.5 and p["top"] < p["footBottom"]
                    if overlap:
                        fails.append("%s %s %s: table %d..%d under button bar %d..%d (%s)" % (
                            dev, lid, when, p["top"], p["bottom"], p["footTop"], p["footBottom"], p["pos"]))
                    if when == "bottom" and not (p["btnTop"] >= -0.5 and p["btnBottom"] <= p["vh"] + 0.5):
                        fails.append("%s %s: button off screen after scrolling %d..%d / %d" % (dev, lid, p["btnTop"], p["btnBottom"], p["vh"]))
                if lid == "8-5" and dev == "iPhone 17e":
                    # :has()를 모르는 브라우저 흉내: :has 규칙을 모두 지운 뒤에도 on-card 클래스만으로 겹치지 않아야 함
                    n = a.js("""() => { let n = 0; for (const sh of document.styleSheets) { let r; try { r = sh.cssRules; } catch { continue; }
                      for (let i = r.length - 1; i >= 0; i--) if (r[i].selectorText && r[i].selectorText.includes(':has(')) { sh.deleteRule(i); n++; } } return n; }""")
                    for when in ("top", "bottom"):
                        a.js("() => window.scrollTo(0, %s)" % ("0" if when == "top" else "1e6"))
                        a.page.wait_for_timeout(100)
                        p = a.js(CARD_FOOT_JS)
                        if p["pos"] != "static" or (p["bottom"] > p["footTop"] + 0.5 and p["top"] < p["footBottom"] and p["top"] < p["vh"]):
                            fails.append("no-:has %s %s (removed %d rules): table %d..%d, bar %d..%d (%s)" % (
                                lid, when, n, p["top"], p["bottom"], p["footTop"], p["footBottom"], p["pos"]))
                    if n < 1:
                        fails.append("no :has rules found to remove")
                if lid == "8-5" and dev == "iPhone 17":
                    a.js("() => window.scrollTo(0, 0)")
                    a.shot("card-8-5-top.png")
                    a.js("() => window.scrollTo(0, 1e6)")
                    a.shot("card-8-5-bottom.png")
                # 문제로 넘어가면 on-card가 빠지고 단추 줄은 다시 고정
                for _ in range(6):   # 카드가 여러 장이면 문제가 나올 때까지 넘김
                    if a.page.query_selector("article.item"):
                        break
                    a.js("() => window.scrollTo(0, 1e6)")
                    a.page.click("#act")
                    a.page.wait_for_timeout(150)
                a.page.wait_for_selector("article.item")
                st = a.js("() => [document.querySelector('.screen.lesson').classList.contains('on-card'), getComputedStyle(document.querySelector('#foot')).position]")
                if st != [False, "fixed"]:
                    fails.append("%s %s: after the card, on-card/foot = %s (want no class, fixed)" % (dev, lid, st))
                assert not a.errors, a.errors
    assert not fails, "\n".join(fails)


FOOT_CLEAR_JS = r"""() => {
  window.scrollTo(0, 1e6);
  const foot = document.querySelector('#foot');
  const f = foot.getBoundingClientRect();
  const last = (sel) => { let b = null; for (const e of document.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect(); if (r.height && (!b || r.bottom > b.bottom)) b = r; } return b && { t: r2(b.top), b: r2(b.bottom) }; };
  function r2(x) { return Math.round(x * 10) / 10; }
  return { vh: innerHeight, sh: document.documentElement.scrollHeight, footTop: r2(f.top), footBottom: r2(f.bottom),
    pos: getComputedStyle(foot).position, dpr: devicePixelRatio,
    targets: { 'last card': last('#bbank .bcard'), '쓸 표 보기': last('#tablesbtn'), 'last option': last('.options .opt'),
               'last chip': last('.chips .chip'), 'last line': last('#op .line, .order-pool .line'),
               'card end': last('.card-view') } };
}"""

DROP_HAS_JS = r"""() => { let n = 0; for (const sh of document.styleSheets) { let r; try { r = sh.cssRules; } catch { continue; }
  for (let i = r.length - 1; i >= 0; i--) if (r[i].selectorText && r[i].selectorText.includes(':has(')) { sh.deleteRule(i); n++; } } return n; }"""


def _foot_probe(no_has=False):
    """버그 B1 확인: 끝까지 내리면 마지막 카드·보기·「쓸 표 보기」가 아래 단추 줄 위에 다 보이고,
    전체 화면 캡처(walk-*.png)에 고정 단추 줄이 페이지 맨 아래(내린 화면과 같은 자리)에 그려진다."""
    from PIL import Image, ImageChops

    def probe(a, kind):
        out = []
        if no_has:
            a.js(DROP_HAS_JS)
        a.page.wait_for_timeout(60)
        p = a.js(FOOT_CLEAR_JS)
        if p["footBottom"] > p["vh"] + 0.5 or p["footTop"] < -0.5:
            out.append("%s: button bar %s..%s outside the screen (vh %d)" % (kind, p["footTop"], p["footBottom"], p["vh"]))
        for name, r in p["targets"].items():
            # 긴 설명 카드는 위가 화면 밖으로 나가는 것이 정상 — 카드 끝만 본다
            if r and (r["b"] > p["footTop"] + 0.5 or (r["t"] < 0 and name != "card end")):
                out.append("%s: %s %s..%s not fully above the button bar top %s after scrolling to the end (%s, sh %d, vh %d)" % (
                    kind, name, r["t"], r["b"], p["footTop"], p["pos"], p["sh"], p["vh"]))
        # 캡처: 전체 화면 캡처의 맨 아래 띠 = 끝까지 내린 화면의 맨 아래 띠(단추 줄)
        if p["pos"] == "fixed" and p["sh"] > p["vh"] + 1:
            a.js("() => window.scrollTo(0, 0)")   # walk-*.png처럼 처음 화면에서 전체 캡처
            a.page.wait_for_timeout(60)
            full = Image.open(a.shot("_foot-full.png", full=True)).convert("RGB")
            a.js("() => window.scrollTo(0, 1e6)")
            a.page.wait_for_timeout(60)
            view = Image.open(a.shot("_foot-view.png")).convert("RGB")
            band = int((p["footBottom"] - p["footTop"]) * p["dpr"])
            fb = full.crop((0, full.height - band, full.width, full.height))
            vb = view.crop((0, view.height - band, view.width, view.height))
            diff = ImageChops.difference(fb, vb).convert("L")
            bad = sum(1 for v in diff.tobytes() if v > 24) / float(band * full.width)
            if bad > 0.01:
                out.append("%s: full-page shot bottom %dpx differs from the scrolled screen's button bar (%.0f%% pixels) — "
                           "the fixed bar is drawn mid-page in the shot" % (kind, band, bad * 100))
        return out
    return probe


def test_foot_clear_after_scroll():
    """버그 B1: 레슨 화면 종류(카드·객관식·빈칸·순서·조립)마다 휴대폰 화면에서 끝까지 내리면
    마지막 카드·마지막 보기·「쓸 표 보기」가 고정 단추 줄 윗변보다 위에 다 보인다(:has() 없이도).
    walk-*.png 전체 캡처에는 단추 줄이 페이지 맨 아래에 그려진다(내린 화면과 같은 모습)."""
    fails, kinds = [], set()
    runs = [("12-1", "iPhone 17e", False), ("13-5", "iPhone 17e", False), ("12-5", "iPhone 17", False),
            ("13-1", "iPhone 17 Pro Max", False), ("12-1", "iPhone 17e", True)]
    for lid, dev, no_has in runs:
        shots, f = walk_lesson(lid, dev, probe=_foot_probe(no_has))
        kinds.update(s.split("-")[-1][:-4] for s in shots)
        fails += [("no-:has " if no_has else "") + x for x in f]
    for x in ("_foot-full.png", "_foot-view.png"):
        if os.path.exists(os.path.join(OUT, x)):
            os.remove(os.path.join(OUT, x))
    missing = {"card", "choice", "blank", "order", "build"} - kinds
    assert not missing, "screen kinds not covered: %s" % missing
    assert not fails, "\n".join(fails[:40]) + ("\n… %d more" % (len(fails) - 40) if len(fails) > 40 else "")


SQL_COLS_JS = r"""(n) => {
  const body = document.querySelector('#body');
  body.innerHTML = `<article class="item"><pre class="code" id="c1"><code></code></pre>
    <div class="order-pool"><button class="line mono" id="c2"></button></div></article>`;
  const lines = (el, t, k) => { t.textContent = 'S'; const one = el.getBoundingClientRect().height;
    t.textContent = 'S'.repeat(k); return el.getBoundingClientRect().height > one + 0.5 ? 2 : 1; };
  const pre = document.querySelector('#c1'), ln = document.querySelector('#c2');
  return { code: lines(pre, pre.querySelector('code'), n), line: lines(ln, ln, n),
           codePx: parseFloat(getComputedStyle(pre).fontSize), linePx: parseFloat(getComputedStyle(ln).fontSize) };
}"""


def test_sql_cols_fit():
    """B1 관련: 점검기 SQL_COLS(tests/content.js) 칸의 SQL 한 줄이 가장 좁은 휴대폰(iPhone 17e, 390px)의
    코드 상자(pre.code)와 순서 문제 줄 단추(.line)에서 줄바꿈 없이 한 줄에 들어간다. 글씨는 13px 이상."""
    cols = int(re.search(r"const SQL_COLS = (\d+);", open(os.path.join(ROOT, "tests", "content.js"), encoding="utf-8").read()).group(1))
    with App("iPhone 17e") as a:
        a.start()
        a.page.click("#continue")
        a.page.wait_for_selector("#body")
        r = a.js(SQL_COLS_JS, cols)
    assert r["code"] == 1 and r["line"] == 1, "%d columns wrap on iPhone 17e: %s" % (cols, r)
    assert r["codePx"] >= 13 and r["linePx"] >= 13, r


SHOW_CARD_JS = r"""() => {
  const card = document.querySelector('.card-view');
  const pre = card.querySelector('.example.show-only pre.code.show');
  const code = pre && pre.querySelector('code');
  const lh = code ? parseFloat(getComputedStyle(code).lineHeight) : 0;
  const lines = code ? code.textContent.split('\n').length : 0;
  const r = pre ? pre.getBoundingClientRect() : null;
  return { show: card.classList.contains('show-card'), dialect: (card.querySelector('.dialect') || {}).innerText || '',
    note: (card.querySelector('.show-note') || {}).innerText || '', code: code ? code.textContent : '',
    results: card.querySelectorAll('.sql-result, [data-sql], .rtable').length, buttons: card.querySelectorAll('button').length,
    exLabel: [...card.querySelectorAll('.ex-label')].map((e) => e.innerText).join(' / '),
    lines, rendered: code ? Math.round(code.getBoundingClientRect().height / lh) : 0,
    left: r && r.left, right: r && r.right, vw: innerWidth, px: pre ? parseFloat(getComputedStyle(pre).fontSize) : 0 };
}"""


def test_show_card():
    """판정 R30 (16장): 보기 전용 카드 { say, show, dialect }는 다른 데이터베이스 SQL을 이름표·「돌지 않아요」 안내와 함께 코드 상자로만 보인다.
    실행하지 않으므로 결과 표·실행 단추가 없다(실행기가 준비된 뒤에도). 가장 좁은 폰(iPhone 17e)·17에서 38칸 줄이 한 줄, 넘침 없음."""
    sd = _shot_dir()
    for dev in ["iPhone 17e", "iPhone 17"]:
        with App(dev) as a:
            a.start()
            want = next(c for c in a.lesson("1-1")["cards"] if c.get("show"))
            a.page.click("#continue")
            a.page.wait_for_selector(".card-view")
            a.page.click("#act")
            a.page.wait_for_selector(".card-view.show-card")
            a.page.wait_for_timeout(1500)   # 실행기가 깨어날 시간: 그래도 표가 생기면 안 됨
            r = a.js(SHOW_CARD_JS)
            print("    %s: %s" % (dev, {k: r[k] for k in ("dialect", "results", "buttons", "lines", "rendered", "px", "right", "vw")}))
            assert r["show"] and r["dialect"] == want["dialect"], r
            assert "돌지 않" in r["note"] and "실행 결과" not in r["exLabel"], r
            assert r["code"] == want["show"], r
            assert r["results"] == 0 and r["buttons"] == 0, "show card must not run: %s" % r
            assert r["lines"] == 3 and r["rendered"] == r["lines"], "show lines wrap at %s: %s" % (dev, r)
            assert r["left"] >= 0 and r["right"] <= r["vw"] and r["px"] >= 13, r
            m = measure(a, "show-card-%s" % slug(dev))
            assert not m["problems"] and not m["small"] and not m["errors"], m
            a.shot("show-card-%s.png" % slug(dev), full=True)
            shutil.copy(os.path.join(OUT, "show-card-%s.png" % slug(dev)), os.path.join(sd, "show-card-%s.png" % slug(dev)))
            # 「문제 풀기」로 넘어가면 평소 문제 화면
            a.page.click("#act")
            a.page.wait_for_selector("article.item")
            assert not a.errors, a.errors


def _select(argv):
    """인자: 시험 이름(test_…) 또는 --only 이름(test_<이름> 또는 test_<이름>_… 모두). 없으면 전부"""
    names = [n for n, f in globals().items() if n.startswith("test_") and callable(f)]
    if not argv:
        return names
    want, exact = [], []
    it = iter(argv)
    for x in it:
        if x == "--only":
            want.append(next(it, ""))
        elif x.startswith("--only="):
            want.append(x.split("=", 1)[1])
        else:
            exact.append(x)
    picked = [n for n in names if n in exact or any(n == "test_" + w or n.startswith("test_" + w + "_") for w in want)]
    if not picked:
        raise SystemExit("flow.py: no test matches %s (have: %s)" % (argv, ", ".join(names)))
    return picked


def _lesson_arg(argv):
    """--lesson 1-3 또는 --lesson=1-3 의 값(없거나 비면 "")"""
    for i, x in enumerate(argv):
        if x.startswith("--lesson="):
            return x.split("=", 1)[1].strip()
        if x == "--lesson":
            return argv[i + 1].strip() if i + 1 < len(argv) else ""
    return ""


def main():
    if "--lesson" in sys.argv[1:] or any(x.startswith("--lesson=") for x in sys.argv[1:]):
        lid = _lesson_arg(sys.argv[1:])
        if not re.fullmatch(r"[1-9]\d*-[1-9]\d*", lid):
            raise SystemExit("flow.py: --lesson needs a lesson id like 1-3")
        t0 = time.time()
        shots, fails = walk_lesson(lid)
        print("walk %s: %d screens (%.0fs) -> %s" % (lid, len(shots), time.time() - t0, OUT))
        for x in shots:
            print("  " + x)
        for x in fails:
            print("PROBLEM " + x)
        print("PASS walk %s" % lid if not fails else "FAIL walk %s (%d problems)" % (lid, len(fails)))
        return 1 if fails else 0
    tests = [(n, globals()[n]) for n in _select(sys.argv[1:])]
    t0 = time.time()
    env()
    print("build: " + _env["build"].replace("\n", " | "))
    fails = skips = 0
    for name, f in tests:
        t = time.time()
        try:
            f()
            print("PASS %s (%.0fs)" % (name, time.time() - t))
        except SkipTest as e:
            skips += 1
            print("SKIP %s - %s" % (name, e))
        except Exception as e:  # noqa: BLE001
            fails += 1
            print("FAIL %s (%.0fs) - %s: %s" % (name, time.time() - t, type(e).__name__, str(e)[:3000]))
    print("%d passed, %d failed, %d skipped (%.0fs). screenshots: %s" % (len(tests) - fails - skips, fails, skips, time.time() - t0, OUT))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
