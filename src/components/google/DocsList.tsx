import { useState } from 'react';
import { useDocs } from '../../contexts/google/DocsContext';
import { useAuth } from '../../contexts/google/AuthContext';
import { LoadingSpinner } from '../LoadingSpinner';

/**
 * Google Docs 문서 목록 컴포넌트
 * 문서 목록 표시, 필터링, 검색 기능을 제공합니다.
 */
export default function DocsList() {
  const { isAuthenticated } = useAuth();
  const { 
    filteredDocuments, 
    selectedDocument,
    isLoading, 
    error, 
    filter,
    selectDocument, 
    updateFilter,
    fetchDocuments,
    clearError 
  } = useDocs();

  const [showFilters, setShowFilters] = useState(false);

  /**
   * 문서 선택 핸들러
   */
  const handleDocumentSelect = (docId: string) => {
    selectDocument(docId);
  };

  /**
   * 검색어 변경 핸들러
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter({ searchTerm: event.target.value });
  };

  /**
   * 정렬 변경 핸들러
   */
  const handleSortChange = (sortBy: typeof filter.sortBy) => {
    const newOrder = filter.sortBy === sortBy && filter.sortOrder === 'desc' ? 'asc' : 'desc';
    updateFilter({ sortBy, sortOrder: newOrder });
  };

  /**
   * 새로고침 핸들러
   */
  const handleRefresh = () => {
    fetchDocuments();
  };

  /**
   * 날짜 포맷팅 함수
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="docs-list unauthenticated">
        <div className="empty-state">
          <h3>문서 목록을 보려면 로그인하세요</h3>
          <p>Google 계정으로 로그인하면 문서 목록을 확인할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="docs-list">
      {/* 헤더 섹션 */}
      <div className="docs-list-header">
        <div className="header-title">
          <h2>Google Docs 문서</h2>
          <span className="doc-count">
            {filteredDocuments.length}개 문서
          </span>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="refresh-button"
            title="새로고침"
          >
            <svg className="refresh-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
            </svg>
          </button>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            title="필터 옵션"
          >
            <svg className="filter-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 검색 및 필터 섹션 */}
      <div className="search-filter-section">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
          </svg>
          <input
            type="text"
            placeholder="문서 제목이나 내용으로 검색..."
            value={filter.searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        {showFilters && (
          <div className="filter-options">
            <div className="sort-options">
              <label>정렬 기준:</label>
              <div className="sort-buttons">
                {[
                  { key: 'modifiedTime', label: '수정일' },
                  { key: 'createdTime', label: '생성일' },
                  { key: 'title', label: '제목' },
                  { key: 'wordCount', label: '단어 수' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleSortChange(key as typeof filter.sortBy)}
                    className={`sort-button ${filter.sortBy === key ? 'active' : ''}`}
                  >
                    {label}
                    {filter.sortBy === key && (
                      <span className="sort-order">
                        {filter.sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError} className="close-error">×</button>
        </div>
      )}      {/* 로딩 상태 */}
      {isLoading && (
        <LoadingSpinner size="medium" message="문서 목록을 불러오는 중..." />
      )}

      {/* 문서 목록 */}
      <div className="documents-grid">
        {filteredDocuments.length === 0 && !isLoading ? (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <h3>
              {filter.searchTerm ? '검색 결과가 없습니다' : '문서가 없습니다'}
            </h3>
            <p>
              {filter.searchTerm 
                ? '다른 검색어로 시도해보세요' 
                : 'Google Docs에서 문서를 만들어보세요'
              }
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div 
              key={doc.id}
              onClick={() => handleDocumentSelect(doc.id)}
              className={`document-card ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
            >
              <div className="document-header">
                <h3 className="document-title">{doc.title}</h3>
                {doc.summary && (
                  <span className="summary-badge" title="요약 있음">📝</span>
                )}
              </div>
              
              <div className="document-meta">
                <div className="meta-item">
                  <svg className="meta-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                  </svg>
                  <span>{formatDate(doc.modifiedTime)}</span>
                </div>
                
                {doc.wordCount && (
                  <div className="meta-item">
                    <svg className="meta-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
                    </svg>
                    <span>{doc.wordCount?.toLocaleString()}자</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
