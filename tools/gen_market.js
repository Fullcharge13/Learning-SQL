// 도깨비 장터 데이터 생성기 (설계 §5). 같은 씨앗이면 언제나 같은 SQL이 나온다.
//   node tools/gen_market.js  →  data/market.sql 을 씀
//
// 정의 (시험 tests/unit/market.test.js 가 같은 정의를 쓴다)
//   매출      = 완료 주문의 SUM(order_items.qty * items.price)  (취소 주문은 뺀다)
//   재방문율  = 어떤 달에 처음 온 손님 중, 그 달보다 "나중 달"에 완료 주문이 하나라도 있는 손님의 비율
//   (3명 미만인 코호트는 비교에서 뺀다)
//
// 일부러 심은 무늬
//   - 약재 가게는 6~8월에 팔림이 크게 늘어난다 (가게 종류 × 달 가중치)
//   - 3월에 처음 온 손님은 모두 다시 온다, 다른 달 손님은 절반쯤만 다시 온다 (첫 방문 달 × 재방문 성향)
//   - 공방(방망이류)은 주문 건수가 적고 한 건 금액이 크다 (가게 종류 가중치 + 비싼 값)
//   - 12월에 주문이 몰린다 (달 가중치)
//   - 나이 모르는 손님, 재고 칸이 빈 물건, 주문 없는 손님, 팔린 적 없는 물건을 심었다 (NULL·짝 없는 행 연습용)
//
// 고증: 가게·물건·손님 이름은 모두 이 앱을 위해 지어낸 것이다. 도깨비 종류는 지금은 「도깨비·사람·여우」만 쓴다.
//   손님 종류 kind(도깨비·사람·여우)는 장터 설정일 뿐 민속 사실을 주장하지 않는다(작업 17 확인, 2026-11-06).
//   확인한 사전 항목(한국민족문화대백과사전 「도깨비」 E0015527·「도깨비 설화」 E0015531·「잡귀」 E0048201(두억시니))과
//   확인 날짜, 확인하지 못한 것은 docs/lore-sources.md에 있다. 이 주석만 바꿨고 만든 데이터(data/market.sql)는 그대로다.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "../src/template.js";

const SHOPS = [
  ["도깨비 국밥집", "달래 할멈", "먹거리"],
  ["여우골 떡방", "금순", "먹거리"],
  ["산삼 약방", "한약수", "약재"],
  ["달빛 약초방", "송약초", "약재"],
  ["구름 잡화점", "최보부", "잡화"],
  ["바람 보따리", "오영감", "잡화"],
  ["방망이 대장간", "쇠돌", "공방"],
  ["뚝딱 공방", "나무쇠", "공방"],
];
// [이름, 값(엽전), 인기 가중치]  (가중치 0 = 팔린 적 없음)
const ITEMS = [
  [["국밥", 12, 3], ["수육", 25, 2.5], ["도토리묵", 8, 2], ["막걸리", 10, 1.5], ["메밀전", 9, 1]],
  [["인절미", 6, 3], ["송편", 7, 2.5], ["약과", 9, 2], ["식혜", 5, 1.5], ["꿀떡", 8, 0]],
  [["산삼", 120, 1], ["인삼차", 30, 3], ["쌍화탕", 22, 2.5], ["감초", 12, 2], ["오미자청", 25, 1.5]],
  [["도라지", 15, 3], ["쑥뜸", 18, 2.5], ["익모초", 20, 2], ["구기자", 28, 1.5], ["약초 주머니", 35, 1]],
  [["짚신", 14, 3], ["부채", 11, 2.5], ["비단 주머니", 40, 2], ["한지", 6, 1.5], ["등불", 24, 1]],
  [["갓", 110, 1], ["담뱃대", 33, 2.5], ["복주머니", 28, 3], ["노리개", 45, 1.5], ["보따리", 16, 0]],
  [["도깨비방망이", 320, 3], ["금방망이", 400, 1], ["은방망이", 280, 2], ["방망이 손잡이", 150, 2.5], ["작은 방망이", 180, 1.5]],
  [["다듬이방망이", 170, 3], ["빨래방망이", 130, 2.5], ["놋그릇", 190, 2], ["쇠솥", 260, 1.5], ["장승", 350, 0.7]],
];
const STOCK_NULL = new Set(["메밀전", "한지", "장승"]); // 재고 칸이 빈 물건
const OPENED = ["2026-01-02", "2026-01-02", "2026-01-03", "2026-01-03", "2026-01-04", "2026-01-04", "2026-01-01", "2026-01-05"];

const DOKKAEBI = ["덜렁이", "뚝딱이", "쿵쾅이", "번쩍이", "도래미", "달그락", "우당탕", "깨비동", "쇠뭉치", "털북이", "꾀돌이", "푸짐이", "둥실이", "방실이", "무쇠", "돌쇠", "산돌이", "바람돌이", "곰실이", "소란이", "허허실실", "굴렁이", "어슬렁", "뭉치"];
const PEOPLE = ["김온새", "이도윤", "박서연", "최하늘", "정다온", "한가람", "윤보리", "강나래", "조은솔", "임바다", "서담이", "오이든", "신아람", "문새봄", "배누리", "황소담", "류해든", "남이슬", "노을이", "구름이", "차한결", "손지우", "안여울", "표다솜"];
const FOXES = ["여름이", "구미", "은호", "연화", "하연", "백설", "해랑", "단비", "솔아", "초롱", "미르", "보람"];
const VILLAGES = ["솔바위골", "달빛마을", "버드나무고개", "느티나무골", "여우고개", "은행나무마을", "개울마을", "큰바위마을"];
// 달마다 처음 오는 손님 수 (합 60). 3월이 가장 많다.
const FIRST_PER_MONTH = [6, 5, 8, 5, 5, 5, 5, 5, 5, 4, 3, 4];
const NO_ORDER_MONTHS = [2, 6, 9]; // 주문 없는 손님을 한 명씩 두는 달
const SEASON = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.6]; // 달별 주문 가중치(12월)
const CAT_W = { 먹거리: 4, 약재: 3, 잡화: 3, 공방: 0.9 };

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const d2 = (n) => String(n).padStart(2, "0");
const date = (m, d) => `2026-${d2(m)}-${d2(d)}`;

export function generateMarket(seed = 2026) {
  const rnd = mulberry32(seed);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pickW = (list, w) => {
    let t = 0;
    for (const x of list) t += w(x);
    let r = rnd() * t;
    for (const x of list) { r -= w(x); if (r < 0) return x; }
    return list[list.length - 1];
  };
  const shuffle = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = int(0, i); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };

  // --- 가게·물건
  const shops = SHOPS.map(([name, owner, category], i) => ({ shop_id: i + 1, name, owner, category, opened_on: OPENED[i] }));
  const items = [];
  ITEMS.forEach((list, si) => list.forEach(([name, price, w]) => {
    const item_id = items.length + 1;
    const stock = STOCK_NULL.has(name) ? null : int(0, 60);
    items.push({ item_id, shop_id: si + 1, name, price, stock, w, cat: SHOPS[si][2] });
  }));

  // --- 손님: 달별 첫 방문
  const names = shuffle([
    ...shuffle(DOKKAEBI).slice(0, 24).map((n) => [n, "도깨비"]),
    ...shuffle(PEOPLE).slice(0, 24).map((n) => [n, "사람"]),
    ...shuffle(FOXES).slice(0, 12).map((n) => [n, "여우"]),
  ]);
  const customers = [];
  FIRST_PER_MONTH.forEach((cnt, mi) => {
    const days = [];
    for (let k = 0; k < cnt; k++) days.push(int(mi === 0 ? 5 : 1, 28));
    days.sort((a, b) => a - b);
    for (const day of days) customers.push({ month: mi + 1, day, first_visit: date(mi + 1, day) });
  });
  const nullAge = new Set(shuffle(customers.map((_, i) => i)).slice(0, 5));
  customers.forEach((c, i) => {
    c.customer_id = i + 1;
    [c.name, c.kind] = names[i];
    c.age = nullAge.has(i) ? null : int(8, 75);
    c.village = VILLAGES[int(0, VILLAGES.length - 1)];
    c.act = 0.5 + rnd() * 1.5;
  });
  // 주문 없는 손님
  for (const m of NO_ORDER_MONTHS) {
    const pool = customers.filter((c) => c.month === m);
    pool[int(0, pool.length - 1)].noOrder = true;
  }
  // 재방문 성향: 3월 코호트는 모두, 나머지는 주문 있는 손님의 절반쯤. 12월 첫 방문은 다시 올 달이 없다.
  for (let m = 1; m <= 12; m++) {
    const pool = customers.filter((c) => c.month === m && !c.noOrder);
    if (m === 3) { pool.forEach((c) => (c.returning = true)); continue; }
    if (m === 12) continue;
    shuffle(pool).slice(0, Math.floor(pool.length / 2)).forEach((c) => (c.returning = true));
  }

  // --- 주문
  const orders = []; // {customer_id, month, day, status, lines}
  const mkOrder = (c, month, day, status) => orders.push({ customer_id: c.customer_id, month, day, status, lines: [] });
  const stat = () => (rnd() < 0.08 ? "취소" : "완료");
  const buyers = customers.filter((c) => !c.noOrder);
  for (const c of buyers) mkOrder(c, c.month, c.day, stat());
  const eligible = (m) => buyers.filter((c) => c.month === m || (c.month < m && c.returning));
  const monthW = [];
  for (let m = 1; m <= 12; m++) monthW[m] = SEASON[m - 1] * Math.sqrt(eligible(m).length);
  const EXTRA = 534;
  for (let k = 0; k < EXTRA; k++) {
    const m = pickW([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], (x) => monthW[x]);
    const c = pickW(eligible(m), (x) => x.act * (x.returning ? 1.2 : 1));
    const day = m === c.month ? int(c.day, 28) : int(1, 28);
    mkOrder(c, m, day, stat());
  }
  // 재방문 성향 손님은 나중 달 완료 주문이 반드시 하나 있어야 한다
  for (const c of buyers.filter((x) => x.returning)) {
    if (orders.some((o) => o.customer_id === c.customer_id && o.status === "완료" && o.month > c.month)) continue;
    mkOrder(c, int(c.month + 1, 12), int(1, 28), "완료");
  }
  orders.sort((a, b) => a.month - b.month || a.day - b.day || a.customer_id - b.customer_id);
  orders.forEach((o, i) => (o.order_id = i + 1));

  // --- 주문 내역: 달·가게 종류에 따라 가중치
  const LINE_N = [[1, 30], [2, 40], [3, 22], [4, 8]];
  const shopOf = (it) => shops[it.shop_id - 1];
  for (const o of orders) {
    const n = pickW(LINE_N, (x) => x[1])[0];
    const used = new Set();
    for (let k = 0; k < n; k++) {
      const summer = o.month >= 6 && o.month <= 8;
      const it = pickW(items.filter((x) => !used.has(x.item_id)), (x) => {
        let w = (CAT_W[x.cat] / 2) * x.w;
        if (x.cat === "약재" && summer) w *= 2.6;
        return w;
      });
      used.add(it.item_id);
      const qty = it.cat === "공방" ? (rnd() < 0.85 ? 1 : 2) : pickW([1, 2, 3], (x) => [0, 60, 28, 12][x]);
      o.lines.push([it.item_id, qty]);
    }
  }

  // --- SQL
  const out = [];
  out.push(`CREATE TABLE shops (shop_id INTEGER PRIMARY KEY, name TEXT, owner TEXT, category TEXT, opened_on TEXT);`);
  out.push(`CREATE TABLE items (item_id INTEGER PRIMARY KEY, shop_id INTEGER, name TEXT, price INTEGER, stock INTEGER);`);
  out.push(`CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT, kind TEXT, age INTEGER, village TEXT, first_visit TEXT);`);
  out.push(`CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, ordered_on TEXT, status TEXT);`);
  out.push(`CREATE TABLE order_items (order_id INTEGER, item_id INTEGER, qty INTEGER);`);
  const ins = (table, rows) => {
    for (let i = 0; i < rows.length; i += 50) {
      out.push(`INSERT INTO ${table} VALUES\n` + rows.slice(i, i + 50).map((r) => "(" + r.join(",") + ")").join(",\n") + ";");
    }
  };
  const nul = (v) => (v === null ? "NULL" : v);
  ins("shops", shops.map((s) => [s.shop_id, q(s.name), q(s.owner), q(s.category), q(s.opened_on)]));
  ins("items", items.map((i) => [i.item_id, i.shop_id, q(i.name), i.price, nul(i.stock)]));
  ins("customers", customers.map((c) => [c.customer_id, q(c.name), q(c.kind), nul(c.age), q(c.village), q(c.first_visit)]));
  ins("orders", orders.map((o) => [o.order_id, o.customer_id, q(date(o.month, o.day)), q(o.status)]));
  ins("order_items", orders.flatMap((o) => o.lines.map(([id, qty]) => [o.order_id, id, qty])));
  return out.join("\n") + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = new URL("../data/market.sql", import.meta.url);
  writeFileSync(target, generateMarket(2026));
  console.log("wrote", fileURLToPath(target));
}
