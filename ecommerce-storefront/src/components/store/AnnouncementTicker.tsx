"use client";

export default function AnnouncementTicker({
  text,
}: {
  text?: string | null;
}) {
  const normalizedText = text?.trim();

  if (!normalizedText) {
    return null;
  }

  const repeatedText = `${normalizedText} / ${normalizedText} / ${normalizedText}`;

  return (
    <div
      data-announcement-ticker
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#111111",
        color: "#ffffff",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginLeft: "var(--admin-sidebar-offset, 0px)",
        width: "calc(100% - var(--admin-sidebar-offset, 0px))",
        transition: "margin-left 180ms ease, width 180ms ease",
      }}
    >
      <div
        className="announcement-ticker-track"
        style={{
          display: "flex",
          width: "max-content",
          flexWrap: "nowrap",
        }}
      >
        {[0, 1].map((index) => (
          <div
            key={index}
            aria-hidden={index === 1 ? "true" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              minWidth: "100%",
              padding: "8px 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                paddingInline: 28,
                fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {repeatedText}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        [data-announcement-ticker]:hover .announcement-ticker-track {
          animation-play-state: paused;
        }

        .announcement-ticker-track {
          animation: announcementTickerScroll 48s linear infinite;
          will-change: transform;
        }

        @media (max-width: 768px) {
          .announcement-ticker-track {
            animation-duration: 72s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .announcement-ticker-track {
            animation-duration: 72s !important;
          }
        }

        @keyframes announcementTickerScroll {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-100%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
