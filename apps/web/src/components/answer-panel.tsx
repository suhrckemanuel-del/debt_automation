import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  Scale,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PersistedAnswer } from "@/lib/persistence/types";

const statusLabels = {
  supported: "Supported",
  partially_supported: "Partial support",
  source_not_found: "Source not found",
  legal_review_required: "Legal review required",
} as const;

export function AnswerPanel({ answer }: { answer: PersistedAnswer }) {
  return (
    <div className="space-y-4" data-testid="persisted-answer">
      {answer.support_status === "source_not_found" ? (
        <Alert>
          <FileSearch className="size-4" />
          <AlertTitle>Source not found</AlertTitle>
          <AlertDescription>
            The deterministic engine found no directly supporting passage and
            abstained instead of guessing.
          </AlertDescription>
        </Alert>
      ) : null}
      {answer.human_review_required ? (
        <Alert variant="destructive">
          <Scale className="size-4" />
          <AlertTitle>Human review required</AlertTitle>
          <AlertDescription>{answer.review_note}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Persisted answer</CardTitle>
              <CardDescription className="mt-1 font-mono text-[11px]">
                as of {answer.as_of_date} · manifest v
                {answer.manifestVersion ?? "—"}
              </CardDescription>
            </div>
            <Badge
              variant={
                answer.support_status === "supported" ? "default" : "outline"
              }
              data-testid="answer-status"
            >
              {statusLabels[answer.support_status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Question
            </p>
            <p className="mt-2 text-sm">{answer.question}</p>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Answer
            </p>
            <p className="mt-2 text-sm leading-7">{answer.short_answer}</p>
          </div>
          {answer.notes_on_currentness ? (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-medium text-primary">Currentness</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {answer.notes_on_currentness}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {answer.sources.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-primary" />
              Exact source evidence
            </CardTitle>
            <CardDescription>
              {answer.sources.length} persisted citation
              {answer.sources.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {answer.sources.map((citation) => (
              <figure
                key={citation.id}
                className="rounded-lg border bg-muted/15 p-4"
              >
                <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {citation.document_title}
                  </span>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {citation.locator} · page {citation.page}
                  </Badge>
                </figcaption>
                <blockquote className="border-l-2 border-primary/50 pl-3 text-xs leading-6 text-muted-foreground">
                  {citation.supporting_passage}
                </blockquote>
              </figure>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {answer.missing_information.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-4 text-primary" />
              Missing information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {answer.missing_information.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
