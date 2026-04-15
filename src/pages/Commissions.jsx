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

// ─── Tab 5: Settlement ───────────────────────────────────────────────────────

function SettlementTab() {
  const [professionalId, setProfessionalId] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const filterPid = professionalId.trim() ? Number(professionalId.trim()) : undefined;
  const { data: unsettledData } = useUnsettledCount();
  const { data, isLoading, isError, refetch } = useSettlementPreview(filterPid);
  const confirm = useConfirmSettlement();

  const preview = data?.data ?? [];
  const unsettledCount = unsettledData?.unsettled_count ?? 0;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(preview.map((r) => r.assignment_id)));
      setSelectAll(true);
    }
  };

  const handleConfirm = () => {
    const assignment_ids = selectAll || selectedIds.size === 0
      ? undefined
      : Array.from(selectedIds);
    confirm.mutate(
      { assignment_ids },
      {
        onSuccess: (res) => {
          const count = res?.count ?? (res?.data?.length ?? 0);
          toast.success(`Settlement confirmed for ${count} assignment(s)`);
          setSelectedIds(new Set());
          setSelectAll(false);
          refetch();
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Settlement failed'),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
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
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            Settlement is based on completed sessions delivered in this cycle. A batch or student may appear in multiple settlement rows if sessions were reassigned.
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-input"
                    />
                  </TableHead>
                  <TableHead>Professional</TableHead>
                  <TableHead>Settlement Row</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead className="text-right">Delivered Sessions</TableHead>
                  <TableHead className="text-right">Upcoming</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Settlement Cycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => {
                  const amount = Number(row.trainer_earns ?? row.commission_amount ?? 0);
                  const zeroComm = amount === 0;
                  const cycleLabel = row.session_cycle
                    ?? (row.window_start
                      ? `${new Date(row.window_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(row.window_end ?? row.window_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : '—');
                  return (
                    <TableRow key={row.assignment_id} className={cn(zeroComm && 'opacity-60')}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectAll || selectedIds.has(row.assignment_id)}
                          onChange={() => toggleSelect(row.assignment_id)}
                          className="rounded border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{row.professional_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {row.professional_type?.replace('_', ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ASSIGNMENT_TYPE_LABEL[row.assignment_type] ?? row.assignment_type}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.entity_name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{row.activity_name ?? row.batch_info?.activity_name ?? '—'}</div>
                        {row.batch_info && (
                          <div className="text-xs text-muted-foreground">{row.batch_info.batch_name ?? row.batch_info.entity_name ?? '—'}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.sessions_completed ?? row.sessions_attended ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.upcoming_sessions ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.absent_sessions ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {zeroComm ? (
                          <span className="text-muted-foreground text-xs">₹0 - skipped</span>
                        ) : inr(amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cycleLabel}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectAll || selectedIds.size === 0
                ? `Will settle all ${preview.length} assignments`
                : `${selectedIds.size} of ${preview.length} selected`}
            </p>
            <Button
              disabled={confirm.isPending}
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirm.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              <CheckCircle2 className="size-4 mr-1.5" />
              Confirm Settlement
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
