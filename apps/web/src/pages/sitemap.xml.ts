import type { APIContext } from "astro";
import { getEnv, canonical, articlePath } from "../lib/site";
import { allPublishedUrls, listLanguages, allTags, publishedTagSets } from "../lib/db";
import { SECTIONS, tagsMatchSection } from "../lib/sections";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(context: APIContext): Promise<Response> {
  const env = getEnv(context.locals);
  const [articles, languages, tags, tagSets] = await Promise.all([
    allPublishedUrls(env.DB),
    listLanguages(env.DB),
    allTags(env.DB),
    publishedTagSets(env.DB),
  ]);

  const sections = SECTIONS.filter((s) => tagSets.some((ts) => tagsMatchSection(ts, s)));

  const urls: { loc: string; lastmod?: string | null }[] = [
    { loc: canonical(env.SITE_URL, "/") },
    ...sections.map((s) => ({ loc: canonical(env.SITE_URL, `/sections/${s.slug}`) })),
    ...languages.map((l) => ({ loc: canonical(env.SITE_URL, `/${l.language}`) })),
    ...tags.map((t) => ({ loc: canonical(env.SITE_URL, `/tag/${encodeURIComponent(t)}`) })),
    ...articles.map((a) => ({
      loc: canonical(env.SITE_URL, articlePath(a.language, a.slug)),
      lastmod: a.source_lastmod ?? a.updated_at,
    })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${esc(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${esc(new Date(u.lastmod).toISOString())}</lastmod>` : "") +
          `</url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
