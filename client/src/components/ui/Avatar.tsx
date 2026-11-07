import { useEffect, useState } from 'react';
import { cn, getInitials } from '@/lib/utils';
import { ProtectedImage } from '@/components/common/ProtectedMedia';

interface AvatarProps {
  name: string;
  src: string | null;
  className?: string;
  textClassName?: string;
  imageFit?: 'cover' | 'contain';
}

export const Avatar = ({ name, src, className, textClassName, imageFit = 'cover' }: AvatarProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-brand-600 to-brand-900 text-white',
        className,
      )}
    >
      {showImage ? (
        <ProtectedImage
          containerClassName="size-full"
          src={src ?? undefined}
          alt={name}
          onError={() => setFailed(true)}
          className={cn('h-full w-full', imageFit === 'contain' ? 'object-contain' : 'object-cover')}
          loading="lazy"
        />
      ) : (
        <span className={cn('font-extrabold', textClassName)}>{getInitials(name)}</span>
      )}
    </div>
  );
};
