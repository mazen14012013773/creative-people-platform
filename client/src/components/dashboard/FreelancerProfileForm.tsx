import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  BadgeCheck,
  Camera,
  Check,
  MapPin,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineLoader, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { EGYPT_GOVERNORATES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { profileSchema, type ProfileFormValues } from '@/lib/validation';
import { getErrorMessage } from '@/services/api';
import { profileApi } from '@/services/profile.service';
import type {
  PublicFreelancer,
  Skill,
  UpdateProfilePayload,
} from '@/types';

interface FreelancerProfileFormProps {
  profile: PublicFreelancer;
  allSkills: Skill[];
  profileSkills: Skill[];
  onChanged: () => Promise<void>;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 3 * 1024 * 1024;

const toFormValues = (
  profile: PublicFreelancer,
  profileSkills: Skill[],
): ProfileFormValues => ({
  name: profile.name,
  title: profile.title ?? '',
  bio: profile.bio ?? '',
  location: profile.location ?? '',
  isAvailable: profile.isAvailable,
  skillIds: profileSkills.map((skill) => skill.id),
});

export const FreelancerProfileForm = ({
  profile,
  allSkills,
  profileSkills,
  onChanged,
}: FreelancerProfileFormProps) => {
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(profile, profileSkills),
  });

  const selectedSkillIds = watch('skillIds');
  const bioLength = watch('bio')?.length ?? 0;

  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: async () => {
      toast.success('تم تحديث الصورة الشخصية بنجاح');
      await onChanged();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر رفع الصورة')),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
  });

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('يُسمح فقط بصور JPG أو PNG أو WebP أو GIF');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('حجم الصورة يجب ألا يتجاوز 3 ميجابايت');
      return;
    }

    avatarMutation.mutate(file);
  };

  const toggleSkill = (skillId: string) => {
    const isSelected = selectedSkillIds.includes(skillId);

    if (!isSelected && selectedSkillIds.length >= 20) {
      toast.info('يمكن اختيار 20 مهارة كحد أقصى');
      return;
    }

    setValue(
      'skillIds',
      isSelected
        ? selectedSkillIds.filter((id) => id !== skillId)
        : [...selectedSkillIds, skillId],
      { shouldDirty: true },
    );
  };

  const submit = handleSubmit(async (values) => {

    const payload: UpdateProfilePayload = {
      name: values.name.trim(),
      title: values.title.trim(),
      bio: values.bio?.trim() || null,
      location: values.location.trim(),
      isAvailable: values.isAvailable,
      skillIds: values.skillIds,
    };

    try {
      const result = await updateMutation.mutateAsync(payload);
      reset(toFormValues(result.user, result.skills));
      toast.success('تم حفظ بيانات البروفايل بنجاح');
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر حفظ البيانات'));
    }
  });

  const locationOptions = EGYPT_GOVERNORATES.includes(
    (profile.location ?? '') as (typeof EGYPT_GOVERNORATES)[number],
  )
    ? EGYPT_GOVERNORATES
    : profile.location
      ? [...EGYPT_GOVERNORATES, profile.location]
      : EGYPT_GOVERNORATES;

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar
              name={profile.name}
              src={profile.avatarUrl}
              className="size-24 rounded-3xl text-2xl"
            />
            {avatarMutation.isPending ? (
              <span className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-950/50">
                <Spinner className="size-6 text-white" />
              </span>
            ) : null}
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900">الصورة الشخصية</h2>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
              صورة واضحة تزيد ثقة العملاء. الحد الأقصى 3 ميجابايت.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                disabled={avatarMutation.isPending}
              >
                <Camera className="size-4" />
                تغيير الصورة
              </button>
              {profile.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setRemoveAvatarOpen(true)}
                  className="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" />
                  إزالة
                </button>
              ) : null}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-900">البيانات الأساسية</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="label">
              الاسم الكامل
            </label>
            <input id="profile-name" className="input" {...register('name')} />
            {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
          </div>

          <div>
            <label htmlFor="profile-title" className="label">
              المسمى الوظيفي
            </label>
            <input
              id="profile-title"
              className="input"
              placeholder="مثال: مصمم واجهات مستخدم"
              {...register('title')}
            />
            {errors.title ? <p className="field-error">{errors.title.message}</p> : null}
          </div>

          <div>
            <label htmlFor="profile-location" className="label">
              المحافظة أو المدينة
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <select
                id="profile-location"
                className="input ps-9"
                {...register('location')}
              >
                <option value="">اختر المحافظة</option>
                {locationOptions.map((governorate) => (
                  <option key={governorate} value={governorate}>
                    {governorate}
                  </option>
                ))}
              </select>
            </div>
            {errors.location ? (
              <p className="field-error">{errors.location.message}</p>
            ) : null}
          </div>

        </div>

        <div className="mt-4">
          <label htmlFor="profile-bio" className="label">
            نبذة عنك
          </label>
          <textarea
            id="profile-bio"
            rows={5}
            className="input resize-none leading-7"
            placeholder="اكتب عن خبرتك، نوع المشاريع التي تنفذها، وما يميزك عن غيرك..."
            {...register('bio')}
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.bio ? (
              <p className="field-error">{errors.bio.message}</p>
            ) : (
              <span />
            )}
            <span className="text-[11px] font-semibold text-slate-400">
              {bioLength}/2000
            </span>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-5 text-brand-700" />
          <h2 className="text-lg font-extrabold text-slate-900">التوفر</h2>
        </div>
        <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
          حدّث حالة توفرك ليعرف الآخرون إمكانية طلب خدماتك عبر المنصة.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-brand-200 hover:bg-brand-50/40">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-brand-700"
            {...register('isAvailable')}
          />
          <span>
            <span className="block text-sm font-extrabold text-slate-900">
              متاح لاستقبال مشاريع جديدة
            </span>
            <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">
              ستظهر شارة «متاح للعمل» في بروفايلك وبطاقات البحث.
            </span>
          </span>
        </label>

      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">المهارات</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              اختر حتى 20 مهارة لتظهر في نتائج البحث والفلترة.
            </p>
          </div>
          <span className="chip">
            {selectedSkillIds.length}/20 مختارة
          </span>
        </div>

        {allSkills.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {allSkills.map((skill) => {
              const selected = selectedSkillIds.includes(skill.id);

              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-start text-xs font-bold transition',
                    selected
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/40',
                  )}
                >
                  <span className="truncate">{skill.name}</span>
                  {selected ? (
                    <Check className="size-4 shrink-0 text-brand-700" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-slate-500">
            لا توجد مهارات متاحة حالياً.
          </p>
        )}
      </section>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <button
          type="submit"
          className="btn btn-primary w-full shadow-lg sm:w-auto"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <InlineLoader label="جارٍ الحفظ..." />
          ) : (
            <>
              <Save className="size-4" />
              حفظ التغييرات
            </>
          )}
        </button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
        <Upload className="size-3.5" />
        يتم تحديث بروفايلك العام فور الحفظ.
      </p>
      <ConfirmDialog
        open={removeAvatarOpen}
        title="إزالة الصورة الشخصية"
        description="سيظهر بروفايلك بدون صورة شخصية حتى ترفع صورة جديدة. هل تريد المتابعة؟"
        confirmLabel="إزالة الصورة"
        busy={updateMutation.isPending}
        onCancel={() => setRemoveAvatarOpen(false)}
        onConfirm={() => {
          updateMutation.mutate(
            { avatarUrl: null },
            {
              onSuccess: async () => {
                setRemoveAvatarOpen(false);
                toast.success('تمت إزالة الصورة الشخصية');
                await onChanged();
              },
              onError: (error) => toast.error(getErrorMessage(error, 'تعذر إزالة الصورة')),
            },
          );
        }}
      />
    </form>
  );
};
