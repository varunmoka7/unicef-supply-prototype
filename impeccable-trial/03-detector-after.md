# Detector after

`impeccable detect --json src` on the redesigned branch after a passing `npm run build`. Exit 0, empty array: no findings.

```json
[]
```

Findings before: 1 (overused-font, Arial in styles.css:89, inside the old map SVG rule). After: 0. The old Arial rule is gone; every face is Public Sans (self-hosted via @fontsource-variable/public-sans) with a Helvetica/system fallback. Nothing remains, so there is nothing to justify.

Detector limits: it reads source patterns, not renders. Visual issues it cannot see are in REPORT.md under what is left.
