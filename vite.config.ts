import { defineConfig } from "vite";

// When deploying to GitHub Pages the site lives at /<repo>/, so the bundle's
// asset URLs need that prefix. Local dev and custom-domain builds stay at '/'.
const base = process.env.GITHUB_PAGES ? "/ShadeTree/" : "/";

export default defineConfig({
  base,
  server: {
    port: 5173,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
