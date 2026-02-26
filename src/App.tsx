import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppErrorBoundary } from "@/components/app/AppErrorBoundary";
import LoginPage from "./pages/auth/LoginPage";
import DashboardLayout from "./components/app/DashboardLayout";
import DashboardPage from "./pages/hod/DashboardPage";
import MarkAttendancePage from "./pages/teacher/MarkAttendancePage";
import MyAttendancePage from "./pages/student/MyAttendancePage";
import RecoverySimulatorPage from "./pages/student/RecoverySimulatorPage";
import NotificationsPage from "./pages/student/NotificationsPage";
import StudentAnalyticsPage from "./pages/student/StudentAnalyticsPage";
import ClassAnalyticsPage from "./pages/hod/ClassAnalyticsPage";
import DepartmentAnalyticsPage from "./pages/hod/DepartmentAnalyticsPage";
import ClassComparisonPage from "./pages/hod/ClassComparisonPage";
import MergedReportsPage from "./pages/teacher/MergedReportsPage";
import DefaultersPage from "./pages/teacher/DefaultersPage";
import FacultyOverviewPage from "./pages/hod/FacultyOverviewPage";
import OverrideAttendancePage from "./pages/teacher/OverrideAttendancePage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

function LoginGuard() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) {
    if (user.role === 'teacher') return <Navigate to="/attendance/mark" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage />;
}

function FallbackRoute() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppErrorBoundary>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginGuard />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoutes />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/attendance/mark" element={<MarkAttendancePage />} />
                <Route path="/attendance/my" element={<MyAttendancePage />} />
                <Route path="/attendance/override" element={<OverrideAttendancePage />} />
                <Route path="/analytics/students" element={<StudentAnalyticsPage />} />
                <Route path="/analytics/class" element={<ClassAnalyticsPage />} />
                <Route path="/analytics/department" element={<DepartmentAnalyticsPage />} />
                <Route path="/analytics/classes" element={<ClassComparisonPage />} />
                <Route path="/reports/merged" element={<MergedReportsPage />} />
                <Route path="/reports/defaulters" element={<DefaultersPage />} />
                <Route path="/reports/faculty" element={<FacultyOverviewPage />} />
                <Route path="/recovery" element={<RecoverySimulatorPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>
              <Route path="*" element={<FallbackRoute />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

