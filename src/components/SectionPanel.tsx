import React from "react";
import { SectionPanelProps } from "../types";

/**
 * 각 섹션의 내용을 표시하는 컴포넌트
 */
const SectionPanel: React.FC<SectionPanelProps> = ({ section }) => {
  return (
    <div className="section-panel">
      <div className="empty-content">
        {section} 섹션 - 준비 중입니다
      </div>
    </div>
  );
};

export default SectionPanel;