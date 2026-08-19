# ACME Alert Atlas

ACME Alert Atlas is a searchable React knowledge base for cashless coffee
machine alerts. The repository also includes Python tools for extracting the
frontend JSON dataset and generating a synthetic Excel alert workbook.

## Contents

- `data/source/alerts-ds.xlsx` is the source alert workbook
- `data/alerts-ds.json` is the frontend data source
- `data/reference/` contains the protected reference workbook
- `scripts/extract_alerts.py` converts the source workbook to JSON
- `scripts/generate_alerts.py` creates a synthetic workbook programmatically
- `src/` contains the React interface and CSS

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- npm

Install the Python dependency:

```bash
python -m pip install -r requirements.txt
```

## Alert dataset

The generated sheet includes 75 synthetic alerts across:

- Informational
- Warning
- Critical

Severity values are assigned as follows:

- Informational alerts: Sev5
- Warning alerts: Sev3, Sev4
- Critical alerts: Sev1, Sev2

Each row includes:

- ID
- Alert Title
- Type
- Severity
- Alert Description
- Component
- Operator Response
- Model
- Last Update
- Version
- Notes
- Critical Stop Response
- Service Response
- Technician Response

The workbook also includes filtering, a frozen header row, wrapped content, and
column sizing based on the reference alert catalogue.

## Regenerate the workbook

Run:

```bash
python scripts/generate_alerts.py
```

This creates or updates `data/generated/alerts-ds-generated.xlsx`. The filename
mirrors the source workbook, `data/source/alerts-ds.xlsx`, while making it clear
that the workbook was generated.

To write to a different file:

```bash
python scripts/generate_alerts.py --output path/to/alerts.xlsx
```

The generator refuses to overwrite files whose names contain `DONOTDELETE`.

## Extract the frontend data

Regenerate `data/alerts-ds.json` from `data/source/alerts-ds.xlsx`:

```bash
python scripts/extract_alerts.py
```

The JSON includes metadata with its UTC generation timestamp, source workbook
timestamp, schema version, and record count. ACME Alert Atlas displays the
generation timestamp in its header so the active data version is visible.

You can also provide custom paths:

```bash
python scripts/extract_alerts.py path/to/input.xlsx --output path/to/output.json
```

## Browse ACME Alert Atlas

The React interface reads `data/alerts-ds.json` directly and provides:

- A compact, clickable alert table
- Exact Alert ID search for numeric queries
- Text search that excludes the Last Update field
- Type, severity, component, and individual model filters
- Severity, last-updated, and title sorting
- Dedicated alert pages at `/<alert_id>`
- Visible JSON generation timestamp and record counts

### Preview during development

Install Node.js and npm, then install the project dependencies. You normally
only need to run the install command after cloning the project or when
`package.json` changes:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite prints the local address in the terminal, normally:

```text
http://localhost:5173/
```

Open that address in a browser. Keep the terminal process running while making
changes. Updates to `src/main.jsx`, `src/styles.css`, or `data/alerts-ds.json` are
automatically reflected in the browser. Press `Ctrl+C` in the terminal to stop
the development server.

If port 5173 is already occupied, Vite selects another port; use the address it
prints rather than assuming the default.

### Preview the production build

Create the optimized static site in `dist/` and preview it locally:

```bash
npm run build
npm run preview
```

The production preview normally opens at `http://localhost:4173/`. This preview
command is for local checking, not for operating a public production server.

When deploying to a static host, configure unknown paths to serve `index.html`
so direct alert URLs such as `/9` load correctly. This is commonly called an
SPA fallback or rewrite rule.

## Notes

The alert data is synthetic and intended for demonstration, portfolio, or testing purposes rather than live equipment monitoring data.
