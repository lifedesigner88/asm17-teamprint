import { defineConfig } from "vite";

function fromConfigRoot(relativePath: string) {
  const pathname = decodeURIComponent(new URL(relativePath, import.meta.url).pathname);
  return pathname.replace(/^\/([A-Za-z]:\/)/, "$1");
}

function resolveLocaleAssetVersion() {
  const explicitVersion = process.env.VITE_LOCALE_VERSION?.trim();
  if (explicitVersion) {
    return explicitVersion;
  }

  const gitSha = process.env.GITHUB_SHA?.trim();
  if (gitSha) {
    return gitSha.slice(0, 12);
  }

  return new Date().toISOString();
}

export default defineConfig({
  cacheDir: process.env.PERSONA_VITE_CACHE_DIR ?? fromConfigRoot("./.cache/vite-local"),
  define: {
    __LOCALE_ASSET_VERSION__: JSON.stringify(resolveLocaleAssetVersion())
  },
  resolve: {
    alias: {
      "@": fromConfigRoot("./src")
    },
    dedupe: ["react", "react-dom", "react-router-dom"]
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-dev-runtime", "react-router-dom"]
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.VITE_PORT ?? "3000")
  }
});
