import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getLanguages } from '../config';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (type: 'general' | 'about' | 'help') => void;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ isOpen, onClose, onOpenModal }) => {
  const { settings, updateSettings } = useSettings();

  if (!isOpen) return null;
  const handleLanguageChange = () => {
    const languages = getLanguages();
    const currentIndex = languages.findIndex((lang: any) => lang.value === settings.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    const nextLanguage = languages[nextIndex].value as 'ko' | 'en' | 'ja' | 'zh';
    
    updateSettings({ language: nextLanguage });
    onClose();
  };

  const getCurrentLanguage = () => {
    return getLanguages().find((lang: any) => lang.value === settings.language);
  };
  
  return (
    <div className="settings-dropdown">
      {/* 일반 설정 */}
      <div className="settings-item" onClick={(e) => {
        e.stopPropagation();
        onOpenModal('general');
      }}>
        <span className="settings-icon">⚙️</span>
        <span className="settings-label">일반 설정</span>
      </div>

      {/* 언어 설정 */}
      <div className="settings-item" onClick={(e) => {
        e.stopPropagation();
        handleLanguageChange();
      }}>
        <span className="settings-icon">{getCurrentLanguage()?.icon}</span>
        <span className="settings-label">언어: {getCurrentLanguage()?.label}</span>
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
