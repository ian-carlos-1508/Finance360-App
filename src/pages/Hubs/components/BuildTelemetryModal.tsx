import React, { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { supabase } from '../../../lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { COLOR_INCOME, COLOR_EXPENSE, COLOR_TRANSFER } from '../../../lib/chartColors'; 
// CHANGE: Import the dedicated CSS file
import styles from './BuildTelemetryModal.module.css'; 

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type SolvencyTrendData = {
    month_label: string;
    total_cash: number;
    toxic_debt: number;
    liquidity_months: number;
};

const BuildTelemetryModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<SolvencyTrendData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setLoading(false); return; }

                // Call the "Reverse Anchor" RPC
                const { data: rawData, error } = await supabase.rpc('get_solvency_trend', { p_user_id: user.id });

                if (error) {
                    console.error("Build Telemetry RPC Error:", error);
                } else {
                    console.log("Build Telemetry Data Received:", rawData); // <--- DEBUG LOG
                }

                if (rawData) {
                    const formatted = rawData.map((d: any) => ({
                        month_label: d.month_label,
                        total_cash: Number(d.total_cash),
                        toxic_debt: Number(d.toxic_debt),
                        liquidity_months: Number(d.liquidity_months),
                    }));
                    setData(formatted);
                }
                setLoading(false);
            };
            fetchData();
        }
    }, [isOpen]);

    // Check if we have data (checking length is enough now)
    const hasData = data && data.length > 0;

    const renderChart = (title: string, content: React.ReactNode) => (
        <div className={styles.dualChartWrapper}>
            <h4 className={styles.chartTitle}>{title}</h4>
            <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    {content}
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Fortress Telemetry (6-Month Trend)">
            <div className={styles.container}>
                
                {loading ? (
                    <div className={styles.loadingContainer}>Loading Solvency Trends...</div>
                ) : !hasData ? (
                    <div className={styles.loadingContainer}>
                        No historical data returned from database. 
                        <br/>Check console for 'Build Telemetry Data' logs.
                    </div>
                ) : (
                    <>
                        {/* CHART 1: THE GAP (Cash vs Debt Balances) */}
                        {renderChart("The Solvency Gap (Cash vs. Toxic Debt)", (
                            <LineChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month_label" tick={{ fontSize: 10 }} />
                                <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} width={40} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                
                                <Line type="monotone" dataKey="total_cash" stroke={COLOR_INCOME} strokeWidth={2} name="Liquid Cash" dot={{r:3}} />
                                <Line type="monotone" dataKey="toxic_debt" stroke={COLOR_EXPENSE} strokeWidth={2} name="Toxic Debt" dot={false} />
                            </LineChart>
                        ))}

                        {/* CHART 2: RUNWAY TREND */}
                        {renderChart("Survival Runway Trend (Months)", (
                            <AreaChart data={data} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLiquidity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLOR_TRANSFER} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={COLOR_TRANSFER} stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month_label" tick={{ fontSize: 10 }} />
                                <YAxis dataKey="liquidity_months" width={40} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(1)} Months`} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                
                                <ReferenceLine 
                                    y={3} 
                                    stroke="#f59e0b" 
                                    strokeDasharray="3 3" 
                                    label={{ value: 'Target', position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }} 
                                />

                                <Area type="monotone" dataKey="liquidity_months" name="Runway" stroke={COLOR_TRANSFER} fillOpacity={1} fill="url(#colorLiquidity)" />
                            </AreaChart>
                        ))}
                    </>
                )}
            </div>
        </Modal>
    );
};

export default BuildTelemetryModal;