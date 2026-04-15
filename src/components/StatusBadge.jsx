import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  captured: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const SERVICE_COLORS = {
  trainer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  teacher: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  vendor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  marketing_executive: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  society_request: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  society_enrollment: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const SERVICE_LABELS = {
  trainer: 'Trainer',
  teacher: 'Teacher',
  vendor: 'Vendor',
  marketing_executive: 'Marketing Exec',
  society_request: 'Society Request',
  society_enrollment: 'Society Enrollment',
};

export function StatusBadge({ status }) {
  return (
    <Badge className={cn('border-0 capitalize', STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground')}>
      {status}
    </Badge>
  );
}

export function ServiceTypeBadge({ type }) {
  return (
    <Badge className={cn('border-0', SERVICE_COLORS[type] ?? 'bg-muted text-muted-foreground')}>
      {SERVICE_LABELS[type] ?? type}
    </Badge>
  );
}
