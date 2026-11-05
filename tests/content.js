#!/usr/bin/env node
// 레슨 점검기 (v0.1 작업 8, 설계 §10 「레슨 전수 점검」). 리아 tests/content.py의 형식 규칙을 옮기고, 파이썬 코드 검사 대신
// SQL을 실제 장터 데이터베이스(sql.js)로 돌려 본다.
//
//   node tests/content.js                      있는 장(data/lessons/chN.js)을 모두 점검
//   node tests/content.js --full 17            1~17장을 점검(없는 장은 missing으로 실패)
//   node tests/content.js --chapter 5          5장만
//   node tests/content.js --lessons-dir DIR    다른 레슨 폴더(DIR/concepts.js가 있으면 data/concepts.js 대신 씀)
//   → 장마다 「chN: OK (레슨 5, 문제 n)」 또는 문제점 목록. 문제점이 하나라도 있으면 끝 상태 1.
//
// 시험(tests/unit/content.test.js)은 checkChapter(mod, chapter, engine, { concepts })를 바로 부른다.
// Issue = { where, rule, msg }. rule은 RULES 중 하나(뜻은 RULES 아래 주석, 자세한 정의는 작업 8 보고서).
//
// 실행기: openEngine()이 작업자 스레드(tests/content_worker.js)에 장터 데이터베이스 두 벌을 올린다. 주 스레드는
// Atomics.wait로 답을 기다리고(그래서 checkChapter가 동기 함수), 한 번에 TIMEOUT_MS를 넘으면 작업자를 끝내고 다시 띄운다.
// 같은 SQL은 한 번만 돌린다(캐시).
import { Worker, MessageChannel, receiveMessageOnPort } from "node:worker_threads";
import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkReadOnly } from "../src/sqlcore.js";
import { cardsToSql, hasOrderBy, sameTable, judgeBuild } from "../src/grade.js";
import { validateLesson } from "../src/lessondata.js";
import { OPT_ROWS } from "../src/ui/sqlview.js";
import { SCHEMA } from "../data/schema.js";
import { GRAMMAR, UNTAUGHT, SQL_WORDS, WORD_CHAPTER, FORMS } from "../data/grammar.js";
import { newBuild } from "../src/build.js";
import { CONCEPTS as DATA_CONCEPTS } from "../data/concepts.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

export const RULES = [
  "answer-runs",   // 정답 SQL(build 정답, blank 정답 칩, order 정답 순서)이 오류 없이 돎. build는 1~50행(allowEmpty면 0행), 느리지 않음
  "drop-one",      // build 정답 카드 하나를 뺀 모든 경우가 judgeBuild에서 오답
  "swap-extra",    // build 정답 카드 한 자리를 헷갈림 카드 하나로 바꾼 모든 경우가 오답
  "bank-size",     // cards + extra ≤ 12, extra 2~4장, 헷갈림 카드가 정답 카드·서로와 글자가 겹치지 않음, 1~5장은 카드 하나에 낱말 하나
  "table-truth",   // 설명 카드·객관식 SQL이 돌고, 결과 표 보기끼리 화면에서 다르고, 문제 SQL의 실제 결과가 정답 보기와만 맞음
  "grammar",       // 레슨의 SQL에 나오는 낱말·함수가 GRAMMAR[1..장] 안. 가르치지 않는 낱말·함수, 큰따옴표 글자 값, == , 'now' 금지
  "readonly",      // INSERT·UPDATE·DELETE·CREATE·DROP·ALTER 등 데이터를 바꾸는 낱말이 없음(설계 D11)
  "shape",         // 리아 형식 규칙 + validateLesson(작업 7): 레슨 5개, 칸 이름, summary 3줄, 글자 수·한 줄 폭, 한글, 개념, 문제 차례·수
  "stable-order",  // build 정답이 저장 순서에 기대지 않음(거꾸로 저장한 데이터베이스에서도 같은 결과) — 동점 ORDER BY, ORDER BY 없는 LIMIT
  "engine-guard",  // 앱이 실행하는 SQL이 실행기의 조회 전용 검사(SELECT/WITH로 시작하는 문장 하나)를 통과
  "blank-unique",  // blank의 오답 칩은 모두 오류이거나 정답과 다른 결과
  "order-unique",  // order의 다른 모든 줄 순서는 오류이거나 정답과 다른 결과(화면은 저장된 순서만 정답으로 침)
  "exam-coverage", // 장 평가(N-5)가 1~4 레슨의 조립 문제 개념을 모두 다룸
  // 작업 11: "templates" (매일 도전 틀) 규칙을 여기에 더한다.
];

// ── 한도 (아이폰 세로, 리아 content.py와 같은 값) ─────────────────────────
export const LESSONS_PER_CHAPTER = 5;
const SQL_COLS = 38;          // SQL 한 줄 표시 폭(한글 등 넓은 글자는 2칸)
const CARD_COLS = 30;         // 조립 카드 하나의 글자 폭
const TITLE_MAX = 16, GOAL_MAX = 40, SUMMARY_MAX = 32, SAY_MAX = 140, Q_MAX = 80, EXPLAIN_MAX = 160, HINT_MAX = 120;
const BANK_MAX = 12, EXTRA_MIN = 2, EXTRA_MAX = 4;
const BUILD_ROWS_MAX = 50;    // 정답 결과가 이보다 길면 비교 표가 잘린다(작업 12 쓰기 규칙)
const SINGLE_TOKEN_UPTO = 5;  // 1~5장 조립 카드는 낱말 하나가 카드 하나(설계 §4-3)
const CARDS_RANGE = [1, 2];   // 설명 카드 수
const ITEMS_RANGE = [10, 14], EXAM_ITEMS_RANGE = [10, 16];   // 레슨당 문제 「12개 안팎」(설계 §6)
export const TIMEOUT_MS = 1500;   // 실행 한 번의 제한(앱은 3초, 휴대폰은 이 컴퓨터보다 느림)
export const SLOW_MS = 500;       // 학습자가 늘 보는 SQL(정답·설명 카드·보기)이 이보다 오래 걸리면 알림

/** 장마다 조립 문제 수 [최소, 최대] (계획 작업 12~15 쓰기 규칙). 장 평가는 최대 +1 */
export function buildRange(chapter) {
  if (chapter <= 5) return [1, 1];
  if (chapter <= 13) return [2, 2];
  return [2, 3];
}

const LESSON_KEYS = new Set(["id", "chapter", "title", "goal", "summary", "isExam", "cards", "items", "updated"]);
const CARD_KEYS = new Set(["say", "sql"]);
// 문제 형태별 [꼭 있어야 할 칸, 있어도 되는 칸]. 모르는 칸은 오타로 본다.
const ITEM_KEYS = {
  choice: [["type", "concept", "q", "options", "answer", "explain"], ["id", "code", "tables"]],
  check: [["type", "concept", "q", "options", "answer", "explain"], ["id", "code", "tables"]],
  blank: [["type", "concept", "q", "code", "chips", "answer", "explain"], ["id"]],
  // order의 expect(리아의 출력 글자)는 SQL에서는 쓰지 않는다: 점검기가 정답 순서를 실제로 돌려 본다(작업 8 판단)
  order: [["type", "concept", "q", "lines", "explain"], ["id"]],
  build: [["type", "id", "concept", "q", "cards", "extra", "tables", "hints", "explain"], ["need", "allowEmpty"]],
};
const TOUCH = new Set(["choice", "blank", "order"]);
const WRITE_WORDS = new Set(["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "ATTACH", "DETACH", "PRAGMA",
  "VACUUM", "REINDEX", "TRUNCATE", "GRANT", "REVOKE", "UPSERT", "MERGE"]);
const PLACEHOLDER = /\{(name|streak|xp|outfit|line|seconds|type)\}/;
const HANGUL = /[가-힣]/;
const UPDATED_RE = /^v\d+\.\d+(\.\d+)?$/;
const TABLE_NAMES = new Set(Object.keys(SCHEMA));
const SCHEMA_NAMES = new Set([...TABLE_NAMES, ...Object.values(SCHEMA).flatMap((t) => Object.keys(t.cols))]);

// ── 글자 도구 ──────────────────────────────────────────────────────────
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꥠ-꥿가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
export function width(line) {
  let n = 0;
  for (const ch of String(line)) n += WIDE.test(ch) ? 2 : 1;
  return n;
}

/**
 * SQL 글자를 조각으로 자른다. { tokens, words, strings, quoted, calls }
 *  tokens: 모든 조각(낱말·수·글자 상수·따옴표 이름·기호), words: 글자 상수·주석 밖 낱말(대문자),
 *  strings: '…' 안 글자, quoted: "…"·`…`·[…] 안 이름, calls: 바로 뒤에 ( 가 오는 낱말(대문자)
 */
export function sqlWords(sql) {
  const s = String(sql ?? "");
  const tokens = [], words = [], strings = [], quoted = [], calls = [];
  const n = s.length;
  let i = 0;
  let lastWord = null;   // 바로 앞 조각이 낱말이면 그 낱말
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === "-" && d === "-") { while (i < n && s[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { const e = s.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      let j = i + 1, body = "";
      while (j < n) {
        if (s[j] === close) {
          if (close !== "]" && s[j + 1] === close) { body += close; j += 2; continue; }
          break;
        }
        body += s[j++];
      }
      j = Math.min(n, j + 1);
      tokens.push(s.slice(i, j));
      (c === "'" ? strings : quoted).push(body);
      lastWord = null;
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(s[j])) j++;
      const w = s.slice(i, j).toUpperCase();
      tokens.push(s.slice(i, j));
      words.push(w);
      lastWord = w;
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(d || ""))) {
      let j = i + 1;
      while (j < n && /[0-9A-Za-z_.]/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      lastWord = null;
      i = j;
      continue;
    }
    const two = s.slice(i, i + 2);
    const op = [">=", "<=", "<>", "!=", "==", "||", "->"].includes(two) ? two : c;
    if (op === "(" && lastWord) calls.push(lastWord);
    tokens.push(op);
    lastWord = null;
    i += op.length;
  }
  return { tokens, words, strings, quoted, calls };
}

// ── 실행기 ────────────────────────────────────────────────────────────
function spawnWorker(marketPath) {
  const flag = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL("./content_worker.js", import.meta.url), {
    workerData: { flag, port: port2, marketPath }, transferList: [port2],
  });
  worker.unref();
  return { worker, flag, port: port1 };
}

function receive(c, ms, accept) {
  const end = Date.now() + ms;
  for (;;) {
    const seen = Atomics.load(c.flag, 0);
    const m = receiveMessageOnPort(c.port);
    if (m) { if (accept(m.message)) return m.message; continue; }
    const left = end - Date.now();
    if (left <= 0) return null;
    Atomics.wait(c.flag, 0, seen, left);
  }
}

/**
 * 점검용 실행기. run(sql, { db }) → { columns, rows, error, truncated, ms, timeout? } (동기, 캐시).
 * db: "main"(기본, 앱과 같음) · "pragma"(reverse_unordered_selects) · "rev"(저장 순서를 거꾸로) — 뒤 둘은 stable-order 규칙용.
 * close()로 끝낸다.
 */
export function openEngine({ timeoutMs = TIMEOUT_MS, marketPath = join(ROOT, "data", "market.sql") } = {}) {
  const start = () => {
    const c = spawnWorker(marketPath);
    const ready = receive(c, 60000, (m) => "ready" in m);
    if (!ready || !ready.ready) {
      c.worker.terminate();
      throw new Error(`content checker engine failed to start: ${ready ? ready.error : "timeout"}`);
    }
    return c;
  };
  let c = start();
  const cache = new Map();
  const stats = { queries: 0, cached: 0, timeouts: 0 };
  let seq = 0;
  function run(sql, { db = "main" } = {}) {
    const key = `${db}\u0000${sql}`;
    const hit = cache.get(key);
    if (hit) { stats.cached++; return hit; }
    stats.queries++;
    const id = ++seq;
    c.port.postMessage({ id, sql: String(sql), db });
    let r = receive(c, timeoutMs, (m) => m.id === id);
    if (!r) {
      stats.timeouts++;
      c.worker.terminate();
      c = start();
      r = { columns: [], rows: [], error: "timeout", truncated: false, timeout: true, ms: timeoutMs };
    }
    delete r.id;
    cache.set(key, r);
    return r;
  }
  return { run, stats, close() { c.worker.terminate(); } };
}

// ── 결과 비교 도구 ──────────────────────────────────────────────────────
const brief = (r) => (r.error ? `오류(${r.error})` : `${r.rows.length}행${r.truncated ? " 이상" : ""}`);
const oneLine = (sql) => String(sql).replace(/\s+/g, " ").trim();
// 객관식 보기 표가 화면에서 같아 보이는지: 열 이름, 앞 OPT_ROWS행(순서대로), 전체 행 수
function looksSame(a, b) {
  if (a.error || b.error) return false;
  if (a.rows.length !== b.rows.length || a.truncated !== b.truncated) return false;
  return sameTable({ columns: a.columns, rows: a.rows.slice(0, OPT_ROWS) }, { columns: b.columns, rows: b.rows.slice(0, OPT_ROWS) }, { ordered: true }).ok;
}
const sameResult = (a, b, ordered) => !a.error && !b.error && a.truncated === b.truncated && sameTable(a, b, { ordered }).ok;

function* permutations(arr) {
  if (arr.length <= 1) { yield arr.slice(); return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) yield [arr[i], ...p];
  }
}

// ── 장 하나 점검 ────────────────────────────────────────────────────────
/**
 * @param mod      장 모듈 { CHAPTER, LESSONS, TEMPLATES? }
 * @param chapter  장 번호(파일 이름의 N)
 * @param engine   openEngine()의 실행기
 * @param o.concepts  개념 목록 [{ id, name, chapter, advanced? }] (없으면 data/concepts.js)
 * @returns Issue[] = [{ where, rule, msg }]
 */
export function checkChapter(mod, chapter, engine, { concepts = DATA_CONCEPTS } = {}) {
  const issues = [];
  const add = (where, rule, msg) => issues.push({ where, rule, msg });
  const conceptMap = new Map((Array.isArray(concepts) ? concepts : []).filter((c) => c && c.id).map((c) => [c.id, c]));
  const allowed = new Set();
  for (let k = 1; k <= chapter; k++) for (const w of GRAMMAR[k] || []) allowed.add(w);
  const untaught = new Set(UNTAUGHT);
  const run = (sql, o) => engine.run(sql, o);

  // ---- 낱말 검사(grammar·readonly) : SQL이 들어가는 모든 칸에 쓴다 ----
  // prose: 글자 보기(SQL 조각일 수도, 한국어 설명일 수도 있음) → 낱말만 보고 따옴표·함수 검사는 하지 않음
  function words(where, text, { prose = false } = {}) {
    const { words: ws, strings, quoted, calls, tokens } = sqlWords(text);
    const late = [], never = [], fns = [];
    for (const w of new Set(ws)) {
      if (WRITE_WORDS.has(w)) add(where, "readonly", `데이터를 바꾸는 낱말 ${w}`);
      if (!SQL_WORDS.has(w)) continue;
      if (untaught.has(w)) never.push(w);
      else if (!allowed.has(w)) late.push(`${w}(${WORD_CHAPTER[w]}장)`);
    }
    for (let i = 0; i + 1 < ws.length; i++) if (ws[i] === "REPLACE" && (ws[i + 1] === "INTO" || ws[i + 1] === "OR")) add(where, "readonly", "REPLACE INTO는 데이터를 바꾸는 문장");
    for (const f of new Set(calls)) if (!SQL_WORDS.has(f) && !TABLE_NAMES.has(f.toLowerCase())) fns.push(f);
    // 기호·괄호 모양(FORMS): 계산·비교 기호, ||, 서브쿼리
    const up = tokens.map((t) => t.toUpperCase());
    const forms = new Set(up.filter((t) => Object.hasOwn(FORMS, t)));
    for (let i = 0; i + 1 < up.length; i++) {
      if (up[i] === "(" && up[i + 1] === "SELECT") forms.add("(SELECT");
      if (up[i] === "FROM" && up[i + 1] === "(" && up[i + 2] === "SELECT") forms.add("FROM (SELECT");
    }
    for (const f of forms) if (FORMS[f] > chapter) late.push(`${f}(${FORMS[f]}장)`);
    if (late.length) add(where, "grammar", `아직 배우지 않은 낱말: ${late.join(", ")} — ${chapter}장까지 배운 낱말만 씀`);
    if (never.length) add(where, "grammar", `가르치지 않는 낱말: ${never.join(", ")}`);
    if (prose) return;
    if (fns.length) add(where, "grammar", `가르치지 않는 함수: ${fns.join(", ")} (data/grammar.js에 없음)`);
    for (const q of quoted) if (!SCHEMA_NAMES.has(q)) add(where, "grammar", `큰따옴표 "${q}"는 이름 자리 — 글자 값은 작은따옴표 '${q}'로`);
    if (tokens.includes("==")) add(where, "grammar", "== 대신 = 를 씀(SQLite에서만 되는 모양)");
    if (strings.some((x) => /^\s*now\s*$/i.test(x))) add(where, "grammar", "'now'는 날마다 결과가 바뀜 — 날짜를 글자로 적음");
  }
  function sqlLines(where, text) {
    String(text).split("\n").forEach((line, k) => {
      if (width(line) > SQL_COLS) add(where, "shape", `${k + 1}번째 줄이 휴대폰 화면보다 넓음(${width(line)}칸 > ${SQL_COLS}칸): ${line}`);
      if (line.includes("\t")) add(where, "shape", "탭 문자 대신 빈칸을 씀");
    });
  }
  function text(where, value, limit, { hangul = true, oneLine: single = true } = {}) {
    if (typeof value !== "string" || !value.trim()) { add(where, "shape", "글이 비어 있음"); return; }
    if (single && value.includes("\n")) add(where, "shape", "한 줄이어야 함");
    if ([...value].length > limit) add(where, "shape", `너무 김(${[...value].length}자 > ${limit}자)`);
    const ph = PLACEHOLDER.exec(value);
    if (ph) add(where, "shape", `앱 자리 표시 ${ph[0]}가 남아 있음`);
    if (hangul && !HANGUL.test(value)) add(where, "shape", `한국어 문장이 아님: ${JSON.stringify(value)}`);
    if (value.includes("TODO") || value.trim() === "…") add(where, "shape", "임시 글이 남아 있음");
    // 설계 D11: 데이터를 바꾸는 SQL은 레슨 글에도 나오지 않는다
    const bad = [...new Set((value.match(/[A-Za-z_]+/g) || []).map((x) => x.toUpperCase()).filter((x) => WRITE_WORDS.has(x)))];
    if (bad.length) add(where, "readonly", `데이터를 바꾸는 낱말 ${bad.join(", ")} (설계 D11: 레슨에 나오지 않음)`);
  }
  /** 앱이 실행하는 SQL: 조회 전용 검사를 통과해야 한다. 통과하면 true */
  function guard(where, sql) {
    if (checkReadOnly(sql)) return true;
    add(where, "engine-guard", `실행기가 조회 전용이 아니라며 막음(SELECT/WITH로 시작하는 문장 하나여야 함): ${oneLine(sql)}`);
    return false;
  }
  const slow = (where, rule, r, sql) => {
    if (r.timeout) add(where, rule, `실행 시간 초과(${TIMEOUT_MS}ms): ${oneLine(sql)}`);
    else if (r.ms > SLOW_MS) add(where, rule, `실행이 느림(${Math.round(r.ms)}ms > ${SLOW_MS}ms, 휴대폰에서는 더 느림): ${oneLine(sql)}`);
  };

  // ---- 장 머리 ----
  const head = mod && mod.CHAPTER;
  if (!head || head.id !== chapter || typeof head.title !== "string" || !head.title.trim()) {
    add(`ch${chapter}`, "shape", `export const CHAPTER = { id: ${chapter}, title: "…" } 가 필요함`);
  }
  const lessons = mod && Array.isArray(mod.LESSONS) ? mod.LESSONS : null;
  if (!lessons) { add(`ch${chapter}`, "shape", "export const LESSONS = [...] 가 없음"); return issues; }
  if (lessons.length !== LESSONS_PER_CHAPTER) add(`ch${chapter}`, "shape", `레슨은 ${LESSONS_PER_CHAPTER}개여야 함(지금 ${lessons.length}개)`);

  const itemIds = new Map();
  lessons.forEach((lesson, idx) => {
    const lid = lesson && typeof lesson.id === "string" ? lesson.id : `${chapter}-?${idx + 1}`;
    try {
      checkLesson(lesson, lid, idx + 1);
    } catch (e) {
      add(lid, "shape", `형식이 잘못되어 점검을 마치지 못함(${e && e.name}: ${e && e.message})`);
    }
  });
  if (lessons.length === LESSONS_PER_CHAPTER) {
    try { examCoverage(); } catch (e) { add(`ch${chapter}`, "shape", `장 평가 점검 실패(${e && e.message})`); }
  }
  // 작업 11: if (mod.TEMPLATES) issues.push(...checkTemplates(mod.TEMPLATES, chapter, engine, conceptMap));
  return issues;

  // ================================================================
  function checkLesson(lesson, lid, pos) {
    if (!lesson || typeof lesson !== "object") { add(lid, "shape", "레슨이 객체가 아님"); return; }
    // 작업 7의 형식 검사(카드·객관식 보기·조립 칸)를 실제 데이터에 돌린다
    for (const m of validateLesson(lesson, SCHEMA)) {
      const im = /^\S+ item (\d+): (.*)$/.exec(m), cm = /^\S+ card (\d+): (.*)$/.exec(m);
      if (im) add(itemWhere(lesson, lid, +im[1]), "shape", im[2]);
      else if (cm) add(`${lid} cards[${cm[1]}]`, "shape", cm[2]);
      else add(lid, "shape", m);
    }
    for (const k of Object.keys(lesson)) if (!LESSON_KEYS.has(k)) add(`${lid} ${k}`, "shape", `모르는 칸 ${k}`);
    const wantId = `${chapter}-${pos}`;
    if (lesson.id !== wantId) add(`${lid} id`, "shape", `id는 ${wantId}이어야 함(파일 안 순서)`);
    if (lesson.chapter !== chapter) add(`${lid} chapter`, "shape", `chapter는 ${chapter}이어야 함(지금 ${JSON.stringify(lesson.chapter)})`);
    const exam = pos === LESSONS_PER_CHAPTER;
    if (("isExam" in lesson && typeof lesson.isExam !== "boolean") || !!lesson.isExam !== exam) {
      add(`${lid} isExam`, "shape", `장의 마지막 레슨(${chapter}-${LESSONS_PER_CHAPTER})만 isExam: true`);
    }
    if ("updated" in lesson && (typeof lesson.updated !== "string" || !UPDATED_RE.test(lesson.updated))) {
      add(`${lid} updated`, "shape", "updated는 \"v0.2\"처럼 보강한 판 이름");
    }
    text(`${lid} title`, lesson.title, TITLE_MAX);
    text(`${lid} goal`, lesson.goal, GOAL_MAX);
    if (!Array.isArray(lesson.summary) || lesson.summary.length !== 3) add(`${lid} summary`, "shape", "summary는 정확히 3줄");
    else lesson.summary.forEach((s, i) => text(`${lid} summary[${i}]`, s, SUMMARY_MAX, { hangul: false }));

    const cards = Array.isArray(lesson.cards) ? lesson.cards : [];
    if (!Array.isArray(lesson.cards) || cards.length < CARDS_RANGE[0] || cards.length > CARDS_RANGE[1]) {
      add(`${lid} cards`, "shape", `설명 카드는 ${CARDS_RANGE[0]}~${CARDS_RANGE[1]}장`);
    }
    cards.forEach((c, i) => checkCard(c, `${lid} cards[${i}]`));

    const items = Array.isArray(lesson.items) ? lesson.items : null;
    if (!items) { add(`${lid} items`, "shape", "items가 목록이 아님"); return; }
    const kinds = items.map((it) => (it && typeof it === "object" ? it.type : null));
    // 차례: 터치 문제들 → 조립 문제들 → 이해도 확인 1개 (리아: 터치 → write → check)
    const nb = kinds.filter((k) => k === "build").length;
    const firstBuild = kinds.indexOf("build");
    const orderOk = kinds.length > 0 && kinds[kinds.length - 1] === "check" && kinds.filter((k) => k === "check").length === 1
      && kinds.slice(0, -1).every((k, i) => (firstBuild < 0 || i < firstBuild ? TOUCH.has(k) : k === "build"));
    if (!orderOk) add(`${lid} items`, "shape", `차례는 터치 문제(choice·blank·order) → build → check 1개(지금 ${kinds.join(",")})`);
    const [blo, bhi] = buildRange(chapter);
    const bmax = exam ? bhi + 1 : bhi;
    if (nb < blo || nb > bmax) add(`${lid} items`, "shape", `${chapter}장 레슨의 build는 ${blo}~${bmax}개(지금 ${nb}개)`);
    const [ilo, ihi] = exam ? EXAM_ITEMS_RANGE : ITEMS_RANGE;
    if (items.length < ilo || items.length > ihi) add(`${lid} items`, "shape", `문제는 ${ilo}~${ihi}개(지금 ${items.length}개)`);
    items.forEach((it, i) => checkItem(it, itemWhere(lesson, lid, i)));
  }

  function itemWhere(lesson, lid, i) {
    const it = lesson && Array.isArray(lesson.items) ? lesson.items[i] : null;
    const t = it && typeof it === "object" ? it.type : "?";
    return `${lid} items[${i}] ${t}${it && it.id ? ` ${it.id}` : ""}`;
  }

  function checkCard(c, w) {
    if (!c || typeof c !== "object") return;   // validateLesson이 알림
    for (const k of Object.keys(c)) if (!CARD_KEYS.has(k)) add(`${w} ${k}`, "shape", `카드에 모르는 칸 ${k}`);
    text(`${w}.say`, c.say, SAY_MAX, { oneLine: false });
    if (typeof c.sql !== "string" || !c.sql.trim()) return;
    sqlLines(w, c.sql);
    words(w, c.sql);
    if (!guard(w, c.sql)) return;
    const r = run(c.sql);
    if (r.error) add(w, "table-truth", `설명 카드 SQL이 ${brief(r)}: ${oneLine(c.sql)}`);
    else slow(w, "table-truth", r, c.sql);
  }

  function checkItem(it, w) {
    if (!it || typeof it !== "object") { add(w, "shape", "문제가 객체가 아님"); return; }
    const spec = ITEM_KEYS[it.type];
    if (!spec) { add(w, "shape", `모르는 문제 형태 ${JSON.stringify(it.type)}`); return; }
    const [need, opt] = spec;
    const missing = need.filter((k) => !(k in it));
    if (missing.length) add(w, "shape", `빠진 칸: ${missing.join(", ")}`);
    for (const k of Object.keys(it)) {
      if (need.includes(k) || opt.includes(k)) continue;
      add(`${w} ${k}`, "shape", k === "expect" && it.type === "order"
        ? "order의 expect는 쓰지 않음(점검기가 정답 순서를 실행해 봄) — 칸을 지움" : `모르는 칸 ${k}`);
    }
    if ("id" in it) {
      if (typeof it.id !== "string" || !it.id.trim()) add(w, "shape", "id는 비어 있지 않은 글자");
      else if (itemIds.has(it.id)) add(w, "shape", `문제 id ${it.id}가 ${itemIds.get(it.id)}와 겹침`);
      else itemIds.set(it.id, w);
    }
    const c = conceptMap.get(it.concept);
    if (!c) add(w, "shape", `개념 ${JSON.stringify(it.concept)}이 개념 목록(concepts.js)에 없음`);
    else if (c.advanced) add(w, "shape", `심화 개념 ${it.concept}은 본 과정 레슨에서 쓰지 않음`);
    else if (Number(c.chapter) > chapter) add(w, "shape", `개념 ${it.concept}은 ${c.chapter}장 개념이라 ${chapter}장에서 쓸 수 없음`);
    text(`${w}.q`, it.q, Q_MAX);
    text(`${w}.explain`, it.explain, EXPLAIN_MAX, { oneLine: false });
    if (missing.length) return;
    if (it.type === "choice" || it.type === "check") checkChoice(it, w);
    else if (it.type === "blank") checkBlank(it, w);
    else if (it.type === "order") checkOrder(it, w);
    else if (it.type === "build") checkBuild(it, w);
  }

  // ---- choice / check ----
  function checkChoice(it, w) {
    const opts = Array.isArray(it.options) ? it.options : [];
    if (opts.length < 3 || opts.length > 4) add(w, "shape", `보기는 3~4개(지금 ${opts.length}개)`);
    const answerOk = Number.isInteger(it.answer) && it.answer >= 0 && it.answer < opts.length;
    const sqlOpts = opts.length > 0 && opts.every((o) => o && typeof o === "object" && typeof o.sql === "string");
    const textOpts = opts.length > 0 && opts.every((o) => typeof o === "string");
    if (textOpts) {
      opts.forEach((o, i) => { if (!o.trim()) add(w, "shape", `보기 ${i + 1}이 비어 있음`); words(`${w} options[${i}]`, o, { prose: true }); });
      if (new Set(opts).size !== opts.length) add(w, "shape", "같은 보기가 두 번 있음");
    }
    let code = null;
    if ("code" in it) {
      if (typeof it.code !== "string" || !it.code.trim()) add(w, "shape", "code는 비어 있지 않은 SQL 글자");
      else {
        sqlLines(`${w} code`, it.code);
        words(`${w} code`, it.code);
        if (guard(`${w} code`, it.code)) code = run(it.code);
      }
    }
    if (sqlOpts) {
      const res = opts.map((o, i) => {
        const ow = `${w} options[${i}]`;
        sqlLines(ow, o.sql);
        words(ow, o.sql);
        if (!guard(ow, o.sql)) return null;
        const r = run(o.sql);
        if (r.error) add(ow, "table-truth", `보기 SQL이 ${brief(r)} — 화면에 표가 안 나옴: ${oneLine(o.sql)}`);
        else slow(ow, "table-truth", r, o.sql);
        return r.error ? null : r;
      });
      for (let a = 0; a < res.length; a++) {
        for (let b = a + 1; b < res.length; b++) {
          if (res[a] && res[b] && looksSame(res[a], res[b])) add(w, "table-truth", `보기 ${a + 1}과 ${b + 1}의 결과 표가 화면에서 같음(앞 ${OPT_ROWS}행·행 수) — 고를 수 없음`);
        }
      }
      if (code && answerOk) {
        if (code.error) add(`${w} code`, "table-truth", `문제 SQL이 ${brief(code)}인데 보기가 결과 표`);
        else {
          const ordered = hasOrderBy(it.code);
          const hits = res.map((r, i) => (r && sameResult(code, r, ordered) ? i : -1)).filter((i) => i >= 0);
          if (!hits.includes(it.answer)) add(w, "table-truth", `문제 SQL의 실제 결과(${brief(code)})가 정답 보기 ${it.answer + 1}의 표와 다름`);
          const others = hits.filter((i) => i !== it.answer);
          if (others.length) add(w, "table-truth", `문제 SQL의 실제 결과와 같은 보기가 정답 말고도 있음: ${others.map((i) => i + 1).join(", ")}`);
        }
      }
    } else if (textOpts && answerOk) {
      const right = opts[it.answer];
      if (code) {
        // 문제 SQL을 실제로 돌린 결과와 정답 보기가 맞는지(리아의 「출력」 문제 규칙)
        if (code.error && !right.includes("오류")) add(w, "table-truth", `문제 SQL이 ${brief(code)}인데 정답 보기 ${JSON.stringify(right)}에 「오류」가 없음`);
        if (!code.error && right.includes("오류")) add(w, "table-truth", `문제 SQL이 오류 없이 도는데(${brief(code)}) 정답 보기가 「오류」`);
        if (!code.error && code.rows.length === 1 && code.columns.length === 1) {
          // 값 하나가 나오는 SQL: 그 값과 같은 글자의 보기는 정답 하나뿐(리아 「출력」 규칙)
          const v = code.rows[0][0];
          const cell = v === null ? "NULL" : typeof v === "number" ? String(Math.round(v * 1e4) / 1e4) : String(v);
          const hits = opts.map((o, i) => (o.trim() === cell ? i : -1)).filter((i) => i >= 0);
          if (hits.length && (hits.length !== 1 || hits[0] !== it.answer)) add(w, "table-truth", `문제 SQL의 실제 값 ${JSON.stringify(cell)}과 같은 보기가 정답이 아님(보기 ${hits.map((i) => i + 1).join(", ")})`);
        }
        if (!code.error && /몇\s*행|몇\s*줄/.test(it.q || "")) {
          const n = code.rows.length;
          const rowsOf = (o) => { const m = /(\d+)\s*(행|줄)/.exec(o); return m ? Number(m[1]) : null; };
          const hits = opts.map((o, i) => (rowsOf(o) === n ? i : -1)).filter((i) => i >= 0);
          if (hits.length !== 1 || hits[0] !== it.answer) add(w, "table-truth", `「몇 행」 문제인데 실제 결과는 ${n}행 — 그 수를 말하는 보기가 정답 하나뿐이어야 함(지금 ${hits.map((i) => i + 1).join(", ") || "없음"})`);
        }
      } else {
        // 「오류가 나는 SQL은?」·「오류 없이 도는 SQL은?」: 보기가 모두 SQL이면 실제로 돌려 본다(리아 check_codeless_error)
        const q = it.q || "";
        const want = /오류가 나는/.test(q) ? true : /오류 없이|오류가 나지 않는|오류가 안 나는/.test(q) ? false : null;
        if (want !== null && opts.every((o) => /^\s*(SELECT|WITH)\b/i.test(o))) {
          const errs = opts.map((o) => !!run(o).error);
          const picked = errs.map((e, i) => (e === want ? i : -1)).filter((i) => i >= 0);
          if (picked.length !== 1 || picked[0] !== it.answer) add(w, "table-truth", `보기를 돌려 보니 ${want ? "오류가 나는" : "오류 없는"} 보기는 ${picked.map((i) => i + 1).join(", ") || "없음"}인데 정답은 ${it.answer + 1}`);
        }
      }
    }
  }

  // ---- blank ----
  function checkBlank(it, w) {
    const code = it.code;
    if (typeof code !== "string" || code.split("___").length !== 2) { add(w, "shape", "code에 빈칸 ___이 정확히 하나여야 함"); return; }
    const chips = Array.isArray(it.chips) ? it.chips : [];
    if (chips.length < 3 || chips.length > 4) { add(w, "shape", `chips는 3~4개(지금 ${chips.length}개)`); return; }
    if (chips.some((c) => typeof c !== "string" || !c.trim())) { add(w, "shape", "칩은 비어 있지 않은 글자"); return; }
    if (new Set(chips).size !== chips.length) add(w, "shape", "같은 칩이 두 번 있음");
    if (chips.some((c) => c.includes("___"))) add(w, "shape", "칩에 ___가 들어 있음");
    if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= chips.length) { add(w, "shape", "answer가 칩 범위 밖"); return; }
    const fill = (c) => code.replace("___", c);
    const right = fill(chips[it.answer]);
    sqlLines(`${w} code`, right);
    words(`${w} code`, right);
    chips.forEach((c, i) => { if (i !== it.answer) words(`${w} chips[${i}]`, c); });
    if (!guard(`${w} code`, right)) return;
    const good = run(right);
    if (good.error) { add(w, "answer-runs", `정답 칩을 넣은 SQL이 ${brief(good)}: ${oneLine(right)}`); return; }
    slow(w, "answer-runs", good, right);
    const ordered = hasOrderBy(right);
    chips.forEach((c, i) => {
      if (i === it.answer) return;
      const r = run(fill(c));
      if (r.timeout) add(w, "blank-unique", `오답 칩 ${JSON.stringify(c)}을 넣은 SQL이 시간 초과`);
      else if (sameResult(good, r, ordered)) add(w, "blank-unique", `오답 칩 ${JSON.stringify(c)}도 정답과 같은 결과(정답이 둘)`);
    });
  }

  // ---- order ----
  function checkOrder(it, w) {
    const lines = it.lines;
    if (!Array.isArray(lines) || lines.length < 3 || lines.length > 6) { add(w, "shape", "lines는 3~6줄"); return; }
    if (lines.some((l) => typeof l !== "string" || !l.trim() || l.includes("\n"))) { add(w, "shape", "lines의 각 줄은 비어 있지 않은 한 줄 글자"); return; }
    if (new Set(lines).size !== lines.length) { add(w, "shape", "같은 줄이 두 번 있음(터치로 구분할 수 없음)"); return; }
    const sql = lines.join("\n");
    sqlLines(`${w} lines`, sql);
    words(`${w} lines`, sql);
    if (!guard(`${w} lines`, sql)) return;
    const good = run(sql);
    if (good.error) { add(w, "answer-runs", `정답 순서 SQL이 ${brief(good)}: ${oneLine(sql)}`); return; }
    slow(w, "answer-runs", good, sql);
    const ordered = hasOrderBy(sql);
    const twins = [];
    let timeouts = 0;
    for (const p of permutations(lines)) {
      const s = p.join("\n");
      if (s === sql) continue;
      const r = run(s);
      if (r.timeout) timeouts++;
      else if (sameResult(good, r, ordered)) twins.push(p);
    }
    if (twins.length) add(w, "order-unique", `정답 순서 말고도 같은 결과가 나오는 순서가 ${twins.length}가지(예: ${oneLine(twins[0].join(" / "))}) — 화면은 저장된 순서만 정답으로 침`);
    if (timeouts) add(w, "order-unique", `다른 순서 ${timeouts}가지가 시간 초과`);
  }

  // ---- build ----
  function checkBuild(it, w) {
    const cards = Array.isArray(it.cards) ? it.cards : [];
    const extra = Array.isArray(it.extra) ? it.extra : [];
    if (!cards.length || !cards.every((c) => typeof c === "string" && c.trim()) || !extra.every((c) => typeof c === "string" && c.trim())) {
      add(w, "shape", "cards·extra는 비어 있지 않은 글자 목록");
      return;
    }
    // bank-size
    if (cards.length + extra.length > BANK_MAX) add(w, "bank-size", `카드 더미가 ${cards.length + extra.length}장 > ${BANK_MAX}장`);
    if (extra.length < EXTRA_MIN || extra.length > EXTRA_MAX) add(w, "bank-size", `헷갈림 카드는 ${EXTRA_MIN}~${EXTRA_MAX}장(지금 ${extra.length}장)`);
    const seenExtra = new Set();
    for (const e of extra) {
      if (cards.includes(e)) add(w, "bank-size", `헷갈림 카드 ${JSON.stringify(e)}가 정답 카드와 글자가 같음(구분할 수 없음)`);
      else if (seenExtra.has(e)) add(w, "bank-size", `헷갈림 카드 ${JSON.stringify(e)}가 두 장`);
      seenExtra.add(e);
    }
    for (const c of [...cards, ...extra]) {
      if (width(c) > CARD_COLS) add(w, "shape", `카드 ${JSON.stringify(c)}가 너무 넓음(${width(c)}칸 > ${CARD_COLS}칸)`);
      if (c.includes("\n")) add(w, "shape", `카드 ${JSON.stringify(c)}에 줄바꿈`);
      if (chapter <= SINGLE_TOKEN_UPTO && sqlWords(c).tokens.length !== 1) add(w, "bank-size", `${SINGLE_TOKEN_UPTO}장까지는 카드 하나에 낱말 하나: ${JSON.stringify(c)}`);
    }
    // 화면의 카드 더미(문제 id가 씨앗)에서 정답 카드가 정답 순서 그대로 놓이면 보기만 해도 풀림
    if (typeof it.id === "string" && it.id && cards.length >= 3) {
      const shown = newBuild(it, 0).bank.filter((b) => b.id < cards.length).map((b) => b.text);
      if (shown.join("\u0000") === cards.join("\u0000")) add(w, "bank-size", "섞은 카드 더미에서 정답 카드가 정답 순서 그대로 보임 — 문제 id를 바꿔 섞는 순서를 바꿈");
    }
    // 글·표·need
    (Array.isArray(it.hints) ? it.hints : []).forEach((h, i) => text(`${w}.hints[${i}]`, h, HINT_MAX));
    const answer = cardsToSql(cards);
    const used = new Set(sqlWords(answer).words.map((x) => x.toLowerCase()).filter((x) => TABLE_NAMES.has(x)));
    const listed = new Set(Array.isArray(it.tables) ? it.tables : []);
    for (const t of used) if (!listed.has(t)) add(w, "shape", `정답이 쓰는 표 ${t}가 tables(쓸 표 보기)에 없음`);
    if ("need" in it) {
      if (!Array.isArray(it.need) || !it.need.length) add(w, "shape", "need는 카드 글자 목록");
      else for (const n of it.need) if (!cards.includes(n)) add(w, "shape", `need 카드 ${JSON.stringify(n)}가 정답 cards에 없음(정답으로도 통과 못 함)`);
    }
    if ("allowEmpty" in it && it.allowEmpty !== true) add(w, "shape", "allowEmpty는 true만 씀(아니면 칸을 지움)");
    // 낱말
    words(`${w} cards`, answer);
    extra.forEach((e, i) => words(`${w} extra[${i}]`, e));
    // answer-runs
    if (!guard(`${w} cards`, answer)) return;
    const exp = run(answer);
    if (exp.error) { add(w, "answer-runs", `정답 SQL이 ${brief(exp)}: ${answer}`); return; }
    slow(w, "answer-runs", exp, answer);
    if (exp.truncated || exp.rows.length > BUILD_ROWS_MAX) add(w, "answer-runs", `정답 결과가 ${brief(exp)} — ${BUILD_ROWS_MAX}행 이하로(LIMIT이나 조건)`);
    if (!exp.rows.length && it.allowEmpty !== true) add(w, "answer-runs", "정답 결과가 0행 — 일부러 0행이면 allowEmpty: true");
    if (exp.rows.length && it.allowEmpty === true) add(w, "answer-runs", `allowEmpty인데 정답 결과가 ${exp.rows.length}행`);
    const self = judgeBuild(it, exp, exp, cards);
    if (!self.ok) add(w, "answer-runs", `정답 카드 그대로 제출해도 오답(${self.reason}${self.missingNeed ? `: ${self.missingNeed.join(", ")}` : ""})`);
    // stable-order: 훑는 순서·저장 순서가 바뀌어도 같은 결과인가(ORDER BY가 있으면 순서까지)
    const ordered = hasOrderBy(answer);
    for (const db of ["pragma", "rev"]) {
      const other = run(answer, { db });
      if (other.error) { add(w, "stable-order", `${db} 데이터베이스에서 ${brief(other)}`); break; }
      if (!sameResult(exp, other, ordered)) {
        add(w, "stable-order", ordered
          ? `ORDER BY의 동점 행 순서가 저장 순서에 따라 바뀜(${db}) — 순서를 하나로 정하는 열을 ORDER BY에 더함(예: , item_id)`
          : `결과가 저장 순서에 따라 바뀜(${db}, ORDER BY 없는 LIMIT 등) — ORDER BY로 고를 행을 정함`);
        break;
      }
    }
    // drop-one: 정답 카드 하나를 빼면 언제나 오답
    for (let i = 0; i < cards.length; i++) {
      const rest = cards.slice(0, i).concat(cards.slice(i + 1));
      variant("drop-one", rest, `카드 ${i + 1}번 ${JSON.stringify(cards[i])}을 빼도`);
    }
    // swap-extra: 정답 카드 한 자리를 헷갈림 카드로 바꾸면 언제나 오답
    for (let i = 0; i < cards.length; i++) {
      for (const e of new Set(extra)) {
        if (e === cards[i]) continue;
        const alt = cards.slice(); alt[i] = e;
        variant("swap-extra", alt, `카드 ${i + 1}번 ${JSON.stringify(cards[i])}을 헷갈림 카드 ${JSON.stringify(e)}로 바꿔도`);
      }
    }
    function variant(rule, used2, what) {
      const sql = cardsToSql(used2);
      if (!checkReadOnly(sql)) return;   // 실행기가 막음 → 오답
      const got = run(sql);
      if (got.timeout) { add(w, rule, `${what} 실행이 시간 초과(${TIMEOUT_MS}ms) — 학습자 화면에서 「너무 오래 걸려요」: ${sql}`); return; }
      const j = judgeBuild(it, got, exp, used2);
      if (j.ok) add(w, rule, `${what} 정답(${brief(got)}): ${sql}`);
    }
  }

  // ---- exam-coverage: 장 평가는 1~4 레슨의 조립 문제 개념을 모두 다룬다 (리아 check_exam_coverage) ----
  function examCoverage() {
    const core = [];
    for (const l of lessons.slice(0, -1)) {
      for (const it of (l && Array.isArray(l.items) ? l.items : [])) {
        if (it && it.type === "build" && it.concept && !core.includes(it.concept)) core.push(it.concept);
      }
    }
    const exam = lessons[lessons.length - 1];
    const have = new Set((exam && Array.isArray(exam.items) ? exam.items : []).map((it) => it && it.concept));
    const lack = core.filter((c) => !have.has(c));
    const eid = exam && exam.id ? exam.id : `${chapter}-${LESSONS_PER_CHAPTER}`;
    if (lack.length) add(`${eid} items`, "exam-coverage", `장 평가에 빠진 개념: ${lack.join(", ")}`);
  }
}

/** 장 모듈의 문제 수(명령줄 출력용) */
function countItems(mod) {
  return (mod && Array.isArray(mod.LESSONS) ? mod.LESSONS : []).reduce((n, l) => n + (l && Array.isArray(l.items) ? l.items.length : 0), 0);
}

// ── 명령줄 ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { full: null, chapter: null, dir: join(ROOT, "data", "lessons") };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    const num = () => { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw new Error(`${a} needs a chapter number`); i++; return n; };
    if (a === "--full") o.full = num();
    else if (a === "--chapter") o.chapter = num();
    else if (a === "--lessons-dir") { if (!v) throw new Error("--lessons-dir needs a folder"); o.dir = resolve(v); i++; }
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

export async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error(String(e.message)); return 2; }
  const t0 = Date.now();
  const present = existsSync(o.dir)
    ? readdirSync(o.dir).map((f) => /^ch([1-9]\d*)\.js$/.exec(f)).filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b)
    : [];
  const want = o.chapter ? [o.chapter] : o.full ? Array.from({ length: o.full }, (_, i) => i + 1) : present;
  let concepts = DATA_CONCEPTS, conceptsFrom = "data/concepts.js";
  const localConcepts = join(o.dir, "concepts.js");
  if (existsSync(localConcepts)) {
    concepts = (await import(pathToFileURL(localConcepts).href)).CONCEPTS;
    conceptsFrom = localConcepts;
  }
  console.log(`레슨 폴더 ${o.dir} · 개념 ${conceptsFrom} (${Array.isArray(concepts) ? concepts.length : 0}개)`);
  let failed = 0, nLessons = 0, nItems = 0;
  const engine = want.some((n) => present.includes(n)) ? openEngine() : null;
  const ids = new Map();
  try {
    for (const n of want) {
      if (!present.includes(n)) { console.log(`ch${n}: missing (파일 ch${n}.js 없음)`); failed++; continue; }
      let mod;
      try {
        mod = await import(pathToFileURL(join(o.dir, `ch${n}.js`)).href);
      } catch (e) {
        console.log(`ch${n}: 파일을 읽지 못함 — ${e && e.message}`); failed++; continue;
      }
      const issues = checkChapter(mod, n, engine, { concepts });
      // 장을 넘어 문제 id가 겹치는지(장 안은 checkChapter가 봄)
      for (const l of mod.LESSONS || []) {
        for (const it of (l && l.items) || []) {
          if (!it || typeof it.id !== "string") continue;
          const prev = ids.get(it.id);
          if (prev && prev !== n) issues.push({ where: `${l.id} ${it.id}`, rule: "shape", msg: `문제 id가 ${prev}장과 겹침` });
          else ids.set(it.id, n);
        }
      }
      const lc = Array.isArray(mod.LESSONS) ? mod.LESSONS.length : 0, ic = countItems(mod);
      nLessons += lc; nItems += ic;
      if (!issues.length) { console.log(`ch${n}: OK (레슨 ${lc}, 문제 ${ic})`); continue; }
      failed += issues.length;
      console.log(`ch${n}: 문제점 ${issues.length}개 (레슨 ${lc}, 문제 ${ic})`);
      for (const i of issues) console.log(`  [${i.rule}] ${i.where}: ${i.msg}`);
    }
  } finally {
    if (engine) engine.close();
  }
  const s = engine ? engine.stats : { queries: 0, cached: 0, timeouts: 0 };
  console.log(`\n합계: 장 ${want.length}개, 레슨 ${nLessons}, 문제 ${nItems}, 문제점 ${failed} · SQL ${s.queries}번 실행(캐시 ${s.cached}, 시간 초과 ${s.timeouts}) · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
