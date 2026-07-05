import Link from "next/link";
import { AlertCircle, Braces, Scale } from "lucide-react";
import { AnswerPanel } from "@/components/answer-panel";
import { AskForm } from "@/components/ask-form";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSyntheticDashboard } from "@/lib/dashboard";
import { ENGINE_CONTRACT_VERSION } from "@/lib/engine-contract";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";

export const metadata = { title: "Ask" };

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ answer?: string; q?: string; asOf?: string }>;
}) {
  const snapshot = getSyntheticDashboard();
  const persistence = getPersistence();
  const recentAnswers = persistence.listAnswers(
    localSyntheticActor,
    localSyntheticWorkspaceId,
    6,
  );
  const params = await searchParams;
  const requestedId = params.answer;
  const selectedAnswer = requestedId
    ? persistence.getAnswer(
        localSyntheticActor,
        localSyntheticWorkspaceId,
        requestedId,
      )
    : params.q
      ? null
      : (recentAnswers[0] ?? null);

  return (
    <>
      <PageHeader
        title="Ask the agreement set"
        description="Questions cross the typed HTTP boundary to the existing deterministic Python engine, then answers and exact citations are persisted against the active manifest."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">New question</CardTitle>
                  <CardDescription className="mt-1">
                    Evidence-backed extraction only.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 font-mono text-[10px]"
                >
                  <Braces className="size-3 text-primary" />
                  engine API v{ENGINE_CONTRACT_VERSION}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AskForm
                defaultAsOf={
                  selectedAnswer?.as_of_date ??
                  params.asOf ??
                  snapshot.workspace.defaultAsOfDate
                }
                initialQuestion={selectedAnswer?.question ?? params.q?.slice(0, 400)}
              />
            </CardContent>
          </Card>
          {selectedAnswer ? (
            <AnswerPanel answer={selectedAnswer} />
          ) : (
            <Card>
              <CardContent className="flex min-h-44 items-center justify-center p-8 text-center">
                <div>
                  <p className="text-sm font-medium">No saved answers yet</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ask one of the synthetic workflow questions to create the
                    first manifest-linked evidence record.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Source support is mandatory</AlertTitle>
            <AlertDescription>
              Unsupported questions return “Source not found.” Missing fields
              are flagged rather than inferred.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="size-4 text-primary" />
                Human boundary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Retrieval and extraction may be automated. Legal interpretation
              and commercial judgment remain with qualified human reviewers.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent answers</CardTitle>
              <CardDescription>
                Persisted server-side · newest first
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAnswers.length > 0 ? (
                recentAnswers.map((answer) => (
                  <Link
                    key={answer.id}
                    href={`/ask?answer=${answer.id}`}
                    className="block rounded-md border p-3 transition-colors hover:bg-muted/40"
                  >
                    <p className="line-clamp-2 text-xs font-medium">
                      {answer.question}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
                      <span>{answer.support_status.replaceAll("_", " ")}</span>
                      <span>{answer.sources.length} cites</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No answer history.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
