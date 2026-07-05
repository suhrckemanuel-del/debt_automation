import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentNotFound() {
  return (
    <Card className="mx-auto mt-16 max-w-md">
      <CardContent className="flex flex-col items-start gap-3 p-6">
        <FileQuestion className="size-5 text-muted-foreground" />
        <h1 className="text-base font-semibold">Document not found</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          No persisted synthetic document matches this address in the active
          workspace. The document may have been referenced with an invalid or
          outdated identifier.
        </p>
        <Link
          href="/documents"
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to all documents
        </Link>
      </CardContent>
    </Card>
  );
}
