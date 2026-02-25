import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { classes } from "@/data/mockData";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import MarkAttendancePage from "./pages/MarkAttendancePage";
import MyAttendancePage from "./pages/MyAttendancePage";
import RecoverySimulatorPage from "./pages/RecoverySimulatorPage";
import NotificationsPage from "./pages/NotificationsPage";
import StudentAnalyticsPage from "./pages/StudentAnalyticsPage";
import ClassAnalyticsPage from "./pages/ClassAnalyticsPage";
import DepartmentAnalyticsPage from "./pages/DepartmentAnalyticsPage";
import ClassComparisonPage from "./pages/ClassComparisonPage";
import MergedReportsPage from "./pages/MergedReportsPage";
import DefaultersPage from "./pages/DefaultersPage";
import FacultyOverviewPage from "./pages/FacultyOverviewPage";
import OverrideAttendancePage from "./pages/OverrideAttendancePage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

function LoginGuard() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) {
    if (user.role === 'teacher') {
      const isClassTeacher = classes.some(c => c.class_teacher_id === user.id);
      return <Navigate to={isClassTeacher ? "/reports/merged" : "/attendance/mark"} replace />;
    }
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
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
