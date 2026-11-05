// 시험용 가짜 레슨(경제 시뮬레이션 시험 전용). 실제 레슨이 아니다.
export const CHAPTER = { id: 6, title: "시험용 6장" };
export const LESSONS = [
  { id: "6-1", chapter: 6, title: "시험용 6-1", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-where" },
    { type: "write", task: "시험 작성 6-1", concept: "c-where", tests: [] },
  ] },
  { id: "6-2", chapter: 6, title: "시험용 6-2", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-order" },
    { type: "write", task: "시험 작성 6-2", concept: "c-order", tests: [] },
  ] },
  { id: "6-3", chapter: 6, title: "시험용 6-3", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-agg" },
    { type: "write", task: "시험 작성 6-3", concept: "c-agg", tests: [] },
  ] },
  { id: "6-4", chapter: 6, title: "시험용 6-4", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-group" },
    { type: "write", task: "시험 작성 6-4", concept: "c-group", tests: [] },
  ] },
  { id: "6-5", chapter: 6, title: "시험용 6-5", isExam: true, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-join" },
    { type: "write", task: "시험 작성 6-5", concept: "c-join", tests: [] },
  ] },
];
