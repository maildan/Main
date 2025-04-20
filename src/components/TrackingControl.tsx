import React from "react";
import { TrackingControlProps } from "../types";

/**
 * 키보드 트래킹 기능을 제어하는 컴포넌트
 */
const TrackingControl: React.FC<TrackingControlProps> = ({ isEnabled, onToggle }) => {
  return (
    <div className="tracking-control">
      <button 
        className={`tracking-button ${isEnabled ? 'active' : ''}`}
        onClick={onToggle}
        aria-pressed={isEnabled}
      >
        {isEnabled ? '트래킹 중지' : '트래킹 시작'}
      </button>
    </div>
  );
};

export default TrackingControl;