// Jest 테스트를 위한 설정 파일

// React Testing Library 확장
require('@testing-library/jest-dom');

// 글로벌 mock 설정
global.fetch = jest.fn();
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 모든 테스트가 끝난 후 모킹된 함수 초기화
afterEach(() => {
  jest.clearAllMocks();
});

// window.matchMedia mock
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

// localStorage mock
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 인터셉트 콘솔 오류 (선택사항)
const originalConsoleError = console.error;
console.error = (...args) => {
  // 특정 오류 메시지 필터링 가능
  if (
    args[0]?.includes('React does not recognize the') ||
    args[0]?.includes('Warning:')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// 콘솔 경고 인터셉트 (선택사항)
// const originalConsoleWarn = console.warn;
// console.warn = (...args) => {
//   // 무시할 메시지 필터링 가능
//   originalConsoleWarn(...args);
// };
