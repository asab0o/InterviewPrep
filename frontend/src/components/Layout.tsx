import { useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import { meQueryKey, useMe } from "../features/auth/useMe";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/attempts", label: "Attempts" },
  { to: "/attempts/new", label: "New attempt" },
];

export function Layout() {
  const me = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    queryClient.removeQueries({ queryKey: meQueryKey });
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <NavLink to="/dashboard" className="mr-auto text-lg font-semibold tracking-tight">Interview Prep</NavLink>
          <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`
              }>{link.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {me.data?.avatarUrl && <img src={me.data.avatarUrl} alt="" className="h-8 w-8 rounded-full" />}
            <button type="button" onClick={() => void handleLogout()} className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Logout</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Outlet /></main>
    </div>
  );
}
