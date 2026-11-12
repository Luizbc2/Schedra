import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: true, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});

// Native font loading is outside the interaction tests; controls use real RN Web.
vi.mock("@expo/vector-icons", async () => {
  const { createElement } = await import("react");
  return { Ionicons: ({ name }: { name: string }) => createElement("span", { "aria-hidden": true }, name) };
});

vi.mock("../../src/theme/ThemeProvider", async () => {
  const { darkColors } = await import("../../src/theme/tokens");
  return { useAppTheme: vi.fn(() => ({ colors: darkColors, mode: "dark", toggleTheme: vi.fn() })) };
});

afterEach(cleanup);
