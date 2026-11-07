import { useEffect, useRef } from 'react';
import { PartyPopper, Sparkles, Trophy } from 'lucide-react';
import type { InboxNotification } from '@/types';

const Confetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    context.scale(ratio, ratio);
    const colors = ['#0891b2', '#f59e0b', '#8b5cf6', '#10b981', '#fb7185'];
    const pieces = Array.from({ length: 75 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: -Math.random() * canvas.clientHeight,
      speed: 1.5 + Math.random() * 3,
      size: 3 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
    }));
    let frame = 0;
    let animation = 0;
    const draw = () => {
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const piece of pieces) {
        piece.y += piece.speed;
        piece.x += piece.drift;
        piece.rotation += 0.04;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 1.6);
        context.restore();
        if (piece.y > canvas.clientHeight) piece.y = -10;
      }
      frame += 1;
      if (frame < 240) animation = window.requestAnimationFrame(draw);
    };
    animation = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animation);
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full"/>;
};

export const RewardCelebrationModal = ({ notification, balance, levelTitle, progress, nextLevelPoints, onClose }: {
  notification: InboxNotification;
  balance: number;
  levelTitle: string;
  progress: number;
  nextLevelPoints: number | null;
  onClose: () => void;
}) => {
  const earnedPoints = [...notification.message.matchAll(/\+(\d+)\s*نقطة/g)].reduce((total, match) => total + Number(match[1]), 0);
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="reward-celebration-title" className="relative isolate w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white p-6 text-center shadow-2xl sm:p-8">
      <Confetti/>
      <div className="relative z-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Trophy className="size-8"/></span>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-extrabold text-cyan-800"><Sparkles className="size-3.5"/>مكافأة جديدة من مبدعين</p>
        <h2 id="reward-celebration-title" className="mt-3 text-2xl font-black text-slate-950">أحسنت! اكتمل الطلب</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{notification.message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-800">النقاط المكتسبة</p><strong className="mt-1 block text-2xl font-black text-emerald-900">+{earnedPoints}</strong></div>
          <div className="rounded-2xl bg-brand-50 p-4"><p className="text-xs font-bold text-brand-800">رصيدك الحالي</p><strong className="mt-1 block text-2xl font-black text-brand-900">{balance}</strong></div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-start">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm font-extrabold text-slate-900">{levelTitle}</strong><span className="text-xs font-bold text-slate-500">{nextLevelPoints ? `${Math.max(0, nextLevelPoints - balance)} نقطة للمستوى التالي` : 'أعلى مستوى'}</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }}/></div>
        </div>
        <button type="button" onClick={onClose} className="btn btn-primary mt-6 w-full"><PartyPopper className="size-4"/>متابعة</button>
      </div>
    </section>
  </div>;
};
