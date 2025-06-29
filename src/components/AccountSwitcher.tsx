import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../contexts/google/AuthContext';

interface UserProfile {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture_url?: string;
  has_valid_token: boolean;
  created_at: string;
  updated_at: string;
}

interface AccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountChanged?: () => void; // 계정 변경 시 호출될 callback
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ isOpen, onClose, onAccountChanged }) => {
  const { user, smartLogout, login, getSavedAccounts } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedAccounts();
    }
  }, [isOpen]);

  const loadSavedAccounts = async () => {
    try {
      setIsLoading(true);
      const accounts = await getSavedAccounts();
      setSavedAccounts(accounts);
    } catch (error) {
      console.error('저장된 계정 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmartLogout = async () => {
    try {
      await smartLogout();
      onClose();
    } catch (error) {
      console.error('스마트 로그아웃 실패:', error);
    }
  };

  const handleAddAccount = async () => {
    setIsLoading(true);
    try {
      await loadSavedAccounts(); // 계정 추가 시도 전 항상 계정 상태 새로고침
      const success = await login();
      if (success) {
        await loadSavedAccounts();
        if (onAccountChanged) onAccountChanged();
        onClose();
      } else {
        // 로그인 취소 시
        await loadSavedAccounts();
        if (onAccountChanged) onAccountChanged();
        onClose();
      }
    } catch (error) {
      alert('계정 추가에 실패했거나 인증 창이 차단되었습니다. 다시 시도해 주세요.');
      await loadSavedAccounts();
      if (onAccountChanged) onAccountChanged();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (window.confirm('이 계정을 저장된 목록에서 제거하시겠습니까?')) {
      try {
        await invoke('remove_account', { accountId });
        await loadSavedAccounts();
      } catch (error) {
        alert('계정 제거에 실패했습니다. 다시 시도해 주세요.');
      }
    }
  };

  const handleSwitchToAccount = async (accountId: string) => {
    try {
      await invoke('switch_account', { userId: accountId });
      await loadSavedAccounts();
      if (onAccountChanged) onAccountChanged();
      onClose();
    } catch (error) {
      alert('계정 전환에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 프로필 이미지 우선순위: 동일 이메일이면 user.profilePicture → picture_url → 이니셜
  const getProfileImage = (account: UserProfile) => {
    if (user && user.email === account.email && (user as any).profilePicture) return (user as any).profilePicture;
    if (account.picture_url) return account.picture_url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=666&color=fff`;
  };

  // 이미지 로딩 실패 시 fallback
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=666&color=fff`;
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="account-switcher-modal">
        <div className="modal-header">
          <h2>계정 관리</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* 현재 계정 */}
          {user ? (
            <div className="current-account">
              <h3>현재 계정</h3>
              <div className="account-avatar-list">
                <div
                  className={`account-avatar-item${expandedId === 'current' ? ' expanded' : ''}`}
                  onClick={() => setExpandedId(expandedId === 'current' ? null : 'current')}
                >
                  <img
                    className="account-avatar"
                    src={(user as any).profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=666&color=fff`}
                    alt={user.name}
                    onError={e => handleImgError(e, user.name)}
                  />
                  <div className="account-avatar-name">{user.name}</div>
                </div>
                {expandedId === 'current' && (
                  <div className="account-details-panel">
                    <div className="account-name">{user.name}</div>
                    <div className="account-email">{user.email}</div>
                    <button className="logout-button mono outline small" onClick={handleSmartLogout} disabled={isLoading}>
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="current-account empty">
              <h3>현재 계정</h3>
              <div style={{color:'#888',padding:'16px 0'}}>현재 로그인된 계정이 없습니다.</div>
            </div>
          )}
          {/* 저장된 계정 */}
          <div className="saved-accounts">
            <h3>저장된 계정 ({savedAccounts.length})</h3>
            {isLoading ? (
              <div className="loading">계정 정보를 불러오는 중...</div>
            ) : savedAccounts.length === 0 ? (
              <div className="empty">저장된 계정이 없습니다.</div>
            ) : (
              <div className="account-avatar-list">
                {savedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`account-avatar-item${expandedId === account.id ? ' expanded' : ''}`}
                    onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                  >
                    <img
                      className="account-avatar"
                      src={getProfileImage(account)}
                      alt={account.name}
                      onError={e => handleImgError(e, account.name)}
                    />
                    <div className="account-avatar-name">{account.name}</div>
                    {expandedId === account.id && (
                      <div className="account-details-panel">
                        <div className="account-name">{account.name}</div>
                        <div className="account-email">{account.email}</div>
                        <div className="account-actions">
                          <button
                            className="remove-button mono outline small"
                            onClick={e => { e.stopPropagation(); handleRemoveAccount(account.id); }}
                            disabled={isLoading}
                          >
                            제거
                          </button>
                          <button
                            className="switch-button mono outline small"
                            onClick={e => { e.stopPropagation(); handleSwitchToAccount(account.id); }}
                            disabled={isLoading}
                          >
                            전환
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              className="add-account-button"
              onClick={handleAddAccount}
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '계정 추가'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSwitcher;
