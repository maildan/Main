import React from 'react';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (type: 'general' | 'about' | 'help') => void;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ isOpen, onOpenModal }) => {
  if (!isOpen) return null;return (
    <div className="settings-dropdown">
      {/* 일반 설정 */}
      <div className="settings-item" onClick={(e) => {
        e.stopPropagation();
        onOpenModal('general');
      }}>
        <span className="settings-icon">⚙️</span>
        <span className="settings-label">일반 설정</span>
      </div>

      <div className="settings-divider" />

      {/* 정보 */}
      <div className="settings-item" onClick={(e) => {
        e.stopPropagation();
        onOpenModal('about');
      }}>
        <span className="settings-icon">ℹ️</span>
        <span className="settings-label">정보</span>
      </div>

      {/* 도움말 */}
      <div className="settings-item" onClick={(e) => {
        e.stopPropagation();
        onOpenModal('help');
      }}>
        <span className="settings-icon">❓</span>
        <span className="settings-label">도움말</span>
      </div>
    </div>
  );
};

export default SettingsDropdown;
