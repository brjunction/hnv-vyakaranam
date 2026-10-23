"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTree, LayoutDashboard, BookOpenText, Quote, CalendarDays, Users, Wrench, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, owner: false },
  { href: "/admin/hnv", label: "Chapters & sūtras", icon: ListTree, owner: false },
  { href: "/admin/verses", label: "Verse of the Day", icon: BookOpenText, owner: false },
  { href: "/admin/subhashita", label: "Subhāṣita", icon: Quote, owner: false },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarDays, owner: false },
  { href: "/admin/users", label: "Admins", icon: Users, owner: true },
  { href: "/admin/tools", label: "Tools", icon: Wrench, owner: true },
  { href: "/admin/account", label: "Account", icon: UserRound, owner: false },
];

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto">
      {ITEMS.filter((i) => !i.owner || role === "owner").map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              active ? "bg-white/12 text-white" : "text-[var(--hero-muted)] hover:text-white hover:bg-white/6"
            }`}
          >
            <Icon size={17} strokeWidth={1.75} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
