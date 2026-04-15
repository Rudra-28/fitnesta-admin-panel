import { useState } from 'react';
import { toast } from 'sonner';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { ServiceTypeBadge } from '@/components/StatusBadge';
import { usePending, useApprovePending, useRejectPending } from '@/hooks/useAdmin';
import { Loader2, X, Eye, CheckCircle, XCircle } from 'lucide-react';

const TABS = [
  { value: undefined, label: 'All' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'marketing_executive', label: 'Marketing Executive' },
];

// Fields to display prominently per service type
const KEY_FIELDS = {
  trainer: ['full_name', 'mobile', 'dob', 'category', 'specified_game', 'place'],
  teacher: ['full_name', 'mobile', 'dob', 'subject', 'experience_details'],
  vendor: ['full_name', 'mobile', 'store_name', 'store_address', 'store_location'],
  marketing_executive: ['full_name', 'mobile', 'dob', 'education_qualification'],
};

function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (Array.isArray(val)) return val.join(', ') || '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function FormDataDrawer({ record, onClose }) {
  if (!record) return null;
  const formData = record.formData ?? {};
  const keyFields = KEY_FIELDS[record.serviceType] ?? [];
  const otherKeys = Object.keys(formData).filter((k) => !keyFields.includes(k));

  return (
    <Drawer open={!!record} onOpenChange={(o) => { if (!o) onClose(); }} direction="right">
      <DrawerContent className="flex flex-col overflow-hidden">
        <DrawerHeader className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <DrawerTitle>Registration Details</DrawerTitle>
            <ServiceTypeBadge type={record.serviceType} />
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm">
              <X className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Key Info
            </p>
            <div className="rounded-lg border divide-y">
              {keyFields.map((k) => (
                <div key={k} className="flex gap-2 px-3 py-2 text-sm">
                  <span className="w-40 shrink-0 text-muted-foreground">{formatKey(k)}</span>
                  <span className="font-medium break-all">{formatValue(formData[k])}</span>
                </div>
              ))}
            </div>
          </div>
          {otherKeys.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All Fields
              </p>
              <div className="rounded-lg border divide-y">
                {otherKeys.map((k) => (
                  <div key={k} className="flex gap-2 px-3 py-2 text-sm">
                    <span className="w-40 shrink-0 text-muted-foreground">{formatKey(k)}</span>
                    <span className="break-all">{formatValue(formData[k])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meta
            </p>
            <div className="rounded-lg border divide-y">
              <div className="flex gap-2 px-3 py-2 text-sm">
                <span className="w-40 shrink-0 text-muted-foreground">ID</span>
                <span>{record.id}</span>
              </div>
              <div className="flex gap-2 px-3 py-2 text-sm">
                <span className="w-40 shrink-0 text-muted-foreground">Submitted At</span>
                <span>{new Date(record.submittedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ActionModal({ type, record, onClose }) {
  const [note, setNote] = useState('');
  const approve = useApprovePending();
  const reject = useRejectPending();

  if (!record || !type) return null;

  const isApprove = type === 'approve';
  const mutation = isApprove ? approve : reject;

  const handleConfirm = () => {
    mutation.mutate(
      { id: record.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(isApprove ? 'Approved successfully' : 'Rejected successfully');
          onClose();
        },
        onError: (err) => {
          const code = err.response?.data?.error;
          const serverMsg = err.response?.data?.message;
          if (code === 'ALREADY_REVIEWED') {
            toast.error('This registration has already been reviewed.');
          } else if (code === 'PENDING_NOT_FOUND') {
            toast.error('Registration not found.');
          } else if (serverMsg) {
            toast.error(serverMsg);
          } else {
            toast.error(`Error ${err.response?.status ?? ''}: Something went wrong.`);
          }
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve' : 'Reject'} Registration
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            {isApprove
              ? 'This will approve the registration and create the user account. This action is irreversible.'
              : 'This will reject the registration. The applicant will need to re-apply.'}
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Note (optional)</label>
            <Input
              placeholder="Add a note for this decision…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? 'Processing…'
              : isApprove
              ? 'Confirm Approve'
              : 'Confirm Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingTable({ type }) {
  const { data, isLoading, isError } = usePending(type);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'approve'|'reject', record }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-destructive">
        Failed to load pending registrations.
      </div>
    );
  }

  const records = data?.data ?? [];

  if (records.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No pending registrations.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((rec) => {
              const fd = rec.formData ?? {};
              return (
                <TableRow key={rec.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    #{rec.id}
                  </TableCell>
                  <TableCell>
                    <ServiceTypeBadge type={rec.serviceType} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {fd.full_name ?? fd.participant_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fd.mobile ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(rec.submittedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDrawerRecord(rec)}
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 hover:bg-green-50 hover:text-green-700 border-green-200 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                        onClick={() => setModal({ type: 'approve', record: rec })}
                      >
                        <CheckCircle className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setModal({ type: 'reject', record: rec })}
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <FormDataDrawer
        record={drawerRecord}
        onClose={() => setDrawerRecord(null)}
      />

      {modal && (
        <ActionModal
          type={modal.type}
          record={modal.record}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

export default function PendingApprovals() {
  const [activeTab, setActiveTab] = useState('all');
  const tabType = activeTab === 'all' ? undefined : activeTab;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and action incoming registrations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value ?? 'all'} value={t.value ?? 'all'}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value ?? 'all'} value={t.value ?? 'all'} className="mt-4">
            {activeTab === (t.value ?? 'all') && <PendingTable type={tabType} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
