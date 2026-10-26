import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCatalogList } from "../../src/features/catalog/hooks/useCatalogList";

describe("catalog list concurrency", () => {
  it("ignores an older search response arriving after a newer result", async () => {
    let finishOld!: (value: { data: string[]; local: { source: "server"; savedAt: number } }) => void;
    const old = new Promise<{ data: string[]; local: { source: "server"; savedAt: number } }>((resolve) => { finishOld = resolve; });
    const list = vi.fn().mockImplementation((_token, query) => query === "old" ? old : Promise.resolve({ data: [query], local: { source: "server", savedAt: 1 } }));
    const { result } = renderHook(() => useCatalogList(list, "token"));
    await waitFor(() => expect(list).toHaveBeenCalled());
    act(() => result.current.setSearch("old"));
    await waitFor(() => expect(list).toHaveBeenCalledWith("token", "old"));
    act(() => result.current.setSearch("new"));
    await waitFor(() => expect(result.current.items).toEqual(["new"]));
    await act(async () => { finishOld({ data: ["old"], local: { source: "server", savedAt: 1 } }); });
    expect(result.current.items).toEqual(["new"]);
  });
});
