import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileLock2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PassageFocus } from "@/components/passage-focus";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  documentDetailPath,
  isValidExternalDocumentId,
  passageAnchorId,
} from "@/lib/evidence-links";
import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";
import type { DocumentDetail } from "@/lib/persistence/types";

const relationshipLabels = {
  modifies: "Modifies",
  modified_by: "Modified by",
  related: "Related",
} as const;

function loadDocument(documentId: string): DocumentDetail | null {
  if (!isValidExternalDocumentId(documentId)) {
    return null;
  }
  return getPersistence().getDocumentDetail(
    localSyntheticActor,
    localSyntheticWorkspaceId,
    documentId,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = loadDocument(documentId);
  return { title: document ? document.title : "Document not found" };
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = loadDocument(documentId);
  if (!document) {
    notFound();
  }

  const facts: Array<[string, React.ReactNode]> = [
    [
      "Document ID",
      <span key="id" className="font-mono">{document.externalId}</span>,
    ],
    [
      "Role",
      <span key="role" className="capitalize">
        {document.documentType.replaceAll("_", " ")}
      </span>,
    ],
    [
      "Status",
      <span key="status" className="capitalize">{document.currentStatus}</span>,
    ],
    [
      "Effective date",
      <span key="eff" className="font-mono">{document.effectiveDate}</span>,
    ],
    [
      "Execution date",
      <span key="exe" className="font-mono">{document.executionDate}</span>,
    ],
    [
      "Passages",
      <span key="cnt" className="font-mono">{document.passageCount}</span>,
    ],
  ];

  return (
    <>
      <PassageFocus />
      <div className="mb-5">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All documents
        </Link>
      </div>
      <PageHeader
        eyebrow="Synthetic evidence record"
        title={document.title}
        description="Persisted metadata and exact passages for this tracked synthetic document. This is the evidence store behind citations, not a legal-document viewer."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Card>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm">{value}</p>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-muted-foreground">Storage boundary</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
                  <FileLock2 className="size-3.5 text-primary" />
                  {document.storageKey
                    ? "Private object storage"
                    : "Tracked synthetic source"}
                  <span className="font-mono text-xs text-muted-foreground">
                    {document.storageKey ?? document.sourcePath}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <section aria-label="Persisted passages" className="mt-8">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Persisted passages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Exact stored text used for citation validation. Each passage
                  has a stable link.
                </p>
              </div>
            </div>
            <div className="mt-5 divide-y border-y">
              {document.passages.map((passage) => {
                const anchor = passageAnchorId(
                  document.externalId,
                  passage.locator,
                );
                return (
                  <article
                    key={passage.id}
                    id={anchor}
                    tabIndex={-1}
                    className="scroll-mt-24 py-5 outline-none target:bg-primary/5 focus-visible:bg-primary/5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-medium">
                        {passage.heading || passage.locator}
                      </h3>
                      <a
                        href={`#${anchor}`}
                        className="font-mono text-[11px] text-primary hover:underline"
                        aria-label={`Link to ${passage.locator}`}
                      >
                        {passage.locator} · page {passage.page}
                      </a>
                    </div>
                    <blockquote className="mt-3 whitespace-pre-line border-l pl-4 text-sm leading-6 text-muted-foreground">
                      {passage.text}
                    </blockquote>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside aria-label="Document relationships" className="min-w-0">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">Document relationships</h2>
              {document.relatedDocuments.length ? (
                <ul className="mt-4 space-y-3">
                  {document.relatedDocuments.map((reference) => (
                    <li key={reference.externalId}>
                      <Badge variant="outline" className="text-[10px]">
                        {relationshipLabels[reference.relationship]}
                      </Badge>
                      <Link
                        href={documentDetailPath(reference.externalId)}
                        className="mt-1.5 block text-sm hover:text-primary hover:underline"
                      >
                        {reference.title}
                      </Link>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {reference.documentType.replaceAll("_", " ")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No relationships are declared in the active manifest.
                </p>
              )}
              <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
                Relationships come from the persisted active manifest snapshot,
                not from re-reading source files at request time.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
