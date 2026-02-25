"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavProps {
  pinned: boolean;
  onTogglePin: () => void;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

const links = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 13h8V3H3v10zM13 21h8v-6h-8v6zM13 3v8h8V3h-8zM3 21h8v-6H3v6z" />
      </svg>
    ),
  },
  {
    href: "/applications",
    label: "Applications",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
        <path d="M4 21a8 8 0 0116 0" />
      </svg>
    ),
  },
  {
    href: "/analysis",
    label: "Analyze Match",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z" />
      </svg>
    ),
  },
  {
    href: "/cv-generator",
    label: "Tailored CV",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M15 3v4h4" />
      </svg>
    ),
  },
];

export function Nav({ pinned, onTogglePin, mobileOpen = false, onNavigate }: NavProps) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar fixed-sidebar ${pinned ? "pinned" : "unpinned"} ${mobileOpen ? "mobile-open" : ""}`}>
      <nav className="nav-list">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-item ${pathname === link.href ? "active" : ""}`}
            title={link.label}
            onClick={onNavigate}
          >
            <span className="nav-icon" aria-hidden>{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-actions bottom">
        <button className="pin-toggle" aria-label={pinned ? "Unpin menu" : "Pin menu"} onClick={onTogglePin} title={pinned ? "Unpin menu" : "Pin menu"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3h8l-1 5 3 3v2H6v-2l3-3-1-5z" />
            <path d="M12 13v8" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
