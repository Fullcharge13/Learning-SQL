"""flow.py --lesson이 심화 id(N-A1~N-A3)를 받는지(v0.2 작업 3). 브라우저 없이 도우미 함수만 본다.

    python3 -m pytest tests/py -q
"""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tests"))
import flow  # noqa: E402


def test_lesson_id_accepts_main_and_advanced():
    for ok in ("1-3", "12-5", "1-A1", "6-A3"):
        assert flow.lesson_id_ok(ok), ok
    for bad in ("", "1", "1-0", "A1", "1-a1", "1-A", "1-A0", "x-1"):
        assert not flow.lesson_id_ok(bad), bad


def test_seed_before_main_lesson_unchanged():
    s = flow._seed_before("2-3")
    assert s["completed_lessons"] == ["1-1", "1-2", "1-3", "1-4", "1-5", "2-1", "2-2"]
    assert s["current_lesson"] == "2-3" and s["current_chapter"] == 2


def test_seed_before_advanced_finishes_that_chapter_exam():
    # 심화는 장 평가 뒤에 열린다: 1~N장 본 과정을 모두 끝내고 지금 레슨은 다음 장 첫 레슨
    s = flow._seed_before("1-A1")
    assert s["completed_lessons"] == ["1-1", "1-2", "1-3", "1-4", "1-5"]
    assert s["current_lesson"] == "2-1" and s["current_chapter"] == 2
    assert s["saveVer"] == 1
    s3 = flow._seed_before("3-A2")
    assert "3-5" in s3["completed_lessons"] and "4-1" not in s3["completed_lessons"]
    assert not any("-A" in x for x in s3["completed_lessons"]), "no advanced lesson is done before the walk"
    assert s3["current_lesson"] == "4-1"
