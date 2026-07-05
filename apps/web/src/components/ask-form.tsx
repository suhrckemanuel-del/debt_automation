"use client";

import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  askAgreementQuestion,
  type AskActionState,
} from "@/app/(product)/ask/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: AskActionState = { error: null };

const examples = [
  "What is the current maximum LTV, considering amendments or waivers?",
  "Does the facility require a debt yield covenant?",
  "Can the borrower sell part of the asset and distribute the proceeds?",
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="ask-submit">
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <ArrowRight className="size-4" />
      )}
      {pending ? "Checking sources…" : "Ask engine"}
    </Button>
  );
}

export function AskForm({
  defaultAsOf,
  initialQuestion = examples[0],
}: {
  defaultAsOf: string;
  initialQuestion?: string;
}) {
  const [state, formAction] = useActionState(
    askAgreementQuestion,
    initialState,
  );
  const [question, setQuestion] = useState<string>(initialQuestion);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <Alert variant="destructive" data-testid="ask-error">
          <AlertTitle>Answer not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea
          id="question"
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          required
          maxLength={4000}
          className="mt-2 min-h-32 resize-y"
          data-testid="ask-question"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="asOf">As-of date</Label>
          <Input
            id="asOf"
            name="asOf"
            type="date"
            required
            defaultValue={defaultAsOf}
            className="mt-2 font-mono"
          />
        </div>
        <div>
          <Label htmlFor="testDate">
            Test date <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="testDate"
            name="testDate"
            type="date"
            className="mt-2 font-mono"
          />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Synthetic examples
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example, index) => (
            <Button
              key={example}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setQuestion(example)}
              aria-label={`Use synthetic example ${index + 1}: ${example}`}
              className="h-auto whitespace-normal text-left text-xs"
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-5">
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          The response is saved only after every citation matches a persisted
          document, locator, page, and exact passage.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
