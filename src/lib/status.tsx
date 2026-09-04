const palette: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  GRADUATED: 'bg-sky-100 text-sky-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  INELIGIBLE: 'bg-rose-100 text-rose-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const labels: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  GRADUATED: 'Graduated',
  SUSPENDED: 'Suspended',
  INELIGIBLE: 'Ineligible',
  REJECTED: 'Rejected',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`chip ${palette[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {labels[status] ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export const statusOptions = Object.keys(labels);
