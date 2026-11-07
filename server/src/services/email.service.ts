import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

export const isEmailDeliveryConfigured = (): boolean => Boolean(env.EMAIL_USER && env.EMAIL_PASS);

const getTransporter = (): Transporter | null => {
  if (!isEmailDeliveryConfigured()) return null;
  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.EMAIL_USER!, pass: env.EMAIL_PASS! },
  });
  return transporter;
};

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]!);

const fromAddress = () => `"منصة مبدعين" <${env.EMAIL_FROM ?? env.EMAIL_USER}>`;

const sendMail = async (to: string, subject: string, text: string, html: string): Promise<boolean> => {
  const transport = getTransporter();
  if (!transport) {
    console.error('[Email] SMTP credentials are not configured.');
    return false;
  }
  try {
    await transport.sendMail({ from: fromAddress(), to, subject, text, html });
    return true;
  } catch (error) {
    console.error(`[Email] Delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return false;
  }
};

const brandShell = (title: string, body: string, preheader: string) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Tajawal','Segoe UI',Tahoma,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:26px;overflow:hidden;box-shadow:0 20px 55px rgba(15,23,42,0.12);">
        <tr><td style="height:5px;background:#f97316;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td bgcolor="#0e7490" style="background:linear-gradient(135deg,#0e7490 0%,#0284c7 55%,#2563eb 100%);padding:34px 30px 30px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
            <td width="78" height="78" align="center" valign="middle" bgcolor="#ffffff" style="width:78px;height:78px;border-radius:22px;background:#ffffff;border:3px solid rgba(255,255,255,0.85);font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;font-size:40px;line-height:72px;text-align:center;">🚀</td>
          </tr></table>
          <h1 style="margin:0;color:#ffffff;font-size:25px;font-weight:800;letter-spacing:-0.3px;">منصة مبدعين</h1>
          <p style="margin:7px 0 0;color:#cffafe;font-size:13px;line-height:22px;">مساحة آمنة للمبدعين الصغار وأولياء أمورهم</p>
        </td></tr>
        <tr><td style="padding:34px 32px 30px;">${body}</td></tr>
        <tr><td style="padding:20px 32px 26px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;line-height:22px;">
          <strong style="color:#475569;">منصة مبدعين</strong> — نبني مساحة آمنة لمواهب الجيل الجديد.<br/>
          رسالة آلية أُرسلت بسبب طلب توثيق حساب ولي أمر. لا تشارك هذا الرابط مع أي شخص.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const stepsBlock = (ctaLabel = 'اضغط زر الموافقة في نهاية الرسالة') => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;">
    <tr><td style="padding:20px 20px 8px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#0f172a;">كيف يتم التوثيق؟</p>
      <p style="margin:0 0 14px;font-size:12px;color:#64748b;line-height:20px;">ثلاث خطوات بسيطة لإتمام الموافقة.</p>
    </td></tr>
    ${[
      ['1', 'افتح رابط التوثيق', ctaLabel],
      ['2', 'أجب عن السؤال والتقط صورتك', 'أجب عن المسألة الحسابية الظاهرة، والتقط صورة شخصية واضحة لك من الكاميرا مباشرة لمراجعة الطلب.'],
      ['3', 'أكّد الموافقة وأرسلها للإدارة', 'اضغط «تأكيد التوثيق والموافقة» ليصل طلبك مباشرة إلى إدارة منصة مبدعين.'],
    ].map(([number, title, detail]) => `
      <tr>
        <td style="width:44px;padding:0 20px 14px 0;vertical-align:top;text-align:center;">
          <div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:#cffafe;color:#0e7490;font-size:14px;font-weight:800;">${number}</div>
        </td>
        <td style="padding:0 0 14px;vertical-align:top;">
          <p style="margin:0;font-size:13px;font-weight:800;color:#0f172a;">${title}</p>
          <p style="margin:3px 0 0;font-size:12px;line-height:21px;color:#64748b;">${detail}</p>
        </td>
      </tr>`).join('')}
  </table>`;

export const sendParentVerificationEmail = async (parentEmail: string, childName: string, verificationLink: string): Promise<boolean> => {
  const safeName = escapeHtml(childName);
  const safeLink = escapeHtml(verificationLink);
  const subject = `طلب توثيق حساب طفلك (${childName}) في منصة مبدعين 🚀`;
  const body = `
    <span style="display:inline-block;background:#ecfeff;color:#0e7490;border:1px solid #a5f3fc;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;">طلب توثيق ولي أمر</span>
    <h2 style="margin:14px 0 12px;font-size:22px;line-height:34px;font-weight:800;color:#0f172a;">طلب توثيق حساب طفلك (${safeName}) في منصة مبدعين 🚀</h2>
    <p style="margin:0;font-size:15px;line-height:29px;color:#475569;">
      مرحبًا ولي الأمر، طلب <strong style="color:#0f172a;">${safeName}</strong> توثيق حسابه على منصة مبدعين لمتابعة إنجازاته وخدماته بأمان.
      اضغط الزر التالي لمراجعة الطلب والموافقة عليه خلال <strong style="color:#0f172a;">24 ساعة</strong> من استلام الرسالة.
    </p>
    ${stepsBlock()}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td align="center" bgcolor="#0891b2" style="border-radius:14px;border-bottom:4px solid #0e7490;">
          <a href="${safeLink}" target="_blank" rel="noopener" style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;border-radius:14px;">الموافقة وتأكيد التوثيق الان</a>
        </td>
      </tr></table>
    </td></tr></table>
    <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#64748b;">⏳ هذا الرابط صالح لمدة 24 ساعة فقط.</p>
    <div style="margin-top:22px;background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:16px 18px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#92400e;">ملاحظة أمنية</p>
      <p style="margin:0;font-size:12px;line-height:22px;color:#78350f;">الرابط خاص بولي أمر هذا الحساب ولا يجب مشاركته مع أي شخص. بعد فتح الرابط ستظهر بيانات حساب طفلك، وبعد إدخال إجابة المسألة الحسابية والتقاط صورتك من الكاميرا تُرسل موافقتك إلى الإدارة، ثم تُراجع الطلب وتُفعّل الحساب.</p>
    </div>
    <p style="margin:20px 0 0;font-size:12px;line-height:22px;color:#94a3b8;word-break:break-all;">
      إذا لم يعمل الزر، انسخ الرابط التالي إلى المتصفح:<br/>
      <span dir="ltr" style="color:#0891b2;">${safeLink}</span>
    </p>`;
  const text = [
    `طلب توثيق حساب طفلك (${childName}) في منصة مبدعين`,
    '',
    `مرحبًا ولي الأمر، طلب ${childName} توثيق حسابه على منصة مبدعين.`,
    '',
    'كيف يتم التوثيق؟',
    '1. افتح رابط التوثيق من هذه الرسالة.',
    '2. أجب عن المسألة الحسابية الظاهرة والتقط صورة شخصية واضحة لك من الكاميرا.',
    '3. اضغط «تأكيد التوثيق والموافقة» ليصل طلبك إلى إدارة منصة مبدعين.',
    '',
    'رابط التوثيق (صالح لمدة 24 ساعة):',
    verificationLink,
    '',
    'الرابط خاص بك وحدك ولا يجب مشاركته مع أي شخص.',
  ].join('\n');
  return sendMail(parentEmail, subject, text, brandShell(subject, body, `طلب توثيق حساب ${childName} — الرابط صالح لمدة 24 ساعة.`));
};

export const sendParentVerificationDecisionEmail = async (parentEmail: string, childName: string, approved: boolean): Promise<boolean> => {
  const safeName = escapeHtml(childName);
  const siteUrl = escapeHtml(env.FRONTEND_URL.replace(/\/+$/, ''));
  const subject = approved
    ? `تم اعتماد توثيق حساب (${childName}) في منصة مبدعين ✅`
    : `تحديث بخصوص توثيق حساب (${childName}) في منصة مبدعين`;
  const body = approved
    ? `
      <span style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;">تمت الموافقة</span>
      <h2 style="margin:14px 0 12px;font-size:22px;line-height:34px;font-weight:800;color:#065f46;">تم اعتماد التوثيق بنجاح ✅</h2>
      <p style="margin:0;font-size:15px;line-height:29px;color:#475569;">اعتمدت إدارة منصة مبدعين توثيق حساب <strong style="color:#0f172a;">${safeName}</strong>، وأصبح الحساب مفعّلًا ويمكنه استخدام المنصة الآن.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr><td align="center">
        <a href="${siteUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;background:#059669;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:14px;">الدخول إلى منصة مبدعين</a>
      </td></tr></table>`
    : `
      <span style="display:inline-block;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;">تحتاج مراجعة</span>
      <h2 style="margin:14px 0 12px;font-size:22px;line-height:34px;font-weight:800;color:#9f1239;">لم يتم اعتماد التوثيق</h2>
      <p style="margin:0;font-size:15px;line-height:29px;color:#475569;">راجعت إدارة منصة مبدعين طلب توثيق حساب <strong style="color:#0f172a;">${safeName}</strong> ولم تعتمده. يمكن للطالب الدخول إلى حسابه وإعادة إرسال طلب التوثيق ببيانات وبريد ولي أمر صحيحين، دون الحاجة إلى إنشاء حساب جديد.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr><td align="center">
        <a href="${siteUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;background:#0891b2;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:14px;">زيارة منصة مبدعين</a>
      </td></tr></table>`;
  const text = approved
    ? `تم اعتماد توثيق حساب ${childName} في منصة مبدعين، وأصبح الحساب مفعّلًا.`
    : `لم تعتمد إدارة منصة مبدعين توثيق حساب ${childName}. يمكن للطالب إعادة المحاولة من حسابه ببيانات صحيحة.`;
  return sendMail(parentEmail, subject, text, brandShell(subject, body, subject));
};
