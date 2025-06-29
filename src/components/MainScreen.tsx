import { useState } from 'react';
import SettingsDropdown from './SettingsDropdown';
import SettingsModal from './SettingsModal';
import AccountSwitcher from './AccountSwitcher';
// GoogleDocsSection import 제거
// import GoogleDocsSection from './google/GoogleDocsSection';
// import { useDocs } from '../contexts/google/DocsContext';
import { invoke } from '@tauri-apps/api/core';
import DocSearchResult from './google/DocSearchResult';

/**
 * 메인 화면 컴포넌트
 * 심플한 검은 테마의 검색 인터페이스를 제공합니다.
 * - 애플리케이션 명: Loop Pro
 * - Google 스타일 자동완성 검색바
 * - Google Docs 연동 기능
 */
const MainScreen = () => {
  // const { fetchDocuments } = useDocs(); // GoogleDocsSection 제거로 불필요
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalType, setSettingsModalType] = useState<'general' | 'about' | 'help' | null>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any|null>(null);
  // 추천 리스트 통합: 기존 추천어+문서 제목
  const [suggestions, setSuggestions] = useState<any[]>([]); // { type: 'keyword'|'doc', value: string, docObj?: any }
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  // const [currentPage, setCurrentPage] = useState<'main' | 'google-docs'>('main'); // GoogleDocsSection 제거로 불필요
  const searchData = ['구글 독스'];

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
    if (value.trim()) {
      // 기존 추천어
      const filtered = searchData.filter(item =>
        item.toLowerCase().includes(value.toLowerCase()) ||
        getKoreanInitials(item).includes(value.toLowerCase())
      ).map(item => ({ type: 'keyword', value: item }));
      // 문서 제목 추천
      let docTitleSuggestions: any[] = [];
      try {
        const docs = await invoke<any[]>('search_user_documents_by_keyword', { keyword: value, limit: 5 });
        docTitleSuggestions = docs.map(doc => ({ type: 'doc', value: doc.title, docObj: doc }));
      } catch (e) {}
      const allSuggestions = [...filtered, ...docTitleSuggestions];
      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.value);
    setShowSuggestions(false);
    setIsSearchFocused(false);
    setIsSearchExpanded(false);
    if (suggestion.type === 'doc') {
      setSelectedDoc(suggestion.docObj);
    } else {
      // 기존 추천어 클릭 시 별도 동작 없음
    }
  };

  const handleSuggestionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };
  const handleInputFocus = () => {
    setIsSearchFocused(true);
    setIsSearchExpanded(true);
    if (searchQuery.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };
  const handleInputBlur = () => {
    setIsSearchFocused(false);
    setIsSearchExpanded(false);
    setTimeout(() => setShowSuggestions(false), 300);
  };
  const handleInputMouseEnter = () => {
    setIsSearchExpanded(true);
  };
  const handleInputMouseLeave = () => {
    if (!isSearchFocused) {
      setIsSearchExpanded(false);
    }
  };
  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
  };
  const handleOpenSettingsModal = (type: 'general' | 'about' | 'help') => {
    setSettingsModalType(type);
    setShowSettingsModal(true);
    setShowSettings(false);
  };
  const handleBackToMain = () => {
    setSelectedDoc(null);
  };
  // 한글 초성 추출 함수
  const getKoreanInitials = (text: string): string => {
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return text.replace(/[가-힣]/g, (char) => {
      const code = char.charCodeAt(0) - 44032;
      const initialIndex = Math.floor(code / 588);
      return initials[initialIndex] || char;
    });
  };
  // 계정 변경 시 자동 동기화 실행 (GoogleDocsSection 제거로 fetchDocuments 불필요)
  // 렌더링
  return (
    <div className="main-screen">
      <header className="main-header">
        <div className="settings-container">
          <button className="settings-button" onClick={handleSettingsToggle}>⚙</button>
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsDropdown
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              onOpenModal={handleOpenSettingsModal}
              onOpenAccountSwitcher={() => {
                setShowAccountSwitcher(true);
                setShowSettings(false);
              }}
            />
          </div>
          {showSettingsModal && settingsModalType && (
            <SettingsModal
              type={settingsModalType}
              isOpen={showSettingsModal}
              onClose={() => {
                setShowSettingsModal(false);
                setSettingsModalType(null);
              }}
            />
          )}
          <AccountSwitcher
            isOpen={showAccountSwitcher}
            onClose={() => setShowAccountSwitcher(false)}
            onAccountChanged={() => {}}
          />
        </div>
      </header>
      <div className="main-content">
        {!selectedDoc && (
          <>
            <div className="logo-section">
              <h1 className="app-title">Loop Pro</h1>
            </div>
            <div className="search-section">
              <div className="search-container">
                <form className={`search-form ${isSearchExpanded ? 'expanded' : ''}`}> {/* onSubmit 제거 */}
                  <input
                    type="text"
                    className={`search-input ${isSearchFocused ? 'focused' : ''}`}
                    placeholder="검색어를 입력하세요..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onMouseEnter={handleInputMouseEnter}
                    onMouseLeave={handleInputMouseLeave}
                    autoComplete="off"
                  />
                </form>
                {/* 통합 추천 드롭다운 */}
                {showSuggestions && (
                  <div className="suggestions-dropdown">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.type + '-' + suggestion.value + (suggestion.docObj?.id || '')}
                        className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        onMouseDown={handleSuggestionMouseDown}
                      >
                        {suggestion.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="main-page-content"></div>
          </>
        )}
        {selectedDoc && (
          <DocSearchResult
            title={selectedDoc.title}
            content={selectedDoc.content || ''}
            onBack={handleBackToMain}
          />
        )}
      </div>
    </div>
  );
};

export default MainScreen;