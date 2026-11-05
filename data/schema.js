// 도깨비 장터 표·열의 한글 뜻 (설계 §5-1). 화면에는 영어 이름과 함께 보인다.
export const SCHEMA = {
  shops: {
    ko: "가게",
    cols: { shop_id: "가게 번호", name: "이름", owner: "주인", category: "종류", opened_on: "연 날" },
  },
  items: {
    ko: "물건",
    cols: { item_id: "물건 번호", shop_id: "가게 번호", name: "이름", price: "값(엽전)", stock: "재고" },
  },
  customers: {
    ko: "손님",
    cols: {
      customer_id: "손님 번호", name: "이름", kind: "종류", age: "나이", village: "사는 마을", first_visit: "첫 방문일",
    },
  },
  orders: {
    ko: "주문",
    cols: { order_id: "주문 번호", customer_id: "손님 번호", ordered_on: "주문 날짜", status: "상태" },
  },
  order_items: {
    ko: "주문 내역",
    cols: { order_id: "주문 번호", item_id: "물건 번호", qty: "수량" },
  },
};
