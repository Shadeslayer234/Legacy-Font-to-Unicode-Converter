import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import { AstroPWAIntegration } from "@vite-pwa/astro";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

export default defineConfig({
  // TODO: replace with the real Cloudflare Pages / custom domain.
  site: "https://lk-unicode.pages.dev",
  i18n: {
    locales: ["si", "ta", "en"],
    defaultLocale: "si",
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    preact(),
    AstroPWAIntegration({
      registerType: "autoUpdate",
      manifest: {
        name: "Legacy Font to Unicode Converter",
        short_name: "Unicode",
        description: "Convert FM, DL and Bamini font text to Unicode, offline.",
        theme_color: "#9a3412",
        background_color: "#fffaf5",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      generateSW: {
        globPatterns: ["**/*.{html,js,css,woff2,svg}"],
        navigateFallback: null,
      },
    }),
  ],
  vite: {
    plugins: [
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        emitTsDeclarations: true,
      }),
    ],
  },
});
