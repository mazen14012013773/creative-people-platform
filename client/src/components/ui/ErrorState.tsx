import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  message = 'تعذر تحميل البيانات، يرجى المحاولة مرة أخرى',
  onRetry,
}: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/50 px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertTriangle className="size-7" />
      </div>
      <p className="max-w-md text-sm font-semibold leading-6 text-rose-800">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
};
