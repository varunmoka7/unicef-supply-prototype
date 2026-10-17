# Design decisions (home page, /awwwards trial)

Scope: `/` only. Other routes keep the existing look; the site bar is unchanged. No loader, no WebGL (a checking tool does not earn them).

- Concept: every number sits on a page. A marker-yellow highlighter draws on the real PDF page, and the citation (PDF name, page) never leaves the claim.
- Signature: pinned scroll scene. Scroll progress is the single driver: page swap, highlight draw, claim text, counter and progress bar all follow it. Phones and short screens stack the chapters and draw each highlight on arrival. Reduced motion: no pin, no smooth scroll, highlights static.
- Idle: the hero cut-out breathes (slow scale on the GSK crop).
- Palette: ground #0d1519, ink #eef1ec, mute #a3b3bb, line #2a373e, marker #ffd447 (highlighter, CTA, row hover).
- Type: Bricolage Grotesque Variable (display), IBM Plex Mono (citations), Public Sans (existing, body of other routes).
- Motion verb: swipe like a highlighter, left to right. Buttons and directory rows fill from the left or bottom.
- Content: 3 claims and page images from buyers/unicef/data/report-evidence.json via `src/pages/homeData.ts`. Each is labelled model-extracted, not source-checked, with PDF and page. No new numbers.
- Link names "Open supplier intelligence" and "Open claims hypergraph" kept because an existing test asserts them.
