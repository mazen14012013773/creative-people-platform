import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  action,
}: SectionHeadingProps) => {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="mb-2.5 inline-flex items-center gap-2 text-xs font-extrabold tracking-wide text-brand-700">
            <span className="h-1.5 w-6 rounded-full bg-linear-to-l from-brand-500 to-amber-400" />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[2rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
};
