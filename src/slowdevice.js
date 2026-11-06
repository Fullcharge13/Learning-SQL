// 느린 휴대폰의 시간 초과 (v0.1.1, 사용자 승인 「느린 기기면 한 번 더 기다리기」)
//
// 학습자 SQL이 기본 제한(3초)을 넘으면, 그 문제의 정답 SQL이 이 기기에서 얼마나 걸리는지 본다.
// - 정답이 SLOW_EXPECTED_MS(1초) 이하 → 빠른 기기. 시간 초과는 지금처럼 학습자 SQL 탓(ON 없는 조인 등)으로 오답.
// - 정답이 1초를 넘거나 정답마저 시간 초과 → 느린 기기. 학습자 SQL을 SLOW_RETRY_TIMEOUT_MS(10초) 제한으로 한 번 더.
//   끝나면 그 결과로 채점, 또 시간 초과면 세지 않고(busy) 「휴대폰이 좀 바빠서…」 안내.
//
// 정답 실행 시간은 SqlRun 결과의 ms(작업자에게 보낸 때부터 결과까지)를 쓴다. 화면 쪽에서 sql.run 앞뒤로
// performance.now()를 재면 대기열(앞 실행)과 시간 초과 뒤 실행기를 다시 띄우는 시간(sql.js·장터 데이터 불러오기,
// 느린 기기에서 수 초)이 섞여, 빠른 기기도 느리다고 잘못 볼 수 있어서다.
export const SLOW_EXPECTED_MS = 1000;
export const SLOW_RETRY_TIMEOUT_MS = 10000;

const isTimeout = (r) => !!r && r.error === "timeout";

/** 정답 SQL 결과로 이 기기가 느린지. 잰 시간이 없거나 실행기 문제(worker·load)는 느림으로 보지 않는다(지금 그대로) */
export function isSlowDevice(exp) {
  if (!exp) return false;
  if (exp.slow === true || isTimeout(exp)) return true;
  return typeof exp.ms === "number" && exp.ms > SLOW_EXPECTED_MS;
}

/** 정답 SQL 실행. 기본 제한에서 시간 초과면(그 자체로 느린 기기) 긴 제한으로 한 번 더 돌리고 slow 표시를 붙인다 */
export async function runExpected(sql, text) {
  const r = await sql.run(text);
  if (!isTimeout(r)) return r;
  const r2 = await sql.run(text, { timeoutMs: SLOW_RETRY_TIMEOUT_MS });
  return { ...r2, slow: true };
}

/**
 * 학습자 실행 결과 r을 정리한다.
 * @param r      sql.run(text) 결과
 * @param sql    { run(sql, { timeoutMs }) }
 * @param text   학습자 SQL
 * @param expectedText 정답 SQL(느려 보일 때 한 번 더 재는 데 씀)
 * @param expected () => Promise<정답 결과>(runExpected, 화면에서는 문제마다 한 번만 실행해 둔 것)
 * @param onWait 학습자 SQL이 처음 시간 초과된 바로 뒤, 정답을 재기 전에 한 번 부름(「조금 더 기다려 볼게요」 표시).
 *               아주 느린 기기는 3초 + 정답 재기 + 10초로 최악 25초쯤 기다리므로 처음부터 알린다
 * @returns { r, busy, retried } — busy면 r은 쓰지 않고 세지 않는다
 *
 * 정답이 1초를 넘게 걸렸으면(가비지 수집·주 스레드 멈칫 한 번일 수 있음) 정답을 딱 한 번 더 재서
 * 작은 쪽으로 판정한다. 두 번 다 느려야 느린 기기. 다시 잰 것이 실행기 문제(worker·load)면 첫 측정을 쓴다.
 * 문제마다 한 번 실행해 둔 정답 결과(expected)는 그대로 두고, 시간 초과가 날 때마다 이렇게 다시 확인한다.
 */
export async function settleTimeout(r, { sql, text, expectedText = null, expected, onWait = null }) {
  if (!isTimeout(r)) return { r, busy: false, retried: false };
  if (onWait) { try { onWait(); } catch (_) { /* 표시는 없어도 됨 */ } }
  let exp = null;
  try { exp = await expected(); } catch (_) { exp = null; }
  let slow = isSlowDevice(exp);
  if (slow && expectedText != null) {
    const again = await sql.run(expectedText);
    const engineTrouble = again && again.error && !isTimeout(again);
    if (!engineTrouble) slow = isSlowDevice(again);   // 두 번 다 느려야(작은 쪽이 1초 넘어야) 느린 기기
  }
  if (!slow) return { r, busy: false, retried: false };
  const r2 = await sql.run(text, { timeoutMs: SLOW_RETRY_TIMEOUT_MS });
  if (isTimeout(r2)) return { r: r2, busy: true, retried: true };
  return { r: r2, busy: false, retried: true };
}
