# Loop Pro - Google Docs AI 분석 도구

Loop Pro는 Google Docs와 연동된 AI 문서 분석 도구입니다. Google OAuth를 통해 인증하고, Google Docs 문서들을 분석하여 요약, 키워드 추출, 편집 등의 기능을 제공합니다.

## 🚀 주요 기능

- � **Google OAuth 인증**: 안전한 Google 계정 로그인
- 📄 **Google Docs 연동**: 실시간 문서 목록 및 내용 조회
- 🤖 **AI 기반 분석**: 문서 요약, 키워드 추출, 질문 답변
- 🔍 **스마트 필터링**: 제목, 날짜, 단어 수 기반 필터링
- 📝 **문서 편집**: Google Docs 문서 직접 편집
- � **로컬 상태 관리**: SQLite 기반 사용자 데이터 및 히스토리 관리

## 🛠️ 기술 스택

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Database**: SQLite
- **Google API**: Google OAuth 2.0, Google Docs API, Google Drive API
- **UI**: 커스텀 CSS + 반응형 디자인

## 🔧 개발 환경 설정

### 사전 요구사항

- [Node.js](https://nodejs.org/) (16.x 이상)
- [Rust](https://rustup.rs/) (1.70.0 이상)
- [Google Cloud Console](https://console.cloud.google.com/) 프로젝트

### Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성
2. API 및 서비스 > 라이브러리에서 다음 API 활성화:
   - Google Drive API
   - Google Docs API
3. API 및 서비스 > 사용자 인증 정보에서 OAuth 2.0 클라이언트 ID 생성:
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: `http://localhost:8080/auth/callback`

### 환경 변수 설정

1. `.env.example` 파일을 `.env`로 복사
2. Google Cloud Console에서 받은 값으로 설정:

```env
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=sqlite:data/app.db
RUST_LOG=debug
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run tauri dev

# 빌드
npm run tauri build
```

## 📁 프로젝트 구조

```
Loop/
├── src/                          # React 프론트엔드
│   ├── components/
│   │   ├── google/              # Google 관련 컴포넌트
│   │   │   ├── GoogleLogin.tsx
│   │   │   ├── DocsList.tsx
│   │   │   ├── DocViewer.tsx
│   │   │   └── GoogleDocsSection.tsx
│   │   └── ...
│   ├── contexts/
│   │   └── google/              # Google 관련 컨텍스트
│   │       ├── AuthContext.tsx
│   │       └── DocsContext.tsx
│   └── ...
├── src-tauri/                   # Rust 백엔드
│   ├── src/
│   │   ├── database/           # 데이터베이스 모듈
│   │   │   ├── models.rs
│   │   │   ├── connection.rs
│   │   │   └── mod.rs
│   │   ├── google/             # Google API 모듈
│   │   │   ├── auth.rs
│   │   │   ├── docs.rs
│   │   │   └── mod.rs
│   │   ├── config.rs
│   │   └── lib.rs
│   └── Cargo.toml
└── data/                        # SQLite 데이터베이스
```

## 🎯 사용법

1. **로그인**: Google 계정으로 로그인
2. **문서 조회**: Google Docs 문서 목록 확인
3. **필터링**: 제목, 날짜, 단어 수로 문서 필터링
4. **문서 선택**: 문서 클릭하여 내용 확인
5. **AI 분석**: 문서 요약 및 키워드 추출
6. **편집**: 문서 내용 직접 편집

## 🚦 개발 지침

- **코드 스타일**: `docs/code-guideline.md` 참조
- **Cargo 지침**: `docs/cargo-guideline.md` 참조
- **버그 수정**: `docs/fix-guideline.md` 참조

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 제공됩니다.
