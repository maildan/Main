import React, { useState, useEffect } from 'react';
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
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ isOpen, onClose }) => {
  const { user, smartLogout, switchAccount, getSavedAccounts, syncAccountData } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

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

  const handleSwitchAccount = async () => {
    try {
      await switchAccount();
      onClose();
    } catch (error) {
      console.error('계정 전환 실패:', error);
    }
  };

  const handleSyncAccount = async (userId: string) => {
    try {
      setIsSyncing(userId);
      await syncAccountData(userId);
      await loadSavedAccounts(); // 동기화 후 계정 목록 새로고침
    } catch (error) {
      console.error('계정 동기화 실패:', error);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (confirm('이 계정을 제거하시겠습니까? 로컬에 저장된 데이터가 삭제됩니다.')) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('remove_account', { accountId });
        console.log('계정 제거 완료:', accountId);
        await loadSavedAccounts(); // 계정 목록 새로고침
      } catch (error) {
        console.error('계정 제거 실패:', error);
        alert('계정 제거에 실패했습니다: ' + error);
      }
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="account-switcher-modal">
        <div className="modal-header">
          <h2>계정 관리</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* 현재 계정 정보 */}
          {user && (
            <div className="current-account-section">
              <h3>현재 계정</h3>
              <div className="account-card current">
                <div className="account-info">
                  <div className="account-avatar">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="account-details">
                    <div className="account-name">{user.name}</div>
                    <div className="account-email">{user.email}</div>
                  </div>
                </div>
                <div className="account-actions">
                  <button
                    className="btn-secondary"
                    onClick={handleSmartLogout}
                  >
                    스마트 로그아웃
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 저장된 계정 목록 */}
          <div className="saved-accounts-section">
            <div className="section-header">
              <h3>저장된 계정</h3>
              <button
                className="btn-primary"
                onClick={handleSwitchAccount}
              >
                {savedAccounts.length === 0 ? '계정 추가' : '다른 계정 추가'}
              </button>
            </div>

            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <span>계정 목록을 불러오는 중...</span>
              </div>
            ) : savedAccounts.length === 0 ? (
              <div className="empty-accounts">
                <p>저장된 계정이 없습니다.</p>
                <p>다른 계정을 추가해 보세요.</p>
              </div>
            ) : (
              <div className="accounts-list">
                {savedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`account-card ${account.id === user?.id ? 'current' : ''}`}
                  >
                    <div className="account-info">
                      <div className="account-avatar">
                        {account.picture_url ? (
                          <img src={account.picture_url} alt={account.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {account.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="account-details">
                        <div className="account-name">{account.name}</div>
                        <div className="account-email">{account.email}</div>
                        <div className="account-status">
                          {account.has_valid_token ? (
                            <span className="status-active">토큰 유효</span>
                          ) : (
                            <span className="status-inactive">토큰 만료</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="account-actions">
                      {account.id !== user?.id && (
                        <>
                          <button
                            className="btn-sync"
                            onClick={() => handleSyncAccount(account.id)}
                            disabled={isSyncing === account.id}
                          >
                            {isSyncing === account.id ? (
                              <>
                                <div className="spinner-small"></div>
                                동기화 중...
                              </>
                            ) : (
                              '동기화'
                            )}
                          </button>
                          <button
                            className="btn-remove"
                            onClick={() => handleRemoveAccount(account.id)}
                            title="계정 제거"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 설명 */}
          <div className="info-section">
            <h4>스마트 로그아웃이란?</h4>
            <ul>
              <li>토큰만 삭제하고 문서 및 프로필 데이터는 보존됩니다</li>
              <li>다시 로그인하면 기존 데이터와 자동으로 동기화됩니다</li>
              <li>계정 전환 시 각 계정의 데이터가 분리 관리됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSwitcher;
