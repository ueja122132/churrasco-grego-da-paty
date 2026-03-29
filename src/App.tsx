import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Standard Components
import { Navbar } from "./components/Navbar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantProvider, useTenant } from "./context/TenantContext";
import { NotificationProvider, useNotification } from "./context/NotificationContext";
import { cn } from "./lib/utils";

// Lazy Loaded Pages
const SalesPage = lazy(() => import("./pages/SalesPage").then(m => ({ default: m.SalesPage })));
const KitchenPage = lazy(() => import("./pages/KitchenPage").then(m => ({ default: m.KitchenPage })));
const DeliveryPage = lazy(() => import("./pages/DeliveryPage").then(m => ({ default: m.DeliveryPage })));
const FinancePage = lazy(() => import("./pages/FinancePage").then(m => ({ default: m.FinancePage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(m => ({ default: m.AdminPage })));
const SaaSAdminPage = lazy(() => import("./pages/SaaSAdminPage").then(m => ({ default: m.SaaSAdminPage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then(m => ({ default: m.HistoryPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const SubscribePage = lazy(() => import("./pages/SubscribePage").then(m => ({ default: m.SubscribePage })));
const TrackingPage = lazy(() => import("./pages/TrackingPage").then(m => ({ default: m.TrackingPage })));
const CourierDashboard = lazy(() => import("./pages/CourierDashboard").then(m => ({ default: m.CourierDashboard })));
const AdminProfilePage = lazy(() => import("./pages/AdminProfilePage").then(m => ({ default: m.AdminProfilePage })));
const OrgManagePage = lazy(() => import("./pages/OrgManagePage").then(m => ({ default: m.OrgManagePage })));

// Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando Experiência...</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role || '')) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

const AppContent = () => {
  const { notify } = useNotification();
  const { user, logout } = useAuth();
  const { org, loading } = useTenant();

  const location = useLocation();

  if (loading) return <LoadingScreen />;

  const hideNavbar = ['/login', '/register', '/start', '/courier', '/saas'].includes(location.pathname) || !user;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {!hideNavbar && <Navbar />}
      
      <main className={cn("flex-1 pb-24 md:pb-0 transition-all", hideNavbar ? "md:pl-0" : "md:pl-24")}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/start" element={<SubscribePage />} />
            
            {/* Tenant Storefront */}
            {/* Management & Shared Routes */}
            <Route path="/track/:courierId" element={<TrackingPage />} />
            
            <Route path="/history" element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute roles={['admin', 'super_admin', 'user', 'courier']}>
                <AdminProfilePage />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin', 'super_admin']}>
                <AdminPage user={user} org={org} notify={notify} />
              </ProtectedRoute>
            } />
            <Route path="/kitchen" element={
              <ProtectedRoute roles={['admin', 'super_admin']}>
                <KitchenPage notify={notify} />
              </ProtectedRoute>
            } />
            <Route path="/delivery" element={
              <ProtectedRoute roles={['admin', 'super_admin']}>
                <DeliveryPage notify={notify} />
              </ProtectedRoute>
            } />
            <Route path="/finance" element={
              <ProtectedRoute roles={['admin', 'super_admin']}>
                <FinancePage />
              </ProtectedRoute>
            } />
            <Route path="/my-stores" element={
              <ProtectedRoute roles={['admin', 'super_admin']}>
                <OrgManagePage />
              </ProtectedRoute>
            } />

            {/* Super Admin */}
            <Route path="/saas" element={
              <ProtectedRoute roles={['super_admin']}>
                <SaaSAdminPage user={user} notify={notify} />
              </ProtectedRoute>
            } />

            {/* Courier Dashboard */}
            <Route path="/courier" element={
              <ProtectedRoute roles={['courier', 'admin', 'super_admin']}>
                <CourierDashboard user={user} notify={notify} onLogout={logout} />
              </ProtectedRoute>
            } />

            {/* Tenant Related (Dynamic) */}
            <Route path="/:slug/history" element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/:slug" element={<SalesPage />} />

            {/* Fallback */}
            <Route path="/" element={
              user?.role === 'super_admin' ? <Navigate to="/saas" replace /> :
              user?.role === 'courier' ? <Navigate to="/courier" replace /> :
              org ? <SalesPage /> : 
              (user ? <Navigate to="/admin" replace /> : <Navigate to="/login" replace />)
            } />

          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App = () => (
  <Router>
    <NotificationProvider>
      <AuthProvider>
        <TenantProvider>
          <AppContent />
        </TenantProvider>
      </AuthProvider>
    </NotificationProvider>
  </Router>
);

export default App;
