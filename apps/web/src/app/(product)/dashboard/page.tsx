import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import { ContractPositionTimeline } from "@/components/contract-position-timeline";
import { DecisionUnavailable } from "@/components/decision-unavailable";
import { Button } from "@/components/ui/button";
import {
  decisionDates,
  loadDecisionSurface,
  normalizeDecisionDate,
} from "@/lib/decision-surface";
import { getSyntheticDashboard } from "@/lib/dashboard";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";
import { cn } from "@/lib/utils";

export const metadata = { title: "Decision dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { asOf: requestedDate } = await searchParams;
  const asOf = normalizeDecisionDate(requestedDate);
  const snapshot = getSyntheticDashboard();
  const decision = await loadDecisionSurface(snapshot.workspace.slug, asOf);
  const surface = decision.kind === "ready" ? decision.surface : null;
  const recentAnswers = getPersistence().listAnswers(
    localSyntheticActor,
    localSyntheticWorkspaceId,
    3,
  );
  const mappingPercent =
    snapshot.totalSlots === 0
      ? 0
      : Math.round((snapshot.reviewedSlots / snapshot.totalSlots) * 100);
  const metrics = [
    {
      label: "Documents",
      value: snapshot.workspace.documentCount,
      detail: `${snapshot.workspace.passageCount} passages`,
    },
    {
      label: "Provision map",
      value: `${mappingPercent}%`,
      detail: `${snapshot.reviewedSlots}/${snapshot.totalSlots} reviewed`,
    },
    {
      label: "Manifest",
      value: `v${snapshot.workspace.activeManifestVersion ?? "—"}`,
      detail: "immutable snapshot",
    },
    {
      label: "Saved answers",
      value: snapshot.answerCount,
      detail: `${snapshot.citationCount} citations`,
    },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {snapshot.workspace.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Can we rely on the current contractual position?
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard-legacy">
            View previous design
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </header>

      <section aria-label="Review date">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium">Position as of</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Change the date to test which document controls.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-1 lg:max-w-4xl xl:grid-cols-4">
            {decisionDates.map((option) => (
              <Link
                key={option.value}
                href={`/dashboard?asOf=${option.value}`}
                aria-current={asOf === option.value ? "date" : undefined}
                className={cn(
                  "min-w-0 border px-3 py-2 text-center text-xs transition-colors",
                  asOf === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <span className="font-mono tabular-nums">{option.value}</span>
                <span className="ml-2 hidden sm:inline">{option.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {surface ? (
        <section
          aria-labelledby="decision-status"
          className="grid border-y lg:grid-cols-[0.9fr_1.35fr_1fr]"
        >
        <div className="py-6 lg:pr-8">
          <p className="text-sm text-muted-foreground">Current status</p>
          <div className="mt-3 flex items-start gap-3">
            <span
              className={cn(
                "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full",
                surface.tone === "attention"
                  ? "bg-amber-400/15 text-amber-300"
                  : "bg-primary/15 text-primary",
              )}
            >
              {surface.tone === "attention" ? (
                <CircleAlert className="size-4" />
              ) : (
                <CircleCheck className="size-4" />
              )}
            </span>
            <div>
              <h2
                id="decision-status"
                className="text-xl font-semibold leading-tight"
              >
                {surface.status}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {surface.statusDetail}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t py-6 lg:border-l lg:border-t-0 lg:px-8">
          <p className="text-sm text-muted-foreground">What changed</p>
          <ul className="mt-3 space-y-4">
            {surface.changes.map((change) => (
              <li key={change.title} className="grid grid-cols-[1rem_1fr] gap-2">
                <Check className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{change.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {change.summary}
                  </p>
                  <Link
                    href={`#evidence-${change.evidence.passageId}`}
                    className="mt-1.5 inline-block font-mono text-[11px] text-primary hover:underline"
                  >
                    Inspect {change.evidence.locator} · p.
                    {change.evidence.page}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t py-6 lg:border-l lg:border-t-0 lg:pl-8">
          <p className="text-sm text-muted-foreground">Why it matters</p>
          <p className="mt-3 text-sm leading-6">{surface.whyItMatters}</p>
          <div className="mt-6 border-l-2 border-primary pl-4">
            <p className="text-sm font-semibold">Recommended next action</p>
            <p className="mt-1 text-sm">{surface.recommendation.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {surface.recommendation.detail}
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href={surface.recommendation.href}>
                {surface.recommendation.label}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
        </section>
      ) : decision.kind !== "ready" ? (
        <DecisionUnavailable asOf={asOf} result={decision} />
      ) : null}

      <section
        aria-label="Workspace metrics"
        className="grid grid-cols-2 border-b pb-8 lg:grid-cols-4"
      >
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "py-3",
              index % 2 === 1 && "border-l pl-5",
              index > 1 && "border-t pt-5 lg:border-t-0 lg:pt-3",
              index === 2 && "lg:border-l lg:pl-5",
            )}
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metric.detail}
            </p>
          </div>
        ))}
      </section>

      {surface ? (
        <ContractPositionTimeline timeline={surface.timeline} />
      ) : null}

      <section className="grid gap-10 border-t pt-8 xl:grid-cols-[1.4fr_0.6fr]">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Evidence behind this view</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Exact passages from the persisted synthetic document set.
              </p>
            </div>
            <Link
              href="/documents"
              className="shrink-0 text-xs text-primary hover:underline"
            >
              All documents
            </Link>
          </div>
          <div className="mt-5 divide-y border-y">
            {surface ? surface.evidence.map((item) => (
              <details
                key={item.passageId}
                id={`evidence-${item.passageId}`}
                open={
                  surface.recommendation.href ===
                  `#evidence-${item.passageId}`
                }
                className="group scroll-mt-24 py-4 target:bg-primary/5"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.documentTitle}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.locator} · page {item.page}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground group-open:hidden">
                    Show passage
                  </span>
                  <span className="hidden text-xs text-muted-foreground group-open:inline">
                    Hide
                  </span>
                </summary>
                <blockquote className="mt-4 border-l pl-4 text-sm leading-6 text-muted-foreground">
                  {item.text}
                </blockquote>
                <Link
                  href={`/documents#${item.documentId}`}
                  className="mt-3 inline-block text-xs text-primary hover:underline"
                >
                  View document metadata
                </Link>
              </details>
            )) : (
              <p className="py-4 text-sm text-muted-foreground">
                Evidence is hidden until the engine response matches persisted
                source passages.
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold">Recent determinations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Persisted against the active manifest.
          </p>
          <div className="mt-5 divide-y border-y">
            {recentAnswers.length ? (
              recentAnswers.map((answer) => (
                <Link
                  key={answer.id}
                  href={`/ask?answer=${answer.id}`}
                  className="group block py-4"
                >
                  <p className="text-sm font-medium group-hover:text-primary">
                    {answer.question}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {answer.support_status.replaceAll("_", " ")} ·{" "}
                    {answer.sources.length} citations
                  </p>
                </Link>
              ))
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No determinations saved yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t pt-5 text-xs leading-5 text-muted-foreground">
        Synthetic local evaluation only. Retrieval and extraction may be
        automated; legal interpretation and commercial judgment remain human
        responsibilities.
      </footer>
    </div>
  );
}
