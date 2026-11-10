// SQL 실행기의 순수 부분 (브라우저 작업자·Node 공용). 설계서 §4-4.
// - openMarket: 도깨비 장터 데이터를 올리고 조회 전용으로 잠근다.
// - execOne: SELECT/WITH 문장 하나만 실행한다. 결과는 5,000행에서 자른다.

export const ROW_CAP = 5000;
export const READ_ONLY = "read-only";

export function openMarket(SQL, marketSql) {
  const db = new SQL.Database();
  db.run(marketSql);
  db.run("PRAGMA query_only = ON"); // 데이터를 올린 뒤에는 쓰기를 SQLite가 직접 막는다
  return db;
}

const WRITE_WORDS = new Set(["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "ATTACH", "PRAGMA"]);

// 글자 상수·따옴표 이름·주석 바깥만 훑어 { first, words, extra } 를 돌려준다.
//   first: 첫 낱말(대문자), words: 바깥 낱말 모음, extra: 문장 끝 ; 뒤에 더 있는지
function scan(sql) {
  const words = [];
  let first = null, semi = false, extra = false, replaceWrite = false, prevWord = null;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i], d = sql[i + 1];
    if (c === "-" && d === "-") { while (i < n && sql[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { const e = sql.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (semi) extra = true;
    const wasWord = prevWord;
    prevWord = null; // 낱말이 아닌 덩어리를 만나면 이어짐이 끊긴다
    if (c === ";") { semi = true; extra = false; i++; continue; }
    if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      i++;
      while (i < n) {
        if (sql[i] === close) {
          if (close !== "]" && sql[i + 1] === close) { i += 2; continue; }
          break;
        }
        i++;
      }
      i++;
      if (first === null) first = "";
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(sql[j])) j++;
      const w = sql.slice(i, j).toUpperCase();
      if (first === null) first = w;
      words.push(w);
      if (wasWord === "REPLACE" && (w === "INTO" || w === "OR")) replaceWrite = true; // REPLACE INTO / REPLACE OR ...
      prevWord = w;
      i = j;
      continue;
    }
    if (first === null) first = "";
    i++;
  }
  return { first, words, extra, replaceWrite };
}

export function checkReadOnly(sql) {
  const s = scan(sql);
  if (s.first !== "SELECT" && s.first !== "WITH") return false;
  if (s.extra || s.replaceWrite) return false;
  // 함수 replace(...)는 통과해야 하므로 REPLACE 낱말은 WRITE_WORDS에 없고, INTO/OR가 뒤따를 때만 위에서 막는다
  return !s.words.some((w) => WRITE_WORDS.has(w));
}

function msgOf(e) {
  const m = e && e.message ? e.message : String(e);
  return /readonly|read-only|read only/i.test(m) ? READ_ONLY : m;
}

export function execOne(db, sql) {
  const out = { columns: [], rows: [], error: null, truncated: false };
  if (typeof sql !== "string" || !checkReadOnly(sql)) {
    out.error = READ_ONLY;
    return out;
  }
  let stmt = null;
  try {
    stmt = db.prepare(sql);
    out.columns = stmt.getColumnNames();
    while (stmt.step()) {
      if (out.rows.length >= ROW_CAP) { out.truncated = true; break; }
      out.rows.push(stmt.get());
    }
  } catch (e) {
    out.error = msgOf(e);
    out.rows = [];
  } finally {
    if (stmt) { try { stmt.free(); } catch (_) { /* 무시 */ } }
  }
  return out;
}

// 임시 장부(v0.3): 장터와 따로 새 DB를 만들어 장부를 올리고, 질의마다 execOne을 돌린 뒤 닫는다.
// 질의 하나가 쓰기 시도·오류여도 나머지는 계속 돈다. 장부는 질의 사이에 바뀌지 않는다(조회 전용).
export function runLedger(SQL, ledgerSql, queries) {
  const db = new SQL.Database();
  try {
    db.run(ledgerSql);
    db.run("PRAGMA query_only = ON");
    return (Array.isArray(queries) ? queries : []).map((q) => execOne(db, q));
  } finally {
    db.close();
  }
}
