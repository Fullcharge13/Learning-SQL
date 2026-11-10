// SQL 작업자를 다루는 화면 쪽 손잡이 (리아 PyRun과 같은 방식).
//
//   const sq = new SqlRun({ wasmURL, workerURL, marketSql });
//   sq.onstatus = (status, phase) => {};   // status: "loading"|"ready"|"failed", phase: "first-load"|"restart"
//   const off = sq.listen((status, phase) => {}); // 여러 화면이 함께 들을 때
//   sq.preload();
//   const r = await sq.run("SELECT 1");    // { columns, rows, error, truncated, timeout, ms }
//   const r2 = await sq.run(sql, { timeoutMs: 10000 }); // 이번 실행만 제한 시간을 바꿈(v0.1.1 느린 기기 다시 돌리기)
//
// - 실행은 한 번에 하나씩(대기열). 제한 시간(기본 3초)을 넘으면 작업자를 끝내고 새로 띄운다 → error "timeout".
// - 작업자는 실행을 받자마자 "started"를 보낸다. 제한 시간이 지나도 확인이 없었다면 작업자가 이미
//   죽어 있던 것이므로 error "worker". 불러오기 실패는 error "load". run()은 거부하지 않는다.
// - 불러오기 실패는 붙잡아 두지 않고 다음 preload()·run()에서 다시 시도한다.
// - ms(v0.1.1): 작업자에게 SQL을 보낸 때부터 결과(또는 시간 초과)까지의 시간. 대기열에서 앞 실행을 기다린 시간과
//   실행기를 (다시) 띄우는 시간은 빼고 잰다 — 그 기기에서 SQL 하나가 얼마나 걸리는지만 보려고.
//   실행기를 못 받아 보내지도 못한 실패(load)에는 ms가 없다.

export const DEFAULT_TIMEOUT_MS = 3000;
export const DEFAULT_LOAD_TIMEOUT_MS = 30000;

const now = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

function baseHref() {
  return (typeof location !== "undefined" && location.href) || import.meta.url;
}
function failResult(error, extra = {}) {
  return { columns: [], rows: [], error, truncated: false, timeout: false, ...extra };
}
function cleanResult(r) {
  return {
    columns: Array.isArray(r?.columns) ? r.columns.map(String) : [],
    rows: Array.isArray(r?.rows) ? r.rows : [],
    error: r?.error == null ? null : String(r.error),
    truncated: !!r?.truncated,
    timeout: false,
  };
}

function cleanLedger(r) {
  const list = Array.isArray(r?.results) ? r.results : [];
  return { results: list.map(cleanResult), error: null, timeout: false };
}

export class SqlRun {
  constructor({ wasmURL, workerURL, marketSql = "", timeoutMs = DEFAULT_TIMEOUT_MS, loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
    // wasm은 페이지 주소 기준(깃허브 페이지 하위 경로 /Learning-SQL/에서도 index.html 옆). sql.js 코드는 worker.js 안에 묶여 있다
    this.wasmURL = new URL(wasmURL, baseHref()).href;
    this.workerURL = workerURL || new URL("./worker.js", import.meta.url);
    this.marketSql = marketSql;
    this.timeoutMs = timeoutMs;
    this.loadTimeoutMs = loadTimeoutMs;
    this.status = "idle";
    this.phase = "first-load";
    this.onstatus = null;
    this._listeners = new Set();
    this._everReady = false;
    this._worker = null;
    this._readyP = null;
    this._pending = null;
    this._nextId = 0;
    this._queue = Promise.resolve();
  }

  get ready() { return this.preload(); }

  preload() { return this._readyP || this._spawn(); }

  run(sql, { timeoutMs } = {}) {
    const limit = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : this.timeoutMs;
    const job = this._queue.then(() => this._exec(
      { type: "run", sql: sql == null ? "" : String(sql) }, limit, cleanResult, failResult));
    this._queue = job.then(() => {}, () => {});
    return job;
  }

  /** 임시 장부(v0.3)에서 질의 여러 개를 한 번에 돌린다. 결과는 { results, error, timeout }.
   *  error는 실행기 전체의 실패("timeout"·"worker"·"load")일 때만 글자, 질의별 오류는 results[i].error. */
  runLedger(ledgerSql, queries, { timeoutMs = 6000 } = {}) {
    const limit = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 6000;
    const qs = Array.isArray(queries) ? queries.map((x) => (x == null ? "" : String(x))) : [];
    const job = this._queue.then(() => this._exec(
      { type: "ledger", ledgerSql: String(ledgerSql == null ? "" : ledgerSql), queries: qs },
      limit,
      cleanLedger,
      (error, extra) => ({ results: [], error, timeout: !!extra?.timeout }),
    ));
    this._queue = job.then(() => {}, () => {});
    return job;
  }

  _testKill() { if (this._worker) this._worker.terminate(); }

  /** 상태 알림을 여럿이 받는다(인사 화면·조립 문제). 돌려준 함수를 부르면 그만 받음 */
  listen(fn) {
    this._listeners.add(fn);
    return () => { this._listeners.delete(fn); };
  }

  _setStatus(s) {
    this.status = s;
    for (const fn of [this.onstatus, ...this._listeners]) {
      if (typeof fn !== "function") continue;
      try { fn(s, this.phase); } catch (_) { /* 화면 쪽 오류가 실행을 막지 않게 */ }
    }
  }

  _spawn() {
    this.phase = this._everReady ? "restart" : "first-load";
    this._setStatus("loading");
    let resolveReady, rejectReady;
    const p = new Promise((ok, no) => { resolveReady = ok; rejectReady = no; });
    p.catch(() => {});
    this._readyP = p;

    let w;
    try {
      w = new Worker(this.workerURL, { type: "module" });
    } catch (e) {
      this._loadFailed(null, rejectReady, e);
      return p;
    }
    this._worker = w;
    let isReady = false;
    const loadTimer = setTimeout(() => {
      if (this._worker === w && !isReady) {
        this._loadFailed(w, rejectReady, new Error("SQL engine did not load within " + this.loadTimeoutMs + " ms"));
      }
    }, this.loadTimeoutMs);

    w.onmessage = (ev) => {
      if (this._worker !== w) return;
      const m = ev.data || {};
      if (m.type === "ready") {
        clearTimeout(loadTimer);
        isReady = true;
        this._everReady = true;
        this._setStatus("ready");
        resolveReady();
      } else if (m.type === "init-error") {
        clearTimeout(loadTimer);
        this._loadFailed(w, rejectReady, new Error(m.msg));
      } else if (m.type === "started") {
        if (this._pending && this._pending.id === m.id) this._pending.started = true;
      } else if (m.type === "result") {
        if (this._pending && this._pending.id === m.id) this._pending.finish(this._pending.clean(m.result));
      }
    };
    const onCrash = (ev) => {
      if (this._worker !== w) return;
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      const msg = (ev && ev.message) || "worker crashed";
      clearTimeout(loadTimer);
      if (!isReady) {
        this._loadFailed(w, rejectReady, new Error(msg));
      } else {
        const pend = this._pending;
        this._restart();
        if (pend) pend.finish(pend.fail("worker"));
      }
    };
    w.onerror = onCrash;
    w.onmessageerror = onCrash;

    try {
      w.postMessage({ type: "init", wasmURL: this.wasmURL, marketSql: this.marketSql });
    } catch (e) {
      clearTimeout(loadTimer);
      this._loadFailed(w, rejectReady, e);
    }
    return p;
  }

  _loadFailed(w, rejectReady, e) {
    if (w) { try { w.terminate(); } catch (_) { /* 무시 */ } }
    if (!w || this._worker === w) {
      this._worker = null;
      this._readyP = null;
    }
    this._setStatus("failed");
    rejectReady(e instanceof Error ? e : new Error(String(e)));
  }

  _restart() {
    const old = this._worker;
    this._worker = null;
    this._readyP = null;
    if (old) { try { old.terminate(); } catch (_) { /* 무시 */ } }
    this._spawn();
  }

  // 작업자에 말 하나를 보내고 결과를 기다린다. clean: 받은 result 정리, fail: 실패 결과 만들기
  async _exec(msg, timeoutMs, clean, fail) {
    // 멈춘 작업자는 onCrash가 곧바로 _restart()로 새로 띄우므로, 여기서는 준비만 기다린다
    try {
      await this.preload();
    } catch (_) {
      return fail("load");
    }
    if (!this._worker) return fail("load");
    const w = this._worker;
    const id = ++this._nextId;
    const t0 = now();
    return new Promise((resolve) => {
      let timer = null;
      const finish = (r) => {
        if (!this._pending || this._pending.id !== id) return;
        this._pending = null;
        clearTimeout(timer);
        resolve({ ...r, ms: now() - t0 });
      };
      this._pending = { id, started: false, finish, clean, fail };
      timer = setTimeout(() => {
        const started = this._pending && this._pending.id === id && this._pending.started;
        finish(started ? fail("timeout", { timeout: true }) : fail("worker"));
        this._restart();
      }, timeoutMs);
      try {
        w.postMessage({ ...msg, id });
      } catch (_) {
        finish(fail("worker"));
        this._restart();
      }
    });
  }
}
