import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api, tokenStorage } from '@/services/api';

interface RealtimePayload { type: 'message' | 'notification' | 'services' | 'profile' | 'community' | 'support' | 'data' | 'order'; orderId?: string; }

export const usePlatformRealtime = (): void => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    let retryDelay = 1000;

    const connect = async (): Promise<void> => {
      while (!controller.signal.aborted) {
        try {
          const token = tokenStorage.get();
          if (!token) return;
          const url = new URL(api.getUri({ url: '/realtime/stream' }), window.location.origin);
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
            cache: 'no-store',
            signal: controller.signal,
          });
          if (response.status === 401 || response.status === 403) {
            window.dispatchEvent(new Event('auth:unauthorized'));
            return;
          }
          if (!response.ok || !response.body) throw new Error(`Realtime stream returned ${response.status}`);

          retryDelay = 1000;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!controller.signal.aborted) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            let boundary = buffer.indexOf('\n\n');
            while (boundary >= 0) {
              const frame = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const data = frame.split('\n').find((line) => line.startsWith('data:'))?.slice(5).trim();
              if (data) {
                try {
                  const payload = JSON.parse(data) as RealtimePayload;
                  if (payload.type === 'message') {
                    void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
                    void queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
                    void queryClient.invalidateQueries({ queryKey: ['notification-inbox'] });
                  } else if (payload.type === 'notification') {
                    void queryClient.invalidateQueries({ queryKey: ['notification-inbox'] });
                  } else if (payload.type === 'services') {
                    void queryClient.invalidateQueries({ queryKey: ['freelancer-services'] });
                    void queryClient.invalidateQueries({ queryKey: ['my-services'] });
                    void queryClient.invalidateQueries({ queryKey: ['freelancers'] });
                    void queryClient.invalidateQueries({ queryKey: ['featured-freelancers'] });
                  } else if (payload.type === 'profile') {
                    void queryClient.invalidateQueries({ queryKey: ['freelancers'] });
                    void queryClient.invalidateQueries({ queryKey: ['featured-freelancers'] });
                    void queryClient.invalidateQueries({ queryKey: ['freelancer'] });
                    void queryClient.invalidateQueries({ queryKey: ['freelancer-services'] });
                    void queryClient.invalidateQueries({ queryKey: ['all-platform-services'] });
                    void queryClient.invalidateQueries({ queryKey: ['my-services'] });
                    void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
                    void queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
                  } else if (payload.type === 'community') {
                    void queryClient.invalidateQueries({ queryKey: ['community-posts'] });
                    void queryClient.invalidateQueries({ queryKey: ['my-community-posts'] });
                    void queryClient.invalidateQueries({ queryKey: ['community-post'] });
                    void queryClient.invalidateQueries({ queryKey: ['community-comments'] });
                  } else if (payload.type === 'support') {
                    void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
                    void queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
                    void queryClient.invalidateQueries({ queryKey: ['support-messages'] });
                  } else if (payload.type === 'order') {
                    void queryClient.invalidateQueries({ queryKey: ['orders'] });
                    if (payload.orderId) {
                      void queryClient.invalidateQueries({ queryKey: ['order', payload.orderId] });
                      void queryClient.invalidateQueries({ queryKey: ['order-messages', payload.orderId] });
                    } else {
                      void queryClient.invalidateQueries({ queryKey: ['order'] });
                      void queryClient.invalidateQueries({ queryKey: ['order-messages'] });
                    }
                  } else if (payload.type === 'data') {
                    void refreshUser().catch(() => undefined);
                    void Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
                      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] }),
                      queryClient.invalidateQueries({ queryKey: ['my-services'] }),
                      queryClient.invalidateQueries({ queryKey: ['my-service-uploads'] }),
                      queryClient.invalidateQueries({ queryKey: ['buyer-suggestions'] }),
                      queryClient.invalidateQueries({ queryKey: ['notification-inbox'] }),
                      queryClient.invalidateQueries({ queryKey: ['orders'] }),
                    ]);
                  }
                } catch { /* Ignore malformed stream frames and keep the connection alive. */ }
              }
              boundary = buffer.indexOf('\n\n');
            }
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          console.warn('Realtime connection interrupted; reconnecting.', error);
        }
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, retryDelay);
          controller.signal.addEventListener('abort', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
        });
        retryDelay = Math.min(retryDelay * 2, 10_000);
      }
    };

    void connect();
    return () => controller.abort();
  }, [queryClient, refreshUser, user?.accountStatus, user?.id]);
};
