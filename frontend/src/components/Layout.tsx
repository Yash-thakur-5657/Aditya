import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/leads", label: "Leads" },
  { to: "/calls", label: "Calls" },
  { to: "/properties", label: "Properties" },
  { to: "/live-test", label: "Live Test Call" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen bg-brand-50/40">
      <aside className="flex w-60 shrink-0 flex-col border-r border-brand-100 bg-brand-950 text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400 text-brand-950 font-bold">
            A
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Aditi</p>
            <p className="text-xs leading-tight text-brand-300">Voice Agent Console</p>
          </div>
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-800 text-white"
                    : "text-brand-300 hover:bg-brand-900 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-brand-400">
          Bilingual AI voice agent for real estate
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
