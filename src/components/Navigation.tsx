import React from "react";
import { NavigationProps } from "../types";

/**
 * 앱 내 네비게이션 메뉴를 관리하는 컴포넌트
 */
const Navigation: React.FC<NavigationProps> = ({ sections, activeSection, onSectionChange }) => {
  return (
    <div className="app-sidebar" role="navigation">
      <nav className="navigation">
        {sections.map(section => (
          <button 
            key={section}
            className={`nav-button ${activeSection === section ? 'active' : ''}`}
            onClick={() => onSectionChange(section)}
            aria-current={activeSection === section ? "page" : undefined}
          >
            {section}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Navigation;