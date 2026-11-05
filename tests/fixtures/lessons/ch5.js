// 시험용 가짜 레슨(경제 시뮬레이션 시험 전용). 실제 레슨이 아니다.
export const CHAPTER = { id: 5, title: "시험용 5장" };
export const LESSONS = [
  { id: "5-1", chapter: 5, title: "시험용 5-1", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-select" },
    { type: "write", task: "시험 작성 5-1", concept: "c-select", tests: [] },
  ] },
  { id: "5-2", chapter: 5, title: "시험용 5-2", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-where" },
    { type: "write", task: "시험 작성 5-2", concept: "c-where", tests: [] },
  ] },
  { id: "5-3", chapter: 5, title: "시험용 5-3", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-order" },
    { type: "write", task: "시험 작성 5-3", concept: "c-order", tests: [] },
  ] },
  { id: "5-4", chapter: 5, title: "시험용 5-4", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-agg" },
    { type: "write", task: "시험 작성 5-4", concept: "c-agg", tests: [] },
  ] },
  { id: "5-5", chapter: 5, title: "시험용 5-5", isExam: true, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-group" },
    { type: "write", task: "시험 작성 5-5", concept: "c-group", tests: [] },
  ] },
];
