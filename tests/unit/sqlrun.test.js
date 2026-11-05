import { test } from "node:test";
import assert from "node:assert/strict";
import { SqlRun } from "../../src/sqlrun.js";

test("sqlrun listen: several listeners get status, off stops them", () => {
  const r = new SqlRun({ wasmURL: "http://x/sql-wasm.wasm" });
  const a = [], b = [];
  r.onstatus = (s) => a.push("on:" + s);
  const offA = r.listen((s, phase) => a.push(s + "/" + phase));
  r.listen((s) => b.push(s));
  r._setStatus("loading");
  offA();
  r._setStatus("ready");
  assert.deepEqual(a, ["on:loading", "loading/first-load", "on:ready"]);
  assert.deepEqual(b, ["loading", "ready"]);
});
