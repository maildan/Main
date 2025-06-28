import React, { useState } from 'react';
import { useAuth } from '../../contexts/google/AuthContext';
import { useDocs } from '../../contexts/google/DocsContext';

const GoogleDocsSection: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { documents, isLoading, error } = useDocs();
  const [searchTerm, setSearchTerm] = useState('');



  // 검색어에 따른 문서 필터링
  const filteredDocs = documents.filter((doc: any) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.content && doc.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 인증되지 않은 경우 메시지 표시
  if (!isAuthenticated || !user) {
    return (
      <div className="google-docs-section">
        <div className="auth-required-message">
          <div className="auth-icon">📄</div>
          <h3>Google Docs 연동</h3>
          <p>계정에 로그인하여 Google Docs를 동기화하세요.</p>
          <p>상단의 계정 관리 버튼을 통해 계정을 추가할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="google-docs-section">
      {/* 연결된 사용자 정보 */}
      <div className="connected-user-info">
        <div className="user-avatar">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} />
          ) : (
            <div className="avatar-placeholder">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>

      {/* 검색 */}
      <div className="docs-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="문서 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>



      {/* 문서 목록 */}
      <div className="docs-content">
        {error && (
          <div className="error-message">
            <p>오류가 발생했습니다: {error}</p>
            <p>계정을 다시 로그인하거나 잠시 후 다시 시도해 주세요.</p>
          </div>
        )}

        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>문서를 불러오는 중...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="no-docs-message">
            {searchTerm ? (
              <>
                <h3>검색 결과가 없습니다</h3>
                <p>'{searchTerm}'와 일치하는 문서를 찾을 수 없습니다.</p>
              </>
            ) : (
              <>
                <h3>동기화된 문서가 없습니다</h3>
                <p>Google Docs에 문서가 없거나 아직 동기화되지 않았습니다.</p>
                <p>계정을 추가하거나 전환하면 자동으로 문서가 동기화됩니다.</p>
              </>
            )}
          </div>
        ) : (
          <div className="docs-list">
            <div className="docs-count">
              총 {filteredDocs.length}개의 문서
              {searchTerm && ` (검색: "${searchTerm}")`}
            </div>
            {filteredDocs.map((doc: any) => (
              <div key={doc.id} className="doc-item">
                <div className="doc-header">
                  <h3 className="doc-title">{doc.title}</h3>
                  <div className="doc-meta">
                    <span className="doc-date">
                      {new Date(doc.modifiedTime || doc.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
                <div className="doc-content">
                  <p>{doc.content ? doc.content.substring(0, 150) + '...' : '내용 없음'}</p>
                </div>
                <div className="doc-actions">
                  <a
                    href={`https://docs.google.com/document/d/${doc.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="open-doc-button"
                  >
                    Google Docs에서 열기
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleDocsSection;
