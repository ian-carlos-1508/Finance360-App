import React from 'react';
import { FaPowerOff, FaBolt } from 'react-icons/fa';
import styles from './EmptyControlState.module.css';

interface Props {
  onInitialize: () => void;
}

const EmptyControlState: React.FC<Props> = ({ onInitialize }) => {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <FaPowerOff />
      </div>
      
      <h2 className={styles.title}>Systems Offline</h2>
      <p className={styles.subtitle}>
        The Flight Recorder is waiting for input. Log your first transaction to calibrate sensors and initialize the cockpit dashboard.
      </p>

      <button className={styles.actionButton} onClick={onInitialize}>
        <FaBolt /> Initialize Sensors
      </button>
    </div>
  );
};

export default EmptyControlState;