/* File: src/components/Navigation/BackToHub.tsx */

import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import styles from './BackToHub.module.css';

interface Props {
  to: string;
  label: string;
}

const BackToHub: React.FC<Props> = ({ to, label }) => {
  return (
    <div className={styles.container}>
      <Link to={to} className={styles.link}>
        <span className={styles.iconWrapper}>
            <HiArrowLeft size={14} />
        </span>
        <span>{label}</span>
      </Link>
    </div>
  );
};

export default BackToHub;