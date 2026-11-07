import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ExternalWebViewLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
}

export const ExternalWebViewLink = ({ href, title, className, children }: ExternalWebViewLinkProps) => {
  let safeHref: string | null = null;
  try {
    const url = new URL(href);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) safeHref = url.href;
  } catch { /* Keep invalid legacy values inert. */ }

  if (!safeHref) return <span className={cn('cursor-not-allowed opacity-50', className)} aria-label="رابط غير صالح">{children}</span>;

  return <a href={safeHref} target="_blank" rel="noopener noreferrer" title={title} className={cn('text-start', className)}>
    {children}
  </a>;
};
