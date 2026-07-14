import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createApiHandler } from "./server/api.mjs";
import { createSessionGuard } from "./server/security.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = 4317;
const allowedOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
const sessionGuard = createSessionGuard({ secret: randomBytes(32).toString("hex"), allowedOrigins });
const apiHandler = createApiHandler({ root: fileURLToPath(new URL("..", import.meta.url)), sessionGuard });

function localApiPlugin() {
  return {
    name: "pixel-map-local-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!sessionGuard(req, res)) return;
        if (req.url?.startsWith("/api/")) { void apiHandler(req, res).then((handled) => { if (!handled) next(); }); return; }
        next();
      });
    }
  };
}

export default defineConfig({
  root,
  appType: "spa",
  plugins: [react(), localApiPlugin()],
  server: { host: "127.0.0.1", port, strictPort: true, allowedHosts: ["127.0.0.1", "localhost"] }
});
