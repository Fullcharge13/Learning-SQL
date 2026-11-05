// 시험용 가짜 레슨(경제 시뮬레이션 시험 전용). 실제 레슨이 아니다.
export const CHAPTER = { id: 2, title: "시험용 2장" };
export const LESSONS = [
  { id: "2-1", chapter: 2, title: "시험용 2-1", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-agg" },
    { type: "write", task: "시험 작성 2-1", concept: "c-agg", tests: [] },
  ] },
  { id: "2-2", chapter: 2, title: "시험용 2-2", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-group" },
    { type: "write", task: "시험 작성 2-2", concept: "c-group", tests: [] },
  ] },
  { id: "2-3", chapter: 2, title: "시험용 2-3", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-join" },
    { type: "write", task: "시험 작성 2-3", concept: "c-join", tests: [] },
  ] },
  { id: "2-4", chapter: 2, title: "시험용 2-4", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-select" },
    { type: "write", task: "시험 작성 2-4", concept: "c-select", tests: [] },
  ] },
  { id: "2-5", chapter: 2, title: "시험용 2-5", isExam: true, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-where" },
    { type: "write", task: "시험 작성 2-5", concept: "c-where", tests: [] },
  ] },
];
