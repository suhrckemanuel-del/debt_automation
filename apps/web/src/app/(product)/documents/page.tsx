import { FileLock2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSyntheticDashboard } from "@/lib/dashboard";

export const metadata = { title: "Documents" };

export default function DocumentsPage() {
  const snapshot = getSyntheticDashboard();
  return (
    <>
      <PageHeader
        title="Documents"
        description="Tracked synthetic document metadata for the active agreement set. Exact passages appear with each decision and saved answer so reviewers can verify the cited source in context."
      />
      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Document role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective date</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead className="pr-6 text-right">Passages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.documents.map((document) => (
                <TableRow
                  key={document.id}
                  id={document.externalId}
                  className="scroll-mt-24 target:bg-primary/5"
                >
                  <TableCell className="pl-6 font-medium">
                    {document.title}
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                      {document.externalId}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">
                    {document.documentType.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{document.currentStatus}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {document.effectiveDate}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileLock2 className="size-3.5 text-primary" />
                      {document.storageKey ? "private object" : "tracked synthetic"}
                    </span>
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
    </>
  );
}
