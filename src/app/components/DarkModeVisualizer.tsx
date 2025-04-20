'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import styles from './DarkModeVisualizer.module.css';

interface DarkModeVisualizerProps { }

const DarkModeVisualizer: React.FC<DarkModeVisualizerProps> = (): React.ReactNode => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>({});

  // 컴포넌트가 마운트된 후에만 렌더링 (하이드레이션 불일치 방지)
  useEffect(() => {
    setMounted(true);

    // 현재 테마의 CSS 변수 값 가져오기
    if (typeof window !== 'undefined') {
      const computedStyle = getComputedStyle(document.documentElement);
      const themeColors = {
        background: computedStyle.getPropertyValue('--background-color'),
        text: computedStyle.getPropertyValue('--text-color'),
        border: computedStyle.getPropertyValue('--border-color'),
        primary: computedStyle.getPropertyValue('--button-active'),
        error: computedStyle.getPropertyValue('--error-color'),
        success: computedStyle.getPropertyValue('--success-color')
      };
      setColors(themeColors);
    }
  }, [theme]);

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>다크 모드 설정</h2>

      <div className={styles.themePreview}>
        <div className={styles.currentTheme}>
          <span className={styles.themeLabel}>현재 테마: </span>
          <span className={styles.themeValue}>{theme === 'dark' ? '다크 모드' : '라이트 모드'}</span>
        </div>

        <button
          onClick={toggleTheme}
          className={`${styles.toggleButton} ${theme === 'dark' ? styles.darkButton : styles.lightButton}`}
        >
          {theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        </button>
      </div>

      <div className={styles.colorPalette}>
        <h3 className={styles.subtitle}>현재 테마 색상</h3>
        <div className={styles.colors}>
          {Object.entries(colors).map(([name, value]) => (
            <div key={name} className={styles.colorItem}>
              <div
                className={styles.colorSwatch}
                style={{ backgroundColor: value || 'transparent' }}
              />
              <div className={styles.colorInfo}>
                <span className={styles.colorName}>{name}</span>
                <span className={styles.colorValue}>{value || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.demoElements}>
        <h3 className={styles.subtitle}>UI 요소 미리보기</h3>
        <div className={styles.elementGrid}>
          <button className={styles.regularButton}>일반 버튼</button>
          <button className={styles.primaryButton}>주요 버튼</button>
          <div className={styles.card}>
            <h4>카드 요소</h4>
            <p>테마에 따라 다르게 스타일링되는 카드 컴포넌트입니다.</p>
          </div>
          <div className={styles.input}>
            <label>입력 필드</label>
            <input type="text" placeholder="텍스트 입력" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DarkModeVisualizer;