import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';
import Layout from './components/common/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudentRegistration = lazy(() => import('./pages/StudentRegistration'));
const StudentsList = lazy(() => import('./pages/StudentsList'));
const AttendanceCaptureSystem = lazy(() => import('./pages/AttendanceCaptureSystem'));
const AttendanceReports = lazy(() => import('./pages/AttendanceReports'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/students/register" element={
            <PrivateRoute>
              <StudentRegistration />
            </PrivateRoute>
          } />
          
          <Route path="/students" element={
            <PrivateRoute>
              <StudentsList />
            </PrivateRoute>
          } />
          
          <Route path="/attendance/capture" element={
            <PrivateRoute>
              <AttendanceCaptureSystem />
            </PrivateRoute>
          } />
          
          <Route path="/attendance/reports" element={
            <PrivateRoute>
              <AttendanceReports />
            </PrivateRoute>
          } />
          
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;