import { useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useCommissionRules, useUpdateCommissionRule,
  useCommissions, useApproveCommission, useMarkCommissionPaid,
  useTravellingAllowances, useMarkTAPaid,
  useTrainerAssignments, useUpdateAssignmentSessionsCap, useDeactivateAssignment,
  useSettlementPreview, useConfirmSettlement, useUnsettledCount,
} from '@/hooks/useAdmin';
import { Loader2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRO_TYPE_LABEL = {
  trainer: 'Trainer',
  teacher: 'Teacher',
  marketing_executive: 'Marketing Executive',
  vendor: 'Vendor',
};

const SOURCE_TYPE_LABEL = {
  individual_coaching: 'Individual Coaching',
  group_coaching_society: 'Group Coaching (Society)',
  group_coaching_school: 'Group Coaching (School)',
  group_coaching_other: 'Group Coaching (Other)',
  personal_tutor: 'Personal Tutor',
  school_registration: 'School Registration',
  event_ticket: 'Event Ticket',
};

function inr(val) {
  return `₹${Number(val ?? 0).toLocaleString('en-IN')}`;
}

function EmptyState({ message }) {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">{message}</div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin mr-2" /> Loading…
    </div>
  );
}

// ─── Tab 1: Commission Rules ─────────────────────────────────────────────────

// These flat rules are counts, not currency amounts
const COUNT_RULE_KEYS = new Set([
  'me_min_live_activities',
  'trainer_group_society_min_students',
  'me_group_admission_min_students',
]);

function RuleRow({ rule, onSave, saving }) {
  const [value, setValue] = useState(String(Number(rule.value)));
  const isDirty = String(Number(value)) !== String(Number(rule.value));
  const isCount = COUNT_RULE_KEYS.has(rule.rule_key);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground max-w-xs">{rule.description}</TableCell>
      <TableCell>
        {rule.rule_type === 'percentage' ? (
          <Badge className="bg-green-100 text-green-700 border-0 dark:bg-green-900/30 dark:text-green-400">%</Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/30 dark:text-blue-400">₹</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <div className="relative w-28">
            {rule.rule_type === 'percentage' && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            )}
            {rule.rule_type === 'flat' && !isCount && (
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
            )}
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={cn(
                'h-7 text-sm tabular-nums',
                rule.rule_type === 'percentage' ? 'pr-6' : (!isCount ? 'pl-6' : '')
              )}
            />
          </div>
          <Button
            size="sm"
            disabled={!isDirty || saving}
            onClick={() => onSave(rule.rule_key, Number(value))}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CommissionRulesTab() {
  const { data, isLoading, isError } = useCommissionRules();
  const updateRule = useUpdateCommissionRule();
  const [savingKey, setSavingKey] = useState(null);

  const handleSave = (ruleKey, value) => {
    setSavingKey(ruleKey);
    updateRule.mutate(
      { ruleKey, value },
      {
        onSuccess: () => toast.success('Rule updated successfully'),
        onError: (err) => {
          const msg = err.response?.data?.message ?? 'Failed to update rule';
          toast.error(msg);
        },
        onSettled: () => setSavingKey(null),
      }
    );
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <EmptyState message="Failed to load commission rules." />;

  const rules = data?.data ?? [];
  const grouped = rules.reduce((acc, r) => {
    const key = r.professional_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const ORDER = ['trainer', 'teacher', 'marketing_executive'];

  return (
    <div className="space-y-6">
      {ORDER.filter((t) => grouped[t]).map((profType) => (
        <div key={profType}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {PRO_TYPE_LABEL[profType]}
          </h3>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="w-52">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped[profType].map((rule) => (
                  <RuleRow
                    key={rule.rule_key}
                    rule={rule}
                    saving={savingKey === rule.rule_key}
                    onSave={handleSave}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab 2: Commissions ──────────────────────────────────────────────────────

function CommissionsTab() {
  const [filters, setFilters] = useState({ status: '', professional_type: '' });
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );

  const { data, isLoading, isError } = useCommissions(activeFilters);
  const approve = useApproveCommission();
  const markPaid = useMarkCommissionPaid();

  const records = data?.data ?? [];
  const pendingTotal = records
    .filter((r) => r.status === 'on_hold' || r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.commission_amount ?? 0), 0);

  const handleApprove = (id) => {
    approve.mutate(id, {
      onSuccess: () => toast.success('Commission approved'),
      onError: (err) => {
        const code = err.response?.data?.error;
        if (code === 'COMMISSION_NOT_APPROVABLE') toast.error('Commission cannot be approved.');
        else toast.error(err.response?.data?.message ?? 'Failed to approve.');
      },
    });
  };

  const handleMarkPaid = (id) => {
    markPaid.mutate(id, {
      onSuccess: () => toast.success('Commission marked as paid'),
      onError: (err) => {
        const code = err.response?.data?.error;
        if (code === 'ALREADY_PAID') toast.error('Already marked as paid.');
        else if (code === 'COMMISSION_NOT_APPROVED') toast.error('Approve the commission first.');
        else toast.error(err.response?.data?.message ?? 'Failed to mark as paid.');
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.professional_type}
          onChange={(e) => setFilters((f) => ({ ...f, professional_type: e.target.value }))}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All Types</option>
          <option value="trainer">Trainer</option>
          <option value="teacher">Teacher</option>
          <option value="marketing_executive">Marketing Executive</option>
          <option value="vendor">Vendor</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All Statuses</option>
          <option value="on_hold">On Hold</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Pending total */}
      {!isLoading && records.length > 0 && pendingTotal > 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-900/20">
          <span className="text-amber-700 dark:text-amber-400">Total pending payout:</span>
          <span className="font-semibold text-amber-800 dark:text-amber-300">{inr(pendingTotal)}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState message="Failed to load commissions." />
      ) : records.length === 0 ? (
        <EmptyState message="No commissions found." />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Professional</TableHead>
                <TableHead>Settlement Row</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Absent</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="tabular-nums text-muted-foreground">#{rec.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {rec.professionals?.users?.full_name ?? `ID ${rec.professional_id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rec.professionals?.users?.mobile}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {PRO_TYPE_LABEL[rec.professional_type] ?? rec.professional_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {SOURCE_TYPE_LABEL[rec.source_type] ?? rec.source_type}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{inr(rec.base_amount)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {Number(rec.commission_rate)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {inr(rec.commission_amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rec.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(rec.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {(rec.status === 'on_hold' || rec.status === 'pending') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approve.isPending}
                        onClick={() => handleApprove(rec.id)}
                        className="text-blue-700 hover:bg-blue-50 hover:text-blue-700 border-blue-200 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Approve
                      </Button>
                    )}
                    {rec.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={markPaid.isPending}
                        onClick={() => handleMarkPaid(rec.id)}
                        className="text-green-700 hover:bg-green-50 hover:text-green-700 border-green-200 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Travelling Allowances ────────────────────────────────────────────

function TravellingAllowancesTab() {
  const [filters, setFilters] = useState({ status: '', trainer_professional_id: '' });
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );

  const { data, isLoading, isError } = useTravellingAllowances(activeFilters);
  const markPaid = useMarkTAPaid();

  const records = data?.data ?? [];
  const pendingTotal = records
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const handleMarkPaid = (id) => {
    markPaid.mutate(id, {
      onSuccess: () => toast.success('Allowance marked as paid'),
      onError: (err) => {
        const code = err.response?.data?.error;
        if (code === 'ALREADY_PAID') toast.error('Already marked as paid.');
        else toast.error(err.response?.data?.message ?? 'Failed to mark as paid.');
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
        <Input
          type="number"
          placeholder="Trainer ID"
          value={filters.trainer_professional_id}
          onChange={(e) => setFilters((f) => ({ ...f, trainer_professional_id: e.target.value }))}
          className="h-8 w-32"
        />
      </div>

      {/* Pending total */}
      {!isLoading && records.length > 0 && pendingTotal > 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-900/20">
          <span className="text-amber-700 dark:text-amber-400">Total pending allowances:</span>
          <span className="font-semibold text-amber-800 dark:text-amber-300">{inr(pendingTotal)}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState message="Failed to load travelling allowances." />
      ) : records.length === 0 ? (
        <EmptyState message="No travelling allowances found." />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="tabular-nums text-muted-foreground">#{rec.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {rec.professionals?.users?.full_name ?? `ID ${rec.trainer_professional_id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rec.professionals?.users?.mobile}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {new Date(rec.allowance_date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rec.batches_count === 1
                      ? '1 batch · ₹50'
                      : `${rec.batches_count} batches · ₹100`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {inr(rec.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rec.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {rec.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={markPaid.isPending}
                        onClick={() => handleMarkPaid(rec.id)}
                        className="text-green-700 hover:bg-green-50 hover:text-green-700 border-green-200 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


// ─── Tab 4: Trainer Assignments ──────────────────────────────────────────────

const ASSIGNMENT_TYPE_LABEL = {
  group_coaching_society: 'Group Coaching (Society)',
  group_coaching_school: 'Group Coaching (School)',
  individual_coaching: 'Individual Coaching',
  personal_tutor: 'Personal Tutor',
};

function TrainerAssignmentsTab() {
  const [filters, setFilters] = useState({ is_active: '' });
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );

  const { data, isLoading, isError } = useTrainerAssignments(activeFilters);
  const updateCap = useUpdateAssignmentSessionsCap();
  const deactivate = useDeactivateAssignment();

  const [editingCap, setEditingCap] = useState({}); // { [id]: value }

  const records = data?.data ?? [];

  const handleCapSave = (id) => {
    const val = Number(editingCap[id]);
    if (!val || val < 1) { toast.error('Enter a valid sessions count'); return; }
    updateCap.mutate({ id, sessions_allocated: val }, {
      onSuccess: () => {
        toast.success('Sessions cap updated');
        setEditingCap((prev) => { const n = { ...prev }; delete n[id]; return n; });
      },
      onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to update'),
    });
  };

  const handleDeactivate = (id) => {
    if (!confirm('Deactivate this assignment?')) return;
    deactivate.mutate(id, {
      onSuccess: () => toast.success('Assignment deactivated'),
      onError: (err) => toast.error(err.response?.data?.message ?? 'Failed'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.is_active}
          onChange={(e) => setFilters((f) => ({ ...f, is_active: e.target.value }))}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState message="Failed to load assignments." />
      ) : records.length === 0 ? (
        <EmptyState message="No assignments found." />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Professional</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Sessions Cap</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => {
                const capVal = editingCap[rec.id] ?? String(rec.sessions_allocated ?? '');
                const isDirty = editingCap[rec.id] !== undefined && editingCap[rec.id] !== String(rec.sessions_allocated ?? '');
                const needsCap = rec.sessions_allocated == null &&
                  (rec.assignment_type === 'group_coaching_society' || rec.assignment_type === 'group_coaching_school');

                return (
                  <TableRow key={rec.id}>
                    <TableCell className="tabular-nums text-muted-foreground">#{rec.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {rec.professionals?.users?.full_name ?? `ID ${rec.professional_id}`}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {rec.professional_type?.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ASSIGNMENT_TYPE_LABEL[rec.assignment_type] ?? rec.assignment_type}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rec.societies?.society_name ?? rec.schools?.school_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rec.activities?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {needsCap && (
                          <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                        )}
                        <Input
                          type="number"
                          min={1}
                          placeholder="Set cap"
                          value={capVal}
                          onChange={(e) => setEditingCap((prev) => ({ ...prev, [rec.id]: e.target.value }))}
                          className="h-7 w-24 text-sm"
                          disabled={!rec.is_active}
                        />
                        {isDirty && (
                          <Button
                            size="sm"
                            disabled={updateCap.isPending}
                            onClick={() => handleCapSave(rec.id)}
                          >
                            {updateCap.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                            Save
                          </Button>
                        )}
                      </div>
                      {needsCap && (
                        <p className="text-xs text-amber-600 mt-0.5">Sessions not set — settlement blocked</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {rec.assigned_from
                        ? new Date(rec.assigned_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {rec.is_active ? (
                        <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border-0">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {rec.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deactivate.isPending}
                          onClick={() => handleDeactivate(rec.id)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-600 border-red-200"
                        >
                          Deactivate
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

// ─── Settlement card sub-components ─────────────────────────────────────────

const CARD_TYPE_CONFIG = {
  society:            { label: 'Group Coaching · Society', accent: 'blue'   },
  school:             { label: 'Group Coaching · School',  accent: 'violet' },
  individual_coaching:{ label: 'Individual Coaching',      accent: 'emerald'},
  personal_tutor:     { label: 'Personal Tutor',           accent: 'amber'  },
};

const ACCENT_CLASSES = {
  blue:    { border: 'border-blue-200 dark:border-blue-800',     badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',    header: 'bg-blue-50 dark:bg-blue-900/10'   },
  violet:  { border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', header: 'bg-violet-50 dark:bg-violet-900/10' },
  emerald: { border: 'border-emerald-200 dark:border-emerald-800',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',header: 'bg-emerald-50 dark:bg-emerald-900/10'},
  amber:   { border: 'border-amber-200 dark:border-amber-800',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', header: 'bg-amber-50 dark:bg-amber-900/10'  },
};

function SessionPill({ label, value, sub }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-amber-600 font-medium">{sub}</div>}
    </div>
  );
}

function CommissionBreakdown({ row }) {
  if (row.is_flat_rate) {
    return (
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>Flat rate: <span className="font-medium text-foreground">{inr(row.flat_amount_per_session)}/session</span></div>
        <div>{row.sessions_completed} sessions × {inr(row.flat_amount_per_session)} = <span className="font-semibold text-foreground">{inr(row.trainer_earns)}</span></div>
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      <div>
        Fee base: <span className="font-medium text-foreground">{inr(row.effective_fee_base)}</span>
        {' · '}Rate: <span className="font-medium text-foreground">{row.commission_rate}%</span>
        {' · '}Cap: <span className="font-medium text-foreground">{row.monthly_cap ?? row.effective_cap}</span>
      </div>
      <div>
        {inr(row.effective_fee_base)} × {row.commission_rate}% ÷ {row.monthly_cap ?? row.effective_cap} = <span className="font-medium text-foreground">{inr(row.commission_per_session)}</span>/session
      </div>
      <div>
        {row.sessions_completed} sessions × {inr(row.commission_per_session)} = <span className="font-semibold text-green-700 dark:text-green-400 text-sm">{inr(row.trainer_earns)}</span>
      </div>
    </div>
  );
}

function StudentRow({ student, isGroup }) {
  return (
    <tr className="border-t border-border/50 text-sm">
      <td className="py-1.5 pr-3">
        <div className="font-medium">{student.name}</div>
        {student.mobile && <div className="text-xs text-muted-foreground">{student.mobile}</div>}
      </td>
      {isGroup && (
        <td className="py-1.5 pr-3 text-xs text-muted-foreground">
          {student.activity ?? '—'}
        </td>
      )}
      {!isGroup && (
        <td className="py-1.5 pr-3 text-xs text-muted-foreground">
          {student.activity ?? '—'}
        </td>
      )}
      <td className="py-1.5 pr-3 text-right tabular-nums text-xs">
        {student.effective_monthly != null ? inr(student.effective_monthly) : '—'}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-xs text-green-700 dark:text-green-400">
        {student.sessions_completed ?? 0}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-xs text-amber-600">
        {student.sessions_absent ?? 0}
      </td>
      <td className="py-1.5 text-right tabular-nums text-xs text-muted-foreground">
        {student.sessions_upcoming ?? 0}
      </td>
    </tr>
  );
}

function SettlementCard({ row, selected, onToggle, onSettle, settling }) {
  const cardType  = row.card_type ?? 'other';
  const config    = CARD_TYPE_CONFIG[cardType] ?? { label: cardType, accent: 'blue' };
  const accent    = ACCENT_CLASSES[config.accent];
  const earns     = Number(row.trainer_earns ?? 0);
  const zeroComm  = earns === 0;
  const wasClamped = (row.sessions_completed_raw ?? row.sessions_completed ?? 0) > (row.sessions_completed ?? 0);
  const isGroup   = cardType === 'society' || cardType === 'school';

  return (
    <div className={cn('rounded-xl border overflow-hidden', accent.border, zeroComm && 'opacity-60')}>
      {/* Card header */}
      <div className={cn('px-4 py-3 flex flex-wrap items-start justify-between gap-3', accent.header)}>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-0.5 rounded border-input shrink-0"
          />
          <div>
            {/* Type badge */}
            <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium mb-1', accent.badge)}>
              {config.label}
            </span>
            {/* Entity / Student name */}
            <div className="font-semibold text-base leading-tight">
              {isGroup ? (row.entity_name ?? '—') : (row.students?.[0]?.name ?? row.professional_name ?? '—')}
            </div>
            {/* Activity */}
            <div className="text-sm text-muted-foreground">
              {row.activity_name ?? '—'}
              {isGroup && row.student_count != null && (
                <span className="ml-2 text-xs">· {row.student_count} students</span>
              )}
            </div>
          </div>
        </div>

        {/* Cycle + earns */}
        <div className="text-right">
          <div className={cn('text-xl font-bold tabular-nums', zeroComm ? 'text-muted-foreground' : 'text-green-700 dark:text-green-400')}>
            {zeroComm ? '₹0' : inr(earns)}
          </div>
          <div className="text-xs text-muted-foreground">{row.session_cycle}</div>
          {row.last_settled_at && (
            <div className="text-xs text-muted-foreground">
              Last settled: {new Date(row.last_settled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* Session breakdown pills */}
      <div className="px-4 py-3 border-t border-border/50 flex flex-wrap items-center gap-6">
        <SessionPill
          label="Completed"
          value={row.sessions_completed ?? 0}
          sub={wasClamped ? `${row.sessions_completed_raw} actual → capped` : null}
        />
        <SessionPill label="Upcoming"  value={row.sessions_upcoming ?? 0} />
        <SessionPill label="Absent"    value={row.sessions_absent ?? 0} />
        <SessionPill label="Monthly Cap" value={row.monthly_cap ?? row.effective_cap ?? '—'} />
        {(row.attendance_pct ?? 0) > 0 && (
          <SessionPill label="Attendance" value={`${row.attendance_pct}%`} />
        )}

        <div className="ml-auto">
          <CommissionBreakdown row={row} />
        </div>
      </div>

      {/* Overdue warning */}
      {wasClamped && (
        <div className="mx-4 mb-2 inline-flex items-center gap-1.5 rounded bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          {row.overdue_warning}
        </div>
      )}

      {/* Student table */}
      {(row.students?.length ?? 0) > 0 && (
        <div className="px-4 pb-3 border-t border-border/50">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left py-1 pr-3 font-medium">Student</th>
                <th className="text-left py-1 pr-3 font-medium">{isGroup ? 'Activity' : 'Subject / Activity'}</th>
                <th className="text-right py-1 pr-3 font-medium">Eff. Monthly</th>
                <th className="text-right py-1 pr-3 font-medium text-green-700 dark:text-green-400">Done</th>
                <th className="text-right py-1 pr-3 font-medium text-amber-600">Absent</th>
                <th className="text-right py-1 font-medium text-muted-foreground">Upcoming</th>
              </tr>
            </thead>
            <tbody>
              {row.students.map((s) => (
                <StudentRow key={s.student_id} student={s} isGroup={isGroup} />
              ))}
              {/* Fee total row for group cards */}
              {isGroup && (
                <tr className="border-t border-border text-xs font-semibold">
                  <td colSpan={2} className="pt-1.5 pr-3 text-muted-foreground">Total fee base</td>
                  <td className="pt-1.5 pr-3 text-right tabular-nums">{inr(row.effective_fee_base)}</td>
                  <td colSpan={3} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settle button */}
      <div className="px-4 py-3 border-t border-border/50 flex justify-end">
        <Button
          size="sm"
          disabled={settling || zeroComm}
          onClick={onSettle}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {settling && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
          <CheckCircle2 className="size-3.5 mr-1.5" />
          Settle {zeroComm ? '(₹0)' : inr(earns)}
        </Button>
      </div>
    </div>
  );
}

// ─── Tab 5: Settlement ───────────────────────────────────────────────────────

function SettlementTab() {
  const [professionalId, setProfessionalId] = useState('');
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [settlingId,  setSettlingId]        = useState(null);

  const filterPid = professionalId.trim() ? Number(professionalId.trim()) : undefined;
  const { data: unsettledData }            = useUnsettledCount();
  const { data, isLoading, isError, refetch } = useSettlementPreview(filterPid);
  const confirm = useConfirmSettlement();

  const preview        = data?.data ?? [];
  const unsettledCount = unsettledData?.unsettled_count ?? 0;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Settle a single card
  const handleSettleOne = (row) => {
    setSettlingId(row.assignment_id);
    confirm.mutate(
      { assignment_ids: [row.assignment_id] },
      {
        onSuccess: () => {
          toast.success(`Settled: ${row.entity_name ?? row.students?.[0]?.name ?? 'assignment'}`);
          refetch();
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Settlement failed'),
        onSettled: () => setSettlingId(null),
      }
    );
  };

  // Settle all selected (or all if none selected)
  const handleSettleAll = () => {
    const assignment_ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
    confirm.mutate(
      { assignment_ids },
      {
        onSuccess: (res) => {
          const count = res?.count ?? (res?.data?.length ?? 0);
          toast.success(`Settlement confirmed for ${count} assignment(s)`);
          setSelectedIds(new Set());
          refetch();
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Settlement failed'),
      }
    );
  };

  const rowsInScope = selectedIds.size > 0
    ? preview.filter((r) => selectedIds.has(r.assignment_id))
    : preview;

  const totalEarns    = rowsInScope.reduce((s, r) => s + Number(r.trainer_earns ?? 0), 0);
  const overdueCount  = rowsInScope.filter((r) => (r.sessions_completed_raw ?? r.sessions_completed ?? 0) > (r.sessions_completed ?? 0)).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        {unsettledCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm dark:border-amber-800 dark:bg-amber-900/20">
            <AlertTriangle className="size-4 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400">
              <strong>{unsettledCount}</strong> assignment{unsettledCount !== 1 ? 's' : ''} unsettled (30+ days)
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Input
            type="number"
            placeholder="Filter by Professional ID"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="h-8 w-52"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState message="Failed to load settlement preview." />
      ) : preview.length === 0 ? (
        <EmptyState message="Nothing to settle right now." />
      ) : (
        <>
          {/* Formula banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 space-y-1">
            <div className="font-medium">Commission formula (monthly cycle)</div>
            <div className="font-mono bg-blue-100 dark:bg-blue-900/40 rounded px-1.5 py-0.5 text-xs inline-block">
              Earns = (Fee Base × Rate%) ÷ Monthly Cap × Sessions Counted
            </div>
            <div className="text-xs opacity-80">
              Fee Base = Σ students' effective monthly fees · Sessions Counted capped at Monthly Cap · Settle monthly for multi-month memberships.
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {preview.map((row) => (
              <SettlementCard
                key={row.assignment_id}
                row={row}
                selected={selectedIds.has(row.assignment_id)}
                onToggle={() => toggleSelect(row.assignment_id)}
                onSettle={() => handleSettleOne(row)}
                settling={settlingId === row.assignment_id}
              />
            ))}
          </div>

          {/* Footer totals + settle-all */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
            <div className="flex flex-wrap gap-5 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `All ${preview.length} assignments`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total payout: </span>
                <span className="font-semibold text-green-700 dark:text-green-400">{inr(totalEarns)}</span>
              </div>
              {overdueCount > 0 && (
                <div className="inline-flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="size-3.5" />
                  <span>{overdueCount} overdue — sessions clamped to monthly cap</span>
                </div>
              )}
            </div>
            <Button
              disabled={confirm.isPending}
              onClick={handleSettleAll}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirm.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              <CheckCircle2 className="size-4 mr-1.5" />
              {selectedIds.size > 0 ? `Settle ${selectedIds.size} selected` : 'Settle All'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Commissions() {
  const { data: unsettledData } = useUnsettledCount();
  const unsettledCount = unsettledData?.unsettled_count ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage commission rules, payouts, and travelling allowances
        </p>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Commission Rules</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="allowances">Travelling Allowances</TabsTrigger>
          <TabsTrigger value="assignments">Trainer Assignments</TabsTrigger>
          <TabsTrigger value="settlement" className="relative">
            Settlement
            {unsettledCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1">
                {unsettledCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4">
          <CommissionRulesTab />
        </TabsContent>
        <TabsContent value="commissions" className="mt-4">
          <CommissionsTab />
        </TabsContent>
        <TabsContent value="allowances" className="mt-4">
          <TravellingAllowancesTab />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <TrainerAssignmentsTab />
        </TabsContent>
        <TabsContent value="settlement" className="mt-4">
          <SettlementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
