import {
  AlertTriangle,
  BadgeCheck,
  HandCoins,
  Lock,
  MessageCircle,
  Scale,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const SECTIONS = [
  {
    icon: BadgeCheck,
    title: 'طبيعة المنصة',
    body: 'مبدعين منصة عربية مجانية تجمع المستقلين بالعملاء. الهدف هو تسهيل الوصول إلى أصحاب المهارات وعرض أعمالهم وتجارب العملاء وبدء محادثات آمنة داخل المنصة، وليس إدارة المشاريع أو تنفيذها.',
  },
  {
    icon: HandCoins,
    title: 'لا وساطة مالية ولا عمولة',
    body: 'مبدعين لا تتدخل في الاتفاقات بين الطرفين. يتفق العميل والمستقل مباشرة على نطاق العمل والمواعيد قبل البدء.',
  },
  {
    icon: MessageCircle,
    title: 'التواصل المباشر',
    body: 'تتم المراسلات من خلال المحادثات الداخلية. يُمنع تبادل أرقام الهواتف أو البريد الإلكتروني أو روابط التواصل الخارجي، ولا تشارك معلومات شخصية أو مالية داخل المحادثات.',
  },
  {
    icon: Scale,
    title: 'إخلاء المسؤولية',
    body: 'لا تتحمل المنصة أي مسؤولية عن جودة الأعمال أو الالتزام بالمواعيد أو أي نزاعات أو خسائر مالية أو قانونية تنشأ بين المستقل والعميل. استخدام المنصة يعني موافقتك على إبرام اتفاقياتك على مسؤوليتك الشخصية.',
  },
  {
    icon: AlertTriangle,
    title: 'دقة البيانات والبلاغات',
    body: 'يتحمل المستقل مسؤولية صحة بياناته وأعماله وروابط تواصله. يمكن للزوار الإبلاغ عن أي حساب يحتوي على معلومات مضللة أو مخالفة، وستقوم الإدارة بمراجعة البلاغ واتخاذ ما تراه مناسباً، بما في ذلك تجميد الحساب أو إزالة المحتوى.',
  },
  {
    icon: Lock,
    title: 'الخصوصية',
    body: 'نحتفظ فقط بالبيانات اللازمة لتشغيل المنصة مثل بيانات الحساب والبروفايل والأعمال والتقييمات. البريد الإلكتروني ورقم الواتساب والهاتف يظهرون للزوار لأن الغرض الأساسي للمنصة هو تمكين التواصل المباشر. لا نبيع البيانات لأطراف ثالثة.',
  },
];

export const TermsPage = () => {
  useDocumentTitle('شروط الاستخدام وإخلاء المسؤولية');

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-100 bg-linear-to-l from-cyan-50 via-white to-sky-50 p-6 text-slate-900 shadow-xl shadow-slate-200/40 sm:p-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-bold text-sky-800">
            <Scale className="size-4" />
            معلومات قانونية
          </span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
            شروط الاستخدام وإخلاء المسؤولية
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            نرجو قراءة هذه الشروط قبل استخدام المنصة. هي توضح طبيعة الخدمة
            المجانية وحدود مسؤولية المنصة تجاه الأطراف.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
          باختصار: المنصة دليل مجاني للربط المباشر فقط، ولا تتحمل أي مسؤولية مالية
          أو قانونية عن الاتفاقات بين المستقلين والعملاء.
        </div>

        <div className="mt-6 space-y-4">
          {SECTIONS.map((section, index) => (
            <section
              key={section.title}
              className="card flex gap-4 p-5 sm:p-6"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <section.icon className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {index + 1}. {section.title}
                </h2>
                <p className="mt-2 text-sm leading-8 text-slate-600">{section.body}</p>
              </div>
            </section>
          ))}
        </div>

        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-slate-900">تعديل الشروط</h2>
          <p className="mt-2 text-sm leading-8 text-slate-600">
            قد نقوم بتحديث هذه الشروط عند إضافة ميزات جديدة أو تغيير طريقة عمل
            المنصة. استمرار استخدامك للمنصة بعد التحديث يعني موافقتك على النسخة
            المحدثة. آخر تحديث: أكتوبر 2026.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/" className="btn btn-primary">
              تصفح المستقلين
            </Link>
            <Link to="/register" className="btn btn-secondary">
              إنشاء حساب مستقل
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
