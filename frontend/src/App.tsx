
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { UserRole } from './types';

// 9 Core Pages
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { RoomAvailabilityPage } from './pages/RoomAvailabilityPage';
import { RoomDetailsPage } from './pages/RoomDetailsPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { FacultyRequestsPage } from './pages/FacultyRequestsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ManageResourcesPage } from './pages/ManageResourcesPage';
import { ProfilePage } from './pages/ProfilePage';
import { ManageUsersPage } from './pages/ManageUsersPage';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F7FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#2166F3] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#718096]">Restoring Smartly session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const defaultRedirect =
      role === 'ADMIN' ? '/admin' : role === 'FACULTY' ? '/faculty/requests' : '/dashboard';
    return <Navigate to={defaultRedirect} replace />;
  }

  return <>{children}</>;
};

const PublicLoginRoute: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F7FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#2166F3] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#718096]">Loading Smartly...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const defaultRedirect =
      role === 'ADMIN' ? '/admin' : role === 'FACULTY' ? '/faculty/requests' : '/dashboard';
    return <Navigate to={defaultRedirect} replace />;
  }

  return <LoginPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<PublicLoginRoute />} />

          {/* Protected Dashboard Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Index Route Redirects to default dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Screen 2: Student Dashboard */}
            <Route path="dashboard" element={<StudentDashboard />} />

            {/* Screen 3: Room Availability */}
            <Route path="rooms" element={<RoomAvailabilityPage />} />

            {/* Screen 4: Room Details & Request */}
            <Route path="rooms/:id" element={<RoomDetailsPage />} />

            {/* Screen 5: Student — My Requests */}
            <Route path="requests" element={<MyRequestsPage />} />

            {/* Screen 6: Faculty — Requests for Approval & Schedule */}
            <Route
              path="faculty"
              element={
                <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                  <Navigate to="/faculty/requests" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="faculty/requests"
              element={
                <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                  <FacultyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="schedule"
              element={
                <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
                  <RoomAvailabilityPage />
                </ProtectedRoute>
              }
            />

            {/* Screen 7: Admin Dashboard */}
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Screen 8: Admin — Manage Resources, Requests & Users */}
            <Route
              path="admin/resources"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ManageResourcesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/requests"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
                  <FacultyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />

            {/* Screen 9: Profile Page */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
