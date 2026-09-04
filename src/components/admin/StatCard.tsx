interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'purple' | 'green' | 'amber' | 'blue' | 'rose';
}

const tones: Record<string, string> = {
  purple: 'bg-fuchsia-100 text-fuchsia-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-sky-100 text-sky-700',
  rose: 'bg-rose-100 text-rose-700',
};

export default function StatCard({ label, value, hint, tone = 'purple' }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex items-center rounded-xl px-2.5 py-1 text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
