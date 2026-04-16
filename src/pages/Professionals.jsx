import { useState, useCallback } from 'react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useProfessionals,
  useProfessionalById,
  useSettleProfessional,
  useProfessionalPayouts,
  useMESettlementPreview,
  useMESocietyDescribe,
  useSettleMESociety,
  useVendorPanel,
  useSettleVendorOrder,
  useTrainerSettlementPreview,
} from '@/hooks/useAdmin';
import { Loader2, X, ChevronDown, ChevronRight, Wallet, Package, ShoppingCart, FileText, IdCard, FileDigit, UserCircle, FileCheck } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inr(val) {
  return `₹${Number(val ?? 0).toLocaleString('en-IN')}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}


function formatKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}


const COMMISSION_STATUS_COLORS = {
  on_hold: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  requested: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
};

const SETTLEMENT_TYPE_LABELS = {
  group_coaching_society: 'Group Coaching (Society)',
  group_coaching_school: 'Group Coaching (School)',
  individual_coaching: 'Individual Coaching',
  personal_tutor: 'Personal Tutor',
};

// ─── Session group collapse ────────────────────────────────────────────────────

// item shape from GET /professionals/:id/settlement-preview
function AssignmentCard({ professionalId, item, onSettled }) {
  const settle = useSettleProfessional();
  const [open, setOpen] = useState(false);
  const isBatch = !!item.batch_info;
  const isIndividual = item.assignment_type === 'individual_coaching' || item.assignment_type === 'personal_tutor';
  const pct = item.attendance_pct ?? 0;
  const earnsLabel = 'Settlement amount';

  // For batch: show society/school name. For IC/PT: show type label as title.
  const title = isBatch
    ? (item.batch_info?.entity_name ?? item.batch_info?.batch_name ?? item.entity_name ?? 'Settlement Row')
    : (SETTLEMENT_TYPE_LABELS[item.assignment_type] ?? item.assignment_type);

  const subtitle = isBatch
    ? [item.activity_name, item.professional_name].filter(Boolean).join(' | ')
    : [item.activity_name, item.professional_name].filter(Boolean).join(' | ');

  const cycleLabel = item.session_cycle
    ?? (item.window_start && item.window_end
      ? `${fmtDate(item.window_start)} - ${fmtDate(item.window_end)}`
      : '—');

  // Parse time strings like "1970-01-01T01:30:00.000Z" → "07:30"
  const fmtTime = (t) => {
    if (!t) return null;
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch { return t?.slice(0, 5) ?? null; }
  };

  async function handleSettle(e) {
    e.stopPropagation();
    try {
      await settle.mutateAsync({ professionalId, data: { assignment_ids: [item.assignment_id] } });
      toast.success('Settlement confirmed');
      onSettled?.();
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Settlement failed';
      toast.error(msg);
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors disabled:opacity-50"
        onClick={() => setOpen((o) => !o)}
        disabled={settle.isPending}
      >
        {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium tabular-nums">{item.sessions_completed ?? 0} delivered sessions</p>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Attendance</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all bg-blue-600" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>

          <div className="rounded-lg border divide-y text-sm bg-background">
            {isBatch && item.batch_info && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Batch</span>
                <span className="text-right">
                  {item.batch_info.batch_name ?? '—'}
                  {(item.batch_info.start_time || item.batch_info.end_time)
                    ? ` · ${fmtTime(item.batch_info.start_time) ?? '--:--'} – ${fmtTime(item.batch_info.end_time) ?? '--:--'}`
                    : ''}
                </span>
              </div>
            )}
            {isBatch && item.activity_name && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Activity</span>
                <span>{item.activity_name}</span>
              </div>
            )}
            {isIndividual && item.activity_name && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Activity / Subject</span>
                <span>{item.activity_name}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Professional</span>
              <span>{item.professional_name ?? '—'}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Settlement cycle</span>
              <span>{cycleLabel}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Delivered sessions</span>
              <span className="font-medium">{item.sessions_completed ?? 0}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Upcoming sessions</span>
              <span className="font-medium">{item.upcoming_sessions ?? 0}</span>
            </div>
            <div className="flex justify-between px-3 py-2 text-red-600">
              <span>Absent sessions</span>
              <span className="font-medium">{item.absent_sessions ?? 0}</span>
            </div>
            <div className="flex justify-between px-3 py-2 bg-muted/30">
              <span className="font-semibold">{earnsLabel}</span>
              <span className="font-semibold text-green-700">{inr(item.trainer_earns)}</span>
            </div>
          </div>

          {(item.students ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {isIndividual ? `Students with sessions this cycle (${item.students.length})` : `Students (${item.students.length})`}
              </p>
              <div className="rounded-lg border divide-y text-sm bg-background">
                {item.students.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-medium text-xs">{s.name}</p>
                      {s.detail && <p className="text-[11px] text-muted-foreground">{s.detail}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{s.mobile ?? '?'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isIndividual && (item.students ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No sessions recorded for any student in this cycle yet.</p>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" className="h-8" disabled={settle.isPending} onClick={handleSettle}>
              {settle.isPending ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
              Settle Amount
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SocietyCard({ professionalId, society }) {
  const settle = useSettleMESociety();
  const [open, setOpen] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(false);
  const belowThreshold = society.student_count < 20;

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{society.society_name}</p>
          <p className="text-xs text-muted-foreground">{society.activity_count} Activities · {society.student_count} Students</p>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs"
            onClick={() => setDescribeOpen(true)}
          >
            Describe Settlement
          </Button>
          <Button
            size="sm"
            className="h-8 shrink-0"
            disabled={settle.isPending || belowThreshold}
            title={belowThreshold ? `Minimum 20 students required (${society.student_count}/20)` : undefined}
            onClick={async () => {
              try {
                await settle.mutateAsync({ professionalId, societyId: society.society_id });
                toast.success(`Settlement moved to pending for ${society.society_name}`);
              } catch (err) {
                const errKey = err?.response?.data?.error ?? '';
                if (errKey.startsWith('ALREADY_SETTLED')) {
                  toast.error('Already settled');
                } else if (errKey.startsWith('THRESHOLD_NOT_MET')) {
                  const match = errKey.match(/(\d+) of (\d+)/);
                  toast.error(match ? `${match[1]}/${match[2]} students enrolled — cannot settle yet` : 'Threshold not met');
                } else {
                  toast.error(err?.response?.data?.message ?? 'Settlement failed');
                }
              }
            }}
          >
            {settle.isPending ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
            Settle Amount
          </Button>
        </div>
      </button>

      {/* Describe Settlement modal */}
      {describeOpen && (
        <DescribeSettlementModal
          professionalId={professionalId}
          societyId={society.society_id}
          societyName={society.society_name}
          onClose={() => setDescribeOpen(false)}
        />
      )}

      {open && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <div className="space-y-1">
            {(society.activities ?? []).map((actName, i) => (
              <div key={i} className="text-xs text-muted-foreground px-1">· {actName}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DescribeSettlementModal({ professionalId, societyId, societyName, onClose }) {
  const { data, isLoading } = useMESocietyDescribe(professionalId, societyId);
  const desc = data?.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h4 className="font-bold">Describe Settlement</h4>
            <p className="text-xs text-muted-foreground">{societyName} · Detailed Student Breakdown</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Student</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-center">Months</TableHead>
                  <TableHead className="text-right">Upfront Fee</TableHead>
                  <TableHead className="text-right text-indigo-600 font-bold">ME Earns ({desc?.commission_rate ?? 5}%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(desc?.students ?? []).map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-xs">{s.student_name}</TableCell>
                    <TableCell className="text-xs">{s.activity}</TableCell>
                    <TableCell className="text-center font-medium tabular-nums text-xs">{s.term_months}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{inr(s.upfront_fee)}</TableCell>
                    <TableCell className="text-right font-bold text-indigo-600 tabular-nums text-xs">
                      {inr(s.me_earns)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="p-4 border-t bg-muted/10 flex justify-between items-center">
          <div className="text-sm font-semibold">
            Total Settlement: <span className="text-indigo-600 ml-1">{inr(desc?.total_settlement ?? 0)}</span>
          </div>
          <Button onClick={onClose}>Close Breakdown</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Vendor Overview ──────────────────────────────────────────────────────────

// order shape from GET /vendor-panel:
// { order_id, product_name, buyer_name, order_date, order_status, base_price, transport,
//   profit_margin, profit_share_90, settlement, commission_id, commission_status }
function VendorOrderCard({ professionalId, order }) {
  const settle = useSettleVendorOrder();
  const alreadySettled = order.commission_status === 'approved' || order.commission_status === 'paid';

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3 shadow-sm hover:border-indigo-200 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 font-sans">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">Order #{order.order_id}</span>
            <Badge variant="outline" className="text-[10px] capitalize h-4 font-normal">{order.order_status?.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="font-semibold text-sm truncate text-foreground">{order.product_name}</p>
          <p className="text-xs text-muted-foreground">Buyer: {order.buyer_name} · {fmtDate(order.order_date)}</p>
        </div>
        <Button
          size="sm"
          className="h-8 shrink-0 shadow-none border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          variant="outline"
          disabled={settle.isPending || alreadySettled}
          onClick={async () => {
            try {
              await settle.mutateAsync({ professionalId, orderId: order.order_id });
              toast.success(`Order #${order.order_id} settlement moved to pending`);
            } catch (err) {
              const errKey = err?.response?.data?.error ?? '';
              if (errKey === 'ALREADY_SETTLED') toast.error('Already settled');
              else toast.error(err?.response?.data?.message ?? 'Settlement failed');
            }
          }}
        >
          {settle.isPending ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
          {alreadySettled ? 'Settled' : 'Settle Amount'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-3 border-t text-xs">
        <div className="space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Base Price:</span>
            <span className="text-foreground font-medium">{inr(order.base_price)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Transport:</span>
            <span className="text-foreground font-medium">{inr(order.transport)}</span>
          </div>
        </div>
        <div className="space-y-1.5 pl-4 border-l">
          <div className="flex justify-between text-muted-foreground">
            <span>Profit Share (90%):</span>
            <span className="text-indigo-600 font-medium">{inr(order.profit_share_90)}</span>
          </div>
          <div className="flex justify-between font-bold text-foreground border-t border-dashed pt-1.5 mt-1.5">
            <span>Settlement:</span>
            <span className="text-indigo-600">{inr(order.settlement)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SOURCE_CHIP_LABELS = {
  group_coaching_society: 'group coaching society',
  individual_coaching: 'individual coaching',
  personal_tutor: 'personal tutor',
  group_coaching_school: 'group coaching school',
  kit_order: 'kit order',
};

// ─── Payouts tab — uses new /payouts endpoint ─────────────────────────────────

function PayoutsTab({ professionalId }) {
  const { data, isLoading } = useProfessionalPayouts(professionalId);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;

  const payouts = data?.data ?? [];
  const pendingPayout = data?.pending_payout ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/20">
        <Wallet className="size-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">Pending payout</p>
          <p className="font-semibold text-lg">{inr(pendingPayout)}</p>
        </div>
      </div>

      {payouts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No payout records yet.</p>
      )}

      {payouts.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Breakup</th>
                <th className="px-3 py-2 text-right">Earning</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{c.serial ?? c.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {SOURCE_CHIP_LABELS[c.source_type] ?? c.source_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px]">
                    {c.description ?? '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                    {inr(c.base_amount)} × {c.commission_rate}%
                  </td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-right text-green-700">
                    {inr(c.commission_amount)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMMISSION_STATUS_COLORS[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Professional detail drawer ───────────────────────────────────────────────

function SessionsSettleTab({ professionalId, profType }) {
  const isME = profType === 'marketing_executive';
  const isVendor = profType === 'vendor';

  // Trainer / Teacher
  const { data: ssData, isLoading: ssLoading } = useTrainerSettlementPreview(
    (!isME && !isVendor) ? professionalId : null
  );
  // ME
  const { data: meData, isLoading: meLoading } = useMESettlementPreview(isME ? professionalId : null);
  // Vendor
  const { data: vendorData, isLoading: vendorLoading } = useVendorPanel(isVendor ? professionalId : null);

  const label = profType === 'teacher' ? 'Teacher' : profType === 'marketing_executive' ? 'Marketing Executive' : profType === 'vendor' ? 'Vendor' : 'Trainer';

  // Trainer / Teacher
  if (!isME && !isVendor) {
    if (ssLoading) return <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
    const items = ssData?.data ?? [];
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">No settlement rows found for this {label.toLowerCase()}.</p>;
    return (
      <div className="p-4 space-y-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Settlement is based on completed sessions delivered in this cycle. A batch or student may appear in multiple settlement rows if sessions were reassigned.
          </p>
        </div>
        {items.map((item) => (
          <AssignmentCard key={item.assignment_id} professionalId={professionalId} item={item} profType={profType} />
        ))}
      </div>
    );
  }

  // ME
  if (isME) {
    if (meLoading) return <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
    const societies = meData?.data ?? [];
    if (societies.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">No societies registered yet.</p>;
    return (
      <div className="p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            All societies brought in by this executive. Settle is enabled when ≥20 students are enrolled.
          </p>
        </div>
        <div className="space-y-2">
          {societies.map((s) => <SocietyCard key={s.society_id} professionalId={professionalId} society={s} />)}
        </div>
      </div>
    );
  }

  // Vendor
  if (isVendor) {
    if (vendorLoading) return <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
    const products = vendorData?.data?.products ?? [];
    const orders = vendorData?.data?.orders ?? [];
    return (
      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listed Products ({products.length})</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="rounded-lg border p-3 bg-background">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{p.sports_category}</p>
                <p className="font-semibold text-xs py-1 line-clamp-1">{p.product_name}</p>
                <p className="text-indigo-600 font-bold text-xs">{inr(p.selling_price)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Orders ({orders.length})</p>
          </div>
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No orders received yet.</p>}
          <div className="grid grid-cols-1 gap-3">
            {orders.map((o) => <VendorOrderCard key={o.order_id} professionalId={professionalId} order={o} />)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

const ICON_MAP = {
  'Photo': UserCircle,
  'PAN Card': IdCard,
  'Aadhaar Card': FileDigit,
  'D.Ed Certificate': FileText,
  'B.Ed Certificate': FileText,
  'Highest Qualification': FileText,
  'Agreement File': FileCheck,
  'GST Certificate': FileText,
  'Other Documents': FileText,
};

function DocumentItem({ label, url }) {
  const [loading, setLoading] = useState(false);
  const Icon = ICON_MAP[label] ?? FileText;

  const handleOpen = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchDocumentBlob } = await import('@/api/admin');
      const blob = await fetchDocumentBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener');
      // revoke after a short delay to allow the tab to load
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      console.error('Document proxy error — status:', err?.response?.status, 'data:', err?.response?.data ?? err?.message ?? err);
      toast.error(`Failed to open document: ${err?.response?.data?.error ?? err?.message ?? 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/5 group hover:border-indigo-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded bg-muted/20 text-muted-foreground group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
          <Icon className="size-4" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
        onClick={handleOpen}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-3 animate-spin" /> : 'View Document'}
      </Button>
    </div>
  );
}

function ProfileTab({ record, profType, documents, docsLoading }) {
  const config = TYPE_CONFIG[profType] ?? { detailKeys: [] };
  const details = record.details ?? {};

  return (
    <div className="p-4 space-y-6">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact Information</p>
        <div className="rounded-lg border divide-y text-sm bg-background">
          {[
            ['Full Name', record.user.full_name],
            ['Mobile', record.user.mobile],
            ['Email', record.user.email],
            ['Place', record.place],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2 px-3 py-2">
              <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
              <span className="font-medium break-all">{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </section>

      {config.detailKeys.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Professional Details</p>
          <div className="rounded-lg border divide-y text-sm bg-background">
            {config.detailKeys.map((key) => (
              <div key={key} className="flex gap-2 px-3 py-2">
                <span className="w-36 shrink-0 text-muted-foreground">{formatKey(key)}</span>
                <span className="break-all font-medium">{formatValue(details[key])}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(profType === 'trainer' || profType === 'teacher' || profType === 'marketing_executive' || profType === 'vendor') && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification Documents</p>
          {docsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          ) : documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <DocumentItem key={doc.label} label={doc.label} url={doc.url} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No documents uploaded.</p>
          )}
        </section>
      )}

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account & Referral</p>
        <div className="rounded-lg border divide-y text-sm bg-background">
          <div className="flex gap-2 px-3 py-2">
            <span className="w-36 shrink-0 text-muted-foreground">Professional ID</span>
            <span className="font-mono">#{record.professional_id}</span>
          </div>
          <div className="flex gap-2 px-3 py-2">
            <span className="w-36 shrink-0 text-muted-foreground">Wallet Balance</span>
            <span className="font-medium text-green-700">{inr(record.wallet_balance)}</span>
          </div>
          {record.referral_code && (
            <div className="flex gap-2 px-3 py-2">
              <span className="w-36 shrink-0 text-muted-foreground">Referral Code</span>
              <span className="font-mono bg-muted px-1.5 rounded">{record.referral_code}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfessionalDetailDrawer({ record, profType, onClose }) {
  const [tab, setTab] = useState('profile');
  const pid = record?.professional_id;
  const { data: profDetail, isLoading: profDetailLoading } = useProfessionalById(pid);
  const documents = profDetail?.data?.documents ?? null;

  const label = {
    teacher: 'Teacher',
    marketing_executive: 'Marketing Executive',
    vendor: 'Vendor',
  }[profType] ?? 'Trainer';

  const tab1Label = profType === 'vendor' ? 'Panel' : 'Sessions & Settle';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[680px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-base">{record.user.full_name}</h3>
            <p className="text-xs text-muted-foreground">{record.user.mobile} · {record.place ?? '—'} · {label}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Wallet: <span className="text-foreground">{inr(record.wallet_balance)}</span></span>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md"><X className="size-4" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            ['profile', 'Profile'],
            ['sessions', tab1Label],
            ['payouts', 'Payouts']
          ].map(([key, lbl]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'profile' && <ProfileTab record={record} profType={profType} documents={documents} docsLoading={profDetailLoading} />}
          {tab === 'sessions' && <SessionsSettleTab professionalId={pid} profType={profType} />}
          {tab === 'payouts' && <div className="p-4"><PayoutsTab professionalId={pid} /></div>}
        </div>
      </div>
    </div>
  );
}

// ─── Generic detail drawer (non-trainer) ──────────────────────────────────────

const TYPE_CONFIG = {
  trainer: {
    title: 'Trainers',
    detailKeys: ['category', 'player_level', 'specified_game', 'specified_skills', 'experience_details'],
  },
  teacher: {
    title: 'Teachers',
    detailKeys: ['subject', 'experience_details'],
  },
  marketing_executive: {
    title: 'Marketing Executives',
    detailKeys: ['dob', 'education_qualification', 'previous_experience'],
  },
  vendor: {
    title: 'Vendors',
    detailKeys: ['store_name', 'store_address', 'store_location'],
  },
};

function GenericDetailDrawer({ record, profType, onClose }) {
  if (!record) return null;
  const config = TYPE_CONFIG[profType] ?? { detailKeys: [] };
  const details = record.details ?? {};

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[400px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{record.user.full_name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
            <div className="rounded-lg border divide-y text-sm">
              {[['Full Name', record.user.full_name], ['Mobile', record.user.mobile], ['Email', record.user.email], ['Place', record.place]].map(([label, value]) => (
                <div key={label} className="flex gap-2 px-3 py-2">
                  <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
                  <span className="font-medium break-all">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </section>
          {config.detailKeys.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
              <div className="rounded-lg border divide-y text-sm">
                {config.detailKeys.map((key) => (
                  <div key={key} className="flex gap-2 px-3 py-2">
                    <span className="w-36 shrink-0 text-muted-foreground">{formatKey(key)}</span>
                    <span className="break-all">{formatValue(details[key])}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</p>
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex gap-2 px-3 py-2">
                <span className="w-36 shrink-0 text-muted-foreground">Professional ID</span>
                <span>#{record.professional_id}</span>
              </div>
              <div className="flex gap-2 px-3 py-2">
                <span className="w-36 shrink-0 text-muted-foreground">Wallet Balance</span>
                <span className="font-medium">₹{(record.wallet_balance ?? 0).toLocaleString('en-IN')}</span>
              </div>
              {record.referral_code && (
                <div className="flex gap-2 px-3 py-2">
                  <span className="w-36 shrink-0 text-muted-foreground">Referral Code</span>
                  <span className="font-mono">{record.referral_code}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

function ProfessionalsTable({ profType }) {
  const { data, isLoading, isError } = useProfessionals(profType);
  const [selectedRecord, setSelectedRecord] = useState(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin mr-2" /> Loading…</div>;
  }
  if (isError) {
    return <div className="py-16 text-center text-sm text-destructive">Failed to load professionals.</div>;
  }

  const records = data?.data ?? [];
  if (records.length === 0) {
    return <div className="py-16 text-center text-sm text-muted-foreground">No approved professionals found.</div>;
  }

  const extraCol = {
    trainer: { label: 'Category', fn: (r) => r.details?.category ?? '—' },
    teacher: { label: 'Subject', fn: (r) => r.details?.subject ?? '—' },
    marketing_executive: { label: 'Referral Code', fn: (r) => r.referral_code ? <span className="font-mono text-xs">{r.referral_code}</span> : '—' },
    vendor: { label: 'Store', fn: (r) => r.details?.store_name ?? '—' },
  }[profType];

  const isSessionType = profType === 'trainer' || profType === 'teacher' || profType === 'marketing_executive' || profType === 'vendor';

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Place</TableHead>
              {extraCol && <TableHead>{extraCol.label}</TableHead>}
              <TableHead>Wallet</TableHead>
              <TableHead className="w-20 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((rec) => (
              <TableRow key={rec.professional_id} className={isSessionType ? 'cursor-pointer hover:bg-muted/40' : ''}>
                <TableCell className="tabular-nums text-muted-foreground">#{rec.professional_id}</TableCell>
                <TableCell>
                  {isSessionType ? (
                    <button
                      className="font-medium text-left hover:underline text-foreground"
                      onClick={() => setSelectedRecord(rec)}
                    >
                      {rec.user.full_name}
                    </button>
                  ) : (
                    <span className="font-medium">{rec.user.full_name}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{rec.user.mobile}</TableCell>
                <TableCell className="text-muted-foreground">{rec.place ?? '—'}</TableCell>
                {extraCol && <TableCell>{extraCol.fn(rec)}</TableCell>}
                <TableCell className="tabular-nums">₹{(rec.wallet_balance ?? 0).toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelectedRecord(rec)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedRecord && isSessionType && (
        <ProfessionalDetailDrawer record={selectedRecord} profType={profType} onClose={() => setSelectedRecord(null)} />
      )}
      {selectedRecord && !isSessionType && (
        <GenericDetailDrawer record={selectedRecord} profType={profType} onClose={() => setSelectedRecord(null)} />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Professionals({ type }) {
  const config = TYPE_CONFIG[type];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">{config?.title ?? 'Professionals'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {type === 'trainer' || type === 'teacher' || type === 'marketing_executive' || type === 'vendor'
            ? `Click a ${type?.replace('_', ' ')} name or View button to view their profile and performance breakdown.`
            : 'Approved professionals on the platform.'}
        </p>
      </div>
      <ProfessionalsTable profType={type} />
    </div>
  );
}
