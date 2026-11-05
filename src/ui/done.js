// 레슨 완료: 얻은 XP·엽전, 정확도, 연속 기록, 요약 3줄, 퀘스트·배지·이정표
// 두억이 표정(설계 §8-3): 장 평가 통과 결의 · 실수 없음 윙크 · 퀘스트·배지 웃음 · 그 밖에 만세(대사 표정) — src/say.js doneFace
import { QUESTS } from "../../data/quests.js";
import { BADGES } from "../../data/badges.js";
import { dueogiSVG } from "../dueogi.js";
import { doneFace } from "../say.js";
import { esc, icon, celebrate, dueogiSays, MILESTONE_REWARD } from "./dom.js";
import { badgeArt } from "./badges.js";
import { courseJustFinished } from "../curriculum.js";
import { isAdvancedLesson } from "../advanced.js";

export function render(root, ctx, params = {}) {
  const r = params.result;
  if (!r) { ctx.show("home"); return; }
  const lesson = params.lesson;
  const review = r.mode === "review";
  const daily = r.mode === "daily";   // 매일 도전(v0.9)
  const adv = !review && !daily && isAdvancedLesson(lesson);
  const finished = !review && !daily && courseJustFinished({ chapters: ctx.chapters, completed: ctx.save.completed_lessons, firstTime: r.firstTime, lessonId: r.lessonId });
  const line = ctx.say(finished ? "course_done" : "lesson_done", { xp: r.xp });
  const streakLine = r.streakUp || r.milestone ? ctx.say("streak_up", { streak: r.streak }) : null;
  const yeopjeon = r.totalYeopjeon ?? (r.lessonYeopjeon + r.questYeopjeon + (r.milestoneYeopjeon || 0));
  const face = finished ? line.face : doneFace(r, lesson, line.face);
  const parts = [[daily ? "도전" : "레슨", r.lessonYeopjeon], ...(daily ? [["도전 7일 보너스", r.bonusYeopjeon || 0]] : []),
    ["퀘스트", r.questYeopjeon], ["연속 기록", r.milestoneYeopjeon || 0]].filter(([, v]) => v > 0);
  const acc = Math.round((r.accuracy ?? 1) * 100);
  const quests = r.finished.map((id) => QUESTS.find((q) => q.id === id)).filter(Boolean);
  const badges = r.newBadges.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);

  root.innerHTML = `<div class="screen done">
    <main>
      <div class="done-hero">
        <div class="dueogi-wrap big jump">${dueogiSVG({ outfit: ctx.save.outfit, face, size: 150 })}<span class="sfx" aria-hidden="true">짠!</span></div>
        <h1>${daily ? "오늘의 도전 완료!" : review ? "복습 완료!" : finished ? "과정 완주!" : adv ? esc(`${lesson.id} 심화 완료!`) : esc(`${lesson.id} 레슨 완료!`)}</h1>
        <p class="bubble center">${esc(line.text)}</p>
      </div>
      ${daily && r.xp ? `<p class="daily-done">${icon("flame")}<span>${esc(`도전 ${r.dailyStreak}일째`)}</span>${r.bonusYeopjeon
        ? `<b class="sun-text">${esc(`7일 보너스 +${r.bonusYeopjeon}엽전`)}</b>` : ""}</p>` : ""}
      ${daily && !r.xp ? `<p class="muted center">오늘의 도전 보상은 이미 받았어요. 내일 새 문제가 와요.</p>` : ""}
      ${r.milestone ? `<p class="milestone">${icon("flame")}<span>${esc(`연속 ${r.milestone}일! ${MILESTONE_REWARD[r.milestone] || ""}`)}</span></p>` : ""}
      <ul class="tiles" aria-label="받은 보상">
        <li class="tile xp">${icon("xp")}<b>+${r.xp}</b><span>XP</span></li>
        <li class="tile coin">${icon("coin")}<b>+${yeopjeon}</b><span>엽전</span></li>
        <li class="tile acc">${icon("check")}<b>${acc}%</b><span>첫 시도 정답</span></li>
        <li class="tile flame${r.streakUp ? " lit" : ""}">${icon("flame")}<b>${r.streak}</b><span>일 연속</span></li>
      </ul>
      ${parts.length > 1 ? `<p class="muted center">엽전: ${parts.map(([k, v]) => `${k} ${v}`).join(" + ")}</p>` : ""}
      ${!r.firstTime && !review && !daily ? `<p class="muted center">다시 하기라서 레슨 엽전은 없지만, XP와 오늘의 퀘스트는 채워져요.</p>` : ""}
      ${r.firstTime && r.perfect ? `<p class="perk">${icon("star")}실수 없이 끝냈어요 (+5 XP, +5엽전)</p>` : ""}
      ${r.firstTime && r.hintFreeBuild ? `<p class="perk">${icon("bulb")}힌트 없이 카드 조립을 통과했어요 (+5 XP)</p>` : ""}
      ${streakLine ? dueogiSays({ outfit: ctx.save.outfit, face: streakLine.face, text: streakLine.text, size: 56, cls: "small" }) : ""}
      ${lesson && lesson.summary ? `<section class="panel summary"><h2>오늘 배운 것</h2><ol>${lesson.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}
      ${quests.length || r.chest ? `<section class="panel"><h2>끝낸 퀘스트</h2><ul class="plain">${quests.map((q) => `<li>${icon("check")}${esc(q.name)} <b class="sun-text">+${q.reward}</b></li>`).join("")}
        ${r.chest ? `<li>${icon("chestOpen")}보물상자를 열었어요 <b class="sun-text">+10</b></li>` : ""}</ul></section>` : ""}
      ${badges.length ? `<section class="panel"><h2>새 배지</h2><ul class="new-badges">${badges.map((b) => `<li>${badgeArt(b.id, true, 56)}<span>${esc(b.name)}</span></li>`).join("")}</ul></section>` : ""}
    </main>
    <footer class="lesson-foot"><button class="btn primary wide" id="home">계속</button></footer>
  </div>`;
  root.querySelector("#home").addEventListener("click", () => ctx.show("home"));
  (async () => {
    if (r.milestone) {
      ctx.sound.play("levelup");
      await celebrate({ outfit: ctx.save.outfit, milestone: r.milestone });
    }
    await ctx.afterDone(); // 첫 레슨이면 「홈 화면에 추가」 안내(아이폰 사파리만)
    root.querySelector("#home")?.focus({ preventScroll: true });
  })();
}
