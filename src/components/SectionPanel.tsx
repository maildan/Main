import React from "react";
import { Section } from "../types";

/**
 * 각 섹션의 내용을 표시하는 컴포넌트
 */
const SectionPanel: React.FC<{section: Section}> = ({ 
  section
}) => {
  // 현재 선택된 섹션에 따라 다른 컴포넌트 렌더링
  const renderSection = () => {
    switch (section) {
      case "모니터링":
        return (
          <div className="empty-content">
            모니터링 섹션
          </div>
        );
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