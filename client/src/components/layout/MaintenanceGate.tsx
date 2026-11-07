import type { ReactNode } from 'react';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { useAuth } from '@/context/AuthContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';

interface MaintenanceGateProps {
  children: ReactNode;
}

export const MaintenanceGate = ({ children }: MaintenanceGateProps) => {
  const { user } = useAuth();
  const query = useSystemStatus();

  if (query.data?.maintenanceEnabled && user?.role !== 'Admin') {
    return (
      <MaintenancePage status={query.data} onRetry={() => void query.refetch()} />
    );
  }

  return <>{children}</>;
};
