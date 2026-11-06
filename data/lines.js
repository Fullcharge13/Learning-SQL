// 두억이 대사 표 — 상황 12종(+ 과정 완주) × 3~5줄 (설계 §8-1, 표정은 §8-3)
// 말투: 반말이 조금 섞인 친근한 해요체. 틀려도 혼내지 않는다. SQL과 도깨비 장터 이야기만 하고, 민속 사실을 단정하지 않는다.
// 표정: 상황마다 하나(src/say.js SITUATION_FACE와 같음 — 시험 faces). 화남(angry)은 쓰지 않는다.
// 정답·연속 정답·연속 기록 대사는 일반 풀이다: 고르기·빈칸·순서·카드·조립 어느 문제 뒤에도 나온다.
//   엽전(돈)·결과 표·「고른」처럼 한 문제 종류를 가정하는 말은 쓰지 않는다(시험 generic_pool, v0.1.2).
// 자리 표시: {name} {streak} {xp} {outfit}
//   {outfit}에는 의상 표의 short 이름이 들어간다(C16). 조사가 붙지 않는 자리에만 쓴다.
//   {streak}·{xp}·{outfit} 값이 없으면 say()가 그 줄을 건너뛴다. 상황마다 자리 표시 없는 줄을 둘 이상 둔다
//   (값이 없을 때도 같은 줄이 잇달아 나오지 않게 — 시험 no_repeat without vars).
// {name}은 줄 맨 앞에 「{name}님, 」 꼴로 한 번만 쓴다.
//   이름이 비어 있으면 say()가 이 덩어리를 통째로 빼므로 문장이 그대로 자연스럽다.
//   (문장 가운데 「{name}님이」처럼 쓰면 빼고 나서 조사가 남으므로 금지. 시험 name_form)

export const LINES = {
  greet: [
    { text: "{name}님, 어서 와요! 오늘도 장부 한 장 같이 넘겨 볼까?", face: "proud" },
    { text: "장터 문 열었어요. 오늘은 어떤 표부터 꺼내 볼까?", face: "proud" },
    { text: "에헴, 오늘 장부 담당은 바로 나! SELECT부터 가 봐요.", face: "proud" },
    { text: "어제보다 카드 한 장만 더 맞춰 봐요. 그거면 돼요.", face: "proud" },
    { text: "{name}님, 자리 잡아 뒀어. 시작해 볼까요?", face: "proud" },
  ],
  correct: [
    { text: "딩동! 딱 맞았어요.", face: "cheer" },
    { text: "맞았어! 이유까지 알고 푼 게 보여요.", face: "cheer" },
    { text: "이거 봐요, 척하고 맞혔잖아!", face: "cheer" },
    { text: "정답이에요. 방금 그 감각, 장부에 적어 둬요.", face: "cheer" },
  ],
  combo: [
    { text: "척척! 연속 정답이에요. 셈이 술술 풀리네.", face: "wink" },
    { text: "이 기세면 장터 장부도 혼자 정리하겠는걸요.", face: "wink" },
    { text: "연달아 맞혔어요. 개념이 단단히 잡혔다는 뜻이야.", face: "wink" },
    { text: "멈출 생각 없죠? 그 속도 좋아요!", face: "wink" },
  ],
  wrong: [
    { text: "어라? 아깝다! 어디서 갈렸는지 같이 볼까요?", face: "surprise" },
    { text: "괜찮아요. 틀린 답에도 단서가 숨어 있어.", face: "surprise" },
    { text: "앗, 나도 여기서 자주 헷갈렸어요.", face: "surprise" },
    { text: "음, 결과 표를 한 줄씩 다시 짚어 볼까?", face: "surprise" },
    { text: "좋은 시도예요. 문제 속 단서를 한 번 더 볼까요?", face: "surprise" },
  ],
  running: [
    { text: "타닥타닥… SQL이 장부를 뒤지는 중이에요.", face: "think" },
    { text: "실행 중! 어떤 표가 나올지 궁금하죠?", face: "think" },
    { text: "주판알 튕기는 중… 잠깐만 기다려 줘요.", face: "think" },
    { text: "표를 한 줄씩 훑어보는 중이에요.", face: "think" },
  ],
  error: [
    { text: "어라? 단서가 나왔어요. 오류 문장을 같이 봐요.", face: "surprise" },
    { text: "오류 메시지는 꾸중이 아니라 단서예요.", face: "surprise" },
    { text: "앗, 카드 어딘가가 어긋났나 봐. 같이 찾아보자!", face: "surprise" },
    { text: "SQL이 길을 잃었대요. 어디서인지 알려 줬어요.", face: "surprise" },
  ],
  hint: [
    { text: "힌트 하나 줄게요. 정답은 직접 찾아봐요!", face: "think" },
    { text: "먼저 결과 표가 어떤 모양이어야 할지 떠올려 봐요.", face: "think" },
    { text: "막힐 땐 카드를 소리 내어 읽어 보면 좋아.", face: "think" },
    { text: "이 단서로 한 걸음만 더 가 봐요.", face: "think" },
  ],
  lesson_done: [
    { text: "짠! 레슨 완료. {xp} XP 받았어요.", face: "cheer" },
    { text: "{name}님, 끝까지 해냈어요. 오늘 배운 건 이제 진짜 실력이야.", face: "cheer" },
    { text: "수고했어요. {xp} XP만큼 장부가 두꺼워졌네요.", face: "cheer" },
    { text: "완주! 다음 레슨도 장터에 펼쳐 둘게요.", face: "cheer" },
  ],
  course_done: [
    { text: "{name}님, SELECT 한 줄에서 분석까지 다 왔어요. 정말 자랑스러워요!", face: "swing" },
    { text: "과정 완주! 이제 장터 장부는 전부 읽을 수 있어요.", face: "swing" },
    { text: "끝까지 해냈어. 이제 어엿한 SQL 장부꾼이에요!", face: "swing" },
  ],
  streak_up: [
    { text: "연속 {streak}일째! 꾸준함이 제일 센 기술이에요.", face: "laugh" },
    { text: "{name}님, {streak}일째예요. 습관이 자라고 있어요.", face: "laugh" },
    { text: "오늘 목표 달성! 엽전 모으듯 차곡차곡 쌓여요.", face: "laugh" },
    { text: "오늘도 해냈어요. 연속 {streak}일 달성!", face: "laugh" },
    { text: "오늘 몫 끝! 내일도 장터에서 기다릴게요.", face: "laugh" },
  ],
  streak_broken: [
    { text: "다시 1일부터! 이번엔 더 길게 가 봐요.", face: "cry" },
    { text: "쉬어 가는 날도 있죠. 배운 건 그대로 남아 있어요.", face: "cry" },
    { text: "기록은 숫자일 뿐, 실력은 안 줄었어요.", face: "cry" },
    { text: "{name}님, 다시 와서 반가워요. 오늘 새로 시작해요!", face: "cry" },
  ],
  outfit_bought: [
    { text: "{outfit}, 어때요? 잘 어울리나?", face: "eat" },
    { text: "{outfit}, 마음에 쏙 들어요. 오늘은 이걸로!", face: "eat" },
    { text: "새 옷 {outfit}! 고르는 안목이 있네요.", face: "eat" },
    { text: "옷은 바뀌어도 방망이는 그대로예요. 짝꿍이거든.", face: "eat" },
    { text: "새 옷 입으니 장터 나들이 가고 싶어지네요!", face: "eat" },
  ],
  welcome_back: [
    { text: "{name}님, 오랜만이에요! 깜빡 졸고 있었어요.", face: "sleep" },
    { text: "돌아왔군요. 가볍게 복습부터 해 볼까요?", face: "sleep" },
    { text: "기다리다 장터 구석에서 잠들 뻔했어요.", face: "sleep" },
    { text: "어디까지 했는지 다 장부에 적어 뒀어요. 이어서 가요.", face: "sleep" },
  ],
};

// 모르는 상황일 때 쓰는 중립 대사
export const FALLBACK_LINE = { text: "천천히 해도 괜찮아요. 나는 여기 있을게요.", face: "proud" };
