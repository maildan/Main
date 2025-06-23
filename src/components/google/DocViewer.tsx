import { useState } from 'react';
import { useDocs } from '../../contexts/google/DocsContext';
import { useAuth } from '../../contexts/google/AuthContext';

/**
 * Google Docs 문서 뷰어 컴포넌트
 * 선택된 문서의 내용을 표시하고 요약 생성 기능을 제공합니다.
 */
export default function DocViewer() {
  const { isAuthenticated } = useAuth();
  const { 
    selectedDocument, 
    isLoading, 
    error, 
    generateSummary,
    refreshDocument,
    clearError 
  } = useDocs();

  const [showSummary, setShowSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  /**
   * 요약 생성 핸들러
   */
  const handleGenerateSummary = async () => {
    if (!selectedDocument) return;

    try {
      setIsGeneratingSummary(true);
      await generateSummary(selectedDocument.id);
      setShowSummary(true);
    } catch (error) {
      console.error('요약 생성 실패:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  /**
   * 문서 새로고침 핸들러
   */
  const handleRefresh = async () => {
    if (!selectedDocument) return;
    await refreshDocument(selectedDocument.id);
  };

  /**
   * 날짜 포맷팅 함수
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="doc-viewer unauthenticated">
        <div className="empty-state">
          <h3>문서를 보려면 로그인하세요</h3>
          <p>Google 계정으로 로그인하면 문서 내용을 확인할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // 선택된 문서가 없는 경우
  if (!selectedDocument) {
    return (
      <div className="doc-viewer no-selection">
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          <h3>문서를 선택하세요</h3>
          <p>왼쪽 목록에서 문서를 선택하면 내용을 확인할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-viewer">
      {/* 문서 헤더 */}
      <div className="doc-header">
        <div className="doc-title-section">
          <h1 className="doc-title">{selectedDocument.title}</h1>
          <div className="doc-meta">
            <span className="meta-item">
              <svg className="meta-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
              </svg>
              최종 수정: {formatDate(selectedDocument.modifiedTime)}
            </span>
            {selectedDocument.wordCount && (
              <span className="meta-item">
                <svg className="meta-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
                </svg>
                {selectedDocument.wordCount.toLocaleString()}자
              </span>
            )}
          </div>
        </div>

        <div className="doc-actions">
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="action-button refresh-button"
            title="문서 새로고침"
          >
            <svg className="button-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
            </svg>
            새로고침
          </button>

          <button 
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || isLoading}
            className="action-button summary-button"
            title="AI 요약 생성"
          >
            <svg className="button-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            {isGeneratingSummary ? '요약 생성 중...' : 'AI 요약'}
          </button>

          {selectedDocument.summary && (
            <button 
              onClick={() => setShowSummary(!showSummary)}
              className={`action-button toggle-summary ${showSummary ? 'active' : ''}`}
              title="요약 보기/숨기기"
            >
              <svg className="button-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,18.17L8.83,15L7.42,16.41L12,21L16.58,16.41L15.17,15M12,5.83L15.17,9L16.58,7.59L12,3L7.42,7.59L8.83,9L12,5.83Z"/>
              </svg>
              {showSummary ? '요약 숨기기' : '요약 보기'}
            </button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError} className="close-error">×</button>
        </div>
      )}

      {/* 요약 섹션 */}
      {showSummary && selectedDocument.summary && (
        <div className="summary-section">
          <div className="summary-header">
            <h3>AI 요약</h3>
            <button 
              onClick={() => setShowSummary(false)}
              className="close-summary"
              title="요약 닫기"
            >
              ×
            </button>
          </div>
          <div className="summary-content">
            {selectedDocument.summary}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>문서를 불러오는 중...</span>
        </div>
      )}

      {/* 문서 내용 */}
      <div className="doc-content">
        {selectedDocument.content ? (
          <div className="content-text">
            {selectedDocument.content.split('\n').map((paragraph, index) => (
              <p key={index} className="content-paragraph">
                {paragraph || '\u00A0'} {/* 빈 줄 처리 */}
              </p>
            ))}
          </div>
        ) : (
          <div className="content-placeholder">
            <svg className="placeholder-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <p>문서 내용을 불러오는 중...</p>
          </div>
        )}
      </div>

      {/* 문서 정보 푸터 */}
      <div className="doc-footer">
        <div className="doc-info">
          <span>문서 ID: {selectedDocument.id}</span>
          <span>생성일: {formatDate(selectedDocument.createdTime)}</span>
        </div>
      </div>
    </div>
  );
}
