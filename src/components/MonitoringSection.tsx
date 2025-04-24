import React, { useState } from "react";
import { BrowserInfo, AppType } from "../types";
import { invoke } from "@tauri-apps/api/core";

/**
 * 창 제목을 간결하게 표시하는 함수
 * @param appName 앱 이름
 * @param windowTitle 창 제목
 * @returns 간결하게 처리된 창 제목
 */
const truncateWindowTitle = (appName: string, windowTitle: string): string => {
  // 최대 길이 설정
  const MAX_LENGTH = 40;
  
  // 앱 이름이 창 제목에 포함되어 있으면 중복 제거
  let title = windowTitle;
  if (appName && windowTitle.includes(appName)) {
    title = windowTitle.replace(appName, '').trim();
    // 앞뒤 특수문자 제거 (- : 등)
    title = title.replace(/^[-–—:]+|[-–—:]+$/g, '').trim();
  }
  
  // 특정 앱별 추가 처리
  if (appName === "VS Code") {
    // VS Code 제목에서 경로 부분만 간결하게 표시 (예: "file.tsx - project")
    const matches = title.match(/(.+?)(\s-\s.+)?$/);
    if (matches && matches[1]) {
      const fileName = matches[1].trim();
      const projectInfo = matches[2] ? matches[2] : '';
      return fileName + (projectInfo.length > 20 ? projectInfo.substring(0, 17) + '...' : projectInfo);
    }
  } else if (appName === "Google Chrome" && title.includes("YouTube")) {
    // YouTube 동영상 제목 간결화
    if (title.includes(" - YouTube")) {
      title = title.replace(" - YouTube", "");
      return title.length > MAX_LENGTH ? title.substring(0, MAX_LENGTH - 3) + '...' : title;
    }
  }
  
  // 일반적인 제목 길이 제한
  if (title.length > MAX_LENGTH) {
    return title.substring(0, MAX_LENGTH - 3) + '...';
  }
  
  return title;
};

/**
 * 바로가기 탭 아이템 컴포넌트
 */
const TabContent: React.FC<{ title: string, items: string[] }> = ({ items }) => {
  const [executingProgram, setExecutingProgram] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 프로그램 실행 함수
  const handleProgramLaunch = async (programName: string) => {
    try {
      // 이미 프로그램 실행 중이면 무시
      if (executingProgram) {
        return;
      }

      setExecutingProgram(programName);
      setErrorMessage(null);

      // 타임아웃 설정 (5초)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("실행 시간이 초과되었습니다.")), 5000);
      });

      // Rust 함수 호출 (타임아웃과 경쟁)
      const invokePromise = invoke<string>("launch_program", { programName });
      
      // Promise.race로 먼저 완료되는 프로미스를 처리
      const result = await Promise.race([invokePromise, timeoutPromise]);
      console.log(result); // 성공 메시지 출력
    } catch (error) {
      console.error("프로그램 실행 오류:", error);
      // 타임아웃이나 일반 오류 메시지 표시
      const errorMsg = error instanceof Error 
        ? error.message 
        : String(error);
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 3000); // 3초 후 오류 메시지 제거
    } finally {
      setExecutingProgram(null);
    }
  };

  return (
    <div className="shortcut-container">
      {errorMessage && (
        <div className="error-popup">
          {errorMessage}
        </div>
      )}
      
      <ul className="shortcut-list">
        {items.map((item, index) => (
          <li 
            key={index} 
            className={`shortcut-item ${executingProgram === item ? 'executing' : ''}`}
            onClick={() => handleProgramLaunch(item)}
          >
            {item}
            {executingProgram === item && <span className="loading-indicator">...</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

// 모니터링 섹션 컴포넌트 props 타입 정의
interface MonitoringSectionProps {
  isMonitoringActive?: boolean;
  toggleMonitoring?: () => void;
  browserDetector?: any;
}

/**
 * 모니터링 섹션 컴포넌트
 */
const MonitoringSection: React.FC<MonitoringSectionProps> = ({ 
  isMonitoringActive = false,
  toggleMonitoring,
  browserDetector
}) => {
  const [activeTab, setActiveTab] = useState<'문서' | '오피스' | '코딩' | 'SNS'>('SNS');
  
  // 상위 컴포넌트에서 전달받은 브라우저 감지 훅 사용
  const {
    allBrowserWindows,
    allApplications,
    error,
    isAppRunning,
  } = browserDetector || {};
  
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
    if (allWindows && allWindows.length > 0 && isMonitoringActive) {
      const firstWindow = allWindows[0];
      return firstWindow.name || getBrowserNameFromWindowTitle(firstWindow.window_title);
    }
    return "감지된 브라우저 없음";
  };

  // 현재 감지된 브라우저 정보
  const currentBrowser = extractBrowserName(allBrowserWindows || []);
  const isGoogleDocDetected = allBrowserWindows && allBrowserWindows.length > 0 && isMonitoringActive && 
    (allBrowserWindows[0].window_title.includes("Google Docs") || 
     allBrowserWindows[0].window_title.includes("구글 문서"));
  
  // 탭 콘텐츠 데이터
  const tabContents = {
    '문서': [
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
      'Inteliji',
      'Eclipse',
    ],
    'SNS': [
      '카카오톡',
      '디스코드',
      '인스타그램',
    ]
  };
  
  // 탭 콘텐츠에 맞는 앱 타입 매핑
  const tabAppTypeMap = {
    '문서': {
      '구글 문서': AppType.GoogleDocs,
      '구글 스프레드시트': AppType.GoogleSheets,
      '구글 프레젠테이션': AppType.GoogleSlides,
      'Notion': AppType.Notion
    },
    '오피스': {
      '워드': AppType.MicrosoftWord,
      '엑셀': AppType.MicrosoftExcel,
      '파워포인트': AppType.MicrosoftPowerPoint,
      '원노트': AppType.MicrosoftOneNote
    },
    '코딩': {
      'VS Code': AppType.VSCode,
      'Inteliji': AppType.IntelliJ,
      'Eclipse': AppType.Eclipse
    },
    'SNS': {
      '카카오톡': AppType.KakaoTalk,
      '디스코드': AppType.Discord,
      '인스타그램': AppType.Instagram
    }
  };

  // 탭 변경 핸들러
  const handleTabChange = (tab: '문서' | '오피스' | '코딩' | 'SNS') => {
    setActiveTab(tab);
  };

  // 로컬에서 정의된 함수가 아닌 prop으로 전달받은 함수 사용
  const handleToggleMonitoring = () => {
    if (toggleMonitoring) {
      toggleMonitoring();
    }
  };

  return (
    <div className="monitoring-section scrollable-container">
      {/* 1. 타이핑 모니터링 제목 */}
      <div className="section-header">
        <h2 className="section-title">타이핑 모니터링</h2>
        <button 
          className={isMonitoringActive ? "monitoring-stop-btn" : "monitoring-start-btn"}
          onClick={handleToggleMonitoring}
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
          {/* 3. 브라우저 및 애플리케이션 상태 감지 섹션 */}
          <div className="browser-detection">
            <div className="detection-header">
              <h3 className="detection-title">애플리케이션 상태 감지</h3>
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
                <span className={`detection-value ${browserDetector?.appActiveState === 'cached' ? 'cached-app-info' : ''}`}>
                  {isMonitoringActive && browserDetector?.currentActiveApplication ? (
                    <>
                      <strong>{browserDetector.currentActiveApplication.name}</strong>
                      {browserDetector.currentActiveApplication.window_title && (
                        <>
                          {" - "}
                          <span className="window-title" title={browserDetector.currentActiveApplication.window_title}>
                            {truncateWindowTitle(browserDetector.currentActiveApplication.name, browserDetector.currentActiveApplication.window_title)}
                          </span>
                        </>
                      )}
                      {browserDetector?.appActiveState === 'cached' && (
                        <span className="cached-indicator">(마지막 감지됨)</span>
                      )}
                    </>
                  ) : (
                    "감지된 창 없음"
                  )}
                </span>
              </div>
              
              {/* 실행 중인 애플리케이션 정보 표시 */}
              <div className="detection-header">
                <h4 className="detection-subtitle">실행 중인 바로가기 앱</h4>
              </div>
              {isMonitoringActive && allApplications && allApplications.length > 0 ? (
                <div className="app-running-list">
                  {Object.entries(tabAppTypeMap).map(([category, apps]) => (
                    Object.entries(apps).map(([appName, appType]) => 
                      isAppRunning && isAppRunning(appType as AppType) && (
                        <div key={appName} className="detection-item app-running">
                          <span className="app-indicator active"></span>
                          <span className="app-name">{appName}</span>
                          <span className="app-category">({category})</span>
                        </div>
                      )
                    )
                  ))}

                </div>
              ) : (
                <div className="no-apps-running">
                  {isMonitoringActive ? '감지된 바로가기 앱 없음' : '모니터링을 시작하세요'}
                </div>
              )}
            </div>
          </div>
          
          {/* 4. 바로가기 섹션 */}
          <div className="shortcuts-section">
            <div className="shortcut-buttons">
              {Object.keys(tabContents).map(tab => (
                <button 
                  key={tab}
                  className={`shortcut-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab as '문서' | '오피스' | '코딩' | 'SNS')}
                >
                  {tab === '문서' ? '문서' : tab}
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