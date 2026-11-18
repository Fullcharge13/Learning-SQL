// v0.3.4 화면 설정 「밤의 장터」: 저장·해석·적용, 그리고 build.py 머리 스크립트(THEME_HEAD)와 같은 규칙인지
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { THEME_KEY, THEME_COLOR, getTheme, setTheme, resolvedTheme, applyTheme, watchSystem } from "../../src/theme.js";

function fakeEnv({ stored, systemDark = false, throwing = false } = {}) {
  const m = new Map(stored === undefined ? [] : [[THEME_KEY, stored]]);
  const root = { dataset: {}, style: {}, setAttribute(k, v) { if (k === "data-theme") this.dataset.theme = v; } };
  const meta = { content: "#FBF6EA", setAttribute(k, v) { this[k] = v; } };
  const listeners = [];
  const mq = { get matches() { return env.systemDark; },
    addEventListener: (_, f) => listeners.push(f), removeEventListener: (_, f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); } };
  const env = { systemDark, listeners, m, root, meta,
    localStorage: {
      getItem: (k) => { if (throwing) throw new Error("denied"); return m.has(k) ? m.get(k) : null; },
      setItem: (k, v) => { if (throwing) throw new Error("denied"); m.set(k, String(v)); },
    },
    document: { documentElement: root, querySelector: (q) => (q.includes("theme-color") ? meta : null) },
    matchMedia: () => mq };
  return env;
}
function install(env) {
  for (const k of ["localStorage", "document", "matchMedia"]) Object.defineProperty(globalThis, k, { value: env[k], configurable: true, writable: true });
}
beforeEach(() => install(fakeEnv()));

test("이름표: 저장 칸 dueogi-sql.theme, 색은 밝게 #FBF6EA·어둡게 #141C2B", () => {
  assert.equal(THEME_KEY, "dueogi-sql.theme");
  assert.equal(THEME_COLOR.light, "#FBF6EA");
  assert.equal(THEME_COLOR.dark, "#141C2B");
});

test("THEME_COLOR.dark = style.css 어둡게 --paper (작업 3)", () => {
  const css = fs.readFileSync(new URL("../../src/style.css", import.meta.url), "utf8");
  const dark = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(dark, "style.css에 :root[data-theme=\"dark\"] 이름표 묶음");
  assert.equal(dark[1].match(/--paper:\s*(#[0-9A-Fa-f]{6})/)[1].toUpperCase(), THEME_COLOR.dark.toUpperCase());
});

test("저장 없음 → system, 이상한 값(purple) → system", () => {
  assert.equal(getTheme(), "system");
  install(fakeEnv({ stored: "purple" }));
  assert.equal(getTheme(), "system");
  assert.equal(resolvedTheme(), "light");
});

test("저장소가 throw → system이고 오류 없음, 적용도 오류 없음", () => {
  const env = fakeEnv({ throwing: true }); install(env);
  assert.equal(getTheme(), "system");
  assert.equal(resolvedTheme(), "light");
  assert.doesNotThrow(() => applyTheme());
  assert.equal(env.root.dataset.theme, "light");
  assert.doesNotThrow(() => setTheme("dark"));   // 저장은 못 해도 이번 화면은 바뀜(이 페이지 동안만 기억)
  assert.equal(env.root.dataset.theme, "dark");
  assert.equal(getTheme(), "dark");
  setTheme("system");   // 다음 시험을 위해 기억을 처음 값으로
  assert.equal(env.root.dataset.theme, "light");
});

test("setTheme(dark): 저장 값 dark, resolvedTheme dark, data-theme·color-scheme·theme-color", () => {
  const env = fakeEnv(); install(env);
  assert.equal(setTheme("dark"), "dark");
  assert.equal(env.m.get(THEME_KEY), "dark");
  assert.equal(resolvedTheme(), "dark");
  assert.equal(env.root.dataset.theme, "dark");
  assert.equal(env.root.style.colorScheme, "dark");
  assert.equal(env.meta.content, THEME_COLOR.dark);
  setTheme("light");
  assert.equal(env.root.dataset.theme, "light");
  assert.equal(env.meta.content, "#FBF6EA");
  setTheme("zzz");
  assert.equal(env.m.get(THEME_KEY), "system");
});

test("system + matchMedia(dark=true) → dark, 고른 값은 시스템을 이김", () => {
  install(fakeEnv({ systemDark: true }));
  assert.equal(resolvedTheme(), "dark");
  install(fakeEnv({ stored: "light", systemDark: true }));
  assert.equal(resolvedTheme(), "light");
  install(fakeEnv({ stored: "dark", systemDark: false }));
  assert.equal(resolvedTheme(), "dark");
});

test("watchSystem: system일 때만 따라가고, 끄면 멈춤", () => {
  const env = fakeEnv({ systemDark: false }); install(env);
  const stop = watchSystem();
  env.systemDark = true; env.listeners.forEach((f) => f());
  assert.equal(env.root.dataset.theme, "dark");
  setTheme("light");
  env.listeners.forEach((f) => f());
  assert.equal(env.root.dataset.theme, "light", "밝게를 골랐으면 시스템이 어두워도 그대로");
  stop();
  assert.equal(env.listeners.length, 0);
});

/** build.py의 THEME_HEAD(배포판·개발판 머리 스크립트) 글자 */
function headScript() {
  const py = fs.readFileSync(new URL("../../build.py", import.meta.url), "utf8");
  const m = py.match(/THEME_HEAD = """<script>([\s\S]*?)<\/script>"""/);
  assert.ok(m, "build.py에 THEME_HEAD = \"\"\"<script>…</script>\"\"\"");
  return m[1];
}

test("머리 스크립트(build.py THEME_HEAD)와 resolvedTheme은 모든 경우에 같은 답", () => {
  const code = headScript();
  assert.ok(code.includes("dueogi-sql.theme"));
  const html = fs.readFileSync(new URL("../../src/index.html", import.meta.url), "utf8");
  assert.ok(html.includes("<!-- RIA:THEME -->") && html.indexOf("<!-- RIA:THEME -->") < html.indexOf("<!-- RIA:STYLE -->"), "자리는 스타일보다 먼저");
  // 입력 표 6줄(저장 값 × 시스템), 각 줄을 저장소가 되는 때와 throw하는 때 모두
  const rows = [[undefined, false], [undefined, true], ["light", true], ["dark", false], ["system", true], ["purple", false]];
  for (const [stored, systemDark] of rows) for (const throwing of [false, true]) {
    const env = fakeEnv({ stored, systemDark, throwing });
    vm.runInNewContext(code, { localStorage: env.localStorage, document: env.document, matchMedia: env.matchMedia });
    install(env);
    const want = resolvedTheme();
    const tag = JSON.stringify({ stored, systemDark, throwing });
    assert.equal(env.root.dataset.theme, want, tag);
    assert.equal(env.root.style.colorScheme, want, tag);
    assert.equal(env.meta.content, THEME_COLOR[want], tag);
  }
});
