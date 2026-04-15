import { toast } from 'sonner';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWithdrawals, useApproveWithdrawal } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

function inr(val) {
  return `₹${Number(val ?? 0).toLocaleString('en-IN')}`;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin mr-2" /> Loading…
    </div>
  );
}

export default function Withdrawals() {
  const { data, isLoading, isError } = useWithdrawals();
  const approve = useApproveWithdrawal();

  const records = data?.data ?? [];

  const handleApprove = (professionalId, name) => {
    if (!window.confirm(`Approve withdrawal for ${name}? This will trigger a Razorpay payout.`)) return;
    approve.mutate(professionalId, {
      onSuccess: () => toast.success('Withdrawal approved — payout triggered'),
      onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to approve withdrawal'),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Withdrawals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Professionals who have requested to withdraw their earnings
        </p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Failed to load withdrawal requests.</p>
      ) : records.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No pending withdrawal requests.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professional</TableHead>
                <TableHead>Payout Method</TableHead>
                <TableHead>UPI / Bank</TableHead>
                <TableHead className="text-right">Wallet Balance</TableHead>
                <TableHead className="text-right">Requested Amount</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.professional_id}>
                  <TableCell>
                    <div className="font-medium text-sm">{rec.full_name ?? `ID ${rec.professional_id}`}</div>
                    <div className="text-xs text-muted-foreground">{rec.mobile}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={rec.payout_method === 'upi'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'}>
                      {rec.payout_method?.toUpperCase() ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rec.payout_method === 'upi'
                      ? (rec.upi_id ?? '—')
                      : rec.bank_account_number
                        ? `${rec.bank_account_name} · ${rec.bank_account_number} · ${rec.bank_ifsc}`
                        : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {inr(rec.wallet_balance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {inr(rec.requested_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={approve.isPending}
                      onClick={() => handleApprove(rec.professional_id, rec.full_name)}
                    >
                      Approve Payout
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
