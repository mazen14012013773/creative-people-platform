import { ArrowUpLeft, BookOpenCheck, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export const Footer = () => {
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-slate-100 bg-white text-slate-700">
      <div className="pointer-events-none absolute -inset-e-20 -top-32 size-72 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 inset-s-1/4 size-72 rounded-full bg-orange-50 blur-3xl" />

      <div className="container-page relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div>
          <Logo variant="footer" />
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
            مبدعين منصة عربية مجانية للمستقلين والعملاء، تتيح عرض المهارات والخدمات
            واستكشافها والتواصل عبر محادثات داخلية آمنة.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-800">
            <ShieldCheck className="size-4 text-emerald-600" />
            مجاني بالكامل — بدون عمولة
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900">للمستقلين</h3>
          <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-500">
            <li>
              <Link to="/register" className="transition hover:text-sky-700">
                إنشاء حساب مستقل
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="transition hover:text-sky-700">
                لوحة التحكم
              </Link>
            </li>
            <li>
              <Link to="/guide" className="transition hover:text-sky-700">
                <span className="inline-flex items-center gap-2"><BookOpenCheck className="size-4" />دليل المنصة</span>
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900">للمشترين</h3>
          <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-500">
            <li>
              <Link
                to="/register?type=buyer"
                className="transition hover:text-sky-700"
              >
                إنشاء حساب مشتري
              </Link>
            </li>
            <li>
              <Link to="/favorites" className="transition hover:text-sky-700">
                قائمة المفضلة
              </Link>
            </li>
            <li><Link to="/community" className="transition hover:text-sky-700">مجتمع مبدعين</Link></li>
            <li>
              <Link to="/terms" className="transition hover:text-sky-700">
                شروط الاستخدام
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Sparkles className="size-4 text-gold-300" />
            ملاحظة مهمة
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            المنصة لا تدير المدفوعات ولا تتدخل في الاتفاقات بين الطرفين. تحقق من
            هوية الطرف الآخر واتفقا على التفاصيل مباشرة.
          </p>
          <Link
            to="/terms"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-700 hover:text-sky-900"
          >
            اقرأ إخلاء المسؤولية
            <ArrowUpLeft className="size-4" />
          </Link>
        </div>
      </div>

      <div className="relative border-t border-slate-100 py-5">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-[11px] font-semibold text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} مبدعين. جميع الحقوق محفوظة.</p>
          <p className="inline-flex items-center gap-1.5">
            صُنع بشغف لخدمة المستقلين العرب
            <Heart className="size-3.5 fill-current text-rose-400/70" />
          </p>
        </div>
      </div>
    </footer>
  );
};
