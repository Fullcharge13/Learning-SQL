// 하루 한 번 돌리기(화면·시험·시뮬레이션 공용): 장부 SQL → 켜진 열린 칸의 SQL(+ 하루 보고 의뢰의 정답 SQL)을
// 한 묶음으로 실행 → 결과를 칸 행동으로 받기 → runDay → 의뢰 판정. 모든 칸은 같은 아침 장부를 본다(설계 §2-2).
import { SLOTS } from "../../data/stall.js";
import { ledgerSql } from "./ledger.js";
import { openSlots, slotSql, acceptRows } from "./slots.js";
import { runDay } from "./day.js";
import { currentRequest, advanceRequests } from "./requests.js";

const EMPTY = "빈자리를 채워 주세요";

/**
 * @param {object} stall 가게 상태(바꾸지 않음)
 * @param {Set<number>} passed 평가를 통과한 장 번호
 * @param {(ledgerSql:string, queries:string[]) => Promise<{results:object[], error:string|null, timeout:boolean}>} runLedger
 * @returns {Promise<{stall:object, events:object[], summary:object, completed:object[], rest:object}>}
 *   실행기 자체가 실패하면(load·worker 등, 시간 초과 말고) throw — 하루는 지나지 않는다.
 */
export async function playDay(stall, passed, runLedger) {
  const open = new Set(openSlots(passed).map((d) => d.id));
  const actions = { pricing: [], restock: [], best: [], discount: [], display: null, report: null, rest: {} };
  const jobs = []; // [칸 정의, SQL]
  for (const def of SLOTS) {
    const st = stall.slots && stall.slots[def.id];
    if (!open.has(def.id) || !st || st.on !== true) continue; // 꺼짐·안 열림: 행동 없음(진열은 기본 진열)
    const sql = slotSql(def, st);
    if (sql === null) { actions.rest[def.id] = EMPTY; continue; }
    jobs.push([def, sql]);
  }
  const { req, waiting } = currentRequest(stall, passed);
  const answerSql = req && !waiting && req.goal.type === "report" ? req.goal.answerSql : null;
  const queries = jobs.map(([, sql]) => sql);
  if (answerSql) queries.push(answerSql);

  let results = [];
  if (queries.length) {
    const r = await runLedger(ledgerSql(stall), queries);
    if (r && r.error && !r.timeout && r.error !== "timeout") throw new Error(String(r.error));
    // 시간 초과: 어느 질의가 느린지 모르므로 이번에 돌린 칸이 모두 쉰다(하루는 지남)
    results = r && (r.timeout || r.error === "timeout")
      ? queries.map(() => ({ columns: [], rows: [], error: "timeout" }))
      : (r && Array.isArray(r.results) ? r.results : []);
  }

  jobs.forEach(([def], i) => {
    const got = acceptRows(def, results[i] || { error: "worker" }, stall);
    if (!got.ok) { actions.rest[def.id] = got.why; return; }
    if (def.kind === "number") actions.report = got.value;
    else actions[def.id] = got.ids;
  });

  let reportAnswer = null;
  if (answerSql) {
    const a = results[jobs.length];
    if (a && !a.error && Array.isArray(a.rows) && a.rows.length && Array.isArray(a.rows[0])) {
      reportAnswer = a.rows[0][0] === undefined ? null : a.rows[0][0];
    }
  }

  const day = runDay(stall, actions);
  const adv = advanceRequests(day.stall, passed, day.summary, reportAnswer);
  return { stall: adv.stall, events: day.events, summary: day.summary, completed: adv.completed, rest: { ...actions.rest } };
}
