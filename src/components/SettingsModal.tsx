import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getAppInfo, getHelpSections, getThemes } from '../config/config';

interface SettingsModalProps {
  type: 'general' | 'about' | 'help';
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ type, isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings();

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };const renderGeneralSettings = () => {
    return (      <div className="settings-content">        <div className="settings-header">
          <h2>일반 설정</h2>
          <p className="settings-subtitle">앱의 기능을 설정해 주세요</p>
        </div>
        
        {/* 테마 설정 */}
        <div className="settings-section">
          <div className="section-header">
            <h3>테마</h3>
          </div>
          <div className="theme-grid">
            {getThemes().map((theme: any) => (
              <div 
                key={theme.value} 
                className={`theme-card ${settings.theme === theme.value ? 'selected' : ''}`}
                onClick={() => updateSettings({ theme: theme.value })}
              >
                <span className="theme-name">{theme.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };const renderAboutInfo = () => {
    const appInfo = getAppInfo();
    
    return (
      <div className="settings-content">
        <div className="settings-header">
          <h2>앱 정보</h2>
          <p className="settings-subtitle">Loop Pro에 대한 정보입니다</p>
        </div>
          <div className="about-container">
          <div className="app-info-card">
            <div className="app-logo-section">
              <div className="app-logo-icon">
                <img src="/Loopico.svg" alt="Loop Pro" />
              </div>
              <div className="app-identity">
                <h3 className="app-name">{appInfo.name}</h3>
                <p className="app-tagline">{appInfo.subtitle}</p>
              </div>
            </div>
            
            <div className="app-details-grid">
              <div className="detail-item">
                <span className="detail-label">버전</span>
                <span className="detail-value">{appInfo.version}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">빌드</span>
                <span className="detail-value">{appInfo.build}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">개발자</span>
                <span className="detail-value">{appInfo.developer}</span>
              </div>
            </div>
          </div>

          <div className="description-card">
            <p className="app-description">{appInfo.description}</p>
          </div>
        </div>
      </div>
    );
  };  const renderHelpInfo = () => {
    const helpSections = getHelpSections();
    
    return (
      <div className="settings-content">
        <div className="settings-header">
          <h2>도움말</h2>
          <p className="settings-subtitle">Loop Pro 사용 방법을 안내합니다</p>
        </div>
        
        <div className="help-container">
          <div className="help-sections">
            {helpSections.map((section: any) => (
              <div className="help-card" key={section.id}>
                <div className="help-header">
                  <h4 className="help-title">{section.title}</h4>
                </div>                <div className="help-content">
                  {section.content.map((item: any, index: number) => (
                    <div key={index} className="help-item">
                      <span className="help-text">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getModalContent = () => {
    switch (type) {
      case 'general':
        return renderGeneralSettings();
      case 'about':
        return renderAboutInfo();
      case 'help':
        return renderHelpInfo();
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          {getModalContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
