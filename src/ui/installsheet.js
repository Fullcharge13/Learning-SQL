// 「홈 화면에 추가」 안내 시트: 두억이 + 그림 3단계 + 이유 (v0.3.1: 안드로이드 크롬 안내·「바로 설치」 단추·둘 다 보기)
import { dueogiSVG } from "../dueogi.js";
import { FACES } from "../say.js";
import { el, esc, icon } from "./dom.js";
import { INSTALL_AFTER_TEXT } from "../install.js";

const SHARE = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" stroke="#22304A" stroke-width="2.5"/><path d="M24 12v17M18 18l6-6 6 6" fill="none" stroke="#2F7BE0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 23h-2v13h18V23h-2" fill="none" stroke="#2F7BE0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ADD = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" stroke="#22304A" stroke-width="2.5"/><rect x="14" y="14" width="20" height="20" rx="5" fill="none" stroke="#22304A" stroke-width="2.5"/><path d="M24 19v10M19 24h10" stroke="#22304A" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const DONE = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" stroke="#22304A" stroke-width="2.5"/><text x="24" y="29" text-anchor="middle" font-size="12" font-weight="800" fill="#2F7BE0" font-family="-apple-system, sans-serif">추가</text></svg>`;

const STEPS = [
  [SHARE, "공유 버튼(안 보이면 ··· 메뉴 안)을 눌러요"],
  [ADD, "「홈 화면에 추가」를 골라요"],
  [DONE, "오른쪽 위 「추가」를 눌러요"],
];

const WHY = "사파리에서는 7일 동안 열지 않으면 기록이 지워질 수 있어요. 홈 화면에 추가하면 더 안전하게 남아요.";

// 안드로이드 크롬(삼성 인터넷도 메뉴 이름만 다름): ⋮ 메뉴 → 「홈 화면에 추가」 또는 「앱 설치」(크롬 판에 따라 이름이 다름) → 설치
const MENU = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" stroke="#22304A" stroke-width="2.5"/><circle cx="24" cy="15" r="3" fill="#22304A"/><circle cx="24" cy="24" r="3" fill="#22304A"/><circle cx="24" cy="33" r="3" fill="#22304A"/></svg>`;
const PHONE = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" stroke="#22304A" stroke-width="2.5"/><rect x="16" y="11" width="16" height="26" rx="3" fill="none" stroke="#22304A" stroke-width="2.5"/><path d="M24 18v9M20 23l4 4 4-4" fill="none" stroke="#1E8E5A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const INSTALL = `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" stroke="#22304A" stroke-width="2.5"/><text x="24" y="29" text-anchor="middle" font-size="12" font-weight="800" fill="#1E8E5A" font-family="sans-serif">설치</text></svg>`;
const ANDROID_STEPS = [
  [MENU, "오른쪽 위 ⋮ 메뉴를 눌러요(삼성 인터넷은 아래 ≡ 메뉴)"],
  [PHONE, "「홈 화면에 추가」 또는 「앱 설치」를 골라요"],
  [INSTALL, "「설치」 또는 「추가」를 눌러요"],
];
const ANDROID_WHY = "홈 화면에 추가하면 앱처럼 바로 열리고, 인터넷이 없어도 열려요.";

const stepsHTML = (steps) => `<ol class="ins-steps">${steps.map(([svg, text], i) => `<li><span class="ins-no" aria-hidden="true">${i + 1}</span>${svg}<span>${esc(text)}</span></li>`).join("")}</ol>`;
const promptHTML = (on) => (on ? `<button class="btn primary wide ins-prompt" id="ins-prompt">${icon("play")}<span>바로 설치하기</span></button>` : "");
const afterHTML = () => `<p class="ins-after">${icon("play")}<span>${esc(INSTALL_AFTER_TEXT)}</span></p>`;
const head = (outfit, face, line) => `<div class="dueogi-row">
          <div class="dueogi-wrap">${dueogiSVG({ outfit, face, size: 72 })}</div>
          <p class="bubble">${esc(line)}</p>
        </div>`;

function androidBody(outfit, canPrompt) {
  return `${head(outfit, FACES.install, "홈 화면에 나를 데려가 줘요. 앱처럼 바로 열 수 있어요.")}
        <h2 id="ins-title">홈 화면에 추가하기</h2>
        ${promptHTML(canPrompt)}
        ${stepsHTML(ANDROID_STEPS)}
        ${afterHTML()}
        <p class="ins-why">${esc(ANDROID_WHY)}</p>`;
}

// 기기를 알 수 없을 때(PC·iOS용 다른 브라우저 등): 두 방법을 다
function bothBody(outfit, canPrompt) {
  return `${head(outfit, FACES.install, "휴대폰 홈 화면에 나를 데려가 줘요. 앱처럼 바로 열 수 있어요.")}
        <h2 id="ins-title">홈 화면에 추가하기</h2>
        ${promptHTML(canPrompt)}
        <h3 class="ins-sub">아이폰(사파리)</h3>
        ${stepsHTML(STEPS)}
        <h3 class="ins-sub">안드로이드(크롬)</h3>
        ${stepsHTML(ANDROID_STEPS)}
        ${afterHTML()}
        <p class="ins-why">${esc(WHY)}</p>`;
}

function safariBody(outfit) {
  return `<div class="dueogi-row">
          <div class="dueogi-wrap">${dueogiSVG({ outfit, face: FACES.install, size: 72 })}</div>
          <p class="bubble">홈 화면에 나를 데려가 줘요. 앱처럼 바로 열 수 있어요.</p>
        </div>
        <h2 id="ins-title">홈 화면에 추가하기</h2>
        ${stepsHTML(STEPS)}
        <p class="ins-after">${icon("play")}<span>${esc(INSTALL_AFTER_TEXT)}</span></p>
        <p class="ins-why">${esc(WHY)}</p>`;
}

// 카카오톡 등 앱 안 브라우저: 홈 화면 추가가 안 되므로 사파리(안드로이드는 크롬)로 열라는 짧은 안내
function inAppBody(outfit, android) {
  const app = android ? "크롬" : "Safari";
  return `${head(outfit, FACES.waiting, "지금은 앱 안의 브라우저로 보고 있어요.")}
        <h2 id="ins-title">${app}에서 열어야 홈 화면에 추가할 수 있어요</h2>
        <p class="ins-menu"><span class="ins-dots" aria-hidden="true">···</span><span>${esc(`화면의 … 메뉴 → 「다른 브라우저로 열기」 또는 「${app}로 열기」를 눌러요`)}</span></p>
        <p class="ins-why">${esc(android ? ANDROID_WHY : WHY)}</p>`;
}

/** 안내 시트 속 HTML(순수 — 시험용). kind: "safari" | "android" | "inapp" | "both" */
export function installSheetHTML({ kind = "safari", outfit, canPrompt = false, android = false }) {
  if (kind === "inapp") return inAppBody(outfit, android);
  if (kind === "android") return androidBody(outfit, canPrompt);
  if (kind === "both") return bothBody(outfit, canPrompt);
  return safariBody(outfit);
}

/** 안내 시트를 연다. kind: "safari"(기본) | "android" | "inapp" | "both".
 *  onPrompt가 있으면(크롬이 설치 창을 띄울 수 있을 때) 「바로 설치하기」 단추 — 누르면 설치 창을 띄우고 시트를 닫는다. 닫히면 resolve */
export function openInstallSheet({ outfit, kind = "safari", android = false, onPrompt = null }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const k = ["safari", "android", "inapp", "both"].includes(kind) ? kind : "safari";
    const canPrompt = typeof onPrompt === "function" && k !== "inapp" && k !== "safari";
    const wrap = el(`<div class="modal-back" role="presentation">
      <div class="modal install ${k}" role="dialog" aria-modal="true" aria-labelledby="ins-title">
        ${installSheetHTML({ kind: k, outfit, canPrompt, android })}
        <button class="btn ${canPrompt ? "ghost" : "primary"} wide" id="ins-ok">알겠어요</button>
      </div></div>`);
    const close = () => {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
      resolve();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    wrap.addEventListener("click", (e) => {
      if (canPrompt && e.target.closest("#ins-prompt")) { close(); onPrompt(); return; }
      if (e.target === wrap || e.target.closest("#ins-ok")) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    wrap.querySelector("#ins-ok").focus({ preventScroll: true });
  });
}
