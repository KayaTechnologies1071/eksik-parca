import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import { MainMenuScreen } from './components/MainMenuScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameplayScreen } from './components/GameplayScreen';
import { Shield, Monitor } from 'lucide-react';

export const App: React.FC = () => {
  const {
    user,
    isAuthReady,
    room,
    toastMessage,
    penaltyAlert,
    mobilePreviewFrame,
    initAuth,
    updateDisplayName,
    joinRoom,
    toggleMobilePreviewFrame,
  } = useGameStore();

  const [onboardingName, setOnboardingName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('eksik_parca_name')
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');

    if (joinParam) {
      const tabDeviceId = `dev_tab_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('eksik_parca_device_id', tabDeviceId);
      const partnerName = `Dedektif #${Math.floor(10 + Math.random() * 89)}`;
      localStorage.setItem('eksik_parca_name', partnerName);
      setShowOnboarding(false);
      initAuth(partnerName).then(() => {
        joinRoom(joinParam.toUpperCase());
        window.history.replaceState({}, '', '/');
      });
    } else {
      initAuth();
    }
  }, [initAuth, joinRoom]);

  const isPenaltyFlash =
    penaltyAlert && Date.now() - penaltyAlert.timestamp < 600;

  if (showOnboarding) {
    return (
      <div className="app-dvh w-full bg-primary text-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-[6px] bg-surface border border-subtle shadow-2xl animate-doc-open">
          <div className="flex items-center gap-2 font-mono text-xs text-crimson font-bold mb-2">
            <Shield size={16} />
            <span>ADLİ BİLİŞİM VE SORUŞTURMA SİSTEMİ</span>
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-primary mb-2">
            EKSİK PARÇA
          </h1>
          <p className="font-mono text-xs text-secondary leading-relaxed mb-5">
            Kimse gerçeğin tamamına sahip değildir. E-posta veya şifre gerekmez; masada görünecek{' '}
            <strong className="text-primary">Dedektif Takma Adınızı</strong> belirleyin.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const chosen = onboardingName.trim() || 'Başkomiser K.';
              updateDisplayName(chosen);
              setShowOnboarding(false);
            }}
            className="space-y-3"
          >
            <div>
              <label className="block font-mono text-[11px] text-secondary uppercase mb-1">
                DEDEKTİF TAKMA ADI (ALIAS):
              </label>
              <input
                type="text"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                placeholder="Örn: Dedektif Kaan"
                maxLength={28}
                autoFocus
                className="w-full px-3.5 py-3 rounded-[4px] bg-primary border border-subtle focus:border-crimson text-primary font-mono text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-3 rounded-[4px] bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-crimson transition-all"
            >
              SİSTEME GİRİŞ YAP →
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthReady || !user) {
    return (
      <div className="app-dvh w-full bg-primary text-primary flex items-center justify-center font-mono text-xs">
        <span className="animate-pulse text-secondary">
          [ MERKEZ ARŞİV VERİTABANI BAĞLANTISI KURULUYOR... ]
        </span>
      </div>
    );
  }

  const coreApp = (
    <div
      className={`w-full h-full overflow-hidden flex flex-col bg-primary text-primary relative ${
        isPenaltyFlash ? 'ring-4 ring-inset ring-crimson' : ''
      }`}
    >
      {/* Floating Tactical Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-3 py-2 rounded-[4px] bg-elevated/95 border border-crimson/60 text-primary font-mono text-xs shadow-2xl flex items-center justify-between gap-2 pointer-events-none animate-doc-open">
          <span>{toastMessage}</span>
        </div>
      )}

      {!room ? (
        <MainMenuScreen />
      ) : room.status === 'LOBBY' ? (
        <LobbyScreen />
      ) : (
        <GameplayScreen />
      )}
    </div>
  );

  // Desktop Phone Simulator Preview Mode (390x844 iOS/Android Viewport Test)
  if (mobilePreviewFrame) {
    return (
      <div className="app-dvh w-full bg-[#050609] flex flex-col items-center justify-center p-3 overflow-hidden">
        <div className="mb-2 flex items-center gap-3 font-mono text-xs text-secondary">
          <span>📱 MOBİL UYGULAMA SİMÜLATÖRÜ (390 × 844 dp — iOS / Android)</span>
          <button
            type="button"
            onClick={toggleMobilePreviewFrame}
            className="px-2.5 py-1 rounded-[4px] bg-elevated border border-subtle text-primary hover:border-crimson flex items-center gap-1"
          >
            <Monitor size={12} />
            Tam Ekrana Dön
          </button>
        </div>
        <div className="phone-simulator-shell">{coreApp}</div>
      </div>
    );
  }

  return <div className="app-dvh w-full overflow-hidden">{coreApp}</div>;
};
