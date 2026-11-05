"""두억이 그림 확인용 시트 PNG를 만든다 (작업 9, 설계 §8-5).

    python3 tools/dueogi_sheet.py

- docs/img/dueogi-sheet.png : 표정 12가지(기본 의상) + 의상 10벌(의기양양) + 앱 크기(96px) 줄, 이름표 포함

SVG 문자열은 `node`로 src/dueogi.js를 불러 얻고, Playwright Chromium으로 찍는다(deviceScaleFactor 2).
첨부 참고 그림은 저장소에 넣지 않으며 이 도구도 읽지 않는다.
Pillow(`pip install pillow`)가 있으면 찍은 PNG를 256색으로 줄여 파일을 작게 한다. 없으면 줄이기만 건너뛰고 알린다.
"""
import json
import pathlib
import subprocess

try:
    from PIL import Image
except ImportError:  # 줄이기(quantize)만 쓰므로 없어도 시트는 만든다
    Image = None
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "img"

NODE_SCRIPT = """
const m = await import(process.argv[1]);
const faces = m.FACE_IDS.map((f) => ({ id: f, ko: m.FACE_KO[f], svg: m.dueogiSVG({ face: f, outfit: 'basic', size: 190 }), small: m.dueogiSVG({ face: f, outfit: 'basic', size: 96 }) }));
const outfits = m.OUTFIT_IDS.map((o) => ({ id: o, ko: m.OUTFIT_KO[o], svg: m.dueogiSVG({ face: 'proud', outfit: o, size: 190 }), small: m.dueogiSVG({ face: 'proud', outfit: o, size: 96 }) }));
console.log(JSON.stringify({ faces, outfits }));
"""


def load():
    url = (ROOT / "src" / "dueogi.js").as_uri()
    out = subprocess.run(["node", "--input-type=module", "-e", NODE_SCRIPT, url],
                         check=True, capture_output=True, text=True, cwd=ROOT)
    return json.loads(out.stdout)


def cards(items):
    return "".join(f"<figure>{it['svg']}<figcaption><b>{it['ko']}</b> <small>{it['id']}</small></figcaption></figure>" for it in items)


def smalls(items):
    return "".join(f"<span>{it['small']}</span>" for it in items)


def sheet_html(d):
    return f"""<!doctype html><meta charset=utf-8><style>
body{{margin:0;background:#FBF7F0;font-family:system-ui,'Noto Sans CJK KR',sans-serif;color:#2B2433}}
#w{{padding:18px 20px;width:max-content}} h1{{margin:0 0 4px;font-size:24px}} h2{{margin:18px 0 8px;font-size:18px}}
p{{margin:0;color:#7a6e66;font-size:13px}}
.grid{{display:grid;gap:8px}} .g6{{grid-template-columns:repeat(6,206px)}} .g5{{grid-template-columns:repeat(5,206px)}}
figure{{margin:0;background:#FFFDF9;border:1px solid #EFE6D8;border-radius:12px;padding:6px 6px 8px;text-align:center}}
figure svg{{display:block;margin:auto}} figcaption{{font-size:15px}} small{{color:#9a8e86;font-size:12px}}
.row{{display:flex;gap:4px;background:#fff;border:1px solid #EFE6D8;border-radius:12px;padding:6px;width:max-content}} .row svg{{display:block}}
</style><div id=w>
<h1>두억이 그림 시트 v0.1</h1><p>src/dueogi.js · 승인 전 시안 · 첨부 시트의 특징만 살려 새로 그림</p>
<h2>표정 12가지 (기본 의상)</h2><div class="grid g6">{cards(d['faces'])}</div>
<h2>의상 10벌 (의기양양)</h2><div class="grid g5">{cards(d['outfits'])}</div>
<h2>앱 크기 96px: 표정</h2><div class=row>{smalls(d['faces'])}</div>
<h2>앱 크기 96px: 의상</h2><div class=row>{smalls(d['outfits'])}</div>
</div>"""


def main():
    d = load()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        try:
            pg = b.new_page(viewport={"width": 1400, "height": 900}, device_scale_factor=2)
            pg.set_content(sheet_html(d))
            pg.locator("#w").screenshot(path=str(OUT / "dueogi-sheet.png"))
        finally:
            b.close()
    # 평평한 색 그림이라 256색으로 줄여도 눈에 띄지 않고 파일이 작아진다
    png = OUT / "dueogi-sheet.png"
    if Image is None:
        print("Pillow가 없어 256색 줄이기를 건너뜀 (pip install pillow). wrote", png, png.stat().st_size, "bytes")
        return
    Image.open(png).convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(png, optimize=True)
    print("wrote", png, png.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
