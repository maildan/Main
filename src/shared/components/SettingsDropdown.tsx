import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { THEME_OPTIONS, LANGUAGE_OPTIONS } from '../types/settings';
import { SettingsManager } from '../utils/settingsManager';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (type: 'general' | 'about' | 'help') => void;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ isOpen, onClose, onOpenModal }) => {
  const { settings, updateSettings } = useSettings();

  // 메뉴가 닫혀있을 때는 렌더링하지 않음
  if (!isOpen) return null;

  const handleThemeChange = () => {
    const currentIndex = THEME_OPTIONS.findIndex(option => option.value === settings.theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    const nextTheme = THEME_OPTIONS[nextIndex].value;
    
    updateSettings({ theme: nextTheme });
    onClose();
  };

  const handleLanguageChange = () => {
    const currentIndex = LANGUAGE_OPTIONS.findIndex(option => option.value === settings.language);
    const nextIndex = (currentIndex + 1) % LANGUAGE_OPTIONS.length;
    const nextLanguage = LANGUAGE_OPTIONS[nextIndex].value;
    
    updateSettings({ language: nextLanguage });
    onClose();
  };
  const handleModalOpen = (type: 'general' | 'about' | 'help') => {
    onOpenModal(type);
    onClose();
  };

  const getCurrentTheme = () => {
    return THEME_OPTIONS.find(option => option.value === settings.theme);
  };

  const getCurrentLanguage = () => {
    return LANGUAGE_OPTIONS.find(option => option.value === settings.language);
  };
  // 설정 메뉴 아이템 가져오기
  const settingsMenuItems = SettingsManager.getSettingsMenu();
  
  // 메뉴 아이템 클릭 핸들러
  const handleMenuItemClick = (item: any) => {
    switch(item.type) {
      case 'toggle':
        if (item.id === 'theme') handleThemeChange();
        else if (item.id === 'language') handleLanguageChange();
        break;
      case 'modal':
        if (item.id === 'general' || item.id === 'about' || item.id === 'help') {
          handleModalOpen(item.id);
        }
        break;
      // 구분선은 클릭 동작 없음
      case 'divider':
        break;
    }
  };
    return (
    <>
      <div className="settings-dropdown">
        {settingsMenuItems.map(item => {
          // 구분선 처리
          if (item.type === 'divider') {
            return <div key={item.id} className="settings-divider" />;
          }
          
          // 커스텀 아이템 렌더링 (테마/언어는 특별 처리)
          let icon = item.icon;
          let label = item.label;
          
          // 테마 아이템 (이제 메뉴에는 없지만 혹시 모르니 유지)
          if (item.id === 'theme') {
            icon = getCurrentTheme()?.icon;
            label = `테마: ${getCurrentTheme()?.label}`;
          }
          
          // 언어 아이템
          if (item.id === 'language') {
            icon = getCurrentLanguage()?.icon;
            label = `언어: ${getCurrentLanguage()?.label}`;
          }
          
          return (
            <div 
              key={item.id} 
              className="settings-item" 
              onClick={(e) => {
                e.stopPropagation(); // 이벤트 버블링 방지
                handleMenuItemClick(item);
              }}
            >
              <span className="settings-icon">{icon}</span>
              <span className="settings-label">{label}</span>
            </div>
          );
        })}
      </div>

      {/* 설정 모달은 메인 컴포넌트에서 관리됩니다 */}
    </>
  );
};

export default SettingsDropdown;
