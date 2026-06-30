type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
};

export default function LegalDocumentPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: LegalDocumentPageProps) {
  return (
    <section
      style={{
        padding: "72px 20px",
        background: "var(--page-shell-bg)",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <header style={{ display: "grid", gap: 14 }}>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {eyebrow}
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.35rem, 5vw, 4.4rem)",
              color: "var(--text-strong)",
              lineHeight: 0.98,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 780,
              color: "var(--text-muted)",
              lineHeight: 1.8,
            }}
          >
            {intro}
          </p>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
            Ultima actualizacion: {updatedAt}
          </p>
        </header>

        <article
          style={{
            borderRadius: 28,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: "clamp(22px, 3vw, 34px)",
            display: "grid",
            gap: 24,
          }}
        >
          {sections.map((section) => (
            <section key={section.title} style={{ display: "grid", gap: 10 }}>
              <h2
                style={{
                  margin: 0,
                  color: "var(--text-strong)",
                  fontSize: "clamp(1.2rem, 2vw, 1.6rem)",
                  lineHeight: 1.2,
                }}
              >
                {section.title}
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      margin: 0,
                      color: "var(--text-muted)",
                      lineHeight: 1.85,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </section>
  );
}
