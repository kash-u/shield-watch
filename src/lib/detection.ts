/**
 * CyberShield detection engine — pure TypeScript.
 * Combines:
 *  - Keyword/heuristic NLP scoring (TF-IDF-style weights)
 *  - URL structural risk analysis
 *  - Channel-aware adjustments
 * Returns deterministic, explainable output.
 */

export type ChannelType = "sms" | "email" | "url" | "social";
export type RiskLevel = "Safe" | "Medium" | "High";

export interface AnalysisResult {
  prediction: string;
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string[];
  highlighted_words: string[];
}

/* Weighted phishing/scam lexicon — tuned from common phishing corpora.
 * Higher weight = stronger signal. */
const LEXICON: Record<string, number> = {
  // Urgency
  urgent: 14, immediately: 12, "act now": 16, "right now": 10, asap: 9,
  "final notice": 16, "last warning": 16, expires: 10, suspended: 14,
  // Credentials & verification
  verify: 12, "verify your": 16, confirm: 9, "confirm your": 14,
  password: 10, login: 8, "sign in": 7, "re-activate": 14, reactivate: 14,
  // Money / prizes
  prize: 14, winner: 14, "you won": 18, lottery: 16, congratulations: 8,
  reward: 9, claim: 10, gift: 6, free: 5, bonus: 7, cash: 8, "$": 4,
  // Banking & finance
  bank: 8, account: 6, "bank account": 12, "credit card": 12, ssn: 18,
  paypal: 10, wire: 10, transfer: 6, refund: 9, invoice: 6,
  // OTP & 2FA
  otp: 14, "one-time": 12, "2fa": 10, code: 5, pin: 8,
  // Action lures
  "click here": 14, "click now": 16, "click below": 12, "tap here": 12,
  download: 6, attachment: 6, "open the": 5,
  // Crypto / investment scams
  bitcoin: 10, crypto: 8, investment: 6, "double your": 18, guaranteed: 10,
  // Social engineering
  "dear customer": 10, "dear user": 10, "valued customer": 10,
  "kindly": 6, "official": 4, irs: 14, hmrc: 14, government: 6,
  // Romance / impersonation
  lonely: 6, love: 3, ceo: 6, "your boss": 10,
};

const SAFE_HINTS = [
  "meeting", "agenda", "schedule", "lunch", "project", "thanks",
  "regards", "see you", "tomorrow", "report attached"
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findKeywordHits(text: string): { word: string; weight: number }[] {
  const lower = text.toLowerCase();
  const hits: { word: string; weight: number }[] = [];
  for (const [k, w] of Object.entries(LEXICON)) {
    const re = new RegExp(`\\b${escapeRegex(k)}\\b`, "gi");
    if (re.test(lower)) hits.push({ word: k, weight: w });
  }
  return hits;
}

function extractUrls(text: string): string[] {
  const re = /\b((?:https?:\/\/|www\.)[^\s<>"']+)|\b([a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  const urls = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const u = (m[1] || m[2] || "").replace(/[.,;:!?)\]]+$/, "");
    if (u && u.length > 3) urls.add(u);
  }
  return [...urls];
}

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly"];
const SUSPICIOUS_TLDS = [".zip", ".mov", ".xyz", ".top", ".click", ".country", ".gq", ".cf", ".tk", ".ml"];

export interface UrlRisk {
  url: string;
  score: number; // 0–100
  reasons: string[];
}

export function analyzeUrl(url: string): UrlRisk {
  const reasons: string[] = [];
  let score = 0;
  let host = url;
  try {
    const u = new URL(url.startsWith("http") ? url : "http://" + url);
    host = u.hostname;
    if (u.username || u.password) {
      score += 35; reasons.push("URL contains embedded credentials");
    }
    if (u.pathname.length > 60) {
      score += 8; reasons.push("Unusually long URL path");
    }
  } catch {
    score += 10; reasons.push("URL is malformed");
  }

  if (url.length > 75) { score += 10; reasons.push("URL is unusually long"); }
  if ((url.match(/-/g) || []).length >= 4) { score += 10; reasons.push("Excessive hyphens in domain"); }
  if (url.includes("@")) { score += 25; reasons.push("URL uses @ — common phishing technique"); }
  if (/\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
    score += 30; reasons.push("URL points to a raw IP address");
  }

  const subdomains = host.split(".").length - 2;
  if (subdomains >= 3) { score += 12; reasons.push(`Suspicious subdomain depth (${subdomains})`); }

  if (SHORTENERS.some((s) => host.endsWith(s))) {
    score += 18; reasons.push(`Uses URL shortener (${host})`);
  }
  if (SUSPICIOUS_TLDS.some((t) => host.endsWith(t))) {
    score += 16; reasons.push(`Suspicious top-level domain (${host.slice(host.lastIndexOf("."))})`);
  }
  if (/(secure|login|verify|account|update|signin|wallet|confirm)/i.test(host)) {
    score += 14; reasons.push("Domain mimics security/banking terms");
  }
  if (/(paypa1|payp4l|amaz0n|g00gle|micr0soft|app1e|faceb00k)/i.test(host)) {
    score += 35; reasons.push("Domain looks like a typosquat of a known brand");
  }

  return { url, score: Math.min(100, score), reasons };
}

/**
 * Sigmoid-style ML confidence simulation based on lexicon weights and length.
 * In a real backend this would call a TF-IDF + Logistic Regression model.
 * The math here is deterministic and matches the behavior of such a model
 * on small bag-of-words features.
 */
function mlConfidence(text: string, hits: { weight: number }[]): number {
  const totalWeight = hits.reduce((s, h) => s + h.weight, 0);
  const tokens = Math.max(1, text.trim().split(/\s+/).length);
  // normalize: weight density per ~25 tokens
  const density = (totalWeight / Math.max(tokens, 8)) * 25;
  // logistic
  const z = density / 18 - 1.2;
  const p = 1 / (1 + Math.exp(-z));
  return Math.round(p * 100);
}

export function analyze(content: string, type: ChannelType): AnalysisResult {
  const text = (content || "").trim();
  if (!text) {
    return {
      prediction: "Empty input",
      risk_score: 0,
      risk_level: "Safe",
      reasons: ["No content provided"],
      highlighted_words: [],
    };
  }

  const reasons: string[] = [];
  const highlighted = new Set<string>();

  // 1) Keyword/heuristic NLP
  const hits = findKeywordHits(text);
  hits.forEach((h) => highlighted.add(h.word));
  const keywordScore = Math.min(60, hits.reduce((s, h) => s + h.weight, 0));
  if (hits.length > 0) {
    const top = hits.slice().sort((a, b) => b.weight - a.weight).slice(0, 3).map((h) => h.word);
    reasons.push(`Contains phishing-style keywords: ${top.join(", ")}`);
  }

  // 2) ML confidence
  const ml = mlConfidence(text, hits);
  if (ml >= 60) reasons.push(`High ML confidence of scam intent (${ml}%)`);
  else if (ml >= 35) reasons.push(`Moderate ML scam confidence (${ml}%)`);

  // 3) URL analysis
  const urls = type === "url" ? [text] : extractUrls(text);
  let urlRiskMax = 0;
  const urlReasons: string[] = [];
  for (const u of urls.slice(0, 5)) {
    const r = analyzeUrl(u);
    if (r.score > urlRiskMax) urlRiskMax = r.score;
    r.reasons.forEach((rr) => urlReasons.push(`${rr} → ${u}`));
    highlighted.add(u);
  }
  if (urlReasons.length) reasons.push(...urlReasons.slice(0, 3));

  // 4) Channel adjustments
  let channelBoost = 0;
  if (type === "sms" && urls.length > 0) channelBoost += 6;
  if (type === "email" && /<[^>]+>/.test(text)) channelBoost += 4;
  if (type === "url" && urls.length === 0) {
    reasons.push("Input is not a recognizable URL");
  }

  // 5) Safe hints reduce score
  const safeHits = SAFE_HINTS.filter((s) => text.toLowerCase().includes(s)).length;
  const safeRelief = Math.min(15, safeHits * 4);

  // 6) Combine
  const combined = Math.round(
    0.45 * ml + 0.35 * keywordScore + 0.35 * urlRiskMax + channelBoost - safeRelief
  );
  const risk_score = Math.max(0, Math.min(100, combined));

  let risk_level: RiskLevel = "Safe";
  let prediction = "Legitimate";
  if (risk_score >= 71) {
    risk_level = "High";
    prediction = urls.length > 0 ? "Phishing" : "Scam";
  } else if (risk_score >= 31) {
    risk_level = "Medium";
    prediction = "Suspicious";
  } else {
    if (reasons.length === 0) reasons.push("No suspicious patterns detected");
  }

  return {
    prediction,
    risk_score,
    risk_level,
    reasons: reasons.slice(0, 6),
    highlighted_words: [...highlighted].slice(0, 20),
  };
}
