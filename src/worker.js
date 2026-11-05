// SQL 작업자 (모듈 작업자). 화면 쪽 src/sqlrun.js가 띄운다.
//   받는 말: { type:"init", wasmURL, marketSql } , { type:"run", id, sql }
//   보내는 말: { type:"ready" } | { type:"init-error", msg } | { type:"started", id } | { type:"result", id, result }
// sql.js는 빌드 때 esbuild가 이 파일 안에 묶어 넣는다(작업 16). 꾸러미의 "browser" 갈래(dist/sql-wasm-browser.js)라서
// node 전용 require가 없고, 실행 중에 글자를 받아 코드로 바꾸지 않는다(new Function·eval·importScripts 없음 →
// 엄격한 CSP에서도 돎, 하위 경로·서비스 작업자 저장본에서도 같은 파일 하나). wasm만 따로 받는다(wasmURL).
import initSqlJs from "sql.js";
import { openMarket, execOne } from "./sqlcore.js";

let db = null;

self.onmessage = async (ev) => {
  const m = ev.data || {};
  if (m.type === "init") {
    try {
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
