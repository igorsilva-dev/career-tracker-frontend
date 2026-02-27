"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/ui/ToastProvider";

function titleFromSegment(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (!parts.length) {
      return ["Dashboard"];
    }
    return ["Dashboard", ...parts.map(titleFromSegment)];
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ToastProvider>
      {mobileOpen ? <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setMobileOpen(false)} /> : null}

      <div className="app-shell">
        <header className="fixed-header">
          <div className="fixed-header-inner">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="topbar-icon menu-toggle" aria-label="Open menu" onClick={() => setMobileOpen((v) => !v)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </button>
              <div className="header-brand">
                <div className="brand-badge">CT</div>
                <div>
                  <strong>CareerTracker AI</strong>
                  <nav className="breadcrumbs" aria-label="Breadcrumb">
                    {breadcrumbs.map((label, index) => (
                      <span key={`${label}-${index}`} className="breadcrumb-item">
                        {index > 0 ? <span className="breadcrumb-sep">/</span> : null}
                        <span>{label}</span>
                      </span>
                    ))}
                  </nav>
                </div>
              </div>
            </div>

            <div className="topbar-actions">
              <button className="topbar-icon" aria-label="Insights">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9m8 10V5m8 14v-7" /></svg>
              </button>
              <button className="topbar-icon" aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              </button>
              <span className="badge orange">MVP</span>
              <span className="avatar">CT</span>
            </div>
          </div>
        </header>

        <div className="app-body">
          <Nav
            pinned={sidebarPinned}
            onTogglePin={() => setSidebarPinned((v) => !v)}
            mobileOpen={mobileOpen}
            onNavigate={() => setMobileOpen(false)}
          />
          <main className={`content ${sidebarPinned ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <div className="container">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
