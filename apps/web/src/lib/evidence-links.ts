const EXTERNAL_DOCUMENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function isValidExternalDocumentId(value: string): boolean {
  return EXTERNAL_DOCUMENT_ID_PATTERN.test(value);
}

function slugifyLocator(locator: string): string {
  return locator
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function passageAnchorId(
  documentExternalId: string,
  locator: string,
): string {
  return `${documentExternalId}:${slugifyLocator(locator)}`;
}

export function documentDetailPath(documentExternalId: string): string {
  return `/documents/${encodeURIComponent(documentExternalId)}`;
}

export function passageHref(
  documentExternalId: string,
  locator: string,
): string {
  // A colon is a legal raw character in a URI fragment; the anchor must
  // match the rendered element id byte-for-byte.
  return `${documentDetailPath(documentExternalId)}#${passageAnchorId(
    documentExternalId,
    locator,
  )}`;
}
