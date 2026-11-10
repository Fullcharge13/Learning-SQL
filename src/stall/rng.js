// 가게의 난수: 같은 (씨앗, 날짜)는 늘 같은 수열. 가게 계산은 이 난수만 쓴다(Math.random 금지).
// mulberry32에 씨앗과 날짜를 섞어 넣는다(씨앗·날짜를 맞바꿔도 다른 수열이 되게 서로 다른 곱을 쓴다).

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @returns {() => number} [0, 1) 결정적 난수 */
export function rngFor(seed, day) {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul((day | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return mulberry32(h);
}
