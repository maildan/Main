// 스플래시 화면에서 사용되는 문구들

// 메인 브랜딩 문구
export const MAIN_BRANDING = "Loop. Process. Repeat.";

// 완료 문구
export const COMPLETION_MESSAGE = "준비 완료.";

// 개그성 문구들 (랜덤 선택용)
export const FUNNY_MESSAGES = [
  "왜 이런 앱을 찾게 되었을까요?",
  "뭔가 숨겨진 게 있나봐요.",
  "호기심이 많으시네요!",
  "정말 이걸 복호화해야 하나요?",
  "뭔가 수상한 일이...",
  "이런 걸 왜 찾고 계신 거죠?"
];

// 랜덤 개그성 문구 선택 함수
export const getRandomFunnyMessage = (): string => {
  return FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
};
