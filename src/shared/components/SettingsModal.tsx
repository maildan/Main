import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsManager } from '../utils/settingsManager';
import { THEME_OPTIONS } from '../types/settings';

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
  };

  const handleAdvancedSettingChange = (key: keyof typeof settings.advanced, value: any) => {
    updateSettings({
      advanced: {
        ...settings.advanced,
        [key]: value
      }
    });
  };
  const renderGeneralSettings = () => {
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
    
    const experimentalFeatures = SettingsManager.getExperimentalFeatures();
    
    return (
      <div className="settings-content">
        <h3>일반 설정</h3>
        
        <div className="settings-group">
          <h4>화면 설정</h4>
          
          {/* 테마 설정 추가 */}
          <div className="setting-item">
            <label className="setting-label">테마</label>
            <div className="theme-options">
              {THEME_OPTIONS.map(theme => (
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

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.general.showNotifications}
                onChange={(e) => handleGeneralSettingChange('showNotifications', e.target.checked)}
              />
              알림 표시
            </label>
            <p className="setting-description">시스템 알림을 표시합니다</p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.general.enableSounds}
                onChange={(e) => handleGeneralSettingChange('enableSounds', e.target.checked)}
              />
              소리 효과
            </label>
            <p className="setting-description">버튼 클릭 시 소리를 재생합니다</p>
          </div>
        </div>

        <div className="settings-group">
          <h4>고급 설정</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.advanced.enableDebugMode}
                onChange={(e) => handleAdvancedSettingChange('enableDebugMode', e.target.checked)}
              />
              디버그 모드
            </label>
            <p className="setting-description">개발자 도구를 활성화합니다</p>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              캐시 크기: {settings.advanced.cacheSize}MB
              <input
                type="range"
                min="50"
                max="500"
                value={settings.advanced.cacheSize}
                onChange={(e) => handleAdvancedSettingChange('cacheSize', parseInt(e.target.value))}
              />
            </label>
            <p className="setting-description">앱 캐시 크기를 설정합니다</p>
          </div>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.advanced.autoUpdate}
                onChange={(e) => handleAdvancedSettingChange('autoUpdate', e.target.checked)}
              />
              자동 업데이트
            </label>
            <p className="setting-description">앱 업데이트 자동 설치</p>
          </div>
        </div>
        
        {/* 실험적 기능 섹션 */}
        <div className="settings-group">
          <h4>실험적 기능</h4>
          <p className="settings-group-description">아직 개발 중인 기능들입니다. 불안정할 수 있습니다.</p>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.advanced.experimentalFeatures}
                onChange={(e) => handleAdvancedSettingChange('experimentalFeatures', e.target.checked)}
              />
              실험적 기능 활성화
            </label>
          </div>
          
          {settings.advanced.experimentalFeatures && experimentalFeatures.map(feature => (
            <div className="experimental-feature" key={feature.id}>
              <div className="feature-header">
                <h5>{feature.name}</h5>
                {!feature.stable && <span className="feature-badge">베타</span>}
              </div>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="settings-actions">
          <button className="btn-danger" onClick={resetSettings}>
            설정 초기화
          </button>
        </div>
      </div>
    );
  };
  const renderAboutInfo = () => {
    const appInfo = SettingsManager.getAppInfo();
    const contactInfo = SettingsManager.getContactInfo();
    
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
  };
  const renderHelpInfo = () => {
    const helpSections = SettingsManager.getHelpSections();
    const contactInfo = SettingsManager.getContactInfo();
    
    return (
      <div className="settings-content">
        <h3>도움말</h3>
        <div className="help-content">
          {helpSections.map(section => (
            <div className="help-section" key={section.id}>
              <h4>{section.icon} {section.title}</h4>
              <ul>
                {section.content.map((item, index) => (
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
