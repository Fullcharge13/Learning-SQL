"""README 생성기(tools/readme_gen.py, 작업 17): SQL 앱 내용으로 만들고, README.md가 생성 결과와 같은지(--check 어긋남 0).

    python3 -m pytest tests/py -q
"""
import copy
import functools
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import readme_gen  # noqa: E402


@functools.lru_cache(maxsize=1)
def _data():
    return readme_gen.load_data()


@functools.lru_cache(maxsize=1)
def _built():
    return readme_gen.build(copy.deepcopy(_data()))


def test_check_reports_zero_differences():
    """커밋된 README.md가 데이터에서 다시 만든 것과 글자 하나까지 같음"""
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "readme_gen.py"), "--check"],
                       capture_output=True, text=True, cwd=ROOT)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "어긋남 0" in r.stdout


def test_check_fails_when_readme_differs(tmp_path, monkeypatch):
    text, _ = _built()
    fake = tmp_path / "README.md"
    fake.write_text(text.replace("두억이와 SQL!", "리아와 파이썬!", 1), encoding="utf-8")
    monkeypatch.setattr(readme_gen, "README", str(fake))
    monkeypatch.setattr(sys, "argv", ["readme_gen.py", "--check"])
    monkeypatch.setattr(readme_gen, "load_data", _data)
    try:
        readme_gen.main()
    except SystemExit as e:
        assert e.code == 1
    else:
        raise AssertionError("--check must fail on a stale README")


def _app_version():
    with open(os.path.join(ROOT, "src", "app.js"), encoding="utf-8") as f:
        return re.search(r'export const VERSION = "([^"]+)"', f.read()).group(1)


def test_counts_match_data():
    """README의 수는 레슨 데이터에서 직접 센 것과 같다(문제·심화를 더해도 숫자를 고칠 필요 없음).
    고정 숫자는 구조 규칙(17장, 장마다 본 과정 5레슨, 심화는 장마다 0 또는 3)만 본다."""
    d = _data()
    text, n = _built()
    chapters = d["chapters"]
    main = [l for ch in chapters for l in ch["lessons"]]
    adv = [l for ch in chapters for l in ch.get("advanced", [])]
    items = sum(len(l["items"]) for l in main + adv)
    builds = sum(1 for l in main + adv for i in l["items"] if i["type"] == "build")
    assert len(chapters) == 17 and len(main) == 85
    assert all(len(ch["lessons"]) == 5 for ch in chapters)
    assert all(len(ch.get("advanced", [])) in (0, 3) for ch in chapters)
    assert items > len(main) * 10  # 레슨마다 문제 10개 이상
    version = _app_version()
    assert (n["lessons"], n["advanced"], n["items"], n["builds"], n["version"]) == (len(main), len(adv), items, builds, version)
    assert "# 두억이와 SQL! %s\n" % version in text
    adv_part = "심화 레슨 %d개 · " % len(adv) if adv else ""
    assert "17장 · 레슨 %d개 · %s문제 %d개(그중 카드 조립 %d개)" % (len(main), adv_part, items, builds) in text
    assert ("## 레슨 %d개" % len(main) + (" + 심화 %d개" % len(adv) if adv else "") + "\n") in text
    for l in adv:
        assert re.search(r"^\| %s \| " % re.escape(l["id"]), text, re.M), l["id"]
    assert "배지 %d개" % len(d["BADGES"]) in text and "두억이 의상 %d벌" % len(d["OUTFITS"]) in text
    # 장마다 표 하나, 레슨마다 줄 하나
    for ch in d["chapters"]:
        assert "### %d장. %s" % (ch["chapter"]["id"], ch["chapter"]["title"]) in text
        for l in ch["lessons"]:
            assert re.search(r"^\| %s \| " % re.escape(l["id"]), text, re.M), l["id"]


def test_build_items_listed_and_exams_marked():
    d = _data()
    text, _ = _built()
    first_build = next(i for i in d["chapters"][0]["lessons"][0]["items"] if i["type"] == "build")
    assert first_build["q"] in text
    assert "카드 조립" in text and "직접 작성" not in text
    assert text.count("**(장 평가)**") == 17


def test_market_table_and_currency():
    text, _ = _built()
    for t in ("shops", "items", "customers", "orders", "order_items"):
        assert "| `%s` (" % t in text, t
    assert "| `shops` (가게) |" in text and re.search(r"\| `items` \(물건\) \| .* \| 40 \|", text)
    assert "엽전" in text
    for old in ("바이트", "## 리아 교수", "리아 교수 의상", "Pyodide", "pytest tests/py -q` | 채점기", "runner.py", "CodeMirror"):
        assert old not in text, old


def test_reference_repos_and_scope():
    text, _ = _built()
    assert "cybergeekgyan/SQL-for-Data-Scientists" in text and "주제 목차만 참고" in text and "열지 않았어요" in text
    assert "krishnaik06/The-Grand-Complete-Data-Science-Materials" in text and "GPL-2" in text and "복사하지 않았어요" in text
    assert "문제 유형" in text or "**유형**" in text
    assert "Fullcharge13/Learning-Python" in text


def test_lore_sources_section():
    d = _data()
    text, _ = _built()
    assert "## 고증 출처" in text
    assert d["lore"], "lore rows parsed from docs/lore-sources.md"
    for x in d["lore"]:
        assert x["url"].startswith("https://encykorea.aks.ac.kr/") and x["date"] == "2026-11-06", x
        assert "| %s | %s | %s | %s |" % (x["item"], x["dict"], x["url"], x["date"]) in text
    assert any("두억시니" in x["item"] for x in d["lore"])


def test_readme_images_exist():
    text, _ = _built()
    for src in re.findall(r'<img src="([^"]+)"', text):
        assert os.path.exists(os.path.join(ROOT, src)), src
