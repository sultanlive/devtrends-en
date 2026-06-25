import { defineMiddleware } from "astro:middleware";
import { DEFAULT_LOCALE, isLocale } from "./lib/i18n";

// Locale routing: English lives at the root, the other locales under /{locale}/.
// We strip the locale prefix and rewrite to the existing (locale-agnostic)
// routes, passing the active locale through `locals.locale`.
export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (isLocale(first)) {
    const rest = "/" + segments.slice(1).join("/");
    if (first === DEFAULT_LOCALE) {
      // Canonicalize /en/... -> /... (avoid duplicate content).
      return context.redirect(rest + url.search, 301);
    }
    context.locals.locale = first;
    return context.rewrite(rest + url.search);
  }

  // No prefix. Don't clobber a locale already set on a prior pass (rewrite
  // re-runs middleware on the stripped path).
  if (!context.locals.locale) context.locals.locale = DEFAULT_LOCALE;
  return next();
});
