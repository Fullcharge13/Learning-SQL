// 시험용 가짜 레슨(경제 시뮬레이션 시험 전용). 실제 레슨이 아니다.
export const CHAPTER = { id: 4, title: "시험용 4장" };
export const LESSONS = [
  { id: "4-1", chapter: 4, title: "시험용 4-1", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-join" },
    { type: "write", task: "시험 작성 4-1", concept: "c-join", tests: [] },
  ] },
  { id: "4-2", chapter: 4, title: "시험용 4-2", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-select" },
    { type: "write", task: "시험 작성 4-2", concept: "c-select", tests: [] },
  ] },
  { id: "4-3", chapter: 4, title: "시험용 4-3", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-where" },
    { type: "write", task: "시험 작성 4-3", concept: "c-where", tests: [] },
  ] },
  { id: "4-4", chapter: 4, title: "시험용 4-4", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-order" },
    { type: "write", task: "시험 작성 4-4", concept: "c-order", tests: [] },
  ] },
  { id: "4-5", chapter: 4, title: "시험용 4-5", isExam: true, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-agg" },
    { type: "write", task: "시험 작성 4-5", concept: "c-agg", tests: [] },
  ] },
];
