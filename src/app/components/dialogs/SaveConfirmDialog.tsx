'use client';

import React from 'react';
import ConfirmDialog from './ConfirmDialog';

interface SaveConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  settingsType?: string;
  isDarkMode?: boolean;
}

/**
 * 설정 저장 확인 대화상자
 */
const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  settingsType = '설정',
  isDarkMode = false
}) => {
  const title = `${settingsType} 저장`;
  const message = `변경된 ${settingsType}을(를) 저장하시겠습니까?`;

  return (
    <ConfirmDialog
      title={title}
      message={message}
      isOpen={isOpen}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText="저장"
      cancelText="취소"
      type="info"
      isDarkMode={isDarkMode}
    />
  );
};

export default SaveConfirmDialog;
