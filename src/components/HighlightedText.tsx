interface Props {
  text: string;
  highlights: string[];
}

/** Highlights matched substrings (case-insensitive, longest-first to avoid overlap). */
export function HighlightedText({ text, highlights }: Props) {
  if (!text) return null;
  const terms = [...highlights].filter(Boolean).sort((a, b) => b.length - a.length);
  if (terms.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed text-sm text-muted-foreground">{text}</p>;
  }

  // Build a single regex
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);

  return (
    <p className="whitespace-pre-wrap leading-relaxed text-sm">
      {parts.map((p, i) => {
        const isMatch = terms.some((t) => t.toLowerCase() === p.toLowerCase());
        if (!isMatch) return <span key={i} className="text-muted-foreground">{p}</span>;
        return (
          <mark
            key={i}
            className="rounded-md px-1 py-0.5 mx-0.5 font-medium text-danger bg-danger/15 ring-1 ring-danger/30"
          >
            {p}
          </mark>
        );
      })}
    </p>
  );
}
