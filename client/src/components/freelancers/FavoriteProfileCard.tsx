import { useQuery } from '@tanstack/react-query';
import {
  FreelancerCard,
  FreelancerCardSkeleton,
} from '@/components/freelancers/FreelancerCard';
import { freelancersApi } from '@/services/freelancers.service';
import type { FreelancerCard as FreelancerCardType } from '@/types';

export const FavoriteProfileCard = ({ freelancerId }: { freelancerId: string }) => {
  const query = useQuery({
    queryKey: ['freelancer', freelancerId],
    queryFn: () => freelancersApi.detail(freelancerId),
    retry: false,
    staleTime: 60_000,
  });

  if (query.isPending) {
    return <FreelancerCardSkeleton />;
  }

  if (query.isError || !query.data) {
    return null;
  }

  const { freelancer, skills, stats } = query.data;
  const card: FreelancerCardType = {
    ...freelancer,
    avgRating: stats.avgRating,
    reviewCount: stats.reviewCount,
    skills,
  };

  return <FreelancerCard freelancer={card} />;
};
