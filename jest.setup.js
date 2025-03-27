// Jest를 위한 추가 설정
import '@testing-library/jest-dom/extend-expect';

// 글로벌 객체 모킹
global.fetch = jest.fn();

// 모든 테스트가 끝난 후 모킹된 함수 초기화
afterEach(() => {
  jest.clearAllMocks();
});

// window.matchMedia 모킹
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 콘솔 오류 및 경고 제어
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// 필요한 경우 콘솔 경고/오류 비활성화
// console.error = (...args) => {
//   // 무시할 메시지 필터링 가능
//   originalConsoleError(...args);
// };

// console.warn = (...args) => {
//   // 무시할 메시지 필터링 가능
//   originalConsoleWarn(...args);
// };
