import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Edit2, Ban, CheckCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getUsers, editUser, suspendUser, unsuspendUser } from '@/api/admin';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [subroleFilter, setSubroleFilter] = useState('');
  const limit = 20;

  const [editModal, setEditModal] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { page, limit, search: debouncedSearch, role: roleFilter, subrole: subroleFilter }],
    queryFn: () => getUsers({ limit, offset: (page - 1) * limit, ...(debouncedSearch && { search: debouncedSearch }), ...(roleFilter && { role: roleFilter }), ...(subroleFilter && { subrole: subroleFilter }) }),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }) => editUser(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditModal(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? err.response?.data?.error_code ?? 'Failed to update user');
    },
  });

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: ({ id, note }) => suspendUser(id, note),
    onSuccess: () => {
      toast.success('User suspended');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuspendModal(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Failed to suspend user');
    },
  });

  // Unsuspend Mutation
  const unsuspendMutation = useMutation({
    mutationFn: (id) => unsuspendUser(id),
    onSuccess: () => {
      toast.success('User unsuspended');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Failed to unsuspend user');
    },
  });

  // Edit Form
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm();
  useEffect(() => {
    if (editModal) {
      resetEdit({
        full_name: editModal.full_name || '',
        mobile: editModal.mobile || '',
        email: editModal.email || '',
        address: editModal.address || '',
      });
    }
  }, [editModal, resetEdit]);

  const onEditSubmit = (values) => {
    const payload = {};
    if (values.full_name !== editModal.full_name) payload.full_name = values.full_name;
    if (values.mobile !== editModal.mobile) payload.mobile = values.mobile;
    if (values.email !== editModal.email) payload.email = values.email;
    if (values.address !== editModal.address) payload.address = values.address;

    if (Object.keys(payload).length === 0) {
      toast.info('No changes made');
      return;
    }
    editMutation.mutate({ id: editModal.id, data: payload });
  };

  // Suspend Form
  const { register: registerSuspend, handleSubmit: handleSuspendSubmit, reset: resetSuspend } = useForm();
  useEffect(() => {
    if (suspendModal) resetSuspend({ note: '' });
  }, [suspendModal, resetSuspend]);

  const onSuspendSubmit = (values) => {
    suspendMutation.mutate({ id: suspendModal.id, note: values.note });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">User Management (Super Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all users, update details and suspension status.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9 w-[200px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setSubroleFilter('');
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option value="professional">Professional</option>
            <option value="student">Student</option>
          </select>
          {roleFilter === 'professional' && (
            <select
              className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={subroleFilter}
              onChange={(e) => {
                setSubroleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Subroles</option>
              <option value="trainer">Trainer</option>
              <option value="teacher">Teacher</option>
              <option value="marketing_executive">Marketing Executive</option>
              <option value="vendor">Vendor</option>
            </select>
          )}
          {roleFilter === 'student' && (
             <select
              className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={subroleFilter}
              onChange={(e) => {
                setSubroleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Subroles</option>
              <option value="individual_coaching">Individual Coaching</option>
              <option value="personal_tutor">Personal Tutor</option>
              <option value="group_coaching">Group Coaching</option>
              <option value="school_student">School Student</option>
            </select>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : users.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Contact</th>
                  <th className="px-4 py-2.5 text-left font-medium">Role</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{user.full_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">ID: {user.id}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{user.mobile}</div>
                      <div className="text-xs">{user.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="capitalize font-medium">{user.role?.replace('_', ' ')}</div>
                      <div className="text-xs text-muted-foreground capitalize">{user.subrole?.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_suspended ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1">
                          <Ban className="size-3" /> Suspended
                        </Badge>
                      ) : user.is_verified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 flex w-fit items-center gap-1">
                          <CheckCircle className="size-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditModal(user)}
                          title="Edit User"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        {user.is_suspended ? (
                           <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => unsuspendMutation.mutate(user.id)}
                            title="Unsuspend User"
                          >
                            <CheckCircle className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setSuspendModal(user)}
                            title="Suspend User"
                          >
                            <Ban className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editModal} onOpenChange={(open) => !open && setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          <form id="editUserForm" onSubmit={handleEditSubmit(onEditSubmit)} className="flex flex-col gap-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input {...registerEdit('full_name', { required: 'Full name is required' })} />
              {editErrors.full_name && <p className="text-xs text-destructive">{editErrors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mobile Number</label>
              <Input
                {...registerEdit('mobile', {
                  required: 'Mobile is required',
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Must be 10 digits' }
                })}
              />
               {editErrors.mobile && <p className="text-xs text-destructive">{editErrors.mobile.message}</p>}
               <p className="text-xs text-muted-foreground">Changing this will notify the user to log in again.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email (Optional)</label>
              <Input type="email" {...registerEdit('email')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Address</label>
              <Input {...registerEdit('address')} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button form="editUserForm" type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={!!suspendModal} onOpenChange={(open) => !open && setSuspendModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User: {suspendModal?.full_name}</DialogTitle>
          </DialogHeader>
          <form id="suspendUserForm" onSubmit={handleSuspendSubmit(onSuspendSubmit)} className="flex flex-col gap-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Suspension Note (Optional)</label>
              <Input {...registerSuspend('note')} placeholder="Violation of terms..." />
              <p className="text-xs text-muted-foreground mt-1">This will be included in the push notification sent to the user.</p>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendModal(null)}>Cancel</Button>
            <Button form="suspendUserForm" type="submit" variant="destructive" disabled={suspendMutation.isPending}>
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
