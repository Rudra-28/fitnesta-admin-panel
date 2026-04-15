import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import PendingApprovals from '@/pages/PendingApprovals';
import Professionals from '@/pages/Professionals';
import Students from '@/pages/Students';
import Assignments from '@/pages/Assignments';
import Commissions from '@/pages/Commissions';
import ActivitiesFees from '@/pages/ActivitiesFees';
import Batches from '@/pages/Batches';
import BatchDetailPage from '@/pages/BatchDetailPage';
import TrainerAssignments from '@/pages/TrainerAssignments';
import Payments from '@/pages/Payments';
import LegalContent from '@/pages/LegalContent';
import SupportTickets from '@/pages/SupportTickets';
import Societies from '@/pages/Societies';
import Schools from '@/pages/Schools';
import ManageAdmins from '@/pages/ManageAdmins';
import UserManagement from '@/pages/UserManagement';
import VisitingForms from '@/pages/VisitingForms';
import Dashboard from '@/pages/Dashboard';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pending" element={<PendingApprovals />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="professionals/trainers" element={<Professionals type="trainer" />} />
          <Route path="professionals/teachers" element={<Professionals type="teacher" />} />
          <Route path="professionals/marketing-executives" element={<Professionals type="marketing_executive" />} />
          <Route path="professionals/vendors" element={<Professionals type="vendor" />} />
          <Route path="visiting-forms" element={<VisitingForms />} />
          <Route path="students/individual-coaching" element={<Students type="individual_coaching" />} />
          <Route path="students/personal-tutor" element={<Students type="personal_tutor" />} />
          <Route path="students/group-coaching" element={<Students type="group_coaching" />} />
          <Route path="students/school-students" element={<Students type="school_student" />} />
          <Route path="societies" element={<Societies />} />
          <Route path="schools" element={<Schools />} />
          <Route path="payments" element={<Payments />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="travelling-allowances" element={<Commissions />} />
          <Route path="activities-fees" element={<ActivitiesFees />} />
          <Route path="batches/group-coaching" element={<Batches defaultTab="group_coaching" />} />
          <Route path="batches/school" element={<Batches defaultTab="school_student" />} />
          <Route path="batches/:batchId/detail" element={<BatchDetailPage />} />
          <Route path="batches/individual-coaching" element={<Batches defaultTab="individual_coaching" />} />
          <Route path="batches/personal-tutor" element={<Batches defaultTab="personal_tutor" />} />
          <Route path="trainer-assignments" element={<TrainerAssignments />} />
          <Route path="legal-content" element={<LegalContent />} />
          <Route path="support-tickets" element={<SupportTickets />} />
          <Route path="manage-admins" element={<ManageAdmins />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
