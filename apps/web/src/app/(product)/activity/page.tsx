import Link from "next/link";
import { Clock3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSyntheticDashboard } from "@/lib/dashboard";
import type { AuditEventRecord } from "@/lib/persistence/types";

export const metadata = { title: "Activity" };

function entityHref(event: AuditEventRecord): string | null {
  if (!event.entityId) {
    return null;
  }
  switch (event.entityType) {
    case "answer":
      return `/ask?answer=${encodeURIComponent(event.entityId)}`;
    case "manifest_version":
      return "/provision-map";
    case "workspace":
      return "/workspaces";
    default:
      return null;
  }
}

export default function ActivityPage() {
  const snapshot = getSyntheticDashboard();
  return (
    <>
      <PageHeader
        title="Activity"
        description="Append-oriented events for material workspace, mapping, answer, and document changes."
      />
      <Card>
        <CardContent className="p-0">
          {snapshot.recentEvents.map((event, index) => (
            <div
              key={event.id}
              className="flex gap-4 border-b p-5 last:border-b-0"
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/30">
                <Clock3 className="size-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{event.action}</p>
                  {index === 0 ? (
                    <Badge variant="outline" className="text-[10px]">
                      latest
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(() => {
                    const href = entityHref(event);
                    const label = `${event.entityType}${
                      event.entityId ? ` · ${event.entityId}` : ""
                    }`;
                    return href ? (
                      <Link
                        href={href}
                        className="break-all hover:text-primary hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="break-all">{label}</span>
                    );
                  })()}
                </p>
              </div>
              <time
                dateTime={event.occurredAt}
                className="font-mono text-[10px] text-muted-foreground"
              >
                {event.occurredAt.replace("T", " ").slice(0, 19)}Z
              </time>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
