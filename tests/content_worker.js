// 레슨 점검기(tests/content.js)의 실행기 작업자. 장터 데이터베이스 세 벌을 올려 두고 SQL을 하나씩 실행한다.
// - main:   앱과 같은 데이터베이스(openMarket).
// - pragma: main과 같은 데이터 + PRAGMA reverse_unordered_selects=ON(SQLite가 순서를 정하지 않은 훑기를 거꾸로 함).
// - rev:    같은 행을 **거꾸로 된 저장 순서**로 넣은 데이터베이스(PRIMARY KEY를 빼서 rowid 순서도 거꾸로), PRAGMA 없음.
//           PRAGMA만으로는 ORDER BY 동점 행 순서가 바뀌지 않아(정렬기가 들어온 순서를 지킴) 이 판이 따로 필요하다.
//           두 가지를 한 데이터베이스에 함께 걸면 거꾸로의 거꾸로가 되어 ORDER BY 없는 LIMIT을 놓친다.
// ORDER BY의 동점 행 순서나 ORDER BY 없는 LIMIT처럼 「저장 순서에 기대는」 결과는 main과 pragma·rev 중 하나에서 달라진다
// → `stable-order` 규칙. (실험 기록은 작업 8 보고서)
// 주 스레드는 Atomics.wait로 답을 기다리고, 제한 시간이 지나면 이 작업자를 끝내고 새로 띄운다.
import { workerData } from "node:worker_threads";
import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { openMarket, execOne } from "../src/sqlcore.js";

const { flag, port, marketPath } = workerData;
const send = (m) => { port.postMessage(m); Atomics.add(flag, 0, 1); Atomics.notify(flag, 0); };

function reversedMarket(SQL, marketSql) {
  const db = new SQL.Database();
  db.run(marketSql);
  const tables = db.exec("SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name")[0]?.values || [];
  for (const [name, ddl] of tables) {
    const tmp = `rev_${name}`;
    const head = new RegExp(`^CREATE TABLE\\s+${name}\\s*\\(`, "i");
    if (!head.test(ddl)) throw new Error(`unexpected DDL for ${name}: ${ddl}`);
    db.run(ddl.replace(head, `CREATE TABLE ${tmp} (`).replace(/\s+PRIMARY\s+KEY/gi, ""));
    db.run(`INSERT INTO ${tmp} SELECT * FROM ${name} ORDER BY rowid DESC`);
    db.run(`DROP TABLE ${name}`);
    db.run(`ALTER TABLE ${tmp} RENAME TO ${name}`);
  }
  db.run("PRAGMA query_only = ON");
  return db;
}

try {
  const SQL = await initSqlJs();
  const marketSql = readFileSync(marketPath, "utf8");
  const pragma = openMarket(SQL, marketSql);
  pragma.run("PRAGMA reverse_unordered_selects = ON");
  const dbs = { main: openMarket(SQL, marketSql), pragma, rev: reversedMarket(SQL, marketSql) };
  port.on("message", (m) => {
    const t = performance.now();
    const r = execOne(dbs[m.db] || dbs.main, m.sql);
    send({ id: m.id, ...r, ms: performance.now() - t });
  });
  send({ ready: true });
} catch (e) {
  send({ ready: false, error: String(e && e.stack ? e.stack : e) });
}
