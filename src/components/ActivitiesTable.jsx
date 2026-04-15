import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActivities, useDeleteActivity } from '@/hooks/useAdmin';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ActivityModal from './ActivityModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ActivitiesTable() {
  const { data, isLoading, isError } = useActivities();
  const deleteActivity = useDeleteActivity();
  const [modal, setModal] = useState(null); // { type: 'create'|'edit', record }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { record, force }

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
        Failed to load activities.
      </div>
    );
  }

  const activities = data?.data ?? [];

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteActivity.mutate(
      { id: deleteConfirm.record.id, force: deleteConfirm.force },
      {
        onSuccess: () => {
          toast.success(
            deleteConfirm.force
              ? 'Activity permanently deleted'
              : 'Activity hidden (soft deleted)'
          );
          setDeleteConfirm(null);
        },
        onError: (err) => {
          const code = err.response?.data?.error;
          if (code === 'ACTIVITY_HAS_HISTORY') {
            toast.error('Cannot delete — activity has linked records');
          } else {
            toast.error(err.response?.data?.message || 'Failed to delete activity');
          }
          setDeleteConfirm(null);
        },
      }
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Activities</h2>
        <Button size="sm" onClick={() => setModal({ type: 'create' })}>
          <Plus className="size-4 mr-1.5" /> Add Activity
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No activities found.
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    {activity.image_url ? (
                      <img
                        src={activity.image_url}
                        alt={activity.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground uppercase font-bold">
                        NA
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{activity.name}</TableCell>
                  <TableCell>
                    {activity.activity_category === 'sports' ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                        Sports
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400">
                        Non-Sports
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {activity.notes || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={`size-2 rounded-full ${activity.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                      <span className="text-sm font-medium">
                        {activity.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setModal({ type: 'edit', record: activity })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm({ record: activity, force: false })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {modal && (
        <ActivityModal
          type={modal.type}
          record={modal.record}
          onClose={() => setModal(null)}
        />
      )}

      {deleteConfirm && (
        <Dialog open onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {deleteConfirm.force ? 'Permanent Delete' : 'Hide Activity'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                {deleteConfirm.force
                  ? 'This activity has no history and will be permanently deleted. This action is irreversible.'
                  : 'This will hide the activity from the app. It will remain in the database but won\'t be visible to users. Continue?'}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              { !deleteConfirm.force && (
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="text-xs text-muted-foreground underline"
                   onClick={() => setDeleteConfirm({ ...deleteConfirm, force: true })}
                >
                  I want to permanently delete
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteActivity.isPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteActivity.isPending}>
                  {deleteActivity.isPending ? 'Deleting...' : deleteConfirm.force ? 'Permanently Delete' : 'Hide Activity'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
