// 보기·정답 글이 코드처럼 보여야 하는지 (코드 글꼴 + 줄바꿈·빈칸 그대로). 순수 함수.
// - 여러 줄 출력(예: "3\n2\n1")은 코드다. 그래야 줄바꿈이 한 줄로 뭉개지지 않는다.
// - 코드 기호(괄호·따옴표·= * 등)나 대문자 SQL 낱말이 있어도, 글자 상수 '…' 밖에 한글이 있으면 한국어 문장이다
//   (「shops (가게)」, 「SELECT * FROM 표 이름은 …」 — 고정폭 글꼴이면 빈칸이 벌어져 읽기 어렵다, 작업 12).
// - 판정 R32: SQL 낱말(SELECT·WITH·FROM·WHERE …)로 시작하면 한글 별칭(`AS 값`, `AS "두 배 값"`)은 이름이라 빼고 본다.
//   남은 곳에 한글이 없으면 코드(`SELECT price AS 값 FROM items`), 있으면 SQL 낱말로 시작하는 한국어 문장이다.
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const SQL_START = /^\s*(SELECT|WITH|FROM|WHERE|AND|OR|NOT|IN|BETWEEN|LIKE|ORDER|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|JOIN|INNER|LEFT|ON|CASE|WHEN|UNION|AS)\b/;
const STRINGS = /'(?:[^']|'')*'/g;
const QUOTED_NAMES = /"(?:[^"]|"")*"|`[^`]*`|\[[^\]]*\]/g;
const AS_ALIAS = /\bAS\s+[^\s,()]+/gi;

export function isCodey(s) {
  const t = String(s ?? "");
  if (t.includes("\n")) return true;
  if (SQL_START.test(t)) return !HANGUL.test(t.replace(STRINGS, "").replace(QUOTED_NAMES, "").replace(AS_ALIAS, ""));
  if (!/[()"'=+*<>#|]|print|\b[A-Z][A-Z_]+\b/.test(t)) return false;
  return !HANGUL.test(t.replace(STRINGS, ""));
}
