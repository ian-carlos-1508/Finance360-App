import { useState, useEffect, useRef } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { FaPrint } from 'react-icons/fa';
import { type Account } from '../Accounts/AddAccountForm';
import { IoCheckmarkCircle, IoChevronDown } from 'react-icons/io5';

// --- Type Definitions ---
type StatementLine = {
    category_type: 'Income' | 'Expense';
    category_name: string;
    total_amount: number;
};

type SummaryData = {
    total_income: number;
    total_expenses: number;
    net_income: number;
    income_lines: StatementLine[];
    expense_lines: StatementLine[];
};

// --- Custom Multi-Select Dropdown Component ---
type CustomMultiSelectProps = {
    options: { id: string; name: string }[];
    selected: string[];
    onSelect: (newSelection: string[]) => void;
    label: string;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
};

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
    options, selected, onSelect, label, isOpen, setIsOpen, dropdownRef
}) => {
    const allValue = 'all';
    const isAllSelected = selected.includes(allValue);

    const handleToggle = (id: string) => {
        if (id === allValue) {
            onSelect(isAllSelected ? [] : [allValue]);
        } else {
            const currentSelection = selected.filter(s => s !== allValue);
            if (currentSelection.includes(id)) {
                onSelect(currentSelection.filter(item => item !== id));
            } else {
                onSelect([...currentSelection, id]);
            }
        }
    };

    const getDisplayValue = () => {
        if (isAllSelected) return `All ${label}`;
        if (selected.length === 0) return `No ${label} selected`;
        if (selected.length === 1) {
            const selectedOption = options.find(opt => opt.id === selected[0]);
            return selectedOption ? selectedOption.name : '1 selected';
        }
        return `${selected.length} ${label} selected`;
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '200px' }}>
            <button
                className={styles.input}
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    textAlign: 'left'
                }}
            >
                <span>{getDisplayValue()}</span>
                <IoChevronDown style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            
            {isOpen && (
                <div 
                    className={styles.card} 
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        left: 0,
                        width: '100%',
                        zIndex: 10,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.5rem',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                >
                    <div 
                        key={allValue}
                        onClick={() => handleToggle(allValue)}
                        className={styles.dropdownItem}
                        style={{
                            display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem',
                            fontSize: '0.8rem', fontWeight: isAllSelected ? 600 : 400,
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        <IoCheckmarkCircle style={{ color: isAllSelected ? '#3b82f6' : '#e5e7eb', marginRight: '0.5rem' }} />
                        **All {label}**
                    </div>
                    {options.map((option) => {
                        const isSelected = selected.includes(option.id);
                        return (
                            <div 
                                key={option.id}
                                onClick={() => handleToggle(option.id)}
                                className={styles.dropdownItem}
                                style={{
                                    display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', 
                                    fontSize: '0.8rem', opacity: isAllSelected ? 0.5 : 1,
                                    borderRadius: '4px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                <IoCheckmarkCircle style={{ color: isSelected ? '#3b82f6' : '#e5e7eb', marginRight: '0.5rem' }} />
                                {option.name}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
// --- End Custom Multi-Select Dropdown Component ---


function IncomeStatement() {
    const today = new Date();
    // Default to This Month
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]; // End of current month

    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [startDate, setStartDate] = useState(defaultStart);
    const [endDate, setEndDate] = useState(defaultEnd);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- State for account filter ---
    const [accountList, setAccountList] = useState<Account[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['all']);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

    // --- Hook for click-outside ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
                setIsAccountOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // --- Fetch all accounts ---
    useEffect(() => {
        const fetchAccounts = async () => {
            const { data } = await supabase.from('accounts').select('account_id, account_name, type');
            if (data) {
                setAccountList(data as Account[]);
            }
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        const fetchIncomeStatement = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError('');

            const { data, error: rpcError } = await supabase.rpc('get_income_statement', {
                p_start_date: startDate,
                p_end_date: endDate,
                p_account_ids: selectedAccounts.includes('all') ? null : selectedAccounts
            });

            if (rpcError) {
                setError(`Error fetching income statement: ${rpcError.message}`);
                setSummaryData(null);
            } else if (data) {
                const income_lines = data.filter((d: StatementLine) => d.category_type === 'Income');
                const expense_lines = data.filter((d: StatementLine) => d.category_type === 'Expense');

                const total_income = income_lines.reduce((sum: number, item: StatementLine) => sum + item.total_amount, 0);
                const total_expenses = expense_lines.reduce((sum: number, item: StatementLine) => sum + item.total_amount, 0);
                
                setSummaryData({
                    total_income,
                    total_expenses,
                    net_income: total_income - total_expenses,
                    income_lines,
                    expense_lines,
                });
            } else {
                setSummaryData(null); // No data
            }
            setLoading(false);
        };
        fetchIncomeStatement();
    }, [startDate, endDate, selectedAccounts]); // Re-run when accounts change

    // Handle print
    const handlePrint = () => {
        window.print();
    };
    
    const formattedStartDate = new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { dateStyle: 'long' });
    const formattedEndDate = new Date(endDate + 'T12:00:00').toLocaleDateString('en-US', { dateStyle: 'long' });

    return (
        <div>
            {/* --- Filtros (se ocultarán al imprimir) --- */}
            <div className={`${styles.filterWrapper} no-print`} style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className={styles.label}>Accounts:</label>
                    <CustomMultiSelect
                        options={accountList.map(acc => ({ id: acc.account_id, name: acc.account_name }))}
                        selected={selectedAccounts}
                        onSelect={setSelectedAccounts}
                        label="Accounts"
                        isOpen={isAccountOpen}
                        setIsOpen={setIsAccountOpen}
                        dropdownRef={accountRef}
                    />
                    <label className={styles.label}>Start Date:</label>
                    <input 
                        type="date"
                        className={styles.input} 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{width: '180px'}}
                    />
                    <label className={styles.label}>End Date:</label>
                    <input 
                        type="date"
                        className={styles.input} 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{width: '180px'}}
                    />
                </div>
                <button className={styles.addButton} onClick={handlePrint} style={{backgroundColor: '#6b7280', alignSelf: 'flex-start'}}>
                    <FaPrint /> Print / Save PDF
                </button>
            </div>
            
            {/* --- Contenido del Reporte (visible al imprimir) --- */}
            <h2 className={styles.cardTitle} style={{textAlign: 'center', fontSize: '1.2rem', borderBottom: 'none'}}>
                Income Statement
            </h2>
            <p style={{textAlign: 'center', marginTop: '-1.5rem', marginBottom: '2rem', fontSize: '0.9rem', color: '#6b7280'}}>
                From {formattedStartDate} to {formattedEndDate}
            </p>

            {loading && <p style={{textAlign: 'center', padding: '1rem'}}>Loading Statement...</p>}
            {error && <p className={styles.errorText} style={{textAlign: 'center', padding: '1rem'}}>Error: {error}</p>}

            {!loading && summaryData && (
                <div style={{maxWidth: '800px', margin: '0 auto'}}>
                    {/* --- Income/Revenue --- */}
                    <h3 className={styles.listTitle} style={{borderBottom: '2px solid #10b981', paddingBottom: '0.5rem'}}>Revenue</h3>
                    <table className={styles.table} style={{marginTop: '1rem'}}>
                        <tbody>
                            {summaryData.income_lines.map(item => (
                                <tr key={item.category_name}>
                                    <td style={{ fontSize: '0.8rem' }}>{item.category_name}</td>
                                    <td style={{textAlign: 'right', fontSize: '0.8rem'}}>{formatCurrency(item.total_amount)}</td>
                                </tr>
                            ))}
                            <tr style={{borderTop: '2px solid #111827', backgroundColor: '#f9fafb'}}>
                                <td style={{fontWeight: 700, fontSize: '0.8rem'}}>Total Revenue</td>
                                <td style={{textAlign: 'right', fontWeight: 700, fontSize: '0.8rem'}}>{formatCurrency(summaryData.total_income)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* --- Expenses --- */}
                    <h3 className={styles.listTitle} style={{borderBottom: '2px solid #ef4444', paddingBottom: '0.5rem', marginTop: '2rem'}}>Expenses</h3>
                    <table className={styles.table} style={{marginTop: '1rem'}}>
                        <tbody>
                            {summaryData.expense_lines.map(item => (
                                <tr key={item.category_name}>
                                    <td style={{ fontSize: '0.8rem' }}>{item.category_name}</td>
                                    <td style={{textAlign: 'right', fontSize: '0.8rem'}}>({formatCurrency(item.total_amount)})</td>
                                </tr>
                            ))}
                            <tr style={{borderTop: '2px solid #111827', backgroundColor: '#f9fafb'}}>
                                <td style={{fontWeight: 700, fontSize: '0.8rem'}}>Total Expenses</td>
                                <td style={{textAlign: 'right', fontWeight: 700, fontSize: '0.8rem'}}>({formatCurrency(summaryData.total_expenses)})</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* --- Net Income --- */}
                    <div className={styles.kpiSection} style={{gridTemplateColumns: '1fr', marginTop: '2rem'}}>
                        <div className={`${styles.kpiCard} ${summaryData.net_income >= 0 ? styles.green : styles.red}`}>
                            <h3 className={styles.kpiTitle}>Net Income</h3>
                            <p className={styles.kpiValue}>{formatCurrency(summaryData.net_income)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PIE DE PÁGINA SOLO PARA IMPRESIÓN --- */}
            <footer style={{marginTop: '3rem', textAlign: 'center'}} className={styles.printFooter}>
                Finance360 - Reporte Confidencial - {new Date().toLocaleDateString()}
            </footer>
        </div>
    );
}

export default IncomeStatement;