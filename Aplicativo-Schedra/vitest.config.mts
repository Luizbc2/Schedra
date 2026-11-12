import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "react-native": "react-native-web" } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/ui/setup.ts"],
    include: ["tests/ui/**/*.test.tsx"],
    clearMocks: true,
  },
});
