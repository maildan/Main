import React, { useState, useRef } from 'react';
import './FontControl.css';

// 문서 타입 정의(간단)
interface GoogleDoc {
  id: string;
  title: string;
  content?: string;
}

interface DocSearchResultProps {
  title: string;
  content: string;
  onBack: () => void;
  // 추가: 전체 문서 목록과 문서 선택 핸들러
  allDocs?: GoogleDoc[];
  onSelectDoc?: (doc: GoogleDoc) => void;
}

const DocSearchResult: React.FC<DocSearchResultProps> = ({ title, content, onBack, allDocs = [], onSelectDoc }) => {
  const [fontSize, setFontSize] = useState(18);
  const [showOptions, setShowOptions] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<GoogleDoc[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const optionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 폰트 크기 조정
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 10 && val <= 48) setFontSize(val);
  };
  const handleFontInc = () => setFontSize(f => Math.min(f + 1, 48));
  const handleFontDec = () => setFontSize(f => Math.max(f - 1, 10));

  // 옵션 메뉴 토글
  const handleOptionsToggle = () => setShowOptions(v => !v);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setShowOptions(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1200);
  };
  const handleEdit = () => {
    // 편집 모드 진입 로직(추후 구현)
    setShowOptions(false);
    alert('편집 기능은 추후 지원됩니다.');
  };

  // 바깥 클릭 시 옵션 닫기
  React.useEffect(() => {
    if (!showOptions) return;
    const onClick = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showOptions]);

  // 항상 전체 내용을 보여주고, 검색어가 있으면 하이라이트만 적용
  function highlightContent(text: string, _keyword: string) {
    return text;
  }

  // 추천어(오토컴플리트) 로직: 현재 문서 제외, 제목/내용에 검색어 포함된 문서 추출
  React.useEffect(() => {
    if (search && allDocs.length > 0) {
      const lower = search.toLowerCase();
      const filtered = allDocs.filter(doc =>
        doc.title !== title &&
        (doc.title.toLowerCase().includes(lower) || (doc.content?.toLowerCase().includes(lower)))
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(filtered.length > 0 ? 0 : -1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [search, allDocs, title]);

  // 추천어 클릭 시 해당 문서로 이동
  const handleSuggestionClick = (doc: GoogleDoc) => {
    setShowSuggestions(false);
    setSearch('');
    setSelectedSuggestionIndex(-1);
    if (onSelectDoc) onSelectDoc(doc);
  };

  // 검색 input 포커스/블러로 드롭다운 제어
  const handleInputFocus = () => {
    if (suggestions.length > 0) setShowSuggestions(true);
  };
  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // 키보드 네비게이션
  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(idx => idx < suggestions.length - 1 ? idx + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(idx => idx > 0 ? idx - 1 : suggestions.length - 1);
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        handleSuggestionClick(suggestions[selectedSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // onChange에서는 setSearch만 수행 (문서 변경 없음)
  // 추천어 클릭/엔터에서만 문서 변경. 그 외에는 onSelectDoc 호출 금지.
  // handleSuggestionClick 외에는 onSelectDoc을 호출하지 마세요.
  return (
    <div className="doc-search-result-card">
      <div className="doc-searchbar-minimal doc-searchbar-center" style={{ position: 'relative' }}>
        <input
          className="doc-searchbar-input"
          type="text"
          placeholder="문서 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKey}
          ref={inputRef}
        />
        {/* 추천어 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="doc-suggestions-dropdown" style={{maxHeight:200,overflowY:'auto',scrollbarWidth:'none'}}>
            {suggestions.map((doc, idx) => (
              <div
                key={doc.id}
                className={`doc-suggestion-item${idx === selectedSuggestionIndex ? ' selected' : ''}`}
                onMouseDown={() => handleSuggestionClick(doc)}
                tabIndex={-1}
                title={doc.title}
                style={{userSelect: 'none', cursor: 'pointer'}}
              >
                <span style={{display:'block',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:320}}>{doc.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="doc-search-result-header">
        <button className="doc-back-btn" onClick={onBack} aria-label="뒤로 가기">←</button>
        <h2 className="doc-title">{title}</h2>
        <div className="font-control-group">
          <button aria-label="폰트 크기 감소" onClick={handleFontDec} className="font-control-btn">-</button>
          <input type="number" min={10} max={48} value={fontSize} onChange={handleFontSizeChange} className="font-control-input" />
          <button aria-label="폰트 크기 증가" onClick={handleFontInc} className="font-control-btn">+</button>
          <button aria-label="더보기" onClick={handleOptionsToggle} className="font-control-btn font-control-more">⋯</button>
          {showOptions && (
            <div ref={optionsRef} className="font-control-dropdown">
              <button onClick={handleCopy} className="dropdown-btn">복사</button>
              <button onClick={handleEdit} className="dropdown-btn">편집</button>
            </div>
          )}
        </div>
      </div>
      {showToast && (
        <div className="copy-toast">복사되었습니다!</div>
      )}
      <div className="doc-search-result-content">
        <pre className="doc-content-text" style={{ fontSize: fontSize, fontFamily: 'Pretendard, Inter, Segoe UI, Arial, sans-serif' }}>{highlightContent(content, search)}</pre>
      </div>
    </div>
  );
};

export default DocSearchResult;
