import React from 'react';
import styles from './Modal.module.css';
import { HiX } from 'react-icons/hi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isNested?: boolean; // NEW: Prop to indicate if it's a nested modal
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, isNested = false }) => {
  if (!isOpen) {
    return null;
  }

  // NEW: Use the correct overlay style
  const overlayClass = isNested ? styles.nestedOverlay : styles.overlay;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <HiX />
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;