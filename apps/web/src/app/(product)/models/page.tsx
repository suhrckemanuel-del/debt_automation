import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Check,
  CircleAlert,
  FileCheck2,
  Scale,
} from "lucide-react";
import { ModelRunForm } from "@/components/model-run-form";
import { VerificationPackDownloadForm } from "@/components/verification-pack-download-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { passageHref } from "@/lib/evidence-links";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";
import { cn } from "@/lib/utils";

export const metadata = { title: "Covenant model" };
export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatMoney(value: string): string {
  return money.format(Number(value));
}

function scenarioTone(status: string): string {
  if (status === "below_selected_threshold") return "text-primary";
  if (status === "at_selected_threshold") return "text-foreground";
  return "text-amber-300";
}

function scenarioStatusTitle(status: string): string {
  if (status === "below_selected_threshold") return "Below selected threshold";
  if (status === "at_selected_threshold") return "At selected threshold";
  return "Above selected threshold";
}

function formatPercent(value: string): string {
  return `${Number(value).toFixed(2)}%`;
}

function formatIsoDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function FinancialModelsPage() {
  const model = getPersistence().getActiveFinancialModel(
    localSyntheticActor,
    localSyntheticWorkspaceId,
    "ltv-v1",
  );
  if (!model) {
    return (
      <section className="border-y py-12">
        <h1 className="text-2xl font-semibold">Calculation unavailable</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          No reviewed, active LTV model version is available. The application
          will not infer a formula or use transient browser inputs.
        </p>
      </section>
    );
  }

  const runs = new Map(
    model.latestRuns.map((run) => [run.scenarioId, run.result]),
  );
  const baseline = runs.get("baseline");
  const scenarios = model.scenarios
    .map((scenario) => ({ scenario, result: runs.get(scenario.scenarioId) }))
    .filter((item) => item.result !== undefined);

  if (!baseline) {
    return (
      <div className="space-y-10">
        <header className="border-b pb-6">
          <p className="text-sm text-muted-foreground">
            Synthetic Facility A · model v{model.version}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            What is the LTV position on the Test Date?
          </h1>
        </header>
        <section className="grid border-y py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
          <div>
            <h2 className="text-xl font-semibold">
              Ready to calculate from persisted sources
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Model v{model.version} has two source-linked inputs and{" "}
              {model.scenarios.length} isolated scenarios. Run it through the
              deterministic Python engine to create immutable results.
            </p>
          </div>
          <div className="mt-5 lg:mt-0">
            <ModelRunForm hasRun={false} />
          </div>
        </section>
      </div>
    );
  }

  const definition = baseline.sources.find(
    (source) =>
      source.document_id === "doc_facility_001" &&
      source.locator === "Clause 1.1",
  );
  const threshold = baseline.sources.find(
    (source) =>
      source.document_id === baseline.selected_threshold.document_id &&
      source.locator === baseline.selected_threshold.locator,
  );
  const waiver = baseline.sources.find(
    (source) => source.document_id === "doc_waiver_001",
  );
  const displayRuns = [
    { label: "Reported baseline", result: baseline },
    ...scenarios.map(({ scenario, result }) => ({
      label: scenario.label,
      result: result!,
    })),
  ];
  const arithmeticStatus = baseline.outputs.arithmetic_status;
  const StatusIcon =
    arithmeticStatus === "above_selected_threshold" ? CircleAlert : Check;
  const selectedThresholdDisplay = formatPercent(
    baseline.outputs.threshold_percent,
  );
  const headroom = Number(baseline.outputs.headroom_percentage_points);
  const headroomMagnitude = Math.abs(headroom).toFixed(2);
  const statusMessage =
    arithmeticStatus === "at_selected_threshold"
      ? `Calculated LTV is ${baseline.outputs.ltv_display}. It is exactly at the sourced ${selectedThresholdDisplay} threshold.`
      : `Calculated LTV is ${baseline.outputs.ltv_display}. It is ${headroomMagnitude} percentage point ${headroom < 0 ? "above" : "below"} the sourced ${selectedThresholdDisplay} threshold.`;
  const waiverCeilingDisplay = baseline.waiver_observation
    ? formatPercent(baseline.waiver_observation.relief_up_to_percent)
    : null;
  const waiverDateDisplay = formatIsoDate(
    baseline.waiver_observation?.test_date ?? model.testDate,
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Synthetic Facility A · model v{model.version}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            What is the LTV position on the Test Date?
          </h1>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ModelRunForm hasRun />
          <VerificationPackDownloadForm scenarioId="baseline" />
        </div>
      </header>

      <section
        aria-labelledby="model-status"
        className="grid border-y lg:grid-cols-[0.95fr_1.25fr_1fr]"
      >
        <div className="py-6 lg:pr-8">
          <p className="text-sm text-muted-foreground">Current status</p>
          <div className="mt-3 flex items-start gap-3">
            <span
              className={cn(
                "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full",
                arithmeticStatus === "above_selected_threshold"
                  ? "bg-amber-400/15 text-amber-300"
                  : "bg-primary/15 text-primary",
              )}
            >
              <StatusIcon className="size-4" />
            </span>
            <div>
              <h2
                id="model-status"
                className={cn(
                  "text-xl font-semibold",
                  scenarioTone(arithmeticStatus),
                )}
              >
                {scenarioStatusTitle(arithmeticStatus)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {statusMessage}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t py-6 lg:border-l lg:border-t-0 lg:px-8">
          <p className="text-sm text-muted-foreground">What changed</p>
          <ul className="mt-3 space-y-4">
            <li className="grid grid-cols-[1rem_1fr] gap-2">
              <Check className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  Selected threshold is {selectedThresholdDisplay}
                </p>
                {threshold ? (
                  <Link
                    href={passageHref(
                      threshold.document_id,
                      threshold.locator,
                    )}
                    className="mt-1.5 inline-block font-mono text-[11px] text-primary hover:underline"
                  >
                    Inspect {threshold.locator} · p.{threshold.page}
                  </Link>
                ) : null}
              </div>
            </li>
            <li className="grid grid-cols-[1rem_1fr] gap-2">
              <Check className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {waiverCeilingDisplay
                    ? `One-date waiver range reaches ${waiverCeilingDisplay}`
                    : "No waiver range is active for this run"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Relevant to {waiverDateDisplay}; it does not amend the
                  threshold.
                </p>
                {waiver ? (
                  <Link
                    href={passageHref(waiver.document_id, waiver.locator)}
                    className="mt-1.5 inline-block font-mono text-[11px] text-primary hover:underline"
                  >
                    Inspect {waiver.locator} · p.{waiver.page}
                  </Link>
                ) : null}
              </div>
            </li>
          </ul>
        </div>

        <div className="border-t py-6 lg:border-l lg:border-t-0 lg:pl-8">
          <p className="text-sm text-muted-foreground">Why it matters</p>
          <p className="mt-3 text-sm leading-6">
            The arithmetic is inside the waiver&apos;s stated numeric range,
            but the calculator cannot decide whether every legal condition is
            satisfied.
          </p>
          <div className="mt-6 border-l-2 border-primary pl-4">
            <p className="text-sm font-semibold">Recommended next action</p>
            <p className="mt-1 text-sm">
              Review the waiver conditions and both source inputs.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="#evidence-chain">
                Trace the calculation
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        aria-label="Calculation metrics"
        className="grid grid-cols-2 border-b pb-8 lg:grid-cols-4"
      >
        {[
          {
            label: "Calculated LTV",
            value: baseline.outputs.ltv_display,
            detail: "full precision controls status",
          },
          {
            label: "Selected threshold",
            value: `${Number(baseline.outputs.threshold_percent).toFixed(2)}%`,
            detail: "Amendment Letter No. 1",
          },
          {
            label: "Arithmetic headroom",
            value: `${Number(
              baseline.outputs.headroom_percentage_points,
            ).toFixed(2)} pp`,
            detail: "negative means above",
          },
          {
            label: "Debt capacity",
            value: formatMoney(baseline.outputs.debt_capacity_headroom),
            detail: "at selected threshold",
          },
        ].map((metric, index) => (
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

      <section id="evidence-chain" className="scroll-mt-24">
        <h2 className="text-base font-semibold">Calculation trace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One source chain from agreement terms to reviewer decision.
        </p>
        <ol className="mt-5 grid border-y md:grid-cols-4">
          {[
            {
              icon: Scale,
              title: "Agreement terms",
              detail: "Definition, amendment, waiver",
            },
            {
              icon: FileCheck2,
              title: "Sourced inputs",
              detail: "Debt and valuation passages",
            },
            {
              icon: Calculator,
              title: "Deterministic calculation",
              detail: baseline.formula.trace,
            },
            {
              icon: CircleAlert,
              title: "Reviewer decision",
              detail: "Human review required",
            },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className={cn(
                  "px-4 py-5",
                  index > 0 && "border-t md:border-l md:border-t-0",
                )}
              >
                <Icon className="size-4 text-primary" />
                <p className="mt-3 text-sm font-medium">{step.title}</p>
                <p className="mt-1 font-mono text-[11px] leading-5 text-muted-foreground">
                  {step.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="text-base font-semibold">Sensitivity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assumptions are isolated from the reported source inputs.
        </p>
        <div className="mt-5 hidden border-y md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Debt</TableHead>
                <TableHead>Valuation</TableHead>
                <TableHead>LTV</TableHead>
                <TableHead>Headroom</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRuns.map(({ label, result }) => (
                <TableRow key={label}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatMoney(result.calculation_inputs.debt_amount)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatMoney(result.calculation_inputs.valuation_amount)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {result.outputs.ltv_display}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {Number(
                      result.outputs.headroom_percentage_points,
                    ).toFixed(2)}{" "}
                    pp
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-xs",
                      scenarioTone(result.outputs.arithmetic_status),
                    )}
                  >
                    {result.outputs.arithmetic_status
                      .replaceAll("_", " ")
                      .replace("selected ", "")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-5 divide-y border-y md:hidden">
          {displayRuns.map(({ label, result }) => (
            <div key={label} className="py-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium">{label}</p>
                <p
                  className={cn(
                    "font-mono text-lg font-semibold tabular-nums",
                    scenarioTone(result.outputs.arithmetic_status),
                  )}
                >
                  {result.outputs.ltv_display}
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Valuation</dt>
                  <dd className="mt-1 font-mono">
                    {formatMoney(result.calculation_inputs.valuation_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Headroom</dt>
                  <dd className="mt-1 font-mono">
                    {Number(
                      result.outputs.headroom_percentage_points,
                    ).toFixed(2)}{" "}
                    pp
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-10 border-t pt-8 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold">Source inputs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Immutable values attached to exact persisted passages.
          </p>
          <div className="mt-5 divide-y border-y">
            {model.inputs.map((input) => (
              <Link
                key={input.key}
                href={passageHref(input.documentExternalId, input.locator)}
                className="group grid grid-cols-[1fr_auto] gap-4 py-4"
              >
                <div>
                  <p className="text-sm font-medium group-hover:text-primary">
                    {input.documentTitle}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {input.locator} · page {input.page} · {input.effectiveDate}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(input.value)}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold">Method and boundary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calculator policy is visible and versioned.
          </p>
          <dl className="mt-5 divide-y border-y text-sm">
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Formula</dt>
              <dd className="font-mono text-xs">{model.formula}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Test Date</dt>
              <dd className="font-mono text-xs">{model.testDate}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Rounding</dt>
              <dd className="text-xs">
                Full precision comparison; half-even to two decimals for
                display.
              </dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Definition</dt>
              <dd className="text-xs">
                {definition ? (
                  <Link
                    href={passageHref(
                      definition.document_id,
                      definition.locator,
                    )}
                    className="text-primary hover:underline"
                  >
                    {definition.locator} · page {definition.page}
                  </Link>
                ) : (
                  "Source unavailable"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="border-t pt-5 text-xs leading-5 text-muted-foreground">
        Synthetic calculation only. No conclusion is made on legal compliance,
        breach, default, waiver satisfaction, transaction permission, or
        commercial judgment.
      </footer>
    </div>
  );
}
