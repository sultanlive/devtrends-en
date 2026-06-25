import { parseHTML } from "linkedom";
import type { Env } from "./types";
import { qsa, qs } from "./dom";
import { parseSourceUrl, upsertDiscovered } from "./db";

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

/** Fetch and parse sitemap.xml into {loc, lastmod} entries. */
export async function fetchSitemap(env: Env): Promise<SitemapEntry[]> {
  const url = `${env.SOURCE_BASE.replace(/\/$/, "")}/sitemap.xml`;
  const res = await fetch(url, {
    headers: { "User-Agent": env.USER_AGENT, Accept: "application/xml,text/xml" },
  });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();

  // linkedom parses XML-ish documents fine for our <url><loc><lastmod> shape.
  const { document } = parseHTML(xml);
  const entries: SitemapEntry[] = [];
  for (const node of qsa(document, "url")) {
    const loc = qs(node, "loc")?.textContent?.trim();
    if (!loc) continue;
    const lastmod = qs(node, "lastmod")?.textContent?.trim() || null;
    entries.push({ loc, lastmod });
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

  // Only apply the initial cap until we actually have rows; afterward, process
  // everything new so updates aren't missed once the site is seeded.
  const seeded = await env.DB.prepare("SELECT COUNT(*) AS n FROM articles").first<{ n: number }>();
  const limit = (seeded?.n ?? 0) === 0 && backfillLimit > 0 ? backfillLimit : articles.length;

  let count = 0;
  for (const e of articles.slice(0, limit)) {
    try {
      const inserted = await upsertDiscovered(
        env,
        e.loc,
        e.lastmod,
        e.parsed!.language,
        e.parsed!.rawSlug
      );
      if (inserted) count++;
    } catch (err) {
      console.log(`discover skip ${e.loc}: ${String(err).slice(0, 120)}`);
    }
  }
  return count;
}
