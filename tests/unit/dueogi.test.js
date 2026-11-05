// 작업 9: 두억이 그림 시험 (설계 §8)
import { test } from "node:test";
import assert from "node:assert/strict";
import { dueogiSVG, FACE_IDS, OUTFIT_IDS, FACE_KO, OUTFIT_KO } from "../../src/dueogi.js";

const FACES = ["proud", "cheer", "wink", "laugh", "think", "surprise", "run", "nervous", "swing", "eat", "cry", "sleep"];
const OUTFITS = ["basic", "merchant", "seonbi", "podol", "detective", "winter", "gukbap", "seolbim", "hunjang", "graduate"];
const MAX_BYTES = 25000; // 한 장 25KB 상한

// 아주 작은 XML 점검기: 태그 짝, 속성 따옴표, 태그 밖의 꺾쇠·맨 & 없음
function checkXml(s) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    const between = s.slice(last, m.index);
    if (/[<>]/.test(between)) return `태그 밖 꺾쇠: ${between.slice(0, 40)}`;
    if (/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(between)) return "맨 & 문자";
    last = re.lastIndex;
    const [, close, name, , self] = m;
    if (close) {
      if (stack.pop() !== name) return `닫는 태그 짝이 안 맞음: ${name}`;
    } else if (!self) stack.push(name);
  }
  if (last !== s.length) return `알 수 없는 꼬리: ${s.slice(last, last + 40)}`;
  if (stack.length) return `안 닫힌 태그: ${stack.join(",")}`;
  return null;
}

test("dueogi ids: 설계 §8-3·§8-4 순서와 같다", () => {
  assert.deepEqual([...FACE_IDS], FACES);
  assert.deepEqual([...OUTFIT_IDS], OUTFITS);
  for (const f of FACES) assert.match(FACE_KO[f] ?? "", /[가-힣]/, f);
  for (const o of OUTFITS) assert.match(OUTFIT_KO[o] ?? "", /[가-힣]/, o);
});

test("dueogi all 120: <svg로 시작, 올바른 XML, id 없음(겹칠 일 없음), 결정적, 25KB 이하", () => {
  let count = 0, max = 0;
  for (const outfit of OUTFITS) for (const face of FACES) {
    const s = dueogiSVG({ face, outfit });
    const tag = `${outfit}/${face}`;
    assert.ok(s.startsWith("<svg"), tag);
    assert.ok(s.endsWith("</svg>"), tag);
    assert.equal(checkXml(s), null, tag);
    const ids = [...s.matchAll(/\sid="([^"]*)"/g)].map((x) => x[1]);
    assert.equal(new Set(ids).size, ids.length, `${tag}: id 중복`);
    assert.equal(ids.length, 0, `${tag}: 한 화면 여러 장을 위해 id를 쓰지 않음`);
    assert.doesNotMatch(s, /<defs|url\(|href=|<script|<image/i, tag);
    assert.doesNotMatch(s, /NaN|undefined|Infinity/, tag);
    assert.equal(dueogiSVG({ face, outfit }), s, `${tag}: 같은 입력 같은 결과`);
    const bytes = Buffer.byteLength(s, "utf8");
    max = Math.max(max, bytes);
    assert.ok(bytes <= MAX_BYTES, `${tag}: ${bytes}B`);
    count++;
  }
  assert.equal(count, 120);
});

test("dueogi distinct: 표정 12·의상 10이 모두 다른 그림", () => {
  assert.equal(new Set(FACES.map((face) => dueogiSVG({ face }))).size, 12);
  assert.equal(new Set(OUTFITS.map((outfit) => dueogiSVG({ outfit }))).size, 10);
});

test("dueogi unknown: 모르는 표정·의상 → 의기양양·기본", () => {
  const def = dueogiSVG({ face: "proud", outfit: "basic", size: 160 });
  assert.equal(dueogiSVG(), def);
  assert.equal(dueogiSVG(null), def);
  assert.equal(dueogiSVG({ face: "angry" }), def); // 시트의 「화남」은 쓰지 않음
  assert.equal(dueogiSVG({ outfit: "bikini" }), def);
  assert.equal(dueogiSVG({ face: "toString", outfit: "__proto__" }), def);
  assert.match(def, /aria-label="두억이, 의기양양, 기본"/);
});

test("dueogi size: 너비·높이와 이상한 값", () => {
  assert.match(dueogiSVG({ size: 96 }), /width="96" height="124.8"/);
  assert.match(dueogiSVG({ size: "200" }), /width="200" height="260"/);
  for (const bad of [-1, NaN, 0, "abc", Infinity, {}]) assert.match(dueogiSVG({ size: bad }), /width="160" height="208"/, String(bad));
  assert.match(dueogiSVG({ size: 1e9 }), /width="2048"/);
});

test("dueogi features: 도깨비불 색(만세=보라, 놀람=파랑), 가시 방망이, 뿔", () => {
  assert.match(dueogiSVG({ face: "cheer" }), /class="dg-fire dg-fire-purple"/);
  assert.match(dueogiSVG({ face: "surprise" }), /class="dg-fire dg-fire-blue"/);
  assert.doesNotMatch(dueogiSVG({ face: "proud" }), /dg-fire/);
  for (const outfit of OUTFITS) for (const face of FACES) {
    const s = dueogiSVG({ face, outfit });
    assert.match(s, /class="dg-club"/, `${outfit}/${face}: 방망이`);
    assert.equal(s.split('class="dg-horn"').length, 3, `${outfit}/${face}: 뿔 둘`);
    assert.match(s, /^<svg [^>]*class="dueogi"/);
    assert.equal(s.split('class="dueogi-body"').length, 2);
  }
});
