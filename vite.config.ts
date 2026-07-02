/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  base: "/blorble/", // GitHub Pages project path
  test: { environment: "node" },
});
