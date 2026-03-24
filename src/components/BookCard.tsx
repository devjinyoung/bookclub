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
   * Optional inline action rendered as a text button (e.g. "Mark as read").
   */
  actionButtonLabel?: string;
  onActionButtonClick?: () => void;
  actionButtonDisabled?: boolean;
  actionButtonLoading?: boolean;
  actionButtonLoadingText?: string;
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
  actionButtonLabel,
  onActionButtonClick,
  actionButtonDisabled,
  actionButtonLoading,
  actionButtonLoadingText,
  className,
}: BookCardProps) {
  const actionText = actionButtonLoading
    ? (actionButtonLoadingText ?? 'Please wait…')
    : actionButtonLabel;

  return (
    <div
      onClick={onClick}
      className={`group gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2 ${
        className ?? ''
      }`}
    >
      <div className="flex w-full h-48 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-[10px] text-slate-500">
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span>No cover</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 mt-2">
        <p className="line-clamp-2 text-slate-200 text-lg">{title}</p>

        {author && <p className="line-clamp-1 text-slate-500">{author}</p>}

        {subtitle && <p className="line-clamp-2  text-slate-500">{subtitle}</p>}

        {ctaLabel && (
          <div className="mt-1">
            <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-sm text-sky-300 group-hover:bg-sky-500/20">
              {ctaLabel}
            </span>
          </div>
        )}

        {actionButtonLabel && (
          <div className="mt-auto">
            <button
              type="button"
              onClick={(e) => {
                // Prevent triggering the card's `onClick` handler.
                e.stopPropagation();
                onActionButtonClick?.();
              }}
              className=" font-medium text-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionButtonDisabled}
            >
              {actionText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
