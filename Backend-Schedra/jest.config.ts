import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  setupFiles: ["<rootDir>/src/__tests__/integration/database-test-env.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist"],
};

export default config;
