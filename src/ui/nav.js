// 아래 탭 줄과 위 상태 줄 (홈·배지·의상실·설정에서 같이 씀)
import { icon, esc, bar, toast } from "./dom.js";
import { localDate } from "../today.js";
import { stallTab } from "../stall/state.js";

// v0.3.2: 「가게」 칸(학습과 배지 사이). 가게 화면 안에서는 탭 줄을 그리지 않는다(레슨처럼 몰입 화면)
const TABS = [
  ["home", "학습", "path"],
  ["stall", "가게", "shop"],
  ["badges", "배지", "badge"],
  ["closet", "의상실", "hanger"],
  ["settings", "설정", "gear"],
];
// 가게 칸에서 들어갈 수 있는 화면(가게의 「<」가 돌아갈 곳)
export const TAB_SCREENS = TABS.map(([id]) => id).filter((id) => id !== "stall");
export const STALL_LOCKED = "가게는 3장 평가를 통과하면 열려요";

/** 가게 칸 상태 { open, dot }: 통과한 장(개발자 모드면 모든 장)과 가게 저장으로(stall/state.js stallTab) */
export function stallTabOf(ctx) {
  if (!ctx || typeof ctx.stallPassed !== "function") return { open: true, dot: false };
  return stallTab(ctx.save, ctx.stallPassed());
}

/** stall: { open, dot } — 잠김이면 자물쇠·흐림·aria-disabled, 새 소식이면 빨간 점 */
export function tabBar(active, stall = { open: true, dot: false }) {
  return `<nav class="tabbar" aria-label="화면 이동">${TABS.map(([id, label, ic]) => {
    const locked = id === "stall" && !stall.open;
    const dot = id === "stall" && stall.open && stall.dot;
    const aria = locked ? ` aria-disabled="true" aria-label="${esc(`${label}, 잠김, 3장 평가를 통과하면 열려요`)}" data-locked="1"`
      : dot ? ` aria-label="${esc(`${label}, 새 소식 있음`)}"` : "";
    const badge = locked ? `<span class="tab-lock" aria-hidden="true">${icon("lock")}</span>`
      : dot ? '<span class="tab-dot" aria-hidden="true"></span>' : "";
    return `<button class="tab${id === active ? " on" : ""}${locked ? " locked" : ""}" data-go="${id}"${aria}${id === active ? ' aria-current="page"' : ""}><span class="tab-ic">${icon(ic)}${badge}</span><span>${esc(label)}</span></button>`;
  }).join("")}</nav>`;
}

export function bindTabs(root, ctx) {
  const here = root.querySelector('.tabbar [aria-current="page"]')?.dataset.go || "home";
  root.querySelectorAll(".tabbar [data-go]").forEach((b) => b.addEventListener("click", () => {
    if (b.getAttribute("aria-current") === "page") return;
    if (b.dataset.locked) { toast(STALL_LOCKED); return; }   // 잠긴 가게: 알림만, 화면은 그대로
    ctx.show(b.dataset.go, b.dataset.go === "stall" ? { from: here } : {});
  }));
}

/** 연속 기록·엽전·XP와 오늘 목표 */
export function statusBar(save) {
  const goal = [10, 20, 30].includes(save.settings.dailyGoal) ? save.settings.dailyGoal : 20;
  const todayXp = save.streak.todayDate === localToday() ? Math.max(0, save.streak.todayXp || 0) : 0;
  const met = todayXp >= goal;
  return `<header class="status">
    <div class="stats-row">
      <span class="stat flame${save.streak.days > 0 ? " lit" : ""}"><span aria-hidden="true" class="stat-in">${icon("flame")}<b>${save.streak.days}</b><small>일</small></span><span class="sr">연속 기록 ${save.streak.days}일</span></span>
      <span class="stat coin"><span aria-hidden="true" class="stat-in">${icon("coin")}<b>${Math.max(0, save.yeopjeon)}</b><small>엽전</small></span><span class="sr">엽전 ${Math.max(0, save.yeopjeon)}</span></span>
      <span class="stat xp"><span aria-hidden="true" class="stat-in">${icon("xp")}<b>${Math.max(0, save.xp)}</b><small>XP</small></span><span class="sr">XP ${Math.max(0, save.xp)}</span></span>
    </div>
    <div class="goal${met ? " met" : ""}">
      <span class="goal-label">${met ? "오늘 목표 달성" : "오늘 목표"} <b>${Math.min(todayXp, 999)}/${goal} XP</b></span>
      ${bar(todayXp, goal, "goal-bar", "오늘 목표 XP")}
    </div>
  </header>`;
}

function localToday() { return localDate(); }
