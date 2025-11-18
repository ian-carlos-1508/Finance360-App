import { useState, useEffect, useRef } from 'react';
import styles from '../../pages/Settings/Settings.module.css';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';
import { FaPrint } from 'react-icons/fa';
import { type Account } from '../Accounts/AddAccountForm';
import {
  IoCheckmarkCircle,
  IoChevronDown,
  IoChevronBack,
  IoChevronForward,
} from 'react-icons/io5';

// --- Type Definitions ---
type LedgerRecord = {
  tx_date: string;
  tx_type: 'Income' | 'Expense' | 'Transfer';
  tx_description: string;
  tx_category: string | null;
  tx_subcategory: string | null;
  tx_account: string; // From account
  tx_to_account: string | null; // To account
  tx_amount: number;
};

// --- Custom Multi-Select Dropdown Component (No changes) ---
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
  options,
  selected,
  onSelect,
  label,
  isOpen,
  setIsOpen,
  dropdownRef,
}) => {
  const allValue = 'all';
  const isAllSelected = selected.includes(allValue);

  const handleToggle = (id: string) => {
    if (id === allValue) {
      onSelect(isAllSelected ? [] : [allValue]);
    } else {
      const currentSelection = selected.filter((s) => s !== allValue);
      if (currentSelection.includes(id)) {
        onSelect(currentSelection.filter((item) => item !== id));
      } else {
        onSelect([...currentSelection, id]);
      }
    }
  };

  const getDisplayValue = () => {
    if (isAllSelected) return `All ${label}`;
    if (selected.length === 0) return `No ${label} selected`;
    if (selected.length === 1) {
      const selectedOption = options.find((opt) => opt.id === selected[0]);
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
          textAlign: 'left',
        }}
      >
        <span>{getDisplayValue()}</span>
        <IoChevronDown
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
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
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          }}
        >
          <div
            key={allValue}
            onClick={() => handleToggle(allValue)}
            className={styles.dropdownItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: isAllSelected ? 600 : 400,
              borderRadius: '4px',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#f3f4f6')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <IoCheckmarkCircle
              style={{
                color: isAllSelected ? '#3b82f6' : '#e5e7eb',
                marginRight: '0.5rem',
              }}
            />
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
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  opacity: isAllSelected ? 0.5 : 1,
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#f3f4f6')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <IoCheckmarkCircle
                  style={{
                    color: isSelected ? '#3b82f6' : '#e5e7eb',
                    marginRight: '0.5rem',
                  }}
                />
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

// --- NEW: Pagination Component ---
type PaginationControlsProps = {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  // Don't show pagination if 1 or 0 pages
  if (totalPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    onPageChange(Math.max(currentPage - 1, 1));
  };

  const handleNext = () => {
    onPageChange(Math.min(currentPage + 1, totalPages));
  };

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className={`${styles.paginationContainer} no-print`}>
      <span className={styles.paginationInfo}>
        Showing{' '}
        <strong>
          {startEntry}-{endEntry}
        </strong>{' '}
        of <strong>{totalCount}</strong> entries
      </span>
      <div className={styles.paginationControls}>
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={styles.paginationButton}
        >
          <IoChevronBack />
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={styles.paginationButton}
        >
          Next
          <IoChevronForward />
        </button>
      </div>
    </div>
  );
};

// --- Componente Principal del Libro Mayor ---
const PAGE_SIZE = 25; // Define page size

function GeneralLedger() {
  const today = new Date();
  // Default to This Month
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]; // End of current month

  const [ledgerData, setLedgerData] = useState<LedgerRecord[]>([]);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- NEW Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // --- State for account filter ---
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['all']);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // --- Hook for click-outside ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
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
      const { data } = await supabase
        .from('accounts')
        .select('account_id, account_name, type');
      if (data) {
        setAccountList(data as Account[]);
      }
    };
    fetchAccounts();
  }, []);

  // --- NEW Effect: Reset page to 1 when filters change ---
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedAccounts]);

  // --- UPDATED Fetch Ledger Data (with Pagination) ---
  useEffect(() => {
    const fetchLedger = async () => {
      if (!startDate || !endDate) return;

      setLoading(true);
      setError('');

      // Base arguments for both RPC calls
      const rpc_args = {
        p_start_date: startDate,
        p_end_date: endDate,
        p_account_ids: selectedAccounts.includes('all')
          ? null
          : selectedAccounts,
      };

      try {
        let currentTotal = totalCount;

        // --- 1. Get total count (only if on page 1 or count is unknown) ---
        if (currentPage === 1 || totalCount === 0) {
          const { data: count, error: countError } = await supabase.rpc(
            'get_general_ledger_count',
            rpc_args
          );

          if (countError) throw countError;
          setTotalCount(count);
          currentTotal = count;
        }

        // --- 2. Get paginated data ---
        if (currentTotal > 0) {
          const offset = (currentPage - 1) * PAGE_SIZE;
          const { data, error: rpcError } = await supabase.rpc(
            'get_general_ledger',
            {
              ...rpc_args,
              p_limit: PAGE_SIZE,
              p_offset: offset,
            }
          );

          if (rpcError) throw rpcError;
          setLedgerData(data as LedgerRecord[]);
        } else {
          // If total is 0, just set data to empty array
          setLedgerData([]);
        }
      } catch (err: any) { // <--- FIX 1: Added {}
        console.error('Error fetching general ledger:', err);
        setError(`Error fetching general ledger: ${err.message}`);
        setLedgerData([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLedger();
  }, [startDate, endDate, selectedAccounts, currentPage]); // Add currentPage to dependency array

  const handlePrint = () => {
    window.print();
  };

  const formattedStartDate = new Date(startDate + 'T12:00:00').toLocaleDateString(
    'en-US',
    { dateStyle: 'long' }
  );
  const formattedEndDate = new Date(endDate + 'T12:00:00').toLocaleDateString(
    'en-US',
    { dateStyle: 'long' }
  );

  // Helper to format amount based on type
  const formatAmount = (record: LedgerRecord) => { // <--- FIX 2: Changed = to =>
    const amount = record.tx_amount;
    if (record.tx_type === 'Expense') {
      return <span style={{ color: '#ef4444' }}>({formatCurrency(amount)})</span>;
    }
    if (record.tx_type === 'Income') {
      return <span style={{ color: '#10b981' }}>{formatCurrency(amount)}</span>;
    }
    return <span style={{ color: '#6b7280' }}>{formatCurrency(amount)}</span>;
  };

  return (
    <div>
      {/* --- Filters --- */}
      <div
        className={`${styles.filterWrapper} no-print`}
        style={{
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label className={styles.label}>Accounts:</label>
          <CustomMultiSelect
            options={accountList.map((acc) => ({
              id: acc.account_id,
              name: acc.account_name,
            }))}
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
            style={{ width: '180px' }}
          />
          <label className={styles.label}>End Date:</label>
          <input
            type="date"
            className={styles.input}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: '180px' }}
          />
        </div>
        <button
          className={styles.addButton}
          onClick={handlePrint}
          style={{ backgroundColor: '#6b7280', alignSelf: 'flex-start' }}
        >
          <FaPrint /> Print / Save PDF
        </button>
      </div>

      <h2
        className={styles.cardTitle}
        style={{
          textAlign: 'center',
          fontSize: '1.2rem',
          borderBottom: 'none',
        }}
      >
        General Ledger
      </h2>
      <p
        style={{
          textAlign: 'center',
          marginTop: '-1.5rem',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          color: '#6b7280',
        }}
      >
        From {formattedStartDate} to {formattedEndDate}
      </p>

      {loading && (
        <p style={{ textAlign: 'center', padding: '1rem' }}>Loading Ledger...</p>
      )}
      {error && (
        <p
          className={styles.errorText}
          style={{ textAlign: 'center', padding: '1rem' }}
        >
          Error: {error}
        </p>
      )}

      {!loading && ledgerData.length === 0 && (
        <p style={{ textAlign: 'center', padding: '1rem' }}>
          No transactions found for the selected filters.
        </p>
      )}

      {!loading && ledgerData.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ fontSize: '0.7rem', fontWeight: 700 }}>Date</th>
                <th style={{ fontSize: '0.7rem', fontWeight: 700 }}>Category</th>
                <th style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Subcategory
                </th>
                <th style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                  Description
                </th>
                <th style={{ fontSize: '0.7rem', fontWeight: 700 }}>Account</th>
                <th
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textAlign: 'right',
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.map((tx: LedgerRecord, index: number) => (
                // Using a more unique key for React
                <tr key={`${tx.tx_date}-${tx.tx_amount}-${index}`}>
                  <td style={{ fontSize: '0.7rem' }}>{tx.tx_date}</td>
                  <td style={{ fontSize: '0.7rem' }}>
                    {tx.tx_category || '---'}
                  </td>
                  <td style={{ fontSize: '0.7rem' }}>
                    {tx.tx_subcategory || '---'}
                  </td>
                  <td style={{ fontSize: '0.7rem' }}>
                    {tx.tx_description ||
                      (tx.tx_type === 'Transfer' ? 'Transfer' : tx.tx_type)}
                  </td>
                  <td style={{ fontSize: '0.7rem' }}>
                    {tx.tx_type === 'Transfer'
                      ? `${tx.tx_account} → ${tx.tx_to_account}`
                      : tx.tx_account}
                  </td>
                  <td
                    style={{
                      fontSize: '0.7rem',
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {formatAmount(tx)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- NEW PAGINATION CONTROLS --- */}
      {/* This will only show if loading is false and there are entries to display */}
      {!loading && !error && totalCount > PAGE_SIZE && (
        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* --- Print Footer --- */}
      <footer
        style={{ marginTop: '3rem', textAlign: 'center' }}
        className={styles.printFooter}
      >
        Finance360 - Confidential Report - {new Date().toLocaleDateString()}
      </footer>
    </div>
  );
}

export default GeneralLedger;