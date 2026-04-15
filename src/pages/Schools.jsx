import { useState, useRef } from 'react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { useSchools, useSchool, useMEList, useRegisterSchool } from '@/hooks/useAdmin';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

function parseActivities(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return [String(raw)];
  }
}

function SchoolDetailDrawer({ schoolId, onClose }) {
  const { data, isLoading } = useSchool(schoolId);
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  const s = data?.data;
  if (!s) return null;

  const students = s.school_students ?? [];

  // Group students by activity
  const byActivity = {};
  for (const stu of students) {
    const acts = parseActivities(stu.activities);
    const key = acts.length > 0 ? acts.join(', ') : 'No Activity';
    if (!byActivity[key]) byActivity[key] = [];
    byActivity[key].push(stu);
  }

  return (
    <div className="flex flex-col gap-5 p-4 text-sm overflow-y-auto h-full">
      <div className="space-y-1">
        <h3 className="font-semibold text-base">{s.school_name}</h3>
        <StatusBadge status={s.approval_status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          ['Address', s.address],
          ['Pin Code', s.pin_code],
          ['State', s.state],
          ['Language Medium', s.language_medium],
          ['Landline', s.landline_no],
          ['Principal', s.principal_name],
          ['Principal Contact', s.principal_contact],
          ['Activity Coordinator', s.activity_coordinator],
          ['Agreement Signed', s.agreement_signed_by_authority ? 'Yes' : 'No'],
          ['ME', s.me ? `${s.me.full_name ?? ''} (${s.me.referral_code ?? s.me_professional_id})` : (s.me_professional_id ?? '—')],
          ['Total Students', students.length],
          ['Created', s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Students enrolled by activity */}
      <div>
        <h4 className="font-semibold mb-2">Enrolled Students ({students.length})</h4>
        {students.length === 0 ? (
          <p className="text-muted-foreground text-xs">No students enrolled yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(byActivity).map(([activity, studs]) => (
              <div key={activity} className="rounded-md border overflow-hidden">
                <div className="bg-muted px-3 py-1.5 flex items-center justify-between">
                  <span className="font-medium text-xs uppercase tracking-wide">{activity}</span>
                  <span className="text-xs text-muted-foreground">{studs.length} student{studs.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-background">
                      <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Name</th>
                      <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Mobile</th>
                      <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Standard</th>
                      <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Kit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studs.map((stu) => (
                      <tr key={stu.id} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">
                          {stu.student_name || stu.students?.users?.full_name || '—'}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                          {stu.students?.users?.mobile ?? '—'}
                        </td>
                        <td className="px-3 py-1.5">{stu.standard ?? '—'}</td>
                        <td className="px-3 py-1.5">{stu.kit_type ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RegisterSchoolDrawer({ onClose }) {
  const { data: meData } = useMEList();
  const meList = meData?.data ?? [];
  const register = useRegisterSchool();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    schoolName: '',
    address: '',
    pinCode: '',
    state: '',
    languageMedium: '',
    landlineNo: '',
    principalName: '',
    principalContact: '',
    activityCoordinator: '',
    agreementSignedByAuthority: 'false',
    referral_code: '',
  });
  const [file, setFile] = useState(null);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    if (file) fd.append('activityAgreementPdf', file);
    register.mutate(fd, {
      onSuccess: () => {
        toast.success('School registered successfully');
        onClose();
      },
      onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to register school'),
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Register School</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="School Name" required>
            <Input value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} required />
          </Field>
          <Field label="Pin Code">
            <Input value={form.pinCode} onChange={(e) => set('pinCode', e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={form.state} onChange={(e) => set('state', e.target.value)} />
          </Field>
          <Field label="Language Medium">
            <Input value={form.languageMedium} onChange={(e) => set('languageMedium', e.target.value)} />
          </Field>
          <Field label="Landline No.">
            <Input value={form.landlineNo} onChange={(e) => set('landlineNo', e.target.value)} />
          </Field>
          <Field label="Principal Name" required>
            <Input value={form.principalName} onChange={(e) => set('principalName', e.target.value)} required />
          </Field>
          <Field label="Principal Contact" required>
            <Input value={form.principalContact} onChange={(e) => set('principalContact', e.target.value)} required />
          </Field>
          <Field label="Activity Coordinator">
            <Input value={form.activityCoordinator} onChange={(e) => set('activityCoordinator', e.target.value)} />
          </Field>
          <Field label="Agreement Signed">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.agreementSignedByAuthority}
              onChange={(e) => set('agreementSignedByAuthority', e.target.value)}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          <Field label="ME (optional)">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.referral_code}
              onChange={(e) => set('referral_code', e.target.value)}
            >
              <option value="">— None —</option>
              {meList.map((me) => (
                <option key={me.professional_id} value={me.referral_code}>
                  {me.full_name} ({me.referral_code})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Address">
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            rows={2}
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </Field>

        <Field label="Activity Agreement PDF (optional)">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={register.isPending}>
            {register.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
            Register
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function Schools() {
  const { data, isLoading, isError } = useSchools();
  const [viewId, setViewId] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  const schools = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Schools</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All registered schools</p>
        </div>
        <Button size="sm" onClick={() => setShowRegister(true)}>
          <Plus className="size-3.5 mr-1" /> Register School
        </Button>
      </div>

      {/* Detail drawer */}
      {viewId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setViewId(null)} />
          <div className="w-[600px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">School Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewId(null)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SchoolDetailDrawer schoolId={viewId} onClose={() => setViewId(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Register drawer */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowRegister(false)} />
          <div className="w-[520px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
            <RegisterSchoolDrawer onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load schools.</p>
      ) : schools.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No schools found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>ME</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.school_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{s.address ?? '—'}</TableCell>
                  <TableCell className="text-sm">{s.state ?? '—'}</TableCell>
                  <TableCell className="text-sm">{s.principal_name ?? '—'}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground text-sm">{s.principal_contact ?? '—'}</TableCell>
                  <TableCell className="tabular-nums text-sm">{s.student_count ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.me ? `${s.me.full_name ?? ''} (${s.me.referral_code})` : (s.me_professional_id ? `ID: ${s.me_professional_id}` : '—')}</TableCell>
                  <TableCell><StatusBadge status={s.approval_status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewId(s.id)}>
                      View
                    </Button>
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
