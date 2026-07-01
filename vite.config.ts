import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The web SPA. `npm run build` emits dist/web, which the `review` server serves.
// `npm run dev` runs the SPA against a separately-launched `review` server (proxy /api).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4179",
    },
  },
});
