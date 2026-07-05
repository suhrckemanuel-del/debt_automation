import Link from "next/link";
import { ArrowRight, FileLock2 } from "lucide-react";
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
import { documentDetailPath } from "@/lib/evidence-links";
import { getSyntheticDashboard } from "@/lib/dashboard";

export const metadata = { title: "Documents" };

export default function DocumentsPage() {
  const snapshot = getSyntheticDashboard();
  return (
    <>
      <PageHeader
        title="Documents"
        description="Tracked synthetic document metadata for the active agreement set. Open a document to inspect every persisted passage behind its citations."
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
                <TableHead className="text-right">Passages</TableHead>
                <TableHead className="pr-6 text-right">
                  <span className="sr-only">Evidence</span>
                </TableHead>
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
                    <Link
                      href={documentDetailPath(document.externalId)}
                      className="hover:text-primary hover:underline"
                    >
                      {document.title}
                    </Link>
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
                  <TableCell className="text-right font-mono">
                    {document.passageCount}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={documentDetailPath(document.externalId)}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
                      aria-label={`View evidence for ${document.title}`}
                    >
                      View evidence
                      <ArrowRight className="size-3" />
                    </Link>
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
