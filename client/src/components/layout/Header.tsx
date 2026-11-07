import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Compass,
  FileText,
  Gift,
  House,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Menu,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UsersRound,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { cn, getDashboardPath } from '@/lib/utils';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'nav-link relative',
    isActive &&
      'bg-brand-50 text-brand-800 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-600',
  );

export const Header = () => {
  const { user, logout } = useAuth();
  const { favoriteCount } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardPath = user ? getDashboardPath(user.role) : '/login';
  const verificationLocked = user?.role === 'Freelancer' && user.accountStatus !== 'ACTIVE';
  const dashboardLabel =
    user?.role === 'Admin'
      ? 'لوحة الإدارة'
      : user?.role === 'Buyer'
        ? 'لوحة المشتري'
        : user?.role === 'Parent'
          ? 'لوحة ولي الأمر'
          : 'لوحة التحكم';
  const DashboardIcon =
    user?.role === 'Admin'
      ? ShieldCheck
      : user?.role === 'Buyer'
        ? ShoppingBag
        : user?.role === 'Parent'
          ? HeartHandshake
          : LayoutDashboard;

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-sky-100 bg-cyan-50/80 text-slate-600">
        <div className="container-page flex h-7 items-center justify-center gap-2 text-[10px] font-bold sm:justify-between">
          <p className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-orange-500" />
            <span>منصة مجانية بالكامل</span>
            <span className="hidden text-slate-500 sm:inline">
              · خدمات إبداعية ومحادثات آمنة داخل المنصة
            </span>
          </p>
          {verificationLocked ? <span className="hidden items-center gap-1 text-amber-800 sm:flex">الحساب قيد التوثيق <ShieldCheck className="size-3.5"/></span> : <Link
            to={user ? dashboardPath : '/register'}
            className="hidden items-center gap-1 text-sky-700 transition hover:text-sky-900 sm:flex"
          >
            {user ? dashboardLabel : 'ابدأ الآن'}
            <ArrowLeft className="size-3.5" />
          </Link>}
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white/90 shadow-sm backdrop-blur-lg">
        <div className="container-page flex h-14 min-w-0 items-center justify-between gap-2 sm:gap-3 2xl:max-w-none 2xl:px-6">
          <Logo />

          {!verificationLocked ? <form
            role="search"
            className="relative hidden w-44 shrink-0 2xl:block 2xl:w-52"
            onSubmit={(event) => {
              event.preventDefault();
              const query = headerSearch.trim();
              navigate(query ? `/?q=${encodeURIComponent(query)}#freelancers` : '/#freelancers');
            }}
          >
            <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              placeholder="ابحث عن مبدع..."
              aria-label="ابحث عن مبدع"
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/70 ps-9 pe-4 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </form> : null}

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0 2xl:flex [&_.nav-link]:whitespace-nowrap [&_.nav-link]:px-2 [&_.nav-link]:py-2 [&_.nav-link]:text-xs" aria-label="التنقل الرئيسي">
            <NavLink to="/" end className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-1.5')}><House className="size-4" />
              الرئيسية
            </NavLink>
            {!verificationLocked ? <>
            <Link to="/#freelancers" className="nav-link inline-flex items-center gap-1.5"><UsersRound className="size-4" />
              المستقلون
            </Link>
<NavLink to="/services" className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-1.5')}><BriefcaseBusiness className="size-4" />الخدمات</NavLink>
            {user && ['Buyer', 'Freelancer'].includes(user.role) ? <NavLink to="/orders" className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-1.5')}><ClipboardList className="size-4"/>الطلبات</NavLink> : null}
            {user && user.role !== 'Admin' ? <NavLink to="/chat" className={linkClass}><span className="inline-flex items-center gap-1.5"><MessageCircle className="size-4" />المحادثات</span></NavLink> : null}
              <NavLink to="/community" className={linkClass}><BookOpen className="size-4" />المجتمع</NavLink>
            <NavLink to="/favorites" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="size-4" />
                المفضلة
                {favoriteCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                    {favoriteCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
            <details className="group relative">
              <summary className="nav-link inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap px-2 py-2 text-xs [&::-webkit-details-marker]:hidden"><MoreHorizontal className="size-4"/><span>{'\u0627\u0644\u0645\u0632\u064a\u062f'}</span></summary>
              <div className="absolute end-0 top-full z-60 mt-2 grid min-w-44 gap-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                {user?.role === 'Freelancer' ? <NavLink to="/freelancer/rewards" className={linkClass}><span className="inline-flex items-center gap-2"><Gift className="size-4"/>{'\u0627\u0644\u0647\u062f\u0627\u064a\u0627 \u0648\u0627\u0644\u0645\u0643\u0627\u0641\u0622\u062a'}</span></NavLink> : null}
                <NavLink to="/guide" className={linkClass}><span className="inline-flex items-center gap-2"><Compass className="size-4"/>{'\u0627\u0644\u062f\u0644\u064a\u0644'}</span></NavLink>
                <NavLink to="/terms" className={linkClass}><span className="inline-flex items-center gap-2"><FileText className="size-4"/>{'\u0634\u0631\u0648\u0637 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645'}</span></NavLink>
              </div>
            </details>
            {user ? (
              <NavLink to={dashboardPath} className={linkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <DashboardIcon className="size-4" />
                  لوحتي
                </span>
              </NavLink>
            ) : null}
            </> : null}
          </nav>

          <div className="hidden shrink-0 items-center gap-1.5 2xl:flex">
            {!verificationLocked ? <NotificationBell /> : null}
            {user ? (
              <>
                {verificationLocked ? <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-1.5" aria-label={`${user.name}: الحساب قيد التوثيق`}>
                  <Avatar name={user.name} src={user.avatarUrl} className="size-9 rounded-xl" textClassName="text-xs"/>
                  <span className="hidden max-w-24 truncate text-xs font-extrabold text-slate-800 2xl:inline">{user.name}</span>
                </div> : <Link
                  to={dashboardPath}
                  className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/50"
                  aria-label={`${dashboardLabel}: ${user.name}`}
                  title={`${user.name} · ${dashboardLabel}`}
                >
                  <Avatar
                    name={user.name}
                    src={user.avatarUrl}
                    className="size-9 rounded-xl"
                    textClassName="text-xs"
                  />
                  <span className="hidden min-w-0 flex-col 2xl:flex">
                    <span className="max-w-24 truncate text-xs font-extrabold leading-4 text-slate-800">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-bold leading-4 text-brand-700">
                      {user.role === 'Parent' ? 'ولي أمر' : user.role === 'Buyer' ? 'مشتري' : user.role === 'Admin' ? 'إدارة' : 'مستقل'}
                    </span>
                  </span>
                </Link>}
                <Link
                  to="/settings"
                  className="btn btn-ghost px-2.5"
                  aria-label="إعدادات الحساب"
                  title="إعدادات الحساب"
                >
                  <Settings className="size-5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-ghost px-2.5"
                  aria-label="تسجيل الخروج"
                  title="تسجيل الخروج"
                >
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">
                  تسجيل الدخول
                </Link>
                <Link to="/register" className="btn btn-primary">
                  <UserPlus className="size-4" />
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 2xl:hidden">
            {!verificationLocked ? <NotificationBell /> : null}
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-slate-100 bg-white/95 px-4 pb-5 pt-3 backdrop-blur-xl 2xl:hidden">
            <nav className="flex flex-col gap-1" aria-label="قائمة الجوال">
              <NavLink to="/" end className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-1.5')}><House className="size-4" />
                الرئيسية
              </NavLink>
              {!verificationLocked ? <>
              <Link to="/#freelancers" className="nav-link inline-flex items-center gap-1.5"><UsersRound className="size-4" />
                المستقلون
              </Link>
<NavLink to="/services" className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-1.5')}><BriefcaseBusiness className="size-4" />الخدمات</NavLink>
              {user && ['Buyer', 'Freelancer'].includes(user.role) ? <NavLink to="/orders" className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-2')}><ClipboardList className="size-4"/>الطلبات</NavLink> : null}
              {user && user.role !== 'Admin' ? <NavLink to="/chat" className={linkClass}><span className="inline-flex items-center gap-2"><MessageCircle className="size-4" />المحادثات</span></NavLink> : null}
              <NavLink to="/guide" className={linkClass}><span className="inline-flex items-center gap-2"><Compass className="size-4"/>دليل مبدعين</span></NavLink>
              <NavLink to="/community" className={linkClass}><BookOpen className="size-4" />المجتمع</NavLink>
              <NavLink to="/favorites" className={linkClass}>
                <span className="inline-flex items-center gap-2">
                  <Heart className="size-4" />
                  المفضلة
                  {favoriteCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                      {favoriteCount}
                    </span>
                  ) : null}
                </span>
              </NavLink>
              {user?.role === 'Freelancer' ? <NavLink to="/freelancer/rewards" className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-2')}><Gift className="size-4"/>{'\u0627\u0644\u0647\u062f\u0627\u064a\u0627 \u0648\u0627\u0644\u0645\u0643\u0627\u0641\u0622\u062a'}</NavLink> : null}
              <NavLink to="/terms" className={({ isActive }) => cn(linkClass({ isActive }), 'inline-flex items-center gap-1.5')}><FileText className="size-4" />
                شروط الاستخدام
              </NavLink>
              {user ? (
                <>
                  <NavLink to={dashboardPath} className={linkClass}>
                    <span className="inline-flex items-center gap-2">
                      <DashboardIcon className="size-4" />
                      {dashboardLabel}
                    </span>
                  </NavLink>
                  <NavLink to="/settings" className={linkClass}>
                    <span className="inline-flex items-center gap-2">
                      <Settings className="size-4" />
                      إعدادات الحساب
                    </span>
                  </NavLink>
                </>
              ) : null}
              </> : null}
            </nav>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <Avatar
                      name={user.name}
                      src={user.avatarUrl}
                      className="size-10 rounded-xl"
                      textClassName="text-sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleLogout} className="btn btn-secondary">
                    <LogOut className="size-4" />
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary">
                    تسجيل الدخول
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    <UserPlus className="size-4" />
                    إنشاء حساب
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};
