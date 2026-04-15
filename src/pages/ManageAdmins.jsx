import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getSubAdmins, createSubAdmin, deleteSubAdmin } from '@/api/admin';

export default function ManageAdmins() {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(null); // userId to delete

  const { data, isLoading } = useQuery({
    queryKey: ['sub-admins'],
    queryFn: getSubAdmins,
  });

  const admins = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: createSubAdmin,
    onSuccess: () => {
      toast.success('Sub-admin created');
      queryClient.invalidateQueries({ queryKey: ['sub-admins'] });
      reset();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Failed to create sub-admin');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubAdmin,
    onSuccess: () => {
      toast.success('Sub-admin removed');
      queryClient.invalidateQueries({ queryKey: ['sub-admins'] });
      setConfirmDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Failed to remove sub-admin');
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = (values) => {
    const payload = { full_name: values.full_name, mobile: values.mobile };
    if (values.email?.trim()) payload.email = values.email.trim();
    createMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-xl font-semibold">Manage Admins</h1>

      {/* Admin list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Admins</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No admins found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Mobile</th>
                  <th className="px-4 py-2.5 text-left font-medium">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium">Scope</th>
                  <th className="px-4 py-2.5 text-left font-medium">Joined</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.user_id ?? admin.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{admin.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{admin.mobile}</td>
                    <td className="px-4 py-3 text-muted-foreground">{admin.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {admin.scope === 'super_admin' ? (
                        <Badge className="gap-1 bg-violet-100 text-violet-700 hover:bg-violet-100">
                          <ShieldCheck className="size-3" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sub Admin</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {admin.scope !== 'super_admin' && (
                        confirmDelete === (admin.user_id ?? admin.id) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Sure?</span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMutation.mutate(admin.user_id ?? admin.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Yes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDelete(admin.user_id ?? admin.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add sub-admin form */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Add Sub-Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                placeholder="Rahul Sharma"
                {...register('full_name', { required: 'Full name is required' })}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Mobile</label>
              <Input
                type="tel"
                placeholder="9876543210"
                {...register('mobile', {
                  required: 'Mobile is required',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Enter a valid 10-digit mobile number',
                  },
                })}
              />
              {errors.mobile && (
                <p className="text-xs text-destructive">{errors.mobile.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Email <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                type="email"
                placeholder="rahul@example.com"
                {...register('email')}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="self-start">
              {createMutation.isPending ? 'Creating…' : 'Create Sub-Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
