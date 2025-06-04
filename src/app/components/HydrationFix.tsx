'use client';

import { useEffect } from 'react';

/**
 * 하이드레이션 불일치 문제 해결을 위한 컴포넌트
 * 
 * 1. ColorZilla와 같은 브라우저 확장 프로그램이 주입하는 cz-shortcut-listen 속성으로 인해
 *    발생하는 하이드레이션 불일치 해결
 * 2. Next.js 하이드레이션 문제 해결을 위한 추가 처리
 * 3. 빈 HTML 문제 해결을 위한 문서 구조 확인 및 수정
 */
export default function HydrationFix() {
  useEffect(() => {
    // 1. ColorZilla 확장 프로그램이 주입하는 속성 제거
    if (document.body.hasAttribute('cz-shortcut-listen')) {
      document.body.removeAttribute('cz-shortcut-listen');
    }

    // 속성이 다시 추가되는 것을 감지하여 제거하는 MutationObserver 설정
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'cz-shortcut-listen'
        ) {
          document.body.removeAttribute('cz-shortcut-listen');
        }
      });
    });

    // body 요소의 cz-shortcut-listen 속성 변경 감시
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['cz-shortcut-listen']
    });

    // 2. 페이지 완전 로드 후 추가 하이드레이션 확인 및 수정
    const fixHydrationIssues = () => {
      // 2.1 문서 구조 확인
      if (!document.doctype) {
        console.warn('<!DOCTYPE html>이 누락되었습니다. 이는 렌더링 모드에 영향을 미칠 수 있습니다.');
      }

      // 2.2 HTML 요소 클래스 확인
      const htmlElement = document.documentElement;
      if (htmlElement && !htmlElement.hasAttribute('lang')) {
        htmlElement.setAttribute('lang', 'ko');
      }

      // 2.3 테마 관련 클래스 확인 및 적용
      if (localStorage.getItem('theme') === 'dark' && 
          !htmlElement.classList.contains('dark-mode')) {
        htmlElement.classList.add('dark-mode');
      } else if (localStorage.getItem('theme') === 'light' && 
                htmlElement.classList.contains('dark-mode')) {
        htmlElement.classList.remove('dark-mode');
      }

      // 2.4 빈 head 처리 (if something's wrong with Next.js)
      if (document.head.children.length < 5) { // 최소한의 메타 태그 등이 없는 경우
        console.warn('head 요소에 필요한 메타 태그가 부족할 수 있습니다.');
        // 필수 메타 태그 확인 및 추가
        if (!document.querySelector('meta[name="viewport"]')) {
          const viewport = document.createElement('meta');
          viewport.name = 'viewport';
          viewport.content = 'width=device-width, initial-scale=1';
          document.head.appendChild(viewport);
        }
      }
      
      // 2.5 root 요소 확인 (Next.js 앱 루트)
      const rootElement = document.getElementById('__next') || document.getElementById('root');
      if (rootElement && rootElement.childElementCount === 0) {
        console.warn('앱 루트 요소가 비어 있습니다. 렌더링이 실패했을 수 있습니다.');
        // 개발 환경에서만 보이는 오류 메시지
        if (process.env.NODE_ENV === 'development') {
          const errorDiv = document.createElement('div');
          errorDiv.style.padding = '20px';
          errorDiv.style.margin = '20px';
          errorDiv.style.backgroundColor = '#ffdddd';
          errorDiv.style.border = '1px solid #ff0000';
          errorDiv.style.borderRadius = '5px';
          errorDiv.innerHTML = '<h2>렌더링 오류 발생</h2><p>앱 컴포넌트가 로드되지 않았습니다.</p>';
          rootElement.appendChild(errorDiv);
        }
      }
    };

    // 문서 로드 완료 시 실행
    if (document.readyState === 'complete') {
      fixHydrationIssues();
    } else {
      window.addEventListener('DOMContentLoaded', fixHydrationIssues);
      window.addEventListener('load', fixHydrationIssues); // 추가 안전 장치
    }

    // 클린업 함수
    return () => {
      observer.disconnect();
      window.removeEventListener('DOMContentLoaded', fixHydrationIssues);
      window.removeEventListener('load', fixHydrationIssues);
    };
  }, []);

  return null;
} 