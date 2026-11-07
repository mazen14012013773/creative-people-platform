import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/services/system.service';

export const SYSTEM_STATUS_KEY = ['system-status'];

export const useSystemStatus = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SYSTEM_STATUS_KEY,
    queryFn: systemApi.status,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: SYSTEM_STATUS_KEY });
    };

    window.addEventListener('system:maintenance', refresh);

    return () => window.removeEventListener('system:maintenance', refresh);
  }, [queryClient]);

  return query;
};
