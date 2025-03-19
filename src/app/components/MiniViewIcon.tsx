'use client';

import React from 'react';
import styles from './MiniView.module.css';

interface MiniViewIconProps {
  isDarkMode: boolean;
  onClick: () => void;
}

// 간소화된 컴포넌트로 접힌 상태의 아이콘만 담당
const MiniViewIcon: React.FC<MiniViewIconProps> = ({ isDarkMode, onClick }) => {
  // 이벤트 핸들러
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      id="mini-view-icon"
      className={`${styles.miniViewCollapsed} ${isDarkMode ? styles.darkMode : ''}`}
      onClick={handleClick}
      style={{
        outline: 'none',
        border: 'none',
        borderWidth: '0',
        borderStyle: 'none',
        boxShadow: 'none',
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    >
      <img
        src="/app-icon.svg"
        alt="앱 아이콘"
        width={32}
        height={32}
        onClick={handleClick}
        style={{
          border: 'none',
          outline: 'none',
          pointerEvents: 'auto',
          cursor: 'pointer'
        }}
      />
    </div>
  );
};

export default MiniViewIcon;
