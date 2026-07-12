import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "./RequireAuth";

afterEach(() => vi.unstubAllGlobals());

describe("RequireAuth", () => {
  it("redirects unauthenticated users to login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "UNAUTHENTICATED", message: "Login required" },
    }), { status: 401 })));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/login" element={<p>Login page</p>} />
            <Route path="/dashboard" element={<RequireAuth><p>Protected page</p></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected page")).not.toBeInTheDocument();
  });
});
