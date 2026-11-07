import { Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpenCheck, BriefcaseBusiness, CheckCircle2, Compass,
  HeartHandshake, LifeBuoy, MessageCircle, Search, ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const roles = [
  { icon: BriefcaseBusiness, title: 'للمبدعين المستقلين', color: 'bg-cyan-50 text-cyan-700', items: ['أنشئ ملفاً تعريفياً واضحاً وأضف مهاراتك وخبراتك.', 'أكمل بيانات الحساب وأرسل طلب توثيق ولي الأمر إذا كان مطلوباً.', 'أضف خدماتك ومعرض أعمالك وشارك خبراتك في المجتمع.', 'تابع الرسائل والطلبات والإشعارات من لوحة التحكم.'] },
  { icon: UsersRound, title: 'للعملاء', color: 'bg-orange-50 text-orange-700', items: ['اكتشف المبدعين والخدمات باستخدام البحث والتصنيفات.', 'راجع تفاصيل الخدمة ومعرض الأعمال قبل التواصل.', 'احفظ الملفات التي تهمك في المفضلة.', 'تواصل بأمان عبر محادثات المنصة أو اطلب مساعدة الدعم.'] },
  { icon: HeartHandshake, title: 'لأولياء الأمور', color: 'bg-violet-50 text-violet-700', items: ['أنشئ حساب ولي أمر منفصلاً عن حساب العميل.', 'أرسل طلب ربط إلى حساب الابن وانتظر موافقته.', 'أضف أكثر من ابن وخصص اسماً وصورة لكل حساب مرتبط.', 'استعرض الملف والخدمات والأعمال والمشاركات، واقرأ المحادثات عند تفعيل إذن القراءة.'] },
];

const sections = [
  { id: 'start', label: 'البدء واختيار الحساب' },
  { id: 'roles', label: 'الأدوار ولوحات التحكم' },
  { id: 'tools', label: 'أقسام المنصة' },
  { id: 'safety', label: 'الأمان والخصوصية' },
  { id: 'faq', label: 'أسئلة شائعة' },
];

const tools = [
  { icon: Search, title: 'البحث والخدمات', text: 'ابحث عن الخدمات والمبدعين، ثم استخدم التصنيفات والمهارات لتضييق النتائج.', href: '/services', action: 'تصفح الخدمات' },
  { icon: BriefcaseBusiness, title: 'الملفات ومعرض الأعمال', text: 'اطلع على نبذة المبدع ومهاراته وخدماته وصوره وفيديوهاته وروابط مشاريعه.', href: '/#freelancers', action: 'اكتشف المبدعين' },
  { icon: MessageCircle, title: 'المحادثات الداخلية', text: 'ناقش تفاصيل العمل وأرسل الرسائل والملفات المدعومة داخل المنصة.', href: '/chat', action: 'افتح المحادثات' },
  { icon: BookOpenCheck, title: 'مجتمع مبدعين', text: 'شارك مشروعاً أو تجربة تعليمية، وتفاعل مع المنشورات بالإعجاب والتعليقات.', href: '/community', action: 'اذهب إلى المجتمع' },
  { icon: LifeBuoy, title: 'الدعم الفني', text: 'ابدأ محادثة دعم من الزر العائم، وأرفق صورة أو فيديو أو ملفاً لتوضيح المشكلة.', href: '/#support', action: 'تعرف على الدعم' },
  { icon: ShieldCheck, title: 'لوحات التحكم', text: 'أدر الملف والخدمات والمشاركات وطلبات الحساب من لوحة التحكم المناسبة لدورك.', href: '/login', action: 'تسجيل الدخول' },
];

export const GuidePage = () => {
  useDocumentTitle('دليل استخدام منصة مبدعين');

  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] text-slate-800">
    <section className="relative isolate overflow-hidden border-b border-cyan-100 bg-gradient-to-l from-cyan-100/70 via-white to-orange-50/80">
      <div className="pointer-events-none absolute -top-28 start-8 -z-10 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 end-0 -z-10 size-96 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="container-page grid gap-9 py-12 sm:py-16 lg:grid-cols-[1fr_300px] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-4 py-2 text-xs font-extrabold text-cyan-800"><Compass className="size-4" /> دليل مبدعين الشامل</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">كل ما تحتاج معرفته عن <span className="text-cyan-700">مبدعين</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">دليل عملي للتسجيل، واكتشاف المواهب والخدمات، واستخدام المجتمع والمحادثات ولوحات التحكم بأمان.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl border-b-4 border-cyan-800 bg-cyan-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-700"><Sparkles className="size-4" /> ابدأ الآن</Link>
            <a href="#start" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:border-cyan-200 hover:text-cyan-800">تصفح الدليل <ArrowLeft className="size-4" /></a>
          </div>
        </div>
        <nav aria-label="محتويات الدليل" className="rounded-3xl border border-white bg-white/90 p-5 shadow-xl shadow-cyan-100/50 backdrop-blur">
          <p className="font-extrabold text-slate-900">انتقل مباشرةً إلى</p>
          <ul className="mt-3 space-y-1">{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800"><span>{section.label}</span><span className="text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span></a></li>)}</ul>
        </nav>
      </div>
    </section>

    <div className="container-page space-y-14 py-12 sm:space-y-16 sm:py-16">
      <section id="start" className="scroll-mt-28">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">ابدأ من هنا</p><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">أنشئ حسابك واختر المسار المناسب</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">تجمع مبدعين المبدعين المستقلين والعملاء وأولياء الأمور في مكان واحد. اختر نوع الحساب الصحيح عند التسجيل؛ لكل دور أدوات ولوحة تحكم تناسب احتياجاته.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">{['أنشئ الحساب بالبريد أو وسيلة الدخول المتاحة.', 'أكمل بيانات الملف والصورة والاهتمامات المطلوبة.', 'افتح لوحة التحكم من القائمة لمتابعة نشاطك.'].map((item, index) => <article key={item} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30"><span className="text-sm font-black text-cyan-700">الخطوة {index + 1}</span><p className="mt-2 text-sm leading-6 text-slate-600">{item}</p></article>)}</div>
      </section>

      <section id="roles" className="scroll-mt-28">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">الأدوار</p><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">أدوات واضحة لكل مستخدم</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">{roles.map(({ icon: Icon, title, color, items }) => <article key={title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40"><span className={`flex size-12 items-center justify-center rounded-2xl ${color}`}><Icon className="size-6" /></span><h3 className="mt-4 text-lg font-black text-slate-900">{title}</h3><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></article>)}</div>
      </section>

      <section id="tools" className="scroll-mt-28">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">دليل الأقسام</p><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">اكتشف ما يمكنك فعله</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tools.map(({ icon: Icon, title, text, href, action }) => <article key={title} className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/30"><span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-100 text-cyan-800"><Icon className="size-5" /></span><h3 className="mt-4 font-extrabold text-slate-900">{title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{text}</p><Link to={href} className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-800 hover:text-cyan-950">{action}<ArrowLeft className="size-4" /></Link></article>)}</div>
      </section>

      <section id="safety" className="scroll-mt-28 rounded-3xl border border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-cyan-50 p-6 shadow-lg shadow-emerald-100/30 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">الأمان والخصوصية</p><h2 className="mt-2 text-2xl font-black text-slate-950">تواصل بوعي واحمِ بياناتك</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">استخدم أدوات المنصة للتواصل ومشاركة الملفات، ولا تشارك كلمات المرور أو رموز التحقق أو بيانات الدفع الحساسة في الرسائل. راجع هوية الطرف الآخر واتفق بوضوح على تفاصيل العمل.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><p className="flex gap-2 rounded-2xl bg-white/85 p-4 text-sm leading-6 text-slate-700"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />لا ترسل كلمة المرور أو رمز التحقق لأي شخص، حتى لو ادعى أنه من فريق الدعم.</p><p className="flex gap-2 rounded-2xl bg-white/85 p-4 text-sm leading-6 text-slate-700"><HeartHandshake className="mt-0.5 size-5 shrink-0 text-violet-700" />ربط ولي الأمر يتطلب موافقة صاحب حساب الابن، وقراءة المحادثات لها موافقة مستقلة.</p></div>
      </section>

      <section id="faq" className="scroll-mt-28">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">مساعدة سريعة</p><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">أسئلة شائعة</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">{[
          ['هل استخدام المنصة مجاني؟', 'يمكنك إنشاء حساب واستكشاف الأقسام مجاناً. راجع تفاصيل كل خدمة واتفق مع مقدمها على نطاق العمل وشروطه.'],
          ['كيف أتواصل مع الدعم؟', 'سجّل الدخول، ثم افتح زر الدعم الفني العائم أسفل الصفحة وأنشئ محادثة جديدة.'],
          ['أين أتابع رسائلي؟', 'افتح قسم المحادثات من شريط التنقل. ستجد سجل الرسائل والمرفقات المرتبطة بكل محادثة.'],
          ['كيف أبلغ عن مشكلة؟', 'استخدم الدعم الفني واشرح المشكلة وأرفق ما يساعد على فهمها. يمكن أيضاً استخدام أدوات الإبلاغ المتاحة في المحتوى.'],
        ].map(([question, answer]) => <article key={question} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-md shadow-slate-200/30"><h3 className="font-extrabold text-slate-900">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p></article>)}</div>
      </section>

      <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-l from-cyan-700 to-sky-600 p-6 text-white shadow-xl shadow-cyan-200/60 sm:flex-row sm:items-center sm:p-8"><div><h2 className="text-xl font-black">جاهز لاكتشاف مبدعين؟</h2><p className="mt-2 text-sm leading-6 text-cyan-50">ابدأ باستكشاف الخدمات أو أنشئ حسابك وشارك إبداعك.</p></div><div className="flex flex-wrap gap-3"><Link to="/services" className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-cyan-800 hover:bg-cyan-50">تصفح الخدمات</Link><Link to="/community" className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-white/10">المجتمع</Link></div></section>
    </div>
  </main>;
};
