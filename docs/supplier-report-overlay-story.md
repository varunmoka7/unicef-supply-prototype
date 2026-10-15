# Supplier report overlay trial

Status: review
Agent: Kaveh

## Story
A user selects an existing supplier claim to inspect its supporting report passage in context.
The prototype opens the complete report page above the same page.
The prototype highlights only the selected passage.

## Context
The existing UNICEF epic defines supplier intelligence with source-linked figures.
Reference: /Users/varunmoka/GTC/go-carbon-insights/_bmad-output/planning-artifacts/super-epics/SUPER-EPIC-010-job-applications/epics/unicef-sdm/epic.md.
STORY-002.5 requires sources and tiers on figures.
Reference: /Users/varunmoka/GTC/go-carbon-insights/_bmad-output/planning-artifacts/super-epics/SUPER-EPIC-010-job-applications/epics/unicef-sdm/stories/STORY-002.5-prototype.md.
This trial uses existing claims and PDFs without extraction.
The create-story and dev-story workflows inform this bounded local implementation.

## Acceptance criteria
1. The suppliers sidebar retains existing claim text, badges, and document details.
2. The prepared Bavarian Nordic 42% reduction claim opens a same-page modal.
3. The modal shows physical PDF page 63 in full with three normalized passage rectangles.
4. The modal supports zoom, close, Escape, focus containment, and focus restoration.
5. Escape closes the modal without closing the sidebar.
6. Other claims retain text expansion.
7. Other routes retain their existing behavior.
8. The compressed image preserves readable text and reports its measured size against PNG.
9. The sidebar explains existing claim counts without inventing emission calculations.
10. Raw tests and the production build pass.

## File scope
- src/App.tsx gates the trial to /suppliers.
- src/components/SourcePanel.tsx connects prepared evidence to the viewer.
- src/components/ReportViewer.tsx and ReportViewer.css implement the modal.
- src/components/SourcePanel.test.tsx tests modal behavior and evidence identity.
- src/pages/Suppliers.test.tsx tests the real supplier click path.
- buyers/unicef/data/report-evidence.json stores claim identity and normalized rectangles.
- public/report-evidence/ stores one compressed full-page image.

## Readiness assessment
PASS. SourcePanel already owns the claim cards and figure details.
All other pages share SourcePanel, so the App route gate prevents behavior changes.
The existing image libraries and test dependencies require no new package.
The local PDF exists, and exact passage search returns three matching line rectangles on page 63.
The current supplier grid contains extracted-claim counts, not calculated emission estimates.
The trial must describe that limitation.
The existing prototype styles provide direction, with STYLESEED-DESIGN-LANGUAGE.md as the project design source.

## Tasks
- [x] Render and compress the cited page.
- [x] Verify the passage and image readability.
- [x] Implement the route-gated viewer and fallback.
- [x] Test modal behavior and the supplier click path.
- [x] Run build and request independent browser review.

## Exclusions
No new PDFs enter the repository.
No source datasets, model calls, dependencies, other routes, commits, or deployments change.
Only one exact claim has a prepared highlight.

## Dev record
Kaveh rendered physical page 63 at 2268 by 1276 pixels.
The unhighlighted WebP is 314,354 bytes.
The lossless PNG was 404,835 bytes.
Compression reduced image size by 22.4%.
JPEG quality 85 at the same dimensions was 434,659 bytes.
The viewer draws three separate normalized rectangles.
A focus restoration test detected premature React autofocus.
The viewer now captures the opener before it focuses the close button.
Raw tests report: Test Files 9 passed (9).
Raw tests report: Tests 39 passed (39).
Browser modal containment and responsive checks remain with the coordinator.
No memory files changed because the file allowlist excludes those files.
Raw production build reports: built in 778ms.
The coordinator reported that Escape initially closed both the viewer and sidebar.
SourcePanel now removes its Escape listener while the report modal is open.
The focused test confirms that document Escape does not close SourcePanel during report viewing.
Independent browser verification remains pending.

## Benchmark extension: Nemotron-matched evidence

Status: planning, waiting for accepted mappings
Agent: Kaveh

### Story
A reviewer clicks any benchmark claim that Xiao individually accepted and sees the full cited report page with only the supporting passage highlighted.
Claims without an accepted mapping keep text expansion.

### Acceptance criteria
1. Only mappings that Xiao marked accepted are written to report-evidence.json.
2. Rejected and unresolved candidates have no entry and open text expansion.
3. Each physical page has one compressed image under public/report-evidence/, shared by every claim on that page.
4. Each entry stores its own normalized highlight rectangles, separate from the image.
5. Entries match on exact text, pdf and page, so no claim can borrow another claim's highlight.
6. Every image keeps readable body text at 200% zoom, checked by eye on the rendered page.
7. The viewer keeps Escape isolation, focus containment, focus restoration, loading failure message and zoom.
8. Supplier-only gating and the original Bavarian Nordic claim stay unchanged.
9. Raw tests and the build pass, and the handoff reports image bytes and coverage (accepted / 20 pages, claims).

### Readiness assessment
PASS for the viewer. report-evidence.json is already an array of per-claim entries that point at an image path, so two entries can share one image without a schema change.
SourcePanel matches by text, pdf and page and falls back to text expansion, which already covers unsupported claims.
ReportViewer already handles Escape, focus, load failure and zoom, and tests for those exist in SourcePanel.test.tsx.
Gaps to close once mappings arrive: a test that two entries share one image with different highlights, a test that an unlisted claim stays on text expansion, and an image-size check per page.

### Input contract for accepted mappings
Each accepted item needs: claim text, pdf, physical page, normalized rectangles (x, y, width, height in 0..1), and Xiao's verdict reference.
Coordinates must come from the page text blocks of the supplied PDF, not from model output.

### Exclusions
No model calls, no PDF changes, no new dependencies, no commits or deployment.

### Batch integration
Accepted batches go in through .evidence-work/integration/integrate.py with a list of page_id and claim_id.
It reuses existing page images, renders and compresses only new pages, and appends entries with the candidate's normalized rectangles.
Entries already present are skipped, so a batch can be rerun safely.
Claims not in a batch stay on text expansion.

## Full prototype expansion: every cited page

Status: readiness pass, implementing
Agent: Kaveh

### Story
A reviewer clicks any existing claim card on any route and sees the complete cited report page.
A verified passage is highlighted. When none is verified, the page opens with no highlight and a message that no matching passage was verified.

### Acceptance criteria
1. Every claim identity (text, pdf basename, physical page) in the five buyer data files resolves to an image. 2448 identities, 462 pages, 52 PDF names at the starting scan.
2. The viewer is enabled on every route that opens SourcePanel. The supplier-only route gate is removed.
3. Highlighted mappings stay in report-evidence.json. All page images, including page-only ones, are listed once per pdf and page in report-pages.json.
4. A page-only claim opens the cited page with no highlight, an "unverified passage" message, and alt text that does not say a passage is highlighted.
5. An unknown verification method never reads as source-reviewed. Only recognised review methods do. Automatic matches and anything unknown show the automatic or unverified wording.
6. The counting-method note stays on the supplier grid only. Organization and map counts are not described as supplier-grid calculations.
7. Calculated figures keep their existing source and calculation rows and have no report page.
8. Escape isolation, focus containment, focus restoration, zoom and image-load failure are unchanged.
9. No source data file changes. Duplicate PDF names resolve by hash. Conflicts stop the run.

### Readiness assessment
PASS. All five files expose evidence as objects with text, pdf and page, so one recursive walk finds every identity.
The 462 pages resolve to 52 PDFs with no missing or conflicting copies.
372 pages lack an image. 90 images already exist and are reused by pdf and page.
SourcePanel already matches a claim to prepared evidence and falls back to text expansion, so the page catalog adds a second lookup and no new component.

### Exclusions
No model calls from this role, no source data edits, no new packages, no commits or deployment.
Highlights for newly matched claims arrive from Albedo and Xiao in accepted batches through integrate.py.

## Correction: Scope table evidence

Status: authorized bug correction, implemented; raw tests (58 passed) and build pass against the real mapping file
Agent: Kaveh

### Acceptance criteria
1. A Scope concept click on Suppliers or Climate shows an "Emissions tables" section before the claim examples. Claim counts and claim citations are unchanged.
2. Tables come from buyers/unicef/data/emissions-tables.json, matched by exact supplier id and concept id, source-checked entries only. A Scope 3 total never serves a category, and one supplier never serves another.
3. A table card opens the same report viewer, labelled "Table", with the table highlights. A claim's own page is never replaced by a table, and a table is never replaced by a claim or target page.
4. With no source-checked table the section says so explicitly and offers no page.
5. Non-Scope concepts and other routes are unchanged. Escape, focus, zoom and image-load failure are unchanged.

### Readiness assessment
PASS. emissions-tables.json (Albedo) holds 122 entries across 13 of 15 suppliers; aj_vaccine_a_s and bilthoven_biologicals_bv have none and show the unavailable text. Tests use the real entries.

### Exclusions
No edits to emissions-tables.json or image assets, no model calls, no commits or deployment.
