import React, { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal';
import { supabase } from '../../../lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../../lib/utils';
import { COLOR_INCOME, COLOR_EXPENSE } from '../../../lib/chartColors';
import styles from './TelemetryModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TelemetryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        const { data: rawData } = await supabase.rpc('get_monthly_cashflow_trend');
        
        if (rawData) {
            const formatted = rawData.map((d: any) => {
                // FIX: Force the date to Noon to prevent Timezone rollback (Oct 31 vs Nov 1)
                // d.month is likely "2025-11" or "2025-11-01"
                const dateStr = d.month.length === 7 ? `${d.month}-01` : d.month; 
                const safeDate = new Date(`${dateStr}T12:00:00`);

                return {
                    name: safeDate.toLocaleDateString('en-US', { month: 'short' }),
                    Income: Number(d.income),
                    Expenses: Math.abs(Number(d.expense))
                };
            }).reverse();
            setData(formatted);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Flight Telemetry (6 Months)">
      {/* USE CONTROL LAYOUT */}
      <div className={`${styles.container} ${styles.controlLayout}`}>
        <p className={styles.legendText}>
            Trend Analysis: Ensure the <span style={{color: COLOR_INCOME, fontWeight: 'bold'}}>Green Area</span> stays above the <span style={{color: COLOR_EXPENSE, fontWeight: 'bold'}}>Red Area</span>.
        </p>

        {loading ? (
            <div className={styles.loadingContainer}>Loading Telemetry...</div>
        ) : (
            /* USE SINGLE CHART WRAPPER */
            <div className={styles.singleChartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_INCOME} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLOR_INCOME} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_EXPENSE} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLOR_EXPENSE} stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis tickFormatter={(val) => `$${val/1000}k`} width={40} tick={{fontSize: 12}} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="Income" stroke={COLOR_INCOME} fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="Expenses" stroke={COLOR_EXPENSE} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default TelemetryModal;