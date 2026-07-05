import Link from "next/link";
import { CircleAlert, GitCommitHorizontal, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { passageHref } from "@/lib/evidence-links";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";
import type { MappingSlotRecord } from "@/lib/persistence/types";

export const metadata = { title: "Provision Map" };

const groupTitles: Record<string, string> = {
  ltv: "Loan-to-value",
  distribution: "Distributions",
  disposal_distribution: "Disposal & proceeds",
};

const slotTitles: Record<string, string> = {
  "ltv.base": "Original threshold",
  "ltv.amendment": "Temporary amendment",
  "ltv.waiver": "Limited waiver",
  "distribution.restriction": "Distribution restriction",
  "distribution.definition": "Permitted definition",
  "distribution.temporary_prohibition": "Temporary prohibition",
  "disposal_distribution.disposal_restriction": "Disposal restriction",
  "disposal_distribution.disposal_definition": "Permitted definition",
  "disposal_distribution.mandatory_prepayment": "Mandatory prepayment",
};

function humanize(value: string): string {
  const cleaned = value.replaceAll("_", " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function slotTitle(slotKey: string): string {
  return slotTitles[slotKey] ?? humanize(slotKey.split(".").pop() ?? slotKey);
}

function excerpt(quote: string): string {
  const flattened = quote.replace(/\s+/g, " ").trim();
  return flattened.length > 150 ? `${flattened.slice(0, 150)}…` : flattened;
}

function groupSlots(
  slots: MappingSlotRecord[],
): Array<{ key: string; title: string; slots: MappingSlotRecord[] }> {
  const groups = new Map<string, MappingSlotRecord[]>();
  for (const slot of slots) {
    const groupKey = slot.slotKey.includes(".")
      ? slot.slotKey.split(".", 1)[0]
      : "other";
    const bucket = groups.get(groupKey) ?? [];
    bucket.push(slot);
    groups.set(groupKey, bucket);
  }
  const preferredOrder = ["ltv", "distribution", "disposal_distribution"];
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const rankA = preferredOrder.indexOf(a);
      const rankB = preferredOrder.indexOf(b);
      return (
        (rankA === -1 ? preferredOrder.length : rankA) -
        (rankB === -1 ? preferredOrder.length : rankB)
      );
    })
    .map(([key, grouped]) => ({
      key,
      title: groupTitles[key] ?? humanize(key),
      slots: grouped,
    }));
}

export default function ProvisionMapPage() {
  const mapping = getPersistence().getActiveMappingView(
    localSyntheticActor,
    localSyntheticWorkspaceId,
  );

  if (!mapping) {
    return (
      <>
        <PageHeader
          title="Provision map"
          description="The reviewed mapping between provision slots and exact source passages."
        />
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No activated manifest</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                This workspace has no activated provision mapping, so no
                reviewed slots can be shown. Decision answers remain blocked
                until a mapping is reviewed and activated.
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const reviewedCount = mapping.slots.filter((slot) => slot.reviewedAt).length;
  const groups = groupSlots(mapping.slots);

  return (
    <>
      <PageHeader
        eyebrow={`Active manifest v${mapping.manifestVersion}`}
        title="Provision map"
        description="The active reviewed mapping, read from persistence: every slot names its source document, locator, and the exact quote that citation validation enforces. Editing is not part of this local v0; activation appends a new immutable manifest version."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          [
            "Reviewed slots",
            `${reviewedCount}/${mapping.expectedSlotCount}`,
          ],
          ["Manifest activated", mapping.activatedAt.slice(0, 10)],
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
          <Card key={group.key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {group.title}
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <LockKeyhole className="size-3 text-primary" />
                  {group.slots.length} reviewed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.slots.map((slot) => (
                <article
                  key={slot.slotKey}
                  className="rounded-md border bg-muted/20 px-3 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium">
                      {slotTitle(slot.slotKey)}
                    </h3>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {slot.reviewedAt ? "reviewed" : "unreviewed"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {slot.documentTitle}
                  </p>
                  <blockquote className="mt-2 border-l pl-3 text-xs leading-5 text-muted-foreground">
                    {excerpt(slot.exactQuote)}
                  </blockquote>
                  <Link
                    href={passageHref(slot.documentExternalId, slot.locator)}
                    className="mt-2 inline-block font-mono text-[11px] text-primary hover:underline"
                  >
                    {slot.locator} · page {slot.page}
                  </Link>
                </article>
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
