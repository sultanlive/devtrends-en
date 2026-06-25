import type { Env } from "./types";
import { parseSourceUrl, toSlug, bulkInsertDiscovered, type DiscoveredItem } from "./db";

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Fetch and parse sitemap.xml into {loc, lastmod} entries. Uses a lightweight
 *  regex pass instead of a full DOM parse — far cheaper CPU on a large sitemap. */
export async function fetchSitemap(env: Env): Promise<SitemapEntry[]> {
  const url = `${env.SOURCE_BASE.replace(/\/$/, "")}/sitemap.xml`;
  const res = await fetch(url, {
    headers: { "User-Agent": env.USER_AGENT, Accept: "application/xml,text/xml" },
  });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();

  const entries: SitemapEntry[] = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1]?.trim() || null;
    entries.push({ loc: decodeXml(loc), lastmod });
  }
  return entries;
}

/**
 * Discover new/updated article URLs and enqueue them as pending.
 * On the initial run, cap to the most-recent N (BACKFILL_LIMIT) by lastmod.
 * Returns the number of rows inserted/re-queued.
 */
export async function discover(env: Env): Promise<number> {
  const entries = await fetchSitemap(env);

  // Keep only real article pages (/{language}/{slug}); sort newest first.
  const articles = entries
    .map((e) => ({ ...e, parsed: parseSourceUrl(e.loc, env.SOURCE_BASE) }))
    .filter((e) => e.parsed !== null)
    .sort((a, b) => (b.lastmod ?? "").localeCompare(a.lastmod ?? ""));

  const backfillLimit = Number(env.BACKFILL_LIMIT) || 0;

  // Only apply the initial cap until we actually have rows; afterward, enqueue
  // everything so the whole catalog gets backfilled over time.
  const seeded = await env.DB.prepare("SELECT COUNT(*) AS n FROM articles").first<{ n: number }>();
  const limit = (seeded?.n ?? 0) === 0 && backfillLimit > 0 ? backfillLimit : articles.length;

  const items: DiscoveredItem[] = articles.slice(0, limit).map((e) => ({
    source_url: e.loc,
    source_lastmod: e.lastmod,
    language: e.parsed!.language,
    slug: toSlug(e.parsed!.rawSlug),
  }));
  return bulkInsertDiscovered(env, items);
}
