import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Users,
  Building2,
  School,
  CreditCard,
  Wallet,
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Briefcase,
  FileText,
  HeadphonesIcon,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import useAuthStore from '@/store/authStore';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Pending Approvals', to: '/pending', icon: ClipboardList },
  { label: 'Assignments', to: '/assignments', icon: UserCheck },
  { label: 'Trainer Assignments', to: '/trainer-assignments', icon: Briefcase },
  {
    label: 'Professionals',
    icon: Users,
    children: [
      { label: 'Trainers', to: '/professionals/trainers' },
      { label: 'Teachers', to: '/professionals/teachers' },
      { label: 'Marketing Executives', to: '/professionals/marketing-executives' },
      { label: 'Vendors', to: '/professionals/vendors' },
    ],
  },
  { label: 'Visiting Forms', to: '/visiting-forms', icon: MapPin },
  {
    label: 'Students',
    icon: Users,
    children: [
      { label: 'Individual Coaching', to: '/students/individual-coaching' },
      { label: 'Personal Tutor', to: '/students/personal-tutor' },
      { label: 'Group Coaching', to: '/students/group-coaching' },
      { label: 'School Students', to: '/students/school-students' },
    ],
  },
  { label: 'Societies', to: '/societies', icon: Building2 },
  { label: 'Schools', to: '/schools', icon: School },
  { label: 'Payments', to: '/payments', icon: CreditCard },
  { label: 'Commissions', to: '/commissions', icon: Wallet },
  { label: 'Activities & Fees', to: '/activities-fees', icon: Activity },
  {
    label: 'Batches',
    icon: CalendarDays,
    children: [
      { label: 'Group Coaching', to: '/batches/group-coaching' },
      { label: 'School', to: '/batches/school' },
      { label: 'Individual Coaching', to: '/batches/individual-coaching' },
      { label: 'Personal Tutor', to: '/batches/personal-tutor' },
    ],
  },
  { label: 'Legal Content', to: '/legal-content', icon: FileText },
  { label: 'Support Tickets', to: '/support-tickets', icon: HeadphonesIcon },
];

function NavGroup({ item }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>
      {open && (
        <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const scope = useAuthStore((s) => s.scope);

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="font-heading text-base font-semibold text-sidebar-foreground">
          Fitnesta Admin
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) =>
          item.children ? (
            <NavGroup key={item.label} item={item} />
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              {item.icon && <item.icon className="size-4 shrink-0" />}
              {item.label}
            </NavLink>
          )
        )}
        {scope === 'super_admin' && (
          <>
            <NavLink
              to="/manage-admins"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <ShieldCheck className="size-4 shrink-0" />
              Manage Admins
            </NavLink>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <Users className="size-4 shrink-0" />
              User Management
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
