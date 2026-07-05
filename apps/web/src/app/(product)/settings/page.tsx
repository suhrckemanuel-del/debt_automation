import { Database, HardDrive, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { WorkspaceNameForm } from "@/components/workspace-name-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSyntheticDashboard } from "@/lib/dashboard";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  const snapshot = getSyntheticDashboard();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Local synthetic configuration now; organization authentication and private Storage are represented in the hosted schema but are not deployed."
      />
      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="persistence">Persistence</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4">
          <WorkspaceNameForm
            defaultName={snapshot.workspace.name}
            workspaceSlug={snapshot.workspace.slug}
          />
        </TabsContent>
        <TabsContent value="persistence" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-primary" />
                Explicit local adapter
              </CardTitle>
              <CardDescription>
                SQLite is the durable local source of truth for the synthetic
                milestone. The app refuses to select it implicitly.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <HardDrive className="mb-3 size-4 text-primary" />
                <p className="text-sm font-medium">Application data</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Server-side SQLite; survives refresh and process restart.
                </p>
              </div>
              <div className="rounded-md border p-4">
                <ShieldCheck className="mb-3 size-4 text-primary" />
                <p className="text-sm font-medium">Hosted target</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Postgres + Auth + private Storage with membership RLS.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="text-base">Current guardrails</CardTitle>
              <CardDescription>
                This milestone contains synthetic data only.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                "No LLM integration",
                "No cloud deployment",
                "No real agreements",
                "No browser storage",
                "Private object keys designed",
              ].map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
