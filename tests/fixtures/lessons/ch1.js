// 시험용 가짜 레슨(경제 시뮬레이션 시험 전용). 실제 레슨이 아니다.
export const CHAPTER = { id: 1, title: "시험용 1장" };
export const LESSONS = [
  { id: "1-1", chapter: 1, title: "시험용 1-1", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-order" },
    { type: "write", task: "시험 작성 1-1", concept: "c-order", tests: [] },
  ] },
  { id: "1-2", chapter: 1, title: "시험용 1-2", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-agg" },
    { type: "write", task: "시험 작성 1-2", concept: "c-agg", tests: [] },
  ] },
  { id: "1-3", chapter: 1, title: "시험용 1-3", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-group" },
    { type: "write", task: "시험 작성 1-3", concept: "c-group", tests: [] },
  ] },
  { id: "1-4", chapter: 1, title: "시험용 1-4", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-join" },
    { type: "write", task: "시험 작성 1-4", concept: "c-join", tests: [] },
  ] },
  { id: "1-5", chapter: 1, title: "시험용 1-5", isExam: true, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-select" },
    { type: "write", task: "시험 작성 1-5", concept: "c-select", tests: [] },
  ] },
];
