"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import {
  updateWorkspaceName,
  type WorkspaceNameActionState,
} from "@/app/(product)/settings/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: WorkspaceNameActionState = {
  status: "idle",
  message: "",
};

function SaveWorkspaceButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} data-testid="save-workspace-name">
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? "Saving…" : "Save workspace"}
    </Button>
  );
}

export function WorkspaceNameForm({
  defaultName,
  workspaceSlug,
}: {
  defaultName: string;
  workspaceSlug: string;
}) {
  const [state, formAction] = useActionState(
    updateWorkspaceName,
    initialState,
  );

  return (
    <Card className="max-w-3xl">
      <form action={formAction}>
        <CardHeader>
          <CardTitle className="text-base">Workspace identity</CardTitle>
          <CardDescription>
            This mutation writes to the server-side database and creates an
            audit event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.status !== "idle" ? (
            <Alert
              variant={state.status === "error" ? "destructive" : "default"}
              aria-live="polite"
              data-testid="workspace-name-status"
            >
              {state.status === "success" ? (
                <CheckCircle2 className="size-4" />
              ) : null}
              <AlertTitle>
                {state.status === "success" ? "Saved" : "Not saved"}
              </AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Display name</Label>
            <Input
              id="workspaceName"
              name="workspaceName"
              minLength={3}
              maxLength={80}
              defaultValue={defaultName}
              required
              data-testid="workspace-name-input"
            />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            workspace/{workspaceSlug}
          </p>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <SaveWorkspaceButton />
        </CardFooter>
      </form>
    </Card>
  );
}
