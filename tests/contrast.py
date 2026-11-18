"""화면 대비 측정 도구 (v0.3.4 「밤의 장터」 작업 1, 설계서 docs/specs/2026-11-18-다크-모드-설계.md §3-2).
리아와 파이썬 v0.19.0 tests/contrast.py를 옮김(측정 스크립트 CHECK_JS·자기 시험은 그대로, 화면 목록만 두억이 것).

실행
    python3 tests/contrast.py --self-test                        도구 자기 시험(앱 빌드 없음, 몇 초)
    python3 tests/contrast.py --theme dark [--strict]             앱을 빌드해 화면 목록을 돌며 대비를 잰다
    python3 tests/contrast.py --theme dark --strict --skip-art-text   어둡게 엄격(그림 속 장식 글자 ART_TEXT만 뺌, 목록 보고)
    python3 tests/contrast.py --theme light --write tests/fixtures/contrast-light-baseline.json   밝게 기준 만들기(v0.3.3 코드에서)
    python3 tests/contrast.py --theme light --compare tests/fixtures/contrast-light-baseline.json  밝게 그대로인지(차이 0)
    (--report 는 --write 와 같음)

하는 일
- tests/flow.py의 빌드·서버·Chromium(시험용 레슨 빌드와 실제 레슨 빌드)을 같이 쓰고, `localStorage["dueogi-sql.theme"]`를 주어
  아이폰 17 크기로 연다. 화면 목록(설계서 §3-2): 인사, 튜토리얼 4장(틀린 차례 안내·결과 표), 홈(새 저장·심화 갈래·가게 점),
  레슨의 설명 카드(SQL·결과 표)·고르기(글자·결과 표 보기)·빈칸·순서·확인·조립(힌트·실행 결과 표·오류·틀린 제출 비교 표)·
  맞음/틀림 결과 창·완료, 「쓸 표 보기」 시트, 복습, 매일 도전, 배지, 의상실, 설정(학습 내용 펼침·설치 안내·확인 창),
  가게(잠김 알림·처음 열기 말풍선·장사 재생·정산·의뢰·장부 시트·칸 편집기·시험 실행 결과·오류·전체 조립·비우기 확인과 되돌리기 알림),
  개발자 모드 띠(홈·가게).
- 화면마다 「보이는 글자가 있는 요소」의 글자색과 실제 바탕색의 대비를 재어, 기준 미달을 목록으로 낸다.
  기준: 글자 4.5:1, 큰 글씨(24px 이상, 또는 굵기 700 이상이고 19px 이상) 3:1.
- 같은 화면 목록의 스크린숏을 tests/out/contrast/<theme>/<화면>.png 로 저장한다.
- `--compare 기준.json`: 보고서의 `digests`(화면별 선택자|글자색|바탕색 전부)를 견줘 다르면 1.
  기준 뒤에 새로 생긴 부분(NEW_SINCE_BASELINE: v0.3.4 설정 「화면」 묶음)은 대비만 재고 비교 목록에서 뺀다.
- 종료 코드: `--strict`이고 미달(또는 화면을 못 연 오류)이 있으면 1. 아니면 0.
- 페이지 시계는 늘 같은 날(2026-11-11 12:00 KST)에서 시작하고(FROZEN_DATE_JS), Math.random·crypto.getRandomValues는 씨앗을 고정한다(FIXED_RANDOM_JS).
  그래서 복습 묶음·보기 순서·가게 씨앗이 판마다 같아 밝게 비교가 결정적이다.

바탕색 계산·빼는 것: 리아 판과 같음(아래 CHECK_JS 주석과 리아 tests/contrast.py 머리말).
- 조상으로 올라가며 background-color 알파 합성, 맨 아래는 Canvas 색. background-image(모눈·줄무늬)는 계산하지 않음(bgimg 표시).
- SVG <text>는 fill을 글자색으로, 앞서 그린 같은 SVG 도형 중 글자 중심을 덮는 것의 fill을 바탕으로(가게 물건 상자·간판).
- 빼는 것: 안 보임·2px 미만·화면 밖·가로로 잘림·낱자 없는 글(장식)·비활성(:disabled, aria-disabled)
- `--skip-art-text`일 때만 ART_TEXT(그림 속 장식 글자: 배지 그림 안 글자).
"""

import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "tests", "out", "contrast")
THEME_KEY = "dueogi-sql.theme"
NEED_TEXT, NEED_LARGE = 4.5, 3.0
# 그림으로 보는 글자: 배지 그림(src/ui/badges.js badgeArt) 안 <text>. 그림 색은 손대지 않으므로 어둡게 엄격 시험에서 뺀다(목록 보고).
# 가게 그림(src/ui/stallart.js)의 상자 이름·재고·간판 글자는 이름표라 빼지 않는다(설계서 §2-2 「그림과 글자의 경계」).
ART_TEXT = [".badge-art > text", ".badge-art text"]
# 밝게 기준(v0.3.3 코드로 만든 tests/fixtures/contrast-light-baseline.json) 뒤에 새로 생긴 화면 부분. 대비는 재지만 밝게 비교
# 목록(digests)에는 넣지 않는다(v0.3.3에 없던 줄이라 견줄 기준이 없음): v0.3.4 설정 「화면」 묶음
NEW_SINCE_BASELINE = [".theme-set"]

CHECK_JS = r"""(opts) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const pc = new Map();
  const parse = (s) => {
    if (pc.has(s)) return pc.get(s);
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data, v = [d[0], d[1], d[2], d[3] / 255];
    pc.set(s, v); return v;
  };
  const over = (t, b) => [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3]));
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const probe = document.createElement('i'); probe.style.backgroundColor = 'Canvas';
  document.documentElement.appendChild(probe);
  const canvas = parse(getComputedStyle(probe).backgroundColor).slice(0, 3); probe.remove();

  const ocache = new Map();
  const cum = (e) => {
    if (!e || e.nodeType !== 1) return 1;
    if (ocache.has(e)) return ocache.get(e);
    const v = (parseFloat(getComputedStyle(e).opacity) || 0) * cum(e.parentElement);
    ocache.set(e, v); return v;
  };
  const backdrop = (el) => {
    const layers = []; let bgimg = false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e), bg = parse(cs.backgroundColor), a = bg[3] * cum(e);
      if (a > 0) layers.push([bg[0], bg[1], bg[2], a]);
      if (cs.backgroundImage !== 'none' && e !== document.body && e !== document.documentElement) bgimg = true;
      if (a >= 0.999) break;
    }
    let base = canvas.slice();
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { rgb: base, bgimg };
  };
  const svgBackdrop = (el, svg) => {
    const r = el.getBoundingClientRect(), cxp = (r.left + r.right) / 2, cyp = (r.top + r.bottom) / 2;
    const res = backdrop(svg); let base = res.rgb;
    for (const s of svg.querySelectorAll('rect,path,circle,ellipse,polygon')) {
      if (!(s.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const cs = getComputedStyle(s);
      if (!cs.fill || cs.fill === 'none' || cs.fill.startsWith('url')) continue;
      const f = parse(cs.fill), a = f[3] * (parseFloat(cs.fillOpacity) || 0) * cum(s);
      if (a <= 0) continue;
      const b = s.getBoundingClientRect();
      if (cxp < b.left || cxp > b.right || cyp < b.top || cyp > b.bottom) continue;
      base = over([f[0], f[1], f[2], a], base);
    }
    return { rgb: base, bgimg: res.bgimg };
  };
  const sel = (e) => {
    let s = e.tagName.toLowerCase();
    if (e.id) return s + '#' + e.id;
    const c = [...e.classList].slice(0, 3); if (c.length) s += '.' + c.join('.');
    const p = e.parentElement;
    if (p && p !== document.body) s = (p.id ? '#' + p.id : p.classList.length ? '.' + p.classList[0] : p.tagName.toLowerCase()) + ' > ' + s;
    return s;
  };
  const vw = window.innerWidth, vh = window.innerHeight;
  const ex = { noLetterSkipped: 0, invisible: 0, tiny: 0, offscreen: 0, clippedHoriz: 0, disabledSkipped: 0, editorToken: 0, artText: 0, svgSkipped: 0 };
  const info = { ariaHiddenChecked: 0, bgimgChecked: 0 }; const digest = [];
  const fails = {}; let checked = 0, minRatio = 99;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE']);
  const word = /[\p{L}\p{N}]/u;
  for (const el of document.querySelectorAll('body, body *')) {
    if (SKIP.has(el.tagName)) continue;
    const tag = el.tagName; let text = '', input = false;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      const t = el.type;
      if (t === 'hidden' || t === 'checkbox' || t === 'radio' || t === 'file' || t === 'range' || t === 'color') continue;
      text = el.value || ''; input = true;
      if (!text && el.placeholder) text = el.placeholder;
      if (!text) text = 'x';      // 빈 입력칸도 입력할 때 쓰이는 글자색을 잰다(흰 바탕·상속된 밝은 글자 문제)
    } else if (tag === 'SELECT') {
      text = (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') || 'x';
    } else {
      for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (!word.test(text)) { ex.noLetterSkipped++; continue; }
    const ariaHid = !!el.closest('[aria-hidden="true"]');   // 글자가 보이면(낱자 있음) 장식이 아니라 측정 대상
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden]') || cum(el) < 0.01 || !el.getClientRects().length) { ex.invisible++; continue; }
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { ex.tiny++; continue; }
    let fixed = false;
    for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') { fixed = true; break; }
    const top = fixed ? r.top : r.top + window.scrollY, bot = fixed ? r.bottom : r.bottom + window.scrollY;
    if (r.right <= 0 || r.left >= vw || bot <= 0 || (fixed && top >= vh)) { ex.offscreen++; continue; }
    let clipped = false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.overflowX !== 'visible') {      // 가로로 잘린 것만 뺀다. 세로 스크롤 안(접힌 아래쪽)은 사용자가 내려서 보므로 잰다
        const b = p.getBoundingClientRect();
        if (r.right <= b.left || r.left >= b.right) { clipped = true; break; }
      }
    }
    if (clipped) { ex.clippedHoriz++; continue; }
    if (el.matches(':disabled') || el.closest('[aria-disabled="true"]')) { ex.disabledSkipped++; continue; }
    if (opts.skipEditorTokens) {
      const cm = el.closest('.cm-content');
      if (cm && !el.classList.contains('cm-line') && el !== cm) { ex.editorToken++; continue; }
    }
    if (opts.artText.length && opts.artText.some(q => el.matches(q))) { ex.artText++; continue; }
    const svg = el instanceof SVGElement ? el.closest('svg') : null;
    let fgc, bd;
    if (svg) {
      const fs = cs.fill; if (!fs || fs === 'none' || fs.startsWith('url')) { ex.svgSkipped++; continue; }
      const f = parse(fs); fgc = [f[0], f[1], f[2], f[3] * (parseFloat(cs.fillOpacity) || 0) * cum(el)];
      bd = svgBackdrop(el, svg);
    } else {
      let col = cs.color;
      if (input && !el.value && el.placeholder) col = getComputedStyle(el, '::placeholder').color;   // 빈 칸·placeholder 없음 = 입력할 글자색(자기 color)
      const f = parse(col); fgc = [f[0], f[1], f[2], f[3] * cum(el)];
      bd = backdrop(el);
    }
    const fg = over(fgc, bd.rgb);
    const size = parseFloat(cs.fontSize) || 16, weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (weight >= 700 && size >= 19);
    const need = large ? 3 : 4.5, rt = ratio(fg, bd.rgb);
    checked++; if (rt < minRatio) minRatio = rt;
    if (ariaHid) info.ariaHiddenChecked++;
    if (bd.bgimg) info.bgimgChecked++;
    if (!(opts.digestSkip || []).some(q => el.closest(q))) digest.push(sel(el) + '|' + hex(fg) + '|' + hex(bd.rgb));
    if (rt + 1e-9 >= need) continue;
    const key = sel(el) + '|' + hex(fg) + '|' + hex(bd.rgb);
    if (fails[key]) { fails[key].count++; continue; }
    fails[key] = { selector: sel(el), text: text.slice(0, 20), fg: hex(fg), bg: hex(bd.rgb), ratio: Math.round(rt * 100) / 100, need,
                   count: 1, ...(bd.bgimg ? { bgimg: true } : {}) };
  }
  return { fails: Object.values(fails), checked, minRatio: Math.round(minRatio * 100) / 100, excluded: ex, info, digest: digest.sort() };
}"""


def run_check(page, skip_editor_tokens=False, skip_art=False):
    return page.evaluate(CHECK_JS, {"skipEditorTokens": bool(skip_editor_tokens), "artText": ART_TEXT if skip_art else [],
                                    "digestSkip": NEW_SINCE_BASELINE})


# ---------------------------------------------------------------- 자기 시험

SELF_HTML = """<!doctype html><html><body style="margin:0;background:#fff;background-image:linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px);background-size:24px 24px">
<input id="a" value="흰 바탕 흰 글자" style="color:#fff;background:#fff">
<div style="background:#1B2538"><p id="b" style="color:#F1EBDD;margin:0">남색 바탕 크림 글자</p></div>
<div style="background:#1B2538"><p id="c" style="color:#222;margin:0;background:transparent">투명 바탕 위 어두운 글자</p></div>
<p id="d" style="color:#888;font-size:16px;margin:0">작은 회색 글자</p>
<p id="e" style="color:#888;font-size:26px;margin:0">큰 회색 글자</p>
<p id="f" aria-hidden="true" style="color:#fff;margin:0">보이는 글자는 aria-hidden이어도 잼</p>
<span id="f2" aria-hidden="true" style="color:#fff">★</span>
<input id="h" style="color:#fff;background:#fff">
<style>#i::placeholder{color:#fff}</style><input id="i" style="color:#22304A;background:#fff">
<p id="g" hidden style="color:#fff">숨김 빼기</p>
<svg class="badge-art" width="60" height="30"><rect width="60" height="30" fill="#E4DCCB"/><text x="4" y="20" fill="#9A8F78">1장</text></svg>
</body></html>"""

# 기대: 미달은 a(입력, 흰/흰), h(빈 입력칸 흰/흰), c(남색 위 #222), d(작은 회색 3.54:1), f(aria-hidden이지만 글자가 보임). 낱자 없는 ★ 장식·hidden은 뺌
# i: 빈 입력칸(placeholder 없음)은 ::placeholder 색(흰)이 아니라 입력칸 자기 글자색(남색)으로 잰다 → 통과
#    (Chromium의 getComputedStyle(el,'::placeholder')는 자기 color를 돌려줘 고치기 전에도 통과한다 — 다른 엔진 대비 규칙 고정용)
SELF_EXPECT_FAIL = {"input#a", "p#c", "p#d", "p#f", "input#h", ".badge-art > text"}   # 배지 글자는 --skip-art-text일 때만 빠짐


def self_test():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        try:
            page = b.new_page()
            page.set_content(SELF_HTML)
            res = run_check(page)
            art = run_check(page, skip_art=True)
        finally:
            b.close()
    got = {f["selector"] for f in res["fails"]}
    problems = []
    if got != SELF_EXPECT_FAIL:
        problems.append("fails %r != expected %r" % (sorted(got), sorted(SELF_EXPECT_FAIL)))
    if res["excluded"]["noLetterSkipped"] != 1 or res["excluded"]["invisible"] != 1 or res["info"]["ariaHiddenChecked"] != 1:
        problems.append("excluded counts wrong: %r" % res["excluded"])
    got_art = {f["selector"] for f in art["fails"]}
    if got_art != SELF_EXPECT_FAIL - {".badge-art > text"} or art["excluded"]["artText"] != 1:
        problems.append("skip_art: fails %r, artText %r" % (sorted(got_art), art["excluded"]["artText"]))
    first = next((f for f in res["fails"] if f["selector"] == "input#a"), None)
    if not first or first["ratio"] != 1.0 or first["need"] != 4.5:
        problems.append("input#a entry wrong: %r" % first)
    if problems:
        raise AssertionError("; ".join(problems) + "\n" + json.dumps(res, ensure_ascii=False, indent=1))
    return res


def test_contrast_self_test():
    """흰 바탕 흰 글자만 미달, 남색 바탕 크림 글자는 통과(조상 합성·큰 글씨·장식·숨김 빼기 포함)"""
    self_test()


# ---------------------------------------------------------------- 화면 순회

class Runner:
    def __init__(self, theme, skip_art=False):
        self.theme = theme
        self.skip_art = skip_art
        self.dir = os.path.join(OUT, theme)
        os.makedirs(self.dir, exist_ok=True)
        self.screens = []     # [{screen, checked, minRatio, fails, excluded, theme_applied}]
        self.errors = []      # 화면을 못 연 오류
        self.seen = set()

    def cap(self, a, name):
        if name in self.seen:
            return
        self.seen.add(name)
        a.page.wait_for_timeout(150)
        settle(a)
        applied = a.js("() => document.documentElement.dataset.theme || null")
        res = run_check(a.page, False, self.skip_art)
        a.page.screenshot(path=os.path.join(self.dir, name + ".png"), animations="disabled", caret="hide")
        for f in res["fails"]:
            f["screen"] = name
        res.update(screen=name, theme_applied=applied)
        self.screens.append(res)
        print("  %-24s checked %3d  fails %2d  min %5.2f  theme=%s" % (name, res["checked"], len(res["fails"]), res["minRatio"], applied), flush=True)

    def scenario(self, label, fn):
        t0 = time.time()
        print("[%s]" % label, flush=True)
        try:
            fn()
        except Exception as e:  # 한 시나리오가 깨져도 나머지는 계속
            self.errors.append({"scenario": label, "error": "%s: %s" % (type(e).__name__, str(e)[:300])})
            print("  ERROR %s: %s" % (type(e).__name__, str(e)[:300]), flush=True)
        print("  (%.1fs)" % (time.time() - t0), flush=True)


def settle(a):
    """창이 올라오는 움직임 등 유한한 애니메이션이 끝날 때까지(무한 반복은 그대로)"""
    try:
        a.page.wait_for_function("() => document.getAnimations().every((x) => x.playState !== 'running' || x.effect?.getTiming().iterations === Infinity)",
                                 timeout=3000)
    except Exception:  # noqa: BLE001 — 끝나지 않는 움직임이 있어도 재기는 한다
        pass


# 화면 내용이 요일·날짜에 따라 달라지면(퀘스트·매일 도전 문제 고르기·연속 기록) 밝게 색 비교가 날마다 다르게 나온다.
# 페이지 시계를 늘 같은 날(수요일 2026-11-11 12:00 KST)에서 시작하게 하고, 흐르는 시간은 그대로 둔다. 인자를 준 new Date(...)는 그대로.
FROZEN_DATE_JS = ("(function(){var D=Date,b=D.now(),F=D.parse('2026-11-11T12:00:00+09:00');"
                  "function now(){return F+(D.now()-b);}"
                  "function FD(){var a=Array.prototype.slice.call(arguments);"
                  "if(!(this instanceof FD))return new D(now()).toString();"
                  "return a.length?new(Function.prototype.bind.apply(D,[null].concat(a)))():new D(now());}"
                  "FD.prototype=D.prototype;FD.now=now;FD.parse=D.parse;FD.UTC=D.UTC;window.Date=FD;})();")
# 복습 묶음·보기 순서·카드 더미 섞기도 늘 같게(밝게 비교가 판마다 다른 문제를 보지 않게): 씨앗을 고정한 Math.random(mulberry32)
FIXED_RANDOM_JS = ("(function(){var a=20261118;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;"
                   "var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};"
                   # 가게 씨앗(src/ui/stall.js newSeed)도: 같은 장사·재고가 나오게
                   "try{var C=window.crypto;C.getRandomValues=function(x){for(var i=0;i<x.length;i++)x[i]=Math.floor(Math.random()*4294967296);return x;};}catch(e){}"
                   "})();")


def _app(r, save=None, real=False, dev=False, **kw):
    import flow
    init = FROZEN_DATE_JS + FIXED_RANDOM_JS + "try{localStorage.setItem(%s,%s)}catch(e){}" % (json.dumps(THEME_KEY), json.dumps(r.theme))
    if dev:
        init += "try{localStorage.setItem('dueogi-sql.dev','1')}catch(e){}"
    return flow.App("iPhone 17", save=save, url=flow.real_url() if real else None, init_js=init, **kw)


def _seed(**extra):
    s = {"saveVer": 1, "tutorial": "done", "settings": {"sound": False, "dailyGoal": 20, "name": ""}}
    s.update(extra)
    return s


def _quit_lesson(a):
    a.page.click("#quit")
    a.page.wait_for_timeout(300)
    if a.page.query_selector(".modal"):
        a.page.click(".modal .btn.ghost")
    a.page.wait_for_selector(".screen.home")


def sc_fresh(r):
    """새 저장(시험용 레슨 빌드): 인사 → 튜토리얼 4장(틀린 차례 안내·결과 표) → 홈 → 1-1(카드·고르기·틀림·조립 힌트·실행 표·오류·비교·맞음) → 완료"""
    import flow
    with _app(r) as a:
        r.cap(a, "splash")
        flow._tut_open(a)
        for k in range(1, 4):
            a.page.wait_for_selector(".tut-dots span:nth-child(%d).on" % k)
            r.cap(a, "tutorial-%d" % k)
            a.page.click("#tut-next")
        a.page.wait_for_selector(".tut-card.last #tut-bank button.bcard")
        r.cap(a, "tutorial-4")
        bank = flow._tut_bank(a)
        for t in bank[:2]:
            flow._tut_tap(a, t)
        flow._tut_run(a)
        r.cap(a, "tutorial-4-short")
        for t in bank[2:]:
            flow._tut_tap(a, t)
        flow._tut_run(a)
        r.cap(a, "tutorial-4-wrong")
        a.page.click("#tut-answer")
        flow._tut_run(a)
        a.page.wait_for_selector("#tut-out .rtable")
        r.cap(a, "tutorial-4-pass")
        a.page.click("#tut-home")
        a.page.wait_for_selector("#app[data-screen=home] .screen.home")
        a.page.wait_for_timeout(200)
        a.dismiss()
        r.cap(a, "home-new")
        a.page.click("#continue")
        a.page.wait_for_selector(".screen.lesson")
        items = a.lesson("1-1")["items"]
        build = next(x for x in items if x["type"] == "build")
        wrong_done = False
        for _ in range(40):
            a.page.wait_for_timeout(80)
            if a.page.query_selector(".screen.done"):
                break
            if a.page.query_selector(".card-view"):
                r.cap(a, "lesson-card")
                a.page.click("#act")
                continue
            if not a.page.query_selector("article.item"):
                continue
            if a.page.query_selector(".item.build #bbank"):
                a.page.wait_for_selector("#bbank button.bcard")
                a.wait_engine()
                r.cap(a, "build")
                a.page.click("#hint")
                a.page.click("#hint")
                r.cap(a, "build-hints")
                wrong = ["SELECT", "name", ",", "price", "FROM", "items", "WHERE", "price", "<", "200"]
                a.place(wrong)
                a.build_press("run")
                a.page.wait_for_selector("#console .rtable")
                r.cap(a, "build-run-table")
                a.place(["SELECT", "name", ",", "price", "FROM", "customers"])
                a.build_press("run")
                a.page.wait_for_selector("#console .err-panel")
                r.cap(a, "build-error")
                a.place(wrong)
                a.build_press("submit")
                a.page.wait_for_selector("#console .cmp")
                a.page.wait_for_timeout(250)
                r.cap(a, "build-compare")
                a.page.click("#sol")
                a.page.wait_for_selector("#solution:not([hidden])")
                r.cap(a, "build-solution")
                a.solve_build(build)
                r.cap(a, "result-right")
                a.cont()
                continue
            idx = a.which_item(items)
            it = items[idx]
            r.cap(a, "item-" + it["type"])
            if not wrong_done:
                wrong_done = True
                a.answer_touch(it, correct=False)
                a.page.wait_for_selector("#result:not([hidden])")
                r.cap(a, "result-wrong")
            else:
                a.answer_touch(it)
                a.page.wait_for_selector("#result:not([hidden])")
            a.cont()
        a.page.wait_for_selector(".screen.done", timeout=10_000)
        a.page.wait_for_timeout(300)
        r.cap(a, "done")


def sc_cards(r):
    """1-1을 끝낸 저장(시험용 레슨 빌드): 1-2 SQL 카드 결과 표·결과 표 보기·「쓸 표 보기」 시트"""
    with _app(r, save=_seed(completed_lessons=["1-1"], current_lesson="1-2")) as a:
        a.start()
        a.page.click("#continue")
        a.page.wait_for_selector(".card-view .sql-result .rtable", timeout=60_000)
        r.cap(a, "lesson-card-sql")
        a.page.click("#act")
        a.page.wait_for_function("() => document.querySelectorAll('.card-view tbody tr').length > 5", timeout=20_000)
        a.page.click("#act")
        a.page.wait_for_function("() => document.querySelectorAll('.opt .rtable').length === 3", timeout=20_000)
        r.cap(a, "item-choice-tables")
        a.page.click('.opt[data-sql="SELECT name FROM shops ORDER BY shop_id LIMIT 3"]')
        r.cap(a, "item-choice-picked")
        a.page.click("#tablesbtn")
        a.page.wait_for_selector(".tables-sheet .tbl-sec")
        a.page.wait_for_function("() => document.querySelectorAll('.tables-sheet .sql-result[data-filled]').length >= 2", timeout=30_000)
        r.cap(a, "tables-sheet")


def sc_real_lesson(r):
    """실제 1-3(빈칸·순서·확인 문제가 있음): 처음 나오는 문제 종류마다, 틀린 빈칸 결과"""
    with _app(r, save=_seed(completed_lessons=["1-1", "1-2"], current_lesson="1-3", current_chapter=1), real=True) as a:
        a.start()
        a.page.click("#continue")
        a.page.wait_for_selector(".screen.lesson")
        items = a.lesson("1-3")["items"]
        wrong = set()
        for _ in range(60):
            a.page.wait_for_timeout(80)
            if a.page.query_selector(".screen.done"):
                break
            if a.page.query_selector(".card-view"):
                r.cap(a, "real-card")
                a.page.click("#act")
                continue
            if not a.page.query_selector("article.item"):
                continue
            if a.page.query_selector(".item.build #bbank"):
                a.page.wait_for_selector("#bbank button.bcard")
                a.solve_build(next(x for x in items if x["type"] == "build"))
                a.cont()
                continue
            idx = a.which_item(items)
            it = items[idx]
            r.cap(a, "real-item-" + it["type"])
            if it["type"] in ("blank", "order") and it["type"] not in wrong:
                wrong.add(it["type"])
                a.answer_touch(it, correct=False)
                a.page.wait_for_selector("#result:not([hidden])")
                r.cap(a, "real-result-wrong-" + it["type"])
            else:
                a.answer_touch(it)
                a.page.wait_for_selector("#result:not([hidden])")
            a.cont()
        a.page.wait_for_selector(".screen.done", timeout=10_000)
        a.page.wait_for_timeout(300)
        a.dismiss()
        r.cap(a, "real-done")


def sc_tabs(r):
    """1장(평가 포함)을 끝낸 저장(실제 레슨): 홈 심화 갈래·매일 도전·복습, 배지, 의상실, 설정(학습 내용 펼침·설치 안내·확인 창)"""
    import flow
    seed = flow._seed_through(1)
    seed.update(tutorial="done", review_queue=["select", "where"], badges=["first_query", "streak7"],
                settings={"sound": False, "dailyGoal": 20, "name": "지민"})
    with _app(r, save=seed, real=True) as a:
        a.start()
        r.cap(a, "home-advanced")
        a.page.click("#review")
        a.page.wait_for_selector("article.item", timeout=60_000)
        r.cap(a, "review-item")
        _quit_lesson(a)
        a.page.click("#daily")
        a.page.wait_for_selector("article.item", timeout=60_000)
        a.page.wait_for_timeout(500)
        r.cap(a, "daily-item")
        _quit_lesson(a)
        for name in ("badges", "closet", "settings"):
            flow._go_tab(a, name)
            r.cap(a, name)
        a.page.click(".ch-row")
        r.cap(a, "settings-course-open")
        a.page.click("#install")
        a.page.wait_for_selector(".modal.install")
        r.cap(a, "install-sheet")
        a.page.click("#ins-ok")
        a.page.wait_for_selector(".modal.install", state="detached")
        a.page.locator("#dev").scroll_into_view_if_needed()
        a.page.click("#dev")
        a.page.wait_for_selector(".modal")
        r.cap(a, "confirm-modal")
        a.page.click(".modal .btn.ghost")
        a.page.wait_for_selector(".modal", state="detached")


def sc_stall_locked(r):
    """3장 평가 전: 가게 칸 자물쇠 + 눌렀을 때 알림"""
    import flow
    s = flow._stall_seed(False)
    s["tutorial"] = "done"
    with _app(r, save=s, real=True) as a:
        a.start()
        a.page.click('.tabbar [data-go="stall"]', force=True)
        a.page.wait_for_selector("#toasts .toast")
        r.cap(a, "stall-locked-toast")


def sc_stall(r):
    """3장 통과(실제 레슨): 홈 가게 점 → 가게 처음 열기(말풍선·잠긴 칸) → 장 열기 재생 → 정산·의뢰·어제 장부 → 장부 시트
    → 칸 편집기(열기·시험 실행·비우기 확인·되돌리기 알림)"""
    import flow
    with _app(r, save=flow._reentry_seed(), real=True) as a:
        a.start()
        r.cap(a, "home-stall-dot")
        flow._to_stall(a)
        r.cap(a, "stall-first")
        a.page.click("#open-day")
        a.page.wait_for_selector(".replay .replay-log li", timeout=30_000)
        a.page.wait_for_selector(".stall-svg .cust.in", timeout=10_000)
        a.page.wait_for_timeout(400)
        r.cap(a, "stall-replay")
        a.page.click("#skip")
        a.page.wait_for_selector(".settle")
        a.page.wait_for_timeout(300)
        r.cap(a, "stall-settle")
        a.page.click("#stall-tables")
        a.page.wait_for_function("() => document.querySelectorAll('.tables-sheet .sql-result[data-filled]').length === 4", timeout=30_000)
        r.cap(a, "stall-tables")
        a.page.keyboard.press("Escape")
        a.page.wait_for_selector(".modal-back", state="detached")
        flow._to_editor(a, "restock")
        r.cap(a, "slot-editor")
        a.page.click("#sp-test")
        a.page.wait_for_selector(".sp-result .rtable", timeout=30_000)
        a.page.wait_for_timeout(200)
        r.cap(a, "slot-tested")
        a.page.click("#sp-clear")
        a.page.wait_for_selector(".modal")
        r.cap(a, "slot-clear-confirm")
        a.page.click(".modal .btn.coral")
        a.page.wait_for_selector(".modal", state="detached")
        a.page.wait_for_selector(".toast-act")
        r.cap(a, "slot-clear-toast")


def sc_stall7(r):
    """7장 통과: 칸 편집기 전체 조립, 오류 SQL 안내"""
    import flow
    restock = {"on": True, "mode": "frame", "parts": {"where": [{"c": "col_stock"}, {"c": "op_lt"}, {"c": "num", "n": 4}]}}
    seed = flow._seed_through(7, {"v": 1, "seed": 7, "opened": True, "slots": {"restock": restock}})
    seed["tutorial"] = "done"
    with _app(r, save=seed, real=True) as a:
        a.start()
        flow._to_stall(a)
        r.cap(a, "stall-ch7")
        flow._to_editor(a, "restock")
        a.page.click("#sp-mode")
        a.page.wait_for_selector(".sp-part[data-part='full']")
        r.cap(a, "slot-full")
        a.page.click("#sp-close")
        a.page.wait_for_timeout(300)
        if a.page.query_selector(".modal"):
            a.page.click(".modal .btn.coral")
        a.page.wait_for_selector(".screen.stall")
        flow._to_editor(a, "discount")
        for t in ("price", "<", "AND"):
            a.page.click(".sp-picker button.bcard[data-text='%s']" % t)
        a.page.click("#sp-test")
        a.page.wait_for_selector(".sp-result .err-panel", timeout=30_000)
        a.page.wait_for_timeout(200)
        r.cap(a, "slot-error")


def sc_dev(r):
    """개발자 모드 띠: 홈·가게"""
    import flow
    with _app(r, save=_seed(completed_lessons=["1-1"]), real=True, dev=True) as a:
        a.start()
        r.cap(a, "dev-home")
        flow._to_stall(a)
        r.cap(a, "dev-stall")


def run_app(theme, skip_art=False):
    import flow
    flow.env()
    r = Runner(theme, skip_art)
    r.scenario("새 저장: 인사·튜토리얼·홈·레슨 1-1(조립)", lambda: sc_fresh(r))
    r.scenario("1-1 끝: SQL 카드·결과 표 보기·쓸 표 보기", lambda: sc_cards(r))
    r.scenario("실제 1-3: 빈칸·순서·확인", lambda: sc_real_lesson(r))
    r.scenario("1장 통과: 홈 심화·복습·매일 도전·배지·의상실·설정", lambda: sc_tabs(r))
    r.scenario("가게 잠김", lambda: sc_stall_locked(r))
    r.scenario("3장 통과: 가게·칸 편집기", lambda: sc_stall(r))
    r.scenario("7장 통과: 전체 조립·오류", lambda: sc_stall7(r))
    r.scenario("개발자 모드 띠", lambda: sc_dev(r))
    return r


def summarize(r, theme, secs, skip_art=False):
    fails = [f for s in r.screens for f in s["fails"]]
    info, ex = {}, {}
    for s in r.screens:
        for k, v in s["info"].items():
            info[k] = info.get(k, 0) + v
        for k, v in s["excluded"].items():
            ex[k] = ex.get(k, 0) + v
    return {"theme": theme, "skip_art_text": ART_TEXT if skip_art else [], "seconds": round(secs, 1),
            "screens": [{k: s[k] for k in ("screen", "checked", "minRatio", "theme_applied")} | {"fails": len(s["fails"])} for s in r.screens],
            "checked": sum(s["checked"] for s in r.screens), "fail_count": len(fails),
            "fail_elements": sum(f["count"] for f in fails), "excluded": ex, "info": info, "errors": r.errors, "failures": fails,
            "digests": {s["screen"]: s["digest"] for s in r.screens}}


def compare(base_path, rep):
    """기준 JSON의 화면별 (선택자|글자색|바탕색) 목록과 지금 것을 견줌. 다른 줄을 돌려준다(없으면 []).
    같은 줄이 몇 번 나오는지는 보지 않는다. 색이 바뀌거나 새 색 조합이 생기면 차이로 잡는다."""
    with open(base_path, encoding="utf-8") as f:
        base = json.load(f)["digests"]
    diffs = []
    for name, old in base.items():
        new = rep["digests"].get(name)
        if new is None:
            diffs.append("%s: screen missing" % name)
            continue
        co, cn = set(old), set(new)
        for k in sorted(co - cn):
            diffs.append("%s: - %s" % (name, k))
        for k in sorted(cn - co):
            diffs.append("%s: + %s" % (name, k))
    return diffs


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--theme", choices=["light", "dark"], default="dark")
    ap.add_argument("--write", "--report", dest="write", metavar="FILE", help="결과 JSON 경로(밝게 기준 만들기에도 씀)")
    ap.add_argument("--strict", action="store_true", help="미달이 있으면 종료 코드 1")
    ap.add_argument("--skip-art-text", action="store_true", help="그림 속 장식 글자(ART_TEXT)를 뺌")
    ap.add_argument("--compare", metavar="BASELINE.json", help="기준 JSON과 화면별 글자색·바탕색이 하나라도 다르면 종료 코드 1")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    sys.path.insert(0, HERE)
    if args.self_test:
        res = self_test()
        print("self-test OK: fails=%s checked=%d" % (sorted(f["selector"] for f in res["fails"]), res["checked"]))
        return 0
    t0 = time.time()
    r = run_app(args.theme, args.skip_art_text)
    rep = summarize(r, args.theme, time.time() - t0, args.skip_art_text)
    if args.write:
        os.makedirs(os.path.dirname(os.path.abspath(args.write)), exist_ok=True)
        with open(args.write, "w", encoding="utf-8") as f:
            json.dump(rep, f, ensure_ascii=False, indent=1)
    print("\n%s: %d screens, %d elements checked, %d failing groups (%d elements), %d scenario errors, %.0fs"
          % (args.theme, len(rep["screens"]), rep["checked"], rep["fail_count"], rep["fail_elements"], len(rep["errors"]), rep["seconds"]))
    if args.skip_art_text:
        print("excluded art text (ART_TEXT %s): %d elements" % (ART_TEXT, rep["excluded"].get("artText", 0)))
    for e in rep["errors"]:
        print("  ERROR %s: %s" % (e["scenario"], e["error"]))
    for f in sorted(rep["failures"], key=lambda f: f["ratio"])[:40]:
        print("  %-22s %-44s %s on %s  %.2f<%.1f  %r" % (f["screen"], f["selector"][:44], f["fg"], f["bg"], f["ratio"], f["need"], f["text"]))
    if args.compare:
        diffs = compare(args.compare, rep)
        print("compare vs %s: %d differences" % (args.compare, len(diffs)))
        for d in diffs[:60]:
            print("  " + d)
        if diffs or rep["errors"]:
            return 1
    return 1 if args.strict and (rep["fail_count"] or rep["errors"]) else 0


if __name__ == "__main__":
    sys.exit(main())
