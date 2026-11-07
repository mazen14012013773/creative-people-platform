import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getFreelancerCompletionChecklist } from '@/lib/profile-completion';
import { portfolioApi } from '@/services/portfolio.service';
import { profileApi } from '@/services/profile.service';
import { servicesApi } from '@/services/services.service';

export const ProfileCompletionBanner = () => {
  const { user } = useAuth();
  const enabled = user?.role === 'Freelancer' && user.profileComplete;
  const profileQuery = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine, enabled });
  const portfolioQuery = useQuery({ queryKey: ['my-portfolio'], queryFn: portfolioApi.listMine, enabled });
  const servicesQuery = useQuery({ queryKey: ['my-services'], queryFn: servicesApi.listMine, enabled });

  if (!enabled || !profileQuery.data || !portfolioQuery.data || !servicesQuery.data) return null;
  const checklist = getFreelancerCompletionChecklist(
    profileQuery.data.user,
    profileQuery.data.skills.length,
    portfolioQuery.data.length,
    servicesQuery.data.length,
  );
  const missingItems = checklist.filter((item) => !item.done);
  if (missingItems.length === 0) return null;
  const completion = Math.round(((checklist.length - missingItems.length) / checklist.length) * 100);

  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950" dir="rtl">
      <div className="container-page flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold">
            <CircleAlert className="size-4 shrink-0 text-amber-700" />
            أكمل بروفايلك ليظهر بشكل أفضل للعملاء ({completion}%).
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-800">
            المتبقي: {missingItems.slice(0, 3).map((item) => item.label).join('، ')}{missingItems.length > 3 ? '، والمزيد' : ''}
          </p>
        </div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-extrabold text-amber-900 underline underline-offset-4">
          إكمال الحساب <ArrowLeft className="size-4" />
        </Link>
      </div>
    </div>
  );
};
