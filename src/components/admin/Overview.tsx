import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StatCard from './StatCard';

interface Stats {
  total_students: number;
  by_status: Record<string, number>;
  eligible_voters: number;
  no_password_yet: number;
  approved_whatsapp: number;
  total_admins: number;
}

export default function Overview({ onGoto }: { onGoto: (tab: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/api/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!stats) return <p className="text-slate-400">Loading overview…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Registered students" value={stats.total_students} tone="purple" hint="All time (graduates kept)" />
        <StatCard label="Active members" value={stats.by_status.ACTIVE ?? 0} tone="green" hint="Eligible to vote" />
        <StatCard label="No password yet" value={stats.no_password_yet} tone="amber" hint="Needs a valid phone to get a temporary password" />
        <StatCard label="Approved WhatsApp" value={stats.approved_whatsapp} tone="blue" hint="Numbers on the union list" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Eligible voters" value={stats.eligible_voters} tone="green" hint="ACTIVE status" />
        <StatCard label="Pending" value={stats.by_status.PENDING_VERIFICATION ?? 0} tone="amber" hint="Awaiting verification" />
        <StatCard label="Graduated" value={stats.by_status.GRADUATED ?? 0} tone="blue" hint="Kept for history" />
        <StatCard label="Suspended" value={stats.by_status.SUSPENDED ?? 0} tone="rose" hint="Cannot vote" />
        <StatCard label="Ineligible" value={stats.by_status.INELIGIBLE ?? 0} tone="rose" hint="Cannot vote" />
        <StatCard label="Rejected" value={stats.by_status.REJECTED ?? 0} tone="rose" hint="Applications" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-md btn-primary" onClick={() => onGoto('students')}>Manage students</button>
            <button className="btn btn-md btn-outline" onClick={() => onGoto('import')}>Import from CSV</button>
            <button className="btn btn-md btn-outline" onClick={() => onGoto('whatsapp')}>WhatsApp list</button>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">Membership tip</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Every student signs in with their <strong>matric number</strong> and, the first time, their{' '}
            <strong>phone number</strong> as the temporary password. The app then asks them to create their own password.
            Forgot passwords are fixed in the <em>Students</em> tab with <em>Reset to phone</em> — no invite links needed.
          </p>
        </div>
      </div>
    </div>
  );
}
