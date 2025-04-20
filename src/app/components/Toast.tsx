import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

export interface ToastProps {
  id?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
  onDismiss?: (id: string) => void;
}

export function Toast({ id, message, type, duration = 5000, onClose, onDismiss }: ToastProps): React.ReactNode {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
      if (id && onDismiss) onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose, onDismiss]);

  const handleCloseClick = () => {
    setVisible(false);
    if (onClose) onClose();
    if (id && onDismiss) onDismiss(id);
  };

  return visible ? (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.message}>{message}</span>
      <button onClick={handleCloseClick} className={styles.closeButton}>X</button>
    </div>
  ) : null;
}