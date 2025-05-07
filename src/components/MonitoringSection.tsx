import React from "react";

/**
 * 모니터링 섹션 컴포넌트
 */
const MonitoringSection: React.FC<{ 
  isMonitoringActive?: boolean; 
  toggleMonitoring?: () => void; 
}> = ({ 
  }) => {
  return (
    <div className="monitoring-section scrollable-container">
      {/* 모니터링 제목 */}
      <div className="section-header">
        <h2 className="section-title">모니터링</h2>
      </div>
    </div>
  );
};

export default MonitoringSection;