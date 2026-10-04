/**
 * Format standard number into Indian Rupee currency string
 */
export const formatCurrency = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format percentage with explicit + or - sign
 */
export const formatPercent = (percent: number, showSign: boolean = true): string => {
  if (isNaN(percent) || percent === null || percent === undefined) return '0.00%';
  const formatted = Math.abs(percent).toFixed(2);
  if (percent > 0) {
    return showSign ? `+${formatted}%` : `${formatted}%`;
  } else if (percent < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
};

/**
 * Format ISO string timestamp to clean relative/time string
 */
export const formatTime = (isoString?: string): string => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'N/A';
  }
};
