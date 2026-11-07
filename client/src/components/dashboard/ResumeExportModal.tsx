import {
  BarChart3,
  Camera,
  FileDown,
  Images,
  MessageSquareQuote,
} from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import {
  MAX_RESUME_REVIEWS,
  DEFAULT_RESUME_OPTIONS,
  openResumePrintWindow,
  type ResumePrintOptions,
} from '@/lib/resume-print';
import { cn, formatNumber } from '@/lib/utils';
import type {
  FreelancerStats,
  PortfolioItem,
  PublicFreelancer,
  Review,
  Skill,
} from '@/types';

interface ResumeExportModalProps {
  open: boolean;
  onClose: () => void;
  profile: PublicFreelancer;
  skills: Skill[];
  stats: FreelancerStats;
  portfolio: PortfolioItem[];
  reviews: Review[];
  isLoading?: boolean;
}

type ToggleKey = keyof ResumePrintOptions;

export const ResumeExportModal = ({
  open,
  onClose,
  profile,
  skills,
  stats,
  portfolio,
  reviews,
  isLoading = false,
}: ResumeExportModalProps) => {
  const toast = useToast();
  const [selected, setSelected] = useState<ResumePrintOptions>(DEFAULT_RESUME_OPTIONS);

  const availability = {
    includeAvatar: Boolean(profile.avatarUrl),
    includePortfolio: portfolio.length > 0,
    includeStats: true,
    includeReviews: reviews.length > 0,
  };

  const options: ResumePrintOptions = {
    includeAvatar: selected.includeAvatar && availability.includeAvatar,
    includePortfolio: selected.includePortfolio && availability.includePortfolio,
    includeStats: selected.includeStats,
    includeReviews: selected.includeReviews && availability.includeReviews,
  };

  const toggleOption = (key: ToggleKey) => {
    if (!availability[key]) {
      return;
    }
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleItems: Array<{
    key: ToggleKey;
    label: string;
    hint: string;
    icon: typeof Camera;
  }> = [
    {
      key: 'includeAvatar',
      label: 'الصورة الشخصية',
      hint: availability.includeAvatar
        ? 'تظهر في أعلى السيرة الذاتية'
        : 'لا توجد صورة بعد — أضفها من الملف الشخصي',
      icon: Camera,
    },
    {
      key: 'includePortfolio',
      label: 'معرض الأعمال',
      hint: availability.includePortfolio
        ? `${formatNumber(portfolio.length)} مشروع مع الصور والروابط`
        : 'معرض أعمالك فارغ حاليًا',
      icon: Images,
    },
    {
      key: 'includeStats',
      label: 'التقييم والأداء',
      hint: `متوسط ${stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'جديد'} · ${formatNumber(stats.viewCount)} زيارة · ${formatNumber(stats.reviewCount)} تقييم`,
      icon: BarChart3,
    },
    {
      key: 'includeReviews',
      label: 'آراء العملاء',
      hint: availability.includeReviews
        ? `أحدث ${formatNumber(Math.min(reviews.length, MAX_RESUME_REVIEWS))} تقييمات`
        : 'لا توجد تقييمات بعد',
      icon: MessageSquareQuote,
    },
  ];

  const summaryParts: string[] = [];
  if (options.includeAvatar) summaryParts.push('الصورة الشخصية');
  if (options.includePortfolio) summaryParts.push(`${formatNumber(portfolio.length)} مشروع من المعرض`);
  if (options.includeStats) summaryParts.push('إحصاءات التقييم والأداء');
  if (options.includeReviews) summaryParts.push(`آراء أحدث ${formatNumber(Math.min(reviews.length, MAX_RESUME_REVIEWS))} عملاء`);
  summaryParts.push('بيانات التواصل والمهارات');

  const handleExport = () => {
    try {
      const opened = openResumePrintWindow(
        { profile, skills, stats, portfolio, reviews },
        options,
      );

      if (!opened) {
        toast.error('تعذر فتح نافذة الطباعة — فعّل السماح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة');
        return;
      }

      toast.success('جارٍ فتح نافذة الطباعة — اختر «حفظ كـ PDF» من الوجهة');
      onClose();
    } catch {
      toast.error('حدث خطأ أثناء إنشاء ملف السيرة الذاتية، حاول مرة أخرى');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="حفظ السيرة الذاتية PDF"
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isLoading}
            className="btn btn-primary"
          >
            <FileDown className="size-4" />
            {isLoading ? 'جارٍ التحضير...' : 'تصدير / طباعة PDF'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold leading-6 text-slate-500">
          اختر ما تريد تضمينه في ملف سيرتك الذاتية، وستُفتح نافذة طباعة بتنسيق A4
          جاهزة للحفظ كملف PDF.
        </p>

        <div className="space-y-2.5">
          {toggleItems.map((item) => {
            const disabled = !availability[item.key];
            const checked = options[item.key];

            return (
              <label
                key={item.key}
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-4 transition',
                  disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50/60 opacity-60'
                    : checked
                      ? 'border-brand-300 bg-brand-50/50 hover:border-brand-300'
                      : 'cursor-pointer border-slate-200 bg-white hover:border-brand-200',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-brand-700"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleOption(item.key)}
                />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <item.icon className="size-4 text-brand-700" />
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                    {item.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <p className="text-xs font-bold text-brand-900">
            <span className="text-brand-700">سيشمل الملف:</span>{' '}
            <span className="leading-7">{summaryParts.join(' · ')}</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};
