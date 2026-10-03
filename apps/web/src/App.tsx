import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { OfflineSyncProvider } from './context/OfflineSyncContext';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { VoiceQueryModal } from './components/VoiceQueryModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { FarmerDashboard } from './pages/farmer/FarmerDashboard';
import { CropAnalysisFlow } from './pages/farmer/CropAnalysisFlow';
import { ScenarioSimulatorPage } from './pages/farmer/ScenarioSimulatorPage';
import { FarmsListPage } from './pages/farmer/FarmsListPage';
import { FarmerWeatherPage } from './pages/farmer/FarmerWeatherPage';
import { FarmerHistoryPage } from './pages/farmer/FarmerHistoryPage';
import { FPODashboard } from './pages/fpo/FPODashboard';
import { AdminSystemPage } from './pages/admin/AdminSystemPage';

const queryClient = new QueryClient();

const RootRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'FPO_ADMIN') {
    return <Navigate to="/fpo/dashboard" replace />;
  }
  if (user.role === 'SYSTEM_ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/farmer/dashboard" replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
                  <Routes>
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/landing" element={<LandingPage />} />
                    
                    {/* Farmer Journeys */}
                    <Route path="/farmer/dashboard" element={<ProtectedRoute><FarmerDashboard /></ProtectedRoute>} />
                    <Route path="/farmer/analyze" element={<ProtectedRoute><CropAnalysisFlow /></ProtectedRoute>} />
                    <Route path="/farmer/scenarios" element={<ProtectedRoute><ScenarioSimulatorPage /></ProtectedRoute>} />
                    <Route path="/farmer/farms" element={<ProtectedRoute><FarmsListPage /></ProtectedRoute>} />
                    <Route path="/farmer/weather" element={<ProtectedRoute><FarmerWeatherPage /></ProtectedRoute>} />
                    <Route path="/farmer/history" element={<ProtectedRoute><FarmerHistoryPage /></ProtectedRoute>} />

                    {/* FPO Intelligence Dashboard */}
                    <Route path="/fpo/dashboard" element={<ProtectedRoute><FPODashboard /></ProtectedRoute>} />
                    <Route path="/fpo/disease-map" element={<ProtectedRoute><FPODashboard /></ProtectedRoute>} />

                    {/* Admin / System Observability */}
                    <Route path="/admin" element={<ProtectedRoute><AdminSystemPage /></ProtectedRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                {/* Mobile Bottom Navigation for Farmers */}
                <BottomNav onOpenVoice={() => setIsVoiceOpen(true)} />

                {/* Global Voice Assistant Modal */}
                <VoiceQueryModal
                  isOpen={isVoiceOpen}
                  onClose={() => setIsVoiceOpen(false)}
                />
              </div>
            </BrowserRouter>
          </OfflineSyncProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
