import { AppShell } from "@/components/app-shell";
import { getSyntheticDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = getSyntheticDashboard();
  return (
    <AppShell
      organizationName={snapshot.organizationName}
      actorName={snapshot.actorName}
    >
      {children}
    </AppShell>
  );
}
