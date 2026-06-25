import type { Env } from "./types";

/**
 * Purge the edge cache for the URLs affected by a freshly published article so
 * Variant 1 (SSR + edge cache) shows new content immediately. No-op unless both
 * CF_API_TOKEN and CF_ZONE_ID are configured.
 */
export async function purgeForArticle(
  env: Env,
  language: string | null,
  slug: string | null
): Promise<void> {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) return;

  const base = env.SITE_URL.replace(/\/$/, "");
  const files = [`${base}/`, `${base}/sitemap.xml`];
  if (language) files.push(`${base}/${language}`);
  if (language && slug) files.push(`${base}/${language}/${slug}`);

  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });
  } catch {
    /* purge is best-effort; cache will expire via s-maxage regardless */
  }
}
