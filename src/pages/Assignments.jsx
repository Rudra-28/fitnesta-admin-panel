import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useStudentAssignments, useSessions } from '@/hooks/useAdmin';
import { Loader2, Search } from 'lucide-react';

function formatTime(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-4 animate-spin mr-2" /> Loading…
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="py-16 text-center text-sm text-muted-foreground">{text}</p>;
}

// ── Assigned Teachers Tab ─────────────────────────────────────────────────────

function AssignedTeachersTab() {
  const [search, setSearch] = useState('');

  const { data: assignmentsData, isLoading: assignmentsLoading } = useStudentAssignments('personal_tutor');
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions({ session_type: 'personal_tutor' });

  const isLoading = assignmentsLoading || sessionsLoading;

  // Only students with an assigned teacher
  const assigned = (assignmentsData?.data ?? []).filter((s) => s.assigned && s.assigned_teacher);

  // Build a map: student_id → latest scheduled/ongoing session
  const sessionsByStudent = {};
  for (const session of (sessionsData?.data ?? [])) {
    const sid = session.student_id;
    if (!sid) continue;
    if (!sessionsByStudent[sid]) {
      sessionsByStudent[sid] = session;
    } else {
      // Prefer most recent scheduled/ongoing over completed/cancelled
      const priority = { scheduled: 0, ongoing: 1, completed: 2, cancelled: 3 };
      const existing = sessionsByStudent[sid];
      if ((priority[session.status] ?? 9) < (priority[existing.status] ?? 9)) {
        sessionsByStudent[sid] = session;
      }
    }
  }

  const filtered = assigned.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.student_name?.toLowerCase().includes(q) ||
      s.assigned_teacher?.name?.toLowerCase().includes(q) ||
      s.teacher_for?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search student, teacher, subject…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} assigned</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState text={search ? 'No results match your search.' : 'No students have been assigned a teacher yet.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assigned Teacher</TableHead>
                <TableHead>Next Session Date</TableHead>
                <TableHead>Session Time</TableHead>
                <TableHead>Session Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const session = sessionsByStudent[s.student_id] ?? null;
                return (
                  <TableRow key={s.personal_tutor_id}>
                    <TableCell>
                      <div className="font-medium">{s.student_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{s.student_mobile ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{s.standard ?? '—'}</span>
                      {s.batch && (
                        <span className="ml-1.5 text-xs text-muted-foreground">({s.batch})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-800 font-normal">
                        {s.teacher_for ?? s.assigned_teacher?.subject ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{s.assigned_teacher?.name ?? '—'}</div>
                      {s.assigned_teacher?.mobile && (
                        <div className="text-xs text-muted-foreground">{s.assigned_teacher.mobile}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {session
                        ? <span className="text-sm">{formatDate(session.scheduled_date)}</span>
                        : <span className="text-xs text-muted-foreground">No session</span>}
                    </TableCell>
                    <TableCell>
                      {session
                        ? (
                          <span className="text-sm whitespace-nowrap">
                            {formatTime(session.start_time)}–{formatTime(session.end_time)}
                          </span>
                        )
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {session ? (
                        <SessionStatusBadge status={session.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ── Assigned Trainers Tab ─────────────────────────────────────────────────────

function AssignedTrainersTab() {
  const [search, setSearch] = useState('');

  const { data: assignmentsData, isLoading: assignmentsLoading } = useStudentAssignments('individual_coaching');
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions({ session_type: 'individual_coaching' });

  const isLoading = assignmentsLoading || sessionsLoading;

  const assigned = (assignmentsData?.data ?? []).filter((s) => s.assigned && s.assigned_trainer);

  const sessionsByStudent = {};
  for (const session of (sessionsData?.data ?? [])) {
    const sid = session.student_id;
    if (!sid) continue;
    if (!sessionsByStudent[sid]) {
      sessionsByStudent[sid] = session;
    } else {
      const priority = { scheduled: 0, ongoing: 1, completed: 2, cancelled: 3 };
      const existing = sessionsByStudent[sid];
      if ((priority[session.status] ?? 9) < (priority[existing.status] ?? 9)) {
        sessionsByStudent[sid] = session;
      }
    }
  }

  const filtered = assigned.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.student_name?.toLowerCase().includes(q) ||
      s.assigned_trainer?.name?.toLowerCase().includes(q) ||
      s.activity?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search student, trainer, activity…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} assigned</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState text={search ? 'No results match your search.' : 'No students have been assigned a trainer yet.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Society / Flat</TableHead>
                <TableHead>Assigned Trainer</TableHead>
                <TableHead>Next Session Date</TableHead>
                <TableHead>Session Time</TableHead>
                <TableHead>Session Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const session = sessionsByStudent[s.student_id] ?? null;
                return (
                  <TableRow key={s.individual_participant_id}>
                    <TableCell>
                      <div className="font-medium">{s.student_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{s.student_mobile ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-100 text-orange-800 font-normal">
                        {s.activity ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.society ?? '—'}</div>
                      {s.flat_no && (
                        <div className="text-xs text-muted-foreground">Flat {s.flat_no}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{s.assigned_trainer?.name ?? '—'}</div>
                      {s.assigned_trainer?.mobile && (
                        <div className="text-xs text-muted-foreground">{s.assigned_trainer.mobile}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {session
                        ? <span className="text-sm">{formatDate(session.scheduled_date)}</span>
                        : <span className="text-xs text-muted-foreground">No session</span>}
                    </TableCell>
                    <TableCell>
                      {session
                        ? (
                          <span className="text-sm whitespace-nowrap">
                            {formatTime(session.start_time)}–{formatTime(session.end_time)}
                          </span>
                        )
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {session ? (
                        <SessionStatusBadge status={session.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

const SESSION_STATUS_STYLES = {
  scheduled: 'bg-amber-100 text-amber-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function SessionStatusBadge({ status }) {
  return (
    <Badge className={SESSION_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}>
      {status}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Assignments() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Assignments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Students with assigned teachers and trainers, along with their session details.
        </p>
      </div>
      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">Assigned Teachers</TabsTrigger>
          <TabsTrigger value="trainers">Assigned Trainers</TabsTrigger>
        </TabsList>
        <TabsContent value="teachers" className="mt-4">
          <AssignedTeachersTab />
        </TabsContent>
        <TabsContent value="trainers" className="mt-4">
          <AssignedTrainersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
