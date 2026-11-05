"""README 첫머리 화면 캡처 3장을 docs/img/로 복사한다 (작업 17: 두억이와 SQL!).

먼저 `python3 tests/flow.py`를 돌려 tests/out/flow/에 최신 캡처(아이폰 17)가 있어야 한다.
    python3 tools/readme_shots.py

모두 실제 레슨 1-1을 끝까지 푸는 test_real_lesson_walk의 캡처다(홈·기기별 캡처는 시험용 레슨 빌드라 「시험용」 글자가 보여 쓰지 않음).
- 설명 카드: walk-1-1-02-card.png (두억이 설명, SQL과 실행 결과 표, 열 이름의 한글 뜻)
- 카드 조립: walk-1-1-24-result.png (카드를 놓아 SELECT * FROM shops를 만들고 통과)
- 레슨 완료: walk-1-1-27-done.png
"""
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tests" / "out" / "flow"
SHOTS = {"walk-1-1-02-card.png": "screen-card.png", "walk-1-1-24-result.png": "screen-build.png",
         "walk-1-1-27-done.png": "screen-done.png"}


def main():
    missing = [s for s in SHOTS if not (SRC / s).exists()]
    if missing:
        sys.exit("readme_shots: run `python3 tests/flow.py` first (missing %s)" % ", ".join(missing))
    for src, dst in SHOTS.items():
        shutil.copy(SRC / src, ROOT / "docs" / "img" / dst)
        print("copied", src, "->", "docs/img/" + dst)


if __name__ == "__main__":
    main()
