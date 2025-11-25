/* File: src/pages/Hubs/components/OptimizeTelemetryModal.tsx */

import React, { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { supabase } from '../../../lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { COLOR_INCOME, COLOR_TRANSFER, COLOR_EXPENSE } from '../../../lib/chartColors'; 
import styles from './OptimizeTelemetryModal.module.css'; 

interface Props {
	isOpen: boolean;
	onClose: () => void;
}

// Define Tabs
type Tab = 'TREND' | 'ALLOCATION';

const OptimizeTelemetryModal: React.FC<Props> = ({ isOpen, onClose }) => {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('TREND');

	useEffect(() => {
		if (isOpen) {
			const fetchData = async () => {
				setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
				    const { data: hubData } = await supabase.rpc('get_optimize_hub_data', { p_user_id: user.id });
                    setData(hubData);
                }
				setLoading(false);
			};
			fetchData();
		}
	}, [isOpen]);

	const hasData = data && data.trend && data.trend.length > 0;
    
    // Prepare Pie Data
    const pieData = [
        { name: 'Investments', value: Number(data?.total_invested || 0), color: COLOR_TRANSFER },
        { 
            name: 'Liquid Cash', 
            value: Math.max(0, Number(data?.total_assets || 0) - Number(data?.total_invested || 0) - Number(data?.total_real_estate || 0)), 
            color: COLOR_INCOME 
        }, 
        { name: 'Debt (Drag)', value: Number(data?.total_debt || 0), color: COLOR_EXPENSE }
    ].filter(d => d.value > 0);

    // Helper to render content
	const renderChartContent = () => {
        if (activeTab === 'TREND') {
            return (
                <div className={styles.singleChartWrapper}>
                    <h4 className={styles.chartTitle}>Net Worth Trajectory (6 Months)</h4>
                    <div className={styles.chartArea}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLOR_TRANSFER} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLOR_TRANSFER} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month_label" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} width={40} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Area type="monotone" dataKey="value" stroke={COLOR_TRANSFER} strokeWidth={3} fillOpacity={1} fill="url(#colorNw)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        } 
        
        if (activeTab === 'ALLOCATION') {
            return (
                <div className={styles.singleChartWrapper}>
                    <h4 className={styles.chartTitle}>Capital Allocation Breakdown</h4>
                    <div className={styles.chartArea}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                    // FIX: Use 'any' to bypass strict type checks on Recharts props
                                    label={(props: any) => 
                                        `${props.name}: ${(props.percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }
    };

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Wealth Telemetry (Deep Dive)">
			<div className={styles.container}>
				{loading ? (
					<div className={styles.loadingContainer}>Loading Wealth Data...</div>
				) : !hasData ? (
					<div className={styles.loadingContainer}>No wealth data found. Add assets to see trends.</div>
				) : (
					<>
                        {/* TABS */}
                        <div className={styles.tabHeader}>
                            <button 
                                className={activeTab === 'TREND' ? styles.tabButtonActive : styles.tabButton}
                                onClick={() => setActiveTab('TREND')}
                            >
                                History & Trend
                            </button>
                            <button 
                                className={activeTab === 'ALLOCATION' ? styles.tabButtonActive : styles.tabButton}
                                onClick={() => setActiveTab('ALLOCATION')}
                            >
                                Asset Allocation
                            </button>
                        </div>

                        {/* CONTENT */}
                        {renderChartContent()}
					</>
				)}
			</div>
		</Modal>
	);
};

export default OptimizeTelemetryModal;