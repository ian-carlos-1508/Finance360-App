import React, { useEffect, useState } from 'react';
import styles from './LevelUpModal.module.css';
import { HiShieldCheck, HiLightningBolt, HiGlobeAlt, HiX } from 'react-icons/hi';

export type GameTier = 'CONTROL' | 'BUILD' | 'OPTIMIZE';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tier: GameTier;
  level: number;
  isNewUser: boolean; // If true, show "Welcome Commander". If false, "Promotion Granted".
}

const LevelUpModal: React.FC<Props> = ({ isOpen, onClose, tier, level, isNewUser }) => {
  const [stage, setStage] = useState<'scanning' | 'revealed'>('scanning');

  useEffect(() => {
    if (isOpen) {
      setStage('scanning');
      // Fake scanning delay for dramatic effect
      const timer = setTimeout(() => setStage('revealed'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Config based on Tier
  const config = {
    CONTROL: {
      color: 'blue',
      icon: <HiLightningBolt size={64} />,
      title: 'Cash Flow Cadet',
      msg: 'System Status: Stabilizing. Your mission is to track every dollar and establish a surplus.',
    },
    BUILD: {
      color: 'green',
      icon: <HiShieldCheck size={64} />,
      title: 'Fortress Builder',
      msg: 'System Status: Under Construction. Eliminate high-interest threats and reinforce your shield.',
    },
    OPTIMIZE: {
      color: 'amber',
      icon: <HiGlobeAlt size={64} />,
      title: 'Wealth Strategist',
      msg: 'System Status: Optimal. Focus on capital efficiency and long-term expansion.',
    }
  }[tier];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onClose} className={styles.closeBtn}><HiX /></button>
        
        {stage === 'scanning' ? (
          <div className={styles.scanContainer}>
            <div className={styles.scannerRing}></div>
            <h2 className={styles.scanText}>Analyzing Financial Telemetry...</h2>
            <div className={styles.scanData}>
              <p>Checking Assets...</p>
              <p>Calculating Ratios...</p>
              <p>Verifying Debts...</p>
            </div>
          </div>
        ) : (
          <div className={`${styles.revealContainer} ${styles[config.color]}`}>
            <div className={styles.iconWrapper}>
              {config.icon}
            </div>
            <h1 className={styles.mainTitle}>
              {isNewUser ? 'WELCOME, COMMANDER' : 'PROMOTION GRANTED'}
            </h1>
            <div className={styles.badge}>
              LEVEL {level} • {config.title}
            </div>
            <p className={styles.message}>{config.msg}</p>
            <button onClick={onClose} className={styles.actionBtn}>
              Initialize Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelUpModal;