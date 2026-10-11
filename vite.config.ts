import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: process.env["SITE_BASE"] ?? "/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "life-local-model-status",
      configureServer(server) {
        // Local frontend runs the simulator. Hosted requests use the authenticated Worker gateway.
        server.middlewares.use("/api/nico/status", (_request, response) => {
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          response.end(
            JSON.stringify({
              configured: false,
              available: false,
              authenticated: false,
              authorized: false,
            }),
          );
        });
      },
    },
  ],
  build: { outDir: "dist", emptyOutDir: true },
  server: { host: "127.0.0.1" },
});
