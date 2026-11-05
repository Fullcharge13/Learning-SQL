// 인사 화면: 인사 + SQL 실행기 미리 받기 진행 표시. 준비를 기다리지 않고 바로 시작할 수 있다.
import { dueogiSVG } from "../dueogi.js";
import { FACES } from "../say.js";
import { esc } from "./dom.js";

export function render(root, ctx) {
  const line = ctx.say("greet");
  root.innerHTML = `<main class="screen splash">
    <div class="splash-hero">
      <div class="dueogi-wrap big">${dueogiSVG({ outfit: ctx.save.outfit, face: FACES.home, size: 200 })}</div>
      <h1 class="logo">두억이와 SQL<span class="bang">!</span></h1>
      <p class="tagline">하루 10분, 도깨비 장터 장부로 배우는 첫 SQL</p>
    </div>
    <p class="bubble center">${esc(line.text)}</p>
    <div class="load" aria-live="polite">
      <div class="load-bar" data-state="loading"><span></span></div>
      <p class="load-text">실행기 준비 중… 먼저 시작해도 괜찮아요</p>
    </div>
    <button class="btn primary wide" id="go">시작하기</button>
    <p class="ver">${esc(ctx.version)}</p>
  </main>`;
  const barEl = root.querySelector(".load-bar");
  const text = root.querySelector(".load-text");
  const paint = (status) => {
    barEl.dataset.state = status;
    text.textContent = status === "ready" ? "실행기 준비 완료"
      : status === "failed" ? "실행기를 아직 못 받았어요. 조립 문제에서 다시 시도해요"
      : "실행기 준비 중… 먼저 시작해도 괜찮아요";
  };
  paint(ctx.sql ? ctx.sql.status : "loading");
  const off = ctx.sql ? ctx.sql.listen((s) => paint(s)) : () => {};
  root.querySelector("#go").addEventListener("click", () => ctx.show("home"));
  return off;
}
