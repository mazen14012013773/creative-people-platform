import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export const NotFoundPage = () => {
  useDocumentTitle('الصفحة غير موجودة');

  return (
    <div className="container-page py-20">
      <EmptyState
        icon={Compass}
        title="الصفحة غير موجودة"
        description="ربما تم نقل الصفحة أو تغيير رابطها. يمكنك العودة للصفحة الرئيسية والبحث عن المستقل المناسب."
        action={
          <Link to="/" className="btn btn-primary">
            العودة للرئيسية
          </Link>
        }
      />
    </div>
  );
};
