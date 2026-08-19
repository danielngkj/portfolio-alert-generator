# Portfolio Alert Generator

This project generates a synthetic Excel workbook of cashless payment coffee machine alerts for testing, demos, and portfolio samples.

## Contents

- `generate_alerts.py` creates the workbook programmatically
- `cashless_machine_alerts.xlsx` is the generated Excel output

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
python generate_alerts.py
```

This creates or updates the Excel file in the project root.

To write to a different file:

```bash
python generate_alerts.py --output path/to/alerts.xlsx
```

The generator refuses to overwrite files whose names contain `DONOTDELETE`.

## Notes

The alert data is synthetic and intended for demonstration, portfolio, or testing purposes rather than live equipment monitoring data.
