// 매일 도전 「틀」 엔진 (리아 v0.9 작업 2 → 두억이 v0.1 작업 11에서 SQL로). 순수 함수 + 실행기를 받아 쓰는 async 하나.
//
// 틀(장 파일의 TEMPLATES) 하나:
//   choice: { id: "N-T1", concept, type: "choice", q, sql, wrong: [오답 SQL 2~3개], vars, explain, tables? }
//   blank:  { id: "N-T2", concept, type: "blank",  q, sql(빈자리 ___ 하나), chips: [칩 3~4개], answer: 정답 칩 번호, vars, explain }
//   vars: { 대문자이름: [값, …] | { min, max } } — q·sql·wrong·chips·explain의 {이름}을 바꿔 끼움.
//
// choice 문제: 화면에 정답 SQL(sql)을 보여 주고 「결과로 알맞은 표는?」을 묻는다. 보기는 정답 SQL과 오답 SQL을 장터 데이터베이스에서
// 실제로 돌린 결과 표 { sql, result }(화면은 result를 바로 그리고 다시 돌리지 않음 → 실행기가 그 사이 멈춰도 보기에 SQL 글자가
// 나오지 않아 정답이 드러나지 않음, 고침 1회차). 오답 SQL이 오류를 내면 「오류가 나요」 보기.
// 시간 초과·실행기 고장은 틀 탓이 아니라 실행기 탓 → makeTemplateItem이 engine 오류를 던짐(「다시 시도」 화면, 판정 R28).
// blank 문제: 칩을 넣은 SQL을 돌려, 정답 칩만 정답 결과 표가 나와야 한다(오답 칩은 오류이거나 다른 표).
//
// 같은 틀·씨앗·시도 번호면 언제나 같은 문제가 나온다. 보기가 겹치면(dup) 다음 시도 번호로 값을 다시 뽑는다(최대 TEMPLATE_ATTEMPTS번).
// 레슨 점검기(tests/content.js 규칙 templates)는 씨앗 0~99를 이 파일의 instantiate·runList·judgeInstance로 장터 데이터베이스에서
// 돌려 보고 모든 씨앗이 TEMPLATE_ATTEMPTS번 안에 문제가 되는지 확인한다. 앱은 씨앗을 0~99에서만 고르므로 학습자가 받는 문제는
// 모두 점검기가 미리 돌려 본 것이다.
import { sameTable, hasOrderBy } from "./grade.js";

export const OPT_ROWS = 5;                    // 객관식 보기의 작은 표에 보이는 행 수(ui/sqlview.js가 여기서 가져감 — 이 파일은 ui/를 불러오지 않음)
export const TEMPLATE_SEEDS = 100;
export const TEMPLATE_ATTEMPTS = 5;
export const ERROR_OPTION = "오류가 나요";   // 오답 SQL이 오류를 내면 이 보기
export const BLANK = "___";
const VAR_RE = /\{([A-Z][A-Z0-9_]*)\}/g;

function hashStr(str) {
  // FNV-1a 32비트 (quests.js와 같음)
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// tools/gen_market.js·src/build.js·src/daily.js도 쓴다(판정 R4)
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export { hashStr };

/** 글에 쓰인 대문자 자리 표시 이름들(중복 없이) */
export function placeholders(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(VAR_RE)) out.add(m[1]);
  return [...out];
}

/** 틀에 값을 바꿔 끼운 한 벌. 실행은 하지 않는다. vars 이름은 정렬 순서로 뽑는다(점검기와 같은 순서). */
export function instantiate(t, seed, attempt = 0) {
  const rng = mulberry32(hashStr(`${t.id}|${seed}|${attempt}`));
  const vals = {};
  for (const k of Object.keys(t.vars || {}).sort()) {
    const v = t.vars[k];
    vals[k] = Array.isArray(v) ? v[Math.floor(rng() * v.length)] : v.min + Math.floor(rng() * (v.max - v.min + 1));
  }
  const fill = (s) => (typeof s === "string" ? s.replace(VAR_RE, (m, k) => (Object.hasOwn(vals, k) ? String(vals[k]) : m)) : s);
  const inst = {
    id: t.id, seed, attempt, vals, type: t.type, concept: t.concept,
    q: fill(t.q), sql: fill(t.sql), explain: fill(t.explain ?? ""),
    wrong: (t.wrong || []).map(fill), chips: (t.chips || []).map(fill), answer: t.type === "blank" ? t.answer : 0,
  };
  if (Array.isArray(t.tables) && t.tables.length) inst.tables = t.tables.slice();
  return inst;
}

/** 실행할 SQL 목록: choice → [정답, 오답…], blank → 칩마다 빈자리를 채운 SQL(칩 순서) */
export function runList(inst) {
  return inst.type === "blank" ? inst.chips.map((c) => inst.sql.split(BLANK).join(c)) : [inst.sql, ...inst.wrong];
}

/** 보기 표 둘이 화면에서 같아 보이나: 열 이름, 앞 OPT_ROWS행(순서대로), 전체 행 수와 잘림 (오류가 있으면 false) */
export function optionsLookSame(a, b) {
  if (!a || !b || a.error || b.error) return false;
  if (a.rows.length !== b.rows.length || !!a.truncated !== !!b.truncated) return false;
  return sameTable({ columns: a.columns, rows: a.rows.slice(0, OPT_ROWS) }, { columns: b.columns, rows: b.rows.slice(0, OPT_ROWS) }, { ordered: true }).ok;
}

const isTimeout = (r) => !!r && (r.timeout === true || r.error === "timeout");

/** 결과 표 둘을 학습자가 구별할 수 없나. 둘 다 오류면 같은 「오류가 나요」 보기 */
function collide(a, b, ordered) {
  if (a.error && b.error) return true;
  if (a.error || b.error) return false;
  if (!!a.truncated !== !!b.truncated) return false;
  return sameTable(a, b, { ordered }).ok || optionsLookSame(a, b);
}

/**
 * 실행 결과로 문제를 만든다. 돌려줌 { ok: true, item } | { ok: false, why }.
 * why: "dup"(보기가 겹침 → 다음 시도) · "answer-error"(정답 SQL이 오류) · "empty"(정답 결과가 0행) · "slow"(시간 초과)
 * (dup 말고는 틀을 잘못 쓴 것 — 점검기가 오류로 알린다)
 */
export function judgeInstance(inst, results) {
  if (results.some(isTimeout)) return { ok: false, why: "slow" };
  const list = runList(inst);
  const ai = inst.type === "blank" ? inst.answer : 0;
  const ans = results[ai];
  if (!ans || ans.error) return { ok: false, why: "answer-error" };
  if (!ans.rows.length) return { ok: false, why: "empty" };
  const ordered = hasOrderBy(list[ai]);
  if (inst.type === "blank") {
    for (let i = 0; i < results.length; i++) if (i !== ai && collide(ans, results[i], ordered)) return { ok: false, why: "dup" };
    return {
      ok: true,
      item: { type: "blank", concept: inst.concept, q: inst.q, code: inst.sql, chips: inst.chips.slice(), answer: ai, explain: inst.explain },
    };
  }
  for (let a = 0; a < results.length; a++) {
    for (let b = a + 1; b < results.length; b++) if (collide(results[a], results[b], ordered)) return { ok: false, why: "dup" };
  }
  const item = {
    type: "choice", concept: inst.concept, q: inst.q, code: inst.sql,
    options: results.map((r, i) => (r.error ? ERROR_OPTION
      : { sql: list[i], result: { columns: r.columns.slice(), rows: r.rows, truncated: !!r.truncated } })),
    answer: 0, explain: inst.explain,
  };
  if (inst.tables) item.tables = inst.tables.slice();
  return { ok: true, item };
}

/** 실행기 탓으로 문제를 만들 수 없음(시간 초과·작업자 고장·불러오기 실패) → 화면은 「다시 시도」 (판정 R28) */
export function engineError(why, cause = null) {
  return Object.assign(new Error(`sql engine: ${why}`), { engine: true, why, cause });
}

/**
 * 틀 하나 + 씨앗 → 문제(lesson.js가 그리는 choice/blank 모양 + tpl·seed·attempt).
 * 틀 탓으로 못 만들면 null(정답 SQL 오류·0행, 다섯 번 모두 겹침 — 점검기가 막는 경우).
 * 실행기 탓이면 engineError를 던진다: run이 예외를 던지거나 결과가 시간 초과(slow)일 때.
 * @param run async (sql) => { columns, rows, error, truncated, timeout } (앱: SqlRun.run)
 */
export async function makeTemplateItem(t, seed, run) {
  for (let attempt = 0; attempt < TEMPLATE_ATTEMPTS; attempt++) {
    const inst = instantiate(t, seed, attempt);
    const results = [];
    try {
      for (const sql of runList(inst)) results.push(await run(sql));
    } catch (e) {
      throw e && e.engine ? e : engineError(e && e.message ? e.message : "run failed", e);
    }
    const j = judgeInstance(inst, results);
    if (j.ok) return { ...j.item, tpl: t.id, seed, attempt };
    if (j.why === "slow") throw engineError("timeout (slow)");
    if (j.why !== "dup") return null;
  }
  return null;
}
