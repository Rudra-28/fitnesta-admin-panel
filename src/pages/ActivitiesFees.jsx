import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFeeStructures, useUpsertFeeStructure, useDeleteFeeStructure, useCustomCategories } from '@/hooks/useAdmin';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ActivitiesTable from '@/components/ActivitiesTable';

function fmt(val) {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// ── Edit Fee Modal (for existing row edits) ───────────────────────────────────

function EditFeeModal({ fee, onClose }) {
  const [totalFee, setTotalFee] = useState(String(Number(fee?.total_fee ?? '')));
  const [effectiveMonthly, setEffectiveMonthly] = useState(String(Number(fee?.effective_monthly ?? '')));
  const upsert = useUpsertFeeStructure();

  function handleSubmit(e) {
    e.preventDefault();
    upsert.mutate(
      {
        data: {
          total_fee: Number(totalFee),
          effective_monthly: effectiveMonthly !== '' ? Number(effectiveMonthly) : null,
        },
        id: fee.id,
      },
      {
        onSuccess: () => { toast.success('Fee updated'); onClose(); },
        onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to save fee'),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-xl w-[340px] p-5">
        <h3 className="font-semibold mb-3">Edit Fee</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Term: {fee.term_months} month(s)</p>
          <div>
            <label className="text-sm font-medium">Total Fee (₹)</label>
            <Input type="number" min={0} value={totalFee} onChange={(e) => setTotalFee(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Effective Monthly (₹) <span className="text-muted-foreground font-normal">optional</span></label>
            <Input type="number" min={0} value={effectiveMonthly} onChange={(e) => setEffectiveMonthly(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Custom Category Modal ─────────────────────────────────────────────────

const TERM_OPTIONS = [1, 3, 6, 9];

function AddCustomCategoryModal({ activities, section, onClose }) {
  const customCategoryType = section === 'society' ? 'society' : 'school';
  const coachingType = section === 'society' ? 'group_coaching' : 'school_student';

  const { data: customCatData } = useCustomCategories(customCategoryType);
  const existingCustomCats = customCatData?.data ?? [];

  const upsert = useUpsertFeeStructure();

  const [categoryName, setCategoryName] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.activity_id ?? '');
  const [termFees, setTermFees] = useState(
    Object.fromEntries(TERM_OPTIONS.map((t) => [t, { total_fee: '', effective_monthly: '' }]))
  );
  const [saving, setSaving] = useState(false);

  const availableActivities = activities.filter((a) => {
    if (!categoryName) return true;
    const feesForCat = a.by_category ? a.by_category[categoryName] : undefined;
    return !feesForCat || feesForCat.length === 0;
  });

  function handleCategoryChange(val) {
    setCategoryName(val);
    const newAvailable = activities.filter((a) => {
      if (!val) return true;
      const feesForCat = a.by_category ? a.by_category[val] : undefined;
      return !feesForCat || feesForCat.length === 0;
    });
    if (newAvailable.length > 0 && !newAvailable.find(a => String(a.activity_id) === String(selectedActivityId))) {
      setSelectedActivityId(newAvailable[0].activity_id);
    } else if (newAvailable.length === 0) {
      setSelectedActivityId('');
    }
  }

  function setTermField(term, field, val) {
    setTermFees((p) => {
      const updated = { ...p, [term]: { ...p[term], [field]: val } };
      if (field === 'total_fee' && term > 1) {
        const totalFee = Number(val);
        updated[term] = {
          ...updated[term],
          effective_monthly: val !== '' && !isNaN(totalFee) ? String(Math.round(totalFee / term)) : '',
        };
      }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!categoryName.trim()) { toast.error('Custom category name is required'); return; }
    if (!selectedActivityId) { toast.error('An activity must be selected'); return; }

    const filledTerms = TERM_OPTIONS.filter((t) => termFees[t].total_fee !== '');
    if (!filledTerms.length) { toast.error('Enter fees for at least one term'); return; }

    setSaving(true);
    try {
      for (const term of filledTerms) {
        await upsert.mutateAsync({
          data: {
            activity_id: Number(selectedActivityId),
            coaching_type: coachingType,
            society_category: 'custom',
            custom_category_name: categoryName.trim(),
            term_months: term,
            total_fee: Number(termFees[term].total_fee),
            effective_monthly: termFees[term].effective_monthly !== ''
              ? Number(termFees[term].effective_monthly) : null,
          },
          id: undefined,
        });
      }
      toast.success(`Custom category "${categoryName.trim()}" added`);
      onClose();
    } catch (err) {
      console.error('Custom category error:', err?.response?.data ?? err);
      toast.error(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to add custom category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-xl w-[440px] p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold mb-4">Add Custom Category</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="text-sm font-medium">Category Name <span className="text-destructive">*</span></label>
            {existingCustomCats.length === 0 ? (
              <p className="text-sm text-amber-600 mt-2 p-2 bg-amber-50/50 rounded border border-amber-200/50">
                No custom categories found. MEs must register a society/school with a custom category first.
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={categoryName}
                onChange={(e) => handleCategoryChange(e.target.value)}
                required
              >
                <option value="" disabled>Select a corresponding category...</option>
                {existingCustomCats.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Activity <span className="text-destructive">*</span></label>
            {categoryName && availableActivities.length === 0 ? (
              <p className="text-sm text-amber-600 mt-1 p-2 bg-amber-50/50 rounded border border-amber-200/50">
                All activities already have fees defined for this category.
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                required
              >
                {availableActivities.map((a) => (
                  <option key={a.activity_id} value={a.activity_id}>{a.activity_name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Fees by Term</p>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Term</TableHead>
                    <TableHead>Total Fee (₹)</TableHead>
                    <TableHead>Per Month (₹) <span className="font-normal text-muted-foreground">opt</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TERM_OPTIONS.map((term) => (
                    <TableRow key={term}>
                      <TableCell className="text-sm">{term} {term === 1 ? 'month' : 'months'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={termFees[term].total_fee}
                          onChange={(e) => setTermField(term, 'total_fee', e.target.value)}
                          className="h-8 w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={termFees[term].effective_monthly}
                          onChange={term === 1 ? (e) => setTermField(term, 'effective_monthly', e.target.value) : undefined}
                          readOnly={term > 1}
                          className={`h-8 w-28 ${term > 1 ? 'bg-muted text-muted-foreground cursor-default' : ''}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave a row blank to skip that term.</p>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}Add Category
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fee table with edit + delete buttons ─────────────────────────────────────

function FeeTable({ fees, onEdit }) {
  const [confirmId, setConfirmId] = useState(null);
  const deleteMutation = useDeleteFeeStructure();

  function handleDelete(id) {
    deleteMutation.mutate(id, {
      onSuccess: () => { toast.success('Fee row deleted'); setConfirmId(null); },
      onError: (err) => toast.error(err?.response?.data?.error ?? 'Failed to delete'),
    });
  }

  if (!fees?.length) return <p className="px-3 py-2 text-xs text-muted-foreground">No fees defined.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Term</TableHead>
          <TableHead className="text-right">Total Fee</TableHead>
          <TableHead className="text-right">Per Month</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fees.map((f, i) => (
          <TableRow key={i}>
            <TableCell>{f.term_months} {f.term_months === 1 ? 'month' : 'months'}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(f.total_fee)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(f.effective_monthly)}</TableCell>
            <TableCell className="text-right">
              {confirmId === f.id ? (
                <span className="inline-flex items-center gap-1">
                  <Button
                    size="sm" variant="destructive" className="h-7 px-2 text-xs"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(f.id)}
                  >
                    {deleteMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Yes'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmId(null)}>
                    No
                  </Button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(f)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setConfirmId(f.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ActivityCard({ name, children }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 border-b">
        <p className="font-medium text-sm">{name}</p>
      </div>
      {children}
    </div>
  );
}

// ── Shared states ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin mr-2" /> Loading…
    </div>
  );
}

function ErrorState() {
  return <p className="py-16 text-center text-sm text-destructive">Failed to load fee structures.</p>;
}

function EmptyState() {
  return <p className="py-16 text-center text-sm text-muted-foreground">No fee structures found.</p>;
}

// ── Society tab ───────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['A+', 'A', 'B'];

function SocietySection() {
  const { data, isLoading, isError } = useFeeStructures('society');
  const [editFee, setEditFee] = useState(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const activities = data?.data ?? [];

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;

  return (
    <>
      {editFee && <EditFeeModal fee={editFee} onClose={() => setEditFee(null)} />}
      {showAddCustom && (
        <AddCustomCategoryModal
          activities={activities}
          section="society"
          onClose={() => setShowAddCustom(false)}
        />
      )}
      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" onClick={() => setShowAddCustom(true)}>
          <Plus className="size-3.5 mr-1" /> Add Custom Category
        </Button>
      </div>
      {!activities.length ? <EmptyState /> : (
        <div className="space-y-4">
          {activities.map((a) => {
            const cats = Object.keys(a.by_category ?? {}).sort((x, y) => {
              const xi = CATEGORY_ORDER.indexOf(x);
              const yi = CATEGORY_ORDER.indexOf(y);
              if (xi === -1 && yi === -1) return x.localeCompare(y);
              if (xi === -1) return 1;
              if (yi === -1) return -1;
              return xi - yi;
            });
            return (
              <ActivityCard key={a.activity_id} name={a.activity_name}>
                {cats.map((cat) => (
                  <div key={cat} className="border-b last:border-b-0">
                    <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                      {CATEGORY_ORDER.includes(cat) ? `Category ${cat}` : cat}
                    </p>
                    <FeeTable
                      fees={a.by_category[cat]}
                      onEdit={(f) => setEditFee({ ...f, activity_id: a.activity_id })}
                    />
                  </div>
                ))}
              </ActivityCard>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── School tab ────────────────────────────────────────────────────────────────

function SchoolSection() {
  const { data, isLoading, isError } = useFeeStructures('school');
  const [editFee, setEditFee] = useState(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const activities = data?.data ?? [];

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;

  return (
    <>
      {editFee && <EditFeeModal fee={editFee} onClose={() => setEditFee(null)} />}
      {showAddCustom && (
        <AddCustomCategoryModal
          activities={activities}
          section="school"
          onClose={() => setShowAddCustom(false)}
        />
      )}
      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" onClick={() => setShowAddCustom(true)}>
          <Plus className="size-3.5 mr-1" /> Add Custom Category
        </Button>
      </div>
      {!activities.length ? <EmptyState /> : (
        <div className="space-y-4">
          {activities.map((a) => {
            if (a.by_category) {
              const cats = Object.keys(a.by_category);
              return (
                <ActivityCard key={a.activity_id} name={a.activity_name}>
                  {cats.map((cat) => (
                    <div key={cat} className="border-b last:border-b-0">
                      <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                        {cat === 'default' ? 'Default' : cat}
                      </p>
                      <FeeTable
                        fees={a.by_category[cat]}
                        onEdit={(f) => setEditFee({ ...f, activity_id: a.activity_id })}
                      />
                    </div>
                  ))}
                </ActivityCard>
              );
            }
            return (
              <ActivityCard key={a.activity_id} name={a.activity_name}>
                <FeeTable fees={a.fees} onEdit={(f) => setEditFee({ ...f, activity_id: a.activity_id })} />
              </ActivityCard>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Individual Coaching tab ───────────────────────────────────────────────────

function IndividualCoachingSection() {
  const { data, isLoading, isError } = useFeeStructures('individual_coaching');
  const [editFee, setEditFee] = useState(null);
  const activities = data?.data ?? [];

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!activities.length) return <EmptyState />;

  return (
    <>
      {editFee && <EditFeeModal fee={editFee} onClose={() => setEditFee(null)} />}
      <div className="space-y-4">
        {activities.map((a) => (
          <ActivityCard key={a.activity_id} name={a.activity_name}>
            <FeeTable fees={a.fees} onEdit={(f) => setEditFee({ ...f, activity_id: a.activity_id })} />
          </ActivityCard>
        ))}
      </div>
    </>
  );
}

// ── Personal Tutor tab ────────────────────────────────────────────────────────

const STANDARD_ORDER = ['1ST-2ND', '3RD-4TH', '5TH-6TH', '7TH-8TH', '8TH-10TH', 'ANY'];

function PersonalTutorSection() {
  const { data, isLoading, isError } = useFeeStructures('personal_tutor');
  const [editFee, setEditFee] = useState(null);
  const activities = data?.data ?? [];

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!activities.length) return <EmptyState />;

  return (
    <>
      {editFee && <EditFeeModal fee={editFee} onClose={() => setEditFee(null)} />}
      <div className="space-y-4">
        {activities.map((a) => {
          const standards = Object.keys(a.by_standard ?? {}).sort((x, y) => {
            const xi = STANDARD_ORDER.indexOf(x);
            const yi = STANDARD_ORDER.indexOf(y);
            return (xi === -1 ? 999 : xi) - (yi === -1 ? 999 : yi);
          });
          return (
            <ActivityCard key={a.activity_id} name={a.activity_name}>
              {standards.map((std) => (
                <div key={std} className="border-b last:border-b-0">
                  <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                    Standard: {std}
                  </p>
                  <FeeTable
                    fees={a.by_standard[std]}
                    onEdit={(f) => setEditFee({ ...f, activity_id: a.activity_id })}
                  />
                </div>
              ))}
            </ActivityCard>
          );
        })}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivitiesFees() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Fee Structures</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View and edit fee structures for all coaching types</p>
      </div>
      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="society">Society</TabsTrigger>
          <TabsTrigger value="school">School</TabsTrigger>
          <TabsTrigger value="individual_coaching">Individual Coaching</TabsTrigger>
          <TabsTrigger value="personal_tutor">Personal Tutor</TabsTrigger>
        </TabsList>
        <TabsContent value="activities" className="mt-4">
          <ActivitiesTable />
        </TabsContent>
        <TabsContent value="society" className="mt-4">
          <SocietySection />
        </TabsContent>
        <TabsContent value="school" className="mt-4">
          <SchoolSection />
        </TabsContent>
        <TabsContent value="individual_coaching" className="mt-4">
          <IndividualCoachingSection />
        </TabsContent>
        <TabsContent value="personal_tutor" className="mt-4">
          <PersonalTutorSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
