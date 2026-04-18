interface Props {
  text: string;
  highlights: string[];
}

const TOOLTIPS: { match: RegExp; reason: string }[] = [
  { match: /^(urgent|immediately|asap|act now|right now|final notice|last warning|expires|suspended)$/i, reason: "Urgency cue commonly used to pressure victims into acting without thinking." },
  { match: /^(verify|verify your|confirm|confirm your|reactivate|re-activate|sign in|login|password)$/i, reason: "Credential-harvesting language frequently used in phishing." },
  { match: /^(otp|one-time|2fa|pin|code)$/i, reason: "Requests for one-time codes are a hallmark of account takeover scams." },
  { match: /^(prize|winner|you won|lottery|congratulations|reward|claim|gift|free|bonus|cash)$/i, reason: "Prize lure — classic scam bait promising something for nothing." },
  { match: /^(bank|account|bank account|credit card|paypal|wire|transfer|refund|invoice|ssn)$/i, reason: "Financial term often used to impersonate banks or payment providers." },
  { match: /^(click here|click now|click below|tap here|download|attachment)$/i, reason: "Action lure pushing the victim toward a malicious link or file." },
  { match: /^(bitcoin|crypto|investment|double your|guaranteed)$/i, reason: "Investment-scam language promising unrealistic returns." },
  { match: /^(dear customer|dear user|valued customer|kindly|official|irs|hmrc|government)$/i, reason: "Generic salutation or authority impersonation typical of mass phishing." },
  { match: /^https?:\/\/|^www\.|\.[a-z]{2,}/i, reason: "URL flagged by structural heuristics — review domain carefully." },
];

function reasonFor(token: string): string {
  for (const t of TOOLTIPS) if (t.match.test(token)) return t.reason;
  return "Token flagged by the detection engine as commonly seen in scam content.";
}

/** Highlights matched substrings with hover tooltips explaining each. */
export function HighlightedText({ text, highlights }: Props) {
  if (!text) return null;
  const terms = [...highlights].filter(Boolean).sort((a, b) => b.length - a.length);
  if (terms.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed text-sm text-muted-foreground">{text}</p>;
  }

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
            title={reasonFor(p)}
            className="group relative cursor-help rounded-md px-1 py-0.5 mx-0.5 font-medium text-danger bg-danger/15 ring-1 ring-danger/30 hover:bg-danger/25 transition-colors"
          >
            {p}
          </mark>
        );
      })}
    </p>
  );
}
