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
    try {
      setIsLoading(true);
      console.log('계정 추가 시작...');
      
      // 로그인 완료까지 대기 (모달은 닫지 않음)
      const success = await login();
      
      if (success) {
        console.log('로그인 성공, 계정 목록 새로고침...');
        await loadSavedAccounts(); // 계정 목록 새로고침
        
        // 새로 추가된 계정의 문서 자동 동기화
        if (onAccountChanged) {
          try {
            console.log('계정 추가 후 문서 자동 동기화 시작...');
            onAccountChanged();
            console.log('문서 자동 동기화 완료');
          } catch (syncError) {
            console.error('문서 동기화 실패:', syncError);
            // 동기화 실패해도 계정 추가는 완료된 상태로 처리
          }
        }
        
        onClose(); // 성공 시에만 모달 닫기
      } else {
        console.log('로그인 실패 또는 취소됨');
        alert('로그인이 취소되었거나 실패했습니다.');
      }
    } catch (error) {
      console.error('계정 추가 실패:', error);
      alert('계정 추가에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };



  const handleRemoveAccount = async (accountId: string) => {
    if (window.confirm('이 계정을 저장된 목록에서 제거하시겠습니까?')) {
      try {
        // Tauri API를 통해 계정 제거
        await invoke('remove_account', { accountId });
        await loadSavedAccounts(); // 목록 새로고침
      } catch (error) {
        console.error('계정 제거 실패:', error);
        alert('계정 제거에 실패했습니다. 다시 시도해 주세요.');
      }
    }
  };

  const handleSwitchToAccount = async (accountId: string) => {
    try {
      // 백엔드의 switch_account 명령어 호출
      const switchedUser = await invoke('switch_account', { userId: accountId });
      
      console.log('계정 전환 완료:', switchedUser);
      
      // 계정 목록 새로고침
      await loadSavedAccounts();
      
      // 전환된 계정의 문서 자동 동기화
      if (onAccountChanged) {
        try {
          console.log('계정 전환 후 문서 자동 동기화 시작...');
          onAccountChanged();
          console.log('문서 자동 동기화 완료');
        } catch (syncError) {
          console.error('문서 동기화 실패:', syncError);
          // 동기화 실패해도 계정 전환은 완료된 상태로 처리
        }
      }
      
      onClose();
    } catch (error) {
      console.error('계정 전환 실패:', error);
      alert('계정 전환에 실패했습니다. 다시 시도해 주세요.');
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
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 현재 계정 */}
          {user && (
            <div className="current-account">
              <h3>현재 계정</h3>
              <div className="account-card">
                <img 
                  className="account-avatar" 
                  src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=666&color=fff`} 
                  alt={user.name}
                />
                <div className="account-info">
                  <div className="account-name">{user.name}</div>
                  <div className="account-email">{user.email}</div>
                </div>
                <button className="logout-button" onClick={handleSmartLogout}>
                  로그아웃
                </button>
              </div>
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
              <div className="account-list">
                {savedAccounts.map((account) => (
                  <div key={account.id} className="account-card">
                    <img 
                      className="account-avatar" 
                      src={account.picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=666&color=fff`} 
                      alt={account.name}
                    />
                    <div className="account-info">
                      <div className="account-name">{account.name}</div>
                      <div className="account-email">{account.email}</div>
                    </div>
                    <div className="account-actions">
                      <button
                        className="remove-button"
                        onClick={() => handleRemoveAccount(account.id)}
                      >
                        제거
                      </button>
                      <button
                        className="switch-button"
                        onClick={() => handleSwitchToAccount(account.id)}
                      >
                        전환
                      </button>
                    </div>
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
