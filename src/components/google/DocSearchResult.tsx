import React from 'react';

interface DocSearchResultProps {
  title: string;
  content: string;
  onBack: () => void;
}

const DocSearchResult: React.FC<DocSearchResultProps> = ({ title, content, onBack }) => {
  return (
    <div className="doc-search-result">
      <div className="result-header">
        <button className="back-btn" onClick={onBack}>← 뒤로</button>
        <h2>{title}</h2>
      </div>
      <div className="result-content">
        <pre>{content}</pre>
      </div>
    </div>
  );
};

export default DocSearchResult;
