import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import {
  useSessions,
  useSession,
  useCreateSession,
  useUpdateSessionStatus,
  useCancelSession,
  useStudentAssignments,
  useProfessionals,
  useStudentSubjects,
  useStudentActivities,
  useProfessionalsForSession,
  useGenerateIndividualSessions,
  useReassignSingleSession,
  useReassignAllFutureSessions,
} from '@/hooks/useAdmin';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns true if the session's end time has already passed but status is still ongoing
function isStaleOngoing(session) {
  if (session.status !== 'ongoing') return false;
  const dateStr = session.scheduled_date
    ? new Date(session.scheduled_date).toISOString().slice(0, 10)
    : null;
  if (!dateStr || !session.end_time) return false;
  // end_time comes as "1970-01-01T..." — extract HH:MM
  const endHHMM = new Date(session.end_time).toTimeString().slice(0, 5);
  const sessionEnd = new Date(`${dateStr}T${endHHMM}:00`);
  return new Date() > sessionEnd;
}

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

function formatTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString();
}

const TYPE_BADGE = {
  group_coaching: 'bg-blue-100 text-blue-800',
  school_student: 'bg-indigo-100 text-indigo-800',
  personal_tutor: 'bg-purple-100 text-purple-800',
  individual_coaching: 'bg-orange-100 text-orange-800',
};

const STATUS_BADGE = {
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
          <Badge className={TYPE_BADGE[session.session_type]}>{session.session_type}</Badge>
          <Badge className={STATUS_BADGE[session.status]}>{session.status}</Badge>
        </div>
        <p><span className="font-medium">Date:</span> {formatDate(session.scheduled_date)}</p>
        <p><span className="font-medium">Time:</span> {formatTime(session.start_time)}–{formatTime(session.end_time)}</p>
        <p><span className="font-medium">Professional:</span> {session.professionals?.users?.full_name ?? '—'}</p>
        {session.cancel_reason && (
          <p><span className="font-medium text-red-600">Cancel reason:</span> {session.cancel_reason}</p>
        )}
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
        <div>
          <p><span className="font-medium">Student:</span> {session.students?.users?.full_name ?? '—'}</p>
        </div>
      )}

      <Button variant="outline" onClick={onClose}>Close</Button>
    </div>
  );
}

function UpdateStatusModal({ session, onClose }) {
  const [status, setStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const update = useUpdateSessionStatus();

  const options = session.status === 'scheduled'
    ? ['ongoing', 'completed', 'cancelled']
    : ['completed', 'cancelled'];

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
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
        >
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

// ── Reassign Professional Modal ──────────────────────────────────────────────

/**
 * Props:
 *   session    — the sessions row being acted on (has .id, .session_type, .student_id, .professionals)
 *   onClose    — close callback
 *
 * Shows two options:
 *   1. Reassign only THIS session
 *   2. Reassign all future scheduled sessions for this student
 *
 * Fetches available professionals (teachers for PT, trainers for IC).
 */
function ReassignProfessionalModal({ session, onClose }) {
  const [scope, setScope] = useState('single'); // 'single' | 'all'
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  const isPT = session.session_type === 'personal_tutor';
  const profType = isPT ? 'teacher' : 'trainer';

  const { data: profsData, isLoading } = useQuery({
    queryKey: ['professionals', 'available', profType],
    queryFn: () => api.get('/admin/professionals/available', { params: { type: profType } }).then(r => r.data),
  });

  const reassignSingle = useReassignSingleSession();
  const reassignAll = useReassignAllFutureSessions();

  const professionals = (profsData?.data ?? []).filter(
    p => p.professional_id !== session.professionals?.id
  );

  const filtered = professionals.filter(p => {
    const name = (p.users?.full_name ?? p.full_name ?? '').toLowerCase();
    const mobile = p.users?.mobile ?? p.mobile ?? '';
    return name.includes(search.toLowerCase()) || mobile.includes(search);
  });

  async function handleSubmit() {
    if (!selectedId) return;
    try {
      if (scope === 'single') {
        await reassignSingle.mutateAsync({ sessionId: session.id, new_professional_id: Number(selectedId) });
        toast.success('Session reassigned successfully');
      } else {
        await reassignAll.mutateAsync({
          session_type: session.session_type,
          student_id: session.student_id,
          new_professional_id: Number(selectedId),
        });
        toast.success('All future sessions reassigned successfully');
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to reassign');
    }
  }

  const isPending = reassignSingle.isPending || reassignAll.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Scope selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setScope('single')}
          className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${scope === 'single' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
        >
          This session only
        </button>
        {session.student_id && (
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${scope === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >
            All future sessions
          </button>
        )}
      </div>

      {scope === 'single' && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
          <span className="text-blue-500 mt-0.5 text-base">ℹ️</span>
          <p className="text-xs text-blue-800 leading-normal">
            <strong>Temporary substitution only.</strong> Only this one session is reassigned.
            The original {profType}'s commission cycle is unchanged — their completed sessions are still settled as normal.
            The substitute is credited only for this session via the session record.
          </p>
        </div>
      )}
      {scope === 'all' && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <span className="text-amber-600 mt-0.5 text-base">⚠️</span>
          <p className="text-xs text-amber-800 leading-normal">
            This will reassign <strong>all upcoming scheduled sessions</strong> for this student to the new {profType}.
            The old {profType}'s commission assignment will be deactivated — their completed sessions will still be settled at the next settlement run.
            A new commission cycle starts for the new {profType} from today.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Current: <span className="font-medium text-foreground">{session.professionals?.users?.full_name ?? '—'}</span>
      </p>

      <Input
        placeholder={`Search ${profType} by name or mobile…`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-9"
      />

      <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No other {profType}s available.</div>
        ) : (
          filtered.map(p => {
            const id = p.professional_id ?? p.id;
            const name = p.users?.full_name ?? p.full_name ?? '—';
            const mobile = p.users?.mobile ?? p.mobile ?? '';
            const detail = isPT ? (p.details?.subject ?? p.subject ?? '') : (p.details?.category ?? p.category ?? '');
            return (
              <div
                key={id}
                onClick={() => setSelectedId(String(id))}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors ${String(selectedId) === String(id) ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{mobile}{detail ? ` · ${detail}` : ''}</p>
                </div>
                {String(selectedId) === String(id) && <span className="text-primary text-xs font-semibold">Selected</span>}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!selectedId || isPending}>
          {isPending && <Loader2 className="size-3 mr-1 animate-spin" />}
          Reassign {scope === 'all' ? 'All Future' : 'This Session'}
        </Button>
      </div>
    </div>
  );
}

// ── Personal Tutor session form (new step-based flow) ────────────────────────

function PersonalTutorForm({ onClose }) {
  const [form, setForm] = useState({
    student_id: '',
    activity_id: '',
    start_date: '',
    days_of_week: [],
    start_time: '',
    end_time: '',
    professional_id: '',
  });
  const [error, setError] = useState('');

  const { data: studentsData } = useStudentAssignments('personal_tutor');
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));
  const selectedStudent = students.find((s) => String(s.student_id) === String(form.student_id)) ?? null;

  const { data: subjectsData } = useStudentSubjects(form.student_id || undefined);
  const subjects = subjectsData?.data?.subjects ?? [];
  const termMonths = subjectsData?.data?.term_months ?? form.term_months ?? 3;
  const sessionCap = resolveSessionCap(subjectsData?.data);

  const hasTimeSlot = !!(form.start_date && form.start_time && form.end_time);
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
    console.log('[PT] Generating sessions — payload:', payload);
    try {
      const result = await generate.mutateAsync(payload);
      console.log('[PT] Sessions generated successfully:', result);
      const generated = result?.data?.generated ?? result?.generated ?? 0;
      const skipped = result?.data?.skipped ?? result?.skipped ?? 0;
      toast.success(
        skipped > 0
          ? `${generated} sessions created, ${skipped} skipped due to conflicts`
          : `${generated} sessions created`
      );
      onClose();
    } catch (err) {
      console.error('[PT] Session generation failed:', err?.response?.data ?? err);
      const code = err?.response?.data?.error ?? err?.response?.data?.error_code;
      setError(err?.response?.data?.message ?? code ?? 'Something went wrong');
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
      {/* Step 1 — Student */}
      <div>
        <label className="text-sm font-medium">Student</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={form.student_id}
          onChange={(e) => setForm({ student_id: e.target.value, activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '', professional_id: '' })}
          required
        >
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.student_id} value={s.student_id}>{s.student_name}</option>
          ))}
        </select>
        {selectedStudent && (
          <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5 border rounded p-2 bg-muted/30">
            {selectedStudent.student_mobile && <p>Mobile: <span className="font-medium text-foreground">{selectedStudent.student_mobile}</span></p>}
            {selectedStudent.standard && <p>Standard: <span className="font-medium text-foreground">{selectedStudent.standard}{selectedStudent.batch ? ` · ${selectedStudent.batch}` : ''}</span></p>}
          </div>
        )}
      </div>

      {/* Step 2 — Subject (only after student selected) */}
      {form.student_id && (
        <div>
          <label className="text-sm font-medium">Subject</label>
          {subjects.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">No subjects found for this student.</p>
          ) : (
            <select
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
              value={form.activity_id}
              onChange={(e) => setForm((f) => ({ ...f, activity_id: e.target.value, professional_id: '' }))}
              required
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.activity_id} value={s.activity_id}>{s.activity_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Step 3 — Date + Time + Days (only after subject selected) */}
      {form.activity_id && (
        <div className="flex flex-col gap-4">
          <div className="bg-muted/30 border rounded-md p-3">
            <label className="text-sm font-medium text-foreground">Commission Cap</label>
            <Input type="number" value={String(sessionCap)} readOnly className="mt-1.5 bg-muted/50 cursor-not-allowed text-muted-foreground font-medium" />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">Used for internal commission calculation only. Corresponds to the {termMonths}-month term set for this student.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={form.start_date}
              min={todayLocal()}
              onChange={(e) => { const v = e.target.value; if (v && v < todayLocal()) return; setForm((f) => ({ ...f, start_date: v, professional_id: '' })); }}
              required
              className="mt-1 w-full"
            />
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
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value, professional_id: '' }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value, professional_id: '' }))}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Teacher (only after date+time filled) */}
      {hasTimeSlot && form.activity_id && (
        <div>
          <label className="text-sm font-medium">
            Teacher
            {hasTimeSlot && <span className="ml-1 text-xs text-muted-foreground">(availability shown)</span>}
          </label>
          {teachersLoading ? (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Loading teachers…</p>
          ) : teachers.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">No teachers found for this subject.</p>
          ) : (
            <select
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
              value={form.professional_id}
              onChange={(e) => setForm((f) => ({ ...f, professional_id: e.target.value }))}
              required
            >
              <option value="">Select teacher</option>
              {teachers.map((t) => {
                // Backend returns getProfessionalsForSession shape: { id, users, teachers[], is_available }
                // API doc shape: { id, name, mobile, subject, available } — handle both
                const name = t.name ?? t.users?.full_name ?? `ID ${t.id}`;
                const mobile = t.mobile ?? t.users?.mobile ?? '';
                const subject = t.subject ?? t.teachers?.[0]?.subject ?? '';
                const available = t.available ?? t.is_available ?? true;
                const dot = hasTimeSlot ? (available ? '🟢 ' : '🔴 ') : '';
                const label = `${dot}${name}${mobile ? ` — ${mobile}` : ''}${subject ? ` (${subject})` : ''}`;
                return (
                  <option key={t.id} value={t.id} disabled={hasTimeSlot && !available}>
                    {label}
                  </option>
                );
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

// ── Individual Coaching session form ─────────────────────────────────────────

function IndividualCoachingForm({ onClose }) {
  const [form, setForm] = useState({
    student_id: '',
    activity_id: '',
    start_date: '',
    end_date: '',
    days_of_week: [],
    start_time: '',
    end_time: '',
    professional_id: '',
  });
  const [error, setError] = useState('');

  const { data: studentsData, isError: studentsError, error: studentsFetchError } = useStudentAssignments('individual_coaching');
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));
  console.log('[IC Form] studentsData:', studentsData, 'error:', studentsFetchError);
  const selectedStudent = students.find((s) => String(s.student_id) === String(form.student_id)) ?? null;

  const { data: activitiesData, isFetching: activitiesLoading } = useStudentActivities(form.student_id || undefined);
  const rawActivities = activitiesData?.data?.activities ?? [];
  console.log('[IC Form] activitiesData for student', form.student_id, ':', activitiesData);
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
    const payload = {
      session_type: 'individual_coaching',
      student_id: Number(form.student_id),
      professional_id: Number(form.professional_id),
      start_date: form.start_date,
      term_months: termMonths,
      days_of_week: form.days_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      activity_id: Number(form.activity_id),
    };
    console.log('[IC] Generating sessions — payload:', payload);
    try {
      const result = await generate.mutateAsync(payload);
      console.log('[IC] Sessions generated successfully:', result);
      const generated = result?.data?.generated ?? result?.generated ?? 0;
      const skipped = result?.data?.skipped ?? result?.skipped ?? 0;
      toast.success(
        skipped > 0
          ? `${generated} sessions created, ${skipped} skipped due to conflicts`
          : `${generated} sessions created`
      );
      onClose();
    } catch (err) {
      console.error('[IC] Session generation failed:', err?.response?.data ?? err);
      const code = err?.response?.data?.error ?? err?.response?.data?.error_code;
      setError(err?.response?.data?.message ?? code ?? 'Something went wrong');
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
      {/* Step 1 — Student */}
      <div>
        <label className="text-sm font-medium">Student</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={form.student_id}
          onChange={(e) => setForm({ student_id: e.target.value, activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '', professional_id: '' })}
          required
        >
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.student_id} value={s.student_id}>{s.student_name}</option>
          ))}
        </select>
        {selectedStudent && (
          <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5 border rounded p-2 bg-muted/30">
            {selectedStudent.student_mobile && <p>Mobile: <span className="font-medium text-foreground">{selectedStudent.student_mobile}</span></p>}
            {selectedStudent.society && <p>Society: <span className="font-medium text-foreground">{selectedStudent.society}{selectedStudent.flat_no ? ` · Flat ${selectedStudent.flat_no}` : ''}</span></p>}
          </div>
        )}
      </div>

      {/* Step 2 — Activity */}
      {form.student_id && (
        <div>
          <label className="text-sm font-medium">Activity</label>
          {activitiesLoading ? (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Loading activities…</p>
          ) : activities.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">No activities found for this student.</p>
          ) : (
            <select
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
              value={form.activity_id}
              onChange={(e) => setForm((f) => ({ ...f, activity_id: e.target.value, professional_id: '' }))}
              required
            >
              <option value="">Select activity</option>
              {activities.map((a) => (
                <option key={a.activity_id} value={a.activity_id}>{a.activity_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Step 3 — Date + Time + Days */}
      {form.activity_id && (
        <div className="flex flex-col gap-4">
          <div className="bg-muted/30 border rounded-md p-3">
            <label className="text-sm font-medium text-foreground">Commission Cap</label>
            <Input type="number" value={String(sessionCap)} readOnly className="mt-1.5 bg-muted/50 cursor-not-allowed text-muted-foreground font-medium" />
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">Used for internal commission calculation only. Corresponds to the {termMonths}-month term set for this student.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Start Date</label>
            <Input type="date" value={form.start_date} min={todayLocal()} onChange={(e) => { const v = e.target.value; if (v && v < todayLocal()) return; setForm((f) => ({ ...f, start_date: v, professional_id: '' })); }} required className="mt-1 w-full" />
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

          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="text-sm font-medium">Start Time</label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value, professional_id: '' }))} required />
            </div>
            <div>
              <label className="text-sm font-medium">End Time</label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value, professional_id: '' }))} required />
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Trainer (only after date+time filled) */}
      {hasTimeSlot && form.activity_id && (
        <div>
          <label className="text-sm font-medium">Trainer <span className="ml-1 text-xs text-muted-foreground">(availability shown)</span></label>
          {trainersLoading ? (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Loading trainers…</p>
          ) : trainers.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">No trainers found for this activity.</p>
          ) : (
            <select
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
              value={form.professional_id}
              onChange={(e) => setForm((f) => ({ ...f, professional_id: e.target.value }))}
              required
            >
              <option value="">Select trainer</option>
              {trainers.map((t) => {
                const name = t.name ?? t.users?.full_name ?? `ID ${t.id}`;
                const mobile = t.mobile ?? t.users?.mobile ?? '';
                const available = t.available ?? t.is_available ?? true;
                const dot = available ? '🟢 ' : '🔴 ';
                return (
                  <option key={t.id} value={t.id}>
                    {dot}{name}{mobile ? ` — ${mobile}` : ''}
                  </option>
                );
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

// ── Auto-Generate Sessions form (IC / PT) ────────────────────────────────────

function AutoGenerateForm({ onClose }) {
  const [sessionType, setSessionType] = useState('personal_tutor');
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

  const { data: studentsData } = useStudentAssignments(isPT ? 'personal_tutor' : 'individual_coaching');
  const students = (studentsData?.data ?? []).map((s) => ({ ...s, student_id: s.id ?? s.student_id }));
  const selectedStudent = students.find((s) => String(s.student_id) === String(form.student_id)) ?? null;

  // We reuse hooks based on sessionType
  const { data: icActivities } = useStudentActivities(!isPT && form.student_id ? form.student_id : undefined);
  const { data: ptSubjects } = useStudentSubjects(isPT && form.student_id ? form.student_id : undefined);

  const termMonths = isPT
    ? (ptSubjects?.data?.term_months ?? 3)
    : (icActivities?.data?.term_months ?? 3);

  const sessionCap = isPT
    ? resolveSessionCap(ptSubjects?.data)
    : resolveSessionCap(icActivities?.data);

  const preview = usePreviewSessions({
    session_type: sessionType,
    student_id: form.student_id,
    start_date: form.start_date,
    days_of_week: form.days_of_week.join(',')
  });


  const { data: profData } = useQuery({
    queryKey: ['professionals-available', profType],
    queryFn: () => api.get('/admin/professionals/available', { params: { type: profType } }).then((r) => r.data),
  });
  const professionals = profData?.data ?? [];

  const { data: activitiesData } = useQuery({
    queryKey: ['activities-for-generate', sessionType],
    queryFn: () =>
      api.get('/admin/activities', { params: { coaching_type: sessionType } }).then((r) => r.data),
    enabled: !isPT,
  });
  const activities = activitiesData?.data ?? [];

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

  // Reset form when session type changes
  function handleTypeChange(type) {
    setSessionType(type);
    setForm({ student_id: '', professional_id: '', activity_id: '', start_date: '', days_of_week: [], start_time: '', end_time: '' });
    setResult(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (form.days_of_week.length === 0) { setError('Select at least one day of week'); return; }
    try {
      const payload = {
        session_type: sessionType,
        student_id: Number(form.student_id),
        professional_id: Number(form.professional_id),
        start_date: form.start_date,
        term_months: termMonths,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        ...(!isPT && form.activity_id ? { activity_id: Number(form.activity_id) } : { activity_id: Number(form.activity_id) }), // Activity should always send if PT also uses it, wait PT uses it too. We ensure both forms use activity_id seamlessly.
      };
      if (isPT && form.activity_id) payload.activity_id = Number(form.activity_id);
      const res = await generate.mutateAsync(payload);
      setResult(res);
      const generated = res?.data?.generated ?? res?.generated ?? 0;
      const skipped = res?.data?.skipped ?? res?.skipped ?? 0;
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Session type */}
      <div>
        <label className="text-sm font-medium">Session Type</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={sessionType}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="personal_tutor">Personal Tutor</option>
          <option value="individual_coaching">Individual Coaching</option>
        </select>
      </div>

      {/* Student */}
      <div>
        <label className="text-sm font-medium">
          Student <span className="text-xs font-normal text-muted-foreground">(unassigned only)</span>
        </label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={form.student_id}
          onChange={(e) => setF('student_id', e.target.value)}
          required
        >
          <option value="">Select student</option>
          {students.filter((s) => !s.assigned).map((s) => {
            const id = isPT ? s.personal_tutor_id : s.individual_participant_id;
            const name = s.student_name ?? s.full_name;
            const detail = isPT ? s.teacher_for : s.activity;
            return (
              <option key={id} value={id}>
                {name} — {s.student_mobile}{detail ? ` (${detail})` : ''}
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
          {professionals.map((p) => {
            const id = p.professional_id ?? p.id;
            const name = p.full_name ?? p.users?.full_name ?? `ID ${id}`;
            const mobile = p.mobile ?? p.users?.mobile ?? '';
            return (
              <option key={id} value={id}>{name}{mobile ? ` — ${mobile}` : ''}</option>
            );
          })}
        </select>
      </div>

      {/* Start date */}
      <div>
        <label className="text-sm font-medium">Start Date</label>
        <Input type="date" value={form.start_date} min={todayLocal()} onChange={(e) => { const v = e.target.value; if (v && v < todayLocal()) return; setF('start_date', v); }} required />
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
          <Input type="time" value={form.start_time} onChange={(e) => setF('start_time', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">End Time</label>
          <Input type="time" value={form.end_time} onChange={(e) => setF('end_time', e.target.value)} required />
        </div>
      </div>

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

      {result && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm space-y-1">
          <p className="font-medium text-green-800">
            {result?.data?.generated ?? result?.generated ?? result?.data?.sessions_generated ?? 0} sessions created
            {(result?.data?.skipped ?? result?.skipped ?? 0) > 0 && `, ${result?.data?.skipped ?? result?.skipped} skipped`}
          </p>
          {(result?.data?.cycle_start || result?.cycle_start) && (result?.data?.cycle_end || result?.cycle_end) && (
            <p className="text-green-700 text-xs">{result?.data?.cycle_start ?? result?.cycle_start} → {result?.data?.cycle_end ?? result?.cycle_end}</p>
          )}
          {(result?.data?.skipped_detail ?? result?.skipped_detail ?? []).map((d, i) => (
            <p key={i} className="text-xs text-amber-700">
              {new Date(d.date).toLocaleDateString()}: {d.reason}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        <Button type="submit" disabled={generate.isPending}>
          {generate.isPending ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Generating…</> : 'Generate Sessions'}
        </Button>
      </div>
    </form>
  );
}

// ── Wrapper that picks the right form by type ─────────────────────────────────

function CreateSessionForm({ onClose }) {
  const [sessionType, setSessionType] = useState('personal_tutor');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium">Session Type</label>
        <select
          className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
        >
          <option value="personal_tutor">Personal Tutor</option>
          <option value="individual_coaching">Individual Coaching</option>
        </select>
      </div>
      {sessionType === 'personal_tutor'
        ? <PersonalTutorForm onClose={onClose} />
        : <IndividualCoachingForm onClose={onClose} />}
    </div>
  );
}

export default function Sessions() {
  const [filters, setFilters] = useState({});
  const { data, isLoading } = useSessions(filters);
  const { data: profsData } = useProfessionals();

  const [viewSessionId, setViewSessionId] = useState(null);
  const [updateSession, setUpdateSession] = useState(null);
  const [cancelSession, setCancelSession] = useState(null);
  const [reassignSession, setReassignSession] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);

  const sessions = data?.data ?? [];

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val || undefined }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Sessions</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAutoGenerate(true)}>Auto Generate</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>Create Session</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs font-medium">Type</label>
          <select
            className="block border rounded px-2 py-1.5 text-sm mt-0.5"
            onChange={(e) => setFilter('session_type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="group_coaching">Group Coaching</option>
            <option value="school_student">School</option>
            <option value="personal_tutor">Personal Tutor</option>
            <option value="individual_coaching">Individual Coaching</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Status</label>
          <select
            className="block border rounded px-2 py-1.5 text-sm mt-0.5"
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">From</label>
          <Input type="date" className="h-8 text-sm" onChange={(e) => setFilter('from', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">To</label>
          <Input type="date" className="h-8 text-sm" onChange={(e) => setFilter('to', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium">Student Name</label>
          <Input
            placeholder="Search student…"
            className="h-8 text-sm w-40"
            onChange={(e) => setFilter('student_name', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Professional</label>
          <select
            className="block border rounded px-2 py-1.5 text-sm mt-0.5"
            onChange={(e) => setFilter('professional_id', e.target.value)}
          >
            <option value="">All Professionals</option>
            {(profsData?.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.users?.full_name ?? `ID ${p.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create session slide-over */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="w-[420px] bg-background border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Create Session</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CreateSessionForm onClose={() => setShowCreate(false)} />
            </div>
          </div>
        </div>
      )}

      {/* View drawer */}
      {viewSessionId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setViewSessionId(null)} />
          <div className="w-[380px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Session Detail</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewSessionId(null)}>✕</Button>
            </div>
            <SessionDetailDrawer sessionId={viewSessionId} onClose={() => setViewSessionId(null)} />
          </div>
        </div>
      )}

      {/* Update status modal */}
      {updateSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setUpdateSession(null)} />
          <div className="relative bg-background rounded-lg shadow-xl w-[360px] p-5">
            <h3 className="font-semibold mb-3">Update Status</h3>
            <UpdateStatusModal session={updateSession} onClose={() => setUpdateSession(null)} />
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelSession(null)} />
          <div className="relative bg-background rounded-lg shadow-xl w-[360px] p-5">
            <h3 className="font-semibold mb-3">Cancel Session</h3>
            <CancelModal session={cancelSession} onClose={() => setCancelSession(null)} />
          </div>
        </div>
      )}

      {/* Reassign professional modal */}
      {reassignSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReassignSession(null)} />
          <div className="relative bg-background rounded-lg shadow-xl w-[480px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Reassign Professional</h3>
              <Button variant="ghost" size="sm" onClick={() => setReassignSession(null)}>✕</Button>
            </div>
            <ReassignProfessionalModal session={reassignSession} onClose={() => setReassignSession(null)} />
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
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Professional</th>
                <th className="px-3 py-2">Student / Batch</th>
                <th className="px-3 py-2">Teacher Status</th>
                <th className="px-3 py-2">Student Attendance</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">No sessions found.</td></tr>
              )}
              {sessions.map((session) => (
                <tr key={session.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">#{session.id}</td>
                  <td className="px-3 py-2">
                    <Badge className={TYPE_BADGE[session.session_type] ?? ''}>
                      {session.session_type?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{formatDate(session.scheduled_date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatTime(session.start_time)}–{formatTime(session.end_time)}</td>
                  <td className="px-3 py-2">{session.professionals?.users?.full_name ?? '—'}</td>
                  <td className="px-3 py-2">
                    {session.batch_id
                      ? (session.batches?.batch_name ?? `Batch #${session.batch_id}`)
                      : (session.students?.users?.full_name ?? '—')}
                  </td>
                  {/* Teacher Status — driven by professional punch-in/out */}
                  <td className="px-3 py-2">
                    {session.status === 'ongoing' ? (
                      <div>
                        {isStaleOngoing(session) ? (
                          <Badge className="text-xs bg-orange-100 text-orange-800 border border-orange-300">⚠ stale ongoing</Badge>
                        ) : (
                          <Badge className="text-xs bg-blue-100 text-blue-800">ongoing</Badge>
                        )}
                        {session.in_time && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            In: {new Date(session.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {isStaleOngoing(session) && (
                          <p className="text-[10px] text-orange-600 mt-0.5">End time passed — not checked out</p>
                        )}
                      </div>
                    ) : session.status === 'completed' ? (
                      <div>
                        <Badge className="text-xs bg-green-100 text-green-800">completed</Badge>
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
                  {/* Student Attendance */}
                  <td className="px-3 py-2">
                    {(() => {
                      const isBatch = !!session.batch_id;
                      const participants = session.session_participants ?? [];
                      if (isBatch) {
                        const total = participants.length;
                        const present = participants.filter(p => p.attended).length;
                        if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;
                        if (present === 0) return <Badge className="text-xs bg-gray-100 text-gray-600">0/{total} present</Badge>;
                        if (present === total) return <Badge className="text-xs bg-green-100 text-green-800">{present}/{total} present</Badge>;
                        return <Badge className="text-xs bg-amber-100 text-amber-800">{present}/{total} present</Badge>;
                      } else {
                        // PT / IC: single student — attendance comes from session_participants (student marks via app)
                        const sp = participants[0];
                        if (sp?.attended === true) return <Badge className="text-xs bg-green-100 text-green-800">Present</Badge>;
                        if (sp?.attended === false && ['completed', 'ongoing'].includes(session.status)) return <Badge className="text-xs bg-red-100 text-red-700">Absent</Badge>;
                        if (['completed', 'ongoing'].includes(session.status)) return <Badge className="text-xs bg-amber-100 text-amber-800">Not marked</Badge>;
                        return <span className="text-xs text-muted-foreground">—</span>;
                      }
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewSessionId(session.id)}>
                        View
                      </Button>
                      {(session.status === 'scheduled' || session.status === 'ongoing') && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setUpdateSession(session)}>
                          Update
                        </Button>
                      )}
                      {session.status === 'scheduled' && ['personal_tutor', 'individual_coaching'].includes(session.session_type) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50" onClick={() => setReassignSession(session)}>
                          Reassign
                        </Button>
                      )}
                      {session.status === 'scheduled' && (
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setCancelSession(session)}>
                          Cancel
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
