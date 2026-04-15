import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  useBatches,
  useBatchDetail,
  useCreateBatch,
  useUpdateBatch,
  useGenerateSessions,
  useGenerateIndividualSessions,
  useAssignStudentsToBatch,
  useRemoveStudentFromBatch,
  useGroupCoachingStudentsForBatch,
  useSchoolBatchStudents,
  useSettleBatch,
  useBatchSettlements,
  useMarkBatchSettlementPaid,
  useCommissionRules,
  useStudentAssignments,
  useStudentBatches,
  useDeactivateBatch,
  useSessions,
  useSession,
  useCreateSession,
  useUpdateSessionStatus,
  useCancelSession,
  useRescheduleSession,
  useStudentSubjects,
  useStudentActivities,
  useProfessionalsForSession,
  usePreviewSessions,
  useAssignTeacher,
  useAssignTrainer,
  useProfessionals,
} from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function resolveSessionCap(data) {
  const raw =
    data?.session_cap_per_month ??
    data?.session_cap ??
    data?.commission_cap ??
    data?.cap ??
    0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

function resolveDefaultBatchSessionCap({ batchType, activity, rules }) {
  if (!activity || !rules?.length) return '';
  const ruleMap = Object.fromEntries(
    rules.map((rule) => [rule.rule_key, Number(rule.value)])
  );
  const category = activity.activity_category === 'non_sports' ? 'non_sports' : 'sports';
  const ruleKey =
    batchType === 'school_student'
      ? (category === 'sports' ? 'group_school_sports_sessions_cap' : 'group_school_non_sports_sessions_cap')
      : (category === 'sports' ? 'group_society_sports_sessions_cap' : 'group_society_non_sports_sessions_cap');
  const value = ruleMap[ruleKey];
  return Number.isFinite(value) ? String(value) : '';
}

function formatTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function BatchForm({ batchType, initial, onClose, onSaved }) {
  const isSchoolBatch = batchType === 'school_student';
  const [form, setForm] = useState({
    batch_name: initial?.batch_name ?? '',
    society_id: initial?.societies?.id ?? '',
    school_id: initial?.schools?.id ?? '',
    activity_id: initial?.activities?.id ?? '',
    professional_id: initial?.professionals?.id ?? '',
    professional_type: 'trainer',
    days_of_week: initial?.days_of_week ?? [],
    start_time: initial ? formatTime(initial.start_time) : '',
    end_time: initial ? formatTime(initial.end_time) : '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    capacity: initial?.capacity ?? '',
    session_cap: initial?.session_cap ?? '',
  });
  const [isCapLocked, setIsCapLocked] = useState(false);
  const [error, setError] = useState('');

  const { data: profData } = useQuery({
    queryKey: ['batch-professionals', form.professional_type, batchType],
    queryFn: () => {
      if (isSchoolBatch) {
        return api.get('/admin/batches/professionals', { params: { type: 'trainer' } }).then((r) => r.data);
      }
      return api.get('/admin/professionals/available', { params: { type: form.professional_type } }).then((r) => r.data);
    },
    enabled: !!form.professional_type,
  });

  const { data: societiesData } = useQuery({
    queryKey: ['societies-list'],
    queryFn: () => api.get('/admin/societies').then((r) => r.data),
    enabled: batchType === 'group_coaching',
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools-list'],
    queryFn: () => api.get('/admin/schools').then((r) => r.data),
    enabled: batchType === 'school_student',
  });

  const coachingType = batchType === 'group_coaching' ? 'group_coaching' : 'school_student';
  const { data: activitiesData } = useQuery({
    queryKey: ['activities-list', coachingType],
    queryFn: () => api.get('/admin/activities', { params: { coaching_type: coachingType } }).then((r) => r.data),
  });

  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const generate = useGenerateSessions();
  const { data: commissionRulesData } = useCommissionRules();
  const [isSessionCapManual, setIsSessionCapManual] = useState(Boolean(initial?.session_cap));

  function toggleDay(day) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsCapLocked(false);
    try {
      const payload = {
        batch_type: batchType,
        activity_id: Number(form.activity_id),
        professional_id: Number(form.professional_id),
        professional_type: form.professional_type,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        start_date: form.start_date,
        end_date: form.end_date,
        batch_name: form.batch_name || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        session_cap: form.session_cap ? Number(form.session_cap) : undefined,
        society_id: batchType === 'group_coaching' ? Number(form.society_id) : undefined,
        school_id: isSchoolBatch ? Number(form.school_id) : undefined,
      };
      if (initial) {
        try {
          await updateBatch.mutateAsync({ batchId: initial.id, data: payload });
          toast.success('Batch updated');
        } catch (err) {
          const code = err?.response?.data?.code;
          if (code === 'SESSION_CAP_LOCKED') {
            setIsCapLocked(true);
            setError('The session count cannot be changed once sessions are created.');
            return;
          }
          throw err;
        }
      } else {
        const created = await createBatch.mutateAsync(payload);
        const batchId = created?.data?.id;
        if (batchId) {
          try {
            const genRes = await generate.mutateAsync({ batchId });
            toast.success(`Batch created · ${genRes.generated ?? 0} sessions generated`);
          } catch {
            toast.success('Batch created (session generation failed — use Generate button)');
          }
        } else {
          toast.success('Batch created');
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const code = err?.response?.data?.code;
      setError(err?.response?.data?.message ?? code ?? err.message ?? 'Something went wrong');
    }
  }

  const professionals = (profData?.data ?? [])
    .filter((professional) => {
      if (!isSchoolBatch) return true;
      return (professional?.profession_type ?? professional?.professional_type) === 'trainer';
    })
    .map((professional) => ({
      ...professional,
      id: professional?.professional_id ?? professional?.id,
      place: professional?.place ?? professional?.users?.address ?? '',
      users: {
        ...(professional?.users ?? {}),
        full_name: professional?.full_name ?? professional?.users?.full_name ?? '—',
        mobile: professional?.mobile ?? professional?.users?.mobile ?? '',
      },
    }));
  const societies = societiesData?.data ?? [];
  const schools = schoolsData?.data ?? [];
  const activities = activitiesData?.data ?? [];
  const commissionRules = commissionRulesData?.data ?? [];

  // Derive label names for auto-naming
  const selectedSociety = societies.find((s) => String(s.id) === String(form.society_id));
  const selectedSchool = schools.find((s) => String(s.id) === String(form.school_id));
  const selectedActivity = activities.find((a) => String(a.id) === String(form.activity_id));
  const derivedSessionCap = resolveDefaultBatchSessionCap({
    batchType,
    activity: selectedActivity,
    rules: commissionRules,
  });
  const locationName = selectedSociety?.society_name ?? selectedSchool?.school_name ?? '';
  const activityName = selectedActivity?.name ?? '';

  useEffect(() => {
    if (initial || isSessionCapManual) return;
    setForm((current) => {
      if (current.session_cap === derivedSessionCap) return current;
      return { ...current, session_cap: derivedSessionCap };
    });
  }, [derivedSessionCap, initial, isSessionCapManual]);

  // Auto-fill batch name when both are picked (only if not manually edited away from auto value)
  function buildAutoName() {
    if (activityName && locationName) return `${activityName} - ${locationName}`;
    return '';
  }

  function handleSocietyChange(e) {
    const society_id = e.target.value;
    const loc = societies.find((s) => String(s.id) === String(society_id));
    const auto = activityName && loc ? `${activityName} - ${loc.society_name}` : form.batch_name;
    setForm((f) => ({ ...f, society_id, batch_name: auto }));
  }

  function handleSchoolChange(e) {
    const school_id = e.target.value;
    const loc = schools.find((s) => String(s.id) === String(school_id));
    const auto = activityName && loc ? `${activityName} - ${loc.school_name}` : form.batch_name;
    setForm((f) => ({ ...f, school_id, batch_name: auto }));
  }

  function handleActivityChange(e) {
    const activity_id = e.target.value;
    const act = activities.find((a) => String(a.id) === String(activity_id));
    const auto = act && locationName ? `${act.name} - ${locationName}` : form.batch_name;
    setForm((f) => ({ ...f, activity_id, batch_name: auto, professional_id: '' }));
  }

  const showNameField = !!(form.activity_id && (form.society_id || form.school_id));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {batchType === 'group_coaching' && (
        <div>
          <label className="text-sm font-medium">Society</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={form.society_id}
            onChange={handleSocietyChange}
            required
          >
            <option value="">Select society</option>
            {societies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.society_name} ({s.society_category === 'custom' ? s.custom_category_name : s.society_category})
              </option>
            ))}
          </select>
        </div>
      )}

      {batchType === 'school_student' && (
        <div>
          <label className="text-sm font-medium">School</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={form.school_id}
            onChange={handleSchoolChange}
            required
          >
            <option value="">Select school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.school_name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Activity</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm"
          value={form.activity_id}
          onChange={handleActivityChange}
          required
        >
          <option value="">Select activity</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {showNameField && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">
                Batch Name
                <span className="ml-1 text-xs font-normal text-muted-foreground">(auto-filled, editable)</span>
              </label>
              <Input
                value={form.batch_name}
                onChange={(e) => setForm((f) => ({ ...f, batch_name: e.target.value }))}
                placeholder={buildAutoName()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Capacity (optional)</label>
              <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 25" />
            </div>
          </div>
          <div className={`mt-1 rounded-md ${isCapLocked ? 'border border-amber-300 bg-amber-50 px-2 py-2' : ''}`}>
            <label className={`text-sm font-medium ${isCapLocked ? 'text-amber-700' : ''}`}>Session Cap (optional)</label>
            <Input 
              type="number" 
              min="1" 
              value={form.session_cap} 
              onChange={(e) => {
                setIsSessionCapManual(true);
                setForm((f) => ({ ...f, session_cap: e.target.value }));
              }} 
              placeholder="Auto-resolved from rules"
              disabled={isCapLocked}
            />
            {isCapLocked ? (
              <p className="text-[11px] font-medium text-amber-600 mt-1">⚠️ The session count cannot be changed once sessions are created.</p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">The session count cannot be changed once sessions are created.</p>
            )}
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium">
          Professional
          {!isSchoolBatch && !form.activity_id && <span className="ml-1 text-xs font-normal text-muted-foreground">(select activity first)</span>}
        </label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm"
          value={form.professional_id}
          onChange={(e) => setForm((f) => ({ ...f, professional_id: e.target.value }))}
          required
          disabled={!isSchoolBatch && !form.activity_id}
        >
          <option value="">Select professional</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.users?.full_name} — {p.users?.mobile}{p.place ? ` (${p.place})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Days of Week</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${form.days_of_week.includes(day)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium">Start Time</label>
          <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} required />
        </div>
        <div>
          <label className="text-sm font-medium">End Time</label>
          <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium">Start Date</label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} required />
        </div>
        <div>
          <label className="text-sm font-medium">End Date</label>
          <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end mt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={createBatch.isPending || updateBatch.isPending}>
          {initial ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

function GenerateSessionsModal({ batch, onClose }) {
  const generate = useGenerateSessions();

  async function handleGenerate() {
    try {
      const res = await generate.mutateAsync({ batchId: batch.id });
      toast.success(`Generated ${res.generated ?? 0} session(s) for current 30-day cycle`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to generate sessions');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        This will auto-generate sessions for the current 30-day cycle based on the batch schedule
        ({(batch.days_of_week ?? []).join(', ')}, {formatTime(batch.start_time)}–{formatTime(batch.end_time)}).
        Already-existing session dates are skipped.
      </p>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleGenerate} disabled={generate.isPending}>Generate Sessions</Button>
      </div>
    </div>
  );
}

function AssignStudentsModal({ batch, onClose }) {
  const isSchool = batch.batch_type === 'school_student' || batch.batch_type === 'school' || !!batch.schools?.id || !!batch.school_id;
  const society_id = batch.societies?.id ?? batch.society_id;
  const school_id = batch.schools?.id ?? batch.school_id;
  const activity_id = batch.activities?.id ?? batch.activity_id;
  const locationName = isSchool
    ? (batch.schools?.school_name ?? 'this school')
    : (batch.societies?.society_name ?? 'this society');

  const { data: gcData, isLoading: gcLoading } = useGroupCoachingStudentsForBatch({
    batch_id: !isSchool ? batch.id : undefined,
    society_id: !isSchool ? society_id : undefined,
    activity_id,
  });
  const { data: schoolData, isLoading: schoolLoading } = useSchoolBatchStudents({
    batch_id: isSchool ? batch.id : undefined,
    school_id: isSchool ? school_id : undefined,
    activity_id,
  });

  const students = (isSchool ? schoolData : gcData)?.data ?? [];
  const isLoading = isSchool ? schoolLoading : gcLoading;

  const assign = useAssignStudentsToBatch();
  const [selected, setSelected] = useState([]);

  function toggle(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function handleAssign() {
    if (!selected.length) return;
    try {
      const res = await assign.mutateAsync({ batchId: batch.id, student_ids: selected });
      if (res.skipped_conflicts?.length) {
        toast.warning(
          `Assigned ${res.assigned}. Skipped: ${res.skipped_conflicts.map((s) => s.name).join(', ')}`
        );
      } else {
        toast.success(`Assigned ${res.assigned} student(s)`);
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to assign students');
    }
  }

  return (
    <div className="flex flex-col gap-3 max-h-[60vh]">
      <p className="text-sm text-muted-foreground">
        Showing {batch.activities?.name ?? 'activity'} students from {locationName} not yet in this batch.
      </p>
      <div className="overflow-y-auto flex flex-col gap-1 border rounded p-2">
        {isLoading && <p className="text-sm text-muted-foreground p-2">Loading...</p>}
        {!isLoading && students.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">No eligible students found.</p>
        )}
        {students.map((s) => (
          <label key={s.student_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selected.includes(s.student_id)}
              onChange={() => toggle(s.student_id)}
              className="size-3.5"
            />
            <span className="flex-1">
              {s.full_name} — {s.mobile}
              {isSchool && s.standard && <span className="ml-1 text-xs text-muted-foreground">({s.standard})</span>}
            </span>
            {s.batch_id && (
              <span className="text-xs text-amber-600">In batch #{s.batch_id}</span>
            )}
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAssign} disabled={!selected.length || assign.isPending}>
          Assign ({selected.length})
        </Button>
      </div>
    </div>
  );
}

const SESSION_STATUS_BADGE = {
  scheduled: 'bg-amber-100 text-amber-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function SettlementTab({ batchId }) {
  const { data: settlementsData, isLoading } = useBatchSettlements(batchId);
  const markPaid = useMarkBatchSettlementPaid();
  const settle = useSettleBatch();

  const settlements = settlementsData?.data ?? [];

  async function handleSettle() {
    try {
      const res = await settle.mutateAsync(batchId);
      toast.success(`Settled! Commission: ₹${res.commission_amount}`);
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message ?? 'Failed to settle';
      toast.error(code === 'CYCLE_INCOMPLETE' ? msg : msg);
    }
  }

  async function handleMarkPaid(settlement) {
    try {
      await markPaid.mutateAsync({ settlementId: settlement.id, batchId });
      toast.success('Marked as paid');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed');
    }
  }

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;

  return (
    <div className="flex flex-col gap-3">
      {settlements.length === 0 && (
        <p className="text-xs text-muted-foreground">No settlements yet.</p>
      )}
      {settlements.map((s) => (
        <div key={s.id} className="rounded border p-3 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Cycle: {s.cycle_start} → {s.cycle_end}</span>
            <Badge className={s.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
              {s.status}
            </Badge>
          </div>
          <p>Sessions: {s.sessions_attended}/{s.sessions_allocated} attended</p>
          <p>Base: ₹{Number(s.base_amount).toLocaleString('en-IN')} · Rate: {s.commission_rate}%</p>
          <p className="font-medium">Commission: ₹{Number(s.commission_amount).toLocaleString('en-IN')}</p>
          {s.settled_at && <p className="text-muted-foreground">Settled: {new Date(s.settled_at).toLocaleDateString()}</p>}
          {s.paid_at && <p className="text-muted-foreground">Paid: {new Date(s.paid_at).toLocaleDateString()}</p>}
          {s.status === 'settled' && (
            <Button size="sm" className="h-6 text-xs mt-1" onClick={() => handleMarkPaid(s)} disabled={markPaid.isPending}>
              Mark as Paid
            </Button>
          )}
        </div>
      ))}
      <Button size="sm" onClick={handleSettle} disabled={settle.isPending} className="mt-1">
        Settle Current Cycle
      </Button>
      <p className="text-xs text-muted-foreground">Settle button will fail if the current 30-day cycle is not yet complete.</p>
    </div>
  );
}

function BatchDetailDrawer({ batchId, onClose }) {
  const { data, isLoading } = useBatchDetail(batchId);
  const remove = useRemoveStudentFromBatch();
  const [tab, setTab] = useState('students');

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  const detail = data?.data;
  if (!detail) return null;

  const { batch, students, past_sessions, upcoming_sessions, settlement_preview } = detail;

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Header info */}
      <div className="px-4 pt-4 pb-3 border-b space-y-0.5">
        <h3 className="font-semibold text-base">{batch.batch_name ?? `Batch #${batch.id}`}</h3>
        <p className="text-muted-foreground text-xs">
          {batch.societies?.society_name ?? batch.schools?.school_name} · {batch.activities?.name}
        </p>
        <p className="text-muted-foreground text-xs">
          {(batch.days_of_week ?? []).join(', ')} · {formatTime(batch.start_time)}–{formatTime(batch.end_time)}
        </p>
        {batch.capacity && <p className="text-xs text-muted-foreground">Capacity: {batch.capacity}</p>}
      </div>

      {/* Settlement preview banner */}
      {settlement_preview && (
        <div className="px-4 py-2 bg-muted/40 border-b text-xs space-y-0.5">
          <p className="font-medium">Current Cycle: {settlement_preview.cycle_start} → {settlement_preview.cycle_end}</p>
          <p>Sessions: {settlement_preview.sessions_attended}/{settlement_preview.sessions_allocated} · Commission: ₹{Number(settlement_preview.commission_amount).toLocaleString('en-IN')}</p>
          <Badge className={settlement_preview.cycle_complete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
            {settlement_preview.cycle_complete ? 'Cycle complete' : 'Cycle in progress'}
          </Badge>
          {settlement_preview.cap_overridden && (
            <p className="text-[10px] text-amber-700 font-medium mt-1">
              Note: Commission calculated on actual sessions ({settlement_preview.effective_cap}) instead of defined cap ({settlement_preview.standard_cap}).
            </p>
          )}
          {settlement_preview.settlement_locked && (
            <span className="ml-2 text-muted-foreground">Settlement locked until cycle ends</span>
          )}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b px-4">
        {['students', 'upcoming', 'past', 'settlements'].map((t) => (
          <button
            key={t}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab(t)}
          >
            {t === 'students' ? `Students (${students?.length ?? 0})` :
              t === 'upcoming' ? `Upcoming (${upcoming_sessions?.length ?? 0})` :
                t === 'past' ? `Past (${past_sessions?.length ?? 0})` :
                  'Settlements'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'students' && (
          <div className="flex flex-col gap-1">
            {(students ?? []).length === 0 && <p className="text-muted-foreground text-xs">No students enrolled.</p>}
            {(students ?? []).map((bs) => (
              <div key={bs.student_id} className="flex items-center justify-between rounded border px-3 py-1.5">
                <span>
                  {bs.students?.users?.full_name ?? '—'}
                  <span className="ml-2 text-xs text-muted-foreground">{bs.students?.users?.mobile}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 h-7 text-xs"
                  onClick={async () => {
                    try {
                      await remove.mutateAsync({ batchId, studentId: bs.student_id });
                      toast.success('Student removed');
                    } catch {
                      toast.error('Failed to remove student');
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === 'upcoming' && (
          <div className="flex flex-col gap-2">
            {(upcoming_sessions ?? []).length === 0 && <p className="text-muted-foreground text-xs">No upcoming sessions.</p>}
            {(upcoming_sessions ?? []).map((s) => (
              <div key={s.id} className="rounded border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{new Date(s.scheduled_date).toLocaleDateString()}</span>
                  <Badge className={SESSION_STATUS_BADGE[s.status] ?? ''}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'past' && (
          <div className="flex flex-col gap-2">
            {(past_sessions ?? []).length === 0 && <p className="text-muted-foreground text-xs">No past sessions.</p>}
            {(past_sessions ?? []).map((s) => {
              const attended = (s.session_participants ?? []).filter((p) => p.attended).length;
              const total = (s.session_participants ?? []).length;
              const trainerPresent = !!s.in_time;
              return (
                <div key={s.id} className="rounded border px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{new Date(s.scheduled_date).toLocaleDateString()}</span>
                    <Badge className={SESSION_STATUS_BADGE[s.status] ?? ''}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Attendance: {attended}/{total} ·{' '}
                    <span className={trainerPresent ? 'text-green-700' : 'text-red-600'}>
                      Trainer {trainerPresent ? 'present' : 'absent'}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'settlements' && <SettlementTab batchId={batchId} />}
      </div>

      <div className="px-4 py-3 border-t">
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">Close</Button>
      </div>
    </div>
  );
}

function BatchTable({ batchType }) {
  const apiBatchType = batchType;
  const [filters] = useState({ batch_type: apiBatchType });
  const { data, isLoading } = useBatches(filters);
  const deactivateBatch = useDeactivateBatch();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [generateBatch, setGenerateBatch] = useState(null);
  const [assignBatch, setAssignBatch] = useState(null);

  const batches = data?.data ?? [];

  async function handleDeactivate(batch) {
    if (!confirm(`Deactivate batch "${batch.batch_name ?? batch.id}"? All future sessions will be cancelled.`)) return;
    try {
      await deactivateBatch.mutateAsync(batch.id);
      toast.success('Batch deactivated');
    } catch {
      toast.error('Failed to deactivate batch');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {batchType === 'group_coaching' ? 'Group Coaching Batches' : 'School Batches'}
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>Create Batch</Button>
      </div>

      {/* Slide-over for create */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="w-[420px] bg-background border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Create Batch</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <BatchForm batchType={batchType} onClose={() => setShowCreate(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Edit slide-over */}
      {editBatch && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setEditBatch(null)} />
          <div className="w-[420px] bg-background border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Edit Batch</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditBatch(null)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <BatchForm batchType={batchType} initial={editBatch} onClose={() => setEditBatch(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Generate sessions modal */}
      {generateBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGenerateBatch(null)} />
          <div className="relative bg-background rounded-lg shadow-xl w-[360px] p-5">
            <h3 className="font-semibold mb-3">Generate Sessions</h3>
            <GenerateSessionsModal batch={generateBatch} onClose={() => setGenerateBatch(null)} />
          </div>
        </div>
      )}

      {/* Assign students modal */}
      {assignBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignBatch(null)} />
          <div className="relative bg-background rounded-lg shadow-xl w-[480px] p-5">
            <h3 className="font-semibold mb-3">Assign Students</h3>
            <AssignStudentsModal batch={assignBatch} onClose={() => setAssignBatch(null)} />
          </div>
        </div>
      )}


      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">{batchType === 'group_coaching' ? 'Society' : 'School'}</th>
                <th className="px-3 py-2">Activity</th>
                <th className="px-3 py-2">Professional</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Date Range</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Sessions</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-4 text-center text-muted-foreground">No batches found.</td></tr>
              )}
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{batch.batch_name ?? `#${batch.id}`}</td>
                  <td className="px-3 py-2">{batch.societies?.society_name ?? batch.schools?.school_name ?? '—'}</td>
                  <td className="px-3 py-2">{batch.activities?.name ?? '—'}</td>
                  <td className="px-3 py-2">{batch.professionals?.users?.full_name ?? '—'}</td>
                  <td className="px-3 py-2">{(batch.days_of_week ?? []).map((d) => d.slice(0, 3)).join(', ')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatTime(batch.start_time)}–{formatTime(batch.end_time)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{batch.start_date} → {batch.end_date}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{batch._count?.batch_students ?? 0}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{batch._count?.sessions ?? 0}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={batch.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {batch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/batches/${batch.id}/detail`)}>View</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditBatch(batch)}>Edit</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/batches/${batch.id}/detail?tab=sessions`)}>Sessions</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/batches/${batch.id}/detail?tab=students`)}>Students</Button>
                      {batch.is_active && (
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDeactivate(batch)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
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

// ─── Generate Sessions Form (IC / PT) ───────────────────────────────────────

// ─── Individual / PT batch form ───────────────────────────────────────────────
// Creates a named session group for a single student by calling /sessions/generate.
// Batch label = "StudentName — ActivityName" (frontend construct only).

function IndividualBatchForm({ sessionType }) {
  const isPT = sessionType === 'personal_tutor';
  const profType = isPT ? 'teacher' : 'trainer';

  const [form, setForm] = useState({
    student_id: '',
    professional_id: '',
    activity_id: '',
    start_date: '',
    days_of_week: [],
    start_time: '',
    end_time: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Build the auto batch label for display
  const { data: studentsData } = useStudentAssignments(isPT ? 'personal_tutor' : 'individual_coaching');
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));

  const { data: profData } = useQuery({
    queryKey: ['professionals-available', profType],
    queryFn: () => api.get('/admin/professionals/available', { params: { type: profType } }).then((r) => r.data),
  });
  const professionals = profData?.data ?? [];

  const { data: activitiesData } = useQuery({
    queryKey: ['activities-list', sessionType],
    queryFn: () =>
      api.get('/admin/activities', { params: { coaching_type: sessionType } }).then((r) => r.data),
    enabled: !isPT,
  });
  const activities = activitiesData?.data ?? [];

  // Derive batch label from current selections
  const selectedStudent = students.find((s) => {
    const id = isPT ? s.personal_tutor_id : s.individual_participant_id;
    return String(id) === String(form.student_id);
  });
  const selectedActivity = activities.find((a) => String(a.id) === String(form.activity_id));
  const studentName = selectedStudent?.student_name ?? selectedStudent?.full_name ?? '';
  const activityLabel = isPT
    ? (selectedStudent?.teacher_for ?? 'Personal Tutor')
    : (selectedActivity?.name ?? '');
  const batchLabel = studentName && activityLabel ? `${studentName} — ${activityLabel}` : '';

  const generate = useGenerateIndividualSessions();

  function toggleDay(day) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }));
  }

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (form.days_of_week.length === 0) { setError('Select at least one day of the week.'); return; }
    try {
      const payload = {
        session_type: sessionType,
        student_id: Number(form.student_id),
        professional_id: Number(form.professional_id),
        start_date: form.start_date,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        ...(!isPT && form.activity_id ? { activity_id: Number(form.activity_id) } : {}),
      };
      const res = await generate.mutateAsync(payload);
      setResult(res);
      const generated = res.generated ?? res.sessions_generated ?? 0;
      const skipped = res.skipped ?? res.skipped_count ?? 0;
      toast.success(
        skipped > 0
          ? `${generated} sessions created, ${skipped} skipped due to conflicts`
          : `${generated} sessions created`
      );
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.response?.data?.code ?? err.message ?? 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-lg">

      {/* Batch name preview */}
      {batchLabel && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2">
          <p className="text-xs text-muted-foreground">Batch label (auto)</p>
          <p className="font-medium text-sm mt-0.5">{batchLabel}</p>
        </div>
      )}

      {/* Student */}
      <div>
        <label className="text-sm font-medium">Student</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={form.student_id}
          onChange={(e) => setF('student_id', e.target.value)}
          required
        >
          <option value="">Select student</option>
          {students.map((s) => {
            const id = isPT ? s.personal_tutor_id : s.individual_participant_id;
            const name = s.student_name ?? s.full_name;
            const sub = isPT ? s.teacher_for : s.activity;
            return (
              <option key={id} value={id}>
                {name} — {s.student_mobile}{sub ? ` (${sub})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Activity (IC only) */}
      {!isPT && (
        <div>
          <label className="text-sm font-medium">Activity</label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm mt-1"
            value={form.activity_id}
            onChange={(e) => setF('activity_id', e.target.value)}
            required
          >
            <option value="">Select activity</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Professional */}
      <div>
        <label className="text-sm font-medium">{isPT ? 'Teacher' : 'Trainer'}</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={form.professional_id}
          onChange={(e) => setF('professional_id', e.target.value)}
          required
        >
          <option value="">Select {isPT ? 'teacher' : 'trainer'}</option>
          {professionals.map((p) => (
            <option key={p.professional_id ?? p.id} value={p.professional_id ?? p.id}>
              {p.full_name ?? p.users?.full_name} — {p.mobile ?? p.users?.mobile}
            </option>
          ))}
        </select>
      </div>

      {/* Start date */}
      <div>
        <label className="text-sm font-medium">Start Date</label>
        <Input type="date" value={form.start_date} onChange={(e) => setF('start_date', e.target.value)} required className="mt-1" />
      </div>

      {/* Days of week */}
      <div>
        <label className="text-sm font-medium">Days of Week</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${form.days_of_week.includes(day)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium">Start Time</label>
          <Input type="time" value={form.start_time} onChange={(e) => setF('start_time', e.target.value)} required className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">End Time</label>
          <Input type="time" value={form.end_time} onChange={(e) => setF('end_time', e.target.value)} required className="mt-1" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm space-y-1">
          <p className="font-medium text-green-800">
            {result.generated ?? result.sessions_generated ?? 0} sessions created
            {(result.skipped ?? result.skipped_count ?? 0) > 0 &&
              `, ${result.skipped ?? result.skipped_count} skipped`}
          </p>
          {(result.skipped_detail ?? []).map((d, i) => (
            <p key={i} className="text-xs text-amber-700">
              {new Date(d.date).toLocaleDateString()}: {d.reason}
            </p>
          ))}
          <p className="text-xs text-green-700 pt-1">
            View sessions by clicking the student's name on the Students page.
          </p>
        </div>
      )}

      <div className="flex justify-end mt-1">
        <Button type="submit" disabled={generate.isPending}>
          {generate.isPending ? 'Creating…' : 'Create Sessions'}
        </Button>
      </div>
    </form>
  );
}

// ─── Session components (shared by IC and PT tabs) ───────────────────────────

const SESSION_TYPE_BADGE = {
  group_coaching: 'bg-blue-100 text-blue-800',
  school_student: 'bg-indigo-100 text-indigo-800',
  personal_tutor: 'bg-purple-100 text-purple-800',
  individual_coaching: 'bg-orange-100 text-orange-800',
};

const SESSION_STATUS_COLORS = {
  scheduled: 'bg-amber-100 text-amber-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function SessionDetailDrawer({ sessionId, onClose }) {
  const { data, isLoading } = useSession(sessionId);
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  const session = data?.data;
  if (!session) return null;
  const isBatch = !!session.batch_id;
  return (
    <div className="flex flex-col gap-4 p-4 text-sm overflow-y-auto h-full">
      <div>
        <div className="flex gap-2 items-center mb-1">
          <Badge className={SESSION_TYPE_BADGE[session.session_type]}>{session.session_type?.replace(/_/g, ' ')}</Badge>
          <Badge className={SESSION_STATUS_COLORS[session.status]}>{session.status}</Badge>
        </div>
        <p><span className="font-medium">Date:</span> {session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : '—'}</p>
        <p><span className="font-medium">Time:</span> {formatTime(session.start_time)}–{formatTime(session.end_time)}</p>
        <p><span className="font-medium">Professional:</span> {session.professionals?.users?.full_name ?? '—'}</p>
        {session.cancel_reason && <p><span className="font-medium text-red-600">Cancel reason:</span> {session.cancel_reason}</p>}
      </div>
      {isBatch ? (
        <div>
          <p className="font-medium">Batch: {session.batches?.batch_name ?? `#${session.batch_id}`}</p>
          <h4 className="font-medium mt-2 mb-1">Participants</h4>
          {(session.session_participants ?? []).map((sp) => (
            <div key={sp.student_id} className="flex items-center justify-between border-b py-1">
              <span>{sp.students?.users?.full_name}</span>
              <Badge className={sp.attended ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                {sp.attended ? 'Attended' : 'Absent'}
              </Badge>
            </div>
          ))}
          {!session.session_participants?.length && <p className="text-muted-foreground">No participants.</p>}
        </div>
      ) : (
        <div><p><span className="font-medium">Student:</span> {session.students?.users?.full_name ?? '—'}</p></div>
      )}
      <Button variant="outline" onClick={onClose}>Close</Button>
    </div>
  );
}

function UpdateStatusModal({ session, onClose }) {
  const [status, setStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const update = useUpdateSessionStatus();
  const options = session.status === 'scheduled' ? ['ongoing', 'completed', 'cancelled'] : ['completed', 'cancelled'];
  async function handleSubmit(e) {
    e.preventDefault();
    if (!status) return;
    try {
      await update.mutateAsync({ sessionId: session.id, status, cancel_reason: status === 'cancelled' ? cancelReason : undefined });
      toast.success(`Session marked as ${status}`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update status');
    }
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium">New Status</label>
        <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={status} onChange={(e) => setStatus(e.target.value)} required>
          <option value="">Select status</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {status === 'cancelled' && (
        <div>
          <label className="text-sm font-medium">Cancel Reason</label>
          <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required />
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={update.isPending}>Update</Button>
      </div>
    </form>
  );
}

function CancelModal({ session, onClose }) {
  const [reason, setReason] = useState('');
  const cancel = useCancelSession();
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await cancel.mutateAsync({ sessionId: session.id, cancel_reason: reason });
      toast.success('Session cancelled');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel session');
    }
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Please provide a reason for cancellation.</p>
      <div>
        <label className="text-sm font-medium">Reason</label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Back</Button>
        <Button type="submit" variant="destructive" disabled={cancel.isPending}>Cancel Session</Button>
      </div>
    </form>
  );
}

function ReassignModal({ sessionType, assignmentId, currentProfessionalId, onClose }) {
  const isPT = sessionType === 'personal_tutor';
  const role = isPT ? 'teacher' : 'trainer';
  const { data: profsData, isLoading } = useProfessionals(role);
  const professionals = (profsData?.data ?? []).filter(p => p.id !== currentProfessionalId);
  const assignTeacher = useAssignTeacher();
  const assignTrainer = useAssignTrainer();
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  const filtered = professionals.filter(p =>
    (p.users?.full_name ?? p.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.users?.mobile ?? p.mobile ?? '').includes(search)
  );

  const handleAssign = async () => {
    if (!selectedId) return;
    try {
      if (isPT) {
        await assignTeacher.mutateAsync({ personal_tutor_id: assignmentId, teacher_professional_id: selectedId });
      } else {
        await assignTrainer.mutateAsync({ individual_participant_id: assignmentId, trainer_professional_id: selectedId });
      }
      toast.success(`${isPT ? 'Teacher' : 'Trainer'} reassigned successfully`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to reassign');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Reassign {isPT ? 'Teacher' : 'Trainer'}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
            <span className="text-amber-600 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800 leading-normal font-medium">
              Change in this can make changes for all the incoming future sessions.
            </p>
          </div>
          <p className="text-sm text-muted-foreground italic">Select a new {role} from the listing below.</p>
          <Input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />
          <div className="flex-1 overflow-y-auto border rounded-md divide-y">
            {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading Listing...</div> :
              filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{search ? 'No matches found.' : 'No other professionals available.'}</div> :
                filtered.map(p => (
                  <div
                    key={p.id}
                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/50 flex items-center justify-between transition-colors ${selectedId === p.id ? 'bg-primary/5' : ''}`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{p.users?.full_name ?? p.full_name}</span>
                      <span className="text-xs text-muted-foreground">{p.users?.mobile ?? p.mobile ?? 'No mobile'}</span>
                    </div>
                    {selectedId === p.id && <Badge className="bg-primary text-primary-foreground">Selected</Badge>}
                  </div>
                ))
            }
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2 bg-muted/10">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedId || assignTeacher.isPending || assignTrainer.isPending}>
            {(assignTeacher.isPending || assignTrainer.isPending) ? <Loader2 className="size-4 animate-spin" /> : 'Confirm Reassign'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PersonalTutorSessionForm({ onClose }) {
  const [form, setForm] = useState({ student_id: '', activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '', professional_id: '' });
  const [error, setError] = useState('');

  const { data: studentsData } = useStudentAssignments('personal_tutor');
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));
  const selectedStudent = students.find((s) => String(s.student_id) === String(form.student_id)) ?? null;

  const { data: subjectsData } = useStudentSubjects(form.student_id || undefined);
  const subjects = subjectsData?.data?.subjects ?? [];
  const termMonths = subjectsData?.data?.term_months ?? form.term_months ?? 3;
  const sessionCap = resolveSessionCap(subjectsData?.data);

  const hasTimeSlot = !!(form.start_date && form.start_time && form.end_time);

  // Notice we removed end_date from dependencies since backend calculates it
  const selectedSubject = subjects.find((s) => String(s.activity_id) === String(form.activity_id));
  const { data: teachersData, isFetching: teachersLoading } = useProfessionalsForSession({
    type: 'teacher',
    subject: selectedSubject?.activity_name,
    date: form.start_date || undefined,
    start_time: form.start_time || undefined,
    end_time: form.end_time || undefined,
  });
  const teachers = teachersData?.data ?? [];

  const preview = usePreviewSessions({
    session_type: 'personal_tutor',
    student_id: form.student_id,
    start_date: form.start_date,
    days_of_week: form.days_of_week.join(',')
  });

  const generate = useGenerateIndividualSessions();
  const canCreate = form.student_id && form.activity_id && form.start_date && form.days_of_week.length > 0 && form.start_time && form.end_time && form.professional_id && preview.isSuccess;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setError('');
    try {
      const payload = {
        session_type: 'personal_tutor',
        student_id: Number(form.student_id),
        professional_id: Number(form.professional_id),
        activity_id: Number(form.activity_id),
        start_date: form.start_date,
        term_months: termMonths,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
      };
      const result = await generate.mutateAsync(payload);
      const generated = result?.data?.generated ?? result?.generated ?? 0;
      const skipped = result?.data?.skipped ?? result?.skipped ?? 0;
      toast.success(
        skipped > 0
          ? `${generated} sessions created, ${skipped} skipped due to conflicts`
          : `${generated} sessions created`
      );
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.response?.data?.error_code ?? 'Something went wrong');
    }
  }

  function toggleDay(day) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium">Student</label>
        <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={form.student_id} onChange={(e) => setForm({ student_id: e.target.value, activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '', professional_id: '' })} required>
          <option value="">Select student</option>
          {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.student_name}</option>)}
        </select>
        {selectedStudent && (
          <div className="mt-1.5 text-xs text-muted-foreground border rounded p-2 bg-muted/30">
            {selectedStudent.student_mobile && <p>Mobile: <span className="font-medium text-foreground">{selectedStudent.student_mobile}</span></p>}
            {selectedStudent.standard && <p>Standard: <span className="font-medium text-foreground">{selectedStudent.standard}{selectedStudent.batch ? ` · ${selectedStudent.batch}` : ''}</span></p>}
          </div>
        )}
      </div>
      {form.student_id && (
        <div>
          <label className="text-sm font-medium">Subject</label>
          {subjects.length === 0 ? <p className="text-xs text-muted-foreground mt-1">No subjects found.</p> : (
            <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={form.activity_id} onChange={(e) => setForm((f) => ({ ...f, activity_id: e.target.value, professional_id: '' }))} required>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.activity_id} value={s.activity_id}>{s.activity_name}</option>)}
            </select>
          )}
        </div>
      )}
      {form.activity_id && (
        <div className="flex flex-col gap-4">
          <div className="bg-muted/30 border rounded-md p-3">
            <label className="text-sm font-medium text-foreground">Commission Cap</label>
            <Input type="number" value={String(sessionCap)} readOnly className="mt-1.5 bg-muted/50 cursor-not-allowed text-muted-foreground font-medium" />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">Used for internal commission calculation only. Corresponds to the {termMonths}-month term set for this student.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, professional_id: '' }))} required className="mt-1 w-full" />
          </div>
          <div>
            <label className="text-sm font-medium">Days of Week</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${form.days_of_week.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                    }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div><label className="text-sm font-medium block mb-1">Start Time</label><Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value, professional_id: '' }))} required /></div>
            <div><label className="text-sm font-medium block mb-1">End Time</label><Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value, professional_id: '' }))} required /></div>
          </div>
        </div>
      )}
      {hasTimeSlot && form.activity_id && (
        <div>
          <label className="text-sm font-medium">Teacher {hasTimeSlot && <span className="ml-1 text-xs text-muted-foreground">(availability shown)</span>}</label>
          {teachersLoading ? <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Loading…</p>
            : teachers.length === 0 ? <p className="text-xs text-muted-foreground mt-1">No teachers found.</p>
              : (
                <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={form.professional_id} onChange={(e) => setForm((f) => ({ ...f, professional_id: e.target.value }))} required>
                  <option value="">Select teacher</option>
                  {teachers.map((t) => {
                    const name = t.name ?? t.users?.full_name ?? `ID ${t.id}`;
                    const mobile = t.mobile ?? t.users?.mobile ?? '';
                    const available = t.available ?? t.is_available ?? true;
                    return <option key={t.id} value={t.id} disabled={hasTimeSlot && !available}>{hasTimeSlot ? (available ? '🟢 ' : '🔴 ') : ''}{name}{mobile ? ` — ${mobile}` : ''}</option>;
                  })}
                </select>
              )}
        </div>
      )}

      {/* Preview Section */}
      {preview.isFetching && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Calculating session dates...</p>}
      {preview.isSuccess && preview.data?.data && form.days_of_week.length > 0 && form.start_date && (
        <div className="border rounded-md p-3 bg-blue-50/30">
          <h4 className="text-sm font-semibold mb-3 flex items-center justify-between text-blue-900">
            <span>Projection (Term: {preview.data.data.term_months} Months)</span>
            <span>Total Sessions: {preview.data.data.total_sessions}</span>
          </h4>
          <div className="space-y-2">
            {preview.data.data.months?.map(m => (
              <div key={m.month_number} className="flex justify-between items-center text-xs text-blue-800">
                <span>{m.month_label} <span className="text-[10px] text-blue-600/70 ml-1">({new Date(m.start).toLocaleDateString()} – {new Date(m.end).toLocaleDateString()})</span></span>
                <span className="font-medium bg-blue-100 px-1.5 rounded">{m.sessions_count} slots</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end mt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={generate.isPending || !canCreate || preview.isFetching}>Create</Button>
      </div>
    </form>
  );
}

function IndividualCoachingSessionForm({ onClose }) {
  const [form, setForm] = useState({ student_id: '', activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '', professional_id: '' });
  const [error, setError] = useState('');
  const { data: studentsData } = useStudentAssignments('individual_coaching');
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));
  const selectedStudent = students.find((s) => String(s.student_id) === String(form.student_id)) ?? null;
  const { data: activitiesData, isFetching: activitiesLoading } = useStudentActivities(form.student_id || undefined);
  const rawActivities = activitiesData?.data?.activities ?? [];
  const activities = rawActivities.map((a) => ({ activity_id: a.activity_id ?? a.id, activity_name: a.activity_name ?? a.name }));
  const termMonths = activitiesData?.data?.term_months ?? form.term_months ?? 3;
  const sessionCap = resolveSessionCap(activitiesData?.data);

  const hasTimeSlot = !!(form.start_date && form.start_time && form.end_time);

  const selectedActivity = activities.find((a) => String(a.activity_id) === String(form.activity_id));
  const { data: trainersData, isFetching: trainersLoading } = useProfessionalsForSession({
    type: 'trainer',
    activity: selectedActivity?.activity_name,
    date: form.start_date || undefined,
    start_time: form.start_time || undefined,
    end_time: form.end_time || undefined,
  });
  const trainers = trainersData?.data ?? [];

  const preview = usePreviewSessions({
    session_type: 'individual_coaching',
    student_id: form.student_id,
    start_date: form.start_date,
    days_of_week: form.days_of_week.join(',')
  });

  const generate = useGenerateIndividualSessions();
  const canCreate = form.student_id && form.activity_id && form.start_date && form.days_of_week.length > 0 && form.start_time && form.end_time && form.professional_id && preview.isSuccess;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setError('');
    try {
      const payload = {
        session_type: 'individual_coaching',
        student_id: Number(form.student_id),
        professional_id: Number(form.professional_id),
        activity_id: Number(form.activity_id),
        start_date: form.start_date,
        term_months: termMonths,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
      };
      const result = await generate.mutateAsync(payload);
      const generated = result?.data?.generated ?? result?.generated ?? 0;
      const skipped = result?.data?.skipped ?? result?.skipped ?? 0;
      toast.success(
        skipped > 0
          ? `${generated} sessions created, ${skipped} skipped due to conflicts`
          : `${generated} sessions created`
      );
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.response?.data?.error_code ?? 'Something went wrong');
    }
  }

  function toggleDay(day) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium">Student</label>
        <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={form.student_id} onChange={(e) => setForm({ student_id: e.target.value, activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '', professional_id: '' })} required>
          <option value="">Select student</option>
          {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.student_name}</option>)}
        </select>
        {selectedStudent && (
          <div className="mt-1.5 text-xs text-muted-foreground border rounded p-2 bg-muted/30">
            {selectedStudent.student_mobile && <p>Mobile: {selectedStudent.student_mobile}</p>}
            {selectedStudent.society && <p>Society: {selectedStudent.society}{selectedStudent.flat_no ? ` · Flat ${selectedStudent.flat_no}` : ''}</p>}
          </div>
        )}
      </div>
      {form.student_id && (
        <div>
          <label className="text-sm font-medium">Activity</label>
          {activitiesLoading ? <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Loading…</p>
            : activities.length === 0 ? <p className="text-xs text-muted-foreground mt-1">No activities found.</p>
              : (
                <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={form.activity_id} onChange={(e) => setForm((f) => ({ ...f, activity_id: e.target.value, professional_id: '' }))} required>
                  <option value="">Select activity</option>
                  {activities.map((a) => <option key={a.activity_id} value={a.activity_id}>{a.activity_name}</option>)}
                </select>
              )}
        </div>
      )}
      {form.activity_id && (
        <div className="flex flex-col gap-4">
          <div className="bg-muted/30 border rounded-md p-3">
            <label className="text-sm font-medium text-foreground">Commission Cap</label>
            <Input type="number" value={String(sessionCap)} readOnly className="mt-1.5 bg-muted/50 cursor-not-allowed text-muted-foreground font-medium" />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">Used for internal commission calculation only. Corresponds to the {termMonths}-month term set for this student.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, professional_id: '' }))} required className="mt-1 w-full" />
          </div>
          <div>
            <label className="text-sm font-medium">Days of Week</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${form.days_of_week.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                    }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div><label className="text-sm font-medium block mb-1">Start Time</label><Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value, professional_id: '' }))} required /></div>
            <div><label className="text-sm font-medium block mb-1">End Time</label><Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value, professional_id: '' }))} required /></div>
          </div>
        </div>
      )}
      {hasTimeSlot && form.activity_id && (
        <div>
          <label className="text-sm font-medium">Trainer <span className="ml-1 text-xs text-muted-foreground">(availability shown)</span></label>
          {trainersLoading ? <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Loading…</p>
            : trainers.length === 0 ? <p className="text-xs text-muted-foreground mt-1">No trainers found.</p>
              : (
                <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={form.professional_id} onChange={(e) => setForm((f) => ({ ...f, professional_id: e.target.value }))} required>
                  <option value="">Select trainer</option>
                  {trainers.map((t) => {
                    const name = t.name ?? t.users?.full_name ?? `ID ${t.id}`;
                    const mobile = t.mobile ?? t.users?.mobile ?? '';
                    const available = t.available ?? t.is_available ?? true;
                    return <option key={t.id} value={t.id}>{available ? '🟢 ' : '🔴 '}{name}{mobile ? ` — ${mobile}` : ''}</option>;
                  })}
                </select>
              )}
        </div>
      )}
      {/* Preview Section */}
      {preview.isFetching && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Calculating session dates...</p>}
      {preview.isSuccess && preview.data?.data && form.days_of_week.length > 0 && form.start_date && (
        <div className="border rounded-md p-3 bg-blue-50/30">
          <h4 className="text-sm font-semibold mb-3 flex items-center justify-between text-blue-900">
            <span>Projection (Term: {preview.data.data.term_months} Months)</span>
            <span>Total Sessions: {preview.data.data.total_sessions}</span>
          </h4>
          <div className="space-y-2">
            {preview.data.data.months?.map(m => (
              <div key={m.month_number} className="flex justify-between items-center text-xs text-blue-800">
                <span>{m.month_label} <span className="text-[10px] text-blue-600/70 ml-1">({new Date(m.start).toLocaleDateString()} – {new Date(m.end).toLocaleDateString()})</span></span>
                <span className="font-medium bg-blue-100 px-1.5 rounded">{m.sessions_count} slots</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end mt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={generate.isPending || !canCreate || preview.isFetching}>Create</Button>
      </div>
    </form>
  );
}

function SessionRow({ session, sessionType }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    scheduled_date: session.scheduled_date ? new Date(session.scheduled_date).toISOString().slice(0, 10) : '',
    start_time: session.start_time ? formatTime(session.start_time) : '',
    end_time: session.end_time ? formatTime(session.end_time) : '',
  });
  const [cancelReason, setCancelReason] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const reschedule = useRescheduleSession();
  const cancel = useCancelSession();

  const type = sessionType || session.session_type;
  const isIndividual = type === 'individual_coaching' || type === 'personal_tutor';
  const assignmentId = session.personal_tutor_id || session.individual_participant_id || session.batch_id;

  async function handleReschedule(e) {
    e.preventDefault();
    try {
      await reschedule.mutateAsync({ sessionId: session.id, ...rescheduleForm });
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
      toast.success('Session cancelled');
      setCancelling(false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to cancel');
    }
  }

  const canEdit = session.status === 'scheduled' || session.status === 'ongoing';

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-3 py-2 text-muted-foreground text-xs">#{session.id}</td>
        <td className="px-3 py-2 text-xs">{session.scheduled_date ? new Date(session.scheduled_date).toLocaleDateString() : '—'}</td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">{formatTime(session.start_time)}–{formatTime(session.end_time)}</td>
        <td className="px-3 py-2">
          <Badge className={`text-xs ${SESSION_STATUS_COLORS[session.status] ?? ''}`}>{session.status}</Badge>
        </td>
        <td className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {session.professionals?.users?.full_name ?? 'Somnath Trainer (Dummy)'}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            {canEdit && !rescheduling && !cancelling && (
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setRescheduling(true)}>Reschedule</Button>
            )}
            {isIndividual && canEdit && !rescheduling && !cancelling && (
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setReassigning(true)}>Reassign Professional</Button>
            )}
            {session.status === 'scheduled' && !rescheduling && !cancelling && (
              <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => setCancelling(true)}>Cancel</Button>
            )}
            {(rescheduling || cancelling) && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setRescheduling(false); setCancelling(false); }}>✕</Button>
            )}
          </div>
        </td>
      </tr>
      {reassigning && isIndividual && (
        <ReassignModal
          sessionType={session.session_type}
          assignmentId={assignmentId}
          currentProfessionalId={session.professional_id}
          onClose={() => setReassigning(false)}
        />
      )}
      {/* Inline reschedule form */}
      {rescheduling && (
        <tr className="border-b bg-blue-50/50">
          <td colSpan={6} className="px-3 py-2">
            <form onSubmit={handleReschedule} className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-xs font-medium block mb-0.5">New Date</label>
                <Input type="date" className="h-7 text-xs w-36" value={rescheduleForm.scheduled_date}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, scheduled_date: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-0.5">Start Time</label>
                <Input type="time" className="h-7 text-xs w-28" value={rescheduleForm.start_time}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, start_time: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-0.5">End Time</label>
                <Input type="time" className="h-7 text-xs w-28" value={rescheduleForm.end_time}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, end_time: e.target.value }))} required />
              </div>
              <Button type="submit" size="sm" className="h-7 text-xs" disabled={reschedule.isPending}>
                {reschedule.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
              </Button>
            </form>
          </td>
        </tr>
      )}
      {/* Inline cancel form */}
      {cancelling && (
        <tr className="border-b bg-red-50/50">
          <td colSpan={6} className="px-3 py-2">
            <form onSubmit={handleCancel} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium block mb-0.5">Reason (required)</label>
                <Input className="h-7 text-xs" placeholder="Why is this session being cancelled?" value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)} required />
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

function StudentSessionCard({ student, sessionType }) {
  const [expanded, setExpanded] = useState(false);
  const generate = useGenerateIndividualSessions();
  const studentId = student.id ?? student.student_id;
  const { data, isLoading } = useStudentBatches(expanded ? studentId : null);
  const groups = data?.data ?? [];
  const [reassigningGroup, setReassigningGroup] = useState(null);

  const isPT = sessionType === 'personal_tutor';
  const subLabel = isPT ? student.teacher_for : student.activity;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Student row header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-6 flex-1 py-1">
          <div className="flex flex-col gap-0.5 min-w-[180px]">
            <span className="font-bold text-base text-foreground">{student.student_name}</span>
            <div className="flex items-center gap-2">
              {student.student_mobile && <span className="text-xs text-muted-foreground tabular-nums font-medium">{student.student_mobile}</span>}
              {subLabel && <Badge variant="outline" className="text-[10px] h-4.5 bg-background font-medium px-1.5 uppercase tracking-wide">{subLabel}</Badge>}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 border-l pl-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Cycle Range</span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {(student.start_date || student.start || '—')} → {(student.end_date || student.end || '—')}
              </span>
            </div>

            <div className="flex flex-col min-w-[120px]">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Alert Message</span>
              {(() => {
                const endDateRaw = student.end_date || student.end;
                if (!endDateRaw) return <span className="text-[11px] text-muted-foreground italic">No Cycle Set</span>;

                const now = new Date();
                const end = new Date(endDateRaw);
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                const diff = Math.round((endDate - today) / (1000 * 60 * 60 * 24));

                if (diff <= 7 && diff >= 0) {
                  return (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-tighter">
                        {diff === 0 ? 'Ending Today!' : `${diff} days remaining`}
                      </span>
                    </div>
                  );
                }
                if (diff < 0) return <Badge variant="secondary" className="text-[10px] font-black h-6 bg-red-100 text-red-700 border-red-200 uppercase px-3">Expired</Badge>;
                return <Badge variant="secondary" className="text-[10px] font-black h-6 bg-green-100 text-green-700 border-green-200 uppercase px-3">Healthy Cycle</Badge>;
              })()}
            </div>
          </div>

        </div>
        <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded: batch groups */}
      {expanded && (
        <div className="divide-y">
          {isLoading && (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Loading sessions…
            </div>
          )}
          {!isLoading && groups.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">No sessions found for this student.</p>
          )}
          {groups.map((group, gi) => (
            <div key={gi} className="px-4 py-3 flex flex-col gap-2">
              {/* Group header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{group.batch_label ?? group.activity_name}</span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xs text-muted-foreground">{group.professional_name}</span>
                    {(isPT || sessionType === 'individual_coaching') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] text-primary border-primary/30 hover:bg-primary/5 ml-2 flex items-center gap-1.5"
                        onClick={() => setReassigningGroup(group)}
                      >
                        <RefreshCw className="size-2.5" />
                        Reassign Professional
                      </Button>
                    )}
                  </div>
                  {group.membership && (
                    <span className="text-xs text-muted-foreground">
                      {group.membership.session_days_of_week?.join(', ')}
                      {group.membership.session_start_time ? ` · ${formatTime(group.membership.session_start_time)}–${formatTime(group.membership.session_end_time)}` : ''}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-700 font-medium">{group.summary?.completed ?? 0} done</span>
                  <span className="text-amber-700 font-medium">{group.summary?.upcoming ?? 0} upcoming</span>
                  {(group.summary?.cancelled ?? 0) > 0 && <span className="text-red-600 font-medium">{group.summary.cancelled} cancelled</span>}
                  {group.membership?.commission_cap != null && <span className="text-muted-foreground" title="Used for internal commission calculation only">Commission Cap: {group.membership.commission_cap}</span>}
                </div>
              </div>
              {reassigningGroup === group && (
                <ReassignModal
                  sessionType={sessionType}
                  assignmentId={group.id ?? group.personal_tutor_id ?? group.individual_participant_id}
                  currentProfessionalId={group.professional_id}
                  onClose={() => setReassigningGroup(null)}
                />
              )}
              {/* Sessions table */}
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-3 py-1.5 text-xs">ID</th>
                      <th className="px-3 py-1.5 text-xs">Date</th>
                      <th className="px-3 py-1.5 text-xs">Time</th>
                      <th className="px-3 py-1.5 text-xs">Status</th>
                      <th className="px-3 py-1.5 text-xs">Handled By</th>
                      <th className="px-3 py-1.5 text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(group.sessions ?? []).length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-3 text-center text-xs text-muted-foreground">No sessions.</td></tr>
                    )}
                    {(group.sessions ?? []).map((session) => (
                      <SessionRow key={session.id} session={session} sessionType={sessionType} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionsTable({ sessionType }) {
  const service = sessionType === 'personal_tutor' ? 'personal_tutor' : 'individual_coaching';
  const { data: studentsData, isLoading: studentsLoading } = useStudentAssignments(service);
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? students.filter((s) => s.student_name?.toLowerCase().includes(search.toLowerCase()))
    : students;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">
          {sessionType === 'personal_tutor' ? 'Personal Tutor' : 'Individual Coaching'} Sessions
        </h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>Create Session</Button>
        </div>
      </div>

      {/* Search */}
      <Input placeholder="Search student…" className="h-8 text-sm w-56" value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* Student cards */}
      {studentsLoading ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((student) => (
            <StudentSessionCard key={student.student_id} student={student} sessionType={sessionType} />
          ))}
        </div>
      )}

      {/* Create session slide-over */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="w-[460px] bg-background border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Create Session</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sessionType === 'personal_tutor'
                ? <PersonalTutorSessionForm onClose={() => setShowCreate(false)} />
                : <IndividualCoachingSessionForm onClose={() => setShowCreate(false)} />}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default function Batches({ defaultTab = 'group_coaching' }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">Batches</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="group_coaching">Group Coaching</TabsTrigger>
          <TabsTrigger value="school_student">School</TabsTrigger>
          <TabsTrigger value="individual_coaching">Individual Coaching</TabsTrigger>
          <TabsTrigger value="personal_tutor">Personal Tutor</TabsTrigger>
        </TabsList>
        <TabsContent value="group_coaching" className="mt-4">
          <BatchTable batchType="group_coaching" />
        </TabsContent>
        <TabsContent value="school_student" className="mt-4">
          <BatchTable batchType="school_student" />
        </TabsContent>
        <TabsContent value="individual_coaching" className="mt-4">
          <SessionsTable sessionType="individual_coaching" />
        </TabsContent>
        <TabsContent value="personal_tutor" className="mt-4">
          <SessionsTable sessionType="personal_tutor" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
