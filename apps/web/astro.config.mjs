// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// SSR on Cloudflare Pages (Variant 1). platformProxy exposes the D1/R2 bindings
// to `astro dev`, reading the SAME local state the parser writes (shared
// --persist-to dir at repo root).
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persist: { path: "../../.wrangler-state/v3" },
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
