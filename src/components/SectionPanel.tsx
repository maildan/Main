import React from "react";
import { SectionPanelProps } from "../types";
import MonitoringSection from "./MonitoringSection";

/**
 * 각 섹션의 내용을 표시하는 컴포넌트
 */
const SectionPanel: React.FC<SectionPanelProps> = ({ 
  section, 
  isMonitoringActive,
  toggleMonitoring,
  browserDetector
}) => {
  // 현재 선택된 섹션에 따라 다른 컴포넌트 렌더링
  const renderSection = () => {
    switch (section) {
      case "모니터링":
        return <MonitoringSection 
          isMonitoringActive={isMonitoringActive} 
          toggleMonitoring={toggleMonitoring}
          browserDetector={browserDetector}
        />;
      default:
        return (
          <div className="empty-content">
            {section} 섹션 - 준비 중입니다
          </div>
        );
    }
  };

  return (
    <div className="section-panel">
      {renderSection()}
    </div>
  );
};

export default SectionPanel;