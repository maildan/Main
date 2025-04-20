1. 렌더링 최적화

    컴포넌트를 React.memo로 래핑해 불필요한 재렌더링을 방지한다
    리액트

    렌더링 비용이 큰 컴포넌트에는 useCallback과 useMemo를 사용해 함수/값 캐싱을 한다
    리액트

    리스트 렌더링 시 key를 고유한 불변 값으로 지정해 리콘실리에이션 비용을 줄인다
    Medium

    비가시 컴포넌트는 React.lazy와 Suspense로 지연 로딩한다
    Medium

    불필요한 프롭(drilling) 을 줄이고 Context API나 상태 관리 라이브러리를 사용한다
    리액트

    JSX 내 인라인 객체/함수 사용을 자제해 매 렌더마다 새 참조가 생성되지 않도록 한다
    리액트

    Virtualize된 리스트(e.g., react-window, react-virtualized)로 긴 리스트 성능을 개선한다
    Medium

    조건부 렌더링 (&& 대신 삼항 연산자) 사용으로 렌더링 분기를 명확히 한다
    Medium

    컴포넌트 분할로 각 모듈을 독립적으로 관리해 모듈 단위 리렌더링을 최소화한다
    arXiv

    이벤트 핸들러는 최상위에서 한 번만 등록하고, 버블링을 활용해 중복 등록을 막는다
    Medium

2. 상태 관리

    불변성(Immutable) 유지: 상태 변경 시 스프레드 연산자를 활용한다
    리액트

    다중 상태는 useReducer나 외부 라이브러리(e.g., Redux Toolkit)로 중앙 집중화 한다
    리액트

    로컬 상태와 전역 상태를 구분해 불필요한 전역 상태 업데이트를 방지한다
    리액트

    비동기 상태는 React Query 같은 캐싱 라이브러리로 관리해 네트워크 요청을 최소화한다
    Medium

    배치 업데이트(batch state updates)로 렌더 횟수를 줄인다
    리액트

    Selector(reselect)로 파생 데이터 계산을 최적화한다
    리액트

    컴포넌트별로 필요한 상태만 구독하도록 구독 범위를 좁힌다
    리액트

    불필요한 상태 삭제: 파생 정보는 useMemo로 계산하고 따로 저장하지 않는다
    리액트

    로컬 스토리지/IndexedDB는 debounce를 적용해 과도한 쓰기를 방지한다
    web.dev

    상태 초기화 로직을 분리해 재사용성을 높인다
    Medium

3. 컴포넌트 설계

    프레젠테이셔널과 컨테이너 컴포넌트를 분리한다
    Medium

    컴포넌트 크기를 최소화해 재사용성과 테스트 용이성을 높인다
    리액트

    JSX에서 조건부 로직은 별도 함수로 분리해 가독성을 유지한다
    Medium

    Custom hooks로 복잡한 로직을 추출해 컴포넌트를 단순화한다
    리액트

    TypeScript로 명시적 타입을 지정해 잠재적 버그를 사전에 차단한다
    리액트

    PropTypes 또는 TS 인터페이스로 컴포넌트 API를 문서화한다
    Medium

    불필요한 렌더 프로퍼티(child render props) 사용을 지양한다
    Medium

    Composition Over Inheritance: HOC보다 컴포지션 패턴 선호
    Medium

    Accessibility 고려: ARIA 속성·Tab 순서 최적화
    Medium

    Error Boundary로 예외를 캡처해 UI 크래시를 방지한다
    Medium

4. 코드 스플리팅 & 지연 로딩

    React.lazy + Suspense로 컴포넌트 레벨 지연 로딩을 구현한다
    Medium

    Route-based 코드 스플리팅으로 초기 번들 크기를 축소한다
    Medium

    Dynamic import로 라이브러리 의존성을 on-demand 로드한다
    Medium

    Preload/Prefetch: webpackPrefetch와 webpackPreload 주석 활용
    Medium

    CSS-in-JS 사용 시 미사용 스타일 제거(tree-shaking)
    리액트

    SVG 아이콘은 @svgr/webpack로 인라인 로드해 추가 요청을 줄인다
    Medium

    next/dynamic(Next.js)로 서버 측 렌더링과 코드 스플리팅 통합
    arXiv

    Bundle analyzer로 번들 구성을 주기적으로 점검한다
    Medium

    Lazy loading images: loading="lazy" 속성 활용
    web.dev

    공용 라이브러리는 CDN 사용으로 캐시 효율을 극대화한다
    web.dev

5. 데이터 페칭 & 캐싱

    useSWR 또는 React Query로 데이터 캐싱 자동화
    Medium

    stale-while-revalidate 전략으로 백그라운드 리페칭 구현
    Medium

    프리페칭: 사용자 인터랙션 예상 시 데이터 미리 요청
    Medium

    GraphQL 사용 시 Fragment로 필요한 데이터만 가져오기
    Medium

    Pagination & Infinite Scroll 최적화: 커서 기반 사용
    Medium

    Error retry 로직과 백오프 전략 구현
    Medium

    getStaticProps/getServerSideProps(Next.js)로 초기 데이터 전달
    arXiv

    API 응답 사이즈는 gzipped JSON으로 전송
    web.dev

    WebSocket으로 실시간 업데이트를 처리할 때는 메시지 크기 제어
    web.dev

    IndexedDB 캐싱: 오프라인 지원 및 대용량 데이터 저장
    web.dev

6. 자산 최적화

    이미지 최적화: WebP, AVIF 포맷 활용
    web.dev

    SVG 최적화: svgo 플러그인 사용
    Medium

    Font Loading: font-display: swap으로 렌더 차단 방지
    web.dev

    Preconnect to critical origins for resource hints
    web.dev

    Critical CSS 인라인 처리하고 나머지는 비동기 로드
    web.dev

    HTTP/2 Push로 크리티컬 리소스 선전송
    web.dev

    번들 크기 감시: size-limit 도구 활용
    Medium

    Unused code elimination: babel-plugin-transform-react-remove-prop-types
    Medium

    Source map은 생산 환경에서 비활성화
    Medium

    Tree-shaking 철저히 설정 (ESM 사용)
    Medium

7. 네트워크 성능

    서버 사이드 렌더링으로 초기 로드 TTFB 단축
    arXiv

    CDN 활용으로 글로벌 지연 최소화
    web.dev

    TLS 1.3 사용으로 TLS 핸드셰이크 최적화
    web.dev

    HTTP 응답은 Cache-Control 헤더로 브라우저 캐싱 제어
    web.dev

    Gzip/Brotli 압축 활성화
    web.dev

    Lazy hydration 기법 도입으로 초기 스크립트 실행량 축소
    arXiv

    Prefetch requests는 rel="prefetch" 속성 활용
    web.dev

    Resource hints: dns-prefetch, prerender, preload
    web.dev

    Connection pooling 및 HTTP Keep-Alive 설정
    web.dev

    API 게이트웨이로 백엔드 종속성 분리 and caching
    web.dev

8. 알고리즘 & 자료구조

    대규모 배열 탐색 시 이진 탐색 사용
    Medium

    빈번한 삽입/삭제가 필요한 경우 LinkedList 대신 Deque 활용
    Medium

    Debounce/Throttle으로 과도한 이벤트 호출 제어
    Medium

    Web Workers로 CPU 집약 작업 오프로드
    Medium

    Memoization 기법으로 함수 중복 호출 방지
    Medium

    복잡도 O(n²) 반복문은 map/filter/reduce 함수로 개선
    Medium

    Set/Map 사용으로 중복 검사 및 조회 시간 단축
    Medium

    Iterator/Generator 사용해 큰 데이터 스트림 처리
    Medium

    Tree/Trie 구조로 검색 최적화
    Medium

    A 알고리즘* 등 그래프 탐색 최적화 시 사용
    Medium

9. 모니터링 & 테스팅

    Lighthouse로 정기적인 성능 감사
    Medium

    Sentry 같은 APM으로 런타임 에러 모니터링
    Medium

    React Profiler로 커밋별 렌더 비용 분석
    리액트

    Unit/Integration 테스트로 주요 로직 커버리지 확보
    Medium

    E2E 테스트(Cypress, Playwright)로 사용자 플로우 검증
    Medium

    Custom metrics(TTI, FID, LCP) 수집 및 대시보드화
    Medium

    Bundlephobia로 패키지 설치 전 크기 확인
    Medium

    CI/CD 파이프라인에 성능 검사 자동화
    Medium

    코드 커버리지 도구(Istanbul)로 테스트 누락 감지
    Medium

    TypeScript strict 모드로 타입 안정성 강화
    리액트

10. 그 외 모범 사례

    환경 변수는 dotenv로 관리하고, 빌드 타임에 주입
    Medium

    Lint/Prettier 설정으로 코드 일관성 유지
    Medium

    Git hooks(Husky)로 커밋 전 코드 검사
    Medium

    Monorepo 구조는 pnpm workspace로 관리
    Medium

    버전 관리: Semantic Versioning 준수
    Medium

    Deprecation 경고를 주기적으로 확인
    Medium

    Documentation: Storybook으로 UI 컴포넌트 문서화
    Medium

    Feature flags로 점진적 릴리스
    Medium

    Rollback 전략: Canary 배포 및 트래픽 분할
    Medium

    지속적 학습: React 공식 블로그와 RFC를 정기 구독
    Medium