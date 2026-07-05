# Friend Pilot Guide

## What this pilot does

The application runs locally on a Windows computer. It can:

- load a synthetic demo workspace;
- create separate local workspaces;
- import PDF, Markdown, and text documents;
- preserve PDF page boundaries;
- search imported documents for candidate evidence;
- produce full structured answers only after provisions and current-document relationships are reviewed and mapped;
- cite exact passages; and
- abstain or require human review where appropriate.

It does not upload documents to a cloud service or call an external AI API.

## 1. Safety and permission

Before using non-synthetic documents:

- confirm the friend has permission to use the documents locally;
- use a computer and folder appropriate for the documents' confidentiality;
- do not place documents in a synced or shared folder unless that is permitted;
- do not use this prototype for final legal conclusions; and
- start with copies, not the only originals.

The local pilot workspace is excluded from Git by default, but that is not a substitute for proper device and folder security.

## 2. Install

1. Install Python 3.11 or newer.
2. Double-click `setup.bat`.
3. Confirm the 13-case synthetic benchmark passes.

Setup installs the local package and PDF extraction dependency.

## 3. Launch

Double-click `start_app.bat`.

The browser opens:

`http://127.0.0.1:8765`

The server listens on the local computer only by default.

## 4. Test the demo

Keep **Synthetic Facility A** selected and try:

1. `What is the current maximum LTV, considering amendments or waivers?`
2. `Are distributions restricted, and where are Permitted Distributions defined?`
3. `Can the borrower sell part of the asset and distribute the proceeds?`
4. `Does the facility require a debt yield covenant?`

Confirm the first two answers contain sources, the third requires legal review, and the fourth returns `Source not found.`

## 5. Create a pilot workspace

Open **Manage local workspaces** in the browser.

Create an ID such as:

`friend-pilot`

Use a generic display name if document names or entities are sensitive.

## 6. Import documents

Select the pilot workspace, then import one file at a time.

Required metadata:

- document title;
- document type; and
- effective date.

PDF extraction preserves page numbers. A scanned PDF without embedded text displays:

`[No extractable text on this page]`

OCR is not included. Do not rely on an empty extraction.

## 7. Evidence-search mode

New workspaces start in **evidence search only**.

The system may return candidate passages, but it will not state a contractual conclusion. This is intentional: document ingestion has not yet established which provision is current or how an amendment or waiver changes it.

## 8. Configure reviewed provisions

This step should be completed by Manuel or another accountable reviewer.

In **Manage local workspaces**, choose **Open guided mapper**. Complete all five
steps:

1. assign the facility, amendment, and waiver roles and confirm their relationships;
2. select and confirm the original LTV, amendment, and waiver passages;
3. select and confirm the Distribution restriction, definition, and temporary prohibition;
4. select and confirm the Disposal restriction, definition, and mandatory-prepayment passage; and
5. review all nine provisions, validate, and activate.

The mapper ranks up to five passages per slot using local deterministic retrieval.
That ranking is only a suggestion. Select the source, trim the quotation to the
exact supporting text, and confirm every value and date yourself. Draft progress
is saved inside the local, Git-ignored workspace.

Activation is blocked if a quote is not an exact excerpt, required metadata is
missing, or amendment and waiver periods are inconsistent. A failed activation
does not replace the last valid manifest.

For advanced use, the JSON workflow remains available:

```powershell
python app.py workspace template friend-pilot workspaces/friend-pilot/mapping.json
python app.py workspace map friend-pilot workspaces/friend-pilot/mapping.json
python app.py workspace validate friend-pilot
```

The completed JSON can also be uploaded under **Advanced JSON fallback**.

## 9. Pilot discipline

For each answer:

1. verify the cited document, page, locator, and passage;
2. check the as-of and Test Date;
3. review missing information;
4. obtain legal or senior-finance review where flagged; and
5. record material corrections.

Do not treat a green “Supported” label as professional sign-off.

## 10. Stop the application

Return to the terminal window and press `Ctrl+C`.

No external service continues running.

## Known limits

- No OCR for scanned PDFs
- No Word document ingestion
- No authentication or multi-user permissions
- No automatic legal interpretation
- No automatic or generic covenant mapping; candidate passages still require human selection and confirmation
- No guarantee that PDF reading order matches visually complex documents
- Three fully synthesized question families in the mapped demo
