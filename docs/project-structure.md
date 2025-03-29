# Typing Stats App 프로젝트 구조 문서

## 프로젝트 개요

Typing Stats App은 사용자의 타이핑 습관, 속도 및 정확도를 추적하고 분석하는 데스크톱 애플리케이션입니다. Next.js와 Electron을 결합하여 크로스 플랫폼 지원을 제공하며, Rust로 작성된 네이티브 모듈을 통해 키 입력 추적 및 고성능 데이터 처리 기능을 구현합니다.

## 기술 스택

- **프론트엔드**: Next.js, React, Recharts/Chart.js, TypeScript
- **백엔드**: Electron, Node.js, Rust 네이티브 모듈
- **데이터베이스**: SQLite, MySQL, Prisma ORM
- **배포**: Vercel (웹 버전), Electron 빌더 (데스크톱 버전)
- **개발 도구**: ESLint, Prettier, Jest, CI/CD (GitHub Actions, GitLab CI)

## 디렉토리 구조

