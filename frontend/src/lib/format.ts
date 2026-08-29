// Indian currency + date-age formatting. Compact form (₹81.0L / ₹4.7Cr) is for dashboards, cards, and
// tables; exact grouped rupees (formatINR / formatINRPlain) is for documents and small figures — never
// mix the two on the same screen. See .ai/FE/features/design-system.md.

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = n % 10;
  return ones ? `${tens} ${ONES[ones]}` : tens;
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigitWords(rest));
  return parts.join(' ');
}

/** Indian 2-2-3 grouping (crore/lakh/thousand/hundred), integers only — caller rounds first. */
function numberToIndianWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  const rest = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(' ');
}

/** Exact grouped rupees with the ₹ symbol — documents, line items, small dashboard deltas. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

/** Bare grouped number, no currency symbol — e.g. document line-item cells. */
export function formatINRPlain(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

/** Compact form for dashboards/cards/tables: ₹94,200 below a lakh, ₹81.0L / ₹4.7Cr above. */
export function formatCompactINR(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  return `${sign}${formatINR(abs)}`;
}

/** "Rupees ... Only" for a printed document footer. */
export function amountInWords(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  return `Rupees ${numberToIndianWords(rounded)} Only`;
}

/** How long since `dateStr`, in the compact age vocabulary the design uses everywhere ("3d", "today"). */
export function formatAgeDays(dateStr?: string): string {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'today';
  return `${days}d`;
}

/**
 * Days behind (positive) or ahead (negative) of schedule, from actual vs. time-expected progress.
 * Needs startDate, endDate, AND progressPercent — missing any of the three returns null, which
 * callers must render as "—", never 0 (a project with no progress data is not "on schedule").
 */
export function daysBehind(project: { startDate?: string; endDate?: string; progressPercent?: number }): number | null {
  const { startDate, endDate, progressPercent } = project;
  if (!startDate || !endDate || progressPercent == null) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const totalDurationMs = end - start;
  if (!(totalDurationMs > 0)) return null;
  const elapsedMs = Date.now() - start;
  const expectedProgress = Math.min(1, Math.max(0, elapsedMs / totalDurationMs)) * 100;
  const totalDurationDays = totalDurationMs / 86_400_000;
  return Math.round(((expectedProgress - progressPercent) / 100) * totalDurationDays);
}
