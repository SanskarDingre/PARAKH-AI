import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import CheckPage from './pages/CheckPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import ViolationsPage from './pages/ViolationsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OtpLoginPage from './pages/OtpLoginPage';
import AdminPage from './pages/AdminPage';
import NewInspectionPage from './pages/NewInspectionPage';
import InspectionDetailPage from './pages/InspectionDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes — no layout wrapper */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/otp-login" element={<OtpLoginPage />} />

        {/* Main app with navbar */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Legacy single-image check (still works) */}
          <Route path="/check" element={<CheckPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/new-inspection"
            element={<ProtectedRoute><NewInspectionPage /></ProtectedRoute>}
          />
          <Route
            path="/inspections/:id"
            element={<ProtectedRoute><InspectionDetailPage /></ProtectedRoute>}
          />
          <Route
            path="/history"
            element={<ProtectedRoute><HistoryPage /></ProtectedRoute>}
          />
          <Route
            path="/violations"
            element={<ProtectedRoute><ViolationsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;
