/* Replace file: src/lib/utils.ts */

/**
 * Formats a number into a standard financial string.
 * Positive: $1,234.50
 * Negative: ($1,234.50)
 * Zero: $0.00
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '$...'; // Loading or no data
  }

  const numberValue = Number(value);

  if (numberValue === 0) {
    return '$0.00';
  }

  const options: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  if (numberValue < 0) {
    return `($${Math.abs(numberValue).toLocaleString(undefined, options)})`;
  }

  return `$${numberValue.toLocaleString(undefined, options)}`;
};

// --- NEW FUNCTION TO ADD ---

/**
 * Formats a number (e.g., 0.075) into a percentage string (e.g., "7.5%").
 */
export const formatPercent = (value: number | undefined | null): string => {
  if (value === undefined || value === null) {
    return '...%'; // Loading or no data
  }

  const numberValue = Number(value);

  const options: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  };

  return numberValue.toLocaleString(undefined, options);
};