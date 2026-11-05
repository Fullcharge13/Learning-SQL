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

const WRITE_WORDS = new Set(["INSERT", "UPDATE", "DELETE", "REPLACE", "CREATE", "DROP", "ALTER", "ATTACH", "PRAGMA"]);

// 글자 상수·따옴표 이름·주석 바깥만 훑어 { first, words, extra } 를 돌려준다.
//   first: 첫 낱말(대문자), words: 바깥 낱말 모음, extra: 문장 끝 ; 뒤에 더 있는지
function scan(sql) {
  const words = [];
  let first = null, semi = false, extra = false;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i], d = sql[i + 1];
    if (c === "-" && d === "-") { while (i < n && sql[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { const e = sql.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (semi) extra = true;
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
      i = j;
      continue;
    }
    if (first === null) first = "";
    i++;
  }
  return { first, words, extra };
}

export function checkReadOnly(sql) {
  const s = scan(sql);
  if (s.first !== "SELECT" && s.first !== "WITH") return false;
  if (s.extra) return false;
  return !s.words.some((w) => WRITE_WORDS.has(w) && w !== "REPLACE");
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
