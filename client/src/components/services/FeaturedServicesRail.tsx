import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { servicesApi } from '@/services/services.service';

export const FeaturedServicesRail = () => {
  const query = useQuery({ queryKey: ['all-platform-services'], queryFn: servicesApi.listAll });
  const items = (query.data ?? []).filter((service) => service.isFeatured).slice(0, 4);
  if (!items.length) return null;

  return <section className="border-y border-slate-100 bg-white/70 py-10 sm:py-12"><div className="container-page">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-800"><Sparkles className="size-4"/>خدمات مميزة</span><h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">خدمات يوصي بها المستقلون</h2></div><Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-700 hover:text-brand-900">كل الخدمات<ArrowLeft className="size-4"/></Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((service) => <article key={service.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold text-orange-800"><Sparkles className="size-3.5"/>خدمة مميزة</span>
      <h3 className="mt-3 line-clamp-2 text-sm font-black leading-6 text-slate-900">{service.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{service.freelancerName}</p>
      <div className="mt-auto flex justify-end pt-4"><Link to={`/freelancers/${service.freelancerId}?serviceId=${encodeURIComponent(service.id)}`} className="btn btn-secondary btn-sm">عرض الخدمة</Link></div>
    </article>)}</div>
  </div></section>;
};
