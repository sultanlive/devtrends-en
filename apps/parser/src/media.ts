import { parseHTML } from "linkedom";
import type { Env } from "./types";
import { qsa, qs } from "./dom";

const AD_IMG_PATTERNS = ["/cpa/banners/", "qr-code-channel", "/cpa/"];
const MAX_IMAGES = 12; // subrequest budget guard (free tier: 50/invocation)

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extFromUrl(url: string): string | null {
  const m = url.split("?")[0].match(/\.([a-z0-9]{2,4})$/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Download each content image, store it in R2, and rewrite <img src> to the R2
 * public URL. Ad/QR images are dropped. Returns the rewritten body HTML and the
 * first re-hosted image (used as og:image). On a per-image failure, the original
 * absolute URL is kept so the article still renders.
 */
export async function processMedia(
  env: Env,
  bodyHtml: string,
  slug: string
): Promise<{ bodyHtml: string; ogImage: string | null }> {
  const { document } = parseHTML(`<div id="__root">${bodyHtml}</div>`);
  const root = qs(document, "#__root");
  if (!root) return { bodyHtml, ogImage: null };
  const publicBase = env.R2_PUBLIC_BASE.replace(/\/$/, "");

  let ogImage: string | null = null;
  let processed = 0;

  for (const img of qsa(root, "img")) {
    const rawSrc = img.getAttribute("src") ?? "";
    if (!rawSrc || rawSrc.startsWith("data:")) {
      img.closest("a")?.remove();
      img.remove();
      continue;
    }

    // Resolve relative URLs against the source site.
    let absUrl: string;
    try {
      absUrl = new URL(rawSrc, env.SOURCE_BASE).toString();
    } catch {
      img.remove();
      continue;
    }

    // Drop ads / QR.
    if (AD_IMG_PATTERNS.some((p) => absUrl.includes(p))) {
      img.closest("a")?.remove();
      img.remove();
      continue;
    }

    if (processed >= MAX_IMAGES) continue; // keep remaining as-is (rare)

    try {
      const resp = await fetch(absUrl, { headers: { "User-Agent": env.USER_AGENT } });
      if (!resp.ok) throw new Error(`img ${resp.status}`);
      const contentType = resp.headers.get("content-type")?.split(";")[0].trim() ?? "";
      const ext = EXT_BY_TYPE[contentType] ?? extFromUrl(absUrl) ?? "img";
      const hash = (await sha1Hex(absUrl)).slice(0, 16);
      const key = `images/${slug}/${hash}.${ext}`;

      const data = await resp.arrayBuffer();
      await env.BUCKET.put(key, data, {
        httpMetadata: { contentType: contentType || "application/octet-stream" },
      });

      const newUrl = `${publicBase}/${key}`;
      img.setAttribute("src", newUrl);
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
      processed++;
      if (!ogImage) ogImage = newUrl;
    } catch {
      // Keep the absolute source URL as a graceful fallback (not broken).
      img.setAttribute("src", absUrl);
    }
  }

  return { bodyHtml: root.innerHTML, ogImage };
}
