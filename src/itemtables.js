// v0.2.1: 문제가 읽는 장부(표) 목록 — 「쓸 표 보기」 단추가 쓴다.
// 문제에 tables가 있으면 그대로. 없으면 문제의 SQL(code·순서 줄·보기 sql)과 문제 글에서 표 이름을 찾는다:
// 영어 이름(낱말 경계: order_items 안의 items는 아님), 한글 이름 뒤에 「표·장부·(」가 오는 것(「주문 내역 표」는 주문이 아님).
// 빈칸 문제의 chips는 보지 않는다(고를 후보라서).
import { SCHEMA } from "../data/schema.js";

const NAMES = Object.keys(SCHEMA);
const reEn = Object.fromEntries(NAMES.map((t) => [t, new RegExp(`\\b${t}\\b`, "i")]));
const reKo = Object.fromEntries(NAMES.map((t) => [t, new RegExp(`${SCHEMA[t].ko}\\s*(표|장부|\\()`)]));

/** @returns {string[]} SCHEMA 순서의 표 이름들 */
export function tablesForItem(it) {
  if (!it) return [];
  if (Array.isArray(it.tables) && it.tables.length) return it.tables.slice();
  const opts = Array.isArray(it.options) ? it.options.map((o) => (o && typeof o === "object" ? o.sql : "")) : [];
  const sql = [it.code, ...(Array.isArray(it.lines) ? it.lines : []), ...opts].filter(Boolean).join("\n");
  const q = String(it.q || "");
  return NAMES.filter((t) => reEn[t].test(sql) || reEn[t].test(q) || reKo[t].test(q));
}
