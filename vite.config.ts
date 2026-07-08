import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the built site works from any folder,
// including a GitHub Pages project subpath. Build output goes to docs/ so GitHub
// Pages can serve straight from the /docs folder on the main branch.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "docs", emptyOutDir: true },
});
