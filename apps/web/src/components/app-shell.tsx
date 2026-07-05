import { DesktopNavigation, MobileNavigation } from "./app-navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function AppShell({
  children,
  organizationName,
  actorName,
}: {
  children: React.ReactNode;
  organizationName: string;
  actorName: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopNavigation />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <MobileNavigation />
            <p className="hidden max-w-52 truncate text-sm md:block">
              {organizationName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-primary" />
              Local synthetic data
            </span>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Avatar className="size-8 border">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {actorName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
