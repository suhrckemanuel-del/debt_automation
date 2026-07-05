import { cn } from "@/lib/utils";
import type { DecisionSurface } from "@/lib/decision-surface";

const markerStyles = {
  original: "border-muted-foreground bg-background",
  amendment: "border-primary bg-primary",
  waiver: "border-amber-400 bg-amber-400",
  condition: "border-amber-400 bg-background",
} as const;

export function ContractPositionTimeline({
  timeline,
}: {
  timeline: DecisionSurface["timeline"];
}) {
  return (
    <section
      id="position-timeline"
      aria-labelledby="position-timeline-title"
      className="scroll-mt-24 border-t pt-6"
    >
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h2 id="position-timeline-title" className="text-base font-semibold">
            Contractual position over time
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Original terms, amendments, and limited waivers remain distinct.
          </p>
        </div>
        <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            modifying term
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400" />
            limited condition
          </span>
        </div>
      </div>

      <ol className="relative hidden grid-cols-4 gap-5 md:grid">
        <span
          aria-hidden="true"
          className="absolute left-1 right-1 top-[5px] h-px bg-border"
        />
        {timeline.map((event) => (
          <li key={`${event.date}-${event.label}`} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 block size-3 rounded-full border-2",
                markerStyles[event.state],
              )}
            />
            <p className="mt-4 font-mono text-xs tabular-nums text-muted-foreground">
              {event.date}
            </p>
            <p className="mt-1 text-sm font-medium">{event.label}</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
              {event.detail}
            </p>
          </li>
        ))}
      </ol>

      <ol className="space-y-0 md:hidden">
        {timeline.map((event, index) => (
          <li
            key={`${event.date}-${event.label}`}
            className="relative grid grid-cols-[1rem_1fr] gap-3 pb-6 last:pb-0"
          >
            {index < timeline.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-[5px] top-3 w-px bg-border"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-1 block size-3 rounded-full border-2",
                markerStyles[event.state],
              )}
            />
            <div>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {event.date}
              </p>
              <p className="mt-1 text-sm font-medium">{event.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {event.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
