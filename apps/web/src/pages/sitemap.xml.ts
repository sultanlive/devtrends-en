import type { APIContext } from "astro";
import { getEnv, canonical, articlePath } from "../lib/site";
import { allPublishedUrls, listLanguages, allTags, publishedTagSets } from "../lib/db";
import { SECTIONS, tagsMatchSection } from "../lib/sections";
import { LOCALES, DEFAULT_LOCALE, localeHref } from "../lib/i18n";

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

  // Locale-agnostic paths (each expands into one <url> per locale with alternates).
  const paths: { path: string; lastmod?: string | null }[] = [
    { path: "/" },
    ...sections.map((s) => ({ path: `/sections/${s.slug}` })),
    ...languages.map((l) => ({ path: `/${l.language}` })),
    ...tags.map((t) => ({ path: `/tag/${encodeURIComponent(t)}` })),
    ...articles.map((a) => ({ path: articlePath(a.language, a.slug), lastmod: a.source_lastmod ?? a.updated_at })),
  ];

  const abs = (loc: string, p: string) => canonical(env.SITE_URL, localeHref(loc, p));

  const urls = paths
    .flatMap(({ path, lastmod }) => {
      const alts = LOCALES.map(
        (loc) => `    <xhtml:link rel="alternate" hreflang="${loc}" href="${esc(abs(loc, path))}"/>`
      ).join("\n");
      const xdefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(DEFAULT_LOCALE, path))}"/>`;
      return LOCALES.map(
        (loc) =>
          `  <url>\n    <loc>${esc(abs(loc, path))}</loc>` +
          (lastmod ? `\n    <lastmod>${esc(new Date(lastmod).toISOString())}</lastmod>` : "") +
          `\n${alts}\n${xdefault}\n  </url>`
      );
    })
    .join("\n");

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
