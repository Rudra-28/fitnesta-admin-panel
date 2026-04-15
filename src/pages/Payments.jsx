import { useState } from 'react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePayments, usePayIns, usePayOuts, useMarkRefundProcessed, useApproveCommission, useMarkCommissionPaid } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────

function inr(val) {
  return `₹${Number(val ?? 0).toLocaleString('en-IN')}`;
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SERVICE_LABEL = {
  personal_tutor: 'Personal Tutor',
  individual_coaching: 'Individual Coaching',
  group_coaching: 'Group Coaching',
  school_student: 'School Student',
  kit_order: 'Kit Order',
};

const STATUS_BADGE = {
  captured: 'bg-green-100 text-green-800',
  refunded: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

const COMMISSION_STATUS_BADGE = {
  on_hold: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  requested: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
};

const REFUND_STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  processed: 'bg-green-100 text-green-800',
};

const PROF_TYPE_BADGE = {
  trainer: 'bg-blue-100 text-blue-800',
  teacher: 'bg-purple-100 text-purple-800',
  marketing_executive: 'bg-teal-100 text-teal-800',
  vendor: 'bg-orange-100 text-orange-800',
};

// ─── Select helper ───────────────────────────────────────────────────────────

function Sel({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-0.5">{label}</label>
      <select
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color = 'green' }) {
  const cls = {
    green: 'border-green-200 bg-green-50 text-green-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  }[color] ?? 'border-gray-200 bg-gray-50 text-gray-700';
  return (
    <div className={`inline-flex flex-col rounded-lg border px-4 py-2 text-sm ${cls}`}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="font-semibold text-base">{value}</span>
    </div>
  );
}

// ─── Tab 1: Raw Ledger ────────────────────────────────────────────────────────

function RawLedgerTab() {
  const [filters, setFilters] = useState({ service_type: '', status: '', from: '', to: '' });
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data, isLoading, isError } = usePayments(activeFilters);
  const records = data?.data ?? [];
  const total = records.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  function setF(k, v) { setFilters((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Sel label="Service Type" value={filters.service_type} onChange={(v) => setF('service_type', v)}>
          <option value="">All Types</option>
          <option value="personal_tutor">Personal Tutor</option>
          <option value="individual_coaching">Individual Coaching</option>
          <option value="group_coaching">Group Coaching</option>
          <option value="school_student">School Student</option>
        </Sel>
        <Sel label="Status" value={filters.status} onChange={(v) => setF('status', v)}>
          <option value="">All Statuses</option>
          <option value="captured">Captured</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </Sel>
        <div>
          <label className="text-xs font-medium block mb-0.5">From</label>
          <Input type="date" className="h-8 text-sm" value={filters.from} onChange={(e) => setF('from', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-0.5">To</label>
          <Input type="date" className="h-8 text-sm" value={filters.to} onChange={(e) => setF('to', e.target.value)} />
        </div>
      </div>

      {!isLoading && records.length > 0 && (
        <SummaryCard label={`Total (${records.length} records)`} value={inr(total)} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load payments.</p>
      ) : records.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No payments found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Razorpay Payment ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="tabular-nums text-muted-foreground">#{rec.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{rec.user?.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{rec.user?.mobile}</div>
                  </TableCell>
                  <TableCell className="text-sm">{SERVICE_LABEL[rec.service_type] ?? rec.service_type}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{inr(rec.amount)}</TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">{rec.term_months} mo</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[rec.status] ?? 'bg-gray-100 text-gray-700'}>{rec.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">{fmtDate(rec.captured_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{rec.razorpay_payment_id ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Pay-ins ───────────────────────────────────────────────────────────

function PayInsTab() {
  const [filters, setFilters] = useState({ service_type: '', from: '', to: '' });
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data, isLoading, isError } = usePayIns(activeFilters);
  const items = data?.items ?? [];

  function setF(k, v) { setFilters((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Sel label="Service Type" value={filters.service_type} onChange={(v) => setF('service_type', v)}>
          <option value="">All Types</option>
          <option value="personal_tutor">Personal Tutor</option>
          <option value="individual_coaching">Individual Coaching</option>
          <option value="group_coaching">Group Coaching</option>
          <option value="school_student">School Student</option>
          <option value="kit_order">Kit Order</option>
        </Sel>
        <div>
          <label className="text-xs font-medium block mb-0.5">From</label>
          <Input type="date" className="h-8 text-sm" value={filters.from} onChange={(e) => setF('from', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-0.5">To</label>
          <Input type="date" className="h-8 text-sm" value={filters.to} onChange={(e) => setF('to', e.target.value)} />
        </div>
      </div>

      {!isLoading && data && (
        <div className="flex gap-3 flex-wrap">
          <SummaryCard label={`Total (${data.count ?? items.length} records)`} value={inr(data.total)} color="green" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load pay-ins.</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No pay-ins found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Razorpay Payment ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="tabular-nums text-muted-foreground">#{item.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.user?.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{item.user?.mobile}</div>
                  </TableCell>
                  <TableCell className="text-sm">{SERVICE_LABEL[item.service_type] ?? item.service_type}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{inr(item.amount)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">{fmtDate(item.captured_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{item.razorpay_payment_id ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Pay-outs ──────────────────────────────────────────────────────────

function PayOutsTab() {
  const [filters, setFilters] = useState({ professional_type: '', commission_status: '', refund_status: '', from: '', to: '' });
  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
  const { data, isLoading, isError, refetch } = usePayOuts(activeFilters);
  const items = data?.items ?? [];

  const approveCommission = useApproveCommission();
  const markPaid = useMarkCommissionPaid();
  const markRefund = useMarkRefundProcessed();

  function setF(k, v) { setFilters((f) => ({ ...f, [k]: v })); }

  async function handleApprove(id) {
    try {
      await approveCommission.mutateAsync(id);
      refetch();
      toast.success('Commission approved');
    } catch {
      toast.error('Failed to approve commission');
    }
  }

  async function handleMarkPaid(id) {
    try {
      await markPaid.mutateAsync(id);
      refetch();
      toast.success('Marked as paid');
    } catch {
      toast.error('Failed to mark as paid');
    }
  }

  async function handleMarkRefund(id) {
    try {
      await markRefund.mutateAsync(id);
      toast.success('Refund marked as processed');
    } catch {
      toast.error('Failed to update refund status');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Sel label="Professional Type" value={filters.professional_type} onChange={(v) => setF('professional_type', v)}>
          <option value="">All Types</option>
          <option value="trainer">Trainer</option>
          <option value="teacher">Teacher</option>
          <option value="marketing_executive">Marketing Executive</option>
          <option value="vendor">Vendor</option>
        </Sel>
        <Sel label="Commission Status" value={filters.commission_status} onChange={(v) => setF('commission_status', v)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </Sel>
        <Sel label="Refund Status" value={filters.refund_status} onChange={(v) => setF('refund_status', v)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="processed">Processed</option>
        </Sel>
        <div>
          <label className="text-xs font-medium block mb-0.5">From</label>
          <Input type="date" className="h-8 text-sm" value={filters.from} onChange={(e) => setF('from', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-0.5">To</label>
          <Input type="date" className="h-8 text-sm" value={filters.to} onChange={(e) => setF('to', e.target.value)} />
        </div>
      </div>

      {!isLoading && data && (
        <div className="flex gap-3 flex-wrap">
          <SummaryCard label="Total Pay-outs" value={inr(data.total)} color="amber" />
          <SummaryCard label="Commissions" value={data.commission_count ?? 0} color="blue" />
          <SummaryCard label="Kit Refunds" value={data.refund_count ?? 0} color="amber" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load pay-outs.</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No pay-outs found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Recipient / User</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                if (item.type === 'commission') {
                  return (
                    <TableRow key={`c-${item.id}`}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-indigo-100 text-indigo-800 w-fit">Commission</Badge>
                          <Badge className={`${PROF_TYPE_BADGE[item.professional_type] ?? 'bg-gray-100 text-gray-700'} w-fit text-xs`}>
                            {item.professional_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{item.professional?.full_name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{item.professional?.mobile}</div>
                        <div className="text-xs text-muted-foreground">{item.source_type?.replace(/_/g, ' ')}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{inr(item.amount)}</TableCell>
                      <TableCell>
                        <Badge className={COMMISSION_STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-700'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{fmtDate(item.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {(item.status === 'on_hold' || item.status === 'pending') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleApprove(item.id)}
                              disabled={approveCommission.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          {item.status === 'approved' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleMarkPaid(item.id)}
                              disabled={markPaid.isPending}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                // kit_refund
                return (
                  <TableRow key={`r-${item.id}`}>
                    <TableCell>
                      <Badge className="bg-rose-100 text-rose-800 w-fit">Kit Refund</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{item.user?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{item.user?.mobile}</div>
                      <div className="text-xs text-muted-foreground">{item.product_name}</div>
                      {item.reason && <div className="text-xs text-muted-foreground italic">{item.reason}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{inr(item.amount)}</TableCell>
                    <TableCell>
                      <Badge className={REFUND_STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-700'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{fmtDate(item.created_at)}</TableCell>
                    <TableCell>
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleMarkRefund(item.id)}
                          disabled={markRefund.isPending}
                        >
                          Mark Processed
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Ledger', 'Pay-ins', 'Pay-outs'];

export default function Payments() {
  const [tab, setTab] = useState('Pay-ins');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Money in, money out, and raw Razorpay ledger</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ledger' && <RawLedgerTab />}
      {tab === 'Pay-ins' && <PayInsTab />}
      {tab === 'Pay-outs' && <PayOutsTab />}
    </div>
  );
}
