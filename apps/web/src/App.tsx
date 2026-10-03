import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { OfflineSyncProvider } from './context/OfflineSyncContext';
import { JudgeModeBanner } from './components/JudgeModeBanner';
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

export const App: React.FC = () => {
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <OfflineSyncProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
                <JudgeModeBanner />
                <Navbar />

                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Farmer Journeys */}
                    <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                    <Route path="/farmer/analyze" element={<CropAnalysisFlow />} />
                    <Route path="/farmer/scenarios" element={<ScenarioSimulatorPage />} />
                    <Route path="/farmer/farms" element={<FarmsListPage />} />
                    <Route path="/farmer/weather" element={<FarmerWeatherPage />} />
                    <Route path="/farmer/history" element={<FarmerHistoryPage />} />

                    {/* FPO Intelligence Dashboard */}
                    <Route path="/fpo/dashboard" element={<FPODashboard />} />
                    <Route path="/fpo/disease-map" element={<FPODashboard />} />

                    {/* Admin / System Observability */}
                    <Route path="/admin" element={<AdminSystemPage />} />

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
