# Project guidance

## Purpose

This repository builds Alert atlas, a React knowledge base for synthetic ACME
coffee machine alerts. It also contains the tools that generate the Excel alert
catalogue, extract the frontend JSON dataset, and publish the PDF handbook.

## Protected reference workbook

- Treat `data/reference/cashless_machine_alerts_DONOTDELETE.xlsx` as read-only.
- Never edit, rename, move, replace, or overwrite this file.
- Use it only as a formatting and content-structure reference.
- Keep the generator's `DONOTDELETE` overwrite guard intact.

## Data pipeline and sources of truth

The normal data flow is:

1. `scripts/generate_alerts.py` generates a dirty synthetic workbook with intentional human-style errors in `data/source/alerts-ds.xlsx`.
2. `scripts/check_language_quality.py` detects text issues and generates a quality report.
3. `scripts/clean_alert_language.py` normalizes spelling, spacing, and punctuation in `data/generated/alerts-ds-clean.xlsx`.
4. `scripts/extract_alerts.py` extracts the cleaned workbook to `data/alerts-ds-clean.json`.
5. `scripts/generate-alerts-pdf.js` generates the PDF handbook from the clean JSON.
6. `scripts/publish-alerts-workbook.js` publishes the active source workbook under the public download filename.
7. Vite builds the React site from the cleaned JSON data.

The full pipeline (generate → clean → extract → build) runs automatically on `npm run dev` and `npm run build`. Do not manually edit `data/alerts-ds-clean.json` when the change belongs in the Excel source or generator. Regenerate downstream artifacts instead. Only replace `data/source/alerts-ds.xlsx` when the task explicitly calls for updating the active source workbook.

## Standard commands

Install dependencies:

```bash
python -m pip install -r requirements.txt
npm install
```

Generate a synthetic workbook (dirty source with intentional errors):

```bash
npm run generate:alerts
```

Clean the source workbook and generate quality report:

```bash
npm run clean:alerts
```

Extract cleaned JSON for the frontend:

```bash
npm run extract:alerts
```

Run the development site (automatically generates, cleans, extracts, and rebuilds):

```bash
npm run dev
```

Build the production site and PDF (full pipeline from dirty source to clean publication):

```bash
npm run build
```

## Automatic data synchronization

A GitHub Actions workflow (`.github/workflows/sync-chatbot-data.yml`) monitors changes to cleaned alert data and automatically synchronizes the dataset to the [`ai-documentation-chatbot`](https://github.com/danielngkj/ai-documentation-chatbot) repository.

**Workflow trigger:** Pushes to `main` affecting:
- `data/alerts-ds-clean.json`
- `scripts/clean_alert_language.py`
- `scripts/extract_alerts.py`

**Workflow actions:**
1. Copies cleaned JSON to chatbot repo `data/sample-alerts.json`
2. Reindexes the Chroma vector database
3. Commits and pushes to `ai-documentation-chatbot/main`

This keeps both products synchronized with the same verified alert content. The workflow uses `git diff --cached --quiet` to avoid empty commits when no actual changes occurred.

## Taxonomy conventions

- Use `Major Group` for the four broad organizational groups.
- Use `System Area` for the normalized operational areas beneath each group.
- Do not reintroduce `Component` as the public label for this taxonomy.
- Keep the generator limited to no more than 12 System Areas unless the project
  requirements explicitly change.
- Keep System Area options dependent on the selected Major Group.

## Content conventions

- Always write `coffee machine` as two words without a hyphen, including when it
  modifies another noun.
- Keep generated Alert Titles between two and five words, inclusive.
- Keep at least 15 generated Last Update values dated across 2025 and 2026.
- Alert IDs are text identifiers even when they contain only digits.
- Keep Operator Response and Service Response guidance concise and actionable.
- Human-error generation is enabled by default. Use `--no-human-errors` only
  when clean output is explicitly requested.
- Preserve the separation between Operator, Service, and Technician responses.

## Site conventions

- Keep the shared ACME COFFEE banner and site footer consistent across the
  catalogue, alert details, Glossary, Sitemap, and not-found views.
- Preserve direct alert URLs in the form `/<alert_id>`.
- Preserve the `/glossary` and `/sitemap` routes and linkable Sitemap anchors.
- Preserve the `/about` route and its fictional-data and Codex-assistance disclosure.
- Keep the fictional-data notice visible in every site footer and PDF page.
- Preserve the robots `noindex` meta directive and the sitewide
  `public/_headers` `X-Robots-Tag` rule unless public indexing is explicitly requested.
- Preserve `vercel.json`, including its SPA fallback to `index.html` and
  sitewide `X-Robots-Tag` rule.
- Prefer compact tables and reference lists over card-heavy layouts.
- Keep Major Group navigation broad and System Area information specific.

## Accessibility requirements

- Use native links and buttons for interactive controls.
- Preserve the skip-to-content link in the shared banner.
- Move focus to the route heading after client-side navigation, but do not steal
  focus on the initial page load.
- Maintain a logical heading hierarchy with one primary `h1` per route.
- Preserve visible keyboard focus styles, accessible names, and reduced-motion
  support.
- Do not rely on color alone to communicate both alert Type and Severity.
- Check normal-sized text colors against the WCAG 4.5:1 contrast target.

## Generated and ignored files

Do not commit operating-system metadata, Office lock files, temporary files,
dependency folders, build folders, or generated PDF copies. The relevant
patterns are maintained in `.gitignore`, including:

- `.DS_Store` and `._*`
- `~$*.xlsx`
- `tmp/`, `temp/`, `*.tmp`, and `*.temp`
- `node_modules/` and `dist/`
- `data/generated/`
- `output/pdf/` and `public/downloads/*.pdf`

## Verification before handoff

Run checks proportionate to the files changed. For a full pipeline change, run:

```bash
python -m py_compile scripts/generate_alerts.py scripts/extract_alerts.py
python scripts/generate_alerts.py --output /tmp/alert-atlas-check.xlsx
python scripts/extract_alerts.py /tmp/alert-atlas-check.xlsx --output /tmp/alert-atlas-check.json
npm run build
git diff --check
```

Confirm that the generated dataset contains 75 alerts, no more than 12 System
Areas, and exactly four Major Groups unless the requested dataset requirements
have changed. Confirm that the protected reference workbook remains untouched.

## Git hygiene

- Preserve unrelated user changes in a dirty worktree.
- Do not commit generated or machine-specific files ignored by `.gitignore`.
- Review `git status` and `git diff --check` before committing.
- Use the configured SSH commit signing when commits are requested.
- Do not rewrite or discard user history without explicit authorization.
