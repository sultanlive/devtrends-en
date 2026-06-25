import type { APIContext } from "astro";
import { canonical, siteUrl } from "../lib/site";

export async function GET(context: APIContext): Promise<Response> {
  const body = `User-agent: *
Allow: /

Sitemap: ${canonical(siteUrl(context.locals, context.url), "/sitemap.xml")}
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
