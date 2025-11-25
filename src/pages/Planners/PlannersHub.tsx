import React from 'react';
import styles from './PlannersHub.module.css';
import sharedStyles from '../Settings/Settings.module.css';
import { Link } from 'react-router-dom';
// NEW: Import BackToHub
import BackToHub from '../../components/Navigation/BackToHub'; 
import {
  HiHome,
  HiStar,
  HiTrendingUp,
} from 'react-icons/hi';
import { HiShieldCheck, HiBuildingOffice2 } from 'react-icons/hi2';

const planners = [
  {
    title: 'Debt Reduction',
    description: 'Snowball or Avalanche. Plan your path to zero debt.',
    icon: <HiShieldCheck />,
    path: '/planners/debt',
    status: 'Active',
  },
  {
    title: 'Investment Calculator',
    description: 'Project your future wealth with compound interest.',
    icon: <HiTrendingUp />,
    path: '/planners/investment',
    status: 'Active',
  },
  {
    title: 'Real Estate Calculator',
    description: 'Analyze potential investment properties and cash flow.',
    icon: <HiBuildingOffice2 />,
    path: '/planners/real-estate',
    status: 'Active',
  },
  {
    title: 'Mortgage Calculator',
    description: 'See how much house you can afford.',
    icon: <HiHome />,
    path: '/planners/mortgage',
    status: 'Active',
  },
  {
    title: 'Financial Independence',
    description: 'Calculate your time to "FI" based on the 4% rule.',
    icon: <HiStar />,
    path: '/planners/fi',
    status: 'Active',
  },
];

const PlannerCard: React.FC<typeof planners[0]> = ({
  title,
  description,
  icon,
  path,
  status,
}) => {
  const cardContent = (
    <>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {status !== 'Active' && (
        <span className={styles.comingSoonTag}>Coming Soon</span>
      )}
    </>
  );

  return status === 'Active' ? (
    <Link to={path} className={styles.plannerCard}>
      {cardContent}
    </Link>
  ) : (
    <div
      className={styles.plannerCard}
      style={{ opacity: 0.6, cursor: 'not-allowed' }}
      aria-disabled="true"
    >
      {cardContent}
    </div>
  );
};

function PlannersHub() {
  return (
    <div>
      {/* ADDED: Navigation back to Wealth HQ */}
      <BackToHub to="/optimize" label="Back to Wealth HQ" />

      <h1 className={sharedStyles.title}>Calculators & Planners</h1>
      <p className={sharedStyles.profileInfo}>
        Tools to help you plan your financial future, from debt payoff to
        retirement.
      </p>
      <div className={styles.hubGrid}>
        {planners.map((planner) => (
          <PlannerCard key={planner.title} {...planner} />
        ))}
      </div>
    </div>
  );
}

export default PlannersHub;