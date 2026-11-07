import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  mode?: 'freelancer' | 'buyer' | 'any';
}

const CONTENT = {
  freelancer: {
    eyebrow: 'مساحة المستقلين',
    heading: 'مهارتك تستحق أن يراها العملاء.',
    description:
      'بروفايل احترافي، معرض أعمال، وتواصل مباشر عبر واتساب. بدون عمولة وبدون تعقيد.',
    perks: [
      {
        icon: Sparkles,
        title: 'بروفايل يبرز مهاراتك',
        description: 'أعمالك وتخصصك وتقييمات عملائك في مكان واحد.',
      },
      {
        icon: MessageCircle,
        title: 'تواصل مباشر',
        description: 'رسالة واتساب جاهزة تصل إليك من العميل دون وسيط.',
      },
      {
        icon: ShieldCheck,
        title: 'إحصائيات واضحة',
        description: 'تابع زيارات بروفايلك ونقرات التواصل والتقييمات.',
      },
    ],
  },
  buyer: {
    eyebrow: 'مساحة أصحاب المشاريع',
    heading: 'اعثر على المبدع المناسب أسرع.',
    description:
      'ابحث حسب التخصص، راجع الأعمال والتقييمات، واحفظ من يعجبك للرجوع إليه.',
    perks: [
      {
        icon: Search,
        title: 'بحث دقيق',
        description: 'فلترة حسب المهارة والمحافظة والتوفر.',
      },
      {
        icon: Heart,
        title: 'قائمة مفضلة',
        description: 'احفظ أفضل المستقلين وقارن بينهم قبل اتخاذ القرار.',
      },
      {
        icon: MessageCircle,
        title: 'اتفاق مباشر',
        description: 'تواصل مع المستقل مباشرة واتفق على تفاصيل مشروعك.',
      },
    ],
  },
  any: {
    eyebrow: 'مساحة الحساب',
    heading: 'كل ما تحتاجه، في مكان واحد.',
    description:
      'سواء كنت تقدم خدماتك أو تبحث عن مستقل، حسابك يمنحك وصولاً سريعاً لكل الأدوات.',
    perks: [
      {
        icon: Sparkles,
        title: 'مستقلون ومشترون',
        description: 'حساب واحد يناسب طريقة استخدامك للمنصة.',
      },
      {
        icon: Heart,
        title: 'مفضلتك محفوظة',
        description: 'ارجع إلى البروفايلات التي أعجبتك في أي وقت.',
      },
      {
        icon: ShieldCheck,
        title: 'بدون رسوم',
        description: 'لا اشتراكات ولا عمولة على التواصل أو الاتفاق.',
      },
    ],
  },
} as const;

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  mode = 'freelancer',
}: AuthLayoutProps) => {
  const content = CONTENT[mode];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC] transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(20,184,166,0.16),transparent_32%),radial-gradient(circle_at_85%_85%,rgba(245,158,11,0.12),transparent_30%)]" />
      <div className="grid-overlay pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-375 lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.88fr)]">
        <main className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-140">
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="text-xs font-extrabold text-slate-500 transition hover:text-brand-700"
                >
                  العودة للرئيسية
                </Link>
              </div>
            </div>

            <div className="mt-9 animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-extrabold text-brand-800 shadow-sm backdrop-blur">
                <BadgeCheck className="size-3.5" />
                التسجيل مجاني بالكامل
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.15rem]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">{subtitle}</p>
            </div>

            <div className="mt-6 animate-fade-in">{children}</div>
            <div className="mt-6 text-sm font-semibold text-slate-500">{footer}</div>
          </div>
        </main>

        <aside className="relative m-3 hidden overflow-hidden rounded-[2.5rem] border border-slate-100 bg-linear-to-br from-cyan-50 via-white to-sky-50 p-10 text-slate-900 shadow-xl shadow-slate-200/40 lg:flex lg:flex-col lg:justify-center xl:m-5 xl:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,174,239,0.12),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(251,146,60,0.1),transparent_36%)]" />
          <div className="pointer-events-none absolute -inset-e-20 -top-20 size-72 rounded-full border border-sky-100 bg-white/50 blur-sm" />
          <div className="pointer-events-none absolute -bottom-24 -inset-s-16 size-72 rounded-full border border-violet-100 bg-violet-50/50 blur-sm" />

          <div className="relative mx-auto w-full max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-sky-800 backdrop-blur">
              <Sparkles className="size-3.5 text-orange-500" />
              {content.eyebrow}
            </span>

            <h2 className="mt-6 text-[2rem] font-extrabold leading-[1.35] xl:text-[2.4rem]">
              {content.heading}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {content.description}
            </p>

            <div className="mt-8 space-y-3">
              {content.perks.map((perk) => (
                <div
                  key={perk.title}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/85 p-3.5 shadow-sm transition hover:border-sky-200 hover:bg-white"
                >
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                    <perk.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">{perk.title}</p>
                    <p className="mt-0.5 text-[11px] leading-6 text-slate-500">
                      {perk.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-[10px] font-semibold leading-6 text-slate-500">
              لا نتدخل في المدفوعات ولا نأخذ أي عمولة. المنصة دليل للربط المباشر.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
