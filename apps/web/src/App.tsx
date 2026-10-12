import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { OfflineSyncProvider } from './context/OfflineSyncContext';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { VoiceQueryModal } from './components/VoiceQueryModal';

// Code-split pages using React.lazy (Item 20)
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard').then(m => ({ default: m.FarmerDashboard })));
const CropAnalysisFlow = lazy(() => import('./pages/farmer/CropAnalysisFlow').then(m => ({ default: m.CropAnalysisFlow })));
const ScenarioSimulatorPage = lazy(() => import('./pages/farmer/ScenarioSimulatorPage').then(m => ({ default: m.ScenarioSimulatorPage })));
const FarmsListPage = lazy(() => import('./pages/farmer/FarmsListPage').then(m => ({ default: m.FarmsListPage })));
const FarmerWeatherPage = lazy(() => import('./pages/farmer/FarmerWeatherPage').then(m => ({ default: m.FarmerWeatherPage })));
const FarmerHistoryPage = lazy(() => import('./pages/farmer/FarmerHistoryPage').then(m => ({ default: m.FarmerHistoryPage })));
const FPODashboard = lazy(() => import('./pages/fpo/FPODashboard').then(m => ({ default: m.FPODashboard })));
const AdminSystemPage = lazy(() => import('./pages/admin/AdminSystemPage').then(m => ({ default: m.AdminSystemPage })));

const queryClient = new QueryClient();

const PageLoader: React.FC = () => (
  <div className="min-h-[70vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const getHomeRoute = (role?: string): string => {
  if (role === 'FPO_ADMIN') return '/fpo/dashboard';
  if (role === 'SYSTEM_ADMIN') return '/admin';
  return '/farmer/dashboard';
};

const RootRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomeRoute(user.role)} replace />;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <OfflineSyncProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
                <Navbar />

                <main className="flex-1">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<RootRoute />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/landing" element={<LandingPage />} />
                      
                      {/* Farmer Journeys (Item 11: FARMER-only) */}
                      <Route
                        path="/farmer/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['FARMER']}>
                            <FarmerDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/farmer/analyze"
                        element={
                          <ProtectedRoute allowedRoles={['FARMER']}>
                            <CropAnalysisFlow />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/farmer/scenarios"
                        element={
                          <ProtectedRoute allowedRoles={['FARMER']}>
                            <ScenarioSimulatorPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/farmer/farms"
                        element={
                          <ProtectedRoute allowedRoles={['FARMER']}>
                            <FarmsListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/farmer/weather"
                        element={
                          <ProtectedRoute allowedRoles={['FARMER']}>
                            <FarmerWeatherPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/farmer/history"
                        element={
                          <ProtectedRoute allowedRoles={['FARMER']}>
                            <FarmerHistoryPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* FPO Intelligence Dashboard (Item 11: FPO_ADMIN + SYSTEM_ADMIN) */}
                      <Route
                        path="/fpo/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['FPO_ADMIN', 'SYSTEM_ADMIN']}>
                            <FPODashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/fpo/disease-map"
                        element={
                          <ProtectedRoute allowedRoles={['FPO_ADMIN', 'SYSTEM_ADMIN']}>
                            <FPODashboard />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin / System Observability (Item 11: SYSTEM_ADMIN only) */}
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
                            <AdminSystemPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Fallback */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </main>

                {/* Mobile Bottom Navigation for Farmers */}
                <BottomNav onOpenVoice={() => setIsVoiceOpen(true)} />

                {/* Global Voice Assistant Modal */}
                {isVoiceOpen && (
                  <VoiceQueryModal
                    isOpen={isVoiceOpen}
                    onClose={() => setIsVoiceOpen(false)}
                  />
                )}
              </div>
            </BrowserRouter>
          </OfflineSyncProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
