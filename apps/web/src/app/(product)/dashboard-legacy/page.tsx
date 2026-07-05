import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Network,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSyntheticDashboard } from "@/lib/dashboard";

export const metadata = { title: "Dashboard · Previous design" };

export default function DashboardPage() {
  const snapshot = getSyntheticDashboard();
  const { workspace } = snapshot;
  const mappedPercent =
    snapshot.totalSlots === 0
      ? 0
      : Math.round((snapshot.reviewedSlots / snapshot.totalSlots) * 100);
  const stats = [
    {
      label: "Documents",
      value: workspace.documentCount,
      detail: `${workspace.passageCount} indexed passages`,
      icon: FileText,
    },
    {
      label: "Provision map",
      value: `${mappedPercent}%`,
      detail: `${snapshot.reviewedSlots} of ${snapshot.totalSlots} slots reviewed`,
      icon: Network,
    },
    {
      label: "Saved answers",
      value: snapshot.answerCount,
      detail: `${snapshot.citationCount} exact citations`,
      icon: MessageSquareText,
    },
    {
      label: "Active manifest",
      value: `v${workspace.activeManifestVersion ?? "—"}`,
      detail: "Immutable, source-reviewed snapshot",
      icon: ShieldCheck,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Synthetic workspace"
        title={workspace.name}
        description={`Current position as of ${workspace.defaultAsOfDate}. All data on this screen is persisted server-side and limited to the tracked synthetic demo.`}
        action={
          <Button asChild>
            <Link href="/ask">
              Ask a question
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <section
        aria-label="Workspace summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-semibold tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Agreement set</CardTitle>
              <CardDescription className="mt-1">
                Original terms, amendments, and limited waivers stay distinct.
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <CheckCircle2 className="size-3 text-primary" />
              source valid
            </Badge>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Document</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="pr-6 text-right">Passages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="max-w-72 pl-6 font-medium">
                      <span className="block truncate">{document.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {document.documentType.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {document.effectiveDate}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-mono">
                      {document.passageCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trust boundary</CardTitle>
            <CardDescription>
              What this local foundation will and will not do.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Automated", "Parsing, retrieval, hierarchy, structured evidence"],
              ["Human-owned", "Legal interpretation and commercial judgment"],
              ["Abstention", "Missing support becomes an explicit flag"],
            ].map(([label, copy]) => (
              <div key={label} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {copy}
                  </p>
                </div>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link href="/provision-map">Review provision map</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
