import { Check, GitCommitHorizontal, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSyntheticDashboard } from "@/lib/dashboard";

export const metadata = { title: "Provision Map" };

const groups = [
  {
    title: "Loan-to-value",
    slots: ["Original threshold", "Temporary amendment", "Limited waiver"],
  },
  {
    title: "Distributions",
    slots: ["Restriction", "Permitted definition", "Temporary prohibition"],
  },
  {
    title: "Disposal & proceeds",
    slots: ["Disposal restriction", "Permitted definition", "Prepayment"],
  },
];

export default function ProvisionMapPage() {
  const snapshot = getSyntheticDashboard();
  return (
    <>
      <PageHeader
        eyebrow={`Active manifest v${snapshot.workspace.activeManifestVersion}`}
        title="Provision map"
        description="Every activated slot is reviewed against an exact source passage. Activation appends a new immutable manifest version in one transaction."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Reviewed slots", `${snapshot.reviewedSlots}/${snapshot.totalSlots}`],
          ["Activation", "Atomic"],
          ["Version history", "Append-only"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {group.title}
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <LockKeyhole className="size-3 text-primary" />
                  reviewed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.slots.map((slot) => (
                <div
                  key={slot}
                  className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2.5"
                >
                  <span className="text-sm">{slot}</span>
                  <Check className="size-4 text-primary" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Draft edits never mutate the active mapping. A successful activation
          validates all slots, writes the full snapshot, advances the workspace
          pointer, and records an audit event in the same database transaction.
        </p>
      </div>
    </>
  );
}
