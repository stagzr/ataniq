import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    {
      name: "maplibre-worker-shared-module",
      closeBundle() {
        copyFileSync(
          resolve("node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs"),
          resolve("dist/assets/maplibre-gl-shared.mjs"),
        );
      },
    },
  ],
  base: process.env.VITE_BASE_PATH ?? "/",
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
});
