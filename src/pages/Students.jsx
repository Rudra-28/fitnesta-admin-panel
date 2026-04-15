import { useState } from 'react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useStudents, useStudentDetail } from '@/hooks/useAdmin';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(endDate) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

function AssignedBadge({ assigned }) {
  return assigned
    ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Assigned</Badge>
    : <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Unassigned</Badge>;
}

function MembershipCell({ startDate, endDate, termMonths }) {
  if (!startDate) return <span className="text-xs text-muted-foreground">—</span>;
  const expired = isExpired(endDate);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${expired ? 'bg-red-500' : 'bg-green-500'}`} />
        <span className={`text-xs font-medium ${expired ? 'text-red-700' : 'text-green-700'}`}>
          {expired ? 'Expired' : 'Active'}
          {termMonths ? ` · ${termMonths}m` : ''}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">{fmt(startDate)} → {endDate ? fmt(endDate) : '—'}</div>
    </div>
  );
}

// ─── Student Drawer ───────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b last:border-0">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <div className="rounded-md border px-3">{children}</div>
    </div>
  );
}

function StudentDrawer({ studentId, studentName, onClose }) {
  const { data, isLoading, isError } = useStudentDetail(studentId);
  const d = data?.data;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[540px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h3 className="font-semibold">{d?.users?.full_name ?? studentName}</h3>
            {d?.users?.mobile && (
              <p className="text-xs text-muted-foreground mt-0.5">{d.users.mobile}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />Loading…
            </div>
          )}
          {isError && (
            <p className="text-center text-sm text-muted-foreground py-16">Failed to load student details.</p>
          )}
          {d && (
            <>
              <Section title="User Info">
                <InfoRow label="Full Name" value={d.users?.full_name} />
                <InfoRow label="Mobile" value={d.users?.mobile} />
                <InfoRow label="Email" value={d.users?.email} />
                <InfoRow label="Address" value={d.users?.address} />
                <InfoRow label="Approval Status" value={d.users?.approval_status} />
              </Section>

              {d.personal_tutors?.length > 0 && d.personal_tutors.map((pt, i) => (
                <Section key={i} title={`Personal Tutor Enrollment #${pt.id}`}>
                  <InfoRow label="Standard" value={pt.standard} />
                  <InfoRow label="Batch" value={pt.batch} />
                  <InfoRow label="Subject" value={pt.teacher_for} />
                  <InfoRow label="DOB" value={fmt(pt.dob)} />
                  <InfoRow label="Assigned Teacher" value={pt.professionals?.users?.full_name} />
                </Section>
              ))}

              {d.individual_participants?.length > 0 && d.individual_participants.map((ip, i) => (
                <Section key={i} title={`Individual Coaching #${ip.id}`}>
                  <InfoRow label="Activity" value={ip.activity} />
                  <InfoRow label="Flat No" value={ip.flat_no} />
                  <InfoRow label="Society" value={ip.societies?.society_name} />
                  <InfoRow label="Age" value={ip.age} />
                  <InfoRow label="Kits" value={ip.kits} />
                  <InfoRow label="DOB" value={fmt(ip.dob)} />
                  <InfoRow label="Assigned Trainer" value={ip.professionals?.users?.full_name} />
                </Section>
              ))}

              {d.school_students?.length > 0 && d.school_students.map((ss, i) => (
                <Section key={i} title={`School Enrollment #${ss.id}`}>
                  <InfoRow label="Student Name" value={ss.student_name} />
                  <InfoRow label="Standard" value={ss.standard} />
                  <InfoRow label="Activities" value={Array.isArray(ss.activities) ? ss.activities.join(', ') : ss.activities} />
                  <InfoRow label="Kit Type" value={ss.kit_type} />
                  <InfoRow label="School" value={ss.schools?.school_name} />
                </Section>
              ))}

              {d.batch_students?.length > 0 && (
                <Section title="Batch Enrollments">
                  {d.batch_students.map((bs, i) => (
                    <div key={i} className="py-1.5 border-b last:border-0 text-sm">
                      <span className="font-medium">{bs.batches?.batch_name ?? `Batch #${bs.batch_id}`}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {bs.batches?.activities?.name}
                        {bs.batches?.societies?.society_name ? ` · ${bs.batches.societies.society_name}` : ''}
                        {bs.batches?.schools?.school_name ? ` · ${bs.batches.schools.school_name}` : ''}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              {d.parent_consents?.length > 0 && (
                <Section title="Parent Consent">
                  {d.parent_consents.map((pc, i) => (
                    <div key={i}>
                      <InfoRow label="Parent Name" value={pc.parent_name} />
                      <InfoRow label="Emergency Contact" value={pc.emergency_contact} />
                      <InfoRow label="Consent Date" value={fmt(pc.consent_date)} />
                    </div>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tables ───────────────────────────────────────────────────────────────────

function PersonalTutorTable({ records }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Standard</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Teacher For</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead>Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.personal_tutor_id} className="hover:bg-muted/30">
                <TableCell className="tabular-nums text-muted-foreground">#{r.personal_tutor_id}</TableCell>
                <TableCell>
                  <button type="button" className="font-medium text-primary underline-offset-2 hover:underline text-left" onClick={() => setSelected(r)}>
                    {r.student_name ?? '—'}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.student_mobile ?? '—'}</TableCell>
                <TableCell>{r.standard ?? '—'}</TableCell>
                <TableCell>{r.batch ?? '—'}</TableCell>
                <TableCell>{r.teacher_for ?? '—'}</TableCell>
                <TableCell><MembershipCell startDate={r.membership_start_date} endDate={r.membership_end_date} termMonths={r.term_months} /></TableCell>
                <TableCell><AssignedBadge assigned={r.assigned} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {selected && (
        <StudentDrawer
          studentId={selected.student_id}
          studentName={selected.student_name}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function IndividualCoachingTable({ records }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Society</TableHead>
              <TableHead>Flat</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead>Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.individual_participant_id} className="hover:bg-muted/30">
                <TableCell className="tabular-nums text-muted-foreground">#{r.individual_participant_id}</TableCell>
                <TableCell>
                  <button type="button" className="font-medium text-primary underline-offset-2 hover:underline text-left" onClick={() => setSelected(r)}>
                    {r.student_name ?? '—'}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.student_mobile ?? '—'}</TableCell>
                <TableCell>{r.activity ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.society ?? '—'}</TableCell>
                <TableCell>{r.flat_no ?? '—'}</TableCell>
                <TableCell>{r.age ?? '—'}</TableCell>
                <TableCell><MembershipCell startDate={r.membership_start_date} endDate={r.membership_end_date} termMonths={r.term_months} /></TableCell>
                <TableCell><AssignedBadge assigned={r.assigned} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {selected && (
        <StudentDrawer
          studentId={selected.student_id}
          studentName={selected.student_name}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function GroupCoachingTable({ records }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Society</TableHead>
            <TableHead>Flat</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Batch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.individual_participant_id ?? r.student_id}>
              <TableCell className="tabular-nums text-muted-foreground">#{r.individual_participant_id ?? r.student_id}</TableCell>
              <TableCell className="font-medium">{r.student_name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{r.student_mobile ?? r.mobile ?? '—'}</TableCell>
              <TableCell>{r.activity ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{r.society ?? r.society_name ?? '—'}</TableCell>
              <TableCell>{r.flat_no ?? '—'}</TableCell>
              <TableCell>{r.age ?? '—'}</TableCell>
              <TableCell>
                {r.batch_name ? <Badge variant="secondary">{r.batch_name}</Badge> : <span className="text-xs text-muted-foreground">Not in batch</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SchoolStudentsTable({ records }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Standard</TableHead>
            <TableHead>Activities</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Kit</TableHead>
            <TableHead>Batch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.school_student_id ?? r.student_id}>
              <TableCell className="tabular-nums text-muted-foreground">#{r.school_student_id ?? r.student_id}</TableCell>
              <TableCell className="font-medium">{r.student_name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{r.student_mobile ?? r.mobile ?? '—'}</TableCell>
              <TableCell>{r.standard ?? '—'}</TableCell>
              <TableCell className="text-sm">{Array.isArray(r.activities) ? r.activities.join(', ') : (r.activities ?? '—')}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{r.school_name ?? '—'}</TableCell>
              <TableCell>{r.kit_type ?? '—'}</TableCell>
              <TableCell>
                {r.batch_name ? <Badge variant="secondary">{r.batch_name}</Badge> : <span className="text-xs text-muted-foreground">Not in batch</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function StudentSection({ type }) {
  const { data, isLoading, isError } = useStudents(type);
  const records = data?.data ?? [];

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin mr-2" />Loading…</div>;
  if (isError) return <div className="py-16 text-center text-sm text-muted-foreground">Failed to load students.</div>;
  if (records.length === 0) return <div className="py-16 text-center text-sm text-muted-foreground">No students found.</div>;

  if (type === 'personal_tutor') return <PersonalTutorTable records={records} />;
  if (type === 'individual_coaching') return <IndividualCoachingTable records={records} />;
  if (type === 'group_coaching') return <GroupCoachingTable records={records} />;
  if (type === 'school_student') return <SchoolStudentsTable records={records} />;
  return null;
}

const TYPE_TITLES = {
  personal_tutor: 'Personal Tutor Students',
  individual_coaching: 'Individual Coaching Students',
  group_coaching: 'Group Coaching Students',
  school_student: 'School Students',
};

export default function Students({ type }) {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-semibold">{TYPE_TITLES[type] ?? 'Students'}</h1>
      <StudentSection type={type} />
    </div>
  );
}
