/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: { port: 3100, host: "0.0.0.0" },
  build: { outDir: "dist", assetsInlineLimit: 0 },
  test: { environment: "jsdom", globals: true },
});
