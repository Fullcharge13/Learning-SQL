// SQL 작업자 (모듈 작업자). 화면 쪽 src/sqlrun.js가 띄운다.
//   받는 말: { type:"init", wasmURL, sqlJsURL, marketSql } , { type:"run", id, sql }
//   보내는 말: { type:"ready" } | { type:"init-error", msg } | { type:"started", id } | { type:"result", id, result }
// sql.js(sql-wasm.js)는 UMD라 모듈 작업자에서 importScripts를 쓸 수 없다 → 글자로 받아 module 틀 안에서 실행한다.
import { openMarket, execOne } from "./sqlcore.js";

let db = null;

async function loadSqlJs(sqlJsURL) {
  const r = await fetch(sqlJsURL);
  if (!r.ok) throw new Error("sql-wasm.js " + r.status);
  const src = await r.text();
  const mod = { exports: {} };
  new Function("module", "exports", src)(mod, mod.exports);
  return mod.exports;
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  if (m.type === "init") {
    try {
      const initSqlJs = await loadSqlJs(m.sqlJsURL);
      const SQL = await initSqlJs({ locateFile: () => m.wasmURL });
      db = openMarket(SQL, m.marketSql);
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "init-error", msg: String((e && e.message) || e) });
    }
  } else if (m.type === "run") {
    self.postMessage({ type: "started", id: m.id });
    let result;
    try {
      result = execOne(db, m.sql);
    } catch (e) {
      result = { columns: [], rows: [], error: String((e && e.message) || e), truncated: false };
    }
    self.postMessage({ type: "result", id: m.id, result });
  }
};
