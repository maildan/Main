import { useAuth } from '../../contexts/google/AuthContext';
import { useDocs } from '../../contexts/google/DocsContext';
import { LoadingSpinner } from '../LoadingSpinner';
import GoogleLogin from './GoogleLogin';
import DocsList from './DocsList';
import DocViewer from './DocViewer';

/**
 * Google Docs 메인 섹션 컴포넌트
 * 로그인, 문서 목록, 문서 뷰어를 통합 관리합니다.
 */
export default function GoogleDocsSection() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedDocument } = useDocs();

  return (
    <div className="google-docs-section">
      {/* 헤더 섹션 */}
      <div className="docs-header">
        <div className="header-content">
          <h1 className="section-title">Google Docs 연동</h1>
          <p className="section-description">
            Google 계정으로 로그인하여 문서를 관리하고 AI로 요약하세요.
          </p>
        </div>
        
        {/* 로그인 컴포넌트 */}
        <div className="login-container">
          <GoogleLogin />
        </div>
      </div>      {/* 메인 콘텐츠 */}
      <div className="docs-main-content">
        {authLoading ? (
          // 인증 상태 확인 중
          <LoadingSpinner size="large" message="인증 상태 확인 중..." />
        ) : !isAuthenticated ? (
          // 인증되지 않은 상태
          <div className="unauthenticated-state">
            <div className="features-preview">
              <h2>주요 기능</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <svg className="feature-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <h3>문서 목록 조회</h3>
                  <p>Google Docs의 모든 문서를 한눈에 확인하고 검색하세요.</p>
                </div>
                
                <div className="feature-card">
                  <svg className="feature-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M7,9V7H17V9H7M7,13V11H17V13H7M7,17V15H17V17H7Z"/>
                  </svg>
                  <h3>AI 요약 생성</h3>
                  <p>긴 문서를 AI가 자동으로 요약해드립니다.</p>
                </div>
                
                <div className="feature-card">
                  <svg className="feature-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                  </svg>
                  <h3>문서 편집</h3>
                  <p>문서에 직접 내용을 추가하고 수정할 수 있습니다.</p>
                </div>
                
                <div className="feature-card">
                  <svg className="feature-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M9,10H7V12H9V10M13,10H11V12H13V10M17,10H15V12H17V10M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                  </svg>
                  <h3>필터링 & 정렬</h3>
                  <p>날짜, 제목, 내용 기준으로 문서를 쉽게 찾아보세요.</p>
                </div>
              </div>
              
              <div className="privacy-notice">
                <h3>개인정보 보호</h3>
                <ul>
                  <li>문서 내용은 로컬에서만 처리됩니다</li>
                  <li>Google 계정 정보는 안전하게 암호화됩니다</li>
                  <li>필요한 권한만 요청하여 최소한의 접근을 보장합니다</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          // 인증된 상태 - 메인 기능 표시
          <div className="authenticated-content">
            <div className="docs-layout">
              {/* 문서 목록 (왼쪽 패널) */}
              <div className="docs-sidebar">
                <DocsList />
              </div>
              
              {/* 문서 뷰어 (오른쪽 패널) */}
              <div className="docs-viewer">
                <DocViewer />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 상태 바 */}
      {isAuthenticated && (
        <div className="docs-status-bar">
          <div className="status-left">
            <span className="status-indicator online">
              <span className="indicator-dot"></span>
              Google Docs 연결됨
            </span>
          </div>
          
          <div className="status-right">
            {selectedDocument && (
              <span className="selected-doc-info">
                선택된 문서: {selectedDocument.title}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
