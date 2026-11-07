import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Code2,
  ExternalLink,
  FolderOpen,
  ImageOff,
  ImagePlus,
  Link2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';
import { PortfolioModal } from '@/components/portfolio/PortfolioModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { InlineLoader, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import {
  portfolioSchema,
  type PortfolioFormValues,
} from '@/lib/validation';
import { getErrorMessage } from '@/services/api';
import { portfolioApi } from '@/services/portfolio.service';
import type { PortfolioItem } from '@/types';

const MAX_ITEMS = 24;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 3 * 1024 * 1024;

interface PortfolioManagerProps {
  items: PortfolioItem[];
}

export const PortfolioManager = ({ items }: PortfolioManagerProps) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      projectUrl: '',
    },
  });

  const imageUrl = watch('imageUrl');

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const openModal = () => {
    reset({ title: '', description: '', imageUrl: '', projectUrl: '' });
    setImageFailed(false);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset({ title: '', description: '', imageUrl: '', projectUrl: '' });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => portfolioApi.uploadImage(file),
    onSuccess: (url) => {
      setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true });
      toast.success('تم رفع الصورة بنجاح');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر رفع الصورة')),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      imageUrl?: string;
      projectUrl?: string;
    }) => portfolioApi.create(payload),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => portfolioApi.remove(id),
    onSuccess: async () => {
      toast.success('تم حذف المشروع من معرض الأعمال');
      await queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حذف المشروع')),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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

    uploadMutation.mutate(file);
  };

  const submit = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        imageUrl: values.imageUrl?.trim() || undefined,
        projectUrl: values.projectUrl?.trim() || undefined,
      });
      toast.success('تمت إضافة المشروع إلى معرض أعمالك');
      await queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      closeModal();
    } catch (error) {
      toast.error(getErrorMessage(error, 'تعذر إضافة المشروع'));
    }
  });

  const handleDelete = (item: PortfolioItem) => {
    setDeleteTarget(item);
  };

  const showPreview = Boolean(imageUrl);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">معرض الأعمال</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            أضف نماذج من مشاريعك مع رابط صورة أو رابط GitHub اختياري.{' '}
            {items.length}/{MAX_ITEMS} مشروع.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="btn btn-primary btn-sm"
          disabled={items.length >= MAX_ITEMS}
          title={
            items.length >= MAX_ITEMS
              ? 'وصلت للحد الأقصى من المشاريع'
              : 'إضافة مشروع جديد'
          }
        >
          <Plus className="size-4" />
          إضافة مشروع
        </button>
      </div>

      {items.length >= MAX_ITEMS ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          وصلت للحد الأقصى ({MAX_ITEMS} مشروع). احذف مشروعاً قديماً لإضافة آخر.
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <PortfolioCard item={item} onOpen={setSelectedItem} />
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-semibold text-slate-400">
                  {formatDate(item.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={
                    deleteMutation.isPending && deleteMutation.variables === item.id
                  }
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {deleteMutation.isPending &&
                  deleteMutation.variables === item.id ? (
                    <Spinner className="size-3.5 text-rose-600" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={FolderOpen}
            title="معرض أعمالك فارغ"
            description="أضف أول مشروع الآن — الأعمال المعروضة ترفع فرص تواصل العملاء معك بشكل كبير."
            action={
              <button type="button" onClick={openModal} className="btn btn-primary">
                <Plus className="size-4" />
                إضافة أول مشروع
              </button>
            }
            compact
          />
        </div>
      )}

      <Modal open={open} onClose={closeModal} title="إضافة مشروع جديد" size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="portfolio-title" className="label">
              عنوان المشروع
            </label>
            <input
              id="portfolio-title"
              className="input"
              placeholder="مثال: تصميم هوية بصرية لمطعم"
              {...register('title')}
            />
            {errors.title ? (
              <p className="field-error">{errors.title.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="portfolio-description" className="label">
              وصف المشروع (اختياري)
            </label>
            <textarea
              id="portfolio-description"
              rows={4}
              className="input resize-none leading-7"
              placeholder="اشرح فكرة المشروع، دورك فيه، والنتيجة..."
              {...register('description')}
            />
            {errors.description ? (
              <p className="field-error">{errors.description.message}</p>
            ) : null}
          </div>

          <div>
            <span className="label">صورة المشروع</span>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
              {showPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {imageFailed ? (
                    <div className="flex min-h-44 flex-col items-center justify-center gap-3 p-5 text-center">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                        <ImageOff className="size-6" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">
                          تعذر عرض الصورة من هذا الرابط
                        </p>
                        <p className="mt-1 max-w-md text-xs font-semibold leading-6 text-slate-500">
                          تأكد أن الرابط ينتهي بامتداد صورة مباشر مثل JPG أو PNG
                          أو WebP، وليس رابط صفحة أو ألبوم. يمكنك أيضاً رفع الصورة
                          مباشرة من جهازك.
                        </p>
                      </div>
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        <ExternalLink className="size-4" />
                        فتح الرابط للتأكد
                      </a>
                    </div>
                  ) : (
                    <img
                      src={imageUrl}
                      alt="معاينة المشروع"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => setImageFailed(true)}
                      className="max-h-64 w-full object-contain"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setValue('imageUrl', '', {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className="absolute inset-e-2 top-2 rounded-lg bg-white/90 p-2 text-rose-600 shadow-sm hover:bg-white"
                    aria-label="إزالة الصورة"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    {uploadMutation.isPending ? (
                      <Spinner className="size-6" />
                    ) : (
                      <ImagePlus className="size-6" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {uploadMutation.isPending
                        ? 'جارٍ رفع الصورة...'
                        : 'ارفع صورة من جهازك'}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      JPG أو PNG أو WebP أو GIF — حتى 3 ميجابايت
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    disabled={uploadMutation.isPending}
                  >
                    <Upload className="size-4" />
                    اختيار صورة
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            {errors.imageUrl ? (
              <p className="field-error">{errors.imageUrl.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="portfolio-image-url" className="label">
                رابط صورة مباشر (اختياري)
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="portfolio-image-url"
                  dir="ltr"
                  className="input ps-9 text-start"
                  placeholder="https://..."
                  {...register('imageUrl')}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-semibold leading-5 text-slate-400">
                استخدم رابط صورة مباشراً. بعض المواقع تمنع عرض صورها خارج موقعها،
                ورفع الصورة من الجهاز هو الخيار الأكثر ضماناً.
              </p>
            </div>

            <div>
              <label htmlFor="portfolio-project-url" className="label">
                رابط GitHub (اختياري)
              </label>
              <div className="relative">
                <Code2 className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="portfolio-project-url"
                  dir="ltr"
                  className="input ps-9 text-start"
                  placeholder="https://github.com/username/project"
                  {...register('projectUrl')}
                />
              </div>
              {errors.projectUrl ? (
                <p className="field-error">{errors.projectUrl.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || uploadMutation.isPending}
            >
              {createMutation.isPending ? (
                <InlineLoader label="جارٍ الإضافة..." />
              ) : (
                <>
                  <Plus className="size-4" />
                  إضافة المشروع
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <PortfolioModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف مشروع من المعرض"
        description={`سيتم حذف مشروع «${deleteTarget?.title ?? ''}» من معرض أعمالك نهائيًا. هل تريد المتابعة؟`}
        confirmLabel="حذف المشروع"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </section>
  );
};
