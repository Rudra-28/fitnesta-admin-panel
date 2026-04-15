import { useState } from 'react';
import { useSupportTickets, useResolveTicket } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, CircleDot } from 'lucide-react';

function roleBadge(role, subrole) {
  const label = subrole ?? role;
  const colors = {
    student: 'bg-blue-100 text-blue-700',
    trainer: 'bg-orange-100 text-orange-700',
    teacher: 'bg-purple-100 text-purple-700',
    marketing_executive: 'bg-teal-100 text-teal-700',
    vendor: 'bg-yellow-100 text-yellow-700',
    admin: 'bg-gray-100 text-gray-700',
  };
  const cls = colors[label] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label?.replace(/_/g, ' ')}
    </span>
  );
}

function senderDetail(ticket) {
  if (ticket.professional_id) {
    return (
      <span className="text-xs text-muted-foreground">
        {ticket.profession_type?.replace(/_/g, ' ')} · {ticket.place ?? '—'}
      </span>
    );
  }
  if (ticket.student_id) {
    return (
      <span className="text-xs text-muted-foreground capitalize">
        {ticket.student_type?.replace(/_/g, ' ')}
      </span>
    );
  }
  return null;
}

function ResolveButton({ ticket }) {
  const resolve = useResolveTicket();

  if (ticket.status === 'resolved') {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle2 className="size-3.5" />
        Resolved
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={resolve.isPending}
      onClick={() =>
        resolve.mutate(ticket.id, {
          onSuccess: () => toast.success(`Ticket #${ticket.id} marked as resolved.`),
          onError: () => toast.error('Failed to resolve ticket.'),
        })
      }
    >
      {resolve.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <CheckCircle2 className="size-3.5 mr-1" />}
      Resolve
    </Button>
  );
}

export default function SupportTickets() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, isError } = useSupportTickets(
    statusFilter !== 'all' ? { status: statusFilter } : {}
  );

  const tickets = data?.data ?? [];
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const openCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and resolve user-submitted support requests.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5">
            <CircleDot className="size-3.5 text-amber-500" />
            <span className="font-medium">{openCount}</span>
            <span className="text-muted-foreground">open</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5">
            <CheckCircle2 className="size-3.5 text-green-500" />
            <span className="font-medium">{resolvedCount}</span>
            <span className="text-muted-foreground">resolved</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {['all', 'open', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              statusFilter === s
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive py-8 text-center">Failed to load support tickets.</p>
      )}

      {!isLoading && !isError && tickets.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No tickets found.</p>
      )}

      {!isLoading && !isError && tickets.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="max-w-xs">Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Resolved At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className={ticket.status === 'open' ? 'bg-amber-50/40' : ''}>
                  <TableCell className="text-muted-foreground text-xs">{ticket.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{ticket.user?.full_name ?? '—'}</span>
                      <span className="text-xs text-muted-foreground">{ticket.user?.mobile}</span>
                      {senderDetail(ticket)}
                    </div>
                  </TableCell>
                  <TableCell>{roleBadge(ticket.user?.role, ticket.user?.subrole ?? ticket.profession_type ?? ticket.student_type)}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm line-clamp-2 whitespace-pre-wrap">{ticket.message}</p>
                  </TableCell>
                  <TableCell>
                    {ticket.status === 'open' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                        <CircleDot className="size-3" /> Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                        <CheckCircle2 className="size-3" /> Resolved
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <ResolveButton ticket={ticket} />
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
