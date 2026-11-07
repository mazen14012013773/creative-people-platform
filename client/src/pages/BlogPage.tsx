import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Clock3, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getArticles } from '@/services/articles.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Article } from '@/types';
import { MediaViewer } from '@/components/common/MediaViewer';

const categories = ['الكل', 'نصائح للآباء', 'تعلم البرمجة', 'قصص نجاح', 'المسابقات'];
const categoryColors = ['text-slate-700', 'text-orange-700', 'text-violet-700', 'text-lime-700', 'text-cyan-700'];
const dateLabel = (date: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));

const ArticleCard = ({ article }: { article: Article }) => (
  <article className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
    <MediaViewer url={article.coverImage} title={article.title} aspect="cover" className="rounded-none border-0 shadow-none" mediaClassName="h-52" />
    <div className="p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">{article.category}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock3 className="size-3.5" />{article.readTime} دقائق</span>
      </div>
      <h2 className="mt-4 text-xl font-black leading-8 text-slate-900"><Link to={`/blog/${article.slug}`} className="transition hover:text-cyan-700">{article.title}</Link></h2>
      <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{article.excerpt}</p>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold text-slate-500">{dateLabel(article.publishedAt)}</span>
        <Link to={`/blog/${article.slug}`} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-cyan-700 hover:text-orange-600">اقرأ المقال <ArrowLeft className="size-4" /></Link>
      </div>
    </div>
  </article>
);

export const BlogPage = () => {
  const [category, setCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useDocumentTitle('مدونة مبدعين');
  const articlesQuery = useQuery({ queryKey: ['articles', query, category], queryFn: () => getArticles({ q: query || undefined, category: category === 'الكل' ? undefined : category }) });
  const articles = articlesQuery.data?.items ?? [];
  const featured = articles[0];
  const gridArticles = articles.filter((article) => article.id !== featured?.id);

  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-20 text-slate-900">
    <section className="relative overflow-hidden border-b border-cyan-100 bg-gradient-to-bl from-cyan-50 via-sky-50/70 to-white">
      <div className="pointer-events-none absolute -start-20 -top-24 size-72 rounded-full bg-lime-200/40 blur-3xl" />
      <div className="container-page relative py-14 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-4 py-2 text-sm font-extrabold text-cyan-800 shadow-sm"><Sparkles className="size-4 text-orange-500" /> مساحة المعرفة والإلهام</span>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">مدونة <span className="text-cyan-600">مبدعين</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">أفكار عملية وقصص ملهمة تساعد الأطفال وأسرهم على اكتشاف الإبداع والتعلم بثقة.</p>
          <form className="mx-auto mt-8 flex max-w-2xl gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-cyan-100/60" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }}>
            <Search className="ms-3 mt-3 size-5 shrink-0 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في المقالات..." aria-label="ابحث في المقالات" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-slate-400" />
            <button className="rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-2 font-extrabold text-white transition active:translate-y-0.5 active:border-b-0">بحث</button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="تصنيفات المقالات">
            {categories.map((item, index) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === item ? 'bg-slate-900 text-white shadow-md' : `border border-white bg-white ${categoryColors[index]} shadow-sm hover:-translate-y-0.5`}`}>{item === 'الكل' ? 'كل المقالات' : `#${item.replaceAll(' ', '_')}`}</button>)}
          </div>
        </div>
      </div>
    </section>

    <section className="container-page py-12 sm:py-16">
      {articlesQuery.isPending ? <div className="rounded-3xl bg-white p-12 text-center font-bold text-slate-500">نحمّل المقالات...</div> : articlesQuery.isError ? <div role="alert" className="rounded-3xl bg-white p-12 text-center text-rose-700">تعذر تحميل المقالات. حاول تحديث الصفحة.</div> : !articles.length ? <div className="rounded-3xl bg-white p-12 text-center"><BookOpen className="mx-auto size-10 text-cyan-500"/><p className="mt-4 font-bold text-slate-600">لا توجد مقالات تطابق بحثك حالياً.</p></div> : <>
        {featured && <div className="mb-12">
          <div className="mb-5 flex items-center gap-2 text-sm font-black text-orange-600"><Sparkles className="size-4"/> المقال المختار</div>
          <article className="grid overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-2">
            <MediaViewer url={featured.coverImage} title={featured.title} aspect="cover" className="min-h-64 rounded-none border-0 shadow-none lg:min-h-[390px]" />
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
              <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700">{featured.category}</span><span className="text-xs font-semibold text-slate-500">{dateLabel(featured.publishedAt)} · {featured.readTime} دقائق</span></div>
              <h2 className="mt-5 text-2xl font-black leading-10 sm:text-3xl">{featured.title}</h2><p className="mt-4 leading-8 text-slate-600">{featured.excerpt}</p>
              <Link to={`/blog/${featured.slug}`} className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-3 font-extrabold text-white transition hover:bg-cyan-600 active:translate-y-0.5 active:border-b-0">اقرأ المقال <ArrowLeft className="size-4" /></Link>
            </div>
          </article>
        </div>}
        <div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-bold text-cyan-700">اقرأ واكتشف</p><h2 className="mt-1 text-2xl font-black">أحدث المقالات</h2></div><span className="text-sm font-semibold text-slate-500">{articles.length} مقالات</span></div>
        {gridArticles.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{gridArticles.map((article) => <ArticleCard key={article.id} article={article}/>)}</div> : <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">هذا هو المقال الأبرز في هذا التصنيف حالياً.</div>}
      </>}
    </section>
  </main>;
};

export default BlogPage;
