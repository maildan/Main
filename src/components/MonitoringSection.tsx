import React, { useState, useEffect } from "react";
import { useBrowserDetector } from "../hooks/useBrowserDetector";
import { BrowserInfo } from "../types";

/**
 * 바로가기 탭 아이템 컴포넌트
 */
const TabContent: React.FC<{ title: string, items: string[] }> = ({ items }) => {
  return (
    <ul className="shortcut-list">
      {items.map((item, index) => (
        <li key={index} className="shortcut-item">
          {item}
        </li>
      ))}
    </ul>
  );
};

/**
 * 모니터링 섹션 컴포넌트
 */
const MonitoringSection: React.FC = () => {
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'구글문서' | '오피스' | '코딩' | 'SNS'>('SNS');
  
  // 브라우저 감지 훅 사용
  const {
    allBrowserWindows,
    error,
    isAutoDetectionEnabled,
    detectActiveBrowsers,
    findAllBrowserWindows,
    toggleAutoDetection
  } = useBrowserDetector();
  
  // 브라우저 이름 추출
  const getBrowserNameFromWindowTitle = (windowTitle: string) => {
    if (windowTitle.includes('Chrome')) return 'Google Chrome';
    if (windowTitle.includes('Firefox')) return 'Mozilla Firefox';
    if (windowTitle.includes('Edge')) return 'Microsoft Edge';
    if (windowTitle.includes('Safari')) return 'Safari';
    if (windowTitle.includes('Opera')) return 'Opera';
    return '알 수 없는 브라우저';
  };
  
  // 브라우저 이름 추출
  const extractBrowserName = (allWindows: BrowserInfo[]) => {
    if (allWindows.length > 0 && isMonitoringActive) {
      const firstWindow = allWindows[0];
      return firstWindow.name || getBrowserNameFromWindowTitle(firstWindow.window_title);
    }
    return "감지된 브라우저 없음";
  };

  // 현재 감지된 브라우저 정보
  const currentBrowser = extractBrowserName(allBrowserWindows);
  const currentWindow = allBrowserWindows.length > 0 && isMonitoringActive ? allBrowserWindows[0].window_title : "감지된 탭 없음";
  const isGoogleDocDetected = allBrowserWindows.length > 0 && isMonitoringActive && 
    (allBrowserWindows[0].window_title.includes("Google Docs") || 
     allBrowserWindows[0].window_title.includes("구글 문서"));
  
  // 탭 콘텐츠 데이터
  const tabContents = {
    '구글문서': [
      '구글 문서',
      '구글 스프레드시트',
      '구글 프레젠테이션',
      'Notion'
    ],
    '오피스': [
      '워드',
      '엑셀',
      '파워포인트',
      '원노트'
    ],
    '코딩': [
      'VS Code',
      '파이참',
      '이클립스',
      '안드로이드 스튜디오'
    ],
    'SNS': [
      '카카오톡',
      '디스코드',
      '슬랙',
      '텔레그램'
    ]
  };

  // 모니터링 시작/종료 토글 함수
  const toggleMonitoring = () => {
    setIsMonitoringActive(prev => {
      const newState = !prev;
      
      // 모니터링 상태에 따라 브라우저 감지 설정
      if (newState) {
        // 모니터링 시작 시 브라우저 감지 실행
        detectActiveBrowsers();
        findAllBrowserWindows();
        
        // 자동 감지 설정 (아직 활성화되지 않았다면)
        if (!isAutoDetectionEnabled) {
          toggleAutoDetection();
        }
      } else if (!newState && isAutoDetectionEnabled) {
        // 모니터링 종료 시 자동 감지 중단
        toggleAutoDetection();
      }
      
      return newState;
    });
  };

  // 처음 마운트될 때 브라우저 정보 가져오는 코드 제거
  // 모니터링 버튼 활성화 시에만 감지하도록 변경
  useEffect(() => {
    // 컴포넌트가 언마운트될 때 자동 감지 중단
    return () => {
      if (isAutoDetectionEnabled) {
        toggleAutoDetection();
      }
    };
  }, [isAutoDetectionEnabled, toggleAutoDetection]);

  // 탭 변경 핸들러
  const handleTabChange = (tab: '구글문서' | '오피스' | '코딩' | 'SNS') => {
    setActiveTab(tab);
  };

  return (
    <div className="monitoring-section">
      {/* 1. 타이핑 모니터링 제목 */}
      <div className="section-header">
        <h2 className="section-title">타이핑 모니터링</h2>
        <button 
          className={isMonitoringActive ? "monitoring-stop-btn" : "monitoring-start-btn"}
          onClick={toggleMonitoring}
        >
          {isMonitoringActive ? '모니터링 종료' : '모니터링 시작'}
        </button>
      </div>
      
      {/* 2. 모니터링 상태 */}
      <div className="monitoring-status-container">
        <div className="monitoring-status">
          <span className={`status-indicator ${isMonitoringActive ? 'active' : 'inactive'}`}></span>
          <span className="status-text">
            모니터링 상태: {isMonitoringActive ? '활성화' : '비활성화'}
          </span>
        </div>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
      
      {/* 좌우 레이아웃 컨테이너 */}
      <div className="monitoring-content-container">
        {/* 왼쪽 섹션 - 브라우저 상태 감지 및 바로가기 */}
        <div className="monitoring-left-column">
          {/* 3. 브라우저 상태 감지 섹션 */}
          <div className="browser-detection">
            <div className="detection-header">
              <h3 className="detection-title">브라우저 상태 감지</h3>
            </div>
            
            <div className="detection-items">
              <div className="detection-item">
                <span className="detection-label">감지된 브라우저:</span>
                <span className="detection-value">{currentBrowser}</span>
              </div>
              <div className="detection-item">
                <span className="detection-label">구글 문서 감지:</span>
                <span className="detection-value">{isGoogleDocDetected ? '감지됨' : '없음'}</span>
              </div>
              <div className="detection-item">
                <span className="detection-label">현재 창 감지:</span>
                <span className="detection-value">{currentWindow}</span>
              </div>
            </div>
          </div>
          
          {/* 4. 바로가기 섹션 */}
          <div className="shortcuts-section">
            <div className="shortcut-buttons">
              {Object.keys(tabContents).map(tab => (
                <button 
                  key={tab}
                  className={`shortcut-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab as '구글문서' | '오피스' | '코딩' | 'SNS')}
                >
                  {tab === '구글문서' ? '구글 문서' : tab}
                </button>
              ))}
            </div>
            <div className="shortcut-content">
              <div className="shortcut-content-container">
                <TabContent 
                  title={activeTab} 
                  items={tabContents[activeTab]} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringSection;