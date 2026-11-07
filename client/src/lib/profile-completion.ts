export interface FreelancerCompletionProfile {
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  location: string | null;
}

export const getFreelancerCompletionChecklist = (
  profile: FreelancerCompletionProfile,
  skillCount: number,
  portfolioCount: number,
  serviceCount: number,
) => [
  { label: 'صورة شخصية', done: Boolean(profile.avatarUrl) },
  { label: 'المسمى الوظيفي', done: Boolean(profile.title?.trim()) },
  { label: 'نبذة تعريفية', done: Boolean(profile.bio && profile.bio.trim().length >= 20) },
  { label: 'المحافظة', done: Boolean(profile.location?.trim()) },
  { label: 'المهارات', done: skillCount > 0 },
  { label: 'معرض الأعمال', done: portfolioCount > 0 },
  { label: 'خدمة مصغّرة', done: serviceCount > 0 },
];
