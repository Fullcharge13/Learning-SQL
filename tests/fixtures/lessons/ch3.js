// 시험용 가짜 레슨(경제 시뮬레이션 시험 전용). 실제 레슨이 아니다.
export const CHAPTER = { id: 3, title: "시험용 3장" };
export const LESSONS = [
  { id: "3-1", chapter: 3, title: "시험용 3-1", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-group" },
    { type: "write", task: "시험 작성 3-1", concept: "c-group", tests: [] },
  ] },
  { id: "3-2", chapter: 3, title: "시험용 3-2", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-join" },
    { type: "write", task: "시험 작성 3-2", concept: "c-join", tests: [] },
  ] },
  { id: "3-3", chapter: 3, title: "시험용 3-3", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-select" },
    { type: "write", task: "시험 작성 3-3", concept: "c-select", tests: [] },
  ] },
  { id: "3-4", chapter: 3, title: "시험용 3-4", isExam: false, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-where" },
    { type: "write", task: "시험 작성 3-4", concept: "c-where", tests: [] },
  ] },
  { id: "3-5", chapter: 3, title: "시험용 3-5", isExam: true, cards: [], items: [
    { type: "choice", q: "시험 문제", options: ["a", "b"], answer: 0, concept: "c-order" },
    { type: "write", task: "시험 작성 3-5", concept: "c-order", tests: [] },
  ] },
];
