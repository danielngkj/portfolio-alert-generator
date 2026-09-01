# Portfolio Alert Generator Decisions

## Data Quality Workflow

### 1. Deterministic cleanup over manual editing

Use automated, rule-based cleanup with a recorded dictionary of replacements and standard abbreviations. This produces auditable, reproducible results that can be validated with before/after comparisons. Manual edits are difficult to review and prone to inconsistency.

### 2. Quality detection categories

Detect four types of text issues during quality checks:
- Misspellings (typos detected by dictionary comparison)
- Abbreviations (words that should be expanded, e.g., `txn` → `transaction`)
- Double spaces (formatting errors)
- Missing final periods (incomplete sentences)

These categories are specific enough to be actionable and broad enough to catch common human-style errors in synthetic data.

### 3. Standard abbreviations dictionary

Preserve specific abbreviations that are industry standard and should not be expanded:
- Technical: ID, UI, UPS, PDU, HMI, PLC, LCD, LED, RPM, VFD, DC, AC, PSU, PCB
- Standard: N/A, S/N

This prevents over-cleaning technical content while fixing genuine typos.

### 4. Preserve markdown structure in cleanup

Preserve line breaks within multi-line text fields (Operator Response, Service Response, Technician Response). These fields use newline-based markdown lists. Processing must split on `\n`, clean line-by-line, and rejoin with newlines intact. Stripping line breaks destroys the list formatting.

### 5. Cleaned JSON as single source of truth

Use `data/alerts-ds-clean.json` as the canonical frontend dataset, not the raw generated workbook. This ensures:
- The website displays cleaned, verified content
- The PDF handbook is generated from cleaned data
- The AI chatbot queries against the same verified data

### 6. Separate source and generated workbooks

Keep `data/source/alerts-ds.xlsx` (generated dirty data) separate from `data/generated/alerts-ds-clean.xlsx` (cleaned, publication-ready). The source can be regenerated at any time. Cleaned artifacts are derived outputs and should not be committed to Git.

### 7. Automated pipeline in npm

Implement the full pipeline in npm scripts:
- `npm run generate:alerts` — Generate synthetic dirty data
- `npm run clean:alerts` — Detect quality issues and cleanup
- `npm run extract:alerts` — Convert cleaned workbook to JSON
- `npm run build` — Full pipeline: generate → clean → extract → publish → build

The `predev` hook runs the pipeline before starting the development server, so frontend and PDF always reflect the current cleaned data.

### 8. GitHub Actions for cross-repo sync

Use GitHub Actions to automatically synchronize cleaned data to the `ai-documentation-chatbot` repository. The workflow triggers on changes to:
- `data/alerts-ds-clean.json`
- Cleanup and extraction scripts

This keeps both products synchronized without manual intervention and creates an auditable commit history showing when data changed.

### 9. Quality evidence on public site

Display quality metrics on the About page to provide transparency:
- Issue counts detected (misspellings, spacing, punctuation)
- Count of text changes made by cleanup
- Example repairs (typos → corrections)

This demonstrates that quality is engineered, not accidental, and is suitable for a portfolio project.

### 10. Evaluation with saved test set

Include a recorded set of quality issues and cleanup results for documentation and regression testing. The quality report and before/after examples are saved to verify that the pipeline behaves as designed.
