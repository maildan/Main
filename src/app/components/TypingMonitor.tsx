'use client';

import React, { useState, useEffect } from 'react';
import styles from './TypingMonitor.module.css';

interface TypingMonitorProps {
  stats: {
    keyCount: number;
    typingTime: number;
    windowTitle: string;
    browserName?: string;
    totalChars?: number;
    totalCharsNoSpace?: number;
    totalWords?: number;
    pages?: number;
    accuracy?: number;
  };
  isTracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onSaveStats: (content: string) => void;
}

// 포맷 함수를 컴포넌트 외부로 이동하여 렌더링마다 재생성되지 않도록 함
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}초`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}분 ${remainingSeconds}초`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}시간 ${remainingMinutes}분 ${remainingSeconds}초`;
};

// 평균 속도 계산 함수도 외부로 이동
const getAverageSpeed = (keyCount: number, time: number): string => {
  if (time <= 0) return '0 타/분';
  return `${Math.round((keyCount / time) * 60)} 타/분`;
};

export function TypingMonitor({ 
  stats, 
  isTracking, 
  onStartTracking, 
  onStopTracking,
  onSaveStats
}: TypingMonitorProps) {
  const [description, setDescription] = useState('');
  const [lastAction, setLastAction] = useState<string>('');
  const [activeWebsiteTab, setActiveWebsiteTab] = useState<string>('docs');
  const [browserCheckResult, setBrowserCheckResult] = useState<{
    name: string | null;
    isGoogleDocs: boolean;
    title: string | null;
  } | null>(null);

  // 브라우저 정보 확인 함수
  const checkBrowserInfo = async () => {
    if (window.electronAPI?.getCurrentBrowserInfo) {
      try {
        const info = await window.electronAPI.getCurrentBrowserInfo();
        setBrowserCheckResult(info);
      } catch (error) {
        console.error('브라우저 정보 확인 오류:', error);
      }
    }
  };

  // 정기적으로 브라우저 정보 업데이트 (5초 → 10초로 변경하여 부하 감소)
  useEffect(() => {
    if (isTracking) {
      // 초기 확인
      checkBrowserInfo();
      
      // 더 긴 간격(10초)으로 업데이트하여 리소스 사용 감소
      const interval = setInterval(checkBrowserInfo, 10000);
      return () => clearInterval(interval);
    }
  }, [isTracking]);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const handleSave = () => {
    onSaveStats(description);
    setDescription('');
    setLastAction('저장됨');
    
    // 2초 후 메시지 제거
    setTimeout(() => {
      setLastAction('');
    }, 2000);
  };

  const handleToggleTracking = () => {
    if (isTracking) {
      onStopTracking();
    } else {
      onStartTracking();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.monitorHeader}>
        <h2>타이핑 모니터링</h2>
        <button 
          className={`${styles.trackingButton} ${isTracking ? styles.trackingActive : ''}`}
          onClick={handleToggleTracking}
        >
          {isTracking ? '모니터링 중지' : '모니터링 시작'}
        </button>
      </div>

      <div className={styles.statusIndicator}>
        <div className={`${styles.indicator} ${isTracking ? styles.active : ''}`}></div>
        <span>모니터링 상태: <strong>{isTracking ? '활성화' : '비활성화'}</strong></span>
        
        {lastAction && (
          <div className={styles.actionFeedback}>{lastAction}</div>
        )}
      </div>
      
      <div className={styles.browserStatus}>
        <h3>브라우저 상태</h3>
        <div className={styles.browserInfo}>
          <div className={styles.browserRow}>
            <span>감지된 브라우저:</span>
            <span className={styles.browserValue}>
              {stats.browserName || browserCheckResult?.name || '없음'}
            </span>
          </div>
          
          <div className={styles.browserRow}>
            <span>구글 문서 감지:</span>
            <span className={styles.browserValue}>
              {browserCheckResult?.isGoogleDocs ? (
                <span className={styles.detectedBadge}>감지됨 ✓</span>
              ) : (
                <span className={styles.notDetectedBadge}>아님 ⨯</span>
              )}
            </span>
          </div>
          
          <div className={styles.browserRow}>
            <span>현재 창:</span>
            <span className={styles.browserValue} title={stats.windowTitle || browserCheckResult?.title || ''}>
              {(stats.windowTitle || browserCheckResult?.title || '없음').substring(0, 60)}
              {(stats.windowTitle || browserCheckResult?.title || '').length > 60 ? '...' : ''}
            </span>
          </div>
        </div>
        
        <div className={styles.websiteTabs}>
          <div className={styles.websiteTabHeader}>
            <button 
              className={`${styles.websiteTabButton} ${activeWebsiteTab === 'docs' ? styles.activeWebsiteTab : ''}`}
              onClick={() => setActiveWebsiteTab('docs')}
            >
              구글 문서
            </button>
            <button 
              className={`${styles.websiteTabButton} ${activeWebsiteTab === 'office' ? styles.activeWebsiteTab : ''}`}
              onClick={() => setActiveWebsiteTab('office')}
            >
              오피스
            </button>
            <button 
              className={`${styles.websiteTabButton} ${activeWebsiteTab === 'coding' ? styles.activeWebsiteTab : ''}`}
              onClick={() => setActiveWebsiteTab('coding')}
            >
              코딩
            </button>
            <button 
              className={`${styles.websiteTabButton} ${activeWebsiteTab === 'sns' ? styles.activeWebsiteTab : ''}`}
              onClick={() => setActiveWebsiteTab('sns')}
            >
              SNS/메신저
            </button>
          </div>
          
          <div className={styles.websiteTabContent}>
            {activeWebsiteTab === 'docs' && (
              <div className={styles.websiteLinks}>
                <a href="https://docs.google.com/document/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  구글 문서 열기
                </a>
                <a href="https://docs.google.com/spreadsheets/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  구글 스프레드시트 열기
                </a>
                <a href="https://docs.google.com/presentation/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  구글 프레젠테이션 열기
                </a>
                <a href="https://www.notion.so/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Notion 열기
                </a>
              </div>
            )}
            
            {activeWebsiteTab === 'office' && (
              <div className={styles.websiteLinks}>
                <a href="https://www.office.com/launch/word" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Word 온라인 열기
                </a>
                <a href="https://www.office.com/launch/excel" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Excel 온라인 열기
                </a>
                <a href="https://www.office.com/launch/powerpoint" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  PowerPoint 온라인 열기
                </a>
                <a href="https://www.hancom.com/main/main.do" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  한글과컴퓨터 열기
                </a>
              </div>
            )}
            
            {activeWebsiteTab === 'coding' && (
              <div className={styles.websiteLinks}>
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  GitHub 열기
                </a>
                <a href="https://gitlab.com/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  GitLab 열기
                </a>
                <a href="https://codesandbox.io/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  CodeSandbox 열기
                </a>
                <a href="https://codepen.io/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  CodePen 열기
                </a>
              </div>
            )}
            
            {activeWebsiteTab === 'sns' && (
              <div className={styles.websiteLinks}>
                <a href="https://slack.com/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Slack 열기
                </a>
                <a href="https://discord.com/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Discord 열기
                </a>
                <a href="https://www.messenger.com/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Messenger 열기
                </a>
                <a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                  Gmail 열기
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.helpSection}>
        <h3>지원되는 브라우저</h3>
        <div className={styles.browserList}>
          <div className={styles.browserColumn}>
            <ul>
              <li>Google Chrome</li>
              <li>Mozilla Firefox</li>
              <li>Microsoft Edge</li>
              <li>Safari</li>
              <li>Opera</li>
            </ul>
          </div>
          <div className={styles.browserColumn}>
            <ul>
              <li>Opera GX</li>
              <li>Brave</li>
              <li>Vivaldi</li>
              <li>Arc Browser</li>
              <li>Zen Browser</li>
            </ul>
          </div>
          <div className={styles.browserColumn}>
            <ul>
              <li>네이버 웨일</li>
              <li>네이버 브라우저</li>
              <li>Chromium</li>
              <li>Comodo Dragon</li>
              <li>기타 Chromium 기반</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className={styles.statsPanel}>
        <h3>타이핑 통계</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>타자 수:</span>
            <span className={styles.statValue}>{stats.keyCount.toLocaleString()}</span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>타이핑 시간:</span>
            <span className={styles.statValue}>
              {formatTime(stats.typingTime)}
            </span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>평균 속도:</span>
            <span className={styles.statValue}>
              {getAverageSpeed(stats.keyCount, stats.typingTime)}
            </span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>페이지 수:</span>
            <span className={styles.statValue}>
              {stats.pages?.toFixed(1) || '0.0'}
            </span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>단어 수:</span>
            <span className={styles.statValue}>
              {stats.totalWords?.toLocaleString() || '0'}
            </span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>글자 수:</span>
            <span className={styles.statValue}>
              {stats.totalChars?.toLocaleString() || '0'}
            </span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>글자 수 (공백 제외):</span>
            <span className={styles.statValue}>
              {stats.totalCharsNoSpace?.toLocaleString() || '0'}
            </span>
          </div>
          
          <div className={styles.statItem}>
            <span className={styles.statLabel}>정확도:</span>
            <span className={styles.statValue}>
              {stats.accuracy || 100}%
            </span>
          </div>
        </div>
      </div>

      <div className={styles.saveSection}>
        <h3>세션 저장</h3>
        <p>작업한 내용에 대한 설명을 입력하세요</p>
        <textarea
          className={styles.descriptionInput}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="작업 내용 (예: 보고서 작성, 논문 작성 등)"
          rows={4}
        />
        <button 
          className={styles.saveButton} 
          onClick={handleSave}
          disabled={stats.keyCount === 0 || !description.trim()}
        >
          통계 저장
        </button>
      </div>
    </div>
  );
}