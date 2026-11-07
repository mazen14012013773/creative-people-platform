import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Check, Clock3, Share2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getArticle } from '@/services/articles.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Article } from '@/types';
import { MediaViewer } from '@/components/common/MediaViewer';
import { ContentInteractions } from '@/components/community/ContentInteractions';
import { articleInteractionsApi } from '@/services/articles.service';

const formatDate = (value: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
const paragraphs = (content: string) => content.split('\n').map((line, index) => {
  if (!line.trim()) return null;
  if (line.startsWith('## ')) return <h2 key={index} className="mb-4 mt-10 text-2xl font-black text-slate-900">{line.slice(3)}</h2>;
  return <p key={index} className="mb-5 text-lg leading-9 text-slate-700">{line}</p>;
});

const RelatedCard = ({ article }: { article: Article }) => <article className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg shadow-slate-200/40 transition hover:-translate-y-1"><MediaViewer url={article.coverImage} title={article.title} aspect="cover" className="rounded-none border-0 shadow-none" mediaClassName="h-44"/><div className="p-5"><span className="text-xs font-extrabold text-violet-700">{article.category}</span><Link to={`/blog/${article.slug}`} className="mt-2 block font-black leading-7 text-slate-900 group-hover:text-cyan-700">{article.title}</Link></div></article>;

export const ArticlePage = () => {
  const { slug = '' } = useParams();
  const [copied, setCopied] = useState(false);
  const articleQuery = useQuery({ queryKey: ['article', slug], queryFn: () => getArticle(slug), enabled: Boolean(slug) });
  const article = articleQuery.data?.article;
  useDocumentTitle(article?.title ?? 'مقال');
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: article?.title, text: article?.excerpt, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    } catch { /* Sharing was dismissed by the reader. */ }
  };

  if (articleQuery.isPending) return <main dir="rtl" className="container-page min-h-[65vh] py-20 text-center text-slate-500">نحمّل المقال...</main>;
  if (articleQuery.isError || !article) return <main dir="rtl" className="container-page min-h-[65vh] py-20 text-center"><p className="text-xl font-black">لم نعثر على هذا المقال</p><Link to="/blog" className="mt-5 inline-flex items-center gap-2 font-bold text-cyan-700"><ArrowRight className="size-4"/>العودة إلى المدونة</Link></main>;

  return <main dir="rtl" className="min-h-screen bg-[#F8FAFC] pb-20">
    <div className="container-page pt-8"><Link to="/blog" className="inline-flex items-center gap-2 text-sm font-extrabold text-cyan-700 hover:text-orange-600"><ArrowRight className="size-4"/> مدونة مبدعين</Link></div>
    <article className="container-page mx-auto max-w-5xl py-8 sm:py-12">
      <header className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-10">
        <span className="rounded-full bg-violet-50 px-4 py-2 text-sm font-extrabold text-violet-700">{article.category}</span>
        <h1 className="mt-6 text-3xl font-black leading-tight text-slate-900 sm:text-5xl sm:leading-[1.3]">{article.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{article.excerpt}</p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3"><img src={article.authorAvatar || '/images/articles/author.svg'} alt="" className="size-12 rounded-full border-2 border-cyan-100 bg-cyan-50 object-cover"/><div><p className="font-extrabold text-slate-900">{article.authorName}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays className="size-3.5"/>{formatDate(article.publishedAt)}<span>·</span><Clock3 className="size-3.5"/>{article.readTime} دقائق للقراءة</p></div></div>
          <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-sm font-extrabold text-cyan-800 transition hover:bg-cyan-100">{copied ? <Check className="size-4"/> : <Share2 className="size-4"/>}{copied ? 'تم نسخ الرابط' : 'مشاركة المقال'}</button>
        </div>
      </header>
      <MediaViewer url={article.coverImage} title={article.title} aspect="cover" className="mt-6 max-h-[520px] rounded-3xl shadow-xl shadow-cyan-100" />
      <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-slate-100 bg-white px-6 py-8 shadow-xl shadow-slate-200/40 sm:px-12 sm:py-12">
        <div className="prose prose-lg max-w-none text-slate-700">{paragraphs(article.content)}</div>
        <ContentInteractions contentId={slug} contentType="article" initial={articleQuery.data.interactions} api={articleInteractionsApi}/>
      </div>
    </article>
    {articleQuery.data.relatedArticles.length > 0 && <section className="container-page"><div className="mb-6"><p className="text-sm font-bold text-orange-600">واصل القراءة</p><h2 className="mt-1 text-2xl font-black text-slate-900">مقالات ذات صلة</h2></div><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{articleQuery.data.relatedArticles.map((item) => <RelatedCard article={item} key={item.id}/>)}</div></section>}
  </main>;
};

export default ArticlePage;
