// 두억이 의상 10벌 (설계 §8-4, D12). 값은 리아 의상 값 순서 그대로(100 · 180 × 4 · 240 × 2 · 300).
// short: 대사 {outfit}에 넣는 짧은 이름(C16, 조사 없이). price: null = 판매 안 함. unlock = 판매 외 얻는 방법.
// desc = 의상실 설명. voice: 입으면 바뀌는 오류 설명 말투(data/errors.js의 같은 이름 칸) — 탐정 의상(판정 R14)
// 그림은 src/dueogi.js(OUTFIT_IDS와 같은 차례).
export const OUTFITS = [
  { id: "basic", short: "기본 옷", name: "기본 (베 저고리·털 조끼)", price: null, unlock: "start", desc: "장터를 누비는 두억이 그대로!" },
  { id: "merchant", short: "상인 옷", name: "장터 상인 (앞치마·주판)", price: 110, desc: "엽전 셈은 주판알처럼 착착!" },
  { id: "seonbi", short: "선비 옷", name: "선비 (갓·도포)", price: 180, desc: "장부도 글공부처럼 차근차근" },
  { id: "podol", short: "포졸 옷", name: "포졸 (전립·쾌자)", price: 180, desc: "장터 순찰, 빠진 행은 없나?" },
  { id: "detective", short: "탐정 옷", name: "탐정", price: 180, desc: "오류의 단서를 쫓아라!", voice: "detective" },
  { id: "winter", short: "겨울 털옷", name: "겨울 털옷", price: 180, desc: "추운 날에도 장부는 따끈하게" },
  { id: "gukbap", short: "주방장 옷", name: "국밥집 주방장", price: 240, desc: "한 그릇씩 묶어서 세어 볼까?" },
  { id: "seolbim", short: "설빔", name: "설빔 한복", price: 240, desc: "새해 첫 장터 나들이 차림" },
  { id: "hunjang", short: "훈장 옷", name: "서당 훈장", price: 300, desc: "이제 내가 가르쳐 볼까?" },
  { id: "graduate", short: "졸업 가운", name: "졸업 (학사모·가운)", price: null, unlock: "streak30", desc: "꾸준함이 졸업장을 만들어요!" },
];
