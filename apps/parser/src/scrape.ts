import { parseHTML } from "linkedom";
import type { Env, ScrapedArticle } from "./types";
import { qsa, qs } from "./dom";

// Elements/content we never want in the republished article.
const AD_SELECTORS = ["script", "style", "noscript", "iframe", ".not-prose"];
const AD_IMG_PATTERNS = ["/cpa/banners/", "qr-code-channel", "/cpa/"];

/** Find the TechArticle/Article node inside a JSON-LD @graph, if present. */
function extractJsonLd(html: string): Record<string, unknown> | null {
  const m = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return null;
  try {
    const data = JSON.parse(m[1].trim());
    const graph: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { "@graph"?: unknown[] })["@graph"])
        ? ((data as { "@graph": unknown[] })["@graph"])
        : [data];
    for (const node of graph) {
      const t = (node as { "@type"?: string })?.["@type"];
      if (t === "TechArticle" || t === "Article" || t === "BlogPosting") {
        return node as Record<string, unknown>;
      }
    }
  } catch {
    /* ignore malformed JSON-LD */
  }
  return null;
}

export async function scrapeArticle(env: Env, sourceUrl: string): Promise<ScrapedArticle> {
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": env.USER_AGENT, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`article fetch ${res.status}`);
  const html = await res.text();
  const { document } = parseHTML(html);

  const ld = extractJsonLd(html);

  // --- title ---
  const title =
    (ld?.headline as string)?.trim() ||
    qs(document, "h1")?.textContent?.trim() ||
    "";
  if (!title) throw new Error("no title found");

  // --- body container (Tailwind `prose`) ---
  const prose = qs(document, ".prose");
  if (!prose) throw new Error("no .prose content container found");

  // Strip ads / scripts / non-prose blocks.
  for (const sel of AD_SELECTORS) {
    for (const el of qsa(prose, sel)) el.remove();
  }
  // Strip ad/QR images (defense in depth; some may sit outside .not-prose).
  for (const img of qsa(prose, "img")) {
    const src = img.getAttribute("src") ?? "";
    if (AD_IMG_PATTERNS.some((p) => src.includes(p))) {
      img.closest("a")?.remove();
      img.remove();
    }
  }
  const bodyHtml = prose.innerHTML.trim();
  if (!bodyHtml) throw new Error("empty body after cleaning");

  // --- tags --- (anchors to /tag/...), fallback to JSON-LD keywords
  let tags = qsa(document, 'a[href*="/tag/"]')
    .map((a) => (a.textContent ?? "").replace(/^#/, "").trim())
    .filter(Boolean);
  if (tags.length === 0 && typeof ld?.keywords === "string") {
    tags = (ld.keywords as string).split(",").map((t) => t.trim()).filter(Boolean);
  }
  tags = Array.from(new Set(tags)).slice(0, 30);

  // --- github stars --- from the stargazers anchor text
  let githubStars: number | null = null;
  const starAnchor = qs(document, 'a[href*="/stargazers"]');
  const starMatch = starAnchor?.textContent?.match(/([\d.,\s]+)\s*$/);
  if (starMatch) {
    const n = parseInt(starMatch[1].replace(/[.,\s]/g, ""), 10);
    if (!Number.isNaN(n)) githubStars = n;
  }

  // --- source date --- prefer JSON-LD datePublished
  const sourceDate =
    (ld?.datePublished as string)?.trim() ||
    (ld?.dateModified as string)?.trim() ||
    null;

  return { title, bodyHtml, tags, githubStars, sourceDate };
}
