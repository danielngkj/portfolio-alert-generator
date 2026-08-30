# Alert atlas

Alert atlas is a searchable React knowledge base for a fictional industrial coffee
machine. The repository also includes Python tools for extracting the
frontend JSON dataset and generating a synthetic Excel alert workbook.

## Contents

- `data/source/alerts-ds.xlsx` is the source alert workbook
- `data/alerts-ds.json` is the frontend data source
- `data/reference/` contains the protected reference workbook
- `scripts/extract_alerts.py` converts the source workbook to JSON
- `scripts/generate_alerts.py` creates a synthetic workbook programmatically
- `scripts/generate-alerts-pdf.js` creates the downloadable alert handbook
- `scripts/publish-alerts-workbook.js` copies the active workbook to the public download path
- `src/` contains the React interface and CSS

The active source workbook is `data/source/alerts-ds.xlsx`. During the build,
it is published as `/downloads/alert-atlas-catalog.xlsx` for visitors.

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
- System Area
- Major Group
- Operator Response
- Model
- Last Update
- Version
- Notes
- Critical Stop Response
- Service Response
- Technician Response

The workbook also includes filtering, a frozen header row, wrapped content, and
column sizing based on the reference alert catalogue. Operator and service
responses are formatted as practical bullet lists with contextual verification,
logging, escalation, and return-to-service checks.

Generated alert titles contain between two and five words. The deterministic
Last Update schedule includes at least 15 records dated across 2025 and 2026.

System areas are normalized to no more than 12 reusable values and organized
under four major groups:

- Control & Interface
- Beverage Systems
- Supply & Payment
- Operations & Safety

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

### Control intentional human errors

By default, generation adds occasional configured misspellings to Alert
Description, Operator Response, Service Response, and Technician Response.
Punctuation errors are limited to the three response columns. Generate a clean
workbook explicitly with:

```bash
python scripts/generate_alerts.py --no-human-errors
```

The mode can omit some final full stops, insert double spaces after full stops,
and introduce configured misspellings such as `maintenece`, `hopr`, `txn`,
`prntr`, `ppr`, and `maschine`. All other workbook columns remain unchanged.

Control how frequently errors are considered and reproduce a particular
result with:

```bash
python scripts/generate_alerts.py \
  --human-error-rate 0.25 \
  --human-error-seed 21
```

The error rate must be between `0.0` and `1.0`. Using the same rate and seed
produces the same intentional errors each time.

## Extract the frontend data

Regenerate `data/alerts-ds.json` from `data/source/alerts-ds.xlsx`:

```bash
python scripts/extract_alerts.py
```

The JSON includes metadata with its UTC generation timestamp, source workbook
timestamp, schema version, and record count. Alert atlas displays the
generation timestamp in the shared site footer so the active data version is
visible on every page.

You can also provide custom paths:

```bash
python scripts/extract_alerts.py path/to/input.xlsx --output path/to/output.json
```

## Browse Alert atlas

The React interface reads `data/alerts-ds.json` directly and provides:

- A compact, clickable alert table with Alert, Status, and System Area columns
- Exact Alert ID search for numeric queries
- Text search that excludes the Last Update field
- Major-group tabs plus dependent system-area, type, severity, and individual model filters
- A sitemap at `/sitemap`, subdivided into linkable major groups and system-area alert lists
- An About page at `/about` describing the fictional portfolio context and development approach
- About-page links for downloading the active Excel catalogue and viewing the GitHub source
- Shared site navigation and data-version footer across catalogue and reference pages
- Taxonomy breadcrumbs that return to a pre-filtered catalogue
- Clickable table headers for ascending and descending column sorting
- Hero link to six recently updated alerts beneath the results table
- Dedicated alert pages at `/<alert_id>`
- An alphabetized glossary at `/glossary` with directly linkable term anchors
- Severity tooltips that reuse the glossary definition
- Copy-link and print actions on individual alert pages
- A compact PDF alert handbook generated from the same JSON data
- Visible JSON generation timestamp and record counts
- Keyboard focus management between SPA routes and a skip-to-content link

### Generate the PDF handbook

Generate `output/pdf/alert-atlas.pdf` and its site download copy:

```bash
npm run generate:pdf
```

The handbook is generated automatically by `npm run build`, so the deployed
download always reflects the current `data/alerts-ds.json` dataset. PDFKit is
used as an MIT-licensed development dependency.

The build also copies the active source workbook, `data/source/alerts-ds.xlsx`,
to `public/downloads/alert-atlas-catalog.xlsx`. The deployed workbook is
available at `/downloads/alert-atlas-catalog.xlsx` and is not committed as a
separate generated copy.

Publish only the workbook download copy with:

```bash
npm run publish:xlsx
```

### Preview during development

Install Node.js and npm, then install the project dependencies. You normally
only need to run the install command after cloning the project or when
`package.json` changes:

```bash
npm ci
```

Use `npm install` only when intentionally updating the dependency lockfile.

Start the development server:

```bash
npm run dev
```

Starting the development server also regenerates the PDF handbook and publishes
the active Excel workbook so both About-page downloads work locally.

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

### Preview the portal with the local chatbot API

Use two terminals for a full local preview. In the chatbot repository, start the API with the
Keychain-aware launcher:

```bash
cd ../ai-documentation-chatbot
./scripts/run_api.sh --reload
```

In this repository, start the portal and point its widget at that API:

```bash
VITE_CHATBOT_API_URL=http://127.0.0.1:8000/api/chat npm run dev
```

Open the Vite URL, normally `http://localhost:5173/`. The API launcher allows both
`http://localhost:5173` and `http://127.0.0.1:5173` and retrieves the OpenAI key from macOS
Keychain. Locally refused questions do not need an API key; grounded answers do.

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

### Deploy to Vercel

The repository includes `vercel.json` with the SPA rewrite, production build
command, `dist` output directory, and sitewide no-index response header. Import
the GitHub repository into Vercel with these project settings:

- Framework preset: Vite
- Root directory: `.`
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Environment variables: set `VITE_CHATBOT_API_URL` to the deployed chatbot endpoint, for example
  `https://chat.example.com/api/chat`. If the host proxies `/api/chat` to the chatbot API, the
  variable may be omitted.

After deployment, verify `/about`, `/glossary`, `/sitemap`, a direct alert URL,
`/downloads/alert-atlas.pdf`, and `/downloads/alert-atlas-catalog.xlsx`. Also
confirm the About-page GitHub link opens the repository and responses include
`X-Robots-Tag: noindex, nofollow, noarchive`.

### Search indexing controls

This portfolio is intended to be shared by direct link rather than listed by
search engines. `index.html` includes a sitewide `noindex, nofollow, noarchive`
robots directive. Vite also copies `public/_headers` into the production build;
hosts that support static `_headers` files will send the equivalent
`X-Robots-Tag` header for HTML, JSON, and PDF responses.

Do not block the whole site with `robots.txt`, because a crawler must be able to
read the `noindex` instruction. Confirm that the chosen host supports the
generated `_headers` file or configure the same header in its deployment
settings. These controls discourage compliant search engines from indexing the
site but do not restrict access. Use authentication if access control is needed.

## Portfolio disclosure

Alert atlas is a fictional portfolio demonstration. ACME COFFEE, its machine
models, alerts, response guidance, service procedures, and technician
instructions are synthetic and are not associated with a real manufacturer.
The content must not be used to operate, maintain, or repair real equipment.

This project was developed using OpenAI Codex-assisted workflows. Requirements,
information architecture, taxonomy, interaction design, review, testing, and
final acceptance remained the responsibility of the project owner.

The website presents this disclosure on `/about` and in the shared footer. The
generated PDF repeats the fictional-data notice on its cover and every page.

## Documentation chatbot

The shared site footer embeds the dependency-free `documentation-chat` widget on every route. The
widget script is vendored at `public/chatbot-widget.js` and the API endpoint is configured with the
Vite build variable `VITE_CHATBOT_API_URL`. It defaults to `/api/chat`, which is suitable when the
production host proxies that path to the chatbot API.

For a separately hosted chatbot API, set the variable during the production build:

```bash
VITE_CHATBOT_API_URL=https://your-chat-api.example/api/chat npm run build
```

The chatbot API must allow `https://alerts.danielng.co` in its `CHAT_ALLOWED_ORIGINS` setting. Keep
the OpenAI API key and alert index on the chatbot server; neither is sent to this site. The widget
shows a bounded error until `/api/chat` is routed to a deployed chatbot API.

## Notes

The alert data is synthetic and intended for demonstration, portfolio, or testing purposes rather than live equipment monitoring data.
