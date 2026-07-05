"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Building2,
  FileStack,
  Gauge,
  LibraryBig,
  Menu,
  MessageSquareText,
  Network,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/documents", label: "Documents", icon: FileStack },
  { href: "/provision-map", label: "Provision Map", icon: Network },
  { href: "/ask", label: "Ask", icon: MessageSquareText },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavigationLinks({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Product navigation" className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href === "/dashboard" && pathname === "/dashboard-legacy");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary bg-sidebar-accent/70 text-sidebar-accent-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
              compact && "py-2.5",
            )}
          >
            <Icon
              className={cn(
                "size-4",
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopNavigation() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex size-8 items-center justify-center border border-primary/30">
          <LibraryBig className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">
            Agreement Intelligence
          </p>
          <p className="text-xs text-muted-foreground">F-001 · local v0</p>
        </div>
      </div>
      <Separator />
      <div className="flex-1 px-3 py-5">
        <NavigationLinks />
      </div>
      <div className="mx-6 border-t py-5">
        <p className="mb-1 text-xs font-medium">Synthetic-only mode</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Deterministic extraction. Human legal and commercial judgment.
        </p>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="flex h-16 items-center gap-3 px-6 text-sm">
          <LibraryBig className="size-4 text-primary" />
          Agreement Intelligence
        </SheetTitle>
        <Separator />
        <div className="p-3">
          <NavigationLinks compact onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
