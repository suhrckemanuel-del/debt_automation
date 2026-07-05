import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPersistence, localSyntheticActor } from "@/lib/persistence";

export const metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  const workspaces = getPersistence().listWorkspaces(localSyntheticActor);
  return (
    <>
      <PageHeader
        title="Workspaces"
        description="Organization-scoped agreement sets with independent document, mapping, answer, and audit histories."
        action={
          <Badge variant="outline">
            {workspaces.length} local synthetic workspace
            {workspaces.length === 1 ? "" : "s"}
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {workspaces.map((workspace) => (
          <Card key={workspace.id}>
            <CardHeader>
              <CardTitle className="text-base">{workspace.name}</CardTitle>
              <CardDescription className="mt-1">
                {workspace.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="size-3 text-primary" />
                  {workspace.mappingStatus}
                </Badge>
                <Badge variant="secondary">
                  {workspace.documentCount} documents
                </Badge>
                <Badge variant="secondary">
                  manifest v{workspace.activeManifestVersion}
                </Badge>
              </div>
              <p className="mt-5 font-mono text-[11px] text-muted-foreground">
                {workspace.slug} · updated {workspace.updatedAt.slice(0, 10)}
              </p>
            </CardContent>
            <CardFooter className="justify-end border-t pt-5">
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Open decision view
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
