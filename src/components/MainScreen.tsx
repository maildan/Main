import { useState } from 'react';
import SettingsDropdown from './SettingsDropdown';
import SettingsModal from './SettingsModal';
import AccountSwitcher from './AccountSwitcher';
import GoogleDocsSection from './google/GoogleDocsSection';
import { useDocs } from '../contexts/google/DocsContext';

/**
 * 메인 화면 컴포넌트
 * 심플한 검은 테마의 검색 인터페이스를 제공합니다.
 * - 애플리케이션 명: Loop Pro
 * - Google 스타일 자동완성 검색바
 * - Google Docs 연동 기능
 */
const MainScreen = () => {
  const { fetchDocuments } = useDocs();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  // 설정 모달 상태
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsModalType, setSettingsModalType] = useState<'general' | 'about' | 'help' | null>(null);
  
  // 계정 전환 모달 상태
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  // 현재 페이지 상태 (메인 페이지 또는 Google Docs 페이지)
  const [currentPage, setCurrentPage] = useState<'main' | 'google-docs'>('main');  // 검색 추천 데이터
  const searchData = [
    '구글 독스'
  ];
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
      // 검색어에 따른 페이지 자동 변경
    const query = searchQuery.toLowerCase();
    if (query.includes('google') || query.includes('구글') || query.includes('독스') || query.includes('docs')) {
      setCurrentPage('google-docs');
    } else {
      // 기본 검색 기능
      console.log('검색어:', searchQuery);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1); // 입력 시 선택 초기화

    if (value.trim()) {
      // 자동완성 로직: 입력값과 일치하는 추천어 필터링
      const filtered = searchData.filter(item =>
        item.toLowerCase().includes(value.toLowerCase()) ||
        getKoreanInitials(item).includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
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
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
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
  };  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setIsSearchFocused(false);
    setIsSearchExpanded(false);
      // 선택된 추천어에 따른 페이지 변경
    const query = suggestion.toLowerCase();
    if (query.includes('google') || query.includes('구글') || query.includes('독스') || query.includes('docs')) {
      setCurrentPage('google-docs');
    }
    
    console.log('선택된 기능:', suggestion);
  };

  const handleSuggestionMouseDown = (e: React.MouseEvent) => {
    // 마우스 다운 시 blur 이벤트 방지
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
    // 클릭 이벤트가 처리될 수 있도록 충분한 지연 시간 제공
    setTimeout(() => setShowSuggestions(false), 300);
  };

  const handleInputMouseEnter = () => {
    setIsSearchExpanded(true);
  };

  const handleInputMouseLeave = () => {
    if (!isSearchFocused) {
      setIsSearchExpanded(false);
    }
  };  // 설정 메뉴 핸들러
  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
  };

  // 설정 모달 열기 핸들러
  const handleOpenSettingsModal = (type: 'general' | 'about' | 'help') => {
    setSettingsModalType(type);
    setShowSettingsModal(true);
    setShowSettings(false); // 드롭다운 메뉴는 닫기
  };  // 메인 페이지로 돌아가기
  const handleBackToMain = () => {
    console.log('뒤로가기 버튼 클릭됨');
    setCurrentPage('main');
  };
  // 키보드 이벤트 핸들러
  const handleBackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBackToMain();
    }
  };

  // 마우스 이벤트 핸들러 (디버깅용)
  const handleBackMouseEnter = () => {
    console.log('뒤로가기 버튼 마우스 진입');
  };

  const handleBackMouseLeave = () => {
    console.log('뒤로가기 버튼 마우스 떠남');
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

  // 계정 변경 시 자동 동기화 실행
  const handleAccountChanged = async () => {
    try {
      console.log('계정 변경 감지됨, 자동 동기화 시작...');
      await fetchDocuments();
      console.log('계정 변경 후 자동 동기화 완료');
    } catch (error) {
      console.error('계정 변경 후 동기화 오류:', error);
    }
  };
  return (
    <div className="main-screen">
      
      {/* 상단 헤더 */}
      <header className="main-header">
        {/* 설정 버튼 */}
        <div className="settings-container">
          <button 
            className="settings-button"
            onClick={handleSettingsToggle}
          >
            ⚙
          </button>
            {/* 설정 드롭다운 메뉴 (클릭 이벤트 버블링 방지) */}
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
          
          {/* 설정 모달 */}
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

          {/* 계정 전환 모달 */}
          <AccountSwitcher
            isOpen={showAccountSwitcher}
            onClose={() => setShowAccountSwitcher(false)}
            onAccountChanged={handleAccountChanged}
          />
        </div>
      </header>

      <div className="main-content">
      {/* 메인 페이지에서만 로고와 검색바 표시 */}
      {currentPage === 'main' && (
        <>
          {/* 애플리케이션 로고 섹션 */}
          <div className="logo-section">
            <h1 className="app-title">Loop Pro</h1>
          </div>

          {/* 검색바 섹션 */}
          <div className="search-section">
            <div className="search-container">
              <form onSubmit={handleSearch} className={`search-form ${isSearchExpanded ? 'expanded' : ''}`}>
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
                <button type="submit" className="search-button">
                  ⌕
                </button>
              </form>
              
              {/* 자동완성 드롭다운 */}
              {showSuggestions && (
                <div className="suggestions-dropdown">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseDown={handleSuggestionMouseDown}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 메인 페이지 컨텐츠 */}
          <div className="main-page-content">
            {/* 검색을 통해서만 Google Docs에 접근 가능 */}
          </div>
        </>
      )}

      {/* Google Docs 페이지 */}
      {currentPage === 'google-docs' && (
        <div className="google-docs-page">
          {/* 페이지 헤더 (제목만) */}
          <div className="page-header">
            <h2 className="page-title">Google Docs 관리</h2>
          </div>
          
          {/* Google Docs 메인 컨텐츠 */}
          <div className="google-docs-main">
            <GoogleDocsSection />
          </div>
          
          {/* 하단 뒤로가기 버튼 */}
          <div className="page-footer">
            <div className="back-button-container">
              <button 
                type="button" 
                className="new-back-button"
                onClick={handleBackToMain}
                onKeyDown={handleBackKeyDown}
                onMouseEnter={handleBackMouseEnter}
                onMouseLeave={handleBackMouseLeave}
                tabIndex={0}
                aria-label="뒤로가기"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="back-arrow">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>뒤로가기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default MainScreen;