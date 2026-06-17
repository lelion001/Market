import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Store, PlusCircle, Bell, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: typeof Home; primary?: boolean };
const baseItems: NavItem[] = [
  { to: "/", label: "Akèy", icon: Home },
  { to: "/mache", label: "Mache", icon: Store },
  { to: "/pibliye", label: "Pibliye", icon: PlusCircle, primary: true },
  { to: "/notifikasyon", label: "Anons", icon: Bell },
  { to: "/kont", label: "Kont", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  // For admins, swap the rightmost "Kont" with Admin shortcut to keep ADM stable & reachable
  const items: NavItem[] = isAdmin
    ? [...baseItems.slice(0, 4), { to: "/admin", label: "Admin", icon: Shield }]
    : baseItems;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 safe-bottom">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const Icon = it.icon;
          if (it.primary) {
            return (
              <li key={it.to} className="flex items-center">
                <Link
                  to={it.to}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl ml-gradient text-primary-foreground shadow-glow transition-transform active:scale-95"
                  aria-label={it.label}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.2} />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow")} strokeWidth={active ? 2.4 : 2} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
