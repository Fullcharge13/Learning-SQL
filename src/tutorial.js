// 첫 사용 튜토리얼의 순수 함수(v0.3.3, 리아 v0.18.0 꼴). 화면은 src/ui/tutorial.js.
// 카드 4장: 인사 → 장부는 표 → 카드로 조립 → 직접 해 보기(SELECT * FROM shops를 진짜 실행기로).
// XP·엽전·레슨 진도·퀘스트·배지는 건드리지 않는다. 저장에는 tutorial 칸("done"|"skipped")만 남긴다(다시 보기는 그것도 안 바꿈).

export const TUT_TEXT = Object.freeze([
  "안녕! 나는 두억이, 도깨비 장터의 장부지기야.",
  "장부는 표예요. 가로 한 줄이 가게 하나, 세로 한 칸이 정보 하나.",
  "카드를 눌러 SQL을 조립해요. 타자는 필요 없어요.",
  "직접 해 볼까요? 카드를 차례대로 눌러 가게 장부를 통째로 꺼내 봐요.",
]);

export const TUT_CARDS = Object.freeze(["SELECT", "*", "FROM", "shops"]);
export const TUT_ANSWER = TUT_CARDS.join(" ");
export const SHOW_ANSWER_AFTER = 2;   // 맞지 않은 실행이 이만큼이면 「정답 보기」

// 개발자 모드 저장(검수용)에서는 자동으로 띄우지 않는다
export const shouldShowTutorial = (save, { dev } = {}) => !dev && !!save && save.tutorial == null;

/** 놓은 카드 글자들 → "ok" | "empty" | "short"(4장보다 적음) | "order"(4장 다 놓았지만 차례가 다름) */
export function tutorialCheck(texts) {
  const t = Array.isArray(texts) ? texts : [];
  if (!t.length) return "empty";
  if (t.length < TUT_CARDS.length) return "short";
  return t.join(" ") === TUT_ANSWER ? "ok" : "order";
}

/** 섞은 카드 더미(정답 차례로 나오면 한 칸 돌림) */
export function tutorialBank(rand = Math.random) {
  const b = [...TUT_CARDS];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [b[i], b[j]] = [b[j], b[i]];
  }
  if (b.join(" ") === TUT_ANSWER) b.push(b.shift());
  return b;
}

/** 틀린 차례·모자란 카드일 때의 짧은 안내(오류 설명 아래에 붙음) */
export const TUT_HINT = {
  empty: "아래 카드를 눌러 보세요. 누른 차례대로 줄에 붙어요.",
  short: "카드 4장을 모두 놓아 봐요.",
  order: "SELECT로 시작해요. 「SELECT 무엇을 FROM 어느 표」 차례예요.",
};
