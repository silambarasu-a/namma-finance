/**
 * Money Display Component
 *
 * Safely renders currency values with proper formatting
 */

import Decimal from "decimal.js";

interface MoneyProps {
  amount: string | number | Decimal;
  currency?: string;
  className?: string;
  showSign?: boolean;
}

export function Money({
  amount,
  currency = "₹",
  className = "",
  showSign = false,
}: MoneyProps) {
  const value = new Decimal(amount);
  const isNegative = value.lt(0);
  const absValue = value.abs();

  const formatted = absValue.toFixed(2);

  // Add thousands separators (Indian numbering system)
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const display = parts.join(".");

  return (
    <span className={className}>
      {isNegative && "-"}
      {showSign && !isNegative && "+"}
      {currency}
      {display}
    </span>
  );
}

export default Money;
