import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import {
  useBatchDetail,
  useUpdateSessionStatus,
  useCancelSession,
  useRescheduleSession,
  useReassignBatchSession,
  useReassignAllFutureBatchSessions,
  useRemoveStudentFromBatch,
  useAssignStudentsToBatch,
  useExtendStudentTerm,
  useCreateBatchSession,
  useGenerateSessions,
} from '@/hooks/useAdmin';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGE = {
  scheduled: 'bg-amber-100 text-amber-800',
  ongoing:   'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  absent:    'bg-orange-100 text-orange-800',
};

// ── Reassign Professional Modal ───────────────────────────────────────────────

function ReassignModal({ batchId, session, onClose }) {
  const [scope, setScope] = useState('single');
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  const { data: profsData, isLoading } = useQuery({
    queryKey: ['professionals', 'batch-specific', batchId],
    queryFn: () => api.get(`/admin/batches/${batchId}/professionals`).then(r => r.data),
  });

  const reassignSingle = useReassignBatchSession();
  const reassignAll = useReassignAllFutureBatchSessions();

  const professionals = (profsData?.data ?? [])
    .map((professional) => ({
      ...professional,
      id: professional?.professional_id ?? professional?.id,
      users: {
        ...(professional?.users ?? {}),
        full_name: professional?.full_name ?? professional?.users?.full_name ?? '—',
        mobile: professional?.mobile ?? professional?.users?.mobile ?? '',
      },
    }))
    .filter((professional) => professional.id !== session?.professionals?.id);

  const filtered = professionals.filter(p => {
    const name = (p.users?.full_name ?? p.full_name ?? '').toLowerCase();
    const mobile = p.users?.mobile ?? '';
    return name.includes(search.toLowerCase()) || mobile.includes(search);
  });

  async function handleSubmit() {
    if (!selectedId) return;
    try {
      if (scope === 'single') {
        await reassignSingle.mutateAsync({ batchId, sessionId: session.id, new_professional_id: Number(selectedId) });
        toast.success('Session reassigned');
      } else {
        await reassignAll.mutateAsync({ batchId, new_professional_id: Number(selectedId) });
        toast.success('All future sessions reassigned. Batch professional updated.');
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to reassign');
    }
  }

  const isPending = reassignSingle.isPending || reassignAll.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-xl w-[500px] max-h-[85vh] flex flex-col p-5 gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">Reassign Professional</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Scope selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope('single')}
            className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${scope === 'single' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            This session only
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${scope === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            All future sessions
          </button>
        </div>

        {scope === 'all' && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
            <span className="text-amber-600 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800 leading-relaxed">
              This will reassign <strong>all upcoming scheduled sessions</strong> in this batch and update the batch's assigned professional.
              The old professional's commission assignment is deactivated — their completed sessions are still settled at next settlement.
              A new commission cycle starts for the new professional from today.
            </p>
          </div>
        )}

        {scope === 'single' && session && (
          <p className="text-sm text-muted-foreground">
            Session on <span className="font-medium text-foreground">{formatDate(session.scheduled_date)}</span> ·
            Current: <span className="font-medium text-foreground">{session.professionals?.users?.full_name ?? '—'}</span>
          </p>
        )}

        <Input
          placeholder="Search by name or mobile…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9"
        />

        <div className="border rounded-md divide-y flex-1 overflow-y-auto max-h-52">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No professionals available.</div>
          ) : filtered.map(p => {
            const id = p.id;
            const name = p.users?.full_name ?? p.full_name ?? '—';
            const mobile = p.users?.mobile ?? '';
            return (
              <div
                key={id}
                onClick={() => setSelectedId(String(id))}
                className={`px-3 py-2.5 cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors ${String(selectedId) === String(id) ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{mobile}</p>
                </div>
                {String(selectedId) === String(id) && <span className="text-primary text-xs font-semibold">Selected</span>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedId || isPending}>
            {isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
            Reassign {scope === 'all' ? 'All Future' : 'This Session'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Session Row ───────────────────────────────────────────────────────────────

function SessionRow({ session, batchId }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    scheduled_date: session.scheduled_date ? new Date(session.scheduled_date).toISOString().slice(0, 10) : '',
    start_time: session.start_time ? formatTime(session.start_time) : '',
    end_time: session.end_time ? formatTime(session.end_time) : '',
  });
  const [cancelReason, setCancelReason] = useState('');

  const updateStatus = useUpdateSessionStatus();
  const cancel = useCancelSession();
  const reschedule = useRescheduleSession();
  const qc = useQueryClient();

  const FINAL = ['completed', 'cancelled', 'absent'];
  const canEdit = !FINAL.includes(session.status);
  const attended = (session.session_participants ?? []).filter(p => p.attended).length;
  const total = (session.session_participants ?? []).length;

  async function handleMarkCompleted() {
    try {
      await updateStatus.mutateAsync({ sessionId: session.id, status: 'completed' });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success('Session marked completed');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleMarkOngoing() {
    try {
      await updateStatus.mutateAsync({ sessionId: session.id, status: 'ongoing' });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success('Session marked ongoing');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleMarkAbsent() {
    try {
      await updateStatus.mutateAsync({ sessionId: session.id, status: 'absent' });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success('Session marked as trainer absent');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  }

  async function handleReschedule(e) {
    e.preventDefault();
    try {
      await reschedule.mutateAsync({ sessionId: session.id, ...rescheduleForm });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success('Session rescheduled');
      setRescheduling(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to reschedule');
    }
  }

  async function handleCancel(e) {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    try {
      await cancel.mutateAsync({ sessionId: session.id, cancel_reason: cancelReason });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success('Session cancelled');
      setCancelling(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel');
    }
  }

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30 text-sm">
        <td className="px-3 py-2.5 text-muted-foreground">#{session.id}</td>
        <td className="px-3 py-2.5 font-medium">{formatDate(session.scheduled_date)}</td>
        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatTime(session.start_time)}–{formatTime(session.end_time)}</td>
        <td className="px-3 py-2.5">
          <span className="font-medium">{session.professionals?.users?.full_name ?? '—'}</span>
          {session.professionals?.users?.mobile && (
            <p className="text-xs text-muted-foreground">{session.professionals.users.mobile}</p>
          )}
        </td>
        <td className="px-3 py-2.5">
          {session.status === 'ongoing' ? (
            <div>
              <Badge className={`text-xs ${STATUS_BADGE.ongoing}`}>ongoing</Badge>
              {session.in_time && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  In: {new Date(session.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          ) : session.status === 'completed' ? (
            <div>
              <Badge className={`text-xs ${STATUS_BADGE.completed}`}>completed</Badge>
              {session.out_time && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Out: {new Date(session.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          ) : (
            <Badge className={`text-xs ${STATUS_BADGE[session.status] ?? ''}`}>{session.status}</Badge>
          )}
        </td>
        <td className="px-3 py-2.5">
          {total === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : attended === 0 ? (
            <Badge className="text-xs bg-gray-100 text-gray-600">0/{total} present</Badge>
          ) : attended === total ? (
            <Badge className="text-xs bg-green-100 text-green-800">{attended}/{total} present</Badge>
          ) : (
            <Badge className="text-xs bg-amber-100 text-amber-800">{attended}/{total} present</Badge>
          )}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex gap-1 flex-wrap">
            {canEdit && !rescheduling && !cancelling && (
              <>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setRescheduling(true)}>Reschedule</Button>
                <Button size="sm" variant="outline" className="h-6 text-xs text-blue-700 border-blue-300 hover:bg-blue-50" onClick={() => setReassigning(true)}>
                  <RefreshCw className="size-2.5 mr-1" />Reassign
                </Button>
              </>
            )}
            {session.status === 'scheduled' && !rescheduling && !cancelling && (
              <>
                {!['group_coaching', 'school_student'].includes(session.session_type) && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-blue-700 border-blue-300 hover:bg-blue-50" onClick={handleMarkOngoing} disabled={updateStatus.isPending}>
                      Ongoing
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={handleMarkCompleted} disabled={updateStatus.isPending}>
                      Complete
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-orange-700 border-orange-300 hover:bg-orange-50" onClick={handleMarkAbsent} disabled={updateStatus.isPending}>
                      Absent
                    </Button>
                  </>
                )}
                <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => setCancelling(true)}>Cancel</Button>
              </>
            )}
            {session.status === 'ongoing' && !rescheduling && !cancelling && (
              <>
                {!['group_coaching', 'school_student'].includes(session.session_type) && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={handleMarkCompleted} disabled={updateStatus.isPending}>
                      Complete
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-orange-700 border-orange-300 hover:bg-orange-50" onClick={handleMarkAbsent} disabled={updateStatus.isPending}>
                      Absent
                    </Button>
                  </>
                )}
                <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => setCancelling(true)}>Cancel</Button>
              </>
            )}
            {(rescheduling || cancelling) && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setRescheduling(false); setCancelling(false); }}>✕</Button>
            )}
          </div>
        </td>
      </tr>

      {reassigning && (
        <tr>
          <td colSpan={7}>
            <ReassignModal batchId={batchId} session={session} onClose={() => setReassigning(false)} />
          </td>
        </tr>
      )}

      {rescheduling && (
        <tr className="border-b bg-blue-50/50">
          <td colSpan={7} className="px-3 py-2">
            <form onSubmit={handleReschedule} className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-xs font-medium block mb-0.5">New Date</label>
                <Input type="date" className="h-7 text-xs w-36" value={rescheduleForm.scheduled_date}
                  onChange={e => setRescheduleForm(f => ({ ...f, scheduled_date: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-0.5">Start Time</label>
                <Input type="time" className="h-7 text-xs w-28" value={rescheduleForm.start_time}
                  onChange={e => setRescheduleForm(f => ({ ...f, start_time: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-0.5">End Time</label>
                <Input type="time" className="h-7 text-xs w-28" value={rescheduleForm.end_time}
                  onChange={e => setRescheduleForm(f => ({ ...f, end_time: e.target.value }))} required />
              </div>
              <Button type="submit" size="sm" className="h-7 text-xs" disabled={reschedule.isPending}>
                {reschedule.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
              </Button>
            </form>
          </td>
        </tr>
      )}

      {cancelling && (
        <tr className="border-b bg-red-50/50">
          <td colSpan={7} className="px-3 py-2">
            <form onSubmit={handleCancel} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium block mb-0.5">Reason (required)</label>
                <Input className="h-7 text-xs" placeholder="Why is this session being cancelled?" value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)} required />
              </div>
              <Button type="submit" size="sm" variant="destructive" className="h-7 text-xs" disabled={cancel.isPending || !cancelReason.trim()}>
                {cancel.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Confirm Cancel'}
              </Button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Students Tab ──────────────────────────────────────────────────────────────

function ExtendTermModal({ batchId, studentId, studentName, currentEnd, onClose }) {
  const [months, setMonths] = useState(1);
  const extend = useExtendStudentTerm();

  async function handleSubmit() {
    try {
      const result = await extend.mutateAsync({ batchId, studentId, extra_months: months });
      toast.success(`Term extended to ${formatDate(result.data?.new_membership_end_date)}`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to extend term');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="font-semibold">Extend Term — {studentName}</h3>
        {currentEnd && (
          <p className="text-sm text-muted-foreground">Current end: <span className="font-medium">{formatDate(currentEnd)}</span></p>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Add months</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
          >
            {[1,2,3,6,9,12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={extend.isPending} onClick={handleSubmit}>
            {extend.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
            Extend
          </Button>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ batch, students, batchId }) {
  const remove = useRemoveStudentFromBatch();
  const assignStudents = useAssignStudentsToBatch();
  const qc = useQueryClient();
  const [extendTarget, setExtendTarget] = useState(null); // { studentId, studentName, currentEnd }

  const isGroupCoaching = batch.batch_type === 'group_coaching';

  // Fetch available students to add
  const { data: availableData } = useQuery({
    queryKey: ['group-coaching-students-for-batch', batchId, batch.societies?.id, batch.activities?.id],
    queryFn: () => api.get('/admin/batches/unassigned-students', {
      params: { society_id: batch.societies?.id, activity_id: batch.activities?.id },
    }).then(r => r.data),
    enabled: !!(batch.societies?.id && batch.activities?.id),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [selectedAdd, setSelectedAdd] = useState([]);
  const [addSearch, setAddSearch] = useState('');

  const enrolledIds = new Set((students ?? []).map(s => s.student_id));
  const availableStudents = (availableData?.data ?? []).filter(s => {
    const sid = s.students?.id ?? s.student_id ?? s.id;
    return !enrolledIds.has(sid);
  });
  const getAvailableName = (s) => s.students?.users?.full_name ?? s.student_name ?? s.full_name ?? '—';
  const getAvailableMobile = (s) => s.students?.users?.mobile ?? s.mobile ?? s.student_mobile ?? '—';
  const filteredAvailable = addSearch
    ? availableStudents.filter(s => getAvailableName(s).toLowerCase().includes(addSearch.toLowerCase()))
    : availableStudents;

  async function handleRemove(studentId) {
    if (!confirm('Remove this student from the batch?')) return;
    try {
      await remove.mutateAsync({ batchId, studentId });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success('Student removed');
    } catch {
      toast.error('Failed to remove student');
    }
  }

  async function handleAddStudents() {
    if (!selectedAdd.length) return;
    try {
      await assignStudents.mutateAsync({ batchId, student_ids: selectedAdd });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      toast.success(`${selectedAdd.length} student(s) added`);
      setShowAdd(false);
      setSelectedAdd([]);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to add students');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{students?.length ?? 0} students enrolled</p>
        {isGroupCoaching && (
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? 'Cancel' : '+ Add Students'}
          </Button>
        )}
      </div>

      {/* Add students panel */}
      {showAdd && (
        <div className="border rounded-lg p-4 bg-muted/20 flex flex-col gap-3">
          <p className="text-sm font-medium">Select students to add</p>
          <Input placeholder="Search…" className="h-8" value={addSearch} onChange={e => setAddSearch(e.target.value)} />
          <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
            {filteredAvailable.length === 0
              ? <p className="p-4 text-center text-sm text-muted-foreground">No students available for this society + activity.</p>
              : filteredAvailable.map(s => {
                const id = s.students?.id ?? s.student_id ?? s.id;
                const inOtherBatch = s.batches && s.batches.id && String(s.batches.id) !== String(batchId);
                return (
                  <label key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAdd.includes(id)}
                      onChange={e => setSelectedAdd(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id))}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getAvailableName(s)}</p>
                      <p className="text-xs text-muted-foreground">{getAvailableMobile(s)}</p>
                    </div>
                    {inOtherBatch && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                        In batch: {s.batches.batch_name ?? `#${s.batches.id}`}
                      </span>
                    )}
                  </label>
                );
              })}
          </div>
          <Button size="sm" disabled={!selectedAdd.length || assignStudents.isPending} onClick={handleAddStudents}>
            {assignStudents.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
            Add {selectedAdd.length > 0 ? `(${selectedAdd.length})` : ''} Students
          </Button>
        </div>
      )}

      {/* Enrolled students table */}
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Mobile</th>
              {isGroupCoaching
                ? <>
                    <th className="px-4 py-2.5">Activity</th>
                    <th className="px-4 py-2.5">Flat / Society</th>
                    <th className="px-4 py-2.5">Term</th>
                    <th className="px-4 py-2.5">Membership</th>
                    <th className="px-4 py-2.5">Kits</th>
                  </>
                : <>
                    <th className="px-4 py-2.5">Standard</th>
                    <th className="px-4 py-2.5">Activities</th>
                    <th className="px-4 py-2.5">Kit Type</th>
                    <th className="px-4 py-2.5">Term</th>
                  </>
              }
              <th className="px-4 py-2.5">Enrolled On</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).length === 0 && (
              <tr><td colSpan={10} className="px-4 py-4 text-center text-muted-foreground text-sm">No students enrolled.</td></tr>
            )}
            {(students ?? []).map(bs => {
              const user = bs.students?.users;
              const ic = bs.students?.individual_participants?.[0];
              const ss = bs.students?.school_students?.[0];

              // Compute term end from membership dates
              let termEnd = null;
              let termStart = null;
              let termMonths = null;
              if (isGroupCoaching && ic) {
                termStart  = ic.membership_start_date;
                termEnd    = ic.membership_end_date;
                termMonths = ic.term_months;
              } else if (!isGroupCoaching && ss) {
                termMonths = ss.term_months;
                termStart  = ss.membership_start_date;
                termEnd    = ss.membership_end_date;
                // fallback: derive from batch start_date if membership not set yet
                if (!termEnd && batch.start_date) {
                  const d = new Date(batch.start_date);
                  d.setMonth(d.getMonth() + (ss.term_months ?? 9));
                  termEnd   = d.toISOString().slice(0, 10);
                  termStart = termStart ?? batch.start_date;
                }
              }

              // Alert if term ending soon or expired
              let termAlert = null;
              if (termEnd) {
                const diff = Math.round((new Date(termEnd) - new Date()) / (1000 * 60 * 60 * 24));
                if (diff < 0) termAlert = <Badge className="bg-red-100 text-red-700 text-[10px]">Expired</Badge>;
                else if (diff <= 14) termAlert = <Badge className="bg-amber-100 text-amber-700 text-[10px]">{diff}d left</Badge>;
              }

              return (
                <tr key={bs.student_id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{user?.full_name ?? ss?.student_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{user?.mobile ?? '—'}</td>
                  {isGroupCoaching
                    ? <>
                        <td className="px-4 py-2.5">{ic?.activity ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{ic?.flat_no ? `${ic.flat_no} · ` : ''}{ic?.society_name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{termMonths ? `${termMonths}m` : '—'}</span>
                            {termAlert}
                          </div>
                          {termStart && termEnd && (
                            <p className="text-[10px] text-muted-foreground">{formatDate(termStart)} → {formatDate(termEnd)}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {termStart && termEnd
                            ? <><p>{formatDate(termStart)}</p><p className="text-muted-foreground">→ {formatDate(termEnd)}</p></>
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{ic?.kits ?? '—'}</td>
                      </>
                    : <>
                        <td className="px-4 py-2.5 text-xs">{ss?.standard ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{ss?.activities ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs">{ss?.kit_type ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{termMonths ? `${termMonths}m` : '—'}</span>
                            {termAlert}
                          </div>
                          {termStart && termEnd && (
                            <p className="text-[10px] text-muted-foreground">{formatDate(termStart)} → {formatDate(termEnd)}</p>
                          )}
                        </td>
                      </>
                  }
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(bs.joined_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setExtendTarget({
                          studentId: bs.student_id,
                          studentName: user?.full_name ?? ss?.student_name ?? 'Student',
                          currentEnd: termEnd,
                        })}
                      >
                        Extend
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(bs.student_id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {extendTarget && (
        <ExtendTermModal
          batchId={batchId}
          studentId={extendTarget.studentId}
          studentName={extendTarget.studentName}
          currentEnd={extendTarget.currentEnd}
          onClose={() => setExtendTarget(null)}
        />
      )}
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function AddSessionModal({ batchId, batch, onClose }) {
  const create = useCreateBatchSession();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState(batch.start_time ? formatTime(batch.start_time) : '');
  const [endTime, setEndTime] = useState(batch.end_time ? formatTime(batch.end_time) : '');

  // Dates on or before the last cycle session are blocked
  const lastCycleDate = batch.cycle_end_date
    ? new Date(batch.cycle_end_date).toISOString().slice(0, 10)
    : null;

  async function handleSubmit() {
    if (!date) { toast.error('Date is required'); return; }
    if (lastCycleDate && date <= lastCycleDate) {
      toast.error(`Date must be after the last cycle session (${formatDate(batch.cycle_end_date)})`);
      return;
    }
    try {
      await create.mutateAsync({
        batchId,
        scheduled_date: date,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
      });
      toast.success('Session created');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create session');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="font-semibold">Add Single Session</h3>
        <p className="text-xs text-muted-foreground">Creates one extra session on a specific date. All current batch students will be added as participants automatically.</p>
        {lastCycleDate && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Last cycle ended on <span className="font-semibold">{formatDate(batch.cycle_end_date)}</span>. Only dates after this are allowed.
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Date</label>
          <Input
            type="date"
            value={date}
            min={lastCycleDate ? (() => { const d = new Date(lastCycleDate); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })() : undefined}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Start time</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">End time</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Leave time blank to use batch default ({formatTime(batch.start_time)} – {formatTime(batch.end_time)})</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={create.isPending} onClick={handleSubmit}>
            {create.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
            Create Session
          </Button>
        </div>
      </div>
    </div>
  );
}

// Derive the day-after-cycle-end as ISO date string (used as min for bulk generate start date)
function cycleEndPlusOne(cycleEndDate) {
  if (!cycleEndDate) return null;
  const d = new Date(cycleEndDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function GenerateBulkSessionsModal({ batchId, batch, onClose }) {
  const generate = useGenerateSessions();

  // Default session cap: use the batch's stored session_cap if set, else show empty (backend uses commission_rules)
  const defaultCap = batch.session_cap ? String(batch.session_cap) : '';
  const [sessionCap, setSessionCap] = useState(defaultCap);

  // Start date must be after last cycle end
  const minDate = cycleEndPlusOne(batch.cycle_end_date);
  const [startDate, setStartDate] = useState(minDate ?? '');
  const [result, setResult] = useState(null);

  async function handleSubmit() {
    try {
      const res = await generate.mutateAsync({
        batchId,
        start_date_override: startDate || undefined,
        session_cap_override: sessionCap ? Number(sessionCap) : undefined,
      });
      setResult(res);
      toast.success(`Generated ${res.generated ?? 0} session(s)`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to generate sessions');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="font-semibold">Generate Next Cycle Sessions</h3>
        <p className="text-xs text-muted-foreground">
          Bulk-generates sessions from a start date using the batch schedule
          ({(batch.days_of_week ?? []).join(', ')}, {formatTime(batch.start_time)}–{formatTime(batch.end_time)}).
          Already-existing dates are skipped automatically.
        </p>

        {batch.cycle_end_date && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Previous cycle ended on <span className="font-semibold">{formatDate(batch.cycle_end_date)}</span>.
            Start date is locked to after this date.
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Cycle Start Date <span className="text-destructive">*</span></label>
          <Input
            type="date"
            value={startDate}
            min={minDate ?? undefined}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          {minDate && (
            <p className="text-xs text-muted-foreground mt-0.5">Earliest allowed: {formatDate(minDate)}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Session Cap <span className="text-muted-foreground font-normal">(per cycle)</span></label>
          <Input
            type="number"
            min={1}
            max={99}
            placeholder="Uses commission rule default if blank"
            value={sessionCap}
            onChange={e => setSessionCap(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {defaultCap
              ? `Batch default: ${defaultCap} sessions. Edit to override for this cycle.`
              : 'No cap set on batch — will use the commission rule default.'}
          </p>
        </div>

        {result && (
          <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            <p className="font-semibold">{result.generated} session(s) generated</p>
            {result.cycle_start && (
              <p className="text-xs mt-0.5">{formatDate(result.cycle_start)} → {formatDate(result.cycle_end)}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button size="sm" disabled={generate.isPending || !startDate} onClick={handleSubmit}>
              {generate.isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
              Generate Sessions
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionsTab({ batch, pastSessions, upcomingSessions, batchId }) {
  const [view, setView] = useState('upcoming'); // 'upcoming' | 'past'
  const [showAddSession, setShowAddSession] = useState(false);
  const [showGenerateBulk, setShowGenerateBulk] = useState(false);

  const sessions = view === 'upcoming' ? (upcomingSessions ?? []) : (pastSessions ?? []);

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle + buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${view === 'upcoming' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            Upcoming ({upcomingSessions?.length ?? 0})
          </button>
          <button
            onClick={() => setView('past')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${view === 'past' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            Past ({pastSessions?.length ?? 0})
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowGenerateBulk(true)}>Generate Next Cycle</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddSession(true)}>+ Add Session</Button>
        </div>
      </div>

      {showAddSession && (
        <AddSessionModal batchId={batchId} batch={batch} onClose={() => setShowAddSession(false)} />
      )}
      {showGenerateBulk && (
        <GenerateBulkSessionsModal batchId={batchId} batch={batch} onClose={() => setShowGenerateBulk(false)} />
      )}

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No {view} sessions.</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold">ID</th>
                <th className="px-3 py-2.5 text-xs font-semibold">Date</th>
                <th className="px-3 py-2.5 text-xs font-semibold">Time</th>
                <th className="px-3 py-2.5 text-xs font-semibold">Handled By</th>
                <th className="px-3 py-2.5 text-xs font-semibold">Teacher Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold">Student Attendance</th>
                <th className="px-3 py-2.5 text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <SessionRow key={session.id} session={session} batchId={batchId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BatchDetailPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'overview';
  const [tab, setTab] = useState(defaultTab);

  const { data, isLoading } = useBatchDetail(batchId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Button>
        <p className="text-muted-foreground">Batch not found.</p>
      </div>
    );
  }

  const { batch, students, past_sessions, upcoming_sessions, settlement_preview } = data.data;
  const isGroupCoaching = batch.batch_type === 'group_coaching';
  const locationName = batch.societies?.society_name ?? batch.schools?.school_name ?? '—';

  const tabs = [
    { key: 'overview',  label: 'Overview' },
    { key: 'students',  label: `Students (${students?.length ?? 0})` },
    { key: 'sessions',  label: `Sessions (${(upcoming_sessions?.length ?? 0) + (past_sessions?.length ?? 0)})` },
    { key: 'settlement', label: 'Settlement' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="w-fit -mb-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate(isGroupCoaching ? '/batches/group-coaching' : '/batches/school')}
      >
        <ArrowLeft className="size-4 mr-1" />
        Back to {isGroupCoaching ? 'Group Coaching' : 'School'} Batches
      </Button>

      {/* Header card */}
      <div className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{batch.batch_name ?? `Batch #${batch.id}`}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{locationName} · {batch.activities?.name}</p>
          </div>
          <Badge className={batch.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
            {batch.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
              {isGroupCoaching ? 'Society' : 'School'}
            </p>
            <p className="font-medium">{locationName}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Professional</p>
            <p className="font-medium">{batch.professionals?.users?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{batch.professionals?.users?.mobile ?? ''}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Schedule</p>
            <p className="font-medium">{(batch.days_of_week ?? []).map(d => d.slice(0, 3)).join(', ')}</p>
            <p className="text-xs text-muted-foreground">{formatTime(batch.start_time)}–{formatTime(batch.end_time)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Date Range</p>
            <p className="font-medium">{batch.start_date ? formatDate(batch.start_date) : '—'}</p>
            <p className="text-xs text-muted-foreground">→ {batch.end_date ? formatDate(batch.end_date) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Created</p>
            <p className="font-medium">{formatDateTime(batch.created_at)}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 pt-1 border-t text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold">{students?.length ?? 0}</span>
            <span className="text-muted-foreground">students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold">{upcoming_sessions?.length ?? 0}</span>
            <span className="text-muted-foreground">upcoming</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold">{past_sessions?.filter(s => s.status === 'completed').length ?? 0}</span>
            <span className="text-muted-foreground">completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-red-600">{past_sessions?.filter(s => s.status === 'cancelled').length ?? 0}</span>
            <span className="text-muted-foreground">cancelled</span>
          </div>
        </div>

        {/* Settlement preview banner */}
        {settlement_preview && (
          <div className="rounded-md bg-muted/40 border p-3 text-xs space-y-1 mt-1">
            <p className="font-semibold text-sm">Current Commission Cycle</p>
            <p className="text-muted-foreground">{settlement_preview.cycle_start} → {settlement_preview.cycle_end}</p>
            <p>
              Sessions: <span className="font-medium">{settlement_preview.sessions_attended}/{settlement_preview.sessions_allocated}</span>
              {' · '}Commission: <span className="font-medium text-green-700">₹{Number(settlement_preview.commission_amount).toLocaleString('en-IN')}</span>
            </p>
            <Badge className={settlement_preview.cycle_complete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
              {settlement_preview.cycle_complete ? 'Cycle complete — ready to settle' : 'Cycle in progress'}
            </Badge>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-0 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-10">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming sessions preview */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-sm">Next 5 Upcoming Sessions</h2>
              {(upcoming_sessions ?? []).slice(0, 5).length === 0
                ? <p className="text-muted-foreground text-sm">No upcoming sessions.</p>
                : (upcoming_sessions ?? []).slice(0, 5).map(s => (
                  <div key={s.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatDate(s.scheduled_date)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(s.start_time)}–{formatTime(s.end_time)} · {s.professionals?.users?.full_name ?? '—'}</p>
                    </div>
                    <Badge className={`text-xs ${STATUS_BADGE[s.status] ?? ''}`}>{s.status}</Badge>
                  </div>
                ))
              }
              {(upcoming_sessions?.length ?? 0) > 5 && (
                <button onClick={() => setTab('sessions')} className="text-xs text-primary hover:underline text-left">
                  View all {upcoming_sessions.length} sessions →
                </button>
              )}
            </div>

            {/* Enrolled students preview */}
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-sm">Enrolled Students</h2>
              {(students ?? []).slice(0, 6).length === 0
                ? <p className="text-muted-foreground text-sm">No students enrolled.</p>
                : (students ?? []).slice(0, 6).map(bs => {
                  const user = bs.students?.users;
                  const ic = bs.students?.individual_participants?.[0];
                  const ss = bs.students?.school_students?.[0];
                  const termEnd = ic?.membership_end_date ?? null;
                  let termAlert = null;
                  if (termEnd) {
                    const diff = Math.round((new Date(termEnd) - new Date()) / (1000 * 60 * 60 * 24));
                    if (diff < 0) termAlert = <Badge className="bg-red-100 text-red-700 text-[10px] ml-1">Expired</Badge>;
                    else if (diff <= 14) termAlert = <Badge className="bg-amber-100 text-amber-700 text-[10px] ml-1">{diff}d</Badge>;
                  }
                  return (
                    <div key={bs.student_id} className="rounded-md border px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center">
                          {user?.full_name ?? ss?.student_name ?? '—'}
                          {termAlert}
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.mobile ?? '—'} · Enrolled {formatDate(bs.joined_at)}</p>
                      </div>
                    </div>
                  );
                })
              }
              {(students?.length ?? 0) > 6 && (
                <button onClick={() => setTab('students')} className="text-xs text-primary hover:underline text-left">
                  View all {students.length} students →
                </button>
              )}
            </div>
          </div>
        )}

        {tab === 'students' && (
          <StudentsTab batch={batch} students={students} batchId={Number(batchId)} />
        )}

        {tab === 'sessions' && (
          <SessionsTab
            batch={batch}
            pastSessions={past_sessions}
            upcomingSessions={upcoming_sessions}
            batchId={Number(batchId)}
          />
        )}

        {tab === 'settlement' && settlement_preview && (
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="font-semibold">Current Cycle Settlement</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Cycle</p>
                  <p>{settlement_preview.cycle_start} → {settlement_preview.cycle_end}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Sessions</p>
                  <p>{settlement_preview.sessions_attended} attended / {settlement_preview.sessions_allocated} allocated</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Commission Rate</p>
                  <p>{settlement_preview.commission_rate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Commission Amount</p>
                  <p className="text-lg font-bold text-green-700">₹{Number(settlement_preview.commission_amount).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <Badge className={settlement_preview.cycle_complete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                {settlement_preview.cycle_complete ? 'Ready to settle' : 'Cycle in progress'}
              </Badge>
            </div>
          </div>
        )}

        {tab === 'settlement' && !settlement_preview && (
          <p className="text-muted-foreground text-sm py-6">No active settlement cycle. Generate sessions first.</p>
        )}
      </div>
    </div>
  );
}
