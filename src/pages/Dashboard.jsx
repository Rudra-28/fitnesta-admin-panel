import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Building2, School, ClockAlert,
  BadgeIndianRupee, CalendarDays, LifeBuoy,
  ArrowRight, ChevronRight, Loader2
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import {
  usePending, useProfessionals, useSocieties, useSchools,
  useSupportTickets, useUnsettledCount, useBatches,
  useProfitStats,
} from '@/hooks/useAdmin';

import { ServiceTypeBadge } from '@/components/StatusBadge';

// ── helpers ──────────────────────────────────────────────────────────────────
function count(queryData, key = 'data') {
  const arr = queryData?.[key];
  return Array.isArray(arr) ? arr.length : 0;
}

function fmt(n) {
  return n === undefined || n === null ? '—' : String(n);
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, href, color, loading }) {
  const colorMap = {
    amber:  'bg-amber-50  text-amber-600  dark:bg-amber-950/40  dark:text-amber-400',
    blue:   'bg-blue-50   text-blue-600   dark:bg-blue-950/40   dark:text-blue-400',
    green:  'bg-green-50  text-green-600  dark:bg-green-950/40  dark:text-green-400',
    sky:    'bg-sky-50    text-sky-600    dark:bg-sky-950/40    dark:text-sky-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    rose:   'bg-rose-50   text-rose-600   dark:bg-rose-950/40   dark:text-rose-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
    teal:   'bg-teal-50   text-teal-600   dark:bg-teal-950/40   dark:text-teal-400',
  };

  const inner = (
    <div className="group rounded-xl border bg-card p-5 flex gap-4 items-start hover:shadow-md transition-shadow">
      <div className={`rounded-lg p-2.5 shrink-0 ${colorMap[color] ?? colorMap.blue}`}>
        <Icon className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">
          {loading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : fmt(value)}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {href && (
        <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
      )}
    </div>
  );

  return href ? <Link to={href}>{inner}</Link> : inner;
}

// ── Financial Stat card ────────────────────────────────────────────────────────
function FinancialCard({ label, value, sub, color, loading }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    blue:    'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    violet:  'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-900',
    orange:  'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900',
    zinc:    'bg-zinc-50 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  };

  return (
    <div className={`rounded-xl border p-5 pl-6 flex flex-col justify-center ${colorMap[color] ?? colorMap.zinc}`}>
      <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums tracking-tight">
        {loading ? <Loader2 className="size-5 animate-spin" /> : formatCurrency(value)}
      </p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

// ── Quick Action button ───────────────────────────────────────────────────────
function QuickAction({ label, href, icon: Icon, description }) {
  return (
    <Link
      to={href}
      className="flex items-start gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50 hover:shadow-sm transition-all group"
    >
      <Icon className="size-4 mt-0.5 text-muted-foreground group-hover:text-foreground shrink-0" />
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="size-3.5 ml-auto mt-0.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

// ── Recent Pending minilist ───────────────────────────────────────────────────
function RecentPending({ data, isLoading }) {
  const records = useMemo(() => (data?.data ?? []).slice(0, 6), [data]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Recent Pending Approvals</h2>
        <Link
          to="/pending"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : records.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          🎉 No pending approvals right now.
        </div>
      ) : (
        <div className="divide-y">
          {records.map((rec) => {
            const fd = rec.formData ?? {};
            const name = fd.full_name ?? fd.participant_name ?? '—';
            return (
              <div key={rec.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">{fd.mobile ?? '—'}</p>
                </div>
                <ServiceTypeBadge type={rec.serviceType} />
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(rec.submittedAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const pending      = usePending();
  const professionals = useProfessionals();
  const societies    = useSocieties();
  const schools      = useSchools();
  const tickets      = useSupportTickets({ status: 'open' });
  const unsettled    = useUnsettledCount();
  const batches      = useBatches({ status: 'active' });

  const pendingCount      = count(pending.data);
  const profCount         = count(professionals.data);
  const societyCount      = count(societies.data);
  const schoolCount       = count(schools.data);
  const ticketCount       = count(tickets.data);
  const batchCount        = count(batches.data);

  // unsettled count may return { data: { count: N } } or just a number
  const unsettledCount = (() => {
    const d = unsettled.data;
    if (!d) return '—';
    if (typeof d === 'number') return d;
    if (typeof d?.data === 'number') return d.data;
    if (typeof d?.data?.count === 'number') return d.data.count;
    return '—';
  })();

  const profit = useProfitStats();
  const pd = profit.data?.data;

  const profitTrainers = useMemo(() => {
    if (!pd?.by_status) return 0;
    let sum = 0;
    for (const statusObj of Object.values(pd.by_status)) {
      sum += statusObj?.by_professional_type?.trainer?.admin_share || 0;
    }
    return sum;
  }, [pd]);

  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="space-y-6">
      {/* ── Greeting ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{todayLabel()}</p>
        </div>
        {user?.scope && (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
            {user.scope.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* ── Primary stats ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Overview
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={ClockAlert}
            label="Pending Approvals"
            value={pendingCount}
            sub="Awaiting review"
            href="/pending"
            color="amber"
            loading={pending.isLoading}
          />
          <StatCard
            icon={UserCheck}
            label="Professionals"
            value={profCount}
            sub="Trainers · Teachers · MEs · Vendors"
            href="/professionals/trainers"
            color="blue"
            loading={professionals.isLoading}
          />
          <StatCard
            icon={Building2}
            label="Societies"
            value={societyCount}
            href="/societies"
            color="green"
            loading={societies.isLoading}
          />
          <StatCard
            icon={School}
            label="Schools"
            value={schoolCount}
            href="/schools"
            color="sky"
            loading={schools.isLoading}
          />
        </div>
      </div>

      {/* ── Financial overview ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Financial Overview (All Time)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <FinancialCard
            label="Total Profit"
            value={pd?.total_admin_profit}
            sub="Base amount minus commissions"
            color="emerald"
            loading={profit.isLoading}
          />
          <FinancialCard
            label="Realised Profit"
            value={pd?.realised_profit}
            sub="From fully paid settlements"
            color="blue"
            loading={profit.isLoading}
          />
          <FinancialCard
            label="Gross Revenue"
            value={pd?.gross_revenue}
            sub="Total payments collected"
            color="violet"
            loading={profit.isLoading}
          />
          <FinancialCard
            label="Paid to Professionals"
            value={pd?.total_commission_paid_out}
            sub="Total commissions cleared"
            color="zinc"
            loading={profit.isLoading}
          />
          <FinancialCard
            label="Profit from Trainers"
            value={profitTrainers}
            sub="Admin share from trainers"
            color="zinc"
            loading={profit.isLoading}
          />
          <FinancialCard
            label="Locked Profit"
            value={pd?.by_status?.on_hold?.admin_profit || 0}
            sub="On-hold ME commissions"
            color="orange"
            loading={profit.isLoading}
          />
        </div>
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={CalendarDays}
          label="Active Batches"
          value={batchCount}
          href="/batches/group-coaching"
          color="indigo"
          loading={batches.isLoading}
        />
        <StatCard
          icon={BadgeIndianRupee}
          label="Unsettled Payouts"
          value={unsettledCount}
          sub="Pending settlement"
          href="/commissions"
          color="rose"
          loading={unsettled.isLoading}
        />
        <StatCard
          icon={LifeBuoy}
          label="Open Tickets"
          value={ticketCount}
          href="/support-tickets"
          color="teal"
          loading={tickets.isLoading}
        />
      </div>

      {/* ── Bottom section: recent pending + quick actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent pending — 2/3 width */}
        <div className="md:col-span-2">
          <RecentPending data={pending.data} isLoading={pending.isLoading} />
        </div>

        {/* Quick actions — 1/3 width */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
            Quick Actions
          </p>
          <QuickAction
            icon={Users}
            label="Manage Professionals"
            href="/professionals/trainers"
            description="View trainers, teachers and MEs"
          />
          <QuickAction
            icon={CalendarDays}
            label="View Batches"
            href="/batches/group-coaching"
            description="Group coaching &amp; school batches"
          />
          <QuickAction
            icon={BadgeIndianRupee}
            label="Commissions"
            href="/commissions"
            description="Approve &amp; track payouts"
          />
          <QuickAction
            icon={LifeBuoy}
            label="Support Tickets"
            href="/support-tickets"
            description="Resolve open customer issues"
          />
          <QuickAction
            icon={School}
            label="Visiting Forms"
            href="/visiting-forms"
            description="Review field visit submissions"
          />
        </div>
      </div>
    </div>
  );
}
