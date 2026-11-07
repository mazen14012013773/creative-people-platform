import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Calculator, Camera, CheckCircle2, Clock3, MailCheck, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { parentApi } from '@/services/parent.service';
import { getErrorMessage } from '@/services/api';

export const ParentVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [mathAnswer, setMathAnswer] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [consent, setConsent] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const info = useQuery({ queryKey: ['parent-verification', token], queryFn: () => parentApi.verificationInfo(token), enabled: Boolean(token), retry: false });
  const approve = useMutation({ mutationFn: () => parentApi.approveVerification(token, Number(mathAnswer), photo!) });

  useEffect(() => {
    if (!photo) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!cameraActive || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraActive]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const openCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError('تعذر تشغيل الكاميرا. اسمح للمتصفح بالوصول للكاميرا ثم حاول مرة أخرى.');
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      setCameraError('تعذر التقاط الصورة، حاول مرة أخرى.');
      return;
    }
    setPhoto(new File([blob], 'parent-selfie.jpg', { type: 'image/jpeg' }));
    stopCamera();
  };

  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-orange-50 px-4 py-10">
    <section className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-cyan-100/60 sm:p-9">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"><ShieldCheck className="size-7"/></div>
      <h1 className="mt-4 text-center text-2xl font-black text-slate-900">توثيق ولي الأمر</h1>
      <p className="mt-2 text-center text-sm leading-6 text-slate-500">رابط آمن أُرسل إلى بريد ولي الأمر. أجب عن السؤال الحسابي والتقط صورتك من الكاميرا لإتمام الموافقة.</p>

      {!token ? <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-center font-bold text-rose-700">رابط التحقق غير مكتمل. افتح الرابط المرسل إلى بريدك كما هو.</div>
        : info.isPending ? <p className="mt-8 text-center text-slate-500">جارٍ التحقق من الرابط…</p>
        : info.isError ? <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-center font-bold text-rose-700">{getErrorMessage(info.error, 'رابط التحقق غير صالح أو انتهت صلاحيته.')}</div>
        : approve.isSuccess ? <div className="mt-7 rounded-2xl bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-600"/>
            <h2 className="mt-3 font-black text-emerald-800">تم إرسال موافقتك بنجاح</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-700">وصلت موافقتك وصورة التحقق إلى إدارة منصة مبدعين، وسيتم تفعيل حساب <strong>{info.data?.childName}</strong> بعد اعتماد المراجعة النهائية.</p>
          </div>
        : info.data ? <>
            <div className="mt-6 rounded-2xl border border-cyan-100 bg-gradient-to-l from-cyan-50/80 to-white p-5">
              <p className="text-sm leading-7 text-slate-600">أرسل <strong className="text-slate-900">{info.data.childName}</strong> طلب توثيق حسابه على منصة مبدعين. راجع البيانات التالية ثم أكّد موافقتك.</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700"><UserRound className="size-4"/></span>
                  <div className="min-w-0"><dt className="text-xs font-bold text-slate-400">حساب المبدع</dt><dd className="truncate font-extrabold text-slate-900">{info.data.childName}</dd></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><MailCheck className="size-4"/></span>
                  <div className="min-w-0"><dt className="text-xs font-bold text-slate-400">البريد المرتبط بالحساب</dt><dd dir="ltr" className="truncate text-start font-extrabold text-slate-900">{info.data.childEmail}</dd></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><MailCheck className="size-4"/></span>
                  <div className="min-w-0"><dt className="text-xs font-bold text-slate-400">بريد ولي الأمر</dt><dd dir="ltr" className="truncate text-start font-extrabold text-slate-900">{info.data.parentEmailMasked}</dd></div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700"><Clock3 className="size-4"/></span>
                  <div><dt className="text-xs font-bold text-slate-400">صلاحية الرابط</dt><dd className="font-extrabold text-slate-900">ينتهي {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(info.data.expiresAt))}</dd></div>
                </div>
              </dl>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <h2 className="flex items-center gap-2 font-black text-slate-900"><Calculator className="size-5 text-cyan-700"/>الخطوة الثانية: التحقق</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">أجب عن المسألة الحسابية والتقط صورة شخصية واضحة لولي الأمر من الكاميرا لمراجعتها من الإدارة.</p>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-100 bg-white p-3">
                <span className="rounded-lg bg-cyan-50 px-3 py-2 text-lg font-black tabular-nums text-cyan-800" dir="ltr">{info.data.challenge.a} × {info.data.challenge.b} =</span>
                <input type="number" inputMode="numeric" min={0} max={1000} required value={mathAnswer} onChange={(event) => setMathAnswer(event.target.value)} placeholder="الإجابة" aria-label="إجابة المسألة الحسابية" className="input min-w-0 flex-1 text-start"/>
              </div>

              <div className="mt-4">
                <label className="flex items-start gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
                  <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) { setPhoto(null); stopCamera(); } }} className="mt-0.5 size-4 shrink-0 accent-cyan-600"/>
                  <span>أقرّ بصفتي ولي أمر الطالب بالموافقة على فتح الكاميرا والتقاط صورة شخصية الآن، وتُستخدم لغرض مراجعة التوثيق فقط.</span>
                </label>

                {preview ? (
                  <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-cyan-100 bg-white p-5">
                    <span className="flex size-28 items-center justify-center rounded-[30%] bg-gradient-to-br from-cyan-50 to-white p-1.5 shadow-lg shadow-cyan-100/70 ring-1 ring-cyan-100">
                      <img src={preview} alt="الصورة الملتقطة لولي الأمر" className="size-full rounded-[28%] object-cover"/>
                    </span>
                    <span className="text-xs font-bold text-emerald-700">تم التقاط الصورة الآن</span>
                    <span className="text-center text-xs leading-5 text-slate-500">لا تُشارك الصورة مع أي جهة خارج المنصة.</span>
                    <button type="button" onClick={() => { setPhoto(null); void openCamera(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-extrabold text-cyan-700 transition hover:bg-cyan-100"><RotateCcw className="size-3.5"/>إعادة الالتقاط</button>
                  </div>
                ) : cameraActive ? (
                  <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-cyan-100 bg-white p-5">
                    <span className="flex size-40 items-center justify-center overflow-hidden rounded-[30%] bg-slate-900 p-1.5 shadow-lg shadow-cyan-100/70 ring-1 ring-cyan-100">
                      <video ref={videoRef} muted playsInline autoPlay className="size-full -scale-x-100 rounded-[28%] object-cover"/>
                    </span>
                    <p className="text-center text-xs leading-5 text-slate-500">وجّه الكاميرا نحو وجه ولي الأمر في إضاءة جيدة، ثم اضغط التقاط.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button type="button" onClick={() => void capturePhoto()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-cyan-700"><Camera className="size-4"/>التقط الصورة</button>
                      <button type="button" onClick={stopCamera} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-600 transition hover:bg-slate-200">إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-cyan-200 bg-white p-5 text-center">
                    <span className="flex size-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><Camera className="size-7"/></span>
                    <span className="text-sm font-extrabold text-slate-900">التقط صورة شخصية لولي الأمر الآن</span>
                    <span className="text-xs leading-5 text-slate-500">تُفتح الكاميرا مباشرة داخل الموقع — لا حاجة لرفع صورة من الجهاز. ستحتاج للسماح للمتصفح باستخدام الكاميرا.</span>
                    <button type="button" disabled={!consent} onClick={() => void openCamera()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-cyan-700 disabled:opacity-50"><Camera className="size-4"/>فتح الكاميرا</button>
                  </div>
                )}

                {cameraError ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700">{cameraError}</p> : null}
              </div>
            </div>

            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">بالضغط على زر الموافقة تُرسل بياناتك وصورتك إلى إدارة منصة مبدعين للمراجعة، ثم يُفعّل الحساب بعد الاعتماد. لا تشارك هذا الرابط مع أي شخص.</p>

            {approve.isError ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{getErrorMessage(approve.error, 'تعذر إرسال الموافقة، حاول مرة أخرى.')}</p> : null}

            <button type="button" disabled={approve.isPending || !mathAnswer.trim() || !photo || !consent} onClick={() => approve.mutate()} className="mt-5 w-full rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-3.5 font-extrabold text-white transition hover:bg-cyan-600 active:translate-y-0.5 active:border-b-0 disabled:opacity-50">
              {approve.isPending ? 'جارٍ إرسال الموافقة…' : 'تأكيد التوثيق والموافقة'}
            </button>
          </> : null}

      <Link to="/" className="mt-6 block text-center text-sm font-bold text-cyan-700">العودة إلى مبدعين</Link>
    </section>
  </main>;
};

export default ParentVerifyPage;
