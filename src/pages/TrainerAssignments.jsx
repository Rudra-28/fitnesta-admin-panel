import { useState } from 'react';
import { toast } from 'sonner';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useTrainerAssignments,
  useUpdateAssignmentSessionsCap,
  useDeactivateAssignment,
} from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

const ASSIGNMENT_TYPE_LABEL = {
  group_coaching_society: 'Group Coaching (Society)',
  group_coaching_school: 'Group Coaching (School)',
  individual_coaching: 'Individual Coaching',
  personal_tutor: 'Personal Tutor',
};

const ASSIGNMENT_TYPE_BADGE = {
  group_coaching_society: 'bg-blue-100 text-blue-800',
  group_coaching_school: 'bg-indigo-100 text-indigo-800',
  individual_coaching: 'bg-orange-100 text-orange-800',
  personal_tutor: 'bg-purple-100 text-purple-800',
};

function SessionsCapInput({ record }) {
  const [value, setValue] = useState(String(record.sessions_allocated ?? ''));
  const update = useUpdateAssignmentSessionsCap();
  const isDirty = value !== String(record.sessions_allocated ?? '');

  const handleSave = () => {
    if (!value || isNaN(Number(value)) || Number(value) < 1) {
      toast.error('Enter a valid sessions count (min 1)');
      return;
    }
    update.mutate(
      { id: record.id, sessions_allocated: Number(value) },
      {
        onSuccess: () => toast.success('Sessions cap updated'),
        onError: (err) => toast.error(err?.response?.data?.error ?? 'Failed to update'),
      }
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-20 text-sm tabular-nums"
        placeholder="—"
      />
      {isDirty && (
        <Button size="sm" className="h-7 text-xs" disabled={update.isPending} onClick={handleSave}>
          {update.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
        </Button>
      )}
    </div>
  );
}

export default function TrainerAssignments() {
  const [filters, setFilters] = useState({ is_active: '' });
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );
  const { data, isLoading, isError } = useTrainerAssignments(activeFilters);
  const deactivate = useDeactivateAssignment();

  const records = data?.data ?? [];

  const handleDeactivate = (id) => {
    if (!window.confirm('Deactivate this assignment? This will stop settlement calculations for it.')) return;
    deactivate.mutate(id, {
      onSuccess: () => toast.success('Assignment deactivated'),
      onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to deactivate'),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Trainer Assignments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Group coaching contractual assignment records for settlement tracking
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filters.is_active}
          onChange={(e) => setFilters((f) => ({ ...f, is_active: e.target.value }))}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load assignments.</p>
      ) : records.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No assignments found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Professional</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Society / School</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Sessions Cap</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Last Settled</TableHead>
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
                      {rec.professionals?.users?.full_name ?? `ID ${rec.professional_id}`}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {rec.professional_type} · {rec.professionals?.users?.mobile}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={ASSIGNMENT_TYPE_BADGE[rec.assignment_type] ?? 'bg-gray-100 text-gray-800'}>
                      {ASSIGNMENT_TYPE_LABEL[rec.assignment_type] ?? rec.assignment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rec.societies?.society_name ?? rec.schools?.school_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">{rec.activities?.name ?? '—'}</TableCell>
                  <TableCell>
                    <SessionsCapInput record={rec} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {rec.assigned_from
                      ? new Date(rec.assigned_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {rec.last_settled_at
                      ? new Date(rec.last_settled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className="text-amber-600">Never</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={rec.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}>
                      {rec.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {rec.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deactivate.isPending}
                        onClick={() => handleDeactivate(rec.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Deactivate
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
