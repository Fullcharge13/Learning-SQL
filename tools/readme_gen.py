#!/usr/bin/env python3
"""README.md를 게임 데이터에서 자동으로 만든다 (계획 작업 17, 리아 v0.9의 같은 도구를 SQL용으로 다시 씀).

    python3 tools/readme_gen.py           # README.md를 새로 씀
    python3 tools/readme_gen.py --check   # README.md가 데이터와 어긋나면 실패(종료 코드 1)

읽는 것 (node로 ES 모듈을 불러 JSON으로 꺼냄)
- data/lessons/chN.js    레슨 표(LESSONS) + 매일 도전 문제 틀(TEMPLATES) + 심화(ADVANCED, v0.1에는 없음)
- data/concepts.js       개념 이름
- data/quests.js         일일 퀘스트
- data/badges.js         배지
- data/outfits.js        의상(가격·얻는 법)
- data/schema.js         장터 표·열의 한글 뜻
- data/market.sql        장터 데이터(표마다 행 수를 파이썬 sqlite3로 셈)
- src/dueogi.js          의상·표정 한국어 이름(그림 시트 설명)
- src/app.js             게임 안 버전 표시(VERSION)
- src/rules.js·src/daily.js·src/quests.js·src/advanced.js  보상 수치
- build.py               크기 상한
- node_modules/sql.js    SQL 실행기(sql.js) 판 번호
- docs/lore-sources.md   고증 출처 표(확인한 항목 줄만)

README.md는 손으로 고치지 않는다. 문장을 바꾸려면 이 파일을 고치고 다시 실행한다.
"""
import json
import os
import re
import sqlite3
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
README = os.path.join(ROOT, "README.md")

APP_URL = "https://fullcharge13.github.io/Learning-SQL/"  # GitHub Pages 배포 주소(저장소 설정에서 켬)
REPO_URL = "https://github.com/Fullcharge13/Learning-SQL"
RIA_URL = "https://github.com/Fullcharge13/Learning-Python"

NODE_SCRIPT = r"""
const root = process.argv[1];
const imp = (p) => import(new URL(p, root));
const chapters = [];
const fs = await import("node:fs");
const nums = fs.readdirSync(new URL("data/lessons/", root))
  .map((f) => /^ch(\d+)\.js$/.exec(f)).filter(Boolean).map((m) => +m[1]).sort((a, b) => a - b);
for (const n of nums) {
  const m = await imp("data/lessons/ch" + n + ".js");
  chapters.push({ chapter: m.CHAPTER, lessons: m.LESSONS, advanced: Array.isArray(m.ADVANCED) ? m.ADVANCED : [], templates: Array.isArray(m.TEMPLATES) ? m.TEMPLATES : [] });
}
const { CONCEPTS } = await imp("data/concepts.js");
const { QUESTS } = await imp("data/quests.js");
const { BADGES } = await imp("data/badges.js");
const { OUTFITS } = await imp("data/outfits.js");
const { SCHEMA } = await imp("data/schema.js");
const dueogi = await imp("src/dueogi.js");
const rules = await imp("src/rules.js");
const daily = await imp("src/daily.js");
const quests = await imp("src/quests.js");
const adv = await imp("src/advanced.js");
console.log(JSON.stringify({ chapters, CONCEPTS, QUESTS, BADGES, OUTFITS, SCHEMA,
  outfitKo: dueogi.OUTFIT_KO, faceKo: dueogi.FACE_KO, faces: dueogi.FACE_IDS,
  nums: { freezePrice: rules.FREEZE_PRICE, freezeMax: rules.FREEZE_MAX, milestones: rules.MILESTONES, dailyGoals: rules.DAILY_GOALS,
    dailyXp: daily.DAILY_XP, dailyYeopjeon: daily.DAILY_YEOPJEON, dailyBonusEvery: daily.DAILY_BONUS_EVERY,
    dailyBonusYeopjeon: daily.DAILY_BONUS_YEOPJEON, dailyTouch: daily.DAILY_TOUCH, chest: quests.CHEST_BYTES,
    advXp: adv.ADV_XP, advYeopjeon: adv.ADV_YEOPJEON,
    reward: rules.lessonReward({ firstTime: true, perfect: false }), rewardPerfect: rules.lessonReward({ firstTime: true, perfect: true }),
    rewardExam: rules.lessonReward({ firstTime: true, isExam: true }), replay: rules.lessonReward({ firstTime: false }),
    replayExam: rules.lessonReward({ firstTime: false, isExam: true }), review: rules.reviewReward() } }));
"""

TYPE_KO = {"choice": "객관식", "blank": "빈자리", "order": "순서", "build": "카드 조립", "check": "이해도 확인"}

UNLOCK_KO = {"start": "처음부터 입고 있음", "streak30": "30일 연속 기록 보상 (판매 안 함)"}


def load_data():
    root_url = "file://" + ROOT.rstrip("/") + "/"
    out = subprocess.run(["node", "--input-type=module", "-e", NODE_SCRIPT, root_url],
                         check=True, capture_output=True, text=True, cwd=ROOT)
    d = json.loads(out.stdout)
    d["market_rows"] = market_rows(d["SCHEMA"])
    d["lore"] = lore_rows()
    return d


def market_rows(schema):
    """data/market.sql을 메모리 데이터베이스에 넣고 표마다 행 수를 센다."""
    con = sqlite3.connect(":memory:")
    try:
        with open(os.path.join(ROOT, "data", "market.sql"), encoding="utf-8") as f:
            con.executescript(f.read())
        return {t: con.execute('SELECT COUNT(*) FROM "%s"' % t).fetchone()[0] for t in schema}
    finally:
        con.close()


def lore_rows():
    """docs/lore-sources.md 「확인한 것」 표의 줄: (항목, 사전, 주소, 확인한 날)."""
    with open(os.path.join(ROOT, "docs", "lore-sources.md"), encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"## 확인한 것\n(.*?)\n## ", text, re.S)
    if not m:
        raise SystemExit("readme_gen: docs/lore-sources.md에 「## 확인한 것」 표가 없음")
    rows = []
    for line in m.group(1).splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 6 and cells[0].isdigit():
            rows.append({"item": cells[1], "dict": cells[2], "url": cells[3], "date": cells[5]})
    if not rows:
        raise SystemExit("readme_gen: docs/lore-sources.md 「확인한 것」 표가 비었음")
    return rows


def read_const(path, pattern):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        m = re.search(pattern, f.read())
    if not m:
        raise SystemExit(f"readme_gen: {path}에서 {pattern!r}를 찾지 못함")
    return m.group(1)


def cell(text):
    """표 칸 안에서 줄바꿈과 | 를 안전하게 바꾼다."""
    text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return text.replace("\n", " / ").replace("|", "\\|").strip()


def code_cell(sql):
    """카드 목록을 한 줄 SQL로 보여 준다(표 칸 안 `코드`)."""
    return "`" + " ".join(sql).replace("`", "'").replace("|", "\\|") + "`"


def build(d):
    version = read_const("src/app.js", r'export const VERSION = "([^"]+)"')
    sqljs = read_const("node_modules/sql.js/package.json", r'"version": "([^"]+)"')
    max_kb = int(read_const("build.py", r"MAX_RAW = (\d+) \* 1024"))
    concept_name = {c["id"]: c["name"] for c in d["CONCEPTS"]}
    nums = d["nums"]

    lessons = [l for ch in d["chapters"] for l in ch["lessons"]]
    adv = [l for ch in d["chapters"] for l in ch.get("advanced", [])]
    n_ch = len(d["chapters"])
    n_lessons = len(lessons)
    n_adv = len(adv)
    n_badges = len(d["BADGES"])
    n_outfits = len(d["OUTFITS"])
    n_quests = len(d["QUESTS"])
    n_items = sum(len(l["items"]) for l in lessons + adv)
    n_build = sum(1 for l in lessons + adv for i in l["items"] if i["type"] == "build")
    n_tmpl = sum(len(ch.get("templates") or []) for ch in d["chapters"])

    L = []
    w = L.append
    w("<!-- 이 파일은 tools/readme_gen.py가 data/ 표에서 자동으로 만든다. 손으로 고치지 말 것. -->")
    w(f"# 두억이와 SQL! {version}")
    w("")
    first, last = d["chapters"][0]["chapter"], d["chapters"][-1]["chapter"]
    w(f"도깨비 장터의 장부 담당 **두억이**와 하루 5~10분, 휴대폰 브라우저에서 SQL을 「{first['title']}」부터 "
      f"「{last['title']}」까지 익히는 듀오링고식 학습 웹앱이에요. **타자를 치지 않아요.** 모든 문제는 터치와 "
      "SQL 카드 조립으로 풀고, 조립한 SQL은 브라우저 안에서 실제로 실행해 결과 표를 정답 표와 비교해 채점해요.")
    w("")
    w(f"**▶ [앱 바로 열기]({APP_URL})** — 저장소 설정에서 GitHub Pages를 켜면 이 주소로 열려요. "
      "아이폰은 사파리로 연 뒤 공유 → 「홈 화면에 추가」하면 앱처럼 쓰고 오프라인에서도 돼요.")
    w("")
    w("> 이 저장소는 앱의 **소스 코드**예요. 공부는 위 링크의 앱에서 하고, 아래 「실행 방법」은 앱을 고치거나 다시 만들 때 써요.")
    w("")
    w('<p align="center">'
      '<img src="docs/img/screen-card.png" alt="설명 카드: 두억이 설명과 SQL, 열 이름 한글 뜻이 붙은 실행 결과 표" width="220"> '
      '<img src="docs/img/screen-build.png" alt="카드 조립 문제: SQL 카드를 눌러 SELECT * FROM shops를 만들고 통과" width="220"> '
      '<img src="docs/img/screen-done.png" alt="레슨 완료 화면: 얻은 XP·엽전과 두억이" width="220"></p>')
    w("")
    w("**배우는 것** — " + " · ".join(f"{c['chapter']['id']}장 {c['chapter']['title']}" for c in d["chapters"]))
    w("")
    w(f"- 판: **{version}** (게임 안 버전 표시, `LOG.md`의 판 번호와 같음)")
    adv_part = f"심화 레슨 {n_adv}개 · " if n_adv else ""
    w(f"- 내용: {n_ch}장 · 레슨 {n_lessons}개 · {adv_part}문제 {n_items}개(그중 카드 조립 {n_build}개) · "
      f"매일 도전 문제 틀 {n_tmpl}개 · 일일 퀘스트 {n_quests}종 · 배지 {n_badges}개 · 두억이 의상 {n_outfits}벌 · 표정 {len(d['faces'])}가지")
    w("- 서버 없음: SQL 실행은 브라우저 안의 **sql.js**(브라우저에서 돌아가는 SQLite) "
      f"`{sqljs}`이 화면 뒤 작업자(Web Worker)에서 맡고, 진도는 휴대폰 안(`localStorage`, 브라우저 저장 칸 `dueogi-sql-save`)에 저장돼요.")
    w("- 실행기는 `SELECT` 또는 `WITH`로 시작하는 문장 하나만 실행해요(조회 전용). 데이터를 바꾸는 SQL(`INSERT`·`UPDATE`·`DELETE`·`CREATE TABLE`)은 이 판에서 다루지 않아요.")
    w("- 이 앱은 듀오링고의 학습 방식(연속 기록, 짧은 레슨, 퀘스트)만 참고했고, 듀오링고의 이름·로고·캐릭터는 쓰지 않아요.")
    w("")

    # ---- 실행 방법
    w("## 실행 방법")
    w("")
    w("처음 한 번은 `npm install`로 개발 도구(esbuild 묶음 도구)와 SQL 실행기(sql.js)를 받아요.")
    w("")
    w("| 하고 싶은 일 | 명령 | 설명 |")
    w("|---|---|---|")
    w("| 개발하면서 열어 보기 | `python3 tools/dev.py` | 코드를 묶어 `http://127.0.0.1:8765/dev/`로 열어 줘요 |")
    w(f"| 배포 파일 만들기 | `python3 build.py` | `dist/`에 `index.html`(앱과 레슨 목록) + `lessons/`(장마다 문제 파일) + `worker.js`(SQL 작업자) + "
      f"`sql-wasm.wasm`(SQLite) + `manifest.webmanifest` + `sw.js` + `licenses.txt` + 아이콘. 이 폴더를 그대로 웹에 올리면 돼요 "
      f"(첫 HTML {max_kb}KB 이하) |")
    w("| 장터 데이터 다시 만들기 | `node tools/gen_market.js` | `data/market.sql` (고정 씨앗이라 몇 번을 돌려도 같은 파일) |")
    w("| README 다시 만들기 | `python3 tools/readme_gen.py` | 데이터 표를 바꾼 뒤 실행. `--check`는 어긋남만 검사 |")
    w("| 두억이 그림 시트 다시 뽑기 | `python3 tools/dueogi_sheet.py` | `docs/img/dueogi-sheet.png` |")
    w("| README 첫머리 화면 캡처 바꾸기 | `python3 tests/flow.py` 뒤 `python3 tools/readme_shots.py` | `docs/img/screen-card.png`, `screen-build.png`, `screen-done.png` |")
    w("")
    w("**시험 (확인 도구)**")
    w("")
    w("| 명령 | 확인하는 것 |")
    w("|---|---|")
    w("| `npm test` | 규칙 단위 시험: 저장·옛 저장 옮기기·가져오기, 연속 기록 날짜 계산, XP·엽전, 퀘스트·배지·상점, 매일 도전, "
      "채점(결과 표 비교), 장터 데이터 무늬, SQL 실행기, 대사, 그림 |")
    w(f"| `node tests/content.js --full {n_ch}` | 레슨 {n_lessons}개 전체 점검: 카드 조립 정답이 실행되고, 카드 하나를 빼거나 헷갈림 카드로 "
      "바꾸면 오답이 되는지, 카드 12장 이하, 결과 표가 실제 실행 결과와 같은지, 그 장까지 배운 낱말만 쓰는지, 힌트·요약 형식 |")
    w("| `python3 tests/engine_browser.py` | 실제 브라우저(Chromium) 안 sql.js 작업자: 시작, 실행, 3초 시간 초과 뒤 재시작, 오프라인 |")
    w("| `python3 tests/build_test.py` | 배포 파일: 크기 상한, 버전 표시, 장 파일, 서비스 작업자 저장본, 오프라인 열기, 라이선스 고지 |")
    w("| `python3 tests/flow.py` | 아이폰 17·17e·17 Pro Max·PC 크기 화면 순회: 넘침·콘솔 오류·터치 크기·카드 조립으로 첫 레슨 끝까지·장 평가·옛 저장 |")
    w("| `node tests/sim/economy.js` | 가상 학습자 30일 × 12판 엽전 경제 시뮬레이션(중앙값 표). `--daily`는 매일 도전까지 하는 학습자 |")
    w("| `python3 -m pytest tests/py -q` | 이 README 생성기 |")
    w("")
    w("시험 중 브라우저를 쓰는 것은 Playwright(브라우저를 자동으로 조작하는 도구)의 Chromium이에요. "
      "사파리(WebKit)로는 시험하지 못해서, 실제 아이폰에서 확인할 목록을 `docs/device-checklist.md`에 따로 두었어요.")
    w("")

    # ---- 구조
    w("## 폴더 구조")
    w("")
    w("```")
    structure = [
        ("src/", "화면·규칙 코드, 두억이 그림(SVG), 소리, 채점, sql.js 작업자(worker.js)"),
        ("data/lessons/", f"1~{n_ch}장 레슨 표 (ch1.js … ch{n_ch}.js)"),
        ("data/", "개념·대사·퀘스트·배지·의상·오류 설명·SQL 낱말 표, 장터 데이터(market.sql)"),
        ("build.py", "배포 폴더(dist/) 만들기"),
        ("tools/", "개발 서버, 장터 데이터·README 생성, 그림 시트·아이콘 만들기"),
        ("tests/", "시험 도구 (unit, py, sim, 레슨 점검, 브라우저 시험)"),
        ("docs/specs/", "설계서"),
        ("docs/plans/", "계획서"),
        ("docs/img/", "README용 그림 (스크립트로 뽑음)"),
        ("docs/lore-sources.md", "도깨비·두억시니 고증 출처"),
        ("docs/device-checklist.md", "실제 아이폰에서 확인할 목록"),
        ("README.md LOG.md", "설명서(자동 생성)와 개발 일지"),
    ]
    width = max(len(a) for a, _ in structure) + 2
    for a, b in structure:
        w(f"  {a.ljust(width)}{b}")
    w("```")
    w("")
    w("게임 내용(레슨·퀘스트·배지·의상)은 모두 `data/` 표에 있어요. 표를 고치면 화면 코드는 그대로 두고 내용만 바뀌어요.")
    w("")

    # ---- 장터 데이터
    w("## 연습 데이터: 도깨비 장터")
    w("")
    w("모든 레슨이 같은 데이터베이스 하나를 써요. 표·열 이름은 영어이고 화면에는 한글 뜻을 함께 보여 줘요. 값(손님 이름 등)은 한글이에요. "
      "기간은 2026년 한 해이고, 가게·물건·손님 이름은 모두 이 앱을 위해 지어낸 것이에요.")
    w("")
    w("| 표 (뜻) | 열 (뜻) | 행 |")
    w("|---|---|---|")
    for t, meta in d["SCHEMA"].items():
        cols = ", ".join(f"`{c}` {cell(k)}" for c, k in meta["cols"].items())
        w(f"| `{t}` ({cell(meta['ko'])}) | {cols} | {d['market_rows'][t]} |")
    w("")
    w("분석할 거리를 일부러 심어 두었어요: 약재 가게는 여름(6~8월)에 주문 건수가 많고(매출 금액으로는 차이가 작아 레슨은 건수 비중으로 봐요), 3월에 처음 온 손님은 다시 오는 비율이 높고, "
      "공방(방망이)은 주문 건수는 적지만 한 건 금액이 크고, 12월에 주문이 몰려요. 나이 모르는 손님·재고 칸이 빈 물건·주문 없는 손님·"
      "팔린 적 없는 물건도 있어요(NULL과 짝 없는 행 연습용).")
    w("")

    # ---- 레슨
    w(f"## 레슨 {n_lessons}개" + (f" + 심화 {n_adv}개" if n_adv else ""))
    w("")
    w("한 레슨: 학습 목표 → 두억이 설명 카드(SQL과 그 실행 결과 표) → 터치 문제(객관식·빈자리·순서) → 카드 조립 → 이해도 확인 → "
      "틀린 문제 다시 풀기 → 완료 요약. 레슨은 차례로 열리고, 장마다 5번째 레슨이 장 평가예요.")
    w("")
    w("**카드 조립**: SQL 카드(장이 올라갈수록 낱말 → 짧은 구절)를 눌러 문장을 만들고 「실행」하면 결과 표가 나와요. "
      "「제출」하면 정답 SQL의 결과 표와 비교해요(열 이름 대소문자·실수 반올림·`NULL`을 맞춰 보고, `ORDER BY`가 있을 때만 순서를 봐요). "
      "카드 더미는 12장 이하이고 헷갈림 카드가 섞여 있어요. 문제마다 「쓸 표 보기」로 표의 열 이름과 한글 뜻, 앞 5행을 볼 수 있어요. "
      "결과 표가 50행을 넘으면 앞 50행만 그려요.")
    w("")
    w("**심화**: 장 평가를 통과하면 그 장의 심화 레슨이 열리는 장치는 들어 있지만, 심화 레슨 내용은 다음 판에 넣어요.")
    if n_tmpl:
        w("")
        w(f"**매일 도전**: 1장을 마치면 홈 맨 위에 「오늘의 도전」 카드가 생겨요. 하루 3문제 — 문제 틀 {n_tmpl}개에서 값을 바꿔 만든 "
          f"터치 {nums['dailyTouch']}문제와 끝낸 레슨의 카드 조립 1문제(틀린 개념이 든 장·레슨을 더 자주). 끝낸 장에서만 나오고, "
          f"같은 날 다시 열면 같은 문제예요. 다 풀면 XP {nums['dailyXp']} · 엽전 {nums['dailyYeopjeon']}, 「도전 n일째」 "
          f"연속 {nums['dailyBonusEvery']}일마다 엽전 +{nums['dailyBonusYeopjeon']}.")
    w("")
    for ch in d["chapters"]:
        c = ch["chapter"]
        w(f"### {c['id']}장. {c['title']}")
        w("")
        w("| 레슨 | 제목 | 학습 목표 | 카드 조립 문제 | 핵심 개념 | 문제 |")
        w("|---|---|---|---|---|---|")
        for l in ch["lessons"] + ch.get("advanced", []):
            builds = [i for i in l["items"] if i["type"] == "build"]
            task = "<br>".join(cell(i["q"]) for i in builds) or "-"
            concepts = []
            for i in l["items"]:
                name = concept_name.get(i["concept"], i["concept"])
                if name not in concepts:
                    concepts.append(name)
            counts = {}
            for i in l["items"]:
                counts[i["type"]] = counts.get(i["type"], 0) + 1
            kinds = " · ".join(f"{TYPE_KO.get(k, k)} {v}" for k, v in counts.items())
            title = cell(l["title"]) + (" **(장 평가)**" if l.get("isExam") else "") + (" **(심화)**" if l.get("isAdvanced") else "")
            w(f"| {l['id']} | {title} | {cell(l['goal'])} | {task} | {cell(', '.join(concepts))} | {kinds} |")
        w("")

    # ---- 게임 장치 요약
    r, rp, rx = nums["reward"], nums["rewardPerfect"], nums["rewardExam"]
    w("## 게임 장치")
    w("")
    w(f"- **XP**(경험치): 레슨 첫 완료 {r['xp']} (장 평가 {rx['xp']}) + 실수 없음 {rp['xp'] - r['xp']} + 힌트 없이 카드 조립 통과 5. "
      f"다시 하기는 {nums['replay']['xp']} (장 평가 {nums['replayExam']['xp']}), 복습 한 판 {nums['review']['xp']}.")
    goals = "·".join(str(g) for g in nums["dailyGoals"])
    ms = "·".join(str(m) for m in nums["milestones"])
    w(f"- **하루 목표와 연속 기록**: 하루 목표 {goals} XP(기본 20)를 채운 날마다 +1. "
      f"기록 보호권({nums['freezePrice']}엽전, 최대 {nums['freezeMax']}개)이 빠진 날을 메워 줘요. {ms}일에 축하와 보상.")
    w(f"- **엽전**: 장터의 돈. 레슨 첫 완료 {r['yeopjeon']} + 실수 없음 {rp['yeopjeon'] - r['yeopjeon']}, 퀘스트, "
      f"보물상자 {nums['chest']}, 매일 도전, 연속 7일 50. 의상과 보호권을 사요.")
    w("")
    w(f"### 일일 퀘스트 ({n_quests}종 중 매일 3개)")
    w("")
    w(f"날짜로 정해지는 뽑기라 같은 날에는 언제 열어도 같은 퀘스트가 나와요. 3개를 다 끝내면 보물상자(+{nums['chest']}엽전).")
    w("")
    w("| 퀘스트 | 목표 | 보상(엽전) |")
    w("|---|---|---|")
    for q in d["QUESTS"]:
        note = " (복습할 문제가 없는 날은 나오지 않음)" if q["key"] == "review_item" else ""
        w(f"| {cell(q['name'])}{note} | {q['goal']} | {q['reward']} |")
    w("")
    w(f"### 배지 {n_badges}개")
    w("")
    w("얻기 전에는 회색 실루엣과 조건 문구가 보여요.")
    w("")
    w("| 배지 | 얻는 조건 |")
    w("|---|---|")
    for b in d["BADGES"]:
        w(f"| {cell(b['name'])} | {cell(b['desc'])} |")
    w("")
    w(f"### 두억이 의상 {n_outfits}벌")
    w("")
    w("| 의상 | 얻는 법 | 의상실 설명 |")
    w("|---|---|---|")
    for o in d["OUTFITS"]:
        if o.get("price") is not None:
            how = f"{o['price']}엽전"
        else:
            how = UNLOCK_KO.get(o.get("unlock"), cell(o.get("unlock", "-")))
        extra = " · 입으면 오류 설명이 탐정 말투로 바뀜" if o.get("voice") == "detective" else ""
        w(f"| {cell(o['name'])} | {how}{extra} | {cell(o.get('desc', ''))} |")
    w("")

    # ---- 두억이
    w("## 두억이")
    w("")
    w("도깨비 장터의 장부를 맡은 꼬마 도깨비라는 설정의 **창작 캐릭터**예요. 친근한 해요체에 반말이 조금 섞인 말투를 쓰고, "
      "틀려도 혼내지 않으며 오류는 「단서」라고 불러요. 이름은 민속의 「두억시니」에서 따왔지만 두억시니(사전에서는 「모질고 악한 귀신」)와 "
      "같은 존재라고 말하지 않아요.")
    w("")
    faces = " · ".join(d["faceKo"][f] for f in d["faces"])
    w(f"그림은 이미지 파일 없이 코드(SVG)로 그려서, 의상 {n_outfits}벌 × 표정 {len(d['faces'])}가지({faces})를 자유롭게 조합해요.")
    w("")
    w(f'<p align="center"><img src="docs/img/dueogi-sheet.png" alt="두억이 표정 {len(d["faces"])}가지 + 의상 {n_outfits}벌 시트" width="100%"></p>')
    w("")
    w("홈 화면 아이콘:")
    w("")
    w('<img src="docs/img/icon-180.png" alt="앱 아이콘" width="72"> '
      '<img src="docs/img/icon-maskable-512.png" alt="안드로이드용 둥근 아이콘" width="72">')
    w("")

    # ---- 고증
    w("## 고증 출처")
    w("")
    w("도깨비·두억시니에 관한 것은 사전에서 확인한 것만 쓰고, 확인하지 못한 설명(예: 메밀묵을 좋아한다)은 쓰지 않았어요. "
      "자세한 표와 확인하지 못한 것은 `docs/lore-sources.md`에 있어요.")
    w("")
    w("| 항목 | 사전 | 주소 | 확인한 날 |")
    w("|---|---|---|---|")
    for x in d["lore"]:
        w(f"| {x['item']} | {x['dict']} | {x['url']} | {x['date']} |")
    w("")

    # ---- 출처
    w("## 출처와 독창성")
    w("")
    w(f"- **바탕 코드**: 같은 사용자의 「리아와 파이썬!」 v0.9 ([Fullcharge13/Learning-Python]({RIA_URL}))를 복사해 "
      "Python 실행기를 sql.js로, 리아 교수를 두억이로, 레슨을 SQL로 바꿨어요.")
    w("- **레슨 문장·문제·장터 데이터**는 모두 새로 썼어요. 아래 두 저장소는 **장 순서(주제 목차)와 문제 유형을 정하는 참고로만** 썼고, "
      "문장·문제·데이터를 옮기지 않았어요.")
    w("  - `cybergeekgyan/SQL-for-Data-Scientists` — 주제 목차만 참고. 저장소 안의 교재 PDF는 무단 복제본으로 보여 **열지 않았어요**.")
    w("  - `krishnaik06/The-Grand-Complete-Data-Science-Materials` — MySQL 면접 문제의 **유형**(N번째로 비싼 것, 중복 찾기, 그룹마다 1등, "
      "중앙값)만 참고. 이 저장소는 GPL-2 라이선스라 내용을 **복사하지 않았어요**.")
    w(f"- 쓰는 도구: sql.js {sqljs} (MIT, Emscripten으로 만든 실행 코드 포함, 안의 SQLite는 퍼블릭 도메인), esbuild (MIT, 빌드 때만). "
      "고지 전문은 배포 폴더의 `licenses.txt`(앱 설정에서 링크). 소리는 Web Audio로 합성해 음원 파일이 없어요.")
    w("")

    # ---- 한계
    w("## 알려진 한계")
    w("")
    limits = [
        "자동 시험은 Chromium에 아이폰 화면 설정을 입혀서 해요. 실제 아이폰 사파리(특히 오프라인에서 SQL 실행기 wasm 받기·홈 화면 앱)는 아직 확인하지 못했어요 → `docs/device-checklist.md`.",
        "SQL 실행기(`sql-wasm.wasm`, 약 670KB)는 처음 한 번 받아야 해요. 그 뒤로는 휴대폰에 저장돼 비행기 모드에서도 돼요. 받기 전에는 카드 조립 화면이 「실행기 준비 중이에요」를 보여 주고, 터치 문제는 계속 풀 수 있어요.",
        "실행은 3초가 넘으면 멈추고 「너무 오래 걸려서 멈췄어」 설명으로 끝나요. 아주 느린 휴대폰에서는 맞는 SQL도 시간 초과로 끝날 수 있어요.",
        "사파리는 홈 화면에 추가하지 않은 웹사이트의 저장을 7일 동안 방문이 없으면 지울 수 있어요. 홈 화면에 추가를 안내하고, 브라우저에 저장 보존을 요청하며(`navigator.storage.persist`), 설정에 저장 내보내기·가져오기를 두었어요.",
        "같은 주소(`fullcharge13.github.io`)의 「리아와 파이썬!」과 저장·캐시 이름을 나눴어요(`dueogi-`). 두 앱의 진도는 따로예요.",
        "SQL 문법은 SQLite 기준이에요. 다른 데이터베이스(MySQL·PostgreSQL)와 다른 동작은 레슨에서 「이 장터에서는」이라고 밝히고, 16장에 비교 카드를 두었어요.",
        "서버가 없어 정답도 앱 파일 안에 들어 있어요. 마음먹고 파일을 열어 보면 볼 수 있어요.",
        "레슨 중간 진행은 24시간 동안만 이어서 할 수 있어요. 다른 휴대폰이나 브라우저로는 이어지지 않아요.",
        "PC에서도 열리지만 휴대폰 폭 그대로 가운데에 놓여요.",
    ]
    for x in limits:
        w(f"- {x}")
    w("")
    w("개발 과정과 결정 기록은 `LOG.md`, 설계는 `docs/specs/`, 작업 계획은 `docs/plans/`에 있어요.")
    w("")
    return "\n".join(L), {"lessons": n_lessons, "advanced": n_adv, "badges": n_badges, "outfits": n_outfits,
                          "quests": n_quests, "items": n_items, "builds": n_build, "templates": n_tmpl, "version": version}


def main():
    args = sys.argv[1:]
    unknown = [x for x in args if x != "--check"]
    if unknown:
        print("사용법: python3 tools/readme_gen.py [--check]  (알 수 없는 인자: %s)" % " ".join(unknown))
        sys.exit(2)
    check = "--check" in args
    text, n = build(load_data())
    summary = (f"레슨 {n['lessons']} · 심화 {n['advanced']} · 문제 {n['items']} · 카드 조립 {n['builds']} · 틀 {n['templates']} · "
               f"퀘스트 {n['quests']} · 배지 {n['badges']} · 의상 {n['outfits']} · 판 {n['version']}")
    if check:
        try:
            with open(README, encoding="utf-8") as f:
                current = f.read()
        except OSError:
            current = None
        if current != text:
            print("README.md가 데이터와 어긋나요. `python3 tools/readme_gen.py`로 다시 만드세요.")
            if current is not None:
                import difflib
                diff = list(difflib.unified_diff(current.splitlines(), text.splitlines(),
                                                 "README.md", "생성 결과", lineterm="", n=0))
                print("\n".join(diff[:40]))
                print("어긋난 줄 %d개" % sum(1 for x in diff[2:] if x[:1] in "+-"))
            sys.exit(1)
        print(f"README.md 최신 상태, 어긋남 0 ({summary})")
        return
    with open(README, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"README.md 생성 ({summary})")


if __name__ == "__main__":
    main()
