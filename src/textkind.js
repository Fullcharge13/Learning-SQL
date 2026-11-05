// 보기·정답 글이 코드처럼 보여야 하는지 (코드 글꼴 + 줄바꿈·빈칸 그대로). 순수 함수.
// 여러 줄 출력(예: "3\n2\n1")도 코드로 본다. 그래야 줄바꿈이 한 줄로 뭉개지지 않는다.
// 코드 기호(괄호·따옴표·= * 등)나 대문자 SQL 낱말이 있어도, 글자 상수 '…' 밖에 한글이 있으면 한국어 문장이다
// (「shops (가게)」, 「SELECT * FROM 표 이름은 …」 — 고정폭 글꼴이면 빈칸이 벌어져 읽기 어렵다, 작업 12).
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

export function isCodey(s) {
  const t = String(s ?? "");
  if (t.includes("\n")) return true;
  if (!/[()"'=+*<>#|]|print|\b[A-Z][A-Z_]+\b/.test(t)) return false;
  return !HANGUL.test(t.replace(/'(?:[^']|'')*'/g, ""));
}
