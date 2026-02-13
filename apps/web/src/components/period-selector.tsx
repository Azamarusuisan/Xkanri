'use client';

const PERIODS = [
  { key: '4weeks', label: '直近4週間', shortLabel: '4週間', days: 28 },
  { key: '3months', label: '直近3ヶ月', shortLabel: '3ヶ月', days: 90 },
  { key: '1year', label: '直近1年', shortLabel: '1年', days: 365 },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];

export function getPeriodDates(period: PeriodKey): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const p = PERIODS.find((p) => p.key === period)!;
  const from = new Date(now.getTime() - p.days * 86400000);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

export function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#dadce0] overflow-hidden shrink-0">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-medium transition-colors whitespace-nowrap ${
            value === p.key
              ? 'bg-[#1a73e8] text-white'
              : 'bg-white text-[#5f6368] hover:bg-[#f1f3f4]'
          } ${p.key !== '4weeks' ? 'border-l border-[#dadce0]' : ''}`}
        >
          <span className="hidden sm:inline">{p.label}</span>
          <span className="sm:hidden">{p.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}

export { PERIODS };
