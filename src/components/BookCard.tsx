interface BookCardProps {
  title: string;
  author?: string | null;
  coverImageUrl?: string | null;
  subtitle?: string | null;
  /**
   * Optional call-to-action label rendered in the footer area
   * (e.g. "Select", "View details").
   */
  ctaLabel?: string;
  /**
   * Optional click handler for making the whole card interactive.
   */
  onClick?: () => void;
  /**
   * Optional extra classes to customize layout when reusing the card.
   */
  className?: string;
}

export function BookCard({
  title,
  author,
  coverImageUrl,
  subtitle,
  ctaLabel,
  onClick,
  className,
}: BookCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group flex gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2 ${
        className ?? ''
      }`}
    >
      <div className="flex h-20 w-14 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span>No cover</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-xs font-medium text-slate-200">{title}</p>

        {author && <p className="line-clamp-1 text-[11px] text-slate-500">{author}</p>}

        {subtitle && <p className="line-clamp-2 text-[11px] text-slate-500">{subtitle}</p>}

        {ctaLabel && (
          <div className="mt-1">
            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-300 group-hover:bg-sky-500/20">
              {ctaLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
