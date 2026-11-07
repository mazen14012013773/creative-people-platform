export interface FreelancerLevel {
  number: 1 | 2 | 3;
  title: string;
  points: number;
  nextLevelPoints: number | null;
  progress: number;
  rewardDiscount: number;
  freeFeaturedProfile: boolean;
}

export const getFreelancerLevel = (points: number): FreelancerLevel => {
  const balance = Math.max(0, Math.floor(points));
  if (balance > 500) return {
    number: 3, title: 'مستقل نخبة 👑', points: balance, nextLevelPoints: null,
    progress: 100, rewardDiscount: 10, freeFeaturedProfile: true,
  };
  if (balance > 200) return {
    number: 2, title: 'مستقل محترف 💼', points: balance, nextLevelPoints: 501,
    progress: Math.min(100, Math.round(((balance - 201) / 300) * 100)), rewardDiscount: 10, freeFeaturedProfile: false,
  };
  return {
    number: 1, title: 'مستقل صاعد 🚀', points: balance, nextLevelPoints: 201,
    progress: Math.min(100, Math.round((balance / 200) * 100)), rewardDiscount: 0, freeFeaturedProfile: false,
  };
};
