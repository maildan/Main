import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { getAppInfo, getHelpSections, getContactInfo, getThemes } from '../config';

interface SettingsModalProps {
  type: 'general' | 'about' | 'help';
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ type, isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  const handleGeneralSettingChange = (key: keyof typeof settings.general, value: any) => {
    updateSettings({
      general: {
        ...settings.general,
        [key]: value
      }
    });
  };  const renderGeneralSettings = () => {
    const animationSpeedOptions = [
      { value: 'slow', label: '느리게' },
      { value: 'normal', label: '보통' },
      { value: 'fast', label: '빠르게' }
    ];
    
    const fontSizeOptions = [
      { value: 'small', label: '작게' },
      { value: 'medium', label: '보통' },
      { value: 'large', label: '크게' }
    ];
    
    return (
      <div className="settings-content">
        <h3>일반 설정</h3>
        
        <div className="settings-group">
          <h4>화면 설정</h4>
          
          {/* 테마 설정 추가 */}
          <div className="setting-item">
            <label className="setting-label">테마</label>            <div className="theme-options">
              {getThemes().map((theme: any) => (
                <div 
                  key={theme.value} 
                  className={`theme-option ${settings.theme === theme.value ? 'selected' : ''}`}
                  onClick={() => updateSettings({ theme: theme.value })}
                >
                  <span className="theme-icon">{theme.icon}</span>
                  <span className="theme-name">{theme.label}</span>
                  {settings.theme === theme.value && <span className="theme-selected">✓</span>}
                </div>
              ))}
            </div>
            <p className="setting-description">앱 전체 테마를 설정합니다</p>
          </div>
          
          <div className="setting-item">
            <label className="setting-label">애니메이션 속도</label>
            <select 
              value={settings.general.animationSpeed}
              onChange={(e) => handleGeneralSettingChange('animationSpeed', e.target.value)}
              className="setting-select"
            >
              {animationSpeedOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="setting-description">UI 애니메이션의 속도를 조정합니다</p>
          </div>
          
          <div className="setting-item">
            <label className="setting-label">글꼴 크기</label>
            <select 
              value={settings.general.fontSize}
              onChange={(e) => handleGeneralSettingChange('fontSize', e.target.value)}
              className="setting-select"
            >
              {fontSizeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="setting-description">UI의 글꼴 크기를 조정합니다</p>
          </div>
        </div>
          <div className="settings-group">
          <h4>기본 설정</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.general.autoSave}
                onChange={(e) => handleGeneralSettingChange('autoSave', e.target.checked)}
              />
              자동 저장
            </label>
            <p className="setting-description">변경사항을 자동으로 저장합니다</p>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn-danger" onClick={resetSettings}>
            설정 초기화
          </button>
        </div>
      </div>
    );
  };  const renderAboutInfo = () => {
    const appInfo = getAppInfo();
    const contactInfo = getContactInfo();
    
    return (
      <div className="settings-content">
        <h3>정보</h3>
        <div className="about-info">
          <div className="app-logo">
            <h2>{appInfo.name}</h2>
          </div>
          <div className="app-details">
            <p><strong>버전:</strong> {appInfo.version}</p>
            <p><strong>빌드:</strong> {appInfo.build}</p>
            <p><strong>개발자:</strong> {appInfo.developer}</p>
          </div>
          <div className="app-description">
            <p>{appInfo.description}</p>
            <p>{appInfo.subtitle}</p>
          </div>
          <div className="contact-info">
            <p><strong>웹사이트:</strong> <a href={contactInfo.website} target="_blank" rel="noopener noreferrer">{contactInfo.website}</a></p>
            <p><strong>GitHub:</strong> <a href={contactInfo.github} target="_blank" rel="noopener noreferrer">{contactInfo.github}</a></p>
          </div>
        </div>
      </div>
    );
  };  const renderHelpInfo = () => {
    const helpSections = getHelpSections();
    const contactInfo = getContactInfo();
    
    return (
      <div className="settings-content">
        <h3>도움말</h3>
        <div className="help-content">
          {helpSections.map((section: any) => (
            <div className="help-section" key={section.id}>
              <h4>{section.icon} {section.title}</h4>
              <ul>
                {section.content.map((item: any, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          
          <div className="contact-support">
            <p>더 궁금한 점이 있으신가요?</p>
            <div className="support-links">
              <a href={`mailto:${contactInfo.email}`} className="support-link">
                <span className="support-icon">📧</span>
                <span className="support-text">이메일 문의</span>
              </a>
              <a href={contactInfo.docs} target="_blank" rel="noopener noreferrer" className="support-link">
                <span className="support-icon">📚</span>
                <span className="support-text">문서 보기</span>
              </a>
              <a href={contactInfo.discord} target="_blank" rel="noopener noreferrer" className="support-link">
                <span className="support-icon">💬</span>
                <span className="support-text">커뮤니티 참여</span>
              </a>
            </div>
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
