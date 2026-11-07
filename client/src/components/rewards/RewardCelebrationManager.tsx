import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RewardCelebrationModal } from './RewardCelebrationModal';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi } from '@/services/notifications.service';
import { rewardsApi } from '@/services/rewards.service';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { getFreelancerLevel } from '@/lib/freelancer-level';

export const RewardCelebrationManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const inbox = useQuery({ queryKey: ['notification-inbox'], queryFn: notificationsApi.inbox, enabled: user?.role === 'Freelancer' });
  const notification = inbox.data?.items.find((item) => item.type === 'REWARD_EARNED' && item.message.includes('أكملت الطلب بنجاح') && !item.isRead);
  const rewards = useQuery({ queryKey: ['freelancer-rewards'], queryFn: rewardsApi.get, enabled: Boolean(notification) });
  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['notification-inbox'] }); },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تأكيد قراءة الإشعار.')),
  });
  if (!notification || !rewards.data) return null;
  const balance = rewards.data.balance;
  const level = getFreelancerLevel(balance);
  return <RewardCelebrationModal notification={notification} balance={balance} levelTitle={level.title} progress={level.progress} nextLevelPoints={level.nextLevelPoints} onClose={() => markRead.mutate(notification.id)}/>;
};
