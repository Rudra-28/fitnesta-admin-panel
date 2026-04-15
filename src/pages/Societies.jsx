import { useState, useRef } from 'react';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { useSocieties, useSociety, useMEList, useRegisterSociety, useCustomCategories } from '@/hooks/useAdmin';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_BADGE = {
  'A+': 'bg-purple-100 text-purple-800',
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-gray-100 text-gray-700',
  custom: 'bg-orange-100 text-orange-800',
};

function SocietyDetailDrawer({ societyId, onClose }) {
  const { data, isLoading } = useSociety(societyId);
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  const s = data?.data;
  if (!s) return null;

  return (
    <div className="flex flex-col gap-4 p-4 text-sm overflow-y-auto h-full">
      <div className="space-y-1">
        <h3 className="font-semibold text-base">{s.society_name}</h3>
        <div className="flex gap-2 flex-wrap">
          <Badge className={CATEGORY_BADGE[s.society_category] ?? 'bg-gray-100'}>
            {s.society_category === 'custom' ? s.custom_category_name : s.society_category}
          </Badge>
          <StatusBadge status={s.approval_status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {[
          ['Address', s.address],
          ['Pin Code', s.pin_code],
          ['Total Participants', s.total_participants],
          ['No. of Flats', s.no_of_flats],
          ['Proposed Wing', s.proposed_wing],
          ['Authority Role', s.authority_role],
          ['Authority Person', s.authority_person_name],
          ['Contact', s.contact_number],
          ['Coordinator', s.coordinator_name],
          ['Coordinator No.', s.coordinator_number],
          ['Playground Available', s.playground_available ? 'Yes' : 'No'],
          ['Agreement Signed', s.agreement_signed_by_authority ? 'Yes' : 'No'],
          ['ME Professional ID', s.me_professional_id ?? '—'],
          ['Created', s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? '—'}</p>
          </div>
        ))}
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

function RegisterSocietyDrawer({ onClose }) {
  const { data: meData } = useMEList();
  const meList = meData?.data ?? [];
  const { data: customCatData } = useCustomCategories('society');
  const existingCustomCats = customCatData?.data ?? [];
  const register = useRegisterSociety();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    societyUniqueId: '',
    societyName: '',
    societyCategory: 'A',
    customCategoryName: '',
    address: '',
    pinCode: '',
    totalParticipants: '',
    noOfFlats: '',
    proposedWing: '',
    authorityRole: '',
    authorityPersonName: '',
    contactNumber: '',
    playgroundAvailable: 'false',
    coordinatorName: '',
    coordinatorNumber: '',
    agreementSignedByAuthority: 'false',
    referral_code: '',
  });
  const [file, setFile] = useState(null);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'customCategoryName') return; // handled separately below
      if (v !== '') fd.append(k, v);
    });
    if (form.societyCategory === 'custom' && form.customCategoryName)
      fd.append('customCategoryName', form.customCategoryName);
    if (file) fd.append('activityAgreementPdf', file);
    register.mutate(fd, {
      onSuccess: () => {
        toast.success('Society registered successfully');
        onClose();
      },
      onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to register society'),
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">Register Society</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Society Unique ID" required>
            <Input value={form.societyUniqueId} onChange={(e) => set('societyUniqueId', e.target.value)} required />
          </Field>
          <Field label="Society Name" required>
            <Input value={form.societyName} onChange={(e) => set('societyName', e.target.value)} required />
          </Field>
          <Field label="Category" required>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.societyCategory}
              onChange={(e) => set('societyCategory', e.target.value)}
            >
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          {form.societyCategory === 'custom' && (
            <Field label="Custom Category Name" required>
              <Input
                list="society-custom-cats"
                value={form.customCategoryName}
                onChange={(e) => set('customCategoryName', e.target.value)}
                placeholder="e.g. Green Acres Special"
                required
              />
              {existingCustomCats.length > 0 && (
                <datalist id="society-custom-cats">
                  {existingCustomCats.map((cat) => <option key={cat} value={cat} />)}
                </datalist>
              )}
            </Field>
          )}
          <Field label="Pin Code">
            <Input value={form.pinCode} onChange={(e) => set('pinCode', e.target.value)} />
          </Field>
          <Field label="Total Participants">
            <Input type="number" min={0} value={form.totalParticipants} onChange={(e) => set('totalParticipants', e.target.value)} />
          </Field>
          <Field label="No. of Flats">
            <Input type="number" min={0} value={form.noOfFlats} onChange={(e) => set('noOfFlats', e.target.value)} />
          </Field>
          <Field label="Proposed Wing">
            <Input value={form.proposedWing} onChange={(e) => set('proposedWing', e.target.value)} />
          </Field>
          <Field label="Authority Role">
            <Input value={form.authorityRole} onChange={(e) => set('authorityRole', e.target.value)} />
          </Field>
          <Field label="Authority Person Name">
            <Input value={form.authorityPersonName} onChange={(e) => set('authorityPersonName', e.target.value)} />
          </Field>
          <Field label="Contact Number">
            <Input value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} />
          </Field>
          <Field label="Coordinator Name">
            <Input value={form.coordinatorName} onChange={(e) => set('coordinatorName', e.target.value)} />
          </Field>
          <Field label="Coordinator Number">
            <Input value={form.coordinatorNumber} onChange={(e) => set('coordinatorNumber', e.target.value)} />
          </Field>
          <Field label="Playground Available">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.playgroundAvailable}
              onChange={(e) => set('playgroundAvailable', e.target.value)}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
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

export default function Societies() {
  const { data, isLoading, isError } = useSocieties();
  const [viewId, setViewId] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  const societies = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Societies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All registered housing societies</p>
        </div>
        <Button size="sm" onClick={() => setShowRegister(true)}>
          <Plus className="size-3.5 mr-1" /> Register Society
        </Button>
      </div>

      {/* Detail drawer */}
      {viewId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setViewId(null)} />
          <div className="w-[420px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Society Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewId(null)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SocietyDetailDrawer societyId={viewId} onClose={() => setViewId(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Register drawer */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowRegister(false)} />
          <div className="w-[520px] bg-background border-l shadow-xl flex flex-col overflow-hidden">
            <RegisterSocietyDrawer onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load societies.</p>
      ) : societies.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No societies found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Pin Code</TableHead>
                <TableHead className="text-center">Flats</TableHead>
                <TableHead className="text-center">Participants</TableHead>
                <TableHead>ME ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {societies.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.society_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={CATEGORY_BADGE[s.society_category] ?? 'bg-gray-100 text-gray-700'}>
                      {s.society_category === 'custom' ? s.custom_category_name : s.society_category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{s.address ?? '—'}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{s.pin_code ?? '—'}</TableCell>
                  <TableCell className="text-center tabular-nums">{s.no_of_flats ?? '—'}</TableCell>
                  <TableCell className="text-center tabular-nums">{s.total_participants ?? '—'}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{s.me_professional_id ?? '—'}</TableCell>
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
