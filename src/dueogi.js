// 두억이(꼬마 도깨비) 그림 — 이미지 파일 없이 SVG 문자열로 그린다 (설계 §8, 작업 9)
// 겹치는 순서: 바닥 그림자 → 바닥에 둔 방망이 → 뒷머리 → (모자 없으면) 뿔 → 기대 둔 방망이 → 다리 → 몸·의상 → 팔
//              → 쥔 방망이(mid) → 머리(귀·얼굴·표정·앞머리·눈썹) → 어깨에 멘 방망이(front) → 의상 소품 → 손
//              → 모자 + (모자 있으면) 뿔 → 얼굴 앞 팔·고기(over) → 효과(g.dueogi-fx)
// 같은 입력이면 언제나 같은 문자열. <defs>·id를 쓰지 않아 한 화면에 여러 장을 넣어도 충돌이 없다(화면에 여러 장을 같이 그려도 됨).
// 첨부 시트는 특징(파란 피부, 뿔, 헝클어진 머리, 송곳니 …)만 참고했고 자세·구도는 새로 정했다.

export const FACE_IDS = Object.freeze(["proud", "cheer", "wink", "laugh", "think", "surprise", "run", "nervous", "swing", "eat", "cry", "sleep"]);
export const OUTFIT_IDS = Object.freeze(["basic", "merchant", "seonbi", "podol", "detective", "winter", "gukbap", "seolbim", "hunjang", "graduate"]);
export const FACE_KO = Object.freeze({
  proud: "의기양양", cheer: "만세", wink: "윙크", laugh: "웃음", think: "고민", surprise: "놀람",
  run: "달리기", nervous: "긴장", swing: "결의", eat: "고기 먹기", cry: "울음", sleep: "잠",
});
export const OUTFIT_KO = Object.freeze({
  basic: "기본", merchant: "장터 상인", seonbi: "선비", podol: "포졸", detective: "탐정",
  winter: "겨울 털옷", gukbap: "국밥집 주방장", seolbim: "설빔 한복", hunjang: "서당 훈장", graduate: "졸업",
});

const W = 200, H = 260;
const C = {
  ol: "#2B2433", white: "#FFFFFF",
  skin: "#7FA0E3", skinS: "#5F7FC8", skinL: "#A9C2F2", cheek: "#F0607A", nose: "#E5484F", noseL: "#FF9A98",
  mouth: "#8E2434", tongue: "#F58C9B", fang: "#FFFDF4",
  hair: "#24212B", hairHi: "#4A4656", horn: "#EEDDB0", hornS: "#C6A66C",
  pupil: "#1E1A26",
  hemp: "#E7DDC6", hempS: "#C9BB9A", fur: "#8E5F35", furL: "#B98552", rope: "#D3AD68", ropeS: "#A27D3E",
  pants: "#727684", pantsS: "#585B68", wrap: "#EFE6D2", straw: "#D9B672", strawS: "#AE8A47",
  club: "#3E414C", clubHi: "#5D616E", spike: "#B9BEC8",
  fireP: "#B46CF2", firePL: "#EBD4FF", fireB: "#4E9EF2", fireBL: "#D2EAFF",
  sweat: "#8CCBF5", tear: "#7CC4F4", gold: "#F2C14E", goldS: "#C9962C", red: "#D6453E", redS: "#A8302C",
  black: "#26262E", blackL: "#4A4A58", navy: "#2F3E6B", navyS: "#222D50", jade: "#CFE6DC", jadeS: "#A6C7B9",
  brown: "#A8764A", brownS: "#7E5532", check: "#5E3E22", lens: "#CFEFFF",
  cream: "#FFF6E0", creamS: "#E8D9B4", pink: "#F6A6B8", pinkS: "#D97C93", green: "#6DBA6A", yellow: "#F7D45A", blue: "#5B8DE0",
  meat: "#B5532E", meatL: "#D8794A", bone: "#FBF3E2", gray: "#B8BCC6", grayL: "#E3E5EA", shadow: "#2B2433",
};

// ---- 작은 도우미 ----
const n = (v) => Math.round(v * 10) / 10;
function p(d, fill, o = {}) {
  const sw = o.sw ?? 2.6;
  return `<path d="${d}" fill="${fill}" stroke="${sw ? (o.stroke ?? C.ol) : "none"}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${o.op ? ` opacity="${o.op}"` : ""}${o.cls ? ` class="${o.cls}"` : ""}/>`;
}
const S = (d, fill, op) => p(d, fill, { sw: 0, op });
function circ(x, y, r, fill, o = {}) {
  const sw = o.sw ?? 2.6;
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" stroke="${sw ? (o.stroke ?? C.ol) : "none"}" stroke-width="${sw}"${o.op ? ` opacity="${o.op}"` : ""}/>`;
}
function ell(x, y, rx, ry, fill, o = {}) {
  const sw = o.sw ?? 2.6;
  const rot = o.rot ? ` transform="rotate(${o.rot} ${n(x)} ${n(y)})"` : "";
  return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" stroke="${sw ? (o.stroke ?? C.ol) : "none"}" stroke-width="${sw}"${o.op ? ` opacity="${o.op}"` : ""}${rot}/>`;
}
const line = (d, color = C.ol, w = 2.6, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const limb = (d, color, w = 12) => line(d, C.ol, w + 5.2) + line(d, color, w);
const g = (tf, body, cls) => `<g${cls ? ` class="${cls}"` : ""}${tf ? ` transform="${tf}"` : ""}>${body}</g>`;
const sparkle = (x, y, r, fill = C.yellow) =>
  p(`M${x},${y - r} Q${n(x + r * 0.18)},${n(y - r * 0.18)} ${x + r},${y} Q${n(x + r * 0.18)},${n(y + r * 0.18)} ${x},${y + r} Q${n(x - r * 0.18)},${n(y + r * 0.18)} ${x - r},${y} Q${n(x - r * 0.18)},${n(y - r * 0.18)} ${x},${y - r}Z`, fill, { sw: 1.6 });
const drop = (x, y, s = 1, col = C.sweat) =>
  p(`M${x},${y} Q${n(x + 5 * s)},${n(y + 8 * s)} ${x},${n(y + 11 * s)} Q${n(x - 5 * s)},${n(y + 8 * s)} ${x},${y}Z`, col, { sw: 1.6 });
const heart = (x, y, r, fill = C.cheek) =>
  p(`M${x},${n(y + r)} C${n(x - r * 1.6)},${n(y - r * 0.2)} ${n(x - r * 0.8)},${n(y - r * 1.4)} ${x},${n(y - r * 0.5)} C${n(x + r * 0.8)},${n(y - r * 1.4)} ${n(x + r * 1.6)},${n(y - r * 0.2)} ${x},${n(y + r)} Z`, fill, { sw: 1.6 });

// ---- 도깨비불 ----
function fire(x, y, s, kind) {
  const [col, lt] = kind === "purple" ? [C.fireP, C.firePL] : [C.fireB, C.fireBL];
  const d = `M${x},${n(y + 13 * s)} C${n(x - 13 * s)},${n(y + 13 * s)} ${n(x - 13 * s)},${n(y - 2 * s)} ${n(x - 4 * s)},${n(y - 8 * s)} Q${n(x - 4 * s)},${n(y - 2 * s)} ${n(x + 1 * s)},${n(y - 4 * s)} Q${n(x - 2 * s)},${n(y - 12 * s)} ${n(x + 6 * s)},${n(y - 19 * s)} Q${n(x + 5 * s)},${n(y - 8 * s)} ${n(x + 10 * s)},${n(y - 2 * s)} C${n(x + 15 * s)},${n(y + 6 * s)} ${n(x + 9 * s)},${n(y + 13 * s)} ${x},${n(y + 13 * s)} Z`;
  const swirl = `M${n(x - 4 * s)},${n(y + 6 * s)} Q${n(x - 5 * s)},${n(y - 1 * s)} ${n(x + 1 * s)},${n(y)} Q${n(x + 6 * s)},${n(y + 2 * s)} ${n(x + 3 * s)},${n(y + 7 * s)} Q${n(x)},${n(y + 9 * s)} ${n(x - 1 * s)},${n(y + 5 * s)}`;
  return g("", p(d, col, { sw: 2.2, op: 0.95 }) + S(`M${n(x - 6 * s)},${n(y + 8 * s)} Q${n(x - 7 * s)},${n(y)} ${n(x - 1 * s)},${n(y - 3 * s)} Q${n(x + 6 * s)},${n(y)} ${n(x + 5 * s)},${n(y + 8 * s)} Q${x},${n(y + 11 * s)} ${n(x - 6 * s)},${n(y + 8 * s)}Z`, lt, 0.85) + line(swirl, col, 2 * s), `dg-fire dg-fire-${kind}`);
}

// ---- 가시 방망이: (x,y)를 쥔 자리로, 각도 a(도)쪽으로 뻗는다 ----
function club(x, y, a, len = 62) {
  const L = len, t = (u) => -(6 + ((u - 18) / (L - 28)) * 5); // 머리 윗변 높이
  let s = `<rect x="-7" y="-3.6" width="28" height="7.2" rx="3" fill="${C.club}" stroke="${C.ol}" stroke-width="2.4"/>`;
  s += circ(-7, 0, 4.4, C.clubHi, { sw: 2.2 });
  let spikes = "";
  for (const u of [28, 39, 50].filter((v) => v < L - 6)) {
    const e = t(u);
    spikes += p(`M${u - 3.4},${n(e + 0.8)} L${u},${n(e - 6)} L${u + 3.4},${n(e + 0.8)}Z`, C.spike, { sw: 1.8 });
    spikes += p(`M${u - 3.4},${n(-e - 0.8)} L${u},${n(-e + 6)} L${u + 3.4},${n(-e - 0.8)}Z`, C.spike, { sw: 1.8 });
  }
  spikes += p(`M${L - 1},-3.4 L${L + 6},0 L${L - 1},3.4Z`, C.spike, { sw: 1.8 });
  s += spikes + p(`M18,-6 L${L - 9},-11 Q${L},-11 ${L},0 Q${L},11 ${L - 9},11 L18,6 Z`, C.club);
  s += S(`M21,-4 L${L - 9},-8 Q${L - 4},-8 ${L - 3},-5 L21,-2Z`, C.clubHi, 0.9);
  for (const u of [33, 45].filter((v) => v < L - 8)) s += circ(u, 2, 2.2, C.spike, { sw: 1.4 });
  return g(`translate(${n(x)} ${n(y)}) rotate(${a})`, s, "dg-club");
}

// ---- 손 ----
function hand(x, y, kind = "fist", col = C.skin) {
  let s = "";
  if (kind === "peace") s += limb(`M${x - 2},${y - 3} L${x - 5},${y - 14}`, col, 4) + limb(`M${x + 2},${y - 3} L${x + 5},${y - 14}`, col, 4);
  if (kind === "open") s += limb(`M${x - 5},${y - 4} L${x - 8},${y - 12} M${x},${y - 5} L${x},${y - 14} M${x + 5},${y - 4} L${x + 8},${y - 12}`, col, 3.6);
  s += circ(x, y, 7.4, col);
  if (kind === "fist") s += line(`M${x - 4},${y - 1.5} L${x + 4},${y - 1.5}`, C.skinS, 1.6);
  return s;
}

// ---- 몸 치수 ----
const SH_L = [76, 152], SH_R = [124, 152];
function arm(sh, el, hd, o) {
  const d = `M${sh[0]},${sh[1]} Q${el[0]},${el[1]} ${hd[0]},${hd[1]}`;
  let s = limb(d, o.sleeve ?? C.hemp, 13);
  if (o.bands) o.bands.forEach((c, i) => (s += line(d, c, 13, ` stroke-dasharray="5 ${5 * (o.bands.length) + 0.01}" stroke-dashoffset="${-5 * (i + 1)}" stroke-linecap="butt"`)));
  return s;
}

// ---- 머리 ----
// 헝클어진 뒷머리: 타원 둘레에 삐죽한 가닥을 단다(길이를 섞어 헝클어지게)
function shag(cx, cy, rx, ry, k, a0, a1, depth, mix) {
  const A = (deg) => (deg * Math.PI) / 180;
  const at = (deg, f) => [cx + rx * f * Math.cos(A(deg)), cy + ry * f * Math.sin(A(deg))];
  let d = "M" + at(a0, 1).map(n).join(",");
  for (let i = 0; i < k; i++) {
    const t0 = a0 + ((a1 - a0) * i) / k, t1 = a0 + ((a1 - a0) * (i + 1)) / k, f = 1 + depth * mix[i % mix.length];
    const tip = at(t0 + (t1 - t0) * 0.62, f), c1 = at(t0 + (t1 - t0) * 0.15, 1 + (f - 1) * 0.7), c2 = at(t1 - (t1 - t0) * 0.05, 1.02);
    d += ` Q${n(c1[0])},${n(c1[1])} ${n(tip[0])},${n(tip[1])} Q${n(c2[0])},${n(c2[1])} ${n(at(t1, 1)[0])},${n(at(t1, 1)[1])}`;
  }
  return d;
}
const backHair = () =>
  p("M46,108 Q34,130 38,152 L46,144 L50,154 L56,142 L62,146 Q60,136 62,128Z", C.hair) + p("M154,108 Q166,130 162,152 L154,144 L150,154 L144,142 L138,146 Q140,136 138,128Z", C.hair) +
  p(shag(100, 98, 63, 60, 23, -90, 270, 0.15, [1, 0.5, 1.35, 0.7, 1.1, 0.4, 0.9]) + "Z", C.hair) +
  line("M50,78 Q54,66 62,58 M140,58 Q148,66 152,78 M44,112 Q42,124 45,134 M156,112 Q158,124 155,134", C.hairHi, 2.2);
// 굵은 뿔: 밑동이 두껍고 바깥으로 휘었다가 끝이 위로 선다. 가로 마디 줄로 짐승 귀와 구별한다
const HORN = "M64,52 C54,42 50,28 55,13 Q58,8 62,12 C66,26 76,38 86,46 Z";
const HORN_S = "M64,52 C54,42 50,28 55,13 C56,28 62,42 74,50Z";
const HORN_R = "M56,40 Q66,44 76,42 M54,29 Q60,32 67,31 M55,20 Q58,22 62,21";
const mir = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${n(200 - Number(x))},${y}`);
const horns = () =>
  p(HORN, C.horn, { cls: "dg-horn" }) + S(HORN_S, C.hornS, 0.6) + line(HORN_R, C.hornS, 2) +
  p(mir(HORN), C.horn, { cls: "dg-horn" }) + S(mir(HORN_S), C.hornS, 0.6) + line(mir(HORN_R), C.hornS, 2);
const ears = () =>
  p("M60,98 L34,84 Q38,106 60,118 Z", C.skin) + S("M55,101 L42,92 Q45,104 56,111Z", C.skinS, 0.8) +
  p("M140,98 L166,84 Q162,106 140,118 Z", C.skin) + S("M145,101 L158,92 Q155,104 144,111Z", C.skinS, 0.8);
const faceBase = () =>
  p("M56,98 C56,70 76,60 100,60 C124,60 144,70 144,98 C144,126 128,143 100,143 C72,143 56,126 56,98 Z", C.skin) +
  S("M62,118 Q70,138 100,141 Q86,134 76,124Z", C.skinS, 0.5);
// 앞머리: 위쪽 가장자리는 뒷머리와 이어지게 테두리 없이 칠하고, 아래 가닥 끝에만 선을 긋는다
const FRINGE = "Q146,96 143,80 Q140,88 134,90 Q133,80 126,75 Q124,82 117,85 Q116,77 108,72 Q106,79 100,82 Q97,75 92,72 Q88,80 83,84 Q81,77 74,75 Q71,83 65,88 Q63,80 58,79 Q56,94 48,108";
const bangs = () =>
  S("M48,108 Q42,64 72,52 Q100,40 128,52 Q158,64 152,108 " + FRINGE + "Z", C.hair) + line("M152,108 " + FRINGE, C.ol, 2.6) +
  line("M78,60 Q86,56 92,58 M114,58 Q122,58 128,64 M58,74 Q56,82 57,90 M143,74 Q145,82 144,90", C.hairHi, 2);
const cheeks = (op = 0.6) => ell(69, 121, 8.5, 5.4, C.cheek, { sw: 0, op }) + ell(131, 121, 8.5, 5.4, C.cheek, { sw: 0, op });
const noseR = () => circ(100, 116, 6.6, C.nose, { sw: 2.2 }) + circ(98, 113.6, 2, C.noseL, { sw: 0 });
const EL = [82, 103], ER = [118, 103];
function eye([x, y], o = {}) {
  const rx = o.rx ?? 9, ry = o.ry ?? 10.4, pr = o.pr ?? 6, lx = o.look?.[0] ?? 0, ly = o.look?.[1] ?? 0;
  let s = ell(x, y, rx, ry, C.white, { sw: 2.4 });
  s += circ(x + lx, y + 1.5 + ly, pr, C.pupil, { sw: 0 });
  s += circ(x + lx - pr * 0.35, y - 0.5 + ly - pr * 0.35, pr * 0.38, C.white, { sw: 0 }) + circ(x + lx + pr * 0.4, y + 3 + ly, pr * 0.16, C.white, { sw: 0 });
  if (o.lid) s += p(`M${n(x - rx - 1.5)},${n(y - ry * 0.25)} Q${x},${n(y - ry - 3)} ${n(x + rx + 1.5)},${n(y - ry * 0.25)} Q${x},${n(y - ry * 0.55 + o.lid)} ${n(x - rx - 1.5)},${n(y - ry * 0.25)}Z`, C.skin, { sw: 2.2 });
  return s;
}
const eyeHappy = ([x, y]) => line(`M${x - 8},${y + 3} Q${x},${y - 8} ${x + 8},${y + 3}`, C.ol, 3.4);
const eyeShut = ([x, y]) => line(`M${x - 8},${y} Q${x},${y + 6} ${x + 8},${y}`, C.ol, 3.2);
const eyeSquint = ([x, y], side) => line(`M${x - 7 * side},${y - 6} L${x + 5 * side},${y} L${x - 7 * side},${y + 6}`, C.ol, 3.4);
const brow = (x, y, tilt = 0, raise = 0) => p(`M${x - 8},${n(y - raise + tilt)} Q${x},${n(y - raise - 4)} ${x + 8},${n(y - raise - tilt)} L${x + 7},${n(y - raise - tilt + 3.4)} Q${x},${n(y - raise - 0.6)} ${x - 7},${n(y - raise + tilt + 3.4)}Z`, C.hair, { sw: 1.4 });
const brows = (tilt = 0, raise = 0) => brow(82, 88, tilt, raise) + brow(118, 88, -tilt, raise);
const MY = 128;
const fangsUp = (y = MY + 2, dx = 9, h = 6) =>
  p(`M${100 - dx - 2.6},${y} L${100 - dx},${y - h} L${100 - dx + 2.6},${y}Z`, C.fang, { sw: 1.6 }) +
  p(`M${100 + dx - 2.6},${y} L${100 + dx},${y - h} L${100 + dx + 2.6},${y}Z`, C.fang, { sw: 1.6 });
const grin = () => line(`M86,${MY} Q100,${MY + 9} 114,${MY}`, C.ol, 2.8) + fangsUp(MY + 4.6, 9, 6);
function openMouth(w = 13, h = 14, tongue = true) {
  let s = p(`M${100 - w},${MY - 1} Q100,${MY + 3} ${100 + w},${MY - 1} Q${100 + w * 0.8},${MY + h} 100,${MY + h} Q${100 - w * 0.8},${MY + h} ${100 - w},${MY - 1}Z`, C.mouth, { sw: 2.4 });
  if (tongue) s += S(`M${n(100 - w * 0.55)},${n(MY + h * 0.78)} Q100,${n(MY + h * 0.35)} ${n(100 + w * 0.55)},${n(MY + h * 0.78)} Q100,${n(MY + h * 1.02)} ${n(100 - w * 0.55)},${n(MY + h * 0.78)}Z`, C.tongue);
  return s + fangsUp(MY + h - 1.4, w * 0.55, 5.4);
}

// ---- 효과 모양 ----
const qmark = (x, y) => limb(`M${x - 6},${y - 6} Q${x - 6},${y - 14} ${x + 1},${y - 14} Q${x + 8},${y - 14} ${x + 8},${y - 7} Q${x + 8},${y - 2} ${x + 1},${y + 1} L${x + 1},${y + 5}`, C.blue, 4.4) + circ(x + 1, y + 12, 3.4, C.blue, { sw: 2 });
const bang = (x, y) => p(`M${x - 3},${y - 16} L${x + 4},${y - 16} L${x + 1.5},${y + 3} L${x - 1},${y + 3}Z`, C.red, { sw: 2 }) + circ(x + 0.4, y + 9, 3, C.red, { sw: 2 });
const zee = (x, y, s) => limb(`M${x},${y} L${n(x + 8 * s)},${y} L${x},${n(y + 8 * s)} L${n(x + 8 * s)},${n(y + 8 * s)}`, C.blue, 2.6 * s);
const swoosh = (d) => line(d, C.ol, 4.6) + line(d, C.white, 2.4);

// ---- 표정·자세 12 ----
// armL/armR: [팔꿈치, 손, 손 모양] · club: [x, y, 각도, 길이, 층(ground/back/mid/front)] · legs: stand/run
// face: 얼굴 위 그림, top: 앞머리 위(눈썹), over: 얼굴 앞(손·고기), fx: 효과, free: 왼손에 의상 소품을 들 수 있음
const HIP = [66, 184], DOWN_L = [[64, 176], [62, 196]], DOWN_R = [[136, 176], [138, 196]];
const POSES = {
  proud: (X) => ({
    armL: [[52, 170], HIP, "fist"], armR: [[154, 170], [144, 152], "fist"], club: [144, 152, -72, 60, "front"], free: true,
    face: eye(EL, { look: [1.5, 0.5] }) + eye(ER, { look: [1.5, 0.5] }) + cheeks() + noseR() + line(`M85,${MY - 1} Q99,${MY + 9} 115,${MY - 4}`, C.ol, 2.8) + fangsUp(MY + 4, 9, 6),
    top: brow(82, 88, -1, 4) + brow(118, 88, 1, 2), fx: sparkle(30, 60, 6),
  }),
  cheer: (X) => ({
    armL: [[46, 140], [36, 104], "open"], armR: [[154, 140], [164, 104], "open"], club: [36, 246, -8, 56, "ground"],
    face: eyeHappy(EL) + eyeHappy(ER) + cheeks(0.8) + noseR() + openMouth(13, 15),
    top: brows(0, 4), fx: fire(166, 196, 1.15, "purple") + fire(28, 168, 0.6, "purple") + sparkle(170, 52, 6) + sparkle(30, 56, 5),
  }),
  wink: (X) => ({
    armL: [[44, 170], [50, 146], "peace"], armR: DOWN_R.concat("fist"), club: [138, 196, 78, 50, "mid"],
    face: eye(EL, { look: [0.5, 0] }) + line("M110,103 Q118,96 126,103", C.ol, 3.4) + line("M126,103 l4,-2", C.ol, 2.2) + cheeks(0.8) + noseR() +
      line(`M88,${MY} Q100,${MY + 8} 112,${MY}`, C.ol, 2.8) + p(`M98,${MY + 4} Q98,${MY + 15} 104,${MY + 15} Q110,${MY + 15} 109,${MY + 3}Z`, C.tongue, { sw: 2.2 }) + line(`M103.5,${MY + 6} L103.5,${MY + 11}`, C.mouth, 1.4) + fangsUp(MY + 4.2, 10, 5.4),
    top: brow(82, 86, 0, 2) + brow(118, 88, -1, 0), fx: sparkle(160, 50, 7) + sparkle(172, 70, 4),
  }),
  laugh: (X) => ({
    armL: [[64, 184], [86, 182], "fist"], armR: [[136, 184], [114, 182], "fist"], club: [150, 172, 76, 62, "back"],
    face: eyeSquint(EL, 1) + eyeSquint(ER, -1) + cheeks(0.85) + noseR() + openMouth(15, 17),
    top: brows(0, 5), fx: line("M30,92 l-8,-4 M30,104 l-9,0 M32,116 l-8,4 M170,92 l8,-4 M170,104 l9,0 M168,116 l8,4", C.ol, 2.6) + sparkle(160, 40, 5),
  }),
  think: (X) => ({
    armL: null, armR: [[150, 170], [134, 184], "fist"], club: [154, 176, 78, 60, "back"],
    face: eye(EL, { look: [3, -3], pr: 5 }) + eye(ER, { look: [3, -3], pr: 5 }) + cheeks(0.5) + noseR() + line(`M93,${MY + 3} Q99,${MY - 1} 107,${MY + 2}`, C.ol, 2.8) + fangsUp(MY + 2.6, 6, 4.6),
    top: brow(82, 88, 3, 0) + brow(118, 86, 1, 4),
    over: X.arm(SH_L, [56, 178], [90, 146]) + X.hand(90, 145, "fist"), fx: qmark(166, 48) + circ(150, 66, 2.4, C.blue, { sw: 1.4 }),
  }),
  surprise: (X) => ({
    armL: [[52, 160], [32, 166], "open"], armR: [[148, 160], [168, 166], "open"], club: [30, 246, -10, 54, "ground"],
    face: eye(EL, { rx: 10, ry: 12, pr: 3.6 }) + eye(ER, { rx: 10, ry: 12, pr: 3.6 }) + cheeks(0.45) + noseR() + ell(100, MY + 4, 5.6, 7, C.mouth, { sw: 2.4 }) + fangsUp(MY + 9.6, 3.2, 3.6),
    top: brows(0, 7), fx: fire(168, 210, 1, "blue") + bang(166, 46) + line("M152,36 l-4,-8 M176,52 l8,-4", C.ol, 2.4),
  }),
  run: (X) => ({
    armL: [[56, 166], [42, 158], "fist"], armR: [[144, 176], [154, 160], "fist"], club: [154, 160, -40, 52, "front"], legs: "run",
    face: eye(EL, { look: [3, 0], pr: 4.8 }) + eye(ER, { look: [3, 0], pr: 4.8 }) + cheeks(0.7) + noseR() + openMouth(7, 10, false),
    top: brows(-3, 3), fx: drop(44, 72, 1) + drop(156, 70, 0.9) + drop(36, 92, 0.7) + line("M18,170 l14,0 M14,184 l16,0 M22,198 l12,0", C.ol, 2.6) + ell(60, 246, 10, 5, C.gray, { sw: 1.6, op: 0.8 }) + ell(46, 242, 7, 4, C.gray, { sw: 1.6, op: 0.8 }),
  }),
  nervous: (X) => ({
    armL: [[96, 192], [124, 186], "fist"], armR: [[150, 178], [132, 170], "fist"], club: [136, 206, -82, 70, "front"],
    face: eye(EL, { pr: 3.4, look: [0, 1] }) + eye(ER, { pr: 3.4, look: [0, 1] }) + cheeks(0.45) + noseR() + line(`M86,${MY + 3} l4,-3 l4,3 l4,-3 l4,3 l4,-3 l4,3 l4,-3`, C.ol, 2.6) + fangsUp(MY + 2, 10, 5),
    top: brows(4, 3), fx: drop(62, 64, 1.1) + line("M28,130 q-4,4 0,8 q4,4 0,8 M20,150 q-4,4 0,8 q4,4 0,8 M174,170 q-4,4 0,8 q4,4 0,8 M180,196 q-4,4 0,8 q4,4 0,8", C.blue, 2.4),
  }),
  swing: (X) => ({
    armL: [[56, 176], [80, 168], "fist"], armR: [[166, 152], [156, 126], "fist"], club: [156, 126, -50, 54, "front"],
    face: eye(EL, { pr: 5.4, look: [1, 0] }) + eye(ER, { pr: 5.4, look: [1, 0] }) + cheeks(0.7) + noseR() + p(`M87,${MY - 1} L113,${MY - 1} Q112,${MY + 8} 100,${MY + 8} Q88,${MY + 8} 87,${MY - 1}Z`, C.white, { sw: 2.4 }) + line(`M88,${MY + 3} L112,${MY + 3} M94,${MY - 1} L94,${MY + 7} M100,${MY - 1} L100,${MY + 8} M106,${MY - 1} L106,${MY + 7}`, C.ol, 1.4) + fangsUp(MY + 4, 8, 5),
    top: brows(-5, 0), fx: swoosh("M174,58 Q202,86 192,140") + swoosh("M168,80 Q188,102 180,146") + line("M30,150 l-12,-4 M28,166 l-14,0 M30,182 l-12,4", C.ol, 2.6),
  }),
  eat: (X) => ({
    armL: [[58, 182], [86, 160], "fist"], armR: [[142, 182], [116, 160], "fist"], club: [150, 172, 76, 62, "back"], noHands: true,
    face: eyeHappy(EL) + eyeHappy(ER) + cheeks(0.9) + noseR() + openMouth(11, 13, false),
    over: p("M72,146 Q72,128 96,132 Q114,136 112,150 Q110,162 92,160 Q74,158 72,146Z", C.meat) + S("M80,140 Q86,134 96,137 Q90,141 80,144Z", C.meatL) +
      p("M110,146 L128,140 Q134,134 138,140 Q142,146 136,148 Q138,154 132,154 L112,154Z", C.bone, { sw: 2.2 }) + X.hand(86, 160, "fist") + X.hand(116, 160, "fist"),
    fx: heart(164, 56, 6) + heart(34, 64, 4.4) + line("M56,128 l-8,-3 M54,138 l-9,1", C.ol, 2.4),
  }),
  cry: (X) => ({
    armL: [[62, 176], [72, 192], "fist"], armR: [[138, 176], [128, 192], "fist"], club: [118, 247, -6, 54, "ground"],
    face: eyeShut([82, 103]) + eyeShut([118, 103]) + S("M76,106 Q74,128 78,142 L86,142 Q84,126 84,106Z", C.tear, 0.95) + S("M116,106 Q116,126 114,142 L122,142 Q126,128 124,106Z", C.tear, 0.95) + cheeks(0.6) + noseR() +
      p(`M88,${MY + 8} Q100,${MY - 4} 112,${MY + 8} Q100,${MY + 4} 88,${MY + 8}Z`, C.mouth, { sw: 2.4 }) + fangsUp(MY + 7, 7, 4),
    top: brows(5, 2), fx: drop(56, 134, 1, C.tear) + drop(146, 128, 1, C.tear) + drop(40, 150, 0.7, C.tear) + drop(160, 150, 0.7, C.tear),
  }),
  sleep: (X) => ({
    armL: [[64, 178], [64, 196], "fist"], armR: [[136, 178], [138, 196], "fist"], club: [52, 246, -72, 64, "back"], headTf: "rotate(-9 100 140)",
    face: eyeShut(EL) + eyeShut(ER) + cheeks(0.7) + noseR() + ell(104, MY + 4, 3.4, 3, C.mouth, { sw: 2 }) + fangsUp(MY + 7, 7, 4) + circ(108, 121, 7, C.fireBL, { sw: 1.6, op: 0.85 }) + circ(106, 118.6, 1.8, C.white, { sw: 0 }),
    top: brows(-1, 0), fx: zee(146, 54, 0.9) + zee(160, 34, 1.2) + zee(178, 12, 1.5),
  }),
};

// ---- 다리 ----
function oneLeg(x, o) {
  const pl = o.pants ?? C.pants;
  let s = p(`M${x - 12},190 Q${x - 16},212 ${x - 9},228 L${x + 9},228 Q${x + 16},212 ${x + 12},190 Z`, pl);
  s += S(`M${x + 4},196 Q${x + 9},212 ${x + 4},226 L${x + 9},226 Q${x + 14},212 ${x + 11},196Z`, o.pantsS ?? C.pantsS, 0.7);
  if (o.wrap !== false) s += p(`M${x - 8},226 L${x + 8},226 L${x + 7},240 L${x - 7},240Z`, C.wrap, { sw: 2.2 }) + line(`M${x - 7},230 L${x + 7},234 M${x - 7},235 L${x + 7},239`, C.hempS, 1.4);
  const ft = o.feet ?? "straw";
  if (ft === "straw") s += ell(x, 244, 13, 5, C.straw, { sw: 2.4 }) + ell(x, 241, 8, 4, C.skin, { sw: 2 }) + line(`M${x - 8},243 L${x - 2},239 M${x + 8},243 L${x + 2},239 M${x - 10},246 L${x + 10},246`, C.strawS, 1.6);
  else {
    const col = ft === "boot" ? C.brown : ft === "flower" ? C.pink : C.black;
    if (ft === "boot") s += p(`M${x - 9},226 L${x + 9},226 L${x + 10},240 L${x - 10},240Z`, C.brown) + p(`M${x - 10},226 Q${x},220 ${x + 10},226 L${x + 10},231 Q${x},226 ${x - 10},231Z`, C.white, { sw: 2 });
    s += p(`M${x - 13},246 Q${x - 13},238 ${x},238 Q${x + 13},238 ${x + 14},245 L${x + 14},248 L${x - 13},248Z`, col);
    if (ft === "flower") s += circ(x + 3, 242, 2.4, C.yellow, { sw: 1.2 });
  }
  return s;
}
function legs(o, kind) {
  if (kind === "run") return g("rotate(32 88 194)", oneLeg(88, o)) + g("rotate(-26 112 194)", oneLeg(112, o));
  return oneLeg(88, o) + oneLeg(112, o);
}

// ---- 의상 조각 ----
const raggedHem = "L62,198 l5,4 l5,-4 l6,5 l5,-4 l6,4 l6,-3 l6,4 l5,-4 l6,4 l6,-4 l5,4 l6,-4 l5,4 L138,198";
const torso = (col, hem = raggedHem) => p(`M74,144 Q64,148 63,162 ${hem} L137,162 Q136,148 126,144 Q100,138 74,144 Z`, col);
const collar = (col = "#5B6B57") => p("M86,142 L100,170 L112,142 L106,142 L100,158 L92,142Z", col, { sw: 2 }) + p("M99,168 Q92,174 90,184 M99,168 Q104,176 103,186", "none", { sw: 2.2 }) + line("M99,168 Q92,174 90,184 M99,168 Q104,176 103,186", col, 1.4);
const vest = (col = C.fur, lt = C.furL) =>
  p("M74,144 Q64,148 63,162 L62,196 l4,4 l4,-5 l4,5 l4,-5 l4,4 L84,150 Q80,144 74,144Z", col) +
  p("M126,144 Q136,148 137,162 L138,196 l-4,4 l-4,-5 l-4,5 l-4,-5 l-4,4 L116,150 Q120,144 126,144Z", col) +
  line("M70,160 l4,6 M66,176 l5,5 M76,184 l3,6 M130,160 l-4,6 M134,176 l-5,5 M124,184 l-3,6", lt, 2.2);
const ropeBelt = (col = C.rope) =>
  p("M63,178 Q100,184 137,178 L137,187 Q100,193 63,187Z", col, { sw: 2.2 }) + line("M70,180 l-3,7 M80,181 l-3,7 M90,182 l-3,7 M110,182 l-3,7 M120,181 l-3,7 M130,180 l-3,7", C.ropeS, 1.6) +
  circ(92, 186, 4.4, col, { sw: 2 }) + line("M90,189 Q86,198 88,206 M94,189 Q96,198 94,208", C.ol, 4.6) + line("M90,189 Q86,198 88,206 M94,189 Q96,198 94,208", col, 2.6);
const patch = (x, y, col = C.hempS) => p(`M${x},${y} l9,-1 l1,8 l-9,1Z`, col, { sw: 1.6 }) + line(`M${x + 1},${y + 2} l2,0 M${x + 5},${y + 1} l2,0`, C.ol, 1);
const longRobe = (col, shade, hemY = 232) =>
  p(`M74,144 Q63,148 62,162 L56,${hemY} Q100,${hemY + 6} 144,${hemY} L138,162 Q137,148 126,144 Q100,138 74,144Z`, col) +
  S(`M116,150 L128,${hemY} L140,${hemY - 1} L134,160Z`, shade, 0.5) + line(`M100,160 L100,${hemY + 2}`, shade, 2);
const apron = (col, shade, top = 168, bot = 224) =>
  p(`M74,${top} L126,${top} L132,${bot} Q100,${bot + 5} 68,${bot}Z`, col) + S(`M118,${top + 2} L124,${top + 2} L130,${bot - 1} L122,${bot}Z`, shade, 0.6);

// ---- 소품(왼손) ----
const abacus = (x, y) => {
  let s = p(`M${x - 18},${y - 2} L${x + 6},${y - 2} L${x + 6},${y + 22} L${x - 18},${y + 22}Z`, C.brown) + p(`M${x - 15},${y + 1} L${x + 3},${y + 1} L${x + 3},${y + 19} L${x - 15},${y + 19}Z`, C.cream, { sw: 1.6 });
  s += line(`M${x - 15},${y + 7} L${x + 3},${y + 7}`, C.brownS, 2);
  for (const bx of [-12, -6, 0]) s += circ(x + bx, y + 4, 2.2, C.red, { sw: 1 }) + circ(x + bx, y + 12, 2.2, C.red, { sw: 1 }) + circ(x + bx, y + 16.4, 2.2, C.red, { sw: 1 });
  return s;
};
const fan = (x, y) => p(`M${x},${y} L${x - 26},${y + 4} Q${x - 26},${y + 22} ${x - 14},${y + 28}Z`, C.cream) + line(`M${x},${y} L${x - 22},${y + 10} M${x},${y} L${x - 18},${y + 20}`, C.creamS, 1.4) + line(`M${x - 22},${y + 6} q3,6 0,12`, C.green, 2);
const ropeCoil = (x, y) => circ(x - 6, y + 12, 11, "none", { stroke: C.redS, sw: 5 }) + circ(x - 6, y + 12, 11, "none", { stroke: C.red, sw: 3 }) + circ(x - 6, y + 12, 6, "none", { stroke: C.red, sw: 3 }) + line(`M${x - 4},${y + 22} q4,8 -2,14`, C.red, 3);
const magnifier = (x, y) => limb(`M${x},${y} L${x - 6},${y + 18}`, C.brownS, 4) + circ(x + 6, y - 14, 12, C.lens, { sw: 3.2 }) + circ(x + 6, y - 14, 12, "none", { stroke: C.gold, sw: 2 }) + line(`M${x + 1},${y - 20} q3,-3 7,-2`, C.white, 2.2);
const ladle = (x, y) => limb(`M${x + 2},${y - 22} L${x - 2},${y + 18}`, C.brown, 3.4) + p(`M${x - 13},${y + 16} Q${x - 13},${y + 30} ${x - 1},${y + 30} Q${x + 11},${y + 30} ${x + 11},${y + 16}Z`, C.gray);
const pouch = (x, y) => p(`M${x - 8},${y + 4} Q${x - 18},${y + 26} ${x},${y + 28} Q${x + 18},${y + 26} ${x + 8},${y + 4}Z`, C.red) + line(`M${x - 8},${y + 5} Q${x},${y + 9} ${x + 8},${y + 5}`, C.gold, 2.4) + circ(x, y + 18, 3.4, C.gold, { sw: 1.4 });
const book = (x, y) => p(`M${x - 18},${y - 2} L${x + 2},${y - 4} L${x + 4},${y + 22} L${x - 16},${y + 24}Z`, C.navy) + line(`M${x - 14},${y + 1} L${x - 13},${y + 21}`, C.gold, 1.6) + p(`M${x - 8},${y + 2} L${x - 2},${y + 1} L${x - 1},${y + 11} L${x - 7},${y + 12}Z`, C.cream, { sw: 1.2 });
const scroll = (x, y) => p(`M${x - 22},${y - 2} L${x + 6},${y + 4} L${x + 3},${y + 14} L${x - 25},${y + 8}Z`, C.cream) + ell(x + 4.5, y + 9, 4, 5.6, C.creamS, { sw: 2, rot: 12 }) + p(`M${x - 10},${y + 1} L${x - 8},${y + 12} L${x - 13},${y + 18} M${x - 8},${y + 12} L${x - 3},${y + 18}`, "none", { stroke: C.red, sw: 2.6 });

// ---- 의상 10벌 ----
const OUTFITS = {
  basic: {
    body: () => torso(C.hemp) + collar() + vest() + ropeBelt() + patch(116, 166),
  },
  merchant: {
    sleeve: "#C9D3D8", prop: abacus,
    body: () => torso("#C9D3D8") + collar(C.navy) + apron("#4F5E86", "#38456A", 170, 222) + line("M74,170 Q100,174 126,170", C.ol, 2) + ropeBelt() + p("M108,196 L120,196 L120,206 L108,206Z", C.gold, { sw: 1.6 }),
    hat: () => ell(100, 44, 52, 10, C.straw) + p("M78,44 L85,12 Q100,7 115,12 L122,44Z", C.straw) + line("M82,28 L118,28 M80,37 L120,37 M93,10 L90,43 M107,10 L110,43", C.strawS, 1.4) + line("M50,46 Q100,58 150,46", C.strawS, 1.6) + circ(118, 32, 6, C.white, { sw: 1.8 }) + circ(124, 26, 5, C.white, { sw: 1.8 }) + circ(126, 34, 4.6, C.white, { sw: 1.8 }) + p("M84,40 L116,40 L117,44 L83,44Z", C.blue, { sw: 1.6 }),
  },
  seonbi: {
    sleeve: C.jade, prop: fan, legs: { feet: "shoe", wrap: false, pants: C.grayL, pantsS: C.gray },
    body: () => longRobe(C.jade, C.jadeS) + p("M86,142 L100,172 L112,142 L106,142 L100,158 L92,142Z", C.white, { sw: 2 }) + p("M66,170 Q100,176 134,170 L134,175 Q100,181 66,175Z", C.navy, { sw: 1.8 }) + line("M96,176 Q92,196 94,214 M100,176 Q102,198 100,216", C.navy, 2.4),
    hat: () => ell(100, 44, 66, 11, C.black, { op: 0.85 }) + ell(100, 44, 52, 7, "none", { stroke: C.blackL, sw: 1.4 }) + p("M83,44 L85,-2 Q100,-7 115,-2 L117,44Z", C.black, { op: 0.92 }) + line("M84,36 L116,36", C.blackL, 4) + line("M86,6 L114,6", C.blackL, 1.4) + line("M46,50 Q50,112 84,142 M154,50 Q150,112 116,142", C.black, 1.8, ` stroke-dasharray="1 3.4"`),
  },
  podol: {
    sleeve: C.red, prop: ropeCoil, legs: { pants: "#8D93A6" },
    body: () => torso(C.navy, "L60,214 Q100,220 140,214") + line("M100,150 L100,216", C.navyS, 2.4) + p("M86,142 L100,166 L112,142 L106,142 L100,156 L92,142Z", C.white, { sw: 2 }) + p("M62,178 Q100,186 138,178 L138,188 Q100,196 62,188Z", C.red, { sw: 2 }) + line("M108,190 Q110,204 106,214 M112,190 Q116,202 114,212", C.red, 3),
    hat: () => ell(100, 46, 54, 10, C.black) + p("M74,46 Q74,8 100,8 Q126,8 126,46Z", C.black) + line("M78,38 Q100,44 122,38", C.blackL, 2.4) + line("M84,18 Q100,12 116,18", C.blackL, 1.6) + p("M94,9 Q88,-4 100,-10 Q112,-4 106,9Z", C.red, { sw: 2 }) + line("M100,6 Q90,14 84,30 M100,6 Q110,14 116,30 M100,6 L100,24", C.red, 2.8) + circ(100, 30, 6, C.gold, { sw: 2 }) + circ(100, 30, 2.4, C.red, { sw: 0 }),
  },
  detective: {
    sleeve: C.brown, prop: magnifier, legs: { feet: "shoe" },
    body: () => longRobe(C.brown, C.brownS, 222) + p("M70,144 Q58,150 56,176 Q100,186 144,176 Q142,150 130,144 Q100,136 70,144Z", "#8C6239") + line("M64,156 L136,156 M60,168 L140,168 M78,144 L74,180 M100,140 L100,182 M122,144 L126,180", C.check, 1.2) + p("M88,142 L100,156 L112,142Z", C.cream, { sw: 2 }) + circ(100, 196, 2.4, C.gold, { sw: 1.4 }) + circ(100, 208, 2.4, C.gold, { sw: 1.4 }),
    hat: () => p("M60,50 Q58,6 100,6 Q142,6 140,50 Q100,58 60,50Z", "#8C6239") + p("M60,50 Q70,64 94,58 Q76,50 60,50Z", "#8C6239", { sw: 2.2 }) + line("M66,30 Q100,22 134,30 M62,42 Q100,34 138,42 M84,8 L78,54 M116,8 L122,54 M100,6 L100,56", C.check, 1.4) + p("M62,30 Q50,40 54,56 L62,52Z", "#8C6239", { sw: 2 }) + p("M138,30 Q150,40 146,56 L138,52Z", "#8C6239", { sw: 2 }) + p("M92,8 Q100,-4 108,8", "none", { sw: 2.4 }) + circ(100, 5, 3.6, C.brownS, { sw: 1.8 }),
  },
  winter: {
    sleeve: "#C8544A", hand: C.red, legs: { feet: "boot", wrap: false, pants: "#7B6A5E", pantsS: "#5E5046" },
    body: () => torso("#C8544A", "L62,206 Q100,212 138,206") + line("M72,160 L128,160 M66,176 L134,176 M64,192 L136,192", "#A63F38", 1.6) + line("M100,148 L100,208", "#A63F38", 2) + p("M70,144 Q100,160 130,144 Q136,152 128,158 Q100,170 72,158 Q64,152 70,144Z", C.cream) + line("M76,152 l3,3 M88,158 l2,3 M112,158 l-2,3 M124,152 l-3,3", C.creamS, 2),
    hat: () => p("M56,58 Q52,10 100,6 Q148,10 144,58Z", "#C8544A") + line("M78,14 Q72,34 72,52 M100,8 L100,52 M122,14 Q128,34 128,52", "#A63F38", 1.8) + p("M52,56 Q100,42 148,56 L148,70 Q100,56 52,70Z", C.cream) + circ(100, 4, 10, C.cream) + line("M60,62 l2,2 M80,56 l2,2 M100,54 l2,2 M120,56 l2,2 M140,62 l2,2", C.creamS, 2),
    fx: () => sparkle(28, 40, 5, C.white) + sparkle(176, 120, 4.4, C.white) + sparkle(22, 140, 3.6, C.white),
  },
  gukbap: {
    sleeve: C.hemp, prop: ladle, short: true,
    body: () => torso(C.hemp) + collar() + apron(C.white, C.grayL, 150, 226) + line("M74,150 Q86,140 92,140 M126,150 Q114,140 108,140", C.ol, 1.8) + ropeBelt(C.white) + p("M118,144 Q132,140 138,152 L134,176 L126,172Z", C.cream, { sw: 2 }) + line("M126,152 L132,154 M124,160 L131,163", C.blue, 1.4),
    hat: () => p("M48,66 Q52,42 100,40 Q148,42 152,66 Q100,54 48,66Z", C.white) + p("M50,66 Q100,54 150,66 L150,74 Q100,62 50,74Z", C.white, { sw: 2 }) + line("M56,56 Q100,46 144,56", C.grayL, 2) + p("M148,62 Q164,54 170,66 Q162,72 152,70Z", C.white, { sw: 2 }) + p("M150,68 Q162,76 162,88 Q154,84 148,72Z", C.white, { sw: 2 }),
    fx: () => line("M36,174 q-5,-6 0,-12 q5,-6 0,-12 M46,170 q-4,-5 0,-10 q4,-5 0,-10", C.gray, 2.4),
  },
  seolbim: {
    sleeve: C.pink, bands: [C.yellow, C.green, C.blue, C.red], prop: pouch, legs: { pants: C.cream, pantsS: C.creamS, feet: "flower", wrap: false },
    body: () => torso(C.yellow, "L62,200 Q100,206 138,200") + p("M74,144 Q64,148 63,162 L62,206 Q100,212 138,206 L137,162 Q136,148 126,144 L112,144 L100,168 L88,144Z", C.navy) + line("M100,168 L100,208 M66,206 Q100,212 134,206", C.gold, 2.4) + p("M88,144 L100,168 L112,144 L106,144 L100,158 L94,144Z", C.white, { sw: 1.8 }) + circ(100, 186, 4.4, C.gold, { sw: 1.6 }),
    hat: () => p("M52,76 Q42,6 100,2 Q158,6 148,76 Q100,52 52,76Z", C.navy) + line("M100,4 L100,58 M70,20 Q60,44 58,66 M130,20 Q140,44 142,66", C.navyS, 2) + p("M54,72 Q100,50 146,72 L146,78 Q100,58 54,78Z", C.gold, { sw: 2 }) + p("M142,74 Q158,92 154,118 L146,114 Q146,94 134,80Z", C.navy) + p("M58,74 Q42,92 46,118 L54,114 Q54,94 66,80Z", C.navy) + circ(100, 30, 5, C.red, { sw: 1.8 }),
  },
  hunjang: {
    sleeve: "#E9E4D6", prop: book, legs: { feet: "shoe", wrap: false, pants: C.grayL, pantsS: C.gray },
    body: () => longRobe("#E9E4D6", "#C9C2AE") + p("M86,142 L100,170 L112,142 L106,142 L100,158 L92,142Z", C.blackL, { sw: 2 }) + line("M100,170 Q94,180 94,192 M100,170 Q104,182 102,192", C.blackL, 2.4),
    beard: () => p("M90,138 Q100,145 110,138 Q112,154 100,166 Q88,154 90,138Z", C.white, { sw: 2.2 }) + line("M96,146 L98,158 M104,146 L102,158", C.grayL, 1.4),
    hat: () => p("M70,56 L70,24 L85,10 L100,24 L115,10 L130,24 L130,56 Q100,62 70,56Z", "#3A3A48") + p("M84,24 L100,-8 L116,24Z", "#3A3A48") + line("M70,46 Q100,52 130,46 M85,10 L85,54 M115,10 L115,54 M92,10 L100,0 L108,10", C.blackL, 1.8) + line("M72,30 L128,30", "#5C5C6C", 1.4),
  },
  graduate: {
    sleeve: C.black, prop: scroll, legs: { feet: "shoe", wrap: false, pants: C.blackL, pantsS: C.black },
    body: () => longRobe(C.black, C.blackL, 226) + p("M82,142 L100,176 L118,142 L130,146 L100,188 L70,146Z", C.blue, { sw: 2 }) + p("M88,142 L100,164 L112,142Z", C.white, { sw: 2 }) + line("M76,160 Q100,166 124,160", C.gold, 2),
    hat: () => p("M74,30 L74,52 Q100,60 126,52 L126,30Z", C.black) + p("M46,30 L100,8 L154,30 L100,52Z", C.black) + line("M54,30 L100,12 L146,30", C.blackL, 2) + circ(100, 30, 3.4, C.gold, { sw: 1.4 }) + line("M100,30 Q132,36 146,46 L146,70", C.gold, 2.8) + p("M141,68 L151,68 L150,84 L142,84Z", C.gold, { sw: 1.6 }),
  },
};

function clampSize(v) {
  const x = v === null || v === undefined || v === "" || typeof v === "object" ? NaN : Number(v);
  if (!Number.isFinite(x) || x <= 0) return 160;
  return Math.min(2048, Math.max(1, x));
}

// class="dueogi"·g.dueogi-body·g.dueogi-fx는 화면 쪽 움직임을 거는 고리다(리아와 같은 약속)
export function dueogiSVG(opts) {
  const { face = "proud", outfit = "basic", size = 160 } = opts ?? {};
  const fid = typeof face === "string" && Object.hasOwn(POSES, face) ? face : "proud";
  const oid = typeof outfit === "string" && Object.hasOwn(OUTFITS, outfit) ? outfit : "basic";
  const o = OUTFITS[oid], lg = o.legs ?? {}, hc = o.hand ?? C.skin;
  const bez = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const X = {
    arm: (sh, el, hd) => {
      if (!o.short) return arm(sh, el, hd, o);
      const m = [bez(sh[0], el[0], hd[0], 0.42), bez(sh[1], el[1], hd[1], 0.42)];
      return arm(sh, el, hd, { sleeve: C.skin }) + limb(`M${sh[0]},${sh[1]} L${n(m[0])},${n(m[1])}`, o.sleeve, 15);
    },
    hand: (x, y, k) => hand(x, y, k, hc),
  };
  const ps = POSES[fid](X);
  const [cx, cy, ca, cl, layer] = ps.club;
  const cb = club(cx, cy, ca, cl);
  const at = (L) => (layer === L ? cb : "");
  // 왼손이 비는 자세(의기양양·윙크)에서는 의상 소품을 든다
  const useProp = ps.free && o.prop;
  const armL = useProp ? [[54, 176], [60, 194], "fist"] : ps.armL;
  const hT = ps.headTf;
  const armStr = (a, sh) => (a ? X.arm(sh, a[0], a[1]) : "");
  const handStr = (a) => (a ? X.hand(a[1][0], a[1][1], a[2]) : "");
  const head = ears() + faceBase() + ps.face + bangs() + (ps.top ?? "") + (o.beard ? o.beard() : "");
  const hatS = o.hat ? o.hat() : "";
  const parts = [
    ell(100, 248, 40, 5, C.shadow, { sw: 0, op: 0.13 }),
    at("ground"),
    g(hT, backHair()),
    hatS ? "" : g(hT, horns()),
    at("back"),
    legs(lg, ps.legs),
    o.body(),
    armStr(armL, SH_L), armStr(ps.armR, SH_R),
    at("mid"),
    g(hT, head),
    at("front"),
    useProp ? o.prop(60, 194) : "",
    ps.noHands ? "" : handStr(armL) + handStr(ps.armR),
    hatS ? g(hT, hatS + horns()) : "",
    ps.over ?? "",
  ];
  const fx = (ps.fx ?? "") + (o.fx ? o.fx() : "");
  if (fx) parts.push(`<g class="dueogi-fx">${fx}</g>`);
  const label = `두억이, ${FACE_KO[fid]}, ${OUTFIT_KO[oid]}`;
  // 그림 좌표는 모자 끝(y≈-12)부터 그림자(y≈253)까지라 살짝 줄여 틀 안에 넣는다
  return `<svg xmlns="http://www.w3.org/2000/svg" class="dueogi" viewBox="0 0 ${W} ${H}" width="${n(clampSize(size))}" height="${n((clampSize(size) * H) / W)}" role="img" aria-label="${label}"><title>${label}</title><g class="dueogi-body"><g transform="translate(8 16) scale(0.92)">${parts.join("")}</g></g></svg>`;
}
