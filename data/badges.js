// 배지 16개 (설계 §7): 「첫 조회」, 장 이름 단위 묶음 4개(1~5장 · 6~9장 · 10~13장 · 14~17장),
// 리아에서 그대로 온 11개(연속 7/30/100일, 오류 해결사, 힌트 없이 10회, 완벽주의자, 복습왕, 의상 수집가, 밤 공부, 심화 2개).
// desc = 얻기 전 회색 실루엣 아래에 보이는 조건 문구
export const BADGES = [
  { id: "first_query", name: "첫 조회", desc: "첫 레슨(1-1)을 끝내요" },
  { id: "book_reader", name: "장부 읽기", desc: "1~5장을 마치고 5장 평가를 통과해요" },
  { id: "count_dokkaebi", name: "셈 도깨비", desc: "6~9장을 마치고 9장 평가를 통과해요" },
  { id: "join_master", name: "조인 장인", desc: "10~13장을 마치고 13장 평가를 통과해요" },
  { id: "analyst", name: "분석 도깨비", desc: "14~17장을 마치고 17장 평가를 통과해요" },
  { id: "streak7", name: "연속 7일", desc: "7일 연속으로 하루 목표를 채워요" },
  { id: "streak30", name: "연속 30일", desc: "30일 연속으로 하루 목표를 채워요" },
  { id: "streak100", name: "연속 100일", desc: "100일 연속으로 하루 목표를 채워요" },
  { id: "fixer", name: "오류 해결사", desc: "오류가 난 조립을 고쳐서 5번 통과해요" },
  { id: "hintfree10", name: "힌트 없이 10회", desc: "힌트 없이 카드 조립을 10번 통과해요" },
  { id: "perfectionist", name: "완벽주의자", desc: "실수 없는 레슨을 10번 끝내요" },
  { id: "reviewer", name: "복습왕", desc: "복습 문제를 30개 풀어요" },
  { id: "collector", name: "의상 수집가", desc: "기본 옷 말고 의상 3벌을 모아요" },
  { id: "night_owl", name: "밤 공부", desc: "밤 10시부터 새벽 4시 사이에 레슨을 끝내요" },
  { id: "advanced1", name: "심화 첫걸음", desc: "심화 레슨을 하나 끝내요" },
  { id: "advancedAll", name: "깊이 파는 사람", desc: "지금 있는 심화 레슨을 모두 끝내요" },
];
