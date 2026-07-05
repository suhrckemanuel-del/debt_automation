import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  DecisionDate,
  DecisionSurfaceResult,
} from "@/lib/decision-surface";

type UnavailableResult = Exclude<
  DecisionSurfaceResult,
  { kind: "ready" }
>;

export function DecisionUnavailable({
  asOf,
  result,
}: {
  asOf: DecisionDate;
  result: UnavailableResult;
}) {
  return (
    <section
      aria-labelledby="decision-status"
      className="grid border-y lg:grid-cols-[0.9fr_1.35fr_1fr]"
    >
      <div className="py-6 lg:pr-8">
        <p className="text-sm text-muted-foreground">Current status</p>
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
            <CircleAlert className="size-4" />
          </span>
          <div>
            <h2
              id="decision-status"
              className="text-xl font-semibold leading-tight"
            >
              {result.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No inferred or browser-stored fallback is being shown.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t py-6 lg:border-l lg:border-t-0 lg:px-8">
        <p className="text-sm text-muted-foreground">What changed</p>
        <p className="mt-3 text-sm font-medium">
          Authoritative resolution did not complete
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {result.detail}
        </p>
        {result.missingInformation.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
            {result.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t py-6 lg:border-l lg:border-t-0 lg:pl-8">
        <p className="text-sm text-muted-foreground">Why it matters</p>
        <p className="mt-3 text-sm leading-6">
          A contractual status without resolved hierarchy and validated evidence
          could be misleading.
        </p>
        <div className="mt-6 border-l-2 border-primary pl-4">
          <p className="text-sm font-semibold">Recommended next action</p>
          <p className="mt-1 text-sm">
            {result.kind === "unavailable"
              ? "Start the local engine, then retry"
              : "Complete and activate the missing provision mappings"}
          </p>
          {result.kind === "unavailable" ? (
            <code className="mt-2 block text-xs text-muted-foreground">
              python app.py api --port 8765
            </code>
          ) : null}
          <Button asChild size="sm" className="mt-4">
            <Link href={`/dashboard?asOf=${asOf}`}>
              Retry decision check
              <RefreshCw className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
