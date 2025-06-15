import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label: string;
  subLabel?: string;
  isActive?: boolean;
}

interface AnalysisProgressProps {
  staticProgress: number;
  dynamicProgress: number;
  totalProgress: number;
  currentTask: string;
  isRunning: boolean;
  keysCandidatesFound: number;
  onCancel?: () => void;
}

// 단일 진행률 바 컴포넌트
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  label, 
  subLabel, 
  isActive = false 
}) => {
  return (
    <div className={`progress-item ${isActive ? 'active' : ''}`}>
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{Math.round(value)}%</span>
      </div>
      {subLabel && <div className="progress-sublabel">{subLabel}</div>}
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

// 메인 분석 진행률 컴포넌트
export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  staticProgress,
  dynamicProgress,
  totalProgress,
  currentTask,
  isRunning,
  keysCandidatesFound,
  onCancel
}) => {
  return (
    <div className="analysis-progress">
      <div className="progress-header-main">
        <h3>카카오톡 키 후보 탐색 진행률</h3>
        <div className="progress-stats">
          <span className="keys-found">발견된 키 후보: {keysCandidatesFound}개</span>
        </div>
      </div>

      {/* 전체 진행률 */}
      <ProgressBar 
        value={totalProgress}
        label="전체 진행률"
        subLabel={currentTask}
        isActive={isRunning}
      />

      {/* 세부 진행률 */}
      <div className="progress-details">
        <ProgressBar 
          value={staticProgress}
          label="정적 분석"
          subLabel="레지스트리, 파일 시스템, 패턴 분석"
          isActive={isRunning && totalProgress < 50}
        />
        
        <ProgressBar 
          value={dynamicProgress}
          label="동적 분석"
          subLabel="메모리 탐색, 프로세스 분석"
          isActive={isRunning && totalProgress >= 50}
        />
      </div>

      {/* 컨트롤 버튼 */}
      {isRunning && onCancel && (
        <div className="progress-controls">
          <button 
            className="cancel-button"
            onClick={onCancel}
            type="button"
          >
            중단
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress;


