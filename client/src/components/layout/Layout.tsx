import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { MaintenanceGate } from './MaintenanceGate';
import { SitewideNotification } from './SitewideNotification';
import { usePlatformRealtime } from '@/hooks/usePlatformRealtime';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { useAuth } from '@/context/AuthContext';
import { FreelancerVerificationGate } from '@/components/dashboard/FreelancerVerificationGate';
import { SupportChatWidget } from '@/components/support/SupportChatWidget';
import { RewardCelebrationManager } from '@/components/rewards/RewardCelebrationManager';
import { useGlobalAssetProtection } from '@/hooks/useGlobalAssetProtection';

export const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  usePlatformRealtime();
  useGlobalAssetProtection();
  const verificationLocked = user?.role === 'Freelancer' && user.accountStatus !== 'ACTIVE';
  const [verificationGateOpen, setVerificationGateOpen] = useState(() => {
    if (!user || typeof window === 'undefined') return true;
    return window.sessionStorage.getItem(`mabdeen:verification-gate-dismissed:${user.id}`) !== '1';
  });
  if (verificationLocked && location.pathname !== '/') return <Navigate to="/" replace />;
  return (
    <MaintenanceGate>
      <div className="flex min-h-screen flex-col">
        <Header />
        <RewardCelebrationManager />
        {verificationLocked && !verificationGateOpen ? <aside role="status" className="sticky top-[5.25rem] z-40 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-bold">حسابك قيد التوثيق؛ بقية أقسام المنصة ستظل مغلقة حتى موافقة الإدارة.</p>
            <button type="button" onClick={() => setVerificationGateOpen(true)} className="rounded-xl bg-amber-600 px-4 py-2 font-extrabold text-white hover:bg-amber-700">متابعة التوثيق</button>
          </div>
        </aside> : null}
        {!verificationLocked ? <ProfileCompletionBanner /> : null}
        {!verificationLocked ? <SitewideNotification /> : null}
        <main className="flex-1">
          <Outlet />
        </main>
        <SupportChatWidget />
        {!verificationLocked ? <Footer /> : null}
        {verificationLocked && verificationGateOpen ? <FreelancerVerificationGate onClose={() => {
          if (user) window.sessionStorage.setItem(`mabdeen:verification-gate-dismissed:${user.id}`, '1');
          setVerificationGateOpen(false);
        }} /> : null}
      </div>
    </MaintenanceGate>
  );
};
