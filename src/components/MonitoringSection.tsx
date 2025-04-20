import React, { useState } from "react";

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
  const [detectedBrowser, setDetectedBrowser] = useState("Chrome");
  const [isGoogleDocDetected, setIsGoogleDocDetected] = useState(false);
  const [currentWindow, setCurrentWindow] = useState("루프 앱");
  const [activeTab, setActiveTab] = useState<'구글문서' | '오피스' | '코딩' | 'SNS'>('SNS');
  
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
    setIsMonitoringActive(!isMonitoringActive);
  };

  // 모니터링 버튼 클릭 핸들러
  const handleMonitoringButtonClick = () => {
    toggleMonitoring();
  };

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
          onClick={handleMonitoringButtonClick}
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
      </div>
      
      {/* 좌우 레이아웃 컨테이너 */}
      <div className="monitoring-content-container">
        {/* 왼쪽 섹션 - 브라우저 상태 감지 및 바로가기 */}
        <div className="monitoring-left-column">
          {/* 3. 브라우저 상태 감지 섹션 */}
          <div className="browser-detection">
            <h3 className="detection-title">브라우저 상태 감지</h3>
            <div className="detection-items">
              <div className="detection-item">
                <span className="detection-label">감지된 브라우저:</span>
                <span className="detection-value">{detectedBrowser}</span>
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
        
        {/* 오른쪽 섹션 - 기타 정보 */}
        <div className="monitoring-right-column">
          {/* 여기에 다른 콘텐츠를 추가할 수 있습니다 */}
        </div>
      </div>
    </div>
  );
};

export default MonitoringSection;