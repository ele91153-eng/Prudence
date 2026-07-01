// Known acronyms that should always be fully uppercase
const ACRONYMS = new Set([
  'SAT', 'ACT', 'GRE', 'GMAT', 'LSAT', 'MCAT', 'AP', 'IB', 'GPA',
  'SAT1', 'SAT2', 'PSAT', 'TOEFL', 'IELTS', 'MBA', 'MD', 'JD', 'PhD', 'RN',
  'USA', 'UK', 'US', 'AI', 'ML', 'CV', 'PR', 'HR', 'IT', 'UI', 'UX',
  'CEO', 'CTO', 'CFO', 'PM', 'B2B', 'B2C', 'SaaS',
  '5K', '10K', 'HM', 'IM',  // running
]);

// Small words that stay lowercase unless first/last word
const MINOR = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'it', 'its', 'vs', 'via']);

export function formatGoalTitle(title) {
  if (!title) return '';

  const words = title.trim().split(/\s+/);

  return words.map((word, i) => {
    const upper = word.toUpperCase();
    const lower = word.toLowerCase();

    // Preserve numbers and things like "1600", "2400", "800"
    if (/^\d/.test(word)) return word;

    // Known acronym
    if (ACRONYMS.has(upper)) return upper;

    // Minor words stay lowercase unless first or last
    if (MINOR.has(lower) && i !== 0 && i !== words.length - 1) return lower;

    // Title-case: capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}
